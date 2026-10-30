import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Ajv } from "ajv";
import dns from "node:dns";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import pluginsSchema from "../schemas/plugins.v1.schema.json" with { type: "json" };
import { buildData, checkOutput, INDEX_REPO, writeData } from "../src/build/build.ts";
import { ZOTERO_RELEASE_URL } from "../src/build/zotero-release.ts";
import { fixtureFetch, loadFixture, type Recorded, type Responses } from "./support/fixture-fetch.ts";
import { DNS_FAIL_HOST, mixedFailures } from "./support/mixed-failures.ts";
import { pluginRepo } from "./support/plugin-repo.ts";

const ROOT = resolve(import.meta.dirname, "..");
const TREE = resolve(ROOT, "test/fixtures/build/plugins");
const PRELOAD = resolve(ROOT, "test/support/preload-fixture.ts");
const BETTER_NOTES = "Knowledge4Zotero@windingwind.com";
const SECOND = "second-plugin@example.org";
const FORKED = "forked-plugin@example.org";

// buildData runs the reader's host check in this process, so each host resolves to one
// public address without DNS, as the preload does for the spawned commands. The lookup of
// DNS_FAIL_HOST fails.
vi.spyOn(dns.promises, "lookup").mockImplementation((async (host: string) => {
  if (host === DNS_FAIL_HOST) throw new Error(`getaddrinfo ENOTFOUND ${host}`);
  return [{ address: "140.82.112.3", family: 4 }];
}) as never);

const temps: string[] = [];
afterAll(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "zpi-build-"));
  temps.push(dir);
  return dir;
}

// The recorded responses for every repo in TREE.
function responses(): Responses {
  return {
    ...loadFixture(resolve(ROOT, "test/fixtures/build/responses.json")).responses,
    ...loadFixture(resolve(ROOT, "test/fixtures/upstream/better-notes.json")).responses,
    [LABEL]: { json: { name: "report" } },
    [ZOTERO_RELEASE_URL]: { json: { mac: "10.0.7", "linux-x86_64": "10.0.7" } },
  };
}

function writeFixture(recorded: Responses): string {
  const path = join(tempDir(), "responses.json");
  writeFileSync(path, JSON.stringify({ source: "build test", repoUrl: "", responses: recorded }));
  return path;
}

// pnpm sets npm_execpath to its own binary when it runs `pnpm test`. The preload makes
// the command answer its requests and host lookups from `fixture` instead of the network.
function pnpmBuild(args: string[], fixture?: string, extra: Record<string, string> = {}, timeout = 50_000) {
  const pnpmPath = process.env.npm_execpath;
  if (!pnpmPath) throw new Error("run the tests with `pnpm test`, so they can call pnpm");
  const { INIT_CWD: _outer, GITHUB_TOKEN: _token, GITHUB_REPOSITORY: _repo, ...env } = process.env;
  if (fixture) Object.assign(env, { ZPI_FIXTURE: fixture, NODE_OPTIONS: `--import=${PRELOAD}` });
  Object.assign(env, extra);
  return spawnSync(pnpmPath, ["--silent", "--dir", ROOT, "build", ...args], { encoding: "utf8", env, timeout });
}

interface Output {
  plugins: {
    id: string;
    upstream?: Record<string, unknown>;
    reports?: unknown[];
    failure?: { name: string; message: string };
    overrides: unknown[];
  }[];
}

function readOutput(out: string): Output {
  return JSON.parse(readFileSync(join(out, "v1", "plugins.json"), "utf8"));
}

function record(output: Output, id: string) {
  return output.plugins.find((plugin) => plugin.id === id);
}

describe("pnpm build over the fixture tree", () => {
  // This run writes the default dist/, so the files already there are copied aside first
  // and put back afterward, and what the run added is removed.
  const out = join(ROOT, "dist");
  const files = ["v1/plugins.json", "schemas/plugins.v1.schema.json", "schemas/index.v1.schema.json"];
  const backups = new Map<string, string>();
  let made: string[] = [];
  let result: ReturnType<typeof pnpmBuild>;
  beforeAll(() => {
    for (const name of files) {
      if (!existsSync(join(out, name))) continue;
      const backup = join(tempDir(), name.replace("/", "-"));
      copyFileSync(join(out, name), backup);
      backups.set(name, backup);
    }
    made = [out, join(out, "v1"), join(out, "schemas")].filter((dir) => !existsSync(dir));
    result = pnpmBuild([TREE], writeFixture(responses()));
  }, 60_000);
  afterAll(() => {
    for (const name of files) {
      const backup = backups.get(name);
      if (backup) copyFileSync(backup, join(out, name));
      else rmSync(join(out, name), { force: true });
    }
    for (const dir of made.reverse()) rmSync(dir, { recursive: true, force: true });
  });

  test("writes dist/v1/plugins.json by default, valid against its schema, with one record per entry", () => {
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    const output = readOutput(out);
    const validate = new Ajv({ allErrors: true }).compile(pluginsSchema);
    expect(validate(output), JSON.stringify(validate.errors)).toBe(true);
    const entries = readdirSync(TREE);
    expect(entries).toHaveLength(3);
    expect(output.plugins.map((plugin) => plugin.id).sort()).toEqual(entries.sort());
  });

  test("exits 0, writes every record, and gives the failing entry the reader's failure name", () => {
    expect(result.status).toBe(0);
    const output = readOutput(out);
    expect(output.plugins.map((plugin) => plugin.id).sort()).toEqual(readdirSync(TREE).sort());
    expect(record(output, FORKED)).toEqual({
      id: FORKED,
      repoUrl: "https://github.com/example/forked-plugin",
      failure: { name: "fork", message: "example/forked-plugin is a fork" },
      overrides: [],
    });
    for (const id of [BETTER_NOTES, SECOND]) {
      expect(record(output, id)?.failure).toBeUndefined();
      expect(record(output, id)?.upstream?.id).toBe(id);
    }
  });

  test("writes the archived value that the reader read", () => {
    expect(record(readOutput(out), SECOND)?.upstream?.archived).toBe(true);
  });

  test("writes the prerelease value that the reader read", () => {
    const output = readOutput(out);
    expect([record(output, SECOND)?.upstream?.prerelease, record(output, BETTER_NOTES)?.upstream?.prerelease]).toEqual([
      true,
      false,
    ]);
  });

  test("keeps an override apart from the upstream value it corrects", () => {
    const plugin = record(readOutput(out), BETTER_NOTES);
    expect(plugin?.overrides).toEqual([
      { field: "strict_max_version", value: "9.*", reason: "A test override: the plugin fails to load on Zotero 10." },
    ]);
    expect(plugin?.upstream?.strictMaxVersion).toBe("10.99.99");
  });
});

function expectSchemaCopies(out: string) {
  for (const name of ["plugins.v1.schema.json", "index.v1.schema.json"]) {
    expect(readFileSync(join(out, "schemas", name))).toEqual(readFileSync(join(ROOT, "schemas", name)));
  }
}

// The lines from the first failure-name line through the build-level line.
function summary(stdout: string): string[] {
  const lines = stdout.trim().split("\n");
  const start = lines.findIndex((line) => line.startsWith("failed with ") || line.startsWith("build-level failures: "));
  const end = lines.findIndex((line) => line.startsWith("build-level failures: "));
  return lines.slice(start, end + 1);
}

