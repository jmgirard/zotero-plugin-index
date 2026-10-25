import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { UpstreamFacts } from "../upstream/reader.ts";

export type WriteResult =
  | { ok: true; dir: string }
  | { ok: false; failure: "unsafe-id" | "entry-exists" | "write-failed"; message: string };

// Plugin ids are email-like (name@example.org) or a {GUID}.
const SAFE_ID = /^[A-Za-z0-9_@{}+.-]{1,200}$/;

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
  // The id comes from the plugin's manifest and names a directory, so it must not
  // reach outside outDir. `pnpm check` skips names that start with a dot.
  if (!SAFE_ID.test(facts.id) || facts.id.startsWith(".")) {
    return { ok: false, failure: "unsafe-id", message: `the id ${JSON.stringify(facts.id)} cannot name a directory` };
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
