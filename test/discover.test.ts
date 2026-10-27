import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, test, vi } from "vitest";
import { type DiscoveryState, discover, draftEntry, type ReadItem } from "../src/discover/discover.ts";
import { githubClient } from "../src/upstream/reader.ts";
import { fixtureFetch, loadFixture, type Responses, type SeenRequest } from "./support/fixture-fetch.ts";
import { pluginRepo, searchPage } from "./support/plugin-repo.ts";

const ROOT = resolve(import.meta.dirname, "..");
// Holds second-plugin@example.org, whose repoUrl is https://github.com/example/second-plugin.
const TREE = resolve(ROOT, "test/fixtures/build/plugins");
const PRELOAD = resolve(ROOT, "test/support/preload-fixture.ts");
const searchUrl = (topic: string) =>
  `https://api.github.com/search/repositories?q=topic%3A${topic}&sort=updated&order=desc&per_page=100`;
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
    [searchUrl("zotero-plugin")]: { json: searchPage(plugin) },
    [searchUrl("zotero-addon")]: { json: searchPage(addon) },
  };
}

interface RunOptions {
  root?: string;
  outDir?: string;
  state?: DiscoveryState;
  skip?: Set<string>;
  limit?: number;
  budget?: number;
  now?: Date;
  readMs?: number;
  runMs?: number;
  startedAt?: number;
  refCheckMs?: number;
  onRequest?: (seen: SeenRequest) => void;
}

async function runResult(responses: Responses, options: RunOptions = {}) {
  const { root = tempDir(), outDir = tempDir(), state = {}, skip = new Set<string>(), limit = 50, budget = 100, now = NOW } = options;
  const { readMs, runMs, startedAt, refCheckMs } = options;
  const { fetch, requests } = fixtureFetch(responses, options.onRequest);
  const limits = { readMs, runMs, startedAt, refCheckMs };
  const result = await discover({ root, outDir, fetch, lookup: publicLookup, state, skip, limit, budget, now, ...limits });
  return { result, requests };
}

async function run(responses: Responses, options: RunOptions = {}) {
  const { result, requests } = await runResult(responses, options);
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

  test("matches an entry's repoUrl whose letter case differs from the search result", async () => {
    const root = tempDir();
    mkdirSync(join(root, "alpha@example.org"));
    writeFileSync(join(root, "alpha@example.org/meta.json"), JSON.stringify({ repoUrl: "https://github.com/EXAMPLE/Alpha" }));
    const { reads, report } = await run(recorded(), { root });
    expect(reads).not.toContain("example/alpha");
    expect(report.skipped).toContainEqual({ repo: "example/alpha", reason: "in-index" });
  });

  test("reports each repo it reads as written or with its failure name", async () => {
    const { report, state } = await run(recorded(), { root: TREE });
    const item = (repo: string) => report.read.find((read: ReadItem) => read.repo === repo);
    expect(item("example/alpha")).toMatchObject({
      outcome: "written",
      id: "alpha@example.org",
      repoUrl: "https://github.com/example/alpha",
      version: "1.0.0",
      strictMinVersion: "7.0",
      strictMaxVersion: "8.*",
    });
    expect(item("example/no-release")).toMatchObject({ outcome: "refused", failure: "no-release" });
    expect(item("example/clash")).toMatchObject({ outcome: "refused", failure: "entry-exists" });
    expect(item("example/unsafe")).toMatchObject({ outcome: "refused", failure: "unsafe-id" });
    expect(report.read).toHaveLength(6);
    expect(Object.keys(state).sort()).toEqual(["example/clash", "example/no-release", "example/unsafe"]);
  });

  test("does not record a repo whose entry directory already exists in the output directory", async () => {
    const outDir = tempDir();
    mkdirSync(join(outDir, "alpha@example.org"));
    const { report, state } = await run(recorded(), { outDir });
    expect(report.read).toContainEqual(expect.objectContaining({ repo: "example/alpha", failure: "entry-exists" }));
    expect(state["example/alpha"]).toBeUndefined();
  });

  test("ends the run with a message when the index cannot be read", async () => {
    const root = join(tempDir(), "file");
    writeFileSync(root, "");
    const { result } = await runResult(recorded(), { root });
    expect(result).toMatchObject({ ok: false, message: expect.stringContaining(`cannot read ${root}`) });
  });
});

