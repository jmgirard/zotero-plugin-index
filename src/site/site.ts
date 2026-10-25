import { cp, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "astro";

const SITE_ROOT = resolve(import.meta.dirname, "../../site");
// pnpm build writes these into the same directory, so the site never replaces them.
const DATA_ENTRIES = new Set(["v1", "schemas"]);

// Builds the site from <outDir>/v1/plugins.json into <outDir>. Astro empties the
// directory it builds into, so it builds into a temporary directory, and then each page
// is copied into outDir beside the data and the schemas.
export async function buildSite(outDir: string): Promise<{ ok: true; pages: number } | { ok: false; message: string }> {
  const dataPath = join(outDir, "v1", "plugins.json");
  try {
    JSON.parse(await readFile(dataPath, "utf8"));
  } catch (error) {
    return { ok: false, message: `cannot read ${dataPath}: ${(error as Error).message}` };
  }

  const staging = await mkdtemp(join(tmpdir(), "zpi-site-"));
  try {
    // The pages read the data file from this variable. Astro's telemetry stays off.
    process.env.ZPI_SITE_DATA = dataPath;
    process.env.ASTRO_TELEMETRY_DISABLED = "1";
    await build({ root: SITE_ROOT, outDir: staging, logLevel: "warn" });

    const entries = await readdir(staging);
    const clash = entries.find((name) => DATA_ENTRIES.has(name));
    if (clash) return { ok: false, message: `the site build wrote ${clash}, which holds the data` };
    // Replace each top-level entry, so a page from an earlier build of a removed plugin goes.
    for (const name of entries) {
      await rm(join(outDir, name), { recursive: true, force: true });
      await cp(join(staging, name), join(outDir, name), { recursive: true });
    }
    const pages = (await readdir(staging, { recursive: true })).filter((path) => path.endsWith("index.html"));
    return { ok: true, pages: pages.length };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
