import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import type { Responses } from "./support/fixture-fetch.ts";
import { checkout, git } from "./support/git-checkout.ts";

const ROOT = resolve(import.meta.dirname, "..");
const PRELOAD = resolve(ROOT, "test/support/preload-fixture.ts");
const INDEX = "https://api.github.com/repos/example/index";
const PULLS = `${INDEX}/pulls`;
const COMMENTS = `${INDEX}/issues/7/comments`;

const temps: string[] = [];
afterAll(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "zpi-handoff-"));
  temps.push(dir);
  return dir;
}

const responses: Responses = {
  [INDEX]: { json: { full_name: "example/index", default_branch: "main" } },
  [`${PULLS}?state=all&per_page=100`]: { json: [] },
  [`POST ${PULLS}`]: { status: 201, json: { html_url: "https://github.com/example/index/pull/1" } },
  [`POST ${COMMENTS}`]: { status: 201, json: { id: 1 } },
};

type Entry = { repo: string; repoUrl: string; id: string; version: string };
const entry = (repo: string, id: string): Entry => ({ repo, repoUrl: `https://github.com/${repo}`, id, version: "1.0.0" });
const ALPHA = entry("example/alpha", "alpha@example.org");

// Writes a handoff with `plan` and an entry directory with its two files for each id.
function handoff(plan: unknown, ids: string[]): string {
  const dir = tempDir();
  writeFileSync(join(dir, "plan.json"), JSON.stringify(plan));
  for (const id of ids) {
    mkdirSync(join(dir, "entries", id), { recursive: true });
    writeFileSync(join(dir, "entries", id, "meta.json"), JSON.stringify({ id, name: "Alpha", repoUrl: "https://github.com/example/alpha" }));
    writeFileSync(join(dir, "entries", id, "index.json"), '{"schemaVersion":1}\n');
  }
  return dir;
}

