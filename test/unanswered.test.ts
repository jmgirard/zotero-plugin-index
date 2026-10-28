import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import { unansweredIssues } from "../src/issues/unanswered.ts";
import { fixtureFetch, type Responses } from "./support/fixture-fetch.ts";

const ROOT = resolve(import.meta.dirname, "..");
const PRELOAD = resolve(ROOT, "test/support/preload-fixture.ts");
const REPO = "https://api.github.com/repos/example/index";
const RUNS = `${REPO}/actions/workflows/add-plugin-issue.yml/runs?event=issues&per_page=100`;
const ISSUES = `${REPO}/issues?labels=add-plugin&state=open&sort=created&direction=asc&per_page=100`;
const comments = (number: number) => `${REPO}/issues/${number}/comments?per_page=100`;
const BOT = { login: "github-actions[bot]" };
const SOMEONE = { login: "someone" };
const NOW = Date.parse("2026-10-28T12:00:00Z");
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

const temps: string[] = [];
afterAll(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const issue = (number: number, age: number, more: Record<string, unknown> = {}) => ({
  number,
  state: "open",
  labels: [{ name: "add-plugin" }],
  created_at: new Date(NOW - age).toISOString(),
  ...more,
});

// Oldest first, as the list request asks. Only 7, 1, and 6 pass every condition: 8 is
// just over 7 days old, 10 and 9 carry a bot comment (10 on its second page of
// comments), 2 lacks the label, 3 is closed, 4 is a pull request, and 5 is just under an
// hour old.
const listed = [
  issue(8, 7 * DAY + MINUTE),
  issue(7, 7 * DAY),
  issue(10, 3 * DAY),
  issue(9, 2 * DAY),
  issue(1, DAY),
  issue(2, 12 * 60 * MINUTE, { labels: [{ name: "report" }] }),
  issue(3, 12 * 60 * MINUTE, { state: "closed" }),
  issue(4, 12 * 60 * MINUTE, { pull_request: { url: `${REPO}/pulls/4` } }),
  issue(6, 60 * MINUTE),
  issue(5, 59 * MINUTE),
];

const responses: Responses = {
  [RUNS]: { json: { total_count: 2, workflow_runs: [{ status: "completed" }, { status: "completed" }] } },
  [ISSUES]: { json: listed },
  ...Object.fromEntries([8, 7, 9, 1, 2, 3, 4, 6, 5].map((number) => [comments(number), { json: number === 9 ? [{ user: SOMEONE }, { user: BOT }] : [{ user: SOMEONE }] }])),
  [comments(10)]: { json: [{ user: SOMEONE }], headers: { link: `<${comments(10)}&page=2>; rel="next"` } },
  [`${comments(10)}&page=2`]: { json: [{ user: BOT }] },
};

async function run(given: Responses, limit = 100) {
  const { fetch, requests } = fixtureFetch(given);
  const numbers = await unansweredIssues({ fetch, indexRepo: "example/index", label: "add-plugin", workflow: "add-plugin-issue.yml", limit, now: NOW });
  return { numbers, gets: requests.map(({ url }) => url) };
}

describe("unansweredIssues", () => {
  test("returns, oldest first, the open labeled issues from 1 hour to 7 days old with no bot comment", async () => {
    expect((await run(responses)).numbers).toEqual([7, 1, 6]);
  });

  test("returns at most the limit", async () => {
    expect((await run(responses, 2)).numbers).toEqual([7, 1]);
  });

  test.each(["queued", "in_progress"])("returns none and lists no issue while an issue run is %s", async (status) => {
    const given = { ...responses, [RUNS]: { json: { total_count: 2, workflow_runs: [{ status: "completed" }, { status }] } } };
    const { numbers, gets } = await run(given);
    expect(numbers).toEqual([]);
    expect(gets).toEqual([RUNS]);
  });

  test.each<[string, string]>([
    ["the runs", RUNS],
    ["the issues", ISSUES],
    ["the comments", comments(1)],
  ])("throws when the read of %s fails", async (_name, url) => {
    await expect(run({ ...responses, [url]: { status: 500, json: { message: "boom" } } })).rejects.toThrow(`GET ${url} returned HTTP 500`);
  });
});

describe("pnpm unanswered-issues", () => {
  function pnpmUnanswered(args: string[], given: Responses) {
    const pnpmPath = process.env.npm_execpath;
    if (!pnpmPath) throw new Error("run the tests with `pnpm test`, so they can call pnpm");
    const dir = mkdtempSync(join(tmpdir(), "zpi-unanswered-cli-"));
    temps.push(dir);
    const fixture = join(dir, "responses.json");
    const log = join(dir, "requests.jsonl");
    writeFileSync(fixture, JSON.stringify({ source: "unanswered test", repoUrl: "", responses: given }));
    writeFileSync(log, "");
    const { INIT_CWD: _outer, GITHUB_TOKEN: _token, ...outer } = process.env;
    Object.assign(outer, { ZPI_FIXTURE: fixture, ZPI_REQUESTS: log, NODE_OPTIONS: `--import=${PRELOAD}`, GITHUB_REPOSITORY: "example/index" });
    const result = spawnSync(pnpmPath, ["--silent", "--dir", ROOT, "unanswered-issues", ...args], { cwd: dir, encoding: "utf8", env: outer, timeout: 50_000 });
    return { result, requests: readFileSync(log, "utf8").split("\n").filter(Boolean) };
  }

  test("prints one number for each unanswered issue", () => {
    const created = new Date(Date.now() - 2 * 60 * MINUTE).toISOString();
    const given: Responses = {
      [RUNS]: { json: { total_count: 0, workflow_runs: [] } },
      [ISSUES]: { json: [{ number: 12, state: "open", labels: ["add-plugin"], created_at: created }] },
      [comments(12)]: { json: [] },
    };
    const { result } = pnpmUnanswered(["--label", "add-plugin", "--workflow", "add-plugin-issue.yml", "--limit", "3"], given);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("12\n");
  });

  test.each([
    [["--label", "add-plugin", "--workflow", "add-plugin-issue.yml", "--limit"]],
    [["--label", "add-plugin", "--workflow", "add-plugin-issue.yml", "--limit", "0"]],
  ])("refuses the arguments %j and sends no request", (args) => {
    const { result, requests } = pnpmUnanswered(args, {});
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("usage: pnpm unanswered-issues");
    expect(requests).toEqual([]);
  });
});
