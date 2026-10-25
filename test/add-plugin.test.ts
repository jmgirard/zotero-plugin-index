import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { writeEntry } from "../src/add-plugin/add-plugin.ts";
import type { UpstreamFacts } from "../src/upstream/reader.ts";
import { loadFixture } from "./support/fixture-fetch.ts";

const ROOT = resolve(import.meta.dirname, "..");
const FIXTURE = resolve("test/fixtures/upstream/better-notes.json");
const PRELOAD = resolve("test/support/preload-fixture.ts");
const REPO_URL = "https://github.com/windingwind/zotero-better-notes";
const ID = "Knowledge4Zotero@windingwind.com";

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "zpi-add-"));
  temps.push(dir);
  return dir;
}

// pnpm sets npm_execpath to its own binary when it runs `pnpm test`. --dir finds this
// package from any cwd, and pnpm still sets INIT_CWD to the cwd. The preload makes the
// command answer its requests from `fixture` instead of the network.
function pnpm(args: string[], options: { cwd?: string; fixture?: string } = {}) {
  const pnpmPath = process.env.npm_execpath;
  if (!pnpmPath) throw new Error("run the tests with `pnpm test`, so they can call pnpm");
  const { INIT_CWD: _outer, GITHUB_TOKEN: _token, ...env } = process.env;
  if (options.fixture) Object.assign(env, { ZPI_FIXTURE: options.fixture, NODE_OPTIONS: `--import=${PRELOAD}` });
  return spawnSync(pnpmPath, ["--silent", "--dir", ROOT, ...args], {
    encoding: "utf8",
    cwd: options.cwd,
    env,
    timeout: 50_000,
  });
}

describe("pnpm add-plugin <url> [--out <dir>]", () => {
  test("writes an entry that passes pnpm check, under a --out relative to where pnpm runs", () => {
    const cwd = tempDir();
    const result = pnpm(["add-plugin", REPO_URL, "--out", "entries"], { cwd, fixture: FIXTURE });
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(readdirSync(join(cwd, "entries"))).toEqual([ID]);
    expect(JSON.parse(readFileSync(join(cwd, "entries", ID, "meta.json"), "utf8"))).toEqual({
      id: ID,
      name: "Better Notes for Zotero",
      description: "Everything about note management. All in Zotero.",
      homepage: "https://github.com/windingwind/zotero-better-notes#readme",
      repoUrl: REPO_URL,
      updateUrl: "https://github.com/windingwind/zotero-better-notes/releases/download/release/update.json",
    });

    const check = pnpm(["check", join(cwd, "entries")]);
    expect(check.status).toBe(0);
    expect(check.stdout).toContain("checked 1 entries");
  });

  test("writes no file and prints the failure name when the repo fails the bar", () => {
    const fixture = loadFixture(FIXTURE);
    (fixture.responses["https://api.github.com/repos/windingwind/zotero-better-notes"].json as { fork: boolean }).fork =
      true;
    const fixturePath = join(tempDir(), "fork.json");
    writeFileSync(fixturePath, JSON.stringify(fixture));
    const out = join(tempDir(), "entries");

    const result = pnpm(["add-plugin", REPO_URL, "--out", out], { fixture: fixturePath });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/^fork: /);
    expect(existsSync(out)).toBe(false);
  });

  test.each([[[]], [[REPO_URL, "--out"]], [[REPO_URL, REPO_URL]]])("prints the usage for arguments %j", (args) => {
    const result = pnpm(["add-plugin", ...args]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("usage: pnpm add-plugin <github-url> [--out <dir>]");
  });
});

describe("writeEntry", () => {
  const facts: UpstreamFacts = {
    id: ID,
    version: "1.0.0",
    updateUrl: "https://example.org/update.json",
    updateHost: "example.org",
    repoUrl: REPO_URL,
    repoCreatedAt: "2022-04-27T15:46:23Z",
    openIssues: 0,
    releaseCount: 1,
    latestReleaseDate: "2026-08-24T13:25:16Z",
  };

  test("keeps an existing entry and its files", async () => {
    const out = tempDir();
    mkdirSync(join(out, ID));
    writeFileSync(join(out, ID, "index.json"), "kept");
    const result = await writeEntry(out, facts);
    expect(result).toEqual({ ok: false, failure: "entry-exists", message: expect.stringContaining(ID) });
    expect(readdirSync(join(out, ID))).toEqual(["index.json"]);
    expect(readFileSync(join(out, ID, "index.json"), "utf8")).toBe("kept");
  });

  test.each(["x/../../escape@example.org", "a\\b@example.org", ".hidden@example.org"])(
    "refuses the id %j, which cannot name an entry directory",
    async (id) => {
      const out = join(tempDir(), "entries");
      const result = await writeEntry(out, { ...facts, id });
      expect(result).toEqual({ ok: false, failure: "unsafe-id", message: expect.stringContaining("cannot name") });
      expect(existsSync(out)).toBe(false);
    },
  );
});