// A copy of TREE with only the given entries.
function treeOf(...ids: string[]): string {
  const tree = tempDir();
  for (const id of ids) cpSync(join(TREE, id), join(tree, id), { recursive: true });
  return tree;
}

const SECOND_UPDATE = "https://raw.githubusercontent.com/example/second-plugin/main/update.json";
const ISSUES = `https://api.github.com/repos/${INDEX_REPO}/issues?labels=report&state=closed&sort=created&direction=asc&per_page=100`;
const ISSUES_PAGE_2 = `${ISSUES}&page=2`;
const LABEL = `https://api.github.com/repos/${INDEX_REPO}/labels/report`;
const reportRead = (url: string) => url === LABEL || url.includes("/issues?");

// Runs pnpm build over TREE against `recorded` and returns the result, the out directory,
// and the URL of each request in order.
function loggedBuild(recorded: Responses, extra: Record<string, string> = {}) {
  const out = tempDir();
  const log = join(tempDir(), "requests.jsonl");
  writeFileSync(log, "");
  const result = pnpmBuild([TREE, "--out", out], writeFixture(recorded), { ZPI_REQUESTS: log, ...extra });
  const urls = readFileSync(log, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => (JSON.parse(line) as { url: string }).url);
  return { result, out, urls };
}

describe("pnpm build and the report issues", () => {
  test("reads the report label, then every page of the closed report issues, first and writes the counted reports", () => {
    const { result, out, urls } = loggedBuild(responses());
    expect(result.status).toBe(0);
    expect(urls.slice(0, 3)).toEqual([LABEL, ISSUES, ISSUES_PAGE_2]);
    expect(urls.filter((url) => url.includes("/issues?"))).toHaveLength(2);
    const output = readOutput(out);
    const validate = new Ajv({ allErrors: true }).compile(pluginsSchema);
    expect(validate(output), JSON.stringify(validate.errors)).toBe(true);
    expect(record(output, BETTER_NOTES)?.reports).toEqual([
      { zoteroMajor: 7, works: 1, broken: 0 },
      { zoteroMajor: 8, works: 1, broken: 0 },
    ]);
    expect(record(output, SECOND)?.reports).toEqual([{ zoteroMajor: 7, works: 0, broken: 1 }]);
    expect(record(output, FORKED)).not.toHaveProperty("reports");
  });

  test("writes an empty reports list on each read record when no report counts", () => {
    const recorded = responses();
    recorded[ISSUES] = { json: [] };
    const { result, out } = loggedBuild(recorded);
    expect(result.status).toBe(0);
    const output = readOutput(out);
    expect([record(output, BETTER_NOTES)?.reports, record(output, SECOND)?.reports]).toEqual([[], []]);
  });

  test("reads the report label and issues of the repo that GITHUB_REPOSITORY names", () => {
    const recorded = responses();
    recorded["https://api.github.com/repos/example/fork/labels/report"] = { json: { name: "report" } };
    recorded["https://api.github.com/repos/example/fork/issues?labels=report&state=closed&sort=created&direction=asc&per_page=100"] = { json: [] };
    const { result, urls } = loggedBuild(recorded, { GITHUB_REPOSITORY: "example/fork" });
    expect(result.status).toBe(0);
    expect(urls.slice(0, 2)).toEqual([
      "https://api.github.com/repos/example/fork/labels/report",
      "https://api.github.com/repos/example/fork/issues?labels=report&state=closed&sort=created&direction=asc&per_page=100",
    ]);
    expect(urls.some((url) => url.startsWith(`https://api.github.com/repos/${INDEX_REPO}/`))).toBe(false);
  });

  test("reads the default repo's report issues when GITHUB_REPOSITORY is empty", () => {
    const { result, urls } = loggedBuild(responses(), { GITHUB_REPOSITORY: "" });
    expect(result.status).toBe(0);
    expect(urls.slice(0, 2)).toEqual([LABEL, ISSUES]);
  });

  test("prints the failure on one line, so the answer cannot start a workflow command", () => {
    const recorded = responses();
    recorded[ISSUES] = { text: "[\n::warning::planted" };
    const { result } = loggedBuild(recorded);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`cannot read the report issues: request-failed: GET ${ISSUES} returned a body that is not JSON`);
    expect(result.stderr.split("\n").filter((line) => line.startsWith("::"))).toEqual([]);
  });

  test.each([
    ["an HTTP 503 answer", ISSUES, { status: 503, text: "Service Unavailable" }, `github-http-error: GET ${ISSUES} returned HTTP 503`],
    ["a rejected fetch", ISSUES, { error: "connect ECONNRESET" }, `request-failed: GET ${ISSUES} failed: connect ECONNRESET`],
    ["a second page that fails", ISSUES_PAGE_2, { status: 502, text: "Bad Gateway" }, `github-http-error: GET ${ISSUES_PAGE_2} returned HTTP 502`],
    ["an answer that is not a list", ISSUES, { json: { message: "Not Found" } }, `request-failed: GET ${ISSUES} returned a body that is not a list`],
  ])("names the failure, writes no data file, and exits 1 for %s", (_, url, answer, failure) => {
    const recorded = responses();
    recorded[url] = answer as Recorded;
    const { result, out, urls } = loggedBuild(recorded);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`cannot read the report issues: ${failure}`);
    expect(existsSync(join(out, "v1", "plugins.json"))).toBe(false);
    expect(urls.every(reportRead)).toBe(true);
  });

  test.each([
    ["an HTTP 404 answer, as for a renamed or deleted label", { status: 404, text: '{"message":"Not Found"}' }, `github-http-error: GET ${LABEL} returned HTTP 404`],
    ["a rejected fetch", { error: "connect ECONNRESET" }, `request-failed: GET ${LABEL} failed: connect ECONNRESET`],
  ])("stops before the issue list when the label read gets %s", (_, answer, failure) => {
    const { result, out, urls } = loggedBuild({ ...responses(), [LABEL]: answer as Recorded });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`cannot read the report issues: ${failure}`);
    expect(existsSync(join(out, "v1", "plugins.json"))).toBe(false);
    expect(urls).toEqual([LABEL]);
  });

  // `recorded` with the issue list at `url` changed by `change`.
  function changedList(recorded: Responses, url: string, change: (items: Record<string, unknown>[]) => void): Responses {
    const items = structuredClone((recorded[url] as { json: Record<string, unknown>[] }).json);
    change(items);
    return { ...recorded, [url]: { ...recorded[url], json: items } };
  }

  test.each([
    ["the first item of the first page", ISSUES, (items: Record<string, unknown>[]) => delete items[0].closed_by, "issue #41"],
    ["an item of the second page", ISSUES_PAGE_2, (items: Record<string, unknown>[]) => delete items[1].closed_by, "issue #38"],
    [
      "an item with no numeric number after a valid item and before another such item",
      ISSUES,
      (items: Record<string, unknown>[]) => {
        delete items[1].closed_by;
        items[1].number = "40";
        items.push({ ...items[0], number: 42, closed_by: undefined });
      },
      "an issue",
    ],
  ])("stops before any plugin read when %s has no closed_by key", (_, url, change, which) => {
    const { result, out, urls } = loggedBuild(changedList(responses(), url, change));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`cannot read the report issues: ${which} in the list has no closed_by field`);
    expect(existsSync(join(out, "v1", "plugins.json"))).toBe(false);
    expect(urls.every(reportRead)).toBe(true);
  });

  test.each([
    ["an issue whose closed_by is null", (items: Record<string, unknown>[]) => (items[0].closed_by = null)],
    [
      "a pull request with no closed_by key",
      (items: Record<string, unknown>[]) => items.push({ number: 42, pull_request: { url: "https://api.github.com/x" } }),
    ],
    ["an item that is not an object", (items: Record<string, unknown>[]) => items.push(null as never, "x" as never, [] as never)],
  ])("builds when the list holds %s", (_, change) => {
    const { result, out } = loggedBuild(changedList(responses(), ISSUES, change));
    expect(result.stderr).not.toContain("cannot read the report issues");
    expect(result.status).toBe(0);
    expect(existsSync(join(out, "v1", "plugins.json"))).toBe(true);
  });
});

