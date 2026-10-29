import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import { mergeDiscover } from "../src/discover/merge.ts";
import { type CheckRunner, pnpmCheck } from "../src/discover/propose.ts";
import { fixtureFetch, type Responses } from "./support/fixture-fetch.ts";

const ROOT = resolve(import.meta.dirname, "..");
const PRELOAD = resolve(ROOT, "test/support/preload-fixture.ts");
// Three entries, one of them second-plugin@example.org.
const PLUGINS = resolve(ROOT, "test/fixtures/build/plugins");
const INDEX = "https://api.github.com/repos/example/index";
const LIST = `${INDEX}/pulls?state=open&per_page=100`;
const PAGE_2 = `${LIST}&page=2`;
const NOW = new Date("2026-10-29T12:00:00Z");
const HOUR = 60 * 60 * 1000;
const passes: CheckRunner = async () => ({ status: 0, output: "checked 4 entries in x, 0 problems\n" });

const temps: string[] = [];
afterAll(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "zpi-merge-"));
  temps.push(dir);
  return dir;
}

const sha = (n: number) => n.toString(16).padStart(40, "0");
const id = (n: number) => `p${n}@example.org`;

// An open bot pull request number n that meets every condition, with `change` applied.
function pull(n: number, change: Record<string, unknown> = {}) {
  return {
    number: n,
    body: "The discovery bot found it.\n\nHold: none\n\nThe bot can merge this pull request.",
    created_at: new Date(NOW.getTime() - 72 * HOUR).toISOString(),
    user: { login: "github-actions[bot]" },
    labels: [],
    head: { ref: `discover/example/p${n}`, sha: sha(n), repo: { full_name: "example/index" } },
    base: { ref: "main" },
    state: "open",
    ...change,
  };
}

const meta = (n: number, extra: Record<string, unknown> = {}) => ({
  id: id(n),
  name: `Plugin ${n}`,
  repoUrl: `https://github.com/example/p${n}`,
  updateUrl: `https://raw.githubusercontent.com/example/p${n}/main/update.json`,
  ...extra,
});

// The files list and file contents of pull request n, which adds plugins/<id>/.
function entry(n: number, entryId = id(n), metaJson: unknown = meta(n)): Responses {
  const contents = (file: string, text: string) => ({
    [`${INDEX}/contents/plugins/${encodeURIComponent(entryId)}/${file}?ref=${sha(n)}`]: {
      json: { encoding: "base64", content: Buffer.from(text).toString("base64") },
    },
  });
  return {
    [`${INDEX}/pulls/${n}/files?per_page=100`]: {
      json: [
        { filename: `plugins/${entryId}/index.json`, status: "added" },
        { filename: `plugins/${entryId}/meta.json`, status: "added" },
      ],
    },
    ...contents("index.json", '{\n  "schemaVersion": 1\n}\n'),
    ...contents("meta.json", `${JSON.stringify(metaJson, null, 2)}\n`),
    // The read just before the merge finds the pull request unchanged.
    [`${INDEX}/pulls/${n}`]: { json: pull(n) },
    [`PUT ${INDEX}/pulls/${n}/merge`]: { json: { merged: true } },
  };
}

const files = (n: number, list: { filename: string; status: string }[]): Responses => ({ [`${INDEX}/pulls/${n}/files?per_page=100`]: { json: list } });

const indexRecord: Responses = { [INDEX]: { json: { full_name: "example/index", default_branch: "main" } } };

async function run(responses: Responses, check = passes, waitHours?: number) {
  const { fetch, requests } = fixtureFetch({ ...indexRecord, ...responses });
  const result = await mergeDiscover({ fetch, indexRepo: "example/index", root: PLUGINS, check, now: NOW, waitHours });
  const merges = requests.filter(({ method }) => method === "PUT").map(({ url, body }) => ({ url, ...JSON.parse(body!) }));
  return { result, merges };
}

