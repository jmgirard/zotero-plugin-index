import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import type { ReadItem, SkippedItem } from "../src/discover/discover.ts";
import { loadFixture, type Responses } from "./support/fixture-fetch.ts";
import { pluginRepo, searchPage } from "./support/plugin-repo.ts";

const ROOT = resolve(import.meta.dirname, "..");
const PRELOAD = resolve(ROOT, "test/support/preload-fixture.ts");
const searchUrl = (topic: string) =>
  `https://api.github.com/search/repositories?q=topic%3A${topic}&sort=updated&order=desc&per_page=100`;

const temps: string[] = [];
afterAll(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "zpi-propose-"));
  temps.push(dir);
  return dir;
}

// One search page for each topic.
function searched(plugin: [string, string][], addon: [string, string][] = []): Responses {
  return {
    [searchUrl("zotero-plugin")]: { json: searchPage(plugin) },
    [searchUrl("zotero-addon")]: { json: searchPage(addon) },
  };
}

// As in the discover tests, the preload answers the command's requests from `responses`.
function pnpmDiscover(args: string[], responses: Responses, cwd: string, env: Record<string, string> = {}) {
  const pnpmPath = process.env.npm_execpath;
  if (!pnpmPath) throw new Error("run the tests with `pnpm test`, so they can call pnpm");
  const fixture = join(tempDir(), "responses.json");
  writeFileSync(fixture, JSON.stringify({ source: "propose test", repoUrl: "", responses }));
  const { INIT_CWD: _outer, GITHUB_TOKEN: _token, GITHUB_REPOSITORY: _repo, ...outer } = process.env;
  Object.assign(outer, { ZPI_FIXTURE: fixture, NODE_OPTIONS: `--import=${PRELOAD}` }, env);
  return spawnSync(pnpmPath, ["--silent", "--dir", ROOT, "discover", ...args], { cwd, encoding: "utf8", env: outer, timeout: 50_000 });
}

describe("pnpm discover --propose", () => {
  test("does not read a repo whose bot pull request is open or was closed without a merge", () => {
    const pushed = "2026-10-01T00:00:00Z";
    const responses: Responses = {
      ...loadFixture(resolve(ROOT, "test/fixtures/discover/pulls.json")).responses,
      ...searched([
        ["example/open-pr", pushed],
        ["example/closed-pr", pushed],
        ["example/merged-pr", pushed],
        ["example/fork-pr", pushed],
      ]),
      ...pluginRepo("example/open-pr", "open-pr@example.org"),
      ...pluginRepo("example/closed-pr", "closed-pr@example.org"),
      // These two have no release, so their reads write no entry and the run proposes nothing.
      ...pluginRepo("example/merged-pr", "merged-pr@example.org", { noRelease: true }),
      ...pluginRepo("example/fork-pr", "fork-pr@example.org", { noRelease: true }),
    };
    const cwd = tempDir();
    const result = pnpmDiscover(["--propose", "--state", "state.json"], responses, cwd, { GITHUB_REPOSITORY: "example/index" });
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.skipped).toEqual(
      expect.arrayContaining<SkippedItem>([
        { repo: "example/open-pr", reason: "in-skip-set" },
        { repo: "example/closed-pr", reason: "in-skip-set" },
      ]),
    );
    expect(report.read.map((item: ReadItem) => item.repo).sort()).toEqual(["example/fork-pr", "example/merged-pr"]);
    expect(report.proposed).toEqual([]);
  });
});
