import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import { issueRun, parseIssueBody, URL_LABEL } from "../src/discover/issue.ts";
import { fixtureFetch, loadFixture, type Responses } from "./support/fixture-fetch.ts";
import { checkout } from "./support/git-checkout.ts";
import { pluginRepo } from "./support/plugin-repo.ts";

const ROOT = resolve(import.meta.dirname, "..");
const PRELOAD = resolve(ROOT, "test/support/preload-fixture.ts");
// Holds second-plugin@example.org, whose repoUrl is https://github.com/example/second-plugin.
const TREE = resolve(ROOT, "test/fixtures/build/plugins");
const INDEX = "https://api.github.com/repos/example/index";
const PULLS = `${INDEX}/pulls`;
const ISSUE = `${INDEX}/issues/7`;
const COMMENTS = `${ISSUE}/comments`;
const publicLookup = async () => ["140.82.112.3"];

const temps: string[] = [];
afterAll(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "zpi-issue-"));
  temps.push(dir);
  return dir;
}

// The body GitHub writes for an issue opened from add-plugin.yml: the markdown block is
// left out, and the input's label becomes a level-3 heading over the value.
const rendered = (value: string) => `### Repository URL\n\n${value}`;

// The index repo's record and an empty pull-request list, and answers to the comment and
// the close requests.
const indexRepo: Responses = {
  [INDEX]: { json: { full_name: "example/index", default_branch: "main" } },
  [`${PULLS}?state=all&per_page=100`]: { json: [] },
  [`POST ${COMMENTS}`]: { status: 201, json: { id: 1 } },
  [`PATCH ${ISSUE}`]: { json: { number: 7, state: "closed" } },
};

const opened: Responses = { [`POST ${PULLS}`]: { status: 201, json: { html_url: "https://github.com/example/index/pull/9" } } };

// Runs issueRun for issue 7 in-process against `responses`, with a check that always
// passes, and returns its result, the requests it sent other than GET, and the URLs it
// fetched.
async function runIssue(body: string, responses: Responses, options: { root?: string; outDir?: string; gitDir?: string } = {}) {
  const { fetch, requests } = fixtureFetch(responses);
  const result = await issueRun({
    root: options.root ?? tempDir(),
    outDir: options.outDir ?? tempDir(),
    fetch,
    lookup: publicLookup,
    indexRepo: "example/index",
    gitDir: options.gitDir ?? checkout(tempDir()).work,
    check: async () => ({ status: 0, output: "checked 1 entries in x, 0 problems\n" }),
    issue: 7,
    body,
  });
  const sent = requests
    .filter(({ method }) => method !== "GET")
    .map(({ method, url, body: payload }) => ({ method, url, ...JSON.parse(payload!) }));
  return { result, sent, gets: requests.filter(({ method }) => method === "GET").map(({ url }) => url) };
}

describe("parseIssueBody", () => {
  test("the form's input label is the heading the parser looks for", () => {
    const form = readFileSync(resolve(ROOT, ".github/ISSUE_TEMPLATE/add-plugin.yml"), "utf8");
    expect(form).toMatch(new RegExp(`^ {6}label: ${URL_LABEL}$`, "m"));
  });

  test("returns the URL from a rendered body, and from the same body with CRLF line endings", () => {
    const body = rendered("https://github.com/example/alpha");
    expect(parseIssueBody(body)).toEqual({ ok: true, url: "https://github.com/example/alpha" });
    expect(parseIssueBody(body.replaceAll("\n", "\r\n"))).toEqual({ ok: true, url: "https://github.com/example/alpha" });
  });

  test("returns the first non-empty line under the heading, trimmed, and stops at the next heading", () => {
    expect(parseIssueBody("### Repository URL\n\n  https://github.com/example/alpha  \nsecond line\n\n### Other\n\nx")).toEqual({
      ok: true,
      url: "https://github.com/example/alpha",
    });
    expect(parseIssueBody("### Repository URL\n\n### Other\n\nhttps://github.com/example/alpha")).toMatchObject({ problem: "no-response" });
  });

  test("names the problem when the field has no response", () => {
    expect(parseIssueBody(rendered("_No response_"))).toEqual({
      ok: false,
      problem: "no-response",
      message: expect.stringContaining("Repository URL"),
    });
  });

  test("names the problem when the heading is absent", () => {
    expect(parseIssueBody("Please add https://github.com/example/alpha")).toEqual({
      ok: false,
      problem: "no-url-heading",
      message: expect.stringContaining("### Repository URL"),
    });
  });

  test("leaves judging the URL to the reader", () => {
    expect(parseIssueBody(rendered("not a url"))).toEqual({ ok: true, url: "not a url" });
  });
});

