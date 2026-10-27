import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { entryNameProblem } from "../check/check.ts";
import type { UpstreamFacts } from "../upstream/reader.ts";

export type WriteResult =
  | { ok: true; dir: string }
  | { ok: false; failure: "unsafe-id" | "entry-exists" | "write-failed"; message: string };

// The registry meta.json holds upstream facts only; index.json starts with no overrides.
export function entryFiles(facts: UpstreamFacts) {
  const meta = {
    id: facts.id,
    name: facts.name,
    description: facts.description,
    homepage: facts.homepage,
    repoUrl: facts.repoUrl,
    updateUrl: facts.updateUrl,
  };
  return { meta, index: { schemaVersion: 1 } };
}

// Writes the entry directory `<outDir>/<id>/`. It never replaces an existing entry, whose
// index.json may hold overrides.
export async function writeEntry(outDir: string, facts: UpstreamFacts): Promise<WriteResult> {
  // The id comes from the plugin's manifest and names a directory, so `pnpm check`'s name
  // rule applies to it.
  const problem = entryNameProblem(facts.id);
  if (problem) {
    return { ok: false, failure: "unsafe-id", message: `the id ${JSON.stringify(facts.id)} cannot name a directory: it ${problem}` };
  }
  // A case-sensitive file system would let both directories exist, and Windows and macOS
  // checkouts would then hold one of them.
  let names: string[];
  try {
    names = await namesIn(outDir);
  } catch (error) {
    return { ok: false, failure: "write-failed", message: `cannot read ${outDir}: ${(error as Error).message}` };
  }
  const same = names.find((name) => name !== facts.id && name.toLowerCase() === facts.id.toLowerCase());
  if (same !== undefined) {
    return { ok: false, failure: "entry-exists", message: `${join(outDir, same)} already exists, equal to the id ${facts.id} ignoring case` };
  }
  const dir = join(outDir, facts.id);
  try {
    await mkdir(outDir, { recursive: true });
    await mkdir(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      return { ok: false, failure: "entry-exists", message: `${dir} already exists` };
    }
    return { ok: false, failure: "write-failed", message: `cannot create ${dir}: ${(error as Error).message}` };
  }
  const { meta, index } = entryFiles(facts);
  try {
    await writeFile(join(dir, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`);
    await writeFile(join(dir, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
  } catch (error) {
    // A half-written entry would make every later run stop at entry-exists.
    await rm(dir, { recursive: true, force: true });
    return { ok: false, failure: "write-failed", message: `cannot write ${dir}: ${(error as Error).message}` };
  }
  return { ok: true, dir };
}

// The names in dir. A dir that is missing, or under a file, has none, and mkdir then reports
// it. Another read error throws.
async function namesIn(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return [];
    throw error;
  }
}
