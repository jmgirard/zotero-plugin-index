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
import {
  CATALOG_URL,
  CODE_SEARCHES,
  type Clock,
  type DiscoveryState,
  discover,
  draftEntry,
  type ReadItem,
} from "../src/discover/discover.ts";
import { githubClient } from "../src/upstream/reader.ts";
import { fixtureFetch, loadFixture, type Recorded, type Responses, type SeenRequest } from "./support/fixture-fetch.ts";
import { pluginRepo, searchPage } from "./support/plugin-repo.ts";

const ROOT = resolve(import.meta.dirname, "..");
// Holds second-plugin@example.org, whose repoUrl is https://github.com/example/second-plugin.
const TREE = resolve(ROOT, "test/fixtures/build/plugins");
const PRELOAD = resolve(ROOT, "test/support/preload-fixture.ts");
const searchUrl = (topic: string) =>
  `https://api.github.com/search/repositories?q=topic%3A${topic}&sort=updated&order=desc&per_page=100`;
const NOW = new Date("2026-10-25T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
// The fake clock's epoch time when its run starts, on a whole second, as rate-limit resets are.
const WALL_START = Date.parse("2026-10-31T18:00:00Z");
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
  codeSearch?: string[];
  codeSearchMs?: number;
  clock?: Clock;
  onRequest?: (seen: SeenRequest) => void;
}