describe("issueRun", () => {
  test("opens one pull request that closes the issue, and comments its URL", async () => {
    const { result, sent } = await runIssue(rendered("https://github.com/example/alpha"), {
      ...indexRepo,
      ...pluginRepo("example/alpha", "alpha@example.org"),
      ...opened,
    });
    expect(result.status).toBe(0);
    expect(sent.map(({ method, url }) => `${method} ${url}`)).toEqual([`POST ${PULLS}`, `POST ${COMMENTS}`]);
    expect(sent[0]).toMatchObject({ head: "discover/example/alpha", base: "main" });
    expect(sent[0].body).toContain("Closes #7");
    expect(sent[1].body).toContain("https://github.com/example/index/pull/9");
  });

  test.each([
    ["the field has no response", rendered("_No response_"), "no-response"],
    ["the URL is not a GitHub repo", rendered("https://gitlab.com/example/alpha"), "not-github-repo"],
  ])("comments the problem and closes the issue as not planned when %s", async (_name, body, problem) => {
    const { result, sent } = await runIssue(body, { ...indexRepo, ...pluginRepo("example/alpha", "alpha@example.org") });
    expect(result.status).toBe(0);
    expect(sent).toEqual([
      { method: "POST", url: COMMENTS, body: expect.stringContaining(`\`${problem}\``) },
      { method: "PATCH", url: ISSUE, state: "closed", state_reason: "not_planned" },
    ]);
    expect(sent[0].body).toMatch(problem === "no-response" ? /Repository URL/ : /is not a GitHub repo URL/);
  });

  test("comments the failure and closes the issue as not planned when writeEntry finds the entry directory", async () => {
    const outDir = tempDir();
    mkdirSync(join(outDir, "alpha@example.org"));
    const { result, sent } = await runIssue(
      rendered("https://github.com/example/alpha"),
      { ...indexRepo, ...pluginRepo("example/alpha", "alpha@example.org"), ...opened },
      { outDir },
    );
    expect(result.status).toBe(0);
    expect(sent).toEqual([
      { method: "POST", url: COMMENTS, body: expect.stringMatching(/`entry-exists`.*already exists/s) },
      { method: "PATCH", url: ISSUE, state: "closed", state_reason: "not_planned" },
    ]);
  });

  test.each([
    ["an entry names the repo", "https://github.com/Example/Second-Plugin", "plugins/second-plugin@example.org/", "completed"],
    ["its bot pull request is open", "https://github.com/example/open-pr", "https://github.com/example/index/pull/11", "not_planned"],
    ["its bot pull request was closed without a merge", "https://github.com/example/closed-pr", "https://github.com/example/index/pull/12", "not_planned"],
  ])("reads nothing, names the record, and closes the issue when %s", async (_name, url, named, reason) => {
    const repo = new URL(url).pathname.slice(1);
    const { result, sent, gets } = await runIssue(
      rendered(url),
      {
        ...indexRepo,
        ...loadFixture(resolve(ROOT, "test/fixtures/discover/pulls.json")).responses,
        ...pluginRepo(repo, "x@example.org"),
      },
      { root: TREE },
    );
    expect(result.status).toBe(0);
    expect(gets.filter((get) => get.toLowerCase().includes(`/repos/${repo.toLowerCase()}`))).toEqual([]);
    expect(sent).toEqual([
      { method: "POST", url: COMMENTS, body: expect.stringContaining(named) },
      { method: "PATCH", url: ISSUE, state: "closed", state_reason: reason },
    ]);
  });
});

// As in the discover tests, the preload answers the command's requests from `responses`.
function pnpmIssue(responses: Responses, cwd: string, env: Record<string, string>) {
  const pnpmPath = process.env.npm_execpath;
  if (!pnpmPath) throw new Error("run the tests with `pnpm test`, so they can call pnpm");
  const fixture = join(tempDir(), "responses.json");
  writeFileSync(fixture, JSON.stringify({ source: "issue test", repoUrl: "", responses }));
  const { INIT_CWD: _outer, GITHUB_TOKEN: _token, GITHUB_REPOSITORY: _repo, ...outer } = process.env;
  Object.assign(outer, { ZPI_FIXTURE: fixture, NODE_OPTIONS: `--import=${PRELOAD}` }, env);
  return spawnSync(pnpmPath, ["--silent", "--dir", ROOT, "discover-issue"], { cwd, encoding: "utf8", env: outer, timeout: 50_000 });
}

describe("pnpm discover-issue", () => {
  test("comments the error, leaves the issue open, and exits 1 when the push fails", () => {
    const { remote, work } = checkout(tempDir());
    const hook = join(remote, "hooks/pre-receive");
    writeFileSync(hook, '#!/bin/sh\necho "refused by the test hook" >&2\nexit 1\n');
    chmodSync(hook, 0o755);
    const requestLog = join(tempDir(), "requests.jsonl");
    const result = pnpmIssue({ ...indexRepo, ...pluginRepo("example/alpha", "alpha@example.org"), ...opened }, work, {
      GITHUB_REPOSITORY: "example/index",
      ISSUE_NUMBER: "7",
      ISSUE_BODY: rendered("https://github.com/example/alpha"),
      ZPI_REQUESTS: requestLog,
    });
    expect(result.stderr).toMatch(/git push failed: .*refused by the test hook/s);
    expect(result.status).toBe(1);
    const sent = readFileSync(requestLog, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line))
      .filter(({ method }) => method !== "GET");
    expect(sent).toEqual([{ method: "POST", url: COMMENTS, body: expect.stringMatching(/git push failed: .*refused by the test hook/s) }]);
  });

  test("prints the usage when ISSUE_NUMBER is not a number", () => {
    const result = pnpmIssue({}, tempDir(), { GITHUB_REPOSITORY: "example/index", ISSUE_NUMBER: "x", ISSUE_BODY: "" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("ISSUE_NUMBER");
  });
});
