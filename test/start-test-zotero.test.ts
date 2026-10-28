import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { afterAll, describe, expect, test } from "vitest";
import { fixtureXpi, START_FIXTURES } from "./support/start-fixtures.ts";

// Starts a real Zotero with each fixture plugin. Runs only when ZOTERO_BIN names a Zotero
// binary; the `start-test` job of ci.yml sets it to Zotero 10.0.6 for Linux under xvfb-run.
const ZOTERO_BIN = process.env.ZOTERO_BIN;
const CLI = resolve(import.meta.dirname, "../src/start-test/cli.ts");
const run = promisify(execFile);
const LIMIT_S = 60;

const temps: string[] = [];
afterAll(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe.skipIf(ZOTERO_BIN === undefined)("pnpm start-test with a real Zotero", () => {
  test.each(START_FIXTURES)(
    "the %s fixture gets that result",
    async (name) => {
      const dir = mkdtempSync(join(tmpdir(), "zpi-start-zotero-"));
      temps.push(dir);
      const out = join(dir, "result.json");
      await run(process.execPath, [CLI, "--zotero", ZOTERO_BIN!, "--xpi", fixtureXpi(name, dir), "--out", out, "--limit", String(LIMIT_S)]);
      const result = JSON.parse(readFileSync(out, "utf8"));
      expect(result).toMatchObject({ id: `${name}@start-test.invalid`, version: "1.0.0", result: name });
      console.log(`${name}: ${result.result} in Zotero ${result.zotero}`);
    },
    (LIMIT_S + 30) * 1000,
  );
});