describe("pnpm merge-discover's conditions", () => {
  test("merges only the pull requests that meet every condition, on every page, and names the first condition each other one fails", async () => {
    const added = (path: string) => ({ filename: path, status: "added" });
    const first = [
      pull(1, { head: { ref: "feature/p1", sha: sha(1), repo: { full_name: "example/index" } } }),
      pull(2, { head: { ref: "discover/example/p2", sha: sha(2), repo: { full_name: "someone/index" } } }),
      pull(3, { user: { login: "someone" } }),
      pull(4, { body: "Hold: name-match\n\nThe bot does not merge this pull request itself." }),
      pull(5, { labels: [{ name: "hold" }] }),
      pull(6, { created_at: new Date(NOW.getTime() - 47 * HOUR).toISOString() }),
      pull(7),
      pull(8),
      pull(9),
      pull(10),
      pull(11),
      pull(12, { body: "The discovery bot found it.\r\n\r\nHold: none\r\n" }),
      pull(13),
      pull(14),
    ];
    const responses: Responses = {
      [LIST]: { json: first, headers: { link: `<${PAGE_2}>; rel="next"` } },
      [PAGE_2]: { json: [pull(15)] },
      // 7 to 10 fail one part of the files condition: the count, a path, a status, one id.
      ...files(7, [added(`plugins/${id(7)}/index.json`), added(`plugins/${id(7)}/meta.json`), added("README.md")]),
      ...files(8, [added(`plugins/${id(8)}/index.json`), added(`plugins/${id(8)}/notes.json`)]),
      ...files(9, [added(`plugins/${id(9)}/index.json`), { filename: `plugins/${id(9)}/meta.json`, status: "modified" }]),
      ...files(10, [added(`plugins/${id(10)}/index.json`), added(`plugins/${id(11)}/meta.json`)]),
      // 11 adds an id that the checkout has in another letter case.
      ...entry(11, "Second-Plugin@example.org"),
      ...entry(12),
      // 13's files read fails.
      [`${INDEX}/pulls/13/files?per_page=100`]: { status: 500, json: { message: "Server Error" } },
      ...entry(14),
      ...entry(15),
    };
    const { result, merges } = await run(responses);
    expect(result.skipped).toEqual([
      { number: 1, reason: "its head branch does not start with discover/" },
      { number: 2, reason: "its head branch is not in example/index" },
      { number: 3, reason: "its author is not github-actions[bot]" },
      { number: 4, reason: "its body has no Hold: none line" },
      { number: 5, reason: "it has the hold label" },
      { number: 6, reason: "it opened less than 48 hours ago" },
      ...[7, 8, 9, 10].map((number) => ({
        number,
        reason: "its files are not exactly plugins/<id>/meta.json and plugins/<id>/index.json, both added",
      })),
      { number: 11, reason: "the default branch already has plugins/Second-Plugin@example.org in some letter case" },
    ]);
    expect(result.failed).toEqual([{ number: 13, message: expect.stringMatching(/^cannot read its files: .*HTTP 500/) }]);
    expect(result.merged).toEqual([12, 14, 15]);
    expect(merges).toEqual([12, 14, 15].map((n) => ({ url: `${INDEX}/pulls/${n}/merge`, merge_method: "squash", sha: sha(n) })));
  });

  test("a pull request exactly 48 hours old can merge", async () => {
    const opened = new Date(NOW.getTime() - 48 * HOUR).toISOString();
    const { result } = await run({ [LIST]: { json: [pull(1, { created_at: opened })] }, ...entry(1) });
    expect(result.merged).toEqual([1]);
  });

  test.each<[string, Record<string, unknown>, string]>([
    [
      "a Hold: none line only inside the quoted check output",
      { body: "Intro.\n\n```\nHold: none\n```\n" },
      "its body has no Hold: none line",
    ],
    ["a Hold: none line beside another Hold line", { body: "Hold: none\n\nHold: update-host\n" }, "its body has no Hold: none line"],
    ["the label Hold in another letter case", { labels: [{ name: "Hold" }] }, "it has the hold label"],
    ["a draft", { draft: true }, "it is a draft"],
    ["a pull request for another base branch", { base: { ref: "release" } }, "it does not target the default branch main"],
  ])("skips %s", async (_name, change, reason) => {
    const { result, merges } = await run({ [LIST]: { json: [pull(1, change)] }, ...entry(1) });
    expect(result.skipped).toEqual([{ number: 1, reason }]);
    expect(merges).toEqual([]);
  });

  test.each<[string, Record<string, unknown>, string]>([
    ["a hold label added", { labels: [{ name: "hold" }] }, "it has the hold label"],
    ["a push", { head: { ref: "discover/example/p1", sha: sha(99), repo: { full_name: "example/index" } } }, "its head moved"],
    ["a close", { state: "closed" }, "it is no longer open"],
  ])("skips a pull request that gets %s after the list read", async (_name, change, reason) => {
    const { result, merges } = await run({ [LIST]: { json: [pull(1)] }, ...entry(1), [`${INDEX}/pulls/1`]: { json: pull(1, change) } });
    expect(result.skipped).toEqual([{ number: 1, reason: `it changed during the run: ${reason}` }]);
    expect(merges).toEqual([]);
  });

  test("checks each entry beside the entries that the run merged before it", async () => {
    const seen: string[][] = [];
    const check: CheckRunner = async (dir) => {
      seen.push(readdirSync(dir).filter((name) => name.endsWith("@example.org")));
      return passes(dir);
    };
    const { result } = await run({ [LIST]: { json: [pull(1), pull(2)] }, ...entry(1), ...entry(2) }, check);
    expect(result.merged).toEqual([1, 2]);
    expect(seen.map((names) => names.filter((name) => /^p\d/.test(name)).sort())).toEqual([[id(1)], [id(1), id(2)]]);
  });

  test("a later pull request for an id that this run merged is skipped", async () => {
    const { result } = await run({ [LIST]: { json: [pull(1), pull(2)] }, ...entry(1), ...entry(2, "P1@example.org") });
    expect(result.merged).toEqual([1]);
    expect(result.skipped).toEqual([{ number: 2, reason: "the default branch already has plugins/P1@example.org in some letter case" }]);
  });
});

