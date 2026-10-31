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
  catalog?: string;
  catalogMs?: number;
  catalogMaxBytes?: number;
  onRequest?: (seen: SeenRequest) => void;
}

async function runResult(responses: Responses, options: RunOptions = {}) {
  const { root = tempDir(), outDir = tempDir(), state = {}, skip = new Set<string>(), limit = 50, budget = 100, now = NOW } = options;
  const { readMs, runMs, startedAt, refCheckMs, catalog, catalogMs, catalogMaxBytes } = options;
  const { fetch, requests } = fixtureFetch(responses, options.onRequest);
  const limits = { readMs, runMs, startedAt, refCheckMs, catalog, catalogMs, catalogMaxBytes };
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

  // A 429 or 5xx answer from a download host, or a 403 from a GitHub release URL, says
  // nothing about the repo, unlike a 404. The update.json here is not on a release URL.
  test.each([
    ["update.json", 429, "update-json-http-error", false],
    ["XPI", 503, "xpi-unreadable", false],
    ["XPI", 403, "xpi-unreadable", false],
    ["update.json", 403, "update-json-http-error", true],
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

  test("keeps records under 30 days old of repos the run did not find, and drops old ones and those the index now has", async () => {
    // example/no-release was pushed at this time in the search fixture, so its record stays.
    const record = { pushedAt: "2026-10-17T10:00:00Z", failure: "no-release" as const, checkedAt: NOW.toISOString() };
    const old = { ...record, checkedAt: new Date(NOW.getTime() - 30 * DAY).toISOString() };
    const { state } = await run(recorded(), {
      root: TREE,
      state: { "example/gone": record, "example/gone-long": old, "example/second-plugin": record, "example/no-release": record },
    });
    expect(Object.keys(state)).toEqual(expect.arrayContaining(["example/no-release", "example/gone"]));
    expect(state["example/gone-long"]).toBeUndefined();
    expect(state["example/second-plugin"]).toBeUndefined();
  });
});

describe("the catalog", () => {
  const CATALOG = "https://api.github.com/repos/example/catalog/contents/plugins.json?ref=gh-pages";
  const GRAPHQL = "POST https://api.github.com/graphql";
  const listed = (repos: unknown[]): Responses => ({ [CATALOG]: { json: repos.map((repo) => (typeof repo === "string" ? { repo } : repo)) } });
  // The GraphQL answer for the repos of one lookup request, in the order it names them:
  // a [nameWithOwner, pushedAt] pair, or null for a repo GitHub does not have.
  const found = (...repos: ([string, string | null] | null)[]) => ({
    json: {
      data: Object.fromEntries(
        repos.map((repo, i) => [`r${i}`, repo && { nameWithOwner: repo[0], url: `https://github.com/${repo[0]}`, pushedAt: repo[1] }]),
      ),
      errors: repos.flatMap((repo, i) => (repo ? [] : [{ type: "NOT_FOUND", path: [`r${i}`], message: `Could not resolve r${i}` }])),
    },
  });
  // example/alpha carries a topic; example/listed carries none and is pushed later.
  const base = (): Responses => ({
    ...searched([["example/alpha", "2026-10-01T00:00:00Z"]]),
    ...pluginRepo("example/alpha", "alpha@example.org"),
    ...pluginRepo("example/listed", "listed@example.org", { topics: [] }),
  });
  const withCatalog = { catalog: CATALOG };
  const lookups = (requests: SeenRequest[]) => requests.filter(({ method, url }) => method === "POST" && url.endsWith("/graphql"));

  test("writes the entry of a repo that only the catalog lists, with no topic and no hold", async () => {
    const responses = { ...base(), ...listed(["example/listed"]), [GRAPHQL]: found(["example/listed", "2026-10-20T00:00:00Z"]) };
    const { result, requests } = await runResult(responses, withCatalog);
    if (!result.ok) throw new Error(result.message);
    expect(result.report.read).toContainEqual(
      expect.objectContaining({ repo: "example/listed", source: "catalog", outcome: "written", id: "listed@example.org", holds: [] }),
    );
    expect(result.report.read).toContainEqual(expect.objectContaining({ repo: "example/alpha", source: "topic" }));
    // The name reaches GitHub as a variable, not in the query text.
    const sent = JSON.parse(lookups(requests)[0].body!);
    expect(sent.variables).toEqual({ o0: "example", n0: "listed" });
    expect(sent.query).not.toContain("listed");
  });

  test.each([
    ["the topic search returns it in other letter case", ["example/ALPHA"], null, "topic"],
    ["the topic search returns the name the lookup gives", ["example/old-alpha"], found(["example/alpha", "2026-10-01T00:00:00Z"]), "topic"],
    ["the catalog lists its old and new names", ["example/old-listed", "example/listed"], found(["example/listed", "2026-10-20T00:00:00Z"], ["example/listed", "2026-10-20T00:00:00Z"]), "catalog"],
    ["the catalog lists it twice in other letter case", ["example/listed", "Example/Listed"], found(["example/listed", "2026-10-20T00:00:00Z"]), "catalog"],
  ])("reads a repo once when %s", async (_name, names, answer, source) => {
    const responses = { ...base(), ...listed(names), ...(answer && { [GRAPHQL]: answer }) };
    const { reads, report } = await run(responses, withCatalog);
    const repo = source === "topic" ? "example/alpha" : "example/listed";
    expect(reads.filter((read) => read.toLowerCase() === repo)).toHaveLength(1);
    expect(report.read.filter((item) => item.repo === repo)).toEqual([expect.objectContaining({ source })]);
    expect(report.warnings).toEqual([]);
  });

  test("skips a renamed catalog repo as in-index when an entry names its new name", async () => {
    const root = tempDir();
    mkdirSync(join(root, "listed@example.org"));
    writeFileSync(join(root, "listed@example.org/meta.json"), JSON.stringify({ repoUrl: "https://github.com/example/listed" }));
    const responses = { ...base(), ...listed(["example/old-listed"]), [GRAPHQL]: found(["example/listed", "2026-10-20T00:00:00Z"]) };
    const { reads, report } = await run(responses, { ...withCatalog, root });
    expect(reads).not.toContain("example/listed");
    expect(report.skipped).toContainEqual({ repo: "example/listed", reason: "in-index" });
  });

  // A refusal of a catalog-only repo that the run keeps whenever the catalog or the
  // lookup fails, since it is under 30 days old and the index lacks the repo.
  const kept = { "example/refused": { pushedAt: "2026-10-01T00:00:00Z", failure: "no-release" as const, checkedAt: NOW.toISOString() } };

  test.each([
    ["an HTTP 5xx answer", { status: 503, text: "unavailable" }, {}],
    ["a fetch that rejects", { error: "connection reset" }, {}],
    ["a fetch that passes its time limit", { stall: "headers" as const }, { catalogMs: 50 }],
    ["a body over its size limit", { text: `[${'{"repo":"example/listed"},'.repeat(10)}{}]` }, { catalogMaxBytes: 100 }],
    ["a body that is not JSON", { text: "<html>busy</html>" }, {}],
    ["a JSON body that is not a list", { json: { plugins: [] } }, {}],
  ])("warns and reads the topic repos when the catalog read fails with %s", async (_name, answer, limits) => {
    const responses = { ...base(), [CATALOG]: answer };
    const { reads, report, state } = await run(responses, { ...withCatalog, ...limits, state: kept });
    expect(report.warnings).toEqual([expect.stringMatching(/^the run reads no repo from the catalog, since its read failed: .*plugins\.json/)]);
    expect(reads).toEqual(["example/alpha"]);
    expect(state).toEqual(kept);
  });

  test("warns about each catalog item with no usable owner/repo name and reads the others", async () => {
    const bad = [42, null, {}, { repo: 5 }, { repo: "listed" }, { repo: "example/listed/more" }, { repo: "/listed" }, { repo: 'example/"listed' }];
    const responses = { ...base(), ...listed([...bad, "example/listed"]), [GRAPHQL]: found(["example/listed", "2026-10-20T00:00:00Z"]) };
    const { reads, report } = await run(responses, withCatalog);
    expect(report.warnings).toEqual(bad.map((_, at) => expect.stringMatching(new RegExp(`^catalog item ${at} has no owner/repo name`))));
    expect(report.warnings[7]).toContain('example/\\"listed');
    expect(reads).toContain("example/listed");
  });

  test("warns about and does not read a repo that GitHub does not have or that has no pushed_at", async () => {
    const responses = {
      ...base(),
      ...listed(["example/gone", "example/empty", "example/listed"]),
      [GRAPHQL]: found(null, ["example/empty", null], ["example/listed", "2026-10-20T00:00:00Z"]),
    };
    const { reads, report } = await run(responses, withCatalog);
    expect(report.warnings).toEqual([
      "GitHub has no repo example/gone, which the catalog names, so the run does not read it",
      "the lookup of example/empty gave no name, URL, or valid pushed_at, so the run does not read it",
    ]);
    expect([...reads].sort()).toEqual(["example/alpha", "example/listed"]);
  });

  test.each([
    ["an HTTP 401 answer", { status: 401, json: { message: "Requires authentication" } }],
    ["an HTTP 403 answer", { status: 403, json: { message: "rate limit" } }],
    ["an HTTP 429 answer", { status: 429, json: { message: "slow down" } }],
    ["an HTTP 5xx answer", { status: 502, text: "bad gateway" }],
    ["a fetch that rejects", { error: "connection reset" }],
    ["a body that is not JSON", { text: "<html>busy</html>" }],
    ["an answer with no data", { json: { errors: [{ type: "RATE_LIMITED", message: "API rate limit exceeded" }] } }],
  ])("warns, reads the other repos, and keeps the state when the lookup fails with %s", async (_name, answer) => {
    const responses = { ...base(), ...listed(["example/listed"]), [GRAPHQL]: answer };
    const { reads, report, state } = await run(responses, { ...withCatalog, state: kept });
    expect(report.warnings).toEqual([expect.stringMatching(/^the run reads none of 1 catalog repos from example\/listed, since their lookup failed: /)]);
    expect(reads).toEqual(["example/alpha"]);
    expect(state).toEqual(kept);
  });

  test("warns about a repo whose lookup failed with another error type, and reads the others", async () => {
    const answer = {
      json: {
        data: { r0: null, r1: { nameWithOwner: "example/listed", url: "https://github.com/example/listed", pushedAt: "2026-10-20T00:00:00Z" } },
        errors: [{ type: "FORBIDDEN", path: ["r0"], message: "Resource protected by organization SAML enforcement" }],
      },
    };
    const responses = { ...base(), ...listed(["example/saml", "example/listed"]), [GRAPHQL]: answer };
    const { reads, report, state } = await run(responses, { ...withCatalog, state: kept });
    expect(report.warnings).toEqual(["the lookup of example/saml failed, so the run does not read it: Resource protected by organization SAML enforcement"]);
    expect([...reads].sort()).toEqual(["example/alpha", "example/listed"]);
    expect(state).toEqual(expect.objectContaining(kept));
  });

  test("looks up at most 100 repos in one request", async () => {
    const names = Array.from({ length: 101 }, (_, i) => `example/n${i}`);
    const responses = { ...base(), ...listed(names), [`${GRAPHQL} #1`]: found(), [`${GRAPHQL} #2`]: found() };
    const { requests } = await runResult(responses, withCatalog);
    expect(lookups(requests).map(({ body }) => Object.keys(JSON.parse(body!).variables).length)).toEqual([200, 2]);
  });

  describe("a catalog-only repo", () => {
    const refusedListed = pluginRepo("example/listed", "listed@example.org", { noRelease: true, topics: [] });
    const responses = (pushedAt = "2026-10-20T00:00:00Z") => ({
      ...base(),
      ...refusedListed,
      ...listed(["example/listed"]),
      [GRAPHQL]: found(["example/listed", pushedAt]),
    });

    test("is read before an older topic repo", async () => {
      const { reads } = await run(responses(), withCatalog);
      expect(reads).toEqual(["example/listed", "example/alpha"]);
    });

    test("is skipped as in-index when an entry names it", async () => {
      const root = tempDir();
      mkdirSync(join(root, "listed@example.org"));
      writeFileSync(join(root, "listed@example.org/meta.json"), JSON.stringify({ repoUrl: "https://github.com/Example/Listed" }));
      const { reads, report } = await run(responses(), { ...withCatalog, root });
      expect(reads).not.toContain("example/listed");
      expect(report.skipped).toContainEqual({ repo: "example/listed", reason: "in-index" });
    });

    test("is skipped as in-skip-set when the skip set names it", async () => {
      const { reads, report } = await run(responses(), { ...withCatalog, skip: new Set(["example/listed"]) });
      expect(reads).not.toContain("example/listed");
      expect(report.skipped).toContainEqual({ repo: "example/listed", reason: "in-skip-set" });
    });

    test("is skipped as refused-before while its pushed_at is unchanged and its refusal is under 30 days old", async () => {
      const first = await run(responses(), withCatalog);
      expect(first.state["example/listed"]).toMatchObject({ pushedAt: "2026-10-20T00:00:00Z", failure: "no-release" });
      const later = { ...withCatalog, state: first.state, now: new Date(NOW.getTime() + DAY) };
      const same = await run(responses(), later);
      expect(same.report.skipped).toContainEqual({ repo: "example/listed", reason: "refused-before" });
      const pushed = await run(responses("2026-10-26T00:00:00Z"), later);
      expect(pushed.reads).toContain("example/listed");
    });

    test("keeps its record under 30 days old when a run does not find it", async () => {
      const first = await run(responses(), withCatalog);
      const { state } = await run(base(), { state: first.state, now: new Date(NOW.getTime() + DAY) });
      expect(state["example/listed"]).toEqual(first.state["example/listed"]);
      const { state: later } = await run(base(), { state: first.state, now: new Date(NOW.getTime() + 30 * DAY) });
      expect(later["example/listed"]).toBeUndefined();
    });
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
    const drafted = await draftEntry("https://github.com/example/t2", { fetch, lookup: publicLookup, outDir: tempDir(), ids: new Set(), names: [], readMs: 200 });
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
      const pending = draftEntry("https://github.com/example/t2", { fetch, lookup: publicLookup, outDir: tempDir(), ids: new Set(), names: [] });
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