// Runs `pnpm propose` on a handoff in a checkout whose remote takes pushes, and returns
// its result, the requests it sent other than GET, and the discover/ branches on the
// remote afterward.
function propose(dir: string, env: Record<string, string> = {}, args: string[] = []) {
  const pnpmPath = process.env.npm_execpath;
  if (!pnpmPath) throw new Error("run the tests with `pnpm test`, so they can call pnpm");
  const { remote, work } = checkout(tempDir());
  const fixture = join(tempDir(), "responses.json");
  writeFileSync(fixture, JSON.stringify({ source: "handoff test", repoUrl: "", responses }));
  const log = join(tempDir(), "requests.jsonl");
  writeFileSync(log, "");
  const { INIT_CWD: _outer, GITHUB_TOKEN: _token, ISSUE_NUMBER: _issue, ...outer } = process.env;
  Object.assign(outer, { ZPI_FIXTURE: fixture, ZPI_REQUESTS: log, NODE_OPTIONS: `--import=${PRELOAD}`, GITHUB_REPOSITORY: "example/index" }, env);
  const result = spawnSync(pnpmPath, ["--silent", "--dir", ROOT, "propose", dir, ...args], { cwd: work, encoding: "utf8", env: outer, timeout: 50_000 });
  const sent = readFileSync(log, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter(({ method }) => method !== "GET");
  return { result, sent, branches: git(remote, "for-each-ref", "--format=%(refname)", "refs/heads/discover") };
}

describe("pnpm propose on a handoff it can trust", () => {
  test("pushes the entry and opens its pull request", () => {
    const { result, sent, branches } = propose(handoff({ kind: "discover", entries: [ALPHA] }, [ALPHA.id]));
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(sent.map(({ method, url }) => `${method} ${url}`)).toEqual([`POST ${PULLS}`]);
    expect(branches).toBe("refs/heads/discover/example/alpha");
  });
});

describe("pnpm propose refuses a handoff it cannot trust, with no request and no push", () => {
  const discover = (entries: Entry[], ids = entries.map(({ id }) => id)) => handoff({ kind: "discover", entries }, ids);
  const issueEntry = (extra: Record<string, unknown> = {}, ids = [ALPHA.id]) =>
    handoff({ kind: "issue", outcome: "entry", entry: ALPHA, ...extra }, ids);
  const issue = { ISSUE_NUMBER: "7" };

  test.each<[string, () => string, Record<string, string>, RegExp]>([
    ["a plan with a field the schema does not define", () => handoff({ kind: "discover", entries: [ALPHA], extra: 1 }, [ALPHA.id]), {}, /does not match the handoff schema/],
    ["a plan that is a JSON string", () => handoff("{", []), {}, /does not match the handoff schema/],
    ["a plan that names an issue number", () => issueEntry({ issue: 3 }), issue, /does not match the handoff schema/],
    ["a failure name with a backtick", () => handoff({ kind: "issue", outcome: "refused", failure: "x`@someone", message: "m" }, []), issue, /does not match the handoff schema/],
    ["an id that is not a Mozilla add-on id", () => discover([entry("example/alpha", "alpha")]), {}, /is not a Mozilla add-on id/],
    ["an id with a slash", () => discover([entry("example/alpha", "a/b@example.org")], []), {}, /is not a Mozilla add-on id/],
    ["the id ..", () => discover([entry("example/alpha", "..")], []), {}, /is not a Mozilla add-on id/],
    ["a repo with capital letters", () => discover([{ ...ALPHA, repo: "Example/Alpha" }]), {}, /is not a lowercase owner\/repo/],
    ["a repo with three parts", () => discover([{ ...ALPHA, repo: "example/alpha/x", repoUrl: "https://github.com/example/alpha/x" }]), {}, /is not a lowercase owner\/repo/],
    ["a repo whose branch git refuses", () => discover([entry("example/.alpha", ALPHA.id)]), {}, /discover\/example\/\.alpha is not a valid git branch name/],
    ["a repo URL for another repo", () => discover([{ ...ALPHA, repoUrl: "https://github.com/example/other" }]), {}, /is not the GitHub URL of example\/alpha/],
    ["more entries than the limit", () => discover([ALPHA, entry("example/beta", "beta@example.org")]), {}, /more than the limit of 1/],
    ["a second entry directory for an issue", () => issueEntry({}, [ALPHA.id, "beta@example.org"]), issue, /holds "beta@example.org", which the plan does not name/],
  ])("%s", (_name, make, env, message) => {
    const args = message.source.includes("limit of 1") ? ["--limit", "1"] : [];
    const { result, sent, branches } = propose(make(), env, args);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(new RegExp(`^refused the handoff: .*${message.source}`, "s"));
    expect(sent).toEqual([]);
    expect(branches).toBe("");
  });

  test.each<[string, (dir: string) => void, RegExp]>([
    ["a subdirectory in an entry", (dir) => mkdirSync(join(dir, "entries", ALPHA.id, "sub")), /holds \["index.json","meta.json","sub"\]/],
    ["a file other than meta.json and index.json", (dir) => writeFileSync(join(dir, "entries", ALPHA.id, "extra.txt"), "x"), /holds \["extra.txt","index.json","meta.json"\]/],
    [
      "a symbolic link named meta.json",
      (dir) => {
        rmSync(join(dir, "entries", ALPHA.id, "meta.json"));
        symlinkSync("/etc/hosts", join(dir, "entries", ALPHA.id, "meta.json"));
      },
      /meta.json is not a regular file/,
    ],
    [
      "an entries directory that is a symbolic link",
      (dir) => {
        const elsewhere = tempDir();
        rmSync(join(elsewhere), { recursive: true });
        renameSync(join(dir, "entries"), elsewhere);
        symlinkSync(elsewhere, join(dir, "entries"));
      },
      /entries is not a directory/,
    ],
    [
      "an entry directory that is a symbolic link",
      (dir) => {
        rmSync(join(dir, "entries", ALPHA.id), { recursive: true });
        symlinkSync(tempDir(), join(dir, "entries", ALPHA.id));
      },
      /entries\/alpha@example.org is not a directory/,
    ],
  ])("%s", (_name, plant, message) => {
    const dir = handoff({ kind: "discover", entries: [ALPHA] }, [ALPHA.id]);
    plant(dir);
    const { result, sent, branches } = propose(dir);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(new RegExp(`^refused the handoff: .*${message.source}`, "s"));
    expect(sent).toEqual([]);
    expect(branches).toBe("");
  });
});
