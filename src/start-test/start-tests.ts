import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import type { StartPlan, StartPlanItem } from "../build/build.ts";
import { compareVersions } from "../site/version.ts";
import type { Lookup } from "../upstream/host-guard.ts";
import { downloadXpi, type Fetch, ReadFailure } from "../upstream/reader.ts";
import { READ_LIMIT_MS, duration, withinLimit } from "../upstream/time-limit.ts";
import { START_LIMIT_MS, type StartResult, type StartResultName, zoteroVersion } from "./start-test.ts";

// The time after which `pnpm start-tests` starts no new plugin. A start that runs at the
// limit goes on to its own limit, START_LIMIT_MS.
export const START_TESTS_LIMIT_MS = 20 * 60 * 1000;

// The `pnpm start-test` command, which runs each start in its own process.
const START_TEST_CLI = join(dirname(fileURLToPath(import.meta.url)), "cli.ts");

// The four results of `pnpm start-test`.
export const RESULT_NAMES: StartResultName[] = ["started", "start-error", "not-installed", "timed-out"];

// One start's result, with the entry id of the plan item it started.
export interface PlannedStart extends StartResult {
  entry: string;
}

// A plan item in range that has no result: its download failed, its bytes did not match the
// plan's SHA-256, or `pnpm start-test` failed, for example as reporter-not-started.
export interface SkippedStart {
  entry: string;
  reason: "download-failed" | "hash-mismatch" | "start-failed";
  message: string;
}

export interface StartTestsResult {
  zotero: string;
  results: PlannedStart[];
  skipped: SkippedStart[];
  // The entries outside the binary's Zotero version, and the entries in range that the total
  // limit left unstarted.
  outOfRange: string[];
  notStarted: string[];
}

// Whether the manifest range of `item` covers the Zotero version, compared as Zotero
// compares versions. A missing bound leaves that side open.
export function inRange(item: Pick<StartPlanItem, "strictMinVersion" | "strictMaxVersion">, zotero: string): boolean {
  const { strictMinVersion: min, strictMaxVersion: max } = item;
  return (min === undefined || compareVersions(min, zotero) <= 0) && (max === undefined || compareVersions(zotero, max) <= 0);
}

const PLAN_FIELDS = ["entry", "id", "version", "xpiUrl", "sha256"] as const;

// The plan in `text`, or a problem. Each item needs its five string fields; the two bounds are
// strings when present.
export function parsePlan(text: string): { ok: true; plan: StartPlan } | { ok: false; problem: string } {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    return { ok: false, problem: `the plan is not JSON: ${(error as Error).message}` };
  }
  const plugins = (value as { plugins?: unknown } | null)?.plugins;
  if (!Array.isArray(plugins)) return { ok: false, problem: "the plan has no plugins list" };
  for (const [i, item] of plugins.entries()) {
    const fields = (typeof item === "object" && item !== null ? item : {}) as Record<string, unknown>;
    const missing = PLAN_FIELDS.find((field) => typeof fields[field] !== "string");
    const badBound = (["strictMinVersion", "strictMaxVersion"] as const).find(
      (field) => fields[field] !== undefined && typeof fields[field] !== "string",
    );
    if (missing ?? badBound) return { ok: false, problem: `plan item ${i} has no string ${missing ?? badBound}` };
  }
  return { ok: true, plan: value as StartPlan };
}

export interface StartTestsOptions {
  plan: StartPlan;
  zotero: string;
  fetch: Fetch;
  lookup?: Lookup;
  limitMs?: number;
  // A performance.now() time; its default, 0, is when the process started.
  startedAt?: number;
  // The --limit of each `pnpm start-test`, in seconds.
  startLimitSeconds?: number;
  // The script run for each start, `pnpm start-test`'s by default.
  startTestCli?: string;
  // Called after each plan item in range, with what became of it.
  onItem?: (entry: string, outcome: PlannedStart | SkippedStart) => void;
}