describe("pnpm build", () => {
  test("prints one line that names a failed read of the Zotero release, writes the data, and exits 0", () => {
    const { result, out } = loggedBuild({ ...responses(), [ZOTERO_RELEASE_URL]: { status: 500, text: "Internal Server Error" } });
    expect(result.status).toBe(0);
    expect(result.stdout.split("\n").filter((line) => line.includes("Zotero release"))).toEqual([
      `cannot read the Zotero release: GET ${ZOTERO_RELEASE_URL} returned HTTP 500`,
    ]);
    expect(readOutput(out)).not.toHaveProperty("zoteroRelease");
  });

  test("names an error the reader does not expect unexpected-error, goes on, and exits 1 when 2 of 3 records fail for build-level reasons and all 3 fail", () => {
    // BETTER_NOTES is the first entry by name, so the other two are read after the error on
    // an even UTC day and before it on an odd one.
    const recorded = responses();
    recorded["https://api.github.com/repos/windingwind/zotero-better-notes"] = { unexpected: "planted reader error" };
    recorded[SECOND_UPDATE] = { status: 503, text: "Service Unavailable" };
    const out = tempDir();
    const result = pnpmBuild([TREE, "--out", out], writeFixture(recorded));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("2 of 3 records carry a build-level failure, more than half");
    expect(result.stderr).toContain("all 3 records carry a failure");
    expect(summary(result.stdout)).toEqual([
      "failed with fork: 1",
      "failed with unexpected-error: 1",
      "failed with update-json-http-error: 1",
      "build-level failures: 2 of 3 records",
    ]);
    expect(result.stdout).toContain("\n::warning::2 of 3 records carry a build-level failure");
    expectSchemaCopies(out);
    const output = readOutput(out);
    expect(output.plugins.map((plugin) => plugin.id).sort()).toEqual(readdirSync(TREE).sort());
    expect(output.plugins[0].id).toBe(BETTER_NOTES);
    expect(record(output, BETTER_NOTES)?.failure).toEqual({ name: "unexpected-error", message: "planted reader error" });
    expect(record(output, SECOND)?.failure?.name).toBe("update-json-http-error");
    expect(record(output, FORKED)?.failure?.name).toBe("fork");
  });

  test("exits 0 and warns when exactly half of the records fail for build-level reasons", () => {
    const recorded = responses();
    recorded[SECOND_UPDATE] = { status: 503, text: "Service Unavailable" };
    const out = tempDir();
    const result = pnpmBuild([treeOf(BETTER_NOTES, SECOND), "--out", out], writeFixture(recorded));
    expect(result.status).toBe(0);
    expect(result.stderr).not.toContain("more than half");
    expect(summary(result.stdout)).toEqual(["failed with update-json-http-error: 1", "build-level failures: 1 of 2 records"]);
    expect(result.stdout).toContain("\n::warning::1 of 2 records carry a build-level failure");
    expectSchemaCopies(out);
  });

  test("exits 1 with no warning when every record fails for reasons that are not build-level", () => {
    const recorded = responses();
    delete recorded["https://api.github.com/repos/windingwind/zotero-better-notes"];
    delete (recorded["https://api.github.com/repos/example/second-plugin"].json as { created_at?: string }).created_at;
    const out = tempDir();
    const result = pnpmBuild([TREE, "--out", out], writeFixture(recorded));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("all 3 records carry a failure");
    expect(result.stderr).not.toContain("more than half");
    expect(summary(result.stdout)).toEqual([
      "failed with facts-invalid: 1",
      "failed with fork: 1",
      "failed with github-http-error: 1",
      "build-level failures: 0 of 3 records",
    ]);
    expect(result.stdout).not.toContain("::warning::");
    expect(readOutput(out).plugins.every((plugin) => plugin.failure)).toBe(true);
  });

  test("exits 0 while one record has no failure, though the others fail", () => {
    const recorded = responses();
    (recorded["https://api.github.com/repos/example/second-plugin"].json as { fork: boolean }).fork = true;
    const result = pnpmBuild([TREE, "--out", tempDir()], writeFixture(recorded));
    expect(result.status).toBe(0);
    expect(result.stderr).not.toContain("records carry a failure");
    expect(summary(result.stdout)).toEqual(["failed with fork: 2", "build-level failures: 0 of 3 records"]);
  });

  test("exits 1 when 2 of 3 records fail for build-level reasons and one has no failure", () => {
    // The copy has the same repo as SECOND, so both read the 503.
    const tree = treeOf(BETTER_NOTES, SECOND);
    cpSync(join(TREE, SECOND), join(tree, "second-copy@example.org"), { recursive: true });
    const recorded = responses();
    recorded[SECOND_UPDATE] = { status: 503, text: "Service Unavailable" };
    const result = pnpmBuild([tree, "--out", tempDir()], writeFixture(recorded));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("2 of 3 records carry a build-level failure, more than half");
    expect(result.stderr).not.toContain("records carry a failure");
    expect(summary(result.stdout)).toEqual(["failed with update-json-http-error: 2", "build-level failures: 2 of 3 records"]);
  });

  test("prints each failure message on one line, so upstream text cannot start a workflow command", () => {
    const recorded = responses();
    recorded["https://api.github.com/repos/windingwind/zotero-better-notes"] = { unexpected: "planted reader error" };
    const xpi = recorded["https://github.com/example/second-plugin/releases/download/v1.0.0/second-plugin.xpi"].xpi!;
    const manifest = xpi["manifest.json"] as { applications: { zotero: { update_url: string } } };
    manifest.applications.zotero.update_url = `${SECOND_UPDATE}\n::stop-commands::planted`;
    const result = pnpmBuild([TREE, "--out", tempDir()], writeFixture(recorded));
    expect(result.stdout).toContain(`${SECOND}: update-json-http-error: the update.json at ${SECOND_UPDATE} ::stop-commands::planted`);
    const commands = result.stdout.split("\n").filter((line) => line.startsWith("::"));
    expect(commands).toEqual(["::warning::1 of 3 records carry a build-level failure"]);
  });

  test("prints no warning when only a fork fails", () => {
    const result = pnpmBuild([TREE, "--out", tempDir()], writeFixture(responses()));
    expect(result.status).toBe(0);
    expect(summary(result.stdout)).toEqual(["failed with fork: 1", "build-level failures: 0 of 3 records"]);
    expect(result.stdout).not.toContain("::warning::");
  });

  test("prints the build-level line, no failure-name line, and no warning when no record fails", () => {
    const result = pnpmBuild([treeOf(BETTER_NOTES, SECOND), "--out", tempDir()], writeFixture(responses()));
    expect(result.status).toBe(0);
    const lines = result.stdout.trim().split("\n");
    expect(lines.slice(-2, -1)).toEqual(["build-level failures: 0 of 2 records"]);
    expect(lines.at(-1)).toMatch(/^wrote 2 records to /);
    expect(result.stdout).not.toContain("failed with ");
    expect(result.stdout).not.toContain("::warning::");
  });

  test("writes no file and exits 1 when an entry cannot be read", () => {
    const tree = tempDir();
    cpSync(TREE, tree, { recursive: true });
    writeFileSync(join(tree, SECOND, "meta.json"), "{");
    const out = tempDir();
    const result = pnpmBuild([tree, "--out", out], writeFixture(responses()));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`${SECOND}: meta.json is not valid JSON`);
    expect(existsSync(join(out, "v1"))).toBe(false);
  });

  test("prints the usage for --out with no directory", () => {
    const result = pnpmBuild(["--out"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("usage: pnpm build [<dir>] [--out <dir>] [--plan <file>]");
  });

  test.each([
    ["--plan with no file", [TREE, "--plan"]],
    ["a repeated --out", [TREE, "--out", "a", "--out", "b"]],
  ])("prints the usage for %s", (_name, args) => {
    const result = pnpmBuild(args);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("usage: pnpm build [<dir>] [--out <dir>] [--plan <file>]");
  });

  test("exits 1 naming the plan file it cannot write, after writing the data", () => {
    const dir = tempDir();
    // A file where the plan's directory would go.
    writeFileSync(join(dir, "blocked"), "");
    const result = pnpmBuild([TREE, "--out", join(dir, "out"), "--plan", join(dir, "blocked", "plan.json")], writeFixture(responses()));
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(new RegExp(`^write-failed: cannot write ${join(dir, "blocked", "plan.json")}: `, "m"));
    expect(existsSync(join(dir, "out", "v1", "plugins.json"))).toBe(true);
  });

  test("writes the start plan to the --plan file, and no plan without it", () => {
    const dir = tempDir();
    const out = join(dir, "out");
    const withPlan = pnpmBuild([TREE, "--out", out, "--plan", join(dir, "plan", "start-plan.json")], writeFixture(responses()));
    expect(withPlan.status).toBe(0);
    const plan = JSON.parse(readFileSync(join(dir, "plan", "start-plan.json"), "utf8"));
    // The fork has no upstream, so it has no item.
    expect(plan.plugins.map((item: { entry: string }) => item.entry)).toEqual([BETTER_NOTES, SECOND]);
    expect(withPlan.stdout).toContain(`wrote a start plan of 2 plugins to ${join(dir, "plan", "start-plan.json")}`);

    const bare = tempDir();
    const without = pnpmBuild([TREE, "--out", join(bare, "out")], writeFixture(responses()));
    expect(without.status).toBe(0);
    expect(readdirSync(bare, { recursive: true }).map(String).sort()).toEqual(
      ["out", "out/schemas", "out/schemas/index.v1.schema.json", "out/schemas/plugins.v1.schema.json", "out/v1", "out/v1/plugins.json"].map(
        (path) => join(...path.split("/")),
      ),
    );
    expect(without.stdout).not.toContain("start plan");
  });
});

describe("pnpm build with a timer still pending", () => {
  const PENDING = resolve(ROOT, "test/support/preload-pending-timer.ts");

  // The data file in `out` without its generatedAt, which is then removed so the next run
  // writes its own, or undefined when there is none.
  function takeData(out: string) {
    const path = join(out, "v1", "plugins.json");
    if (!existsSync(path)) return undefined;
    const { generatedAt: _, ...rest } = JSON.parse(readFileSync(path, "utf8"));
    rmSync(path);
    return rest;
  }

  // Builds `tree` twice into one --out, first as is, then with a 10-minute timer pending,
  // and returns both results, both data files, and the second run's time.
  function twoRuns(tree: string, recorded: Responses) {
    const fixture = writeFixture(recorded);
    const out = tempDir();
    const plain = pnpmBuild([tree, "--out", out], fixture);
    const plainData = takeData(out);
    const started = performance.now();
    const pending = pnpmBuild([tree, "--out", out], fixture, { NODE_OPTIONS: `--import=${PRELOAD} --import=${PENDING}` }, 40_000);
    return { plain, plainData, pending, pendingData: takeData(out), seconds: (performance.now() - started) / 1000 };
  }

  function expectSameRun({ plain, plainData, pending, pendingData, seconds }: ReturnType<typeof twoRuns>) {
    expect(pending.error).toBeUndefined();
    expect(seconds).toBeLessThan(30);
    expect(pending.status).toBe(plain.status);
    expect(pending.stdout).toBe(plain.stdout);
    expect(pendingData).toEqual(plainData);
  }

  test("exits with the same status, stdout, and data file after a build that writes the file", () => {
    const runs = twoRuns(TREE, responses());
    expect(runs.plain.status).toBe(0);
    expect(runs.plainData).toBeDefined();
    expectSameRun(runs);
  }, 120_000);

  test("exits with the same status and stdout after a build that writes no file", () => {
    const runs = twoRuns(TREE, { ...responses(), [LABEL]: { status: 404, text: '{"message":"Not Found"}' } });
    expect(runs.plain.status).toBe(1);
    expect(runs.plainData).toBeUndefined();
    expectSameRun(runs);
    expect(runs.pending.stderr).toBe(runs.plain.stderr);
  }, 120_000);

  test("writes the whole stdout of over 64 KiB before it exits", async () => {
    // Each entry's repo has no recorded answer, so its read fails with HTTP 404 and adds one
    // stdout line.
    const tree = tempDir();
    for (let i = 0; i < 1500; i++) {
      const id = `plugin-${String(i).padStart(4, "0")}@example.org`;
      mkdirSync(join(tree, id));
      writeFileSync(join(tree, id, "meta.json"), JSON.stringify({ id, repoUrl: `https://github.com/example/plugin-${i}` }));
      writeFileSync(join(tree, id, "index.json"), JSON.stringify({ schemaVersion: 1 }));
    }
    const fixture = writeFixture({ [LABEL]: { json: { name: "report" } }, [ISSUES]: { json: [] } });
    const out = tempDir();
    const plain = pnpmBuild([tree, "--out", out], fixture);
    expect(Buffer.byteLength(plain.stdout)).toBeGreaterThan(64 * 1024);
    expect(plain.stdout.trimEnd().split("\n").at(-1)).toMatch(/^wrote 1500 records to /);
    const plainData = takeData(out);
    expect(plainData?.plugins).toHaveLength(1500);

    // This run's stdout is not read for its first 2 seconds, so the pipe fills and the
    // command still holds unwritten output when it is done.
    const { INIT_CWD: _outer, GITHUB_TOKEN: _token, GITHUB_REPOSITORY: _repo, ...env } = process.env;
    Object.assign(env, { ZPI_FIXTURE: fixture, NODE_OPTIONS: `--import=${PRELOAD} --import=${PENDING}` });
    const started = performance.now();
    const child = spawn(process.env.npm_execpath!, ["--silent", "--dir", ROOT, "build", tree, "--out", out], { env });
    child.stdout.pause();
    setTimeout(() => child.stdout.resume(), 2000);
    let stdout = "";
    child.stdout.setEncoding("utf8").on("data", (text: string) => (stdout += text));
    const timer = setTimeout(() => child.kill("SIGKILL"), 40_000);
    const status = await new Promise<number | null>((done) => child.on("close", done));
    clearTimeout(timer);
    expect((performance.now() - started) / 1000).toBeLessThan(30);
    expect(status).toBe(plain.status);
    expect(stdout).toBe(plain.stdout);
    expect(takeData(out)).toEqual(plainData);
  }, 120_000);
});

describe("buildData", () => {
  const noFetch = () => Promise.reject(new Error("no request expected"));

  test("refuses a directory with no entries", async () => {
    expect(await buildData(join(tempDir(), "missing"), noFetch)).toEqual({
      ok: false,
      problems: [expect.stringContaining("no entries")],
    });
  });

  test("refuses an index.json that its schema rejects", async () => {
    const tree = tempDir();
    cpSync(TREE, tree, { recursive: true });
    writeFileSync(join(tree, SECOND, "index.json"), JSON.stringify({ schemaVersion: 1, overrides: [{ field: "name" }] }));
    expect(await buildData(tree, noFetch)).toEqual({
      ok: false,
      problems: [expect.stringContaining(`${SECOND}: index.json: /overrides/0 `)],
    });
  });

  test("refuses an entry directory it cannot read", async () => {
    const file = join(tempDir(), "file");
    writeFileSync(file, "");
    expect(await buildData(file, noFetch)).toEqual({ ok: false, problems: [expect.stringContaining(`cannot read ${file}`)] });
  });

  describe("over entries that fail in each way", () => {
    let result: Awaited<ReturnType<typeof buildData>>;
    beforeAll(async () => {
      const tree = tempDir();
      const recorded = { ...mixedFailures(tree), [LABEL]: { json: { name: "report" } }, [ISSUES]: { json: [] } };
      result = await buildData(tree, fixtureFetch(recorded).fetch, new Date("2026-10-26T00:00:00Z"));
    });

    test("names the records whose failure is build-level", () => {
      if (!result.ok) throw new Error(result.problems.join("\n"));
      expect(result.buildLevel).toEqual([
        "api-403@example.org",
        "api-body-error@example.org",
        "api-reject@example.org",
        "dns-fail@example.org",
        "unexpected@example.org",
        "update-503@example.org",
        "xpi-reject@example.org",
      ]);
    });

    test("writes the same file as before the build-level rule", () => {
      if (!result.ok) throw new Error(result.problems.join("\n"));
      expect(result.text).toBe(readFileSync(resolve(ROOT, "test/fixtures/build/mixed-failures.plugins.json"), "utf8"));
    });
  });

  test("plans each record with upstream, naming the manifest range and the URL and SHA-256 of the XPI bytes it read", async () => {
    // The fixture zips each XPI when it is requested, so the bytes are kept as they are served.
    const served = new Map<string, Uint8Array>();
    const { fetch } = fixtureFetch(responses());
    const capturing = async (url: string, init?: RequestInit) => {
      const response = await fetch(url, init);
      if (url.endsWith(".xpi")) served.set(url, new Uint8Array(await response.clone().arrayBuffer()));
      return response;
    };
    const result = await buildData(TREE, capturing);
    if (!result.ok) throw new Error(result.problems.join("\n"));
    const sha256 = (url: string) => createHash("sha256").update(served.get(url)!).digest("hex");
    const notesXpi = "https://github.com/windingwind/zotero-better-notes/releases/download/v3.3.3/better-notes-for-zotero.xpi";
    const secondXpi = "https://github.com/example/second-plugin/releases/download/v1.0.0/second-plugin.xpi";
    expect([...served.keys()].sort()).toEqual([secondXpi, notesXpi].sort());
    // The override of 9.* on BETTER_NOTES's strict_max_version stays out of the plan.
    expect(result.plan).toEqual({
      plugins: [
        {
          entry: BETTER_NOTES,
          id: BETTER_NOTES,
          version: "3.3.3",
          strictMinVersion: "8.0-beta.21",
          strictMaxVersion: "10.99.99",
          xpiUrl: notesXpi,
          sha256: sha256(notesXpi),
        },
        {
          entry: SECOND,
          id: SECOND,
          version: "1.0.0",
          strictMinVersion: "7.0",
          strictMaxVersion: "8.*",
          xpiUrl: secondXpi,
          sha256: sha256(secondXpi),
        },
      ],
    });
    const output: Output = JSON.parse(result.text);
    for (const item of result.plan.plugins) expect(record(output, item.entry)?.upstream?.xpiSha256, item.entry).toBe(item.sha256);
    expect(output.plugins.filter((plugin) => plugin.upstream).map((plugin) => plugin.id).sort()).toEqual(
      result.plan.plugins.map((item) => item.entry).sort(),
    );
  });

  test("the schema takes an upstream with or without an xpiSha256 of 64 lowercase hexadecimal characters and refuses another", async () => {
    const result = await buildData(TREE, fixtureFetch(responses()).fetch);
    if (!result.ok) throw new Error(result.problems.join("\n"));
    const data: Output = JSON.parse(result.text);
    const index = data.plugins.findIndex((plugin) => plugin.id === BETTER_NOTES);
    const upstream = data.plugins[index].upstream!;
    expect(checkOutput(data)).toEqual([]);
    delete upstream.xpiSha256;
    expect(checkOutput(data)).toEqual([]);
    const refused = `/plugins/${index}/upstream/xpiSha256 must match pattern "^[0-9a-f]{64}$"`;
    for (const value of ["A".repeat(64), "a".repeat(63), "a".repeat(65), `${"a".repeat(63)}g`]) {
      upstream.xpiSha256 = value;
      expect(checkOutput(data), value).toEqual([refused]);
    }
  });

  test("writes on each record with upstream the XPI address of its start plan item, on each of the reader's three release paths", async () => {
    // FALLBACK's stable release declares Zotero 6, so the reader reads its newer prerelease,
    // whose first .xpi asset is the one read.
    const FALLBACK = "fallback-plugin@example.org";
    const tree = treeOf(BETTER_NOTES, SECOND, FORKED);
    mkdirSync(join(tree, FALLBACK));
    writeFileSync(join(tree, FALLBACK, "meta.json"), JSON.stringify({ id: FALLBACK, name: "Fallback", repoUrl: "https://github.com/example/fallback-plugin" }));
    writeFileSync(join(tree, FALLBACK, "index.json"), JSON.stringify({ schemaVersion: 1 }));
    const recorded = { ...responses(), ...pluginRepo("example/fallback-plugin", FALLBACK) };
    const stableXpi = "https://github.com/example/fallback-plugin/releases/download/v1.0.0/plugin.xpi";
    const betaXpi = "https://github.com/example/fallback-plugin/releases/download/v2.0.0-beta.1/first.xpi";
    const laterXpi = "https://github.com/example/fallback-plugin/releases/download/v2.0.0-beta.1/second.xpi";
    const manifest = recorded[stableXpi].xpi!["manifest.json"] as { version: string; applications: { zotero: { strict_max_version: string } } };
    (recorded["https://api.github.com/repos/example/fallback-plugin/releases?per_page=100"].json as unknown[]).unshift({
      tag_name: "v2.0.0-beta.1",
      draft: false,
      prerelease: true,
      published_at: "2026-04-01T12:00:00Z",
      assets: [
        { name: "first.xpi", browser_download_url: betaXpi },
        { name: "second.xpi", browser_download_url: laterXpi },
      ],
    });
    recorded[betaXpi] = { xpi: { "manifest.json": { ...structuredClone(manifest), version: "2.0.0-beta.1" } } };
    manifest.applications.zotero.strict_max_version = "6.*";
    const result = await buildData(tree, fixtureFetch(recorded).fetch);
    if (!result.ok) throw new Error(result.problems.join("\n"));
    const output: Output = JSON.parse(result.text);
    const planned = new Map(result.plan.plugins.map((item) => [item.entry, item.xpiUrl]));
    const read = output.plugins.filter((plugin) => plugin.upstream);
    expect(read.map((plugin) => plugin.id).sort()).toEqual([BETTER_NOTES, FALLBACK, SECOND].sort());
    for (const plugin of read) expect(plugin.upstream?.xpiUrl, plugin.id).toBe(planned.get(plugin.id));
    expect([BETTER_NOTES, SECOND, FALLBACK].map((id) => record(output, id)?.upstream?.xpiUrl)).toEqual([
      "https://github.com/windingwind/zotero-better-notes/releases/download/v3.3.3/better-notes-for-zotero.xpi",
      "https://github.com/example/second-plugin/releases/download/v1.0.0/second-plugin.xpi",
      betaXpi,
    ]);
    expect(record(output, FALLBACK)?.upstream?.version).toBe("2.0.0-beta.1");
    expect(record(output, FORKED)).not.toHaveProperty("upstream");
  });

  test("the schema takes an upstream with or without a string xpiUrl and refuses one of another type", async () => {
    const result = await buildData(TREE, fixtureFetch(responses()).fetch);
    if (!result.ok) throw new Error(result.problems.join("\n"));
    const withUrl: Output = JSON.parse(result.text);
    const index = withUrl.plugins.findIndex((plugin) => plugin.id === BETTER_NOTES);
    expect(typeof withUrl.plugins[index].upstream!.xpiUrl).toBe("string");
    expect(checkOutput(withUrl)).toEqual([]);
    delete withUrl.plugins[index].upstream!.xpiUrl;
    expect(checkOutput(withUrl)).toEqual([]);
    withUrl.plugins[index].upstream!.xpiUrl = 1;
    expect(checkOutput(withUrl)).toEqual([`/plugins/${index}/upstream/xpiUrl must be string`]);
  });

  test("the schema takes an upstream with or without a repoDescription and refuses a blank one", async () => {
    const recorded = responses();
    (recorded["https://api.github.com/repos/windingwind/zotero-better-notes"].json as Record<string, unknown>).description = "Notes.";
    const result = await buildData(TREE, fixtureFetch(recorded).fetch);
    if (!result.ok) throw new Error(result.problems.join("\n"));
    const output: Output = JSON.parse(result.text);
    const index = output.plugins.findIndex((plugin) => plugin.id === BETTER_NOTES);
    expect(output.plugins[index].upstream!.repoDescription).toBe("Notes.");
    expect(checkOutput(output)).toEqual([]);
    delete output.plugins[index].upstream!.repoDescription;
    expect(checkOutput(output)).toEqual([]);
    output.plugins[index].upstream!.repoDescription = " ";
    expect(checkOutput(output)).toEqual([`/plugins/${index}/upstream/repoDescription must match pattern "\\S"`]);
  });

  test("writes the star count, and the schema takes an upstream with or without one and refuses -1 and 1.5", async () => {
    const recorded = responses();
    (recorded["https://api.github.com/repos/windingwind/zotero-better-notes"].json as Record<string, unknown>).stargazers_count = 8401;
    const result = await buildData(TREE, fixtureFetch(recorded).fetch);
    if (!result.ok) throw new Error(result.problems.join("\n"));
    const output: Output = JSON.parse(result.text);
    const index = output.plugins.findIndex((plugin) => plugin.id === BETTER_NOTES);
    expect(output.plugins[index].upstream!.stars).toBe(8401);
    expect(checkOutput(output)).toEqual([]);
    delete output.plugins[index].upstream!.stars;
    expect(checkOutput(output)).toEqual([]);
    output.plugins[index].upstream!.stars = -1;
    expect(checkOutput(output)).toEqual([`/plugins/${index}/upstream/stars must be >= 0`]);
    output.plugins[index].upstream!.stars = 1.5;
    expect(checkOutput(output)).toEqual([`/plugins/${index}/upstream/stars must be integer`]);
  });

  test("writes the reader's language list, with tags or empty, and the output passes the schema", async () => {
    const recorded = responses();
    const xpi = recorded["https://github.com/example/second-plugin/releases/download/v1.0.0/second-plugin.xpi"].xpi!;
    Object.assign(xpi, { "locale/zh-CN/a.ftl": "hello = 你好\n", "locale/en-US/a.ftl": "hello = Hello\n" });
    const result = await buildData(TREE, fixtureFetch(recorded).fetch);
    if (!result.ok) throw new Error(result.problems.join("\n"));
    const output: Output = JSON.parse(result.text);
    expect([record(output, SECOND)?.upstream?.languages, record(output, BETTER_NOTES)?.upstream?.languages]).toEqual([
      ["en-US", "zh-CN"],
      [],
    ]);
    expect(checkOutput(output)).toEqual([]);
  });

  describe("with time limits", () => {
    // The second entry's XPI never answers.
    const NAMES = ["a-first", "b-stalled", "c-third"];
    const stalledXpi = "https://github.com/example/b-stalled/releases/download/v1.0.0/plugin.xpi";
    // UTC days 20757 and 20758 since 1970-01-01.
    const ODD = new Date("2026-10-31T23:30Z");
    const EVEN = new Date("2026-11-01T00:30Z");
    function stalledTree(names = NAMES): { tree: string; recorded: Responses } {
      const tree = tempDir();
      const recorded: Responses = { [LABEL]: { json: { name: "report" } }, [ISSUES]: { json: [] } };
      for (const name of names) {
        const id = `${name}@example.org`;
        Object.assign(recorded, pluginRepo(`example/${name}`, id));
        mkdirSync(join(tree, id));
        writeFileSync(join(tree, id, "meta.json"), JSON.stringify({ id, name, repoUrl: `https://github.com/example/${name}` }));
        writeFileSync(join(tree, id, "index.json"), JSON.stringify({ schemaVersion: 1 }));
      }
      recorded[stalledXpi].stall = "headers";
      return { tree, recorded };
    }
    const failures = (text: string) =>
      (JSON.parse(text) as Output).plugins.map(({ id, upstream, failure }) => [id, upstream ? "facts" : failure!.name]);

    test("fails a read that passes its limit as request-failed and reads the next plugin", async () => {
      const { tree, recorded } = stalledTree();
      const result = await buildData(tree, fixtureFetch(recorded).fetch, undefined, undefined, { readMs: 200 });
      if (!result.ok) throw new Error(result.problems.join("\n"));
      expect(failures(result.text)).toEqual([
        ["a-first@example.org", "facts"],
        ["b-stalled@example.org", "request-failed"],
        ["c-third@example.org", "facts"],
      ]);
      expect(record(JSON.parse(result.text), "b-stalled@example.org")?.failure?.message).toContain("passed its time limit of 200 ms");
      expect(result.buildLevel).toEqual(["b-stalled@example.org"]);
    });

    test("reads no plugin once the build limit has passed, and fails each entry left as not-read", async () => {
      const { tree, recorded } = stalledTree();
      const { fetch, requests } = fixtureFetch(recorded);
      const limits = { readMs: 1500, buildMs: 1000, startedAt: performance.now() };
      const result = await buildData(tree, fetch, EVEN, undefined, limits);
      if (!result.ok) throw new Error(result.problems.join("\n"));
      expect(failures(result.text)).toEqual([
        ["a-first@example.org", "facts"],
        ["b-stalled@example.org", "request-failed"],
        ["c-third@example.org", "not-read"],
      ]);
      expect(record(JSON.parse(result.text), "c-third@example.org")?.failure?.message).toContain("after 1000 ms, its time limit");
      expect(result.buildLevel).toEqual(["b-stalled@example.org", "c-third@example.org"]);
      expect(requests.map((r) => r.url)).not.toContain("https://api.github.com/repos/example/c-third");
    });

    test.each([
      ["in reverse id order on an odd UTC day", ODD, ["c-third", "b-stalled", "a-first"]],
      ["in id order on an even UTC day", EVEN, ["a-first", "b-stalled", "c-third"]],
    ])("reads the plugins %s", async (_, now, order) => {
      const { tree, recorded } = stalledTree();
      const { fetch, requests } = fixtureFetch(recorded);
      const result = await buildData(tree, fetch, now, undefined, { readMs: 200 });
      if (!result.ok) throw new Error(result.problems.join("\n"));
      const repoReads = requests.map((r) => r.url).filter((url) => /^https:\/\/api\.github\.com\/repos\/example\/[^/]+$/.test(url));
      expect(repoReads).toEqual(order.map((name) => `https://api.github.com/repos/example/${name}`));
    });

    test("writes the records, the build-level list, and the start plan in id order on an odd UTC day that the build limit cuts", async () => {
      // Read last to first: d-fourth and c-third are read, then b-stalled's read passes the
      // build limit, so a-first is not read.
      const { tree, recorded } = stalledTree([...NAMES, "d-fourth"]);
      const limits = { readMs: 3000, buildMs: 2000, startedAt: performance.now() };
      const result = await buildData(tree, fixtureFetch(recorded).fetch, ODD, undefined, limits);
      if (!result.ok) throw new Error(result.problems.join("\n"));
      expect(failures(result.text)).toEqual([
        ["a-first@example.org", "not-read"],
        ["b-stalled@example.org", "request-failed"],
        ["c-third@example.org", "facts"],
        ["d-fourth@example.org", "facts"],
      ]);
      expect(result.buildLevel).toEqual(["a-first@example.org", "b-stalled@example.org"]);
      expect(result.plan.plugins.map((item) => item.entry)).toEqual(["c-third@example.org", "d-fourth@example.org"]);
    });

    test("names the default limit of 3 minutes in the failure of a read that passes it", async () => {
      const { tree, recorded } = stalledTree();
      let reached!: () => void;
      const stalled = new Promise<void>((resolve) => (reached = resolve));
      const { fetch } = fixtureFetch(recorded, (seen) => seen.url === stalledXpi && reached());
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      try {
        const pending = buildData(tree, fetch);
        // The clock moves only once the read waits on the stalled XPI.
        await stalled;
        await vi.advanceTimersByTimeAsync(3 * 60 * 1000);
        const result = await pending;
        if (!result.ok) throw new Error(result.problems.join("\n"));
        expect(record(JSON.parse(result.text), "b-stalled@example.org")?.failure).toEqual({
          name: "request-failed",
          message: expect.stringContaining("passed its time limit of 3 minutes"),
        });
      } finally {
        vi.useRealTimers();
      }
    });

    test.each([
      ["the label read stalls before its headers", LABEL, "headers", `GET ${LABEL} failed`],
      ["page 2 of the issues stalls before its headers", ISSUES_PAGE_2, "headers", `GET ${ISSUES_PAGE_2} failed`],
      ["page 2 of the issues stalls in its body", ISSUES_PAGE_2, "body", `GET ${ISSUES_PAGE_2} failed while reading the body`],
    ] as const)("stops the report read at its limit and reads no plugin when %s", async (_, url, stall, failed) => {
      const recorded = responses();
      recorded[url] = { ...recorded[url], stall };
      const { fetch, requests } = fixtureFetch(recorded);
      // The limit also covers the label and page 1 reads before page 2, so it leaves them room.
      const result = await buildData(TREE, fetch, undefined, undefined, { reportsMs: 1000 });
      expect(result).toEqual({
        ok: false,
        problems: [`cannot read the report issues: request-failed: ${failed}: the read passed its time limit of 1000 ms`],
      });
      expect(requests.map((r) => r.url).every(reportRead)).toBe(true);
      expect(requests.map((r) => r.url)).toContain(url);
    });

    test("names the default report read limit of 3 minutes", async () => {
      const recorded = responses();
      recorded[LABEL] = { ...recorded[LABEL], stall: "headers" };
      let reached!: () => void;
      const stalled = new Promise<void>((resolve) => (reached = resolve));
      const { fetch } = fixtureFetch(recorded, (seen) => seen.url === LABEL && reached());
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      try {
        const pending = buildData(TREE, fetch);
        await stalled;
        await vi.advanceTimersByTimeAsync(3 * 60 * 1000);
        expect(await pending).toEqual({
          ok: false,
          problems: [`cannot read the report issues: request-failed: GET ${LABEL} failed: the read passed its time limit of 3 minutes`],
        });
      } finally {
        vi.useRealTimers();
      }
    });
  });

  test("records facts that the schema rejects as facts-invalid and goes on", async () => {
    const recorded = responses();
    const repo = recorded["https://api.github.com/repos/example/second-plugin"].json as Record<string, unknown>;
    delete repo.created_at;
    const result = await buildData(TREE, fixtureFetch(recorded).fetch);
    if (!result.ok) throw new Error(result.problems.join("\n"));
    const output: Output = JSON.parse(result.text);
    expect(record(output, SECOND)).toEqual({
      id: SECOND,
      repoUrl: "https://github.com/example/second-plugin",
      failure: { name: "facts-invalid", message: expect.stringContaining("repoCreatedAt") },
      overrides: [],
    });
    expect(record(output, BETTER_NOTES)?.upstream?.id).toBe(BETTER_NOTES);
    expect(result.buildLevel).toEqual([]);
  });

  describe("and the current Zotero release", () => {
    test("writes the linux-x86_64 value as zoteroRelease and sends no token to zotero.org", async () => {
      vi.stubEnv("GITHUB_TOKEN", "planted-token");
      try {
        const { fetch, requests } = fixtureFetch(responses());
        const result = await buildData(TREE, fetch);
        if (!result.ok) throw new Error(result.problems.join("\n"));
        expect(JSON.parse(result.text).zoteroRelease).toBe("10.0.7");
        expect(result.releaseProblem).toBeUndefined();
        const release = requests.filter((r) => r.url === ZOTERO_RELEASE_URL);
        expect(release).toHaveLength(1);
        expect(release[0].headers.has("authorization")).toBe(false);
        // The token was set, so the GitHub reads carry it.
        expect(requests.find((r) => r.url === LABEL)?.headers.get("authorization")).toBe("Bearer planted-token");
      } finally {
        vi.unstubAllEnvs();
      }
    });

    test.each([
      ["a 500 answer", { status: 500, text: "Internal Server Error" }, "returned HTTP 500"],
      ["a thrown request", { error: "getaddrinfo ENOTFOUND www.zotero.org" }, "failed: getaddrinfo ENOTFOUND www.zotero.org"],
      ["an answer that passes the limit", { stall: "headers" }, "failed: the read passed its time limit of 100 ms"],
      ["a body that is not JSON", { text: "<html>" }, "returned a body that is not JSON"],
      ["no linux-x86_64 key", { json: { mac: "10.0.7" } }, "returned no linux-x86_64 value"],
      ["a beta version", { json: { "linux-x86_64": "10.0.7-beta" } }, 'returned the linux-x86_64 value "10.0.7-beta", which is not a release version'],
    ])("writes no zoteroRelease, names the cause, and still builds for %s", async (_, answer, cause) => {
      const recorded = { ...responses(), [ZOTERO_RELEASE_URL]: answer as Recorded };
      const result = await buildData(TREE, fixtureFetch(recorded).fetch, undefined, undefined, { releaseMs: 100 });
      if (!result.ok) throw new Error(result.problems.join("\n"));
      expect(JSON.parse(result.text)).not.toHaveProperty("zoteroRelease");
      expect(result.releaseProblem).toBe(`GET ${ZOTERO_RELEASE_URL} ${cause}`);
      expect(result.buildLevel).toEqual([]);
      expect(checkOutput(JSON.parse(result.text))).toEqual([]);
    });
  });
});

describe("checkOutput", () => {
  const facts = {
    id: SECOND,
    version: "1.0.0",
    updateUrl: "https://example.org/update.json",
    updateHost: "example.org",
    repoUrl: "https://github.com/example/second-plugin",
    repoCreatedAt: "2025-01-10T09:00:00Z",
    openIssues: 0,
    releaseCount: 1,
    latestReleaseDate: "2026-03-01T12:00:00Z",
  };
  const file = (plugin: object) => ({ schemaVersion: 1, generatedAt: "2026-10-25T06:00:00.000Z", plugins: [plugin] });
  const base = { id: SECOND, repoUrl: facts.repoUrl, overrides: [] };

  test("passes a record with upstream facts", () => {
    expect(checkOutput(file({ ...base, upstream: facts }))).toEqual([]);
  });

  test("reports a record that holds both upstream facts and a failure", () => {
    const problems = checkOutput(file({ ...base, upstream: facts, failure: { name: "fork", message: "" } }));
    expect(problems.some((problem) => problem.startsWith("/plugins/0 "))).toBe(true);
  });

  test("reports a record whose archived value is not a boolean", () => {
    const problems = checkOutput(file({ ...base, upstream: { ...facts, archived: "true" } }));
    expect(problems.some((problem) => problem.startsWith("/plugins/0/upstream/archived "))).toBe(true);
  });

  test("passes a record with report counts", () => {
    expect(checkOutput(file({ ...base, upstream: facts, reports: [{ zoteroMajor: 7, works: 0, broken: 2 }] }))).toEqual([]);
  });

  test.each([
    ["a Zotero major below 7", { zoteroMajor: 6, works: 1, broken: 0 }, "/zoteroMajor "],
    ["a Zotero major that is not an integer", { zoteroMajor: 7.5, works: 1, broken: 0 }, "/zoteroMajor "],
    ["a negative works count", { zoteroMajor: 7, works: -1, broken: 0 }, "/works "],
    ["a broken count that is not an integer", { zoteroMajor: 7, works: 0, broken: "1" }, "/broken "],
    ["no broken count", { zoteroMajor: 7, works: 1 }, " must have required property 'broken'"],
    ["another field", { zoteroMajor: 7, works: 1, broken: 0, account: 1 }, " must NOT have additional properties"],
  ])("reports a report count with %s", (_, count, problem) => {
    const problems = checkOutput(file({ ...base, upstream: facts, reports: [count] }));
    expect(problems.some((p) => p.startsWith("/plugins/0/reports/0") && p.includes(problem))).toBe(true);
  });

  test("reports a record whose prerelease value is not a boolean", () => {
    const problems = checkOutput(file({ ...base, upstream: { ...facts, prerelease: "true" } }));
    expect(problems.some((problem) => problem.startsWith("/plugins/0/upstream/prerelease "))).toBe(true);
  });
});

describe("writeData", () => {
  test("reports a directory it cannot make", async () => {
    const blocker = join(tempDir(), "file");
    writeFileSync(blocker, "");
    expect(await writeData(join(blocker, "dist"), "{}\n")).toEqual({
      ok: false,
      message: expect.stringContaining(`cannot write ${join(blocker, "dist", "schemas", "plugins.v1.schema.json")}`),
    });
  });

  test("reports a data directory it cannot make after the schemas are written", async () => {
    const out = tempDir();
    writeFileSync(join(out, "v1"), "");
    expect(await writeData(out, "{}\n")).toEqual({
      ok: false,
      message: expect.stringContaining(`cannot write ${join(out, "v1", "plugins.json")}`),
    });
    expect(readdirSync(join(out, "schemas")).sort()).toEqual(["index.v1.schema.json", "plugins.v1.schema.json"]);
  });

  test("removes its temporary schema file when the schema cannot be replaced", async () => {
    const out = tempDir();
    mkdirSync(join(out, "schemas", "plugins.v1.schema.json", "taken"), { recursive: true });
    expect(await writeData(out, "{}\n")).toEqual({
      ok: false,
      message: expect.stringContaining(`cannot write ${join(out, "schemas", "plugins.v1.schema.json")}`),
    });
    expect(readdirSync(join(out, "schemas"))).toEqual(["plugins.v1.schema.json"]);
    expect(existsSync(join(out, "v1"))).toBe(false);
  });

  test("removes its temporary file when the file cannot be replaced", async () => {
    const out = tempDir();
    mkdirSync(join(out, "v1", "plugins.json", "taken"), { recursive: true });
    expect((await writeData(out, "{}\n")).ok).toBe(false);
    expect(readdirSync(join(out, "v1"))).toEqual(["plugins.json"]);
  });
});
