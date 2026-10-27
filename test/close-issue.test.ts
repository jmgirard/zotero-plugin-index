import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import { closeIssue } from "../src/discover/close-issue.ts";
import { body, type Written } from "../src/discover/propose.ts";
import { fixtureFetch, type Responses } from "./support/fixture-fetch.ts";

const ROOT = resolve(import.meta.dirname, "..");
const PRELOAD = resolve(ROOT, "test/support/preload-fixture.ts");
const INDEX = "https://api.github.com/repos/example/index";
const PULL = `${INDEX}/pulls/9`;
const PULL_URL = "https://github.com/example/index/pull/9";
const ISSUE = `${INDEX}/issues/7`;
const COMMENTS = `${ISSUE}/comments`;
const COMMENT_LIST = `${COMMENTS}?per_page=100`;
const BOT = { login: "github-actions[bot]" };

const temps: string[] = [];
afterAll(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const entry: Written = { outcome: "written", repo: "example/alpha", repoUrl: "https://github.com/example/alpha", id: "alpha@example.org", version: "1.0.0", dir: "" };
// The body `pnpm propose` writes for issue 7, and for a topic run whose check output
// holds a `Closes #7` line inside its code block.
const issueBody = body(entry, { status: 0, output: "checked 1 entries in x, 0 problems\n" }, 7);
const fencedBody = body(entry, { status: 0, output: "Closes #7\n" });

const pull = {
  number: 9,
  state: "closed",
  merged: false,
  merged_at: null,
  html_url: PULL_URL,
  head: { ref: "discover/example/alpha", repo: { full_name: "example/index" } },
  body: issueBody,
};
const issue = { number: 7, state: "open", labels: [{ name: "add-plugin" }] };
const opened = { user: BOT, body: `The bot opened ${PULL_URL}. This issue closes when that pull request merges.` };

// A bot pull request 9 that was closed without a merge, and its open "Add a plugin"
// issue 7 with the bot's comment, with answers to the comment and close requests.
const acting: Responses = {
  [PULL]: { json: pull },
  [ISSUE]: { json: issue },
  [COMMENT_LIST]: { json: [{ user: { login: "someone" }, body: "please add it" }, opened] },
  [`POST ${COMMENTS}`]: { status: 201, json: { id: 1 } },
  [`PATCH ${ISSUE}`]: { json: { number: 7, state: "closed" } },
};

async function run(responses: Responses) {
  const { fetch, requests } = fixtureFetch(responses);
  const result = await closeIssue({ fetch, indexRepo: "example/index", pull: 9 });
  const sent = requests.filter(({ method }) => method !== "GET").map(({ method, url, body: payload }) => ({ method, url, ...JSON.parse(payload!) }));
  return { result, sent, gets: requests.filter(({ method }) => method === "GET").map(({ url }) => url) };
}

describe("closing the issue of a bot pull request closed without a merge", () => {
  test("comments the pull request's URL on the issue and closes it as not planned", async () => {
    const { result, sent } = await run(acting);
    expect(result).toMatchObject({ status: 0, errors: [] });
    expect(sent).toEqual([
      { method: "POST", url: COMMENTS, body: expect.stringContaining(`${PULL_URL} was closed without a merge`) },
      { method: "PATCH", url: ISSUE, state: "closed", state_reason: "not_planned" },
    ]);
  });

  test.each<[string, Responses, string]>([
    ["the pull request was merged", { [PULL]: { json: { ...pull, merged: true, merged_at: "2026-10-27T00:00:00Z" } } }, "merged"],
    ["the pull request is open again", { [PULL]: { json: { ...pull, state: "open" } } }, "not closed"],
    ["the head branch is outside discover/", { [PULL]: { json: { ...pull, head: { ...pull.head, ref: "fix/alpha" } } } }, "head branch"],
    ["the head branch is in another repo", { [PULL]: { json: { ...pull, head: { ...pull.head, repo: { full_name: "fork/index" } } } } }, "head branch"],
    ["the body has no Closes line", { [PULL]: { json: { ...pull, body: body(entry, { status: 0, output: "" }) } } }, "Closes"],
    ["the body has two Closes lines", { [PULL]: { json: { ...pull, body: `${issueBody}\n\nCloses #8` } } }, "Closes"],
    ["the body's only Closes line is inside the check-output fence", { [PULL]: { json: { ...pull, body: fencedBody } } }, "Closes"],
    ["the item is a pull request", { [ISSUE]: { json: { ...issue, pull_request: { url: `${INDEX}/pulls/7` } } } }, "not an issue"],
    ["the issue is closed", { [ISSUE]: { json: { ...issue, state: "closed" } } }, "not open"],
    ["the issue has no add-plugin label", { [ISSUE]: { json: { ...issue, labels: [{ name: "report" }] } } }, "add-plugin"],
    ["no bot comment holds the URL", { [COMMENT_LIST]: { json: [{ user: { login: "someone" }, body: PULL_URL }, { user: BOT, body: `${PULL_URL}0` }] } }, "no bot comment"],
    [
      "a bot comment already says the pull request was closed without a merge",
      { [COMMENT_LIST]: { json: [opened, { user: BOT, body: `${PULL_URL} was closed without a merge, so the bot closes this issue as not planned.` }] } },
      "already",
    ],
  ])("sends nothing and returns 0 when %s", async (_name, change, reason) => {
    const { result, sent } = await run({ ...acting, ...change });
    expect(result).toMatchObject({ status: 0, errors: [], skipped: expect.stringContaining(reason) });
    expect(sent).toEqual([]);
  });

  test("reads the issue named by the Closes line outside the fence", async () => {
    const { gets } = await run({ ...acting, [PULL]: { json: { ...pull, body: body(entry, { status: 0, output: "Closes #7\n" }, 70) } } });
    expect(gets).toContain(`${INDEX}/issues/70`);
    expect(gets).not.toContain(ISSUE);
  });

  test.each<[string, Responses, string]>([
    ["the pull request read", { [PULL]: { status: 503, text: "unavailable" } }, `GET ${PULL} returned HTTP 503`],
    ["the issue read", { [ISSUE]: { status: 503, text: "unavailable" } }, `GET ${ISSUE} returned HTTP 503`],
    ["the comments read", { [COMMENT_LIST]: { status: 503, text: "unavailable" } }, `GET ${COMMENT_LIST} returned HTTP 503`],
  ])("sends nothing and returns 1 when %s fails", async (_name, change, message) => {
    const { result, sent } = await run({ ...acting, ...change });
    expect(result).toMatchObject({ status: 1, errors: [message] });
    expect(sent).toEqual([]);
  });

  test("sends no close and returns 1 when the comment request fails", async () => {
    const { result, sent } = await run({ ...acting, [`POST ${COMMENTS}`]: { status: 403, json: { message: "Forbidden" } } });
    expect(result).toMatchObject({ status: 1, errors: [`POST ${COMMENTS} returned HTTP 403: Forbidden`] });
    expect(sent.map(({ method }) => method)).toEqual(["POST"]);
  });

  test("returns 1 when the close request fails after the comment", async () => {
    const { result, sent } = await run({ ...acting, [`PATCH ${ISSUE}`]: { status: 500, json: { message: "boom" } } });
    expect(result).toMatchObject({ status: 1, errors: [`PATCH ${ISSUE} returned HTTP 500: boom`] });
    expect(sent.map(({ method }) => method)).toEqual(["POST", "PATCH"]);
  });
});

// As in the report tests, the preload answers the command's requests from `responses`.
function pnpmClose(responses: Responses, env: Record<string, string> = { GITHUB_REPOSITORY: "example/index", PR_NUMBER: "9" }) {
  const pnpmPath = process.env.npm_execpath;
  if (!pnpmPath) throw new Error("run the tests with `pnpm test`, so they can call pnpm");
  const dir = mkdtempSync(join(tmpdir(), "zpi-close-"));
  temps.push(dir);
  const fixture = join(dir, "responses.json");
  const log = join(dir, "requests.jsonl");
  writeFileSync(fixture, JSON.stringify({ source: "close test", repoUrl: "", responses }));
  writeFileSync(log, "");
  const { INIT_CWD: _outer, GITHUB_TOKEN: _token, GITHUB_REPOSITORY: _repo, PR_NUMBER: _pull, ...outer } = process.env;
  Object.assign(outer, { ZPI_FIXTURE: fixture, ZPI_REQUESTS: log, NODE_OPTIONS: `--import=${PRELOAD}`, ...env });
  const result = spawnSync(pnpmPath, ["--silent", "--dir", ROOT, "close-issue"], { cwd: dir, encoding: "utf8", env: outer, timeout: 50_000 });
  const sent = readFileSync(log, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter(({ method }) => method !== "GET");
  return { result, sent };
}

describe("pnpm close-issue", () => {
  test("closes the issue as not planned and exits 0", () => {
    const { result, sent } = pnpmClose(acting);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(sent.map(({ method, url }) => `${method} ${url}`)).toEqual([`POST ${COMMENTS}`, `PATCH ${ISSUE}`]);
    expect(JSON.parse(sent[1].body)).toEqual({ state: "closed", state_reason: "not_planned" });
  });

  test("exits 1 when the close request fails", () => {
    const { result } = pnpmClose({ ...acting, [`PATCH ${ISSUE}`]: { status: 500, json: { message: "boom" } } });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`PATCH ${ISSUE} returned HTTP 500`);
  });

  test.each([
    ["PR_NUMBER is not a number", { GITHUB_REPOSITORY: "example/index", PR_NUMBER: "x" }, "PR_NUMBER must be the number of a pull request"],
    ["GITHUB_REPOSITORY does not name a repo", { GITHUB_REPOSITORY: "example", PR_NUMBER: "9" }, "GITHUB_REPOSITORY must name the index repo"],
  ])("prints the usage and exits 1 when %s", (_name, env, message) => {
    const { result, sent } = pnpmClose(acting, env);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(message);
    expect(sent).toEqual([]);
  });
});