describe("pnpm merge-discover's check and merge failures", () => {
  test("does not merge an entry that fails pnpm check, names the check's finding, and merges the next", async () => {
    const responses: Responses = { [LIST]: { json: [pull(1), pull(2)] }, ...entry(1, id(1), meta(1, { extra: 1 })), ...entry(2) };
    const { result, merges } = await run(responses, (dir) => pnpmCheck(dir));
    expect(result.failed).toEqual([{ number: 1, message: expect.stringMatching(/^pnpm check exited with status 1:\n.*p1@example\.org: registry-schema/s) }]);
    expect(result.merged).toEqual([2]);
    expect(merges.map(({ url }) => url)).toEqual([`${INDEX}/pulls/2/merge`]);
  });

  test("does not merge an entry whose check passes its time limit, and merges the next", async () => {
    const shims = tempDir();
    // A pnpm whose check waits on a child that never exits while p1's entry is in the
    // directory, its fifth argument.
    writeFileSync(join(shims, "pnpm"), `#!/bin/sh\nif [ -d "$5/${id(1)}" ]; then sleep 600; fi\necho "checked 4 entries in x, 0 problems"\n`);
    chmodSync(join(shims, "pnpm"), 0o755);
    const saved = process.env.npm_execpath;
    process.env.npm_execpath = join(shims, "pnpm");
    try {
      const { result, merges } = await run({ [LIST]: { json: [pull(1), pull(2)] }, ...entry(1), ...entry(2) }, (dir) => pnpmCheck(dir, 1000));
      expect(result.failed).toEqual([{ number: 1, message: "pnpm check passed its time limit of 1000 ms" }]);
      expect(merges.map(({ url }) => url)).toEqual([`${INDEX}/pulls/2/merge`]);
    } finally {
      process.env.npm_execpath = saved;
    }
  });

  test("names a pull request whose merge request is refused, and merges the next", async () => {
    const responses: Responses = {
      [LIST]: { json: [pull(1), pull(2)] },
      ...entry(1),
      [`PUT ${INDEX}/pulls/1/merge`]: { status: 405, json: { message: "Pull Request is not mergeable" } },
      ...entry(2),
    };
    const { result, merges } = await run(responses);
    expect(result.failed).toEqual([{ number: 1, message: expect.stringContaining("returned HTTP 405: Pull Request is not mergeable") }]);
    expect(result.merged).toEqual([2]);
    expect(merges.map(({ url }) => url)).toEqual([`${INDEX}/pulls/1/merge`, `${INDEX}/pulls/2/merge`]);
  });
});

