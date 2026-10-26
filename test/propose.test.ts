import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import type { ReadItem, SkippedItem } from "../src/discover/discover.ts";
import { entriesDir, planned, readHandoff, writePlan } from "../src/discover/handoff.ts";
import { body, type CheckRunner, discoverRead, pnpmCheck, proposeHandoff, type Written } from "../src/discover/propose.ts";
import { fixtureFetch, loadFixture, type Responses } from "./support/fixture-fetch.ts";
import { checkout as gitCheckout, git } from "./support/git-checkout.ts";
import { pluginRepo, searchPage } from "./support/plugin-repo.ts";

const ROOT = resolve(import.meta.dirname, "..");
const PRELOAD = resolve(ROOT, "test/support/preload-fixture.ts");
const searchUrl = (topic: string) =>
  `https://api.github.com/search/repositories?q=topic%3A${topic}&sort=updated&order=desc&per_page=100`;

const temps: string[] = [];
afterAll(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "zpi-propose-"));
  temps.push(dir);
  return dir;
}

// One search page for each topic.
function searched(plugin: [string, string][], addon: [string, string][] = []): Responses {
  return {
    [searchUrl("zotero-plugin")]: { json: searchPage(plugin) },
    [searchUrl("zotero-addon")]: { json: searchPage(addon) },
  };
}

const INDEX = "https://api.github.com/repos/example/index";
const PULLS = `${INDEX}/pulls`;
const NOW = new Date("2026-10-25T12:00:00Z");
const publicLookup = async () => ["140.82.112.3"];

// The index repo's record and an empty pull-request list, for runs that skip nothing.
const indexRepo: Responses = {
  [INDEX]: { json: { full_name: "example/index", default_branch: "main" } },
  [`${PULLS}?state=all&per_page=100`]: { json: [] },
};

// Passing repos example/<name>, listed oldest first, each with the plugin id <name>@example.org.
function passing(names: string[]): Responses {
  const repos = names.map((name, i): [string, string] => [`example/${name}`, `2026-10-0${i + 1}T00:00:00Z`]);
  return Object.assign(searched(repos), ...names.map((name) => pluginRepo(`example/${name}`, `${name}@example.org`)));
}

const checkout = () => gitCheckout(tempDir());

// The paths a remote branch changes from main, and whether it is one commit on top of main.
function branch(remote: string, name: string) {
  return {
    onMain: git(remote, "rev-parse", `${name}^`) === git(remote, "rev-parse", "main"),
    paths: git(remote, "diff", "--name-only", "main", name).split("\n"),
  };
}

// The method, URL, and body of each request that a spawned command logged.
function logged(path: string): { method: string; url: string; body?: string }[] {
  return readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
}

// Runs the read step and then the write step in-process against `responses`, through a
// handoff written to disk, with a check that always passes unless one is given.
async function twoStep(responses: Responses, gitDir = tempDir(), check?: CheckRunner, root = tempDir()) {
  const { fetch, requests } = fixtureFetch(responses);
  const handoff = tempDir();
  const read = await discoverRead({
    root,
    outDir: entriesDir(handoff),
    fetch,
    lookup: publicLookup,
    state: {},
    limit: 5,
    budget: 100,
    now: NOW,
    indexRepo: "example/index",
  });
  if (!read.ok) return { read, posts: requests.filter(({ method }) => method === "POST"), requests };
  const written = read.report.read.filter((item): item is Written => item.outcome === "written");
  await writePlan(handoff, { kind: "discover", entries: written.map(planned) });
  const checked = await readHandoff(handoff, "discover", 5);
  if (!checked.ok || checked.plan.kind !== "discover") throw new Error(`handoff refused: ${JSON.stringify(checked)}`);
  const entries = checked.plan.entries.map((entry): Written => ({ ...entry, outcome: "written", dir: checked.dirs.get(entry.id)! }));
  const result = await proposeHandoff({
    root,
    fetch,
    indexRepo: "example/index",
    gitDir,
    check: check ?? (async () => ({ status: 0, output: "checked 1 entries in x, 0 problems\n" })),
    entries,
  });
  return { read, result, posts: requests.filter(({ method }) => method === "POST"), requests };
}