// Starts the Zotero binary once for each plan item whose manifest range covers the binary's
// version, in plan order. Each XPI is downloaded from the plan's URL with the reader's host
// check and must match the plan's SHA-256; each start runs `pnpm start-test`. Once `limitMs`
// has passed since `startedAt`, no new start begins.
export async function startTests(options: StartTestsOptions): Promise<StartTestsResult> {
  const { plan, fetch, lookup, limitMs = START_TESTS_LIMIT_MS, startedAt = 0, onItem } = options;
  const zotero = await zoteroVersion(options.zotero);
  const outcome: StartTestsResult = { zotero, results: [], skipped: [], outOfRange: [], notStarted: [] };
  const temp = await mkdtemp(join(tmpdir(), "start-tests-"));
  try {
    for (const item of plan.plugins) {
      if (!inRange(item, zotero)) {
        outcome.outOfRange.push(item.entry);
        continue;
      }
      if (performance.now() - startedAt >= limitMs) {
        outcome.notStarted.push(item.entry);
        continue;
      }
      const done = await startOne(item, options.zotero, temp, fetch, lookup, options.startLimitSeconds, options.startTestCli);
      if ("reason" in done) outcome.skipped.push(done);
      else outcome.results.push(done);
      onItem?.(item.entry, done);
    }
  } finally {
    await rm(temp, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
  return outcome;
}

async function startOne(
  item: StartPlanItem,
  binary: string,
  temp: string,
  fetch: Fetch,
  lookup: Lookup | undefined,
  startLimitSeconds: number | undefined,
  cli = START_TEST_CLI,
): Promise<PlannedStart | SkippedStart> {
  const { entry } = item;
  let bytes: Uint8Array;
  try {
    bytes = await withinLimit(READ_LIMIT_MS, (signal) => downloadXpi(item.xpiUrl, fetch, { lookup, signal }));
  } catch (error) {
    const name = error instanceof ReadFailure ? `${error.failure}: ` : "";
    return { entry, reason: "download-failed", message: `${name}${(error as Error).message}` };
  }
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== item.sha256) {
    return { entry, reason: "hash-mismatch", message: `the XPI at ${item.xpiUrl} has SHA-256 ${sha256}, not ${item.sha256}` };
  }
  // Each item gets its own files, named by its place in the plan rather than by its id.
  const dir = await mkdtemp(join(temp, "item-"));
  const xpi = join(dir, "plugin.xpi");
  const out = join(dir, "result.json");
  await writeFile(xpi, bytes);
  const args = [cli, "--zotero", binary, "--xpi", xpi, "--out", out];
  if (startLimitSeconds !== undefined) args.push("--limit", String(startLimitSeconds));
  const limitMs = (startLimitSeconds ?? START_LIMIT_MS / 1000) * 1000;
  const run = await new Promise<{ code: number | null; stderr: string }>((resolveRun) => {
    // The start's own limit ends it first; this one ends a command that hangs past it.
    execFile(process.execPath, args, { timeout: limitMs + 60_000, killSignal: "SIGKILL" }, (error, _stdout, stderr) =>
      resolveRun({ code: error ? ((error as { code?: number }).code ?? null) : 0, stderr }),
    );
  });
  if (run.code !== 0) {
    const message = run.stderr.trim().split("\n")[0] || `pnpm start-test ended with code ${run.code} after ${duration(limitMs)} at most`;
    return { entry, reason: "start-failed", message };
  }
  let result: unknown;
  try {
    result = JSON.parse(await readFile(out, "utf8"));
  } catch (error) {
    return { entry, reason: "start-failed", message: `cannot read the result of pnpm start-test: ${(error as Error).message}` };
  }
  const fields = result as Partial<StartResult> | null;
  if (
    typeof fields?.id !== "string" ||
    typeof fields.version !== "string" ||
    typeof fields.zotero !== "string" ||
    !RESULT_NAMES.includes(fields.result as StartResultName)
  ) {
    return { entry, reason: "start-failed", message: "pnpm start-test wrote a result of the wrong shape" };
  }
  return { entry, id: fields.id, version: fields.version, zotero: fields.zotero, result: fields.result as StartResultName };
}
