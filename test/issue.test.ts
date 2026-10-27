import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import { entriesDir, readHandoff, writePlan } from "../src/discover/handoff.ts";
import { issueAnswer, issueRead, parseIssueBody, URL_LABEL } from "../src/discover/issue.ts";
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

// Runs the read step and then the write step for issue 7 in-process against `responses`,
// through a handoff written to disk, with a check that always passes, and returns the
// write step's result, the requests the two sent other than GET, and the URLs they
// fetched. `outDir` replaces the read step's output directory.
async function runIssue(
  body: string,
  responses: Responses,
  options: { root?: string; outDir?: string; gitDir?: string; lookup?: () => Promise<string[]> } = {},
) {
  const { fetch, requests } = fixtureFetch(responses);
  const root = options.root ?? tempDir();
  const handoff = tempDir();
  const outcome = await issueRead({
    root,
    outDir: options.outDir ?? entriesDir(handoff),
    fetch,
    lookup: options.lookup ?? publicLookup,
    indexRepo: "example/index",
    body,
  });
  await writePlan(handoff, { kind: "issue", ...outcome });
  const checked = await readHandoff(handoff, "issue", 1);
  if (!checked.ok || checked.plan.kind !== "issue") throw new Error(`handoff refused: ${JSON.stringify(checked)}`);
  const { kind: _kind, ...read } = checked.plan;
  const result = await issueAnswer({
    root,
    fetch,
    indexRepo: "example/index",
    gitDir: options.gitDir ?? checkout(tempDir()).work,
    check: async () => ({ status: 0, output: "checked 1 entries in x, 0 problems\n" }),
    issue: 7,
    read: { outcome: read, dir: read.outcome === "entry" ? checked.dirs.get(read.entry.id) : undefined },
  });
  const sent = requests
    .filter(({ method }) => method !== "GET")
    .map(({ method, url, body: payload }) => ({ method, url, ...JSON.parse(payload!) }));
  return { outcome, result, sent, gets: requests.filter(({ method }) => method === "GET").map(({ url }) => url) };
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

describe("an issue run", () => {
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

describe("an issue run's refusals with names the reader gives", () => {
  test("comments a failure name with a digit and closes the issue as not planned", async () => {
    const repo = pluginRepo("example/old", "old@example.org");
    const xpi = Object.keys(repo).find((url) => url.endsWith(".xpi"))!;
    const manifest = (repo[xpi].xpi as Record<string, { applications: { zotero: Record<string, string> } }>)["manifest.json"];
    manifest.applications.zotero.strict_max_version = "6.*";
    const { result, sent } = await runIssue(rendered("https://github.com/example/old"), { ...indexRepo, ...repo });
    expect(result.status).toBe(0);
    expect(sent).toEqual([
      { method: "POST", url: COMMENTS, body: expect.stringContaining("`max-version-below-7`") },
      { method: "PATCH", url: ISSUE, state: "closed", state_reason: "not_planned" },
    ]);
  });

  test.each<[string, (manifest: { version: string; description?: string }) => void]>([
    ["a version longer than the handoff allows", (manifest) => (manifest.version = "1".repeat(600))],
    ["a description that makes meta.json larger than 64 KiB", (manifest) => (manifest.description = "x".repeat(70_000))],
  ])("refuses as not-proposable, with no push, %s", async (_name, change) => {
    const repo = pluginRepo("example/big", "big@example.org");
    const xpi = Object.keys(repo).find((url) => url.endsWith(".xpi"))!;
    change((repo[xpi].xpi as Record<string, { version: string; description?: string }>)["manifest.json"]);
    const { result, sent } = await runIssue(rendered("https://github.com/example/big"), { ...indexRepo, ...repo, ...opened });
    expect(result.status).toBe(0);
    expect(sent).toEqual([
      { method: "POST", url: COMMENTS, body: expect.stringContaining("`not-proposable`") },
      { method: "PATCH", url: ISSUE, state: "closed", state_reason: "not_planned" },
    ]);
  });

  test("reads on, and refuses as not-proposable, a repo whose name a bot branch has but a handoff refuses", async () => {
    const pull = { number: 30, state: "open", merged_at: null, html_url: "https://github.com/example/index/pull/30", head: { ref: "discover/example/b!", repo: { full_name: "example/index" } } };
    const { result, sent } = await runIssue(rendered("https://github.com/example/b!"), {
      ...indexRepo,
      [`${PULLS}?state=all&per_page=100`]: { json: [pull] },
      [`${PULLS}/30/files?per_page=100`]: { json: [] },
      ...pluginRepo("example/b!", "b@example.org"),
    });
    expect(result.status).toBe(0);
    expect(sent).toEqual([
      { method: "POST", url: COMMENTS, body: expect.stringContaining("`not-proposable`") },
      { method: "PATCH", url: ISSUE, state: "closed", state_reason: "not_planned" },
    ]);
  });

  test.each([
    ["an id that is not a Mozilla add-on id", "example/no-at", "plugin-no-at"],
    ["a repo whose branch name git refuses", "example/.dot", "dot@example.org"],
  ])("refuses as not-proposable, with no push, %s", async (_name, repo, id) => {
    const { result, sent } = await runIssue(rendered(`https://github.com/${repo}`), { ...indexRepo, ...pluginRepo(repo, id), ...opened });
    expect(result.status).toBe(0);
    expect(sent).toEqual([
      { method: "POST", url: COMMENTS, body: expect.stringContaining("`not-proposable`") },
      { method: "PATCH", url: ISSUE, state: "closed", state_reason: "not_planned" },
    ]);
  });
});

describe("an issue run's read failures that point at the bot", () => {
  const ALPHA = "https://api.github.com/repos/example/alpha";
  const UPDATE = "https://raw.githubusercontent.com/example/alpha/main/update.json";
  const failingLookup = async (): Promise<string[]> => {
    throw new Error("getaddrinfo ENOTFOUND");
  };

  test.each<[string, Responses, (() => Promise<string[]>) | undefined, string, string]>([
    ["a GitHub API HTTP 429", { [ALPHA]: { status: 429, text: "slow down" } }, undefined, "github-http-error", "returned HTTP 429"],
    ["a GitHub API HTTP 503", { [ALPHA]: { status: 503, text: "unavailable" } }, undefined, "github-http-error", "returned HTTP 503"],
    ["a GitHub API HTTP 403", { [ALPHA]: { status: 403, text: "rate limited" } }, undefined, "github-http-error", "returned HTTP 403"],
    ["an update.json HTTP 503", { [UPDATE]: { status: 503, text: "unavailable" } }, undefined, "update-json-http-error", "returned HTTP 503"],
    ["a rejected fetch", { [ALPHA]: { error: "read ECONNRESET" } }, undefined, "request-failed", "read ECONNRESET"],
    ["a failed host lookup", {}, failingLookup, "request-failed", "getaddrinfo ENOTFOUND"],
    ["a read that throws", { [ALPHA]: { unexpected: "meta exploded" } }, undefined, "unexpected-error", "meta exploded"],
  ])("comments the failure name and message, leaves the issue open, and returns 1 for %s", async (_name, change, lookup, failure, message) => {
    const { result, sent } = await runIssue(
      rendered("https://github.com/example/alpha"),
      { ...indexRepo, ...pluginRepo("example/alpha", "alpha@example.org"), ...opened, ...change },
      { lookup },
    );
    expect(result.status).toBe(1);
    expect(sent).toEqual([{ method: "POST", url: COMMENTS, body: expect.stringContaining(`could not finish`) }]);
    expect(sent[0].body).toMatch(new RegExp(`\`${failure}\`: \`[^\`]*${message}`));
  });

  test("comments the failure name and message, leaves the issue open, and returns 1 when the entry check throws", async () => {
    // With no git on PATH, the entry check's `git check-ref-format` cannot start.
    const gitDir = checkout(tempDir()).work;
    const path = process.env.PATH;
    process.env.PATH = tempDir();
    let run: Awaited<ReturnType<typeof runIssue>>;
    try {
      run = await runIssue(rendered("https://github.com/example/alpha"), { ...indexRepo, ...pluginRepo("example/alpha", "alpha@example.org"), ...opened }, { gitDir });
    } finally {
      process.env.PATH = path;
    }
    const { outcome, result, sent } = run;
    expect(outcome).toMatchObject({ outcome: "failed", failure: "unexpected-error", message: expect.stringMatching(/^checking the entry of .* threw: .*ENOENT/) });
    expect(result.status).toBe(1);
    expect(sent).toEqual([{ method: "POST", url: COMMENTS, body: expect.stringMatching(/^The bot could not finish/) }]);
    expect(sent[0].body).toMatch(/`unexpected-error`: ` ?checking the entry of [^`]*ENOENT[^`]*`/);
  });

  test.each([
    ["a GitHub API HTTP 404", { [ALPHA]: { status: 404, text: "Not Found" } }, "github-http-error"],
    ["an update.json HTTP 404", { [UPDATE]: { status: 404, text: "Not Found" } }, "update-json-http-error"],
  ])("comments the failure name and closes the issue as not planned for %s", async (_name, change, failure) => {
    const { result, sent } = await runIssue(rendered("https://github.com/example/alpha"), {
      ...indexRepo,
      ...pluginRepo("example/alpha", "alpha@example.org"),
      ...opened,
      ...change,
    });
    expect(result.status).toBe(0);
    expect(sent).toEqual([
      { method: "POST", url: COMMENTS, body: expect.stringMatching(new RegExp(`no pull request.*\`${failure}\`.*returned HTTP 404`, "s")) },
      { method: "PATCH", url: ISSUE, state: "closed", state_reason: "not_planned" },
    ]);
  });
});

describe("an issue run's answers", () => {
  test("names the open bot pull request when a closed one for the same repo comes after it in the list", async () => {
    const pull = (number: number, state: string) => ({
      number,
      state,
      merged_at: null,
      html_url: `https://github.com/example/index/pull/${number}`,
      head: { ref: "discover/example/twice", repo: { full_name: "example/index" } },
    });
    const { sent } = await runIssue(rendered("https://github.com/example/twice"), {
      ...indexRepo,
      [`${PULLS}?state=all&per_page=100`]: { json: [pull(20, "open"), pull(5, "closed")] },
      [`${PULLS}/20/files?per_page=100`]: { json: [] },
    });
    expect(sent[0].body).toBe("The bot already proposed this repo in https://github.com/example/index/pull/20.");
  });

  test("names the branch when the create request's answer has no URL", async () => {
    const { result, sent } = await runIssue(rendered("https://github.com/example/alpha"), {
      ...indexRepo,
      ...pluginRepo("example/alpha", "alpha@example.org"),
      [`POST ${PULLS}`]: { status: 201, json: {} },
    });
    expect(result.status).toBe(0);
    expect(sent.at(-1)!.body).toContain("a pull request from the branch `discover/example/alpha`");
  });

  test("cuts a long message short, so the comment stays under GitHub's limit", async () => {
    const { result, sent } = await runIssue(rendered(`https://gitlab.com/${"x".repeat(70_000)}`), indexRepo);
    expect(result.status).toBe(0);
    expect(sent[0].body).toContain("`not-github-repo`");
    expect(sent[0].body.length).toBeLessThan(3000);
    expect(sent[1]).toMatchObject({ method: "PATCH", state_reason: "not_planned" });
  });
});

describe("an issue run's failures of the bot", () => {
  test.each([
    ["the pull-request list fails", { [`${PULLS}?state=all&per_page=100`]: { status: 503, text: "unavailable" } }, "returned HTTP 503", false],
    ["the repo record has no default branch", { [INDEX]: { json: { full_name: "example/index" } } }, "returned no default_branch", false],
    ["the pull-request list throws an error the reader does not name", { [`${PULLS}?state=all&per_page=100`]: { unexpected: "list exploded" } }, "list exploded", false],
    ["the create request is refused", { [`POST ${PULLS}`]: { status: 422, json: { message: "Validation Failed" } } }, "returned HTTP 422: Validation Failed", true],
  ])("comments the error, leaves the issue open, and returns 1 when %s", async (_name, change, message, readsRepo) => {
    const { result, sent, gets } = await runIssue(rendered("https://github.com/example/alpha"), {
      ...indexRepo,
      ...pluginRepo("example/alpha", "alpha@example.org"),
      ...opened,
      ...change,
    });
    expect(result).toMatchObject({ status: 1, errors: [expect.stringContaining(message)] });
    expect(sent.at(-1)).toEqual({
      method: "POST",
      url: COMMENTS,
      body: expect.stringContaining(message),
    });
    expect(sent.some(({ method }) => method === "PATCH")).toBe(false);
    expect(gets.some((url) => url.includes("/repos/example/alpha"))).toBe(readsRepo);
  });

  test("returns 1 when the comment request fails", async () => {
    const { result } = await runIssue(rendered("_No response_"), { ...indexRepo, [`POST ${COMMENTS}`]: { status: 403, json: { message: "Forbidden" } } });
    expect(result).toMatchObject({ status: 1, errors: [`POST ${COMMENTS} returned HTTP 403: Forbidden`] });
  });

  test("answers for the name GitHub gives when the repo was renamed", async () => {
    // example/old-name now reads as example/second-plugin, which an entry names; the
    // manifest's id differs from the entry's, so only the name check refuses it.
    const renamed = pluginRepo("example/second-plugin", "renamed@example.org");
    const { result, sent } = await runIssue(
      rendered("https://github.com/example/old-name"),
      {
        ...indexRepo,
        ...Object.fromEntries(Object.entries(renamed).map(([url, response]) => [url.replace("/repos/example/second-plugin", "/repos/example/old-name"), response])),
      },
      { root: TREE },
    );
    expect(result.status).toBe(0);
    expect(sent).toEqual([
      { method: "POST", url: COMMENTS, body: expect.stringContaining("plugins/second-plugin@example.org/") },
      { method: "PATCH", url: ISSUE, state: "closed", state_reason: "completed" },
    ]);
  });
});

// As in the discover tests, the preload answers the command's requests from `responses`.
function pnpm(script: string, args: string[], responses: Responses, cwd: string, env: Record<string, string>) {
  const pnpmPath = process.env.npm_execpath;
  if (!pnpmPath) throw new Error("run the tests with `pnpm test`, so they can call pnpm");
  const fixture = join(tempDir(), "responses.json");
  writeFileSync(fixture, JSON.stringify({ source: "issue test", repoUrl: "", responses }));
  const { INIT_CWD: _outer, GITHUB_TOKEN: _token, GITHUB_REPOSITORY: _repo, ISSUE_NUMBER: _issue, ...outer } = process.env;
  Object.assign(outer, { ZPI_FIXTURE: fixture, NODE_OPTIONS: `--import=${PRELOAD}` }, env);
  return spawnSync(pnpmPath, ["--silent", "--dir", ROOT, script, ...args], { cwd, encoding: "utf8", env: outer, timeout: 50_000 });
}

// The requests other than GET in a request log.
const writes = (log: string) =>
  readFileSync(log, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter(({ method }) => method !== "GET");

describe("pnpm discover-issue --handoff then pnpm propose", () => {
  test("comments the error, leaves the issue open, and exits 1 when the push fails", () => {
    const { remote, work } = checkout(tempDir());
    const hook = join(remote, "hooks/pre-receive");
    writeFileSync(hook, '#!/bin/sh\necho "refused by the test hook" >&2\nexit 1\n');
    chmodSync(hook, 0o755);
    const requestLog = join(tempDir(), "requests.jsonl");
    const responses = { ...indexRepo, ...pluginRepo("example/alpha", "alpha@example.org"), ...opened };
    const handoff = join(tempDir(), "handoff");
    const read = pnpm("discover-issue", ["--handoff", handoff], responses, tempDir(), {
      GITHUB_REPOSITORY: "example/index",
      ISSUE_BODY: rendered("https://github.com/example/alpha"),
      ZPI_REQUESTS: requestLog,
    });
    expect(read.stderr).toBe("");
    expect(read.status).toBe(0);
    const result = pnpm("propose", [handoff], responses, work, { GITHUB_REPOSITORY: "example/index", ISSUE_NUMBER: "7", ZPI_REQUESTS: requestLog });
    expect(result.stderr).toMatch(/git push failed: .*refused by the test hook/s);
    expect(result.status).toBe(1);
    expect(writes(requestLog)).toEqual([{ method: "POST", url: COMMENTS, body: expect.stringMatching(/git push failed: .*refused by the test hook/s) }]);
  });

  test("comments that the bot could not finish, leaves the issue open, and exits 1 when the read step left no handoff", () => {
    const requestLog = join(tempDir(), "requests.jsonl");
    writeFileSync(requestLog, "");
    const result = pnpm("propose", [join(tempDir(), "missing")], indexRepo, tempDir(), {
      GITHUB_REPOSITORY: "example/index",
      ISSUE_NUMBER: "7",
      ZPI_REQUESTS: requestLog,
    });
    expect(result.status).toBe(1);
    expect(writes(requestLog)).toEqual([
      { method: "POST", url: COMMENTS, body: expect.stringMatching(/^\{"body":"The bot could not finish, so this issue stays open.*the read step left no handoff/s) },
    ]);
  });

  test("prints the usage when ISSUE_NUMBER is not a number", () => {
    const result = pnpm("propose", [tempDir()], {}, tempDir(), { GITHUB_REPOSITORY: "example/index", ISSUE_NUMBER: "x" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("ISSUE_NUMBER must be the number of an issue");
    expect(result.stdout).toBe("");
  });

  test("prints the usage when GITHUB_REPOSITORY does not name a repo", () => {
    const result = pnpm("discover-issue", ["--handoff", tempDir()], {}, tempDir(), { GITHUB_REPOSITORY: "example", ISSUE_BODY: "" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("GITHUB_REPOSITORY must name the index repo");
    expect(result.stdout).toBe("");
  });
});

describe("the write step of an issue run", () => {
  // Runs only the write step for issue 7 on an outcome, as if a read step had left it.
  async function answer(read: Parameters<typeof issueAnswer>[0]["read"], responses: Responses, root = tempDir()) {
    const { fetch, requests } = fixtureFetch(responses);
    const result = await issueAnswer({
      root,
      fetch,
      indexRepo: "example/index",
      gitDir: checkout(tempDir()).work,
      check: async () => ({ status: 0, output: "" }),
      issue: 7,
      read,
    });
    const sent = requests
      .filter(({ method }) => method !== "GET")
      .map(({ method, url, body: payload }) => ({ method, url, ...JSON.parse(payload!) }));
    return { result, sent };
  }

  test("answers as today, with no push, when an entry in the write step's checkout names the repo", async () => {
    const dir = tempDir();
    const { result, sent } = await answer(
      {
        outcome: { outcome: "entry", entry: { repo: "example/second-plugin", repoUrl: "https://github.com/example/second-plugin", id: "new@example.org", version: "1.0" } },
        dir,
      },
      { ...indexRepo, ...opened },
      TREE,
    );
    expect(result.status).toBe(0);
    expect(sent).toEqual([
      { method: "POST", url: COMMENTS, body: expect.stringContaining("plugins/second-plugin@example.org/") },
      { method: "PATCH", url: ISSUE, state: "closed", state_reason: "completed" },
    ]);
  });

  test("quotes a message from the handoff only inside a code span", async () => {
    const { sent } = await answer({ outcome: { outcome: "refused", failure: "not-github-repo", message: "see @someone\n\n@other" } }, indexRepo);
    const comment: string = sent[0].body;
    expect(comment).toContain("` see @someone @other `");
    expect(comment.replace(/`[^`]*`/g, "")).not.toContain("@");
  });
});