describe("proposing pull requests", () => {
  test("pnpm discover --handoff then pnpm propose pushes one branch with one entry and sends one request for each entry, at most 5 by default", () => {
    const { remote, work } = checkout();
    // An earlier run left this branch with another commit.
    git(work, "checkout", "--quiet", "-b", "discover/example/p7");
    writeFileSync(join(work, "stray.txt"), "left over\n");
    git(work, "add", "stray.txt");
    git(work, "-c", "user.name=test", "-c", "user.email=test@example.org", "-c", "commit.gpgsign=false", "commit", "--quiet", "-m", "stray");
    git(work, "push", "--quiet", "origin", "discover/example/p7");
    git(work, "checkout", "--quiet", "main");

    const requestLog = join(tempDir(), "requests.jsonl");
    const responses: Responses = {
      ...indexRepo,
      ...passing(["p1", "p2", "p3", "p4", "p5", "p6", "p7"]),
      [`POST ${PULLS}`]: { status: 201, json: { html_url: "https://github.com/example/index/pull/1" } },
    };
    const env = { GITHUB_REPOSITORY: "example/index", ZPI_REQUESTS: requestLog };
    const handoff = join(tempDir(), "handoff");
    const read = pnpm("discover", ["--handoff", handoff, "--state", join(tempDir(), "state.json")], responses, tempDir(), env);
    expect(read.stderr).toBe("");
    expect(read.status).toBe(0);
    expect(logged(requestLog).filter(({ method }) => method !== "GET")).toEqual([]);
    const result = pnpm("propose", [handoff], responses, work, env);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);

    const sent = logged(requestLog)
      .filter(({ method }) => method === "POST")
      .map(({ url, body }) => ({ url, ...JSON.parse(body!) }));
    const newest = ["p7", "p6", "p5", "p4", "p3"];
    expect(sent.map(({ url, head, base }) => [url, head, base])).toEqual(newest.map((name) => [PULLS, `discover/example/${name}`, "main"]));
    expect(git(remote, "for-each-ref", "--format=%(refname)", "refs/heads/discover").split("\n").sort()).toEqual(
      newest.map((name) => `refs/heads/discover/example/${name}`).sort(),
    );
    for (const name of newest) {
      expect(branch(remote, `discover/example/${name}`)).toEqual({
        onMain: true,
        paths: [`plugins/${name}@example.org/index.json`, `plugins/${name}@example.org/meta.json`],
      });
    }
    // The checkout itself is left on main with no changes.
    expect(git(work, "branch", "--show-current")).toBe("main");
    expect(git(work, "status", "--porcelain")).toBe("");
  });

  test("puts the repo URL, version, declared range, and the check's status and output in the body", async () => {
    const { work } = checkout();
    const checks: { status: number; output: string }[] = [];
    const check: CheckRunner = async (dir) => {
      const checked = await pnpmCheck(dir);
      checks.push(checked);
      return checked;
    };
    const { result, posts } = await twoStep(
      {
        ...indexRepo,
        ...passing(["alpha"]),
        [`POST ${PULLS}`]: { status: 201, json: { html_url: "https://github.com/example/index/pull/1" } },
      },
      work,
      check,
    );
    if (!result?.ok) throw new Error(JSON.stringify(result));
    expect(checks).toHaveLength(1);
    expect(checks[0]).toEqual({ status: 0, output: expect.stringMatching(/^checked 1 entries in \S+, 0 problems\n$/) });
    const sent = JSON.parse(posts[0].body!).body as string;
    expect(sent).toContain("- Repo: https://github.com/example/alpha");
    expect(sent).toContain("- Version: ` 1.0.0 `");
    expect(sent).toContain("- Declared Zotero range: strict_min_version ` 7.0 `, strict_max_version ` 8.* `");
    expect(sent).toContain("exited with status 0");
    expect(sent).toContain(`\`\`\`\n${checks[0].output}\`\`\``);
  });

  test("the body shows a failed check's status and output, and a range bound the manifest leaves out", () => {
    const output = "x@example.org: registry-schema: has ``` in it\nchecked 1 entries in /tmp/x, 1 problems\n";
    const sent = body(
      { repo: "example/x", repoUrl: "https://github.com/example/x", outcome: "written", id: "x@example.org", dir: "/tmp/x", version: "2.0", strictMinVersion: "7.0" },
      { status: 1, output },
    );
    expect(sent).toContain("strict_min_version ` 7.0 `, strict_max_version not declared");
    expect(sent).toContain("exited with status 1");
    expect(sent).toContain(`\`\`\`\`\n${output}\`\`\`\``);
  });

  test("the body keeps a manifest value with a blank line inside one code span", () => {
    const sent = body(
      { repo: "example/x", repoUrl: "https://github.com/example/x", outcome: "written", id: "x@example.org", dir: "/tmp/x", version: "2.0\n\n@someone" },
      { status: 0, output: "checked 1 entries in /tmp/x, 0 problems\n" },
    );
    expect(sent).toContain("- Version: ` 2.0 @someone `\n");
  });
});