async function runResult(responses: Responses, options: RunOptions = {}) {
  const { root = tempDir(), outDir = tempDir(), state = {}, skip = new Set<string>(), limit = 50, budget = 100, now = NOW } = options;
  // The run starts now on its clock unless a test sets `startedAt`, so a long-lived test worker does not pass the run's limits.
  const { readMs, runMs, startedAt = options.clock?.now() ?? performance.now(), refCheckMs, catalog, catalogMs, catalogMaxBytes, codeSearch, codeSearchMs, clock } = options;
  const { fetch, requests } = fixtureFetch(responses, options.onRequest);
  const limits = { readMs, runMs, startedAt, refCheckMs, catalog, catalogMs, catalogMaxBytes, codeSearch, codeSearchMs, clock };
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

  test("drops a record whose key is not a lowercase owner/repo or whose value is not an object", async () => {
    const record = { pushedAt: "2026-10-17T10:00:00Z", failure: "no-release" as const, checkedAt: NOW.toISOString() };
    const forged = JSON.parse(`{"__proto__": {"checkedAt": "${NOW.toISOString()}", "example/hidden": ${JSON.stringify(record)}}, "example/null": null, "Example/Upper": ${JSON.stringify(record)}}`);
    const responses = { ...searched([["example/hidden", "2026-10-17T10:00:00Z"]]), ...pluginRepo("example/hidden", "hidden@example.org") };
    const { reads, state } = await run(responses, { state: forged });
    expect(reads).toEqual(["example/hidden"]);
    expect(Object.keys(state)).toEqual([]);
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
const lookups = (requests: SeenRequest[]) => requests.filter(({ method, url }) => method === "POST" && url.endsWith("/graphql"));

describe("the catalog", () => {
  // example/alpha carries a topic; example/listed carries none and is pushed later.
  const base = (): Responses => ({
    ...searched([["example/alpha", "2026-10-01T00:00:00Z"]]),
    ...pluginRepo("example/alpha", "alpha@example.org"),
    ...pluginRepo("example/listed", "listed@example.org", { topics: [] }),
  });
  const withCatalog = { catalog: CATALOG };

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

  test("reads a repo once when the topic search returns Example/Alpha and the catalog lists example/ALPHA", async () => {
    const responses = {
      ...searched([["Example/Alpha", "2026-10-01T00:00:00Z"]]),
      ...pluginRepo("Example/Alpha", "alpha@example.org"),
      ...listed(["example/ALPHA"]),
    };
    const { result, requests } = await runResult(responses, withCatalog);
    if (!result.ok) throw new Error(result.message);
    expect(requests.filter(({ url }) => url.toLowerCase() === "https://api.github.com/repos/example/alpha")).toHaveLength(1);
    expect(lookups(requests)).toEqual([]);
    expect(result.report.read).toEqual([expect.objectContaining({ repo: "example/alpha", source: "topic" })]);
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
    ["a fetch that passes its time limit", { stall: "headers" as const }, { catalogMs: 1000 }],
    ["a body that passes its time limit", { stall: "body" as const }, { catalogMs: 1000 }],
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
    expect(report.warnings).toEqual([expect.stringMatching(/^the run reads none of 1 catalog repos from example\/listed on, since their lookup failed: /)]);
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

  test("sends no more lookup requests after one fails, with one warning for all the repos left", async () => {
    const names = Array.from({ length: 101 }, (_, i) => `example/n${i}`);
    const responses = { ...base(), ...listed(names), [`${GRAPHQL} #1`]: { status: 401, json: { message: "Requires authentication" } } };
    const { result, requests } = await runResult(responses, withCatalog);
    if (!result.ok) throw new Error(result.message);
    expect(lookups(requests)).toHaveLength(1);
    expect(result.report.warnings).toEqual([expect.stringMatching(/^the run reads none of 101 catalog repos from example\/n0 on, since their lookup failed: .*HTTP 401/)]);
  });

  test("gives a repo with no answer the message of an error that names no repo", async () => {
    const answer = { json: { data: { r0: null }, errors: [{ message: "Something went wrong: timeout" }] } };
    const { report } = await run({ ...base(), ...listed(["example/slow"]), [GRAPHQL]: answer }, withCatalog);
    expect(report.warnings).toEqual(["the lookup of example/slow failed, so the run does not read it: Something went wrong: timeout"]);
  });

  test("names at most 10 catalog items with no usable name and counts the rest", async () => {
    const bad = Array.from({ length: 12 }, () => ({ repository: "example/listed" }));
    const { report } = await run({ ...base(), ...listed(bad) }, withCatalog);
    expect(report.warnings).toHaveLength(11);
    expect(report.warnings[9]).toMatch(/^catalog item 9 has no owner\/repo name/);
    expect(report.warnings[10]).toBe("2 more catalog items have no owner/repo name, so the run skips them");
  });

  test("names the source of a refused read", async () => {
    const responses = { ...base(), ...pluginRepo("example/listed", "listed@example.org", { noRelease: true, topics: [] }), ...listed(["example/listed"]) };
    const { report } = await run({ ...responses, [GRAPHQL]: found(["example/listed", "2026-10-20T00:00:00Z"]) }, withCatalog);
    expect(report.read).toContainEqual(expect.objectContaining({ repo: "example/listed", outcome: "refused", failure: "no-release", source: "catalog" }));
  });

  test("looks up at most 100 repos in one request", async () => {
    const names = Array.from({ length: 101 }, (_, i) => `example/n${i}`);
    const responses = { ...base(), ...listed(names), [`${GRAPHQL} #1`]: found(), [`${GRAPHQL} #2`]: found() };
    const { requests } = await runResult(responses, withCatalog);
    expect(lookups(requests).map(({ body }) => Object.keys(JSON.parse(body!).variables).length)).toEqual([200, 2]);
  });

  test("starts no lookup request once the run limit has passed, and warns", async () => {
    // The run's clock passes the run limit when the first lookup request is sent.
    let elapsed = 0;
    const clock = vi.spyOn(performance, "now").mockImplementation(() => elapsed);
    try {
      const names = Array.from({ length: 101 }, (_, i) => `example/n${i}`);
      const onRequest = (seen: SeenRequest) => {
        if (seen.method === "POST") elapsed = 1000;
      };
      const responses = { ...base(), ...listed(names), [GRAPHQL]: found() };
      const { result, requests } = await runResult(responses, { ...withCatalog, runMs: 1000, startedAt: 0, onRequest });
      if (!result.ok) throw new Error(result.message);
      expect(lookups(requests)).toHaveLength(1);
      expect(result.report.warnings).toContainEqual("the run looks up no catalog repo after 1000 ms, its time limit, so it does not read 1 of them");
    } finally {
      clock.mockRestore();
    }
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

    test("is skipped as in-index, with no lookup, when an entry names it", async () => {
      const root = tempDir();
      mkdirSync(join(root, "listed@example.org"));
      writeFileSync(join(root, "listed@example.org/meta.json"), JSON.stringify({ repoUrl: "https://github.com/Example/Listed" }));
      const { result, requests } = await runResult(responses(), { ...withCatalog, root });
      if (!result.ok) throw new Error(result.message);
      expect(requests.map(({ url }) => url)).not.toContain("https://api.github.com/repos/example/listed");
      expect(lookups(requests)).toEqual([]);
      expect(result.report.skipped).toContainEqual({ repo: "example/listed", reason: "in-index" });
    });

    test("is skipped as in-skip-set, with no lookup, when the skip set names it", async () => {
      const { result, requests } = await runResult(responses(), { ...withCatalog, skip: new Set(["example/listed"]) });
      if (!result.ok) throw new Error(result.message);
      expect(requests.map(({ url }) => url)).not.toContain("https://api.github.com/repos/example/listed");
      expect(lookups(requests)).toEqual([]);
      expect(result.report.skipped).toContainEqual({ repo: "example/listed", reason: "in-skip-set" });
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

describe("the code search", () => {
  const codeUrl = (query: string) => `https://api.github.com/search/code?${new URLSearchParams({ q: query, per_page: "100" })}`;
  // One code search page whose items lie in the repos named.
  const codePage = (repos: string[]) => ({
    json: {
      total_count: repos.length,
      incomplete_results: false,
      items: repos.map((name) => ({ name: "manifest.json", path: "addon/manifest.json", repository: { full_name: name, html_url: `https://github.com/${name}` } })),
    },
  });
  const searchedCode = (pages: Record<string, string[]>): Responses =>
    Object.fromEntries(Object.entries(pages).map(([query, repos]) => [codeUrl(query), codePage(repos)]));
  // example/alpha carries a topic; example/coded carries none and is pushed later.
  const base = (): Responses => ({
    ...searched([["example/alpha", "2026-10-01T00:00:00Z"]]),
    ...pluginRepo("example/alpha", "alpha@example.org"),
    ...pluginRepo("example/coded", "coded@example.org", { topics: [] }),
  });
  const withCode = { codeSearch: ["q1", "q2"] };

  test("runs the five queries and writes the entry of a repo that only code search finds, with no topic and no hold", async () => {
    const pages = Object.fromEntries(CODE_SEARCHES.map((query, i) => [query, i === 2 ? ["example/coded"] : []]));
    const responses = { ...base(), ...searchedCode(pages), [GRAPHQL]: found(["example/coded", "2026-10-20T00:00:00Z"]) };
    const { result, requests } = await runResult(responses, { codeSearch: CODE_SEARCHES });
    if (!result.ok) throw new Error(result.message);
    expect(requests.filter(({ url }) => url.includes("/search/code?")).map(({ url }) => url)).toEqual(CODE_SEARCHES.map(codeUrl));
    expect(result.report.read).toContainEqual(
      expect.objectContaining({ repo: "example/coded", source: "code-search", outcome: "written", id: "coded@example.org", holds: [] }),
    );
    expect(result.report.warnings).toEqual([]);
  });

  test.each([
    ["the catalog and code search both name it", ["example/coded"], ["example/coded"], [found(["example/coded", "2026-10-20T00:00:00Z"])], "catalog", 1],
    [
      "the catalog names its old name and code search its new name",
      ["example/old-coded"],
      ["example/coded"],
      [found(["example/coded", "2026-10-20T00:00:00Z"])],
      "catalog",
      1,
    ],
    [
      "code search names its old name and the catalog its new name",
      ["example/coded"],
      ["example/old-coded"],
      [found(["example/coded", "2026-10-20T00:00:00Z"]), found(["example/coded", "2026-10-20T00:00:00Z"])],
      "catalog",
      2,
    ],
    ["a topic search returns it and code search names it in other letter case", [], ["Example/ALPHA"], [], "topic", 0],
    ["a topic search returns the name the code search lookup gives", [], ["example/old-alpha"], [found(["example/alpha", "2026-10-01T00:00:00Z"])], "topic", 1],
  ])("reads a repo once, with the source of the first source in the order, when %s", async (_name, catalogNames, codeNames, answers, source, lookupCount) => {
    const responses: Responses = { ...base(), ...listed(catalogNames), ...searchedCode({ q1: codeNames.slice(0, 1), q2: codeNames.slice(1) }) };
    for (const [i, answer] of answers.entries()) responses[`${GRAPHQL} #${i + 1}`] = answer;
    const { result, requests } = await runResult(responses, { ...withCode, catalog: CATALOG });
    if (!result.ok) throw new Error(result.message);
    const repo = source === "topic" ? "example/alpha" : "example/coded";
    expect(requests.filter(({ url }) => url === `https://api.github.com/repos/${repo}`)).toHaveLength(1);
    expect(result.report.read.filter((item) => item.repo === repo)).toEqual([expect.objectContaining({ source })]);
    expect(lookups(requests)).toHaveLength(lookupCount);
    expect(result.report.warnings).toEqual([]);
  });

  describe("a code-search-only repo", () => {
    const refusedCoded = pluginRepo("example/coded", "coded@example.org", { noRelease: true, topics: [] });
    const responses = (pushedAt = "2026-10-20T00:00:00Z") => ({
      ...base(),
      ...refusedCoded,
      ...searchedCode({ q1: ["example/coded"], q2: [] }),
      [GRAPHQL]: found(["example/coded", pushedAt]),
    });

    test("is read before an older topic repo", async () => {
      const { reads } = await run(responses(), withCode);
      expect(reads).toEqual(["example/coded", "example/alpha"]);
    });

    test("is skipped as in-index, with no lookup, when an entry names it", async () => {
      const root = tempDir();
      mkdirSync(join(root, "coded@example.org"));
      writeFileSync(join(root, "coded@example.org/meta.json"), JSON.stringify({ repoUrl: "https://github.com/Example/Coded" }));
      const { result, requests } = await runResult(responses(), { ...withCode, root });
      if (!result.ok) throw new Error(result.message);
      expect(requests.map(({ url }) => url)).not.toContain("https://api.github.com/repos/example/coded");
      expect(lookups(requests)).toEqual([]);
      expect(result.report.skipped).toContainEqual({ repo: "example/coded", reason: "in-index" });
    });

    test("is skipped as in-skip-set, with no lookup, when the skip set names it", async () => {
      const { result, requests } = await runResult(responses(), { ...withCode, skip: new Set(["example/coded"]) });
      if (!result.ok) throw new Error(result.message);
      expect(requests.map(({ url }) => url)).not.toContain("https://api.github.com/repos/example/coded");
      expect(lookups(requests)).toEqual([]);
      expect(result.report.skipped).toContainEqual({ repo: "example/coded", reason: "in-skip-set" });
    });

    test("is skipped as refused-before while its pushed_at is unchanged and its refusal is under 30 days old", async () => {
      const first = await run(responses(), withCode);
      expect(first.report.read).toContainEqual(expect.objectContaining({ repo: "example/coded", outcome: "refused", failure: "no-release", source: "code-search" }));
      expect(first.state["example/coded"]).toMatchObject({ pushedAt: "2026-10-20T00:00:00Z", failure: "no-release" });
      const later = { ...withCode, state: first.state, now: new Date(NOW.getTime() + DAY) };
      const same = await run(responses(), later);
      expect(same.report.skipped).toContainEqual({ repo: "example/coded", reason: "refused-before" });
      const pushed = await run(responses("2026-10-26T00:00:00Z"), later);
      expect(pushed.reads).toContain("example/coded");
    });

    test("is not read, with a warning, when its lookup fails", async () => {
      const { reads, report } = await run({ ...responses(), [GRAPHQL]: { status: 502, text: "bad gateway" } }, withCode);
      expect(report.warnings).toEqual([expect.stringMatching(/^the run reads none of 1 code-search repos from example\/coded on, since their lookup failed: .*HTTP 502/)]);
      expect(reads).toEqual(["example/alpha"]);
    });
  });

  // A clock that moves only when the run sleeps, or when a test sets `at`.
  function fakeClock() {
    const clock = { at: 0, now: () => clock.at, wall: () => WALL_START + clock.at, sleep: async (ms: number) => void (clock.at += ms) };
    return clock;
  }
  // `count` pages of one query, each with one repo, example/<query>-p<n>, linked by `next`.
  const paged = (query: string, count: number): Responses =>
    Object.fromEntries(
      Array.from({ length: count }, (_, i) => [
        i === 0 ? codeUrl(query) : `${codeUrl(query)}&page=${i + 1}`,
        { ...codePage([`example/${query}-p${i + 1}`]), ...(i + 1 < count && { headers: { link: `<${codeUrl(query)}&page=${i + 2}>; rel="next"` } }) },
      ]),
    );
  const codeRequests = (requests: SeenRequest[]) => requests.filter(({ url }) => url.includes("/search/code?"));

  test("sends no more than 10 code search requests in any 60-second window, failed requests included", async () => {
    const clock = fakeClock();
    const times: number[] = [];
    const onRequest = (seen: SeenRequest) => seen.url.includes("/search/code?") && times.push(clock.now());
    const responses = { ...base(), ...paged("q1", 7), [codeUrl("q2")]: { status: 503, text: "unavailable" }, ...paged("q3", 5) };
    const { result } = await runResult(responses, { codeSearch: ["q1", "q2", "q3"], clock, onRequest });
    if (!result.ok) throw new Error(result.message);
    expect(times).toHaveLength(13);
    for (let i = 0; i + 10 < times.length; i++) expect(times[i + 10] - times[i]).toBeGreaterThanOrEqual(60_000);
    const searchWarnings = result.report.warnings.filter((warning) => warning.startsWith("the code search"));
    expect(searchWarnings).toEqual([expect.stringMatching(/^the code search for q2 read 0 pages and stopped, since its request failed: .*HTTP 503/)]);
  });

  test("counts the time of the code search toward the run's time limit", async () => {
    const clock = fakeClock();
    const responses = { ...base(), ...paged("q1", 11), [GRAPHQL]: found() };
    const { reads, report } = await run(responses, { codeSearch: ["q1"], clock, runMs: 30_000, startedAt: 0 });
    expect(reads).toEqual([]);
    expect(report.warnings).toEqual([
      "the run looks up no code-search repo after 30000 ms, its time limit, so it does not read 11 of them",
      "the run reads no repo after 30000 ms, its time limit, so it did not reach 1 repos",
    ]);
  });

  test("stops each query not finished 8 minutes after the run starts, with a warning that names it, then reads the candidates", async () => {
    const clock = fakeClock();
    // The clock reaches 8 minutes when q1's second page is requested.
    const onRequest = (seen: SeenRequest) => {
      if (seen.url === `${codeUrl("q1")}&page=2`) clock.at = 8 * 60 * 1000;
    };
    const responses = {
      ...base(),
      ...paged("q1", 3),
      ...searchedCode({ q2: ["example/q2-p1"] }),
      ...pluginRepo("example/q1-p1", "q1-p1@example.org", { topics: [] }),
      ...pluginRepo("example/q1-p2", "q1-p2@example.org", { topics: [] }),
      [GRAPHQL]: found(["example/q1-p1", "2026-10-20T00:00:00Z"], ["example/q1-p2", "2026-10-19T00:00:00Z"]),
    };
    const { result, requests } = await runResult(responses, { codeSearch: ["q1", "q2"], clock, startedAt: 0, onRequest });
    if (!result.ok) throw new Error(result.message);
    expect(codeRequests(requests).map(({ url }) => url)).toEqual([codeUrl("q1"), `${codeUrl("q1")}&page=2`]);
    expect(result.report.warnings).toEqual([
      "the code search for q1 read 2 pages and stopped, since the run sends no code search request 8 minutes after it starts",
      "the code search for q2 read 0 pages and stopped, since the run sends no code search request 8 minutes after it starts",
    ]);
    expect(result.report.read.map((item) => [item.repo, item.source, item.outcome])).toEqual([
      ["example/q1-p1", "code-search", "written"],
      ["example/q1-p2", "code-search", "written"],
      ["example/alpha", "topic", "written"],
    ]);
  });

  describe("a rate-limit wait", () => {
    const pageUrl = (query: string, n: number) => (n === 1 ? codeUrl(query) : `${codeUrl(query)}&page=${n}`);
    // A reset `seconds` after the fake clock's start, in GitHub's epoch seconds.
    const resetIn = (seconds: number) => String(WALL_START / 1000 + seconds);
    // Page n of `count` pages of one query, with its next link, plus extra headers.
    const page = (query: string, n: number, count: number, headers: Record<string, string> = {}) => ({
      ...codePage([`example/${query}-p${n}`]),
      headers: { ...(n < count && { link: `<${pageUrl(query, n + 1)}>; rel="next"` }), ...headers },
    });
    // The wall time of each code search request, by URL.
    function timed(clock: ReturnType<typeof fakeClock>) {
      const sent: { url: string; wall: number }[] = [];
      return { sent, onRequest: (seen: SeenRequest) => seen.url.includes("/search/code?") && sent.push({ url: seen.url, wall: clock.wall() }) };
    }
    // The names that the code search lookup asked about.
    const looked = (requests: SeenRequest[]) => lookups(requests).flatMap(({ body }) => {
      const { variables } = JSON.parse(body!);
      return Object.keys(variables).filter((key) => key.startsWith("o")).map((key) => `${variables[key]}/${variables[`n${key.slice(1)}`]}`);
    });
    const searchWarnings = (warnings: string[]) => warnings.filter((warning) => warning.startsWith("the code search"));

    test("holds the next request until the reset that x-ratelimit-remaining 0 names, plus 1 second", async () => {
      const clock = fakeClock();
      const { sent, onRequest } = timed(clock);
      const responses = {
        ...base(),
        ...Object.fromEntries([1, 2, 3, 4].map((n) => [pageUrl("q1", n), page("q1", n, 4, n === 3 ? { "x-ratelimit-remaining": "0", "x-ratelimit-reset": resetIn(30) } : {})])),
        [GRAPHQL]: found(),
      };
      await runResult(responses, { codeSearch: ["q1"], clock, onRequest });
      expect(sent.map(({ wall }) => wall - WALL_START)).toEqual([0, 0, 0, 31_001]);
    });

    test.each<[string, Record<string, string>, number]>([
      ["x-ratelimit-remaining 0", { "x-ratelimit-remaining": "0", "x-ratelimit-reset": resetIn(20) }, 21_001],
      ["both headers, the later end counting", { "x-ratelimit-remaining": "0", "x-ratelimit-reset": resetIn(10), "retry-after": "40" }, 41_001],
    ])("holds the next query's first request after %s on the last page of a query", async (_name, headers, wait) => {
      const clock = fakeClock();
      const { sent, onRequest } = timed(clock);
      const responses = { ...base(), [pageUrl("q1", 1)]: page("q1", 1, 2), [pageUrl("q1", 2)]: page("q1", 2, 2, headers), ...searchedCode({ q2: [] }), [GRAPHQL]: found() };
      await runResult(responses, { codeSearch: ["q1", "q2"], clock, onRequest });
      expect(sent.map(({ url, wall }) => [url, wall - WALL_START])).toEqual([
        [pageUrl("q1", 1), 0],
        [pageUrl("q1", 2), 0],
        [codeUrl("q2"), wait],
      ]);
    });

    test("sends a page refused with a named wait once more, and reads it and the query's later pages", async () => {
      const clock = fakeClock();
      const { sent, onRequest } = timed(clock);
      const responses: Responses = {
        ...base(),
        [pageUrl("q1", 1)]: page("q1", 1, 3),
        [`${pageUrl("q1", 2)} #1`]: { status: 403, json: { message: "rate limit" }, headers: { "retry-after": "5" } },
        [`${pageUrl("q1", 2)} #2`]: page("q1", 2, 3),
        [pageUrl("q1", 3)]: page("q1", 3, 3),
        [`${pageUrl("q2", 1)} #1`]: { status: 429, json: { message: "slow down" }, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": resetIn(70) } },
        [`${pageUrl("q2", 1)} #2`]: page("q2", 1, 2),
        [pageUrl("q2", 2)]: page("q2", 2, 2),
        [GRAPHQL]: found(),
      };
      const { result, requests } = await runResult(responses, { codeSearch: ["q1", "q2"], clock, onRequest });
      if (!result.ok) throw new Error(result.message);
      expect(sent.map(({ url, wall }) => [url, wall - WALL_START])).toEqual([
        [pageUrl("q1", 1), 0],
        [pageUrl("q1", 2), 0],
        [pageUrl("q1", 2), 6_001],
        [pageUrl("q1", 3), 6_001],
        [pageUrl("q2", 1), 6_001],
        [pageUrl("q2", 1), 71_001],
        [pageUrl("q2", 2), 71_001],
      ]);
      expect(looked(requests).sort()).toEqual(["example/q1-p1", "example/q1-p2", "example/q1-p3", "example/q2-p1", "example/q2-p2"]);
      expect(searchWarnings(result.report.warnings)).toEqual([
        "the code search for q1 got HTTP 403 on page 2, so it sends that page once more after the wait the answer names",
        "the code search for q2 got HTTP 429 on page 1, so it sends that page once more after the wait the answer names",
      ]);
    });

    test.each<[string, Record<string, string>, number]>([
      [
        "from the answer's date when the runner's clock is 3 s ahead",
        { "x-ratelimit-remaining": "0", "x-ratelimit-reset": resetIn(2), date: new Date(WALL_START - 3000).toUTCString() },
        6_001,
      ],
      ["from now for a reset already past", { "x-ratelimit-remaining": "0", "x-ratelimit-reset": resetIn(-5) }, 1_001],
    ])("holds the next request %s", async (_name, headers, wait) => {
      const clock = fakeClock();
      const { sent, onRequest } = timed(clock);
      const responses = { ...base(), [pageUrl("q1", 1)]: page("q1", 1, 2, headers), [pageUrl("q1", 2)]: page("q1", 2, 2), [GRAPHQL]: found() };
      await runResult(responses, { codeSearch: ["q1"], clock, onRequest });
      expect(sent.map(({ wall }) => wall - WALL_START)).toEqual([0, wait]);
    });

    test("holds the next query after a failed answer that names a wait, without sending its page again", async () => {
      const clock = fakeClock();
      const { sent, onRequest } = timed(clock);
      const responses = { ...base(), [pageUrl("q1", 1)]: { status: 502, text: "bad gateway", headers: { "retry-after": "30" } }, ...searchedCode({ q2: [] }), [GRAPHQL]: found() };
      await runResult(responses, { codeSearch: ["q1", "q2"], clock, onRequest });
      expect(sent.map(({ url, wall }) => [url, wall - WALL_START])).toEqual([
        [pageUrl("q1", 1), 0],
        [codeUrl("q2"), 31_001],
      ]);
    });

    test.each<[string, Recorded, string]>([
      ["a 502", { status: 502, text: "bad gateway" }, "returned HTTP 502"],
      ["a second 403 with a named wait", { status: 403, json: { message: "rate limit" }, headers: { "retry-after": "1" } }, "returned HTTP 403"],
    ])("stops a query whose page fails again, with %s, and keeps its earlier pages", async (_name, again, message) => {
      const responses = {
        ...base(),
        [pageUrl("q1", 1)]: page("q1", 1, 2),
        [`${pageUrl("q1", 2)} #1`]: { status: 403, json: { message: "rate limit" }, headers: { "retry-after": "1" } },
        [`${pageUrl("q1", 2)} #2`]: again,
        [GRAPHQL]: found(),
      };
      const { result, requests } = await runResult(responses, { codeSearch: ["q1"], clock: fakeClock() });
      if (!result.ok) throw new Error(result.message);
      expect(codeRequests(requests).map(({ url }) => url)).toEqual([pageUrl("q1", 1), pageUrl("q1", 2), pageUrl("q1", 2)]);
      expect(searchWarnings(result.report.warnings)).toEqual([
        "the code search for q1 got HTTP 403 on page 2, so it sends that page once more after the wait the answer names",
        `the code search for q1 read 1 page and stopped, since its request failed: GET ${pageUrl("q1", 2)} ${message}`,
      ]);
      expect(looked(requests)).toEqual(["example/q1-p1"]);
    });

    test.each<[string, Recorded, string]>([
      ["a 403 with retry-after abc", { status: 403, json: { message: "rate limit" }, headers: { "retry-after": "abc" } }, "403"],
      ["a 401 with retry-after 1", { status: 401, json: { message: "Requires authentication" }, headers: { "retry-after": "1" } }, "401"],
      ["a 502 with retry-after 1", { status: 502, text: "bad gateway", headers: { "retry-after": "1" } }, "502"],
    ])("sends a page answered with %s only once", async (_name, answer, status) => {
      const responses = { ...base(), [pageUrl("q1", 1)]: answer, [`${pageUrl("q1", 1)} #2`]: page("q1", 1, 1) };
      const { result, requests } = await runResult(responses, { codeSearch: ["q1"], clock: fakeClock() });
      if (!result.ok) throw new Error(result.message);
      expect(codeRequests(requests)).toHaveLength(1);
      expect(searchWarnings(result.report.warnings)).toEqual([`the code search for q1 read 0 pages and stopped, since its request failed: GET ${pageUrl("q1", 1)} returned HTTP ${status}`]);
    });

    test("sends no request for a wait that holds the next request to 8 minutes or more after the run starts, then reads the candidates", async () => {
      const clock = fakeClock();
      const responses = {
        ...base(),
        [pageUrl("q1", 1)]: page("q1", 1, 2, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": resetIn(600) }),
        ...searchedCode({ q2: ["example/q2-p1"] }),
        ...pluginRepo("example/q1-p1", "q1-p1@example.org", { topics: [] }),
        [GRAPHQL]: found(["example/q1-p1", "2026-10-20T00:00:00Z"]),
      };
      const { result, requests } = await runResult(responses, { codeSearch: ["q1", "q2"], clock, startedAt: 0 });
      if (!result.ok) throw new Error(result.message);
      expect(codeRequests(requests).map(({ url }) => url)).toEqual([pageUrl("q1", 1)]);
      expect(searchWarnings(result.report.warnings)).toEqual([
        "the code search for q1 read 1 page and stopped, since the run sends no code search request 8 minutes after it starts",
        "the code search for q2 read 0 pages and stopped, since the run sends no code search request 8 minutes after it starts",
      ]);
      expect(result.report.read.map((item) => [item.repo, item.outcome])).toEqual([
        ["example/q1-p1", "written"],
        ["example/alpha", "written"],
      ]);
    });

    test("counts a retry toward the limit of 10 code search requests in any 60 seconds", async () => {
      const clock = fakeClock();
      const times: number[] = [];
      const onRequest = (seen: SeenRequest) => seen.url.includes("/search/code?") && times.push(clock.now());
      const pages = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [pageUrl("q1", i + 1), page("q1", i + 1, 12)]));
      const responses = {
        ...base(),
        ...pages,
        [`${pageUrl("q1", 10)} #1`]: { status: 403, json: { message: "rate limit" }, headers: { "retry-after": "1" } },
        [`${pageUrl("q1", 10)} #2`]: pages[pageUrl("q1", 10)],
        [GRAPHQL]: found(),
      };
      await runResult(responses, { codeSearch: ["q1"], clock, onRequest });
      expect(times).toHaveLength(13);
      expect(times[10]).toBeGreaterThanOrEqual(60_000);
      for (let i = 0; i + 10 < times.length; i++) expect(times[i + 10] - times[i]).toBeGreaterThanOrEqual(60_000);
    });
  });

  describe("a failed code search request", () => {
    // A refusal of a repo that no source names, kept since it is under 30 days old.
    const kept = { "example/refused": { pushedAt: "2026-10-01T00:00:00Z", failure: "no-release" as const, checkedAt: NOW.toISOString() } };
    const failing = `${codeUrl("q1")}&page=2`;
    // q1's first page names example/coded and links a second page; q2 names example/other.
    const responses = (answer: Recorded): Responses => ({
      ...base(),
      ...pluginRepo("example/other", "other@example.org", { topics: [] }),
      ...pluginRepo("example/listed", "listed@example.org", { topics: [] }),
      ...listed(["example/listed"]),
      [codeUrl("q1")]: { ...codePage(["example/coded"]), headers: { link: `<${failing}>; rel="next"` } },
      [failing]: answer,
      ...searchedCode({ q2: ["example/other"] }),
      [`${GRAPHQL} #1`]: found(["example/listed", "2026-10-21T00:00:00Z"]),
      [`${GRAPHQL} #2`]: found(["example/coded", "2026-10-20T00:00:00Z"], ["example/other", "2026-10-19T00:00:00Z"]),
    });

    test.each([
      ["an HTTP 401 answer", { status: 401, json: { message: "Requires authentication" } }, "returned HTTP 401"],
      ["an HTTP 403 answer", { status: 403, json: { message: "rate limit" } }, "returned HTTP 403"],
      ["an HTTP 429 answer", { status: 429, json: { message: "slow down" } }, "returned HTTP 429"],
      ["an HTTP 5xx answer", { status: 502, text: "bad gateway" }, "returned HTTP 502"],
      ["a fetch that rejects", { error: "connection reset" }, "failed: connection reset"],
      ["a request that passes its time limit", { stall: "headers" as const }, "failed: The operation was aborted due to timeout"],
      ["a body that passes its time limit", { stall: "body" as const }, "failed while reading the body: The operation was aborted due to timeout"],
      ["a body that is not JSON", { text: "<html>busy</html>" }, "returned a body that is not JSON"],
      ["a page with no list of items", { json: { total_count: 1 } }, "returned a body with no list of items"],
    ])("with %s warns, keeps the query's earlier pages, and reads the other sources", async (_name, answer, message) => {
      const { reads, report, state } = await run(responses(answer), { codeSearch: ["q1", "q2"], codeSearchMs: 200, catalog: CATALOG, state: kept });
      expect(report.warnings).toEqual([expect.stringContaining(`the code search for q1 read 1 page and stopped, since `)]);
      expect(report.warnings[0]).toContain(`GET ${failing} ${message}`);
      expect(reads).toEqual(["example/listed", "example/coded", "example/other", "example/alpha"]);
      expect(state).toEqual(kept);
    });
  });

  test("warns about a query with more than 1,000 results and names at most 10 items with no owner/repo repository.full_name", async () => {
    const unusable = [{ repository: null }, { repository: { full_name: "listed" } }, { name: "manifest.json" }];
    const page = { json: { total_count: 1500, items: Array.from({ length: 12 }, (_, i) => unusable[i % 3]) } };
    const { report, reads } = await run({ ...base(), [codeUrl("q1")]: page }, { codeSearch: ["q1"] });
    expect(report.warnings).toEqual([
      "the code search for q1 has 1500 results, and the search returns only the first 1000",
      ...Array.from({ length: 10 }, () => "the code search for q1 returned an item with no owner/repo repository.full_name, so the run skips it"),
      "the code search for q1 returned 2 more items with no owner/repo repository.full_name, so the run skips them",
    ]);
    expect(reads).toEqual(["example/alpha"]);
  });

  test("warns once when every query finishes with no item, and stays silent when one query has an item", async () => {
    const empty = await run({ ...base(), ...searchedCode({ q1: [], q2: [] }) }, withCode);
    expect(empty.report.warnings).toEqual(["the code searches returned no items, so the token may not reach GitHub's code index"]);
    const one = await run({ ...base(), ...searchedCode({ q1: [], q2: ["example/coded"] }), [GRAPHQL]: found(["example/coded", "2026-10-20T00:00:00Z"]) }, withCode);
    expect(one.report.warnings).toEqual([]);
  });

  test.each([
    ["a next page on another host", '<https://example.org/page2>; rel="next"', "its next page https://example.org/page2 is not on https://api.github.com"],
    ["a next page read before", `<${codeUrl("q1")}>; rel="next"`, `its next page ${codeUrl("q1")} was read before`],
  ])("stops a query at %s, keeps its first page, and runs the next query", async (_name, link, why) => {
    const responses = {
      ...base(),
      ...pluginRepo("example/other", "other@example.org", { topics: [] }),
      [codeUrl("q1")]: { ...codePage(["example/coded"]), headers: { link } },
      ...searchedCode({ q2: ["example/other"] }),
      [GRAPHQL]: found(["example/coded", "2026-10-20T00:00:00Z"], ["example/other", "2026-10-19T00:00:00Z"]),
    };
    const { reads, report } = await run(responses, withCode);
    expect(report.warnings).toEqual([`the code search for q1 read 1 page and stopped, since ${why}`]);
    expect(reads).toEqual(["example/coded", "example/other", "example/alpha"]);
  });

  test("warns about a page with incomplete results", async () => {
    const page = { json: { ...codePage(["example/coded"]).json, incomplete_results: true } };
    const { report } = await run({ ...base(), [codeUrl("q1")]: page, [GRAPHQL]: found(["example/coded", "2026-10-20T00:00:00Z"]) }, { codeSearch: ["q1"] });
    expect(report.warnings).toEqual(["the code search for q1 returned incomplete results on page 1, so the run may miss some repos"]);
  });

  test("sends CODE_SEARCH_TOKEN with code search requests only, and GITHUB_TOKEN when it is unset", async () => {
    const saved = { code: process.env.CODE_SEARCH_TOKEN, github: process.env.GITHUB_TOKEN };
    const responses = { ...base(), ...searchedCode({ q1: ["example/coded"] }), [GRAPHQL]: found(["example/coded", "2026-10-20T00:00:00Z"]) };
    const auth = (requests: SeenRequest[], match: (url: string) => boolean) =>
      [...new Set(requests.filter(({ url }) => match(url)).map(({ headers }) => headers.get("authorization")))];
    try {
      process.env.GITHUB_TOKEN = "actions-token";
      process.env.CODE_SEARCH_TOKEN = "search-token";
      const both = await runResult(responses, { codeSearch: ["q1"] });
      expect(auth(both.requests, (url) => url.includes("/search/code?"))).toEqual(["Bearer search-token"]);
      expect(auth(both.requests, (url) => url.startsWith("https://api.github.com/") && !url.includes("/search/code?"))).toEqual(["Bearer actions-token"]);
      delete process.env.CODE_SEARCH_TOKEN;
      const fallback = await runResult(responses, { codeSearch: ["q1"] });
      expect(auth(fallback.requests, (url) => url.includes("/search/code?"))).toEqual(["Bearer actions-token"]);
    } finally {
      for (const [key, value] of [["CODE_SEARCH_TOKEN", saved.code], ["GITHUB_TOKEN", saved.github]] as const) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  test("looks up through code search a name whose catalog lookup failed", async () => {
    const responses = {
      ...base(),
      ...listed(["example/coded"]),
      ...searchedCode({ q1: ["example/coded"], q2: [] }),
      [`${GRAPHQL} #1`]: { status: 502, text: "bad gateway" },
      [`${GRAPHQL} #2`]: found(["example/coded", "2026-10-20T00:00:00Z"]),
    };
    const { result, requests } = await runResult(responses, { ...withCode, catalog: CATALOG });
    if (!result.ok) throw new Error(result.message);
    expect(lookups(requests)).toHaveLength(2);
    expect(JSON.parse(lookups(requests)[1].body!).variables).toEqual({ o0: "example", n0: "coded" });
    expect(result.report.warnings).toEqual([expect.stringMatching(/^the run reads none of 1 catalog repos from example\/coded on, since their lookup failed: .*HTTP 502/)]);
    expect(result.report.read).toContainEqual(expect.objectContaining({ repo: "example/coded", source: "code-search", outcome: "written" }));
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

  test("reads the zotero-chinese catalog and runs the five code searches", () => {
    const cwd = tempDir();
    const codeUrl = (query: string) => `https://api.github.com/search/code?${new URLSearchParams({ q: query, per_page: "100" })}`;
    const responses: Responses = {
      ...searched([]),
      ...pluginRepo("example/listed", "listed@example.org", { topics: [] }),
      ...pluginRepo("example/coded", "coded@example.org", { topics: [] }),
      [CATALOG_URL]: { json: [{ repo: "example/listed" }] },
      [`${GRAPHQL} #1`]: found(["example/listed", "2026-10-20T00:00:00Z"]),
      [`${GRAPHQL} #2`]: found(["example/coded", "2026-10-21T00:00:00Z"]),
      ...Object.fromEntries(CODE_SEARCHES.map((query, i) => [codeUrl(query), { json: { total_count: i, items: i === 4 ? [{ repository: { full_name: "example/coded" } }] : [] } }])),
    };
    const result = pnpmDiscover(["--out", "out", "--state", "state.json"], responses, cwd);
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.read).toEqual([
      expect.objectContaining({ repo: "example/coded", outcome: "written", source: "code-search" }),
      expect.objectContaining({ repo: "example/listed", outcome: "written", source: "catalog" }),
    ]);
    expect(report.warnings).toEqual([]);
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
