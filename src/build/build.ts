import { copyFile, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { Ajv, type ErrorObject } from "ajv";
import indexSchema from "../../schemas/index.v1.schema.json" with { type: "json" };
import pluginsSchema from "../../schemas/plugins.v1.schema.json" with { type: "json" };
import { listEntries } from "../check/check.ts";
import { countReports, type ReportCount } from "../reports/count.ts";
import { type Fetch, githubClient, ReadFailure, readUpstream, type UpstreamFacts } from "../upstream/reader.ts";
import { duration, READ_LIMIT_MS, withinLimit } from "../upstream/time-limit.ts";

export interface Override {
  field: string;
  version?: string;
  value: string;
  reason: string;
}

// One entry's record. The upstream facts and the overrides stay in separate blocks.
export interface PluginRecord {
  id: string;
  repoUrl: string;
  upstream?: UpstreamFacts;
  // The counted user reports on the version in upstream, by Zotero major. Every record with
  // upstream that the build writes has it; data written before reports existed has none.
  reports?: ReportCount[];
  failure?: { name: string; message: string };
  overrides: Override[];
}

export interface PluginsFile {
  schemaVersion: 1;
  generatedAt: string;
  plugins: PluginRecord[];
}

// `buildLevel` lists the ids of the records whose failure usually points at the build, such as a
// rate limit or a network error, in record order. It stays out of the data.
export type BuildResult = { ok: true; data: PluginsFile; text: string; buildLevel: string[] } | { ok: false; problems: string[] };

const ajv = new Ajv({ allErrors: true });
const validateIndex = ajv.compile(indexSchema);
const validatePlugins = ajv.compile(pluginsSchema);
const validateRecord = ajv.getSchema(`${pluginsSchema.$id}#/definitions/record`)!;

// The repo whose report issues the build counts, when GITHUB_REPOSITORY is unset.
export const INDEX_REPO = "jmgirard/zotero-plugin-index";

// The time after which the build starts no plugin read. Each read also stops at
// READ_LIMIT_MS. The build job stops at 30 minutes, so these leave time for the steps
// around it.
export const BUILD_LIMIT_MS = 18 * 60 * 1000;

// `startedAt` is a performance.now() time. Its default, 0, is when the process started.
export interface TimeLimits {
  readMs?: number;
  buildMs?: number;
  startedAt?: number;
}

// Reads every entry under root, then the report issues of indexRepo, then each plugin
// upstream, one at a time. A failed upstream read goes into that entry's record. An entry
// that cannot be read, or whose meta.json or index.json is invalid, stops the build before
// any request. The counts come only from the issues, so a failed issue read also stops
// it, before any upstream read (D-013). A plugin read that passes `readMs` fails as
// request-failed. Once `buildMs` has passed since `startedAt`, the build reads no more
// plugins, and each entry left gets the failure not-read. Both count as build-level.
export async function buildData(
  root: string,
  fetch: Fetch,
  now = new Date(),
  indexRepo = INDEX_REPO,
  { readMs = READ_LIMIT_MS, buildMs = BUILD_LIMIT_MS, startedAt = 0 }: TimeLimits = {},
): Promise<BuildResult> {
  let listed: Awaited<ReturnType<typeof listEntries>>;
  try {
    listed = await listEntries(root);
  } catch (error) {
    return { ok: false, problems: [`cannot read ${root}: ${(error as Error).message}`] };
  }
  if (listed.length === 0) return { ok: false, problems: [`there are no entries in ${root}`] };

  const problems: string[] = [];
  const entries: { id: string; repoUrl: string; overrides: Override[] }[] = [];
  for (const { name, readError } of listed) {
    const entry = readError ? { problem: `cannot read the entry: ${readError}` } : await readEntry(join(root, name));
    if ("problem" in entry) problems.push(`${name}: ${entry.problem}`);
    else entries.push({ id: name, ...entry });
  }
  if (problems.length > 0) return { ok: false, problems };

  let issues: unknown[];
  try {
    // Oldest first, so a report closed during the read joins the last page rather than
    // moving each later report up one place, past a page boundary.
    const list = `https://api.github.com/repos/${indexRepo}/issues?labels=report&state=closed&sort=created&direction=asc&per_page=100`;
    issues = await githubClient(fetch).pages(list);
  } catch (error) {
    const name = error instanceof ReadFailure ? `${error.failure}: ` : "";
    return { ok: false, problems: [`cannot read the report issues: ${name}${(error as Error).message}`] };
  }
  // An issue with no closed_by key cannot be counted, so the counts cannot be read. An
  // item that is not an object, or a pull request, is left for countReports to drop.
  const unclosed = issues.find(
    (item) => typeof item === "object" && item !== null && !("pull_request" in item) && !("closed_by" in item),
  ) as { number?: unknown } | undefined;
  if (unclosed) {
    const which = typeof unclosed.number === "number" ? `issue #${unclosed.number}` : "an issue";
    return { ok: false, problems: [`cannot read the report issues: ${which} in the list has no closed_by field`] };
  }

  const records: PluginRecord[] = [];
  const buildLevel: string[] = [];
  for (const { id, repoUrl, overrides } of entries) {
    if (performance.now() - startedAt >= buildMs) {
      const message = `the build reads no plugin after ${duration(buildMs)}, its time limit`;
      records.push({ id, repoUrl, failure: { name: "not-read", message }, overrides });
      buildLevel.push(id);
      continue;
    }
    const { buildLevel: counts, ...read } = await readRecord(repoUrl, fetch, readMs);
    if (counts) buildLevel.push(id);
    const record: PluginRecord = { id, repoUrl, ...read, overrides };
    // Facts that the schema rejects, such as a repo body with no created_at, become this
    // record's failure, so one plugin cannot stop the whole file.
    const recordProblems = validateRecord(JSON.parse(JSON.stringify(record)))
      ? []
      : (validateRecord.errors ?? []).map(describe);
    if (recordProblems.length > 0 && record.upstream) {
      records.push({ id, repoUrl, failure: { name: "facts-invalid", message: recordProblems.join("; ") }, overrides });
    } else {
      records.push(record);
    }
  }
  const reports = countReports(issues, records);
  const plugins = records.map(({ id, repoUrl, upstream, failure, overrides }) =>
    upstream ? { id, repoUrl, upstream, reports: reports.get(id) ?? [], overrides } : { id, repoUrl, failure, overrides },
  );
  const data: PluginsFile = { schemaVersion: 1, generatedAt: now.toISOString(), plugins };
  const text = `${JSON.stringify(data, null, 2)}\n`;
  // Check the file as written, where undefined fields are gone.
  const outputProblems = checkOutput(JSON.parse(text));
  if (outputProblems.length > 0) return { ok: false, problems: outputProblems.map((p) => `the output ${p}`) };
  return { ok: true, data, text, buildLevel };
}

// The problems schemas/plugins.v1.schema.json finds in value, or none.
export function checkOutput(value: unknown): string[] {
  return validatePlugins(value) ? [] : (validatePlugins.errors ?? []).map(describe);
}

const SCHEMAS = join(import.meta.dirname, "..", "..", "schemas");
const PUBLISHED_SCHEMAS = ["plugins.v1.schema.json", "index.v1.schema.json"];

// Copies the published schemas to <outDir>/schemas/, then writes text to
// <outDir>/v1/plugins.json. Each file goes through a temporary file, so a failed write
// leaves any earlier file whole.
export async function writeData(outDir: string, text: string): Promise<{ ok: true; path: string } | { ok: false; message: string }> {
  for (const name of PUBLISHED_SCHEMAS) {
    const target = join(outDir, "schemas", name);
    try {
      await mkdir(join(outDir, "schemas"), { recursive: true });
      await copyFile(join(SCHEMAS, name), `${target}.tmp`);
      await rename(`${target}.tmp`, target);
    } catch (error) {
      await rm(`${target}.tmp`, { force: true }).catch(() => {});
      return { ok: false, message: `cannot write ${target}: ${(error as Error).message}` };
    }
  }
  const path = join(outDir, "v1", "plugins.json");
  const temporary = `${path}.tmp`;
  try {
    await mkdir(join(outDir, "v1"), { recursive: true });
    await writeFile(temporary, text);
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => {});
    return { ok: false, message: `cannot write ${path}: ${(error as Error).message}` };
  }
  return { ok: true, path };
}