describe("read and write step failures", () => {
  test("the read step refuses, without recording, a repo whose plugin id an open bot pull request adds", async () => {
    const { read, posts } = await twoStep({
      ...loadFixture(resolve(ROOT, "test/fixtures/discover/pulls.json")).responses,
      ...searched([["example/copy", "2026-10-01T00:00:00Z"]]),
      ...pluginRepo("example/copy", "Open-PR@example.org"),
    });
    if (!read.ok) throw new Error(read.message);
    expect(read.report.read).toEqual([
      expect.objectContaining({ repo: "example/copy", failure: "entry-exists", message: expect.stringContaining("open pull request") }),
    ]);
    expect(read.state).toEqual({});
    expect(posts).toEqual([]);
  });

  test("the read step ends before discovery reads when the pull-request list fails", async () => {
    const { read, requests } = await twoStep({
      ...indexRepo,
      ...passing(["alpha"]),
      [`${PULLS}?state=all&per_page=100`]: { status: 503, text: "unavailable" },
    });
    expect(read).toEqual({ ok: false, message: expect.stringContaining("returned HTTP 503") });
    expect(requests.some(({ url }) => url.includes("/search/"))).toBe(false);
  });

  test("the write step ends before any push when the repo record has no default branch", async () => {
    const { remote, work } = checkout();
    const { result, posts } = await twoStep(
      { ...indexRepo, ...passing(["alpha"]), [INDEX]: { json: { full_name: "example/index" } } },
      work,
    );
    expect(result).toEqual({ ok: false, message: expect.stringContaining("returned no default_branch") });
    expect(posts).toEqual([]);
    expect(git(remote, "for-each-ref", "refs/heads/discover")).toBe("");
  });

  test("names every entry as failed when the default branch cannot be fetched", async () => {
    // A directory that is not a git checkout.
    const { result, posts } = await twoStep({ ...indexRepo, ...passing(["alpha", "beta"]) });
    if (!result?.ok) throw new Error(JSON.stringify(result));
    expect(result.failed).toEqual([
      { repo: "example/beta", id: "beta@example.org", message: expect.stringMatching(/^git fetch failed: .*not a git repository/s) },
      { repo: "example/alpha", id: "alpha@example.org", message: expect.stringMatching(/^git fetch failed: .*not a git repository/s) },
    ]);
    expect(posts).toEqual([]);
  });

  test("names an entry as failed when the create request answers with a body that is not JSON", async () => {
    const { work } = checkout();
    const { result } = await twoStep({ ...indexRepo, ...passing(["alpha"]), [`POST ${PULLS}`]: { status: 201, text: "created" } }, work);
    if (!result?.ok) throw new Error(JSON.stringify(result));
    expect(result.failed).toEqual([
      { repo: "example/alpha", id: "alpha@example.org", message: `POST ${PULLS} returned a body that is not JSON` },
    ]);
  });
});

describe("the write step checks the index and the bot pull requests again", () => {
  test("skips, with no push or request, an entry whose repo an entry now names or whose id an open bot pull request now adds", async () => {
    const { remote, work } = checkout();
    const handoff = tempDir();
    for (const [repo, id] of [
      ["example/second-plugin", "new-id@example.org"],
      ["example/fresh", "open-pr@example.org"],
    ]) {
      mkdirSync(join(entriesDir(handoff), id), { recursive: true });
      for (const file of ["meta.json", "index.json"]) writeFileSync(join(entriesDir(handoff), id, file), `{"repo":"${repo}"}\n`);
    }
    const entries = [
      { repo: "example/second-plugin", repoUrl: "https://github.com/example/second-plugin", id: "new-id@example.org", version: "1.0" },
      { repo: "example/fresh", repoUrl: "https://github.com/example/fresh", id: "open-pr@example.org", version: "1.0" },
    ];
    const { fetch, requests } = fixtureFetch(loadFixture(resolve(ROOT, "test/fixtures/discover/pulls.json")).responses);
    const result = await proposeHandoff({
      root: resolve(ROOT, "test/fixtures/build/plugins"),
      fetch,
      indexRepo: "example/index",
      gitDir: work,
      check: pnpmCheck,
      entries: entries.map((entry): Written => ({ ...entry, outcome: "written", dir: join(entriesDir(handoff), entry.id) })),
    });
    expect(result).toEqual({
      ok: true,
      proposed: [],
      failed: [],
      skipped: [
        { repo: "example/second-plugin", id: "new-id@example.org", reason: "in-index" },
        { repo: "example/fresh", id: "open-pr@example.org", reason: "in-bot-pull" },
      ],
    });
    expect(requests.filter(({ method }) => method !== "GET")).toEqual([]);
    expect(git(remote, "for-each-ref", "refs/heads/discover")).toBe("");
  });
});

