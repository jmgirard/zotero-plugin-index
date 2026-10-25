import { copyFile, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { Ajv, type ErrorObject } from "ajv";
import indexSchema from "../../schemas/index.v1.schema.json" with { type: "json" };
import pluginsSchema from "../../schemas/plugins.v1.schema.json" with { type: "json" };
import { listEntries } from "../check/check.ts";
import { type Fetch, readUpstream, type UpstreamFacts } from "../upstream/reader.ts";

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
  failure?: { name: string; message: string };
  overrides: Override[];
}

export interface PluginsFile {
  schemaVersion: 1;
  generatedAt: string;
  plugins: PluginRecord[];
}

export type BuildResult = { ok: true; data: PluginsFile; text: string } | { ok: false; problems: string[] };

const ajv = new Ajv({ allErrors: true });
const validateIndex = ajv.compile(indexSchema);
const validatePlugins = ajv.compile(pluginsSchema);
const validateRecord = ajv.getSchema(`${pluginsSchema.$id}#/definitions/record`)!;

// Reads every entry under root, then reads each plugin upstream, one at a time. A failed
// upstream read goes into that entry's record. An entry that cannot be read, or whose
// meta.json or index.json is invalid, stops the build before any upstream read.
export async function buildData(root: string, fetch: Fetch, now = new Date()): Promise<BuildResult> {
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

  const plugins: PluginRecord[] = [];
  for (const { id, repoUrl, overrides } of entries) {
    const record: PluginRecord = { id, repoUrl, ...(await readRecord(repoUrl, fetch)), overrides };
    // Facts that the schema rejects, such as a repo body with no created_at, become this
    // record's failure, so one plugin cannot stop the whole file.
    const recordProblems = validateRecord(JSON.parse(JSON.stringify(record)))
      ? []
      : (validateRecord.errors ?? []).map(describe);
    if (recordProblems.length > 0 && record.upstream) {
      plugins.push({ id, repoUrl, failure: { name: "facts-invalid", message: recordProblems.join("; ") }, overrides });
    } else {
      plugins.push(record);
    }
  }
  const data: PluginsFile = { schemaVersion: 1, generatedAt: now.toISOString(), plugins };
  const text = `${JSON.stringify(data, null, 2)}\n`;
  // Check the file as written, where undefined fields are gone.
  const outputProblems = checkOutput(JSON.parse(text));
  if (outputProblems.length > 0) return { ok: false, problems: outputProblems.map((p) => `the output ${p}`) };
  return { ok: true, data, text };
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

async function readRecord(repoUrl: string, fetch: Fetch): Promise<Pick<PluginRecord, "upstream" | "failure">> {
  try {
    const read = await readUpstream(repoUrl, fetch);
    return read.ok ? { upstream: read.facts } : { failure: { name: read.failure, message: read.message } };
  } catch (error) {
    // The reader names each problem it knows. Anything else is a bug or a surprise, and
    // it stays in this record so the other plugins still build.
    return { failure: { name: "unexpected-error", message: error instanceof Error ? error.message : String(error) } };
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
