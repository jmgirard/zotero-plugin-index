import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { UpstreamFacts } from "../upstream/reader.ts";

export type WriteResult = { ok: true; dir: string } | { ok: false; failure: "unsafe-id" | "entry-exists"; message: string };

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
  if (/[/\\]/.test(facts.id) || facts.id.startsWith(".")) {
    return { ok: false, failure: "unsafe-id", message: `the id ${JSON.stringify(facts.id)} cannot name a directory` };
  }
  const dir = join(outDir, facts.id);
  await mkdir(outDir, { recursive: true });
  try {
    await mkdir(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      return { ok: false, failure: "entry-exists", message: `${dir} already exists` };
    }
    throw error;
  }
  const { meta, index } = entryFiles(facts);
  await writeFile(join(dir, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`);
  await writeFile(join(dir, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
  return { ok: true, dir };
}
