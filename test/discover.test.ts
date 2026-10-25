import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import { type DiscoveryState, discover, type ReadItem } from "../src/discover/discover.ts";
import { fixtureFetch, loadFixture, type Responses } from "./support/fixture-fetch.ts";
import { pluginRepo, searchPage } from "./support/plugin-repo.ts";

const ROOT = resolve(import.meta.dirname, "..");
// Holds second-plugin@example.org, whose repoUrl is https://github.com/example/second-plugin.
const TREE = resolve(ROOT, "test/fixtures/build/plugins");
const PRELOAD = resolve(ROOT, "test/support/preload-fixture.ts");
const SEARCH = "https://api.github.com/search/repositories?q=topic%3A";
const NOW = new Date("2026-10-25T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const publicLookup = async () => ["140.82.112.3"];

const temps: string[] = [];
afterAll(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "zpi-discover-"));
  temps.push(dir);
  return dir;
}

// The recorded search pages and the reader responses for each repo in them.
function recorded(): Responses {
  return {
    ...loadFixture(resolve(ROOT, "test/fixtures/discover/search.json")).responses,
    ...pluginRepo("example/alpha", "alpha@example.org"),
    ...pluginRepo("Example/Second-Plugin", "second-plugin@example.org"),
    ...pluginRepo("example/skipped", "skipped@example.org"),
    ...pluginRepo("example/no-release", "no-release@example.org", { noRelease: true }),
    ...pluginRepo("example/both", "both@example.org"),
    ...pluginRepo("example/clash", "second-plugin@example.org"),
    ...pluginRepo("example/unsafe", "../unsafe"),
  };
}

// One search page for each topic.
function searched(plugin: [string, string][], addon: [string, string][] = []): Responses {
  return {
    [`${SEARCH}zotero-plugin&per_page=100`]: { json: searchPage(plugin) },
    [`${SEARCH}zotero-addon&per_page=100`]: { json: searchPage(addon) },
  };
}

async function run(
  responses: Responses,
  { root = tempDir(), state = {} as DiscoveryState, skip = new Set<string>(), limit = 50, budget = 100, now = NOW } = {},
) {
  const { fetch, requests } = fixtureFetch(responses);
  const result = await discover({ root, outDir: tempDir(), fetch, lookup: publicLookup, state, skip, limit, budget, now });
  if (!result.ok) throw new Error(result.message);
  // The reader's first request for each repo is its metadata.
  const reads = requests
    .map(({ url }) => /^https:\/\/api\.github\.com\/repos\/([^/]+\/[^/?]+)$/.exec(url)?.[1])
    .filter((repo) => repo !== undefined);
  return { ...result, reads };
}

describe("discover", () => {
  test("reads each repo of both topics' search pages once", async () => {
    const { reads } = await run(recorded());
    expect([...reads].sort()).toEqual(
      [
        "Example/Second-Plugin",
        "example/alpha",
        "example/both",
        "example/clash",
        "example/no-release",
        "example/skipped",
        "example/unsafe",
      ].sort(),
    );
  });

  test("does not read a repo the index lists, by a URL that differs in case, or one in the skip set", async () => {
    const { reads, report } = await run(recorded(), { root: TREE, skip: new Set(["example/skipped"]) });
    expect(reads).not.toContain("Example/Second-Plugin");
    expect(reads).not.toContain("example/skipped");
    expect(report.skipped).toContainEqual({ repo: "example/second-plugin", reason: "in-index" });
    expect(report.skipped).toContainEqual({ repo: "example/skipped", reason: "in-skip-set" });
  });

  test("reports each repo it reads as written or with its failure name", async () => {
    const { report } = await run(recorded(), { root: TREE });
    const item = (repo: string) => report.read.find((read: ReadItem) => read.repo === repo);
    expect(item("example/alpha")).toMatchObject({
      outcome: "written",
      id: "alpha@example.org",
      repoUrl: "https://github.com/example/alpha",
    });
    expect(item("example/no-release")).toMatchObject({ outcome: "refused", failure: "no-release" });
    expect(item("example/clash")).toMatchObject({ outcome: "refused", failure: "entry-exists" });
    expect(item("example/unsafe")).toMatchObject({ outcome: "refused", failure: "unsafe-id" });
    expect(report.read).toHaveLength(6);
  });
});