describe("pnpm merge-discover's wait", () => {
  const opened = (hours: number) => ({ created_at: new Date(NOW.getTime() - hours * HOUR).toISOString() });

  test("a wait of 0 merges a pull request opened 1 minute before the run", async () => {
    const { result } = await run({ [LIST]: { json: [pull(1, opened(1 / 60))] }, ...entry(1) }, passes, 0);
    expect(result.merged).toEqual([1]);
  });

  test("a wait of 2 skips one opened 1 hour before with the 2-hour reason and merges one opened exactly 2 hours before", async () => {
    const { result } = await run({ [LIST]: { json: [pull(1, opened(1)), pull(2, opened(2))] }, ...entry(1), ...entry(2) }, passes, 2);
    expect(result.skipped).toEqual([{ number: 1, reason: "it opened less than 2 hours ago" }]);
    expect(result.merged).toEqual([2]);
  });

  test("a wait of 1 names 1 hour", async () => {
    const { result } = await run({ [LIST]: { json: [pull(1, opened(0.5))] }, ...entry(1) }, passes, 1);
    expect(result.skipped).toEqual([{ number: 1, reason: "it opened less than 1 hour ago" }]);
  });

  test.each([
    ["after the run", new Date(NOW.getTime() + HOUR).toISOString()],
    ["not a date", "yesterday"],
  ])("a wait of 0 skips a pull request whose opening time is %s", async (_name, createdAt) => {
    const { result, merges } = await run({ [LIST]: { json: [pull(1, { created_at: createdAt })] }, ...entry(1) }, passes, 0);
    expect(result.skipped).toEqual([{ number: 1, reason: "its opening time is unreadable or after the run" }]);
    expect(merges).toEqual([]);
  });
});

describe("pnpm merge-discover", () => {
  // Runs the command against `responses`, logging each request it sends to a file.
  function cli(args: string[], responses: Responses, env: Record<string, string>) {
    const pnpmPath = process.env.npm_execpath;
    if (!pnpmPath) throw new Error("run the tests with `pnpm test`, so they can call pnpm");
    const fixture = join(tempDir(), "responses.json");
    writeFileSync(fixture, JSON.stringify({ source: "merge test", repoUrl: "", responses }));
    const log = join(tempDir(), "requests.jsonl");
    writeFileSync(log, "");
    const { INIT_CWD: _outer, GITHUB_TOKEN: _token, GITHUB_REPOSITORY: _repo, ...outer } = process.env;
    Object.assign(outer, { ZPI_FIXTURE: fixture, ZPI_REQUESTS: log, NODE_OPTIONS: `--import=${PRELOAD}` }, env);
    const result = spawnSync(pnpmPath, ["--silent", "--dir", ROOT, "merge-discover", ...args], { cwd: tempDir(), encoding: "utf8", env: outer, timeout: 50_000 });
    return { result, log: readFileSync(log, "utf8") };
  }

  test("prints what it merged and skipped, names each failure, and exits 1 after a failure", () => {
    const responses: Responses = {
      ...indexRecord,
      [LIST]: { json: [pull(1, { labels: [{ name: "hold" }] }), pull(2)] },
      [`${INDEX}/pulls/2/files?per_page=100`]: { status: 500, json: { message: "Server Error" } },
    };
    const { result } = cli([], responses, { GITHUB_REPOSITORY: "example/index" });
    expect(result.stdout).toBe("skipped #1: it has the hold label\n");
    expect(result.stderr).toMatch(/^failed #2: cannot read its files: .*HTTP 500/);
    expect(result.status).toBe(1);
  });

  test("passes --wait-hours to the run", () => {
    const responses: Responses = { ...indexRecord, [LIST]: { json: [pull(1, { created_at: new Date(Date.now() - HOUR).toISOString() })] } };
    const { result } = cli(["--wait-hours", "3"], responses, { GITHUB_REPOSITORY: "example/index" });
    expect(result.stdout).toBe("skipped #1: it opened less than 3 hours ago\n");
    expect(result.status).toBe(0);
  });

  test.each([
    [["--wait-hours"]],
    [["--wait-hours", "-1"]],
    [["--wait-hours", "1.5"]],
    [["--wait-hours", "10000"]],
    [["--wait", "0"]],
    [["--wait-hours=2"]],
    [["--wait-hours", "2", "--wait-hours", "3"]],
    [["--wait-hours", "2", "x"]],
    [["x"]],
  ])("refuses %j with the usage line before reading GITHUB_REPOSITORY, and sends no request", (args) => {
    const { result, log } = cli(args, indexRecord, {});
    expect(result.stderr).toBe("usage: pnpm merge-discover [--wait-hours <n>], with GITHUB_REPOSITORY set\n");
    expect(result.status).toBe(1);
    expect(log).toBe("");
  });
});