async function readEntry(dir: string): Promise<{ repoUrl: string; overrides: Override[] } | { problem: string }> {
  const meta = await readJson(join(dir, "meta.json"));
  if ("problem" in meta) return meta;
  const repoUrl = (meta.value as { repoUrl?: unknown } | null)?.repoUrl;
  if (typeof repoUrl !== "string" || repoUrl.length === 0) return { problem: "meta.json has no repoUrl" };

  const index = await readJson(join(dir, "index.json"));
  if ("problem" in index) return index;
  if (!validateIndex(index.value)) {
    return { problem: `index.json: ${(validateIndex.errors ?? []).map(describe).join("; ")}` };
  }
  return { repoUrl, overrides: (index.value as { overrides?: Override[] }).overrides ?? [] };
}

async function readRecord(
  repoUrl: string,
  fetch: Fetch,
  readMs: number,
): Promise<Pick<PluginRecord, "upstream" | "failure"> & { buildLevel?: boolean }> {
  try {
    const read = await withinLimit(readMs, (signal) => readUpstream(repoUrl, fetch, { signal }));
    if (read.ok) return { upstream: read.facts };
    return { failure: { name: read.failure, message: read.message }, buildLevel: read.buildLevel };
  } catch (error) {
    // The reader names each problem it knows. Anything else is a bug or a surprise, and
    // it stays in this record so the other plugins still build. It counts as build-level.
    const message = error instanceof Error ? error.message : String(error);
    return { failure: { name: "unexpected-error", message }, buildLevel: true };
  }
}

async function readJson(path: string): Promise<{ value: unknown } | { problem: string }> {
  const file = basename(path);
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    return { problem: `cannot read ${file}: ${(error as Error).message}` };
  }
  try {
    return { value: JSON.parse(text) };
  } catch (error) {
    return { problem: `${file} is not valid JSON: ${(error as Error).message}` };
  }
}

function describe(error: ErrorObject): string {
  return `${error.instancePath || "(root)"} ${error.message ?? "is invalid"}`;
}
