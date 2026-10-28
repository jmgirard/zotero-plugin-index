import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { zipSync } from "fflate";
import type { StartResultName } from "../../src/start-test/start-test.ts";

const FIXTURES = resolve(import.meta.dirname, "../fixtures/start");

// Each fixture under test/fixtures/start and the result a real Zotero gives it.
export const START_FIXTURES: Record<string, StartResultName> = {
  started: "started",
  "start-error": "start-error",
  "start-error-async": "start-error",
  "not-installed": "not-installed",
  "timed-out": "timed-out",
};

// Zips test/fixtures/start/<name> into <dir>/<name>.xpi and returns its path.
export function fixtureXpi(name: string, dir: string): string {
  const source = join(FIXTURES, name);
  const path = join(dir, `${name}.xpi`);
  writeFileSync(
    path,
    zipSync({
      "manifest.json": readFileSync(join(source, "manifest.json")),
      "bootstrap.js": readFileSync(join(source, "bootstrap.js")),
    }),
  );
  return path;
}