describe("the token", () => {
  test("reaches the push through git's environment, and no argument, config file, or check environment holds it", async () => {
    const token = "test-token-4f9c2a";
    const header = Buffer.from(`x-access-token:${token}`).toString("base64");
    const { remote, work } = checkout();
    // A git on PATH that logs each call's arguments and its config key, then runs git,
    // and a pnpm that logs its environment and passes the check.
    const shims = tempDir();
    const realGit = spawnSync("sh", ["-c", "command -v git"], { encoding: "utf8" }).stdout.trim();
    const gitLog = join(shims, "git.log");
    const envLog = join(shims, "env.log");
    writeFileSync(join(shims, "git"), `#!/bin/sh\necho "$* | key=$GIT_CONFIG_KEY_0" >> "${gitLog}"\nexec "${realGit}" "$@"\n`);
    writeFileSync(join(shims, "pnpm"), `#!/bin/sh\nenv > "${envLog}"\necho "checked 1 entries in x, 0 problems"\n`);
    chmodSync(join(shims, "git"), 0o755);
    chmodSync(join(shims, "pnpm"), 0o755);
    const saved = { PATH: process.env.PATH, npm_execpath: process.env.npm_execpath, GITHUB_TOKEN: process.env.GITHUB_TOKEN };
    Object.assign(process.env, { PATH: `${shims}:${process.env.PATH}`, npm_execpath: join(shims, "pnpm"), GITHUB_TOKEN: token });
    try {
      const { result } = await twoStep(
        { ...indexRepo, ...passing(["alpha"]), [`POST ${PULLS}`]: { status: 201, json: { html_url: "https://github.com/example/index/pull/1" } } },
        work,
        pnpmCheck,
      );
      if (!result?.ok) throw new Error(JSON.stringify(result));
      expect(result.proposed).toHaveLength(1);
    } finally {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
    expect(git(remote, "for-each-ref", "--format=%(refname)", "refs/heads/discover")).toBe("refs/heads/discover/example/alpha");
    const calls = readFileSync(gitLog, "utf8");
    expect(calls).toMatch(/^push --quiet --force origin \S+ \| key=http\.https:\/\/github\.com\/\.extraheader$/m);
    expect(calls).not.toContain(token);
    expect(calls).not.toContain(header);
    const config = git(work, "config", "--list", "--show-origin");
    expect(config).not.toContain(token);
    expect(config).not.toContain(header);
    const checkEnv = readFileSync(envLog, "utf8");
    expect(checkEnv).toContain(`PATH=${shims}`);
    expect(checkEnv).not.toContain(token);
  });
});

describe("pnpm propose failures", () => {
  test("goes on past a failed push and a refused request, then exits 1 naming both", () => {
    const { remote, work } = checkout();
    // The remote refuses the push of the first entry's branch.
    const hook = join(remote, "hooks/pre-receive");
    writeFileSync(
      hook,
      '#!/bin/sh\nwhile read old new ref; do\n  if [ "$ref" = refs/heads/discover/example/q3 ]; then echo "refused by the test hook" >&2; exit 1; fi\ndone\n',
    );
    chmodSync(hook, 0o755);
    const requestLog = join(tempDir(), "requests.jsonl");
    const responses: Responses = {
      ...indexRepo,
      ...passing(["q1", "q2", "q3"]),
      // q3 is never requested, so the first request is q2's and the second is q1's.
      [`POST ${PULLS} #1`]: {
        status: 422,
        json: { message: "Validation Failed", errors: [{ resource: "PullRequest", code: "custom", message: "A pull request already exists" }] },
      },
      [`POST ${PULLS} #2`]: { status: 201, json: { html_url: "https://github.com/example/index/pull/3" } },
    };
    const env = { GITHUB_REPOSITORY: "example/index", ZPI_REQUESTS: requestLog };
    const handoff = join(tempDir(), "handoff");
    expect(pnpm("discover", ["--handoff", handoff, "--state", join(tempDir(), "state.json")], responses, tempDir(), env).status).toBe(0);
    const result = pnpm("propose", [handoff], responses, work, env);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/- example\/q3 \(q3@example\.org\): git push failed: .*refused by the test hook/s);
    expect(result.stderr).toContain(
      `- example/q2 (q2@example.org): POST ${PULLS} returned HTTP 422: Validation Failed; A pull request already exists`,
    );
    const sent = logged(requestLog)
      .filter(({ method }) => method === "POST")
      .map(({ body }) => JSON.parse(body!).head);
    expect(sent).toEqual(["discover/example/q2", "discover/example/q1"]);
    expect(JSON.parse(result.stdout).proposed).toEqual([
      { repo: "example/q1", id: "q1@example.org", branch: "discover/example/q1", url: "https://github.com/example/index/pull/3" },
    ]);
  });

  test("exits 1 with no request when the read step left no handoff", () => {
    const requestLog = join(tempDir(), "requests.jsonl");
    writeFileSync(requestLog, "");
    const result = pnpm("propose", [join(tempDir(), "missing")], indexRepo, tempDir(), {
      GITHUB_REPOSITORY: "example/index",
      ZPI_REQUESTS: requestLog,
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("the read job left no plan.json");
    expect(readFileSync(requestLog, "utf8")).toBe("");
  });
});

// As in the discover tests, the preload answers the command's requests from `responses`.
function pnpm(script: string, args: string[], responses: Responses, cwd: string, env: Record<string, string> = {}) {
  const pnpmPath = process.env.npm_execpath;
  if (!pnpmPath) throw new Error("run the tests with `pnpm test`, so they can call pnpm");
  const fixture = join(tempDir(), "responses.json");
  writeFileSync(fixture, JSON.stringify({ source: "propose test", repoUrl: "", responses }));
  const { INIT_CWD: _outer, GITHUB_TOKEN: _token, GITHUB_REPOSITORY: _repo, ISSUE_NUMBER: _issue, ...outer } = process.env;
  Object.assign(outer, { ZPI_FIXTURE: fixture, NODE_OPTIONS: `--import=${PRELOAD}` }, env);
  return spawnSync(pnpmPath, ["--silent", "--dir", ROOT, script, ...args], { cwd, encoding: "utf8", env: outer, timeout: 50_000 });
}

describe("pnpm discover --handoff", () => {
  test("does not read a repo whose bot pull request is open or was closed without a merge", () => {
    const pushed = "2026-10-01T00:00:00Z";
    const responses: Responses = {
      ...loadFixture(resolve(ROOT, "test/fixtures/discover/pulls.json")).responses,
      ...searched([
        ["example/open-pr", pushed],
        ["example/closed-pr", pushed],
        ["example/merged-pr", pushed],
        ["example/fork-pr", pushed],
      ]),
      ...pluginRepo("example/open-pr", "open-pr@example.org"),
      ...pluginRepo("example/closed-pr", "closed-pr@example.org"),
      // These two have no release, so their reads write no entry and the plan is empty.
      ...pluginRepo("example/merged-pr", "merged-pr@example.org", { noRelease: true }),
      ...pluginRepo("example/fork-pr", "fork-pr@example.org", { noRelease: true }),
    };
    const cwd = tempDir();
    const result = pnpm("discover", ["--handoff", "handoff", "--state", "state.json"], responses, cwd, { GITHUB_REPOSITORY: "example/index" });
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.skipped).toEqual<SkippedItem[]>([
      { repo: "example/closed-pr", reason: "in-skip-set" },
      { repo: "example/open-pr", reason: "in-skip-set" },
    ]);
    expect(report.read.map((item: ReadItem) => item.repo).sort()).toEqual(["example/fork-pr", "example/merged-pr"]);
    expect(JSON.parse(readFileSync(join(cwd, "handoff/plan.json"), "utf8"))).toEqual({ kind: "discover", entries: [] });
  });

  test("prints the usage when GITHUB_REPOSITORY does not name a repo", () => {
    const result = pnpm("discover", ["--handoff", "handoff"], {}, tempDir(), { GITHUB_REPOSITORY: "example" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("--handoff needs GITHUB_REPOSITORY set to the index repo as <owner>/<repo>");
    expect(result.stdout).toBe("");
  });
});
