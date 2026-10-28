import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { zipSync } from "fflate";

const FIXTURES = resolve(import.meta.dirname, "../fixtures/start");

export const START_FIXTURES = ["started", "start-error", "not-installed", "timed-out"] as const;

// Zips test/fixtures/start/<name> into <dir>/<name>.xpi and returns its path.
export function fixtureXpi(name: (typeof START_FIXTURES)[number], dir: string): string {
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