describe("the discovery state", () => {
  const refusedRepo = pluginRepo("example/no-release", "no-release@example.org", { noRelease: true });
  const at = (pushedAt: string) => ({ ...searched([["example/no-release", pushedAt]]), ...refusedRepo });

  test("records a refused read and reads that repo again only when it was pushed or its record is old", async () => {
    const first = await run(at("2026-10-01T00:00:00Z"));
    expect(first.state["example/no-release"]).toEqual({
      pushedAt: "2026-10-01T00:00:00Z",
      failure: "no-release",
      checkedAt: NOW.toISOString(),
    });

    const same = await run(at("2026-10-01T00:00:00Z"), { state: first.state, now: new Date(NOW.getTime() + DAY) });
    expect(same.reads).toEqual([]);
    expect(same.report.skipped).toContainEqual({ repo: "example/no-release", reason: "refused-before" });

    const pushed = await run(at("2026-10-24T00:00:00Z"), { state: first.state, now: new Date(NOW.getTime() + DAY) });
    expect(pushed.reads).toEqual(["example/no-release"]);

    const old = await run(at("2026-10-01T00:00:00Z"), { state: first.state, now: new Date(NOW.getTime() + 31 * DAY) });
    expect(old.reads).toEqual(["example/no-release"]);
  });

  test("records no read that failed with an HTTP error", async () => {
    const responses = searched([["example/limited", "2026-10-01T00:00:00Z"]]);
    responses["https://api.github.com/repos/example/limited"] = { status: 403, json: { message: "rate limit" } };
    const { state, report } = await run(responses);
    expect(report.read).toContainEqual(expect.objectContaining({ repo: "example/limited", failure: "github-http-error" }));
    expect(state).toEqual({});
  });
});

describe("the limit and the budget", () => {
  // Seven passing repos, listed oldest first: example/p1 was pushed on day 1, example/p7 on day 7.
  const repos = [1, 2, 3, 4, 5, 6, 7].map((n): [string, string] => [`example/p${n}`, `2026-10-0${n}T00:00:00Z`]);
  const responses = (): Responses =>
    Object.assign(searched(repos), ...repos.map(([name], i) => pluginRepo(name, `p${i + 1}@example.org`)));

  test("writes at most limit entries", async () => {
    const { report } = await run(responses(), { limit: 5 });
    expect(report.read.filter((item: ReadItem) => item.outcome === "written")).toHaveLength(5);
  });

  test("reads at most budget repos, newest pushed first", async () => {
    const { reads } = await run(responses(), { budget: 3 });
    expect(reads).toEqual(["example/p7", "example/p6", "example/p5"]);
  });
});

// pnpm sets npm_execpath to its own binary when it runs `pnpm test`. The preload makes
// the command answer its requests and host lookups from `responses` instead of the network.
// The command reads the index from the repo's plugins/, which none of the fixture repos is in.
function pnpmDiscover(args: string[], responses: Responses, cwd: string) {
  const pnpmPath = process.env.npm_execpath;
  if (!pnpmPath) throw new Error("run the tests with `pnpm test`, so they can call pnpm");
  const fixture = join(tempDir(), "responses.json");
  writeFileSync(fixture, JSON.stringify({ source: "discover test", repoUrl: "", responses }));
  const { INIT_CWD: _outer, GITHUB_TOKEN: _token, ...env } = process.env;
  Object.assign(env, { ZPI_FIXTURE: fixture, NODE_OPTIONS: `--import=${PRELOAD}` });
  return spawnSync(pnpmPath, ["--silent", "--dir", ROOT, "discover", ...args], { cwd, encoding: "utf8", env, timeout: 50_000 });
}

describe("pnpm discover", () => {
  test("writes entries and the state under the caller's directory and prints the report", () => {
    const cwd = tempDir();
    const result = pnpmDiscover(["--out", "out", "--state", "state.json", "--limit", "2"], recorded(), cwd);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    // The two newest repos that pass: example/alpha, then Example/Second-Plugin.
    expect(readdirSync(join(cwd, "out")).sort()).toEqual(["alpha@example.org", "second-plugin@example.org"]);
    expect(existsSync(join(cwd, "out/alpha@example.org/meta.json"))).toBe(true);
    expect(existsSync(join(cwd, "out/alpha@example.org/index.json"))).toBe(true);
    const report = JSON.parse(result.stdout);
    expect(report.read.map((item: ReadItem) => [item.repo, item.outcome])).toEqual([
      ["example/alpha", "written"],
      ["example/second-plugin", "written"],
    ]);
    expect(JSON.parse(readFileSync(join(cwd, "state.json"), "utf8"))).toEqual({});
  });

  test("writes nothing and keeps the state when a search request fails", () => {
    const cwd = tempDir();
    const before = `${JSON.stringify({ "example/old": { pushedAt: "2026-01-01T00:00:00Z", failure: "no-release", checkedAt: "2026-10-01T00:00:00Z" } })}\n`;
    writeFileSync(join(cwd, "state.json"), before);
    const responses = recorded();
    responses[`${SEARCH}zotero-addon&per_page=100`] = { status: 503, text: "unavailable" };
    const result = pnpmDiscover(["--out", "out", "--state", "state.json"], responses, cwd);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`GET ${SEARCH}zotero-addon&per_page=100 returned HTTP 503`);
    expect(existsSync(join(cwd, "out"))).toBe(false);
    expect(readFileSync(join(cwd, "state.json"), "utf8")).toBe(before);
  });
});
