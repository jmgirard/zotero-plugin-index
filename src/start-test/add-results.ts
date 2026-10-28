import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { PluginsFile, StartPlan, StartPlanItem, StartTestRecord } from "../build/build.ts";
import { compareVersions } from "../site/version.ts";
import type { StartResultName } from "./start-test.ts";
import { inRange, RESULT_NAMES } from "./start-tests.ts";

// The prefix of each start-test job's artifact name; the rest is the job's Zotero version,
// which the workflow's matrix sets.
export const ARTIFACT_PREFIX = "start-results-";

// Why a result is dropped. A results file that is not a JSON array drops as a whole.
export type DropReason =
  | "not-an-object"
  | "unknown-entry"
  | "id-mismatch"
  | "version-mismatch"
  | "zotero-not-artifact"
  | "zotero-out-of-range"
  | "bad-result"
  | "duplicate";

export interface Dropped {
  file: string;
  index: number;
  reason: DropReason;
}

export interface AddResultsOutcome {
  data: PluginsFile;
  kept: number;
  dropped: Dropped[];
  // The results files that are not a JSON array.
  badFiles: string[];
}

// One results file: its path relative to the results directory, the Zotero version that its
// artifact name holds (undefined for a directory with another name), and its text.
export interface ResultsFile {
  file: string;
  artifactZotero: string | undefined;
  text: string;
}

// Reads every file one level down in `dir`: download-artifact puts each artifact in a
// directory of its name.
export async function readResultsDir(dir: string): Promise<ResultsFile[]> {
  const files: ResultsFile[] = [];
  for (const artifact of (await readdir(dir, { withFileTypes: true })).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (!artifact.isDirectory()) continue;
    const artifactZotero = artifact.name.startsWith(ARTIFACT_PREFIX) ? artifact.name.slice(ARTIFACT_PREFIX.length) : undefined;
    for (const name of (await readdir(join(dir, artifact.name))).sort()) {
      files.push({ file: join(artifact.name, name), artifactZotero, text: await readFile(join(dir, artifact.name, name), "utf8") });
    }
  }
  return files;
}

// Adds the results to the data as `startTests`, keeping a result only when its entry, plugin
// id, and plugin version match a plan item, its Zotero version equals the one in its artifact
// name and falls in the item's manifest range, and its result is one of the four names. Two
// or more such results for one entry and one Zotero version all drop, since at most one job
// tests each pair. Plugin code in a start-test job can write that job's file, so each result
// is read as untrusted. Each record's results are ordered by Zotero version; a record with
// none gets no field, and any `startTests` the data already has is replaced.
export function addResults(data: PluginsFile, plan: StartPlan, files: ResultsFile[]): AddResultsOutcome {
  const items = new Map<string, StartPlanItem>(plan.plugins.map((item) => [item.entry, item]));
  const read = new Set(data.plugins.filter((record) => record.upstream).map((record) => record.id));
  const dropped: Dropped[] = [];
  const badFiles: string[] = [];
  const candidates: { file: string; index: number; entry: string; zotero: string; result: StartResultName }[] = [];
  for (const { file, artifactZotero, text } of files) {
    let list: unknown;
    try {
      list = JSON.parse(text);
    } catch {
      list = undefined;
    }
    if (!Array.isArray(list)) {
      badFiles.push(file);
      continue;
    }
    list.forEach((value: unknown, index) => {
      const reason = dropReason(value, items, read, artifactZotero);
      if (reason) dropped.push({ file, index, reason });
      else {
        const { entry, zotero, result } = value as { entry: string; zotero: string; result: StartResultName };
        candidates.push({ file, index, entry, zotero, result });
      }
    });
  }
  const key = ({ entry, zotero }: { entry: string; zotero: string }) => JSON.stringify([entry, zotero]);
  const counts = new Map<string, number>();
  for (const candidate of candidates) counts.set(key(candidate), (counts.get(key(candidate)) ?? 0) + 1);
  const byEntry = new Map<string, StartTestRecord[]>();
  for (const candidate of candidates) {
    if (counts.get(key(candidate))! > 1) {
      dropped.push({ file: candidate.file, index: candidate.index, reason: "duplicate" });
      continue;
    }
    const list = byEntry.get(candidate.entry) ?? [];
    list.push({ zotero: candidate.zotero, result: candidate.result });
    byEntry.set(candidate.entry, list);
  }
  let kept = 0;
  const plugins = data.plugins.map(({ startTests: _old, ...record }) => {
    const tests = byEntry.get(record.id);
    if (!tests) return record;
    kept += tests.length;
    tests.sort((a, b) => compareVersions(a.zotero, b.zotero));
    // The field goes after reports, before overrides.
    const { overrides, ...rest } = record;
    return { ...rest, startTests: tests, overrides };
  });
  return { data: { ...data, plugins }, kept, dropped, badFiles };
}

function dropReason(
  value: unknown,
  items: Map<string, StartPlanItem>,
  read: Set<string>,
  artifactZotero: string | undefined,
): DropReason | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return "not-an-object";
  const fields = value as Record<string, unknown>;
  const item = typeof fields.entry === "string" ? items.get(fields.entry) : undefined;
  if (!item || !read.has(item.entry)) return "unknown-entry";
  if (fields.id !== item.id) return "id-mismatch";
  if (fields.version !== item.version) return "version-mismatch";
  if (typeof fields.zotero !== "string" || fields.zotero !== artifactZotero) return "zotero-not-artifact";
  if (!inRange(item, fields.zotero)) return "zotero-out-of-range";
  if (!RESULT_NAMES.includes(fields.result as StartResultName)) return "bad-result";
  return undefined;
}