describe("the search", () => {
  const plugin = searchUrl("zotero-plugin");
  test.each([
    ["a next page on another host", { headers: { link: '<https://example.org/page2>; rel="next"' } }, "is not on"],
    ["a next page read before", { headers: { link: `<${plugin}>; rel="next"` } }, "was read before"],
    ["a body with no items", { json: { total_count: 0 } }, "no list of items"],
  ])("ends the run before any read for %s", async (_name, page, message) => {
    const responses = { ...recorded(), [plugin]: { json: searchPage([]), ...page } };
    const { result, requests } = await runResult(responses);
    expect(result).toMatchObject({ ok: false, message: expect.stringContaining(message) });
    expect(requests.some(({ url }) => url.includes("/repos/"))).toBe(false);
  });

  test("warns about incomplete results, more repos than the search returns, and items it cannot use", async () => {
    const page = {
      total_count: 1500,
      incomplete_results: true,
      items: [
        { full_name: "example/no-date", html_url: "https://github.com/example/no-date" },
        { full_name: "example/bad-date", html_url: "https://github.com/example/bad-date", pushed_at: "yesterday" },
      ],
    };
    const { report, reads } = await run({ ...searched([]), [searchUrl("zotero-plugin")]: { json: page } });
    expect(report.warnings).toEqual([
      expect.stringContaining("incomplete results"),
      "topic:zotero-plugin has 1500 repos, and the search returns only the first 1000",
      expect.stringContaining("no full_name, html_url, or valid pushed_at"),
      expect.stringContaining("no full_name, html_url, or valid pushed_at"),
    ]);
    expect(reads).toEqual([]);
  });

  test("the GitHub client sends no request to a URL off the API host", async () => {
    const { fetch, requests } = fixtureFetch({});
    await expect(githubClient(fetch).get("https://example.org/search")).rejects.toMatchObject({ failure: "request-failed" });
    expect(requests).toEqual([]);
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

    const future = await run(at("2026-10-01T00:00:00Z"), { state: first.state, now: new Date(NOW.getTime() - DAY) });
    expect(future.reads).toEqual(["example/no-release"]);
  });

  test.each([
    ["an HTTP error", { status: 403, json: { message: "rate limit" } }, "github-http-error"],
    ["an error the reader does not name", { unexpected: "boom" }, "unexpected-error"],
  ])("records no read that failed with %s", async (_name, response, failure) => {
    const responses = searched([["example/limited", "2026-10-01T00:00:00Z"]]);
    responses["https://api.github.com/repos/example/limited"] = response;
    const { state, report } = await run(responses);
    expect(report.read).toContainEqual(expect.objectContaining({ repo: "example/limited", failure }));
    expect(state).toEqual({});
  });

  // A 429 or 5xx answer from a download host says nothing about the repo, unlike a 404.
  test.each([
    ["update.json", 429, "update-json-http-error", false],
    ["XPI", 503, "xpi-unreadable", false],
    ["update.json", 404, "update-json-http-error", true],
    ["XPI", 404, "xpi-unreadable", true],
  ])("an HTTP error answer for the %s, status %i, fails with %s, kept in the state: %s", async (file, status, failure, kept) => {
    const repo = "example/downloads";
    const responses = { ...searched([[repo, "2026-10-01T00:00:00Z"]]), ...pluginRepo(repo, "downloads@example.org") };
    const url =
      file === "XPI"
        ? `https://github.com/${repo}/releases/download/v1.0.0/plugin.xpi`
        : `https://raw.githubusercontent.com/${repo}/main/update.json`;
    expect(responses[url]).toBeDefined();
    responses[url] = { status, text: "error" };
    const { state, report } = await run(responses);
    expect(report.read).toContainEqual(expect.objectContaining({ repo, outcome: "refused", failure }));
    expect(state).toEqual(kept ? { [repo]: { pushedAt: "2026-10-01T00:00:00Z", failure, checkedAt: NOW.toISOString() } } : {});
  });

  test("drops records of repos the search no longer finds or the index now has", async () => {
    // example/no-release was pushed at this time in the search fixture, so its record stays.
    const record = { pushedAt: "2026-10-17T10:00:00Z", failure: "no-release" as const, checkedAt: NOW.toISOString() };
    const { state } = await run(recorded(), {
      root: TREE,
      state: { "example/gone": record, "example/second-plugin": record, "example/no-release": record },
    });
    expect(Object.keys(state)).toEqual(expect.arrayContaining(["example/no-release"]));
    expect(state["example/gone"]).toBeUndefined();
    expect(state["example/second-plugin"]).toBeUndefined();
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

  test("reads at most budget repos, newest pushed first, and counts the rest as unread", async () => {
    const { reads, report } = await run(responses(), { budget: 3 });
    expect(reads).toEqual(["example/p7", "example/p6", "example/p5"]);
    expect(report.unread).toBe(4);
  });
});

describe("the time limits", () => {
  // Three passing repos, newest pushed first: example/t3, then example/t2, whose XPI never
  // answers, then example/t1.
  const repos: [string, string][] = [
    ["example/t3", "2026-10-03T00:00:00Z"],
    ["example/t2", "2026-10-02T00:00:00Z"],
    ["example/t1", "2026-10-01T00:00:00Z"],
  ];
  const stalledXpi = "https://github.com/example/t2/releases/download/v1.0.0/plugin.xpi";
  function stalled(): Responses {
    const responses: Responses = Object.assign(searched(repos), ...repos.map(([name], i) => pluginRepo(name, `t${3 - i}@example.org`)));
    responses[stalledXpi].stall = "headers";
    return responses;
  }
  // Records from a run before each repo's last push, so the run reads both repos again.
  const before = { pushedAt: "2026-09-01T00:00:00Z", failure: "no-release" as const, checkedAt: "2026-09-01T00:00:00Z" };
  const state: DiscoveryState = { "example/t2": before, "example/t1": before };

  test("refuses a read that passes its limit as request-failed, keeps its record, and reads the next repo", async () => {
    const { reads, report, state: after } = await run(stalled(), { state, readMs: 1000 });
    expect(reads).toEqual(["example/t3", "example/t2", "example/t1"]);
    expect(report.read.map((item: ReadItem) => [item.repo, item.outcome === "written" ? "written" : item.failure])).toEqual([
      ["example/t3", "written"],
      ["example/t2", "request-failed"],
      ["example/t1", "written"],
    ]);
    expect(report.read[1]).toMatchObject({ message: expect.stringContaining("passed its time limit of 1000 ms") });
    expect(after).toEqual({ "example/t2": before });
  });

  test("marks a read that passes its limit as build-level", async () => {
    const { fetch } = fixtureFetch(stalled());
    const drafted = await draftEntry("https://github.com/example/t2", { fetch, lookup: publicLookup, outDir: tempDir(), ids: new Set(), readMs: 200 });
    expect(drafted).toMatchObject({ ok: false, failure: "request-failed", recorded: false, buildLevel: true });
  });

  test("starts no read once the run limit has passed, counts the rest as unread, and warns", async () => {
    // The run's clock stands still until t2's read waits on its stalled XPI, then passes
    // the run limit, so the cut does not depend on how fast the runner is.
    let elapsed = 0;
    const clock = vi.spyOn(performance, "now").mockImplementation(() => elapsed);
    try {
      const onRequest = (seen: SeenRequest) => {
        if (seen.url === stalledXpi) elapsed = 1000;
      };
      const limits = { readMs: 1000, runMs: 1000, startedAt: 0, onRequest };
      const { reads, report, state: after } = await run(stalled(), { state, ...limits });
      expect(reads).toEqual(["example/t3", "example/t2"]);
      expect(report.unread).toBe(1);
      expect(report.warnings).toContainEqual(expect.stringContaining("reads no repo after 1000 ms, its time limit"));
      expect(after).toEqual(state);
    } finally {
      clock.mockRestore();
    }
  });

  test("names the default limits of 3 minutes for a read and 18 minutes for the run", async () => {
    let reached!: () => void;
    const waiting = new Promise<void>((resolve) => (reached = resolve));
    const { fetch } = fixtureFetch(stalled(), (seen) => seen.url === stalledXpi && reached());
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const pending = draftEntry("https://github.com/example/t2", { fetch, lookup: publicLookup, outDir: tempDir(), ids: new Set() });
      // The clock moves only once the read waits on the stalled XPI.
      await waiting;
      await vi.advanceTimersByTimeAsync(3 * 60 * 1000);
      expect(await pending).toMatchObject({ failure: "request-failed", message: expect.stringContaining("time limit of 3 minutes") });
    } finally {
      vi.useRealTimers();
    }

    const { reads, report } = await run(stalled(), { startedAt: performance.now() - 18 * 60 * 1000 });
    expect(reads).toEqual([]);
    expect(report.unread).toBe(3);
    expect(report.warnings).toContainEqual(expect.stringContaining("reads no repo after 18 minutes, its time limit"));
  });

  test("refuses, without recording, a repo whose branch-name check passes its limit", async () => {
    // A git on PATH whose check-ref-format never exits.
    const shims = tempDir();
    const realGit = spawnSync("sh", ["-c", "command -v git"], { encoding: "utf8" }).stdout.trim();
    writeFileSync(join(shims, "git"), `#!/bin/sh\n[ "$1" = check-ref-format ] && exec sleep 600\nexec "${realGit}" "$@"\n`);
    chmodSync(join(shims, "git"), 0o755);
    const outDir = tempDir();
    const saved = process.env.PATH;
    process.env.PATH = `${shims}:${saved}`;
    try {
      const responses = { ...searched([["example/t3", "2026-10-03T00:00:00Z"]]), ...pluginRepo("example/t3", "t3@example.org") };
      const { report, state: after } = await run(responses, { outDir, refCheckMs: 300 });
      expect(report.read).toEqual([
        expect.objectContaining({ repo: "example/t3", failure: "unexpected-error", message: expect.stringContaining("git check-ref-format passed its time limit of 300 ms") }),
      ]);
      expect(after).toEqual({});
      expect(readdirSync(outDir)).toEqual([]);
    } finally {
      process.env.PATH = saved;
    }
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
    responses[searchUrl("zotero-addon")] = { status: 503, text: "unavailable" };
    const result = pnpmDiscover(["--out", "out", "--state", "state.json"], responses, cwd);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`GET ${searchUrl("zotero-addon")} returned HTTP 503`);
    expect(existsSync(join(cwd, "out"))).toBe(false);
    expect(readFileSync(join(cwd, "state.json"), "utf8")).toBe(before);
  });

  test.each([
    ["an option with no value", ["--out", "--state", "state.json"]],
    ["a limit below 1", ["--limit", "0"]],
  ])("prints the usage for %s", (_name, args) => {
    const result = pnpmDiscover(args, recorded(), tempDir());
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("usage: pnpm discover");
    expect(result.stdout).toBe("");
  });

  test("starts from an empty state, with a warning, when the state file is not a JSON object", () => {
    // pnpm passes the caller's directory with symlinks resolved, as /private/var on macOS.
    const cwd = realpathSync(tempDir());
    writeFileSync(join(cwd, "state.json"), "[]");
    const result = pnpmDiscover(["--out", "out", "--state", "state.json", "--limit", "1"], recorded(), cwd);
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).warnings[0]).toBe(`${join(cwd, "state.json")} is not a JSON object, so the run started from an empty state`);
  });

  test("writes nothing when the state file cannot be read", () => {
    const cwd = realpathSync(tempDir());
    writeFileSync(join(cwd, "blocker"), "");
    const result = pnpmDiscover(["--out", "out", "--state", "blocker/state.json"], recorded(), cwd);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`cannot read ${join(cwd, "blocker/state.json")}`);
    expect(existsSync(join(cwd, "out"))).toBe(false);
  });

  test("prints the report and exits 1 when the state cannot be written", () => {
    const cwd = realpathSync(tempDir());
    const stateDir = join(cwd, "locked");
    mkdirSync(stateDir);
    writeFileSync(join(stateDir, "state.json"), "{}");
    chmodSync(stateDir, 0o555);
    try {
      const result = pnpmDiscover(["--out", "out", "--state", "locked/state.json", "--limit", "1"], recorded(), cwd);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(`cannot write ${join(stateDir, "state.json")}`);
      expect(JSON.parse(result.stdout).read).toContainEqual(expect.objectContaining({ repo: "example/alpha", outcome: "written" }));
      expect(existsSync(join(cwd, "out/alpha@example.org"))).toBe(true);
    } finally {
      chmodSync(stateDir, 0o755);
    }
  });
});
