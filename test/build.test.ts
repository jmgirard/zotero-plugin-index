import { spawnSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Ajv } from "ajv";
import dns from "node:dns";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import pluginsSchema from "../schemas/plugins.v1.schema.json" with { type: "json" };
import { buildData, checkOutput, INDEX_REPO, writeData } from "../src/build/build.ts";
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
  };
}

function writeFixture(recorded: Responses): string {
  const path = join(tempDir(), "responses.json");
  writeFileSync(path, JSON.stringify({ source: "build test", repoUrl: "", responses: recorded }));
  return path;
}

// pnpm sets npm_execpath to its own binary when it runs `pnpm test`. The preload makes
// the command answer its requests and host lookups from `fixture` instead of the network.
function pnpmBuild(args: string[], fixture?: string, extra: Record<string, string> = {}) {
  const pnpmPath = process.env.npm_execpath;
  if (!pnpmPath) throw new Error("run the tests with `pnpm test`, so they can call pnpm");
  const { INIT_CWD: _outer, GITHUB_TOKEN: _token, GITHUB_REPOSITORY: _repo, ...env } = process.env;
  if (fixture) Object.assign(env, { ZPI_FIXTURE: fixture, NODE_OPTIONS: `--import=${PRELOAD}` });
  Object.assign(env, extra);
  return spawnSync(pnpmPath, ["--silent", "--dir", ROOT, "build", ...args], { encoding: "utf8", env, timeout: 50_000 });
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
  test("reads every page of the closed report issues first and writes the counted reports", () => {
    const { result, out, urls } = loggedBuild(responses());
    expect(result.status).toBe(0);
    expect(urls.slice(0, 2)).toEqual([ISSUES, ISSUES_PAGE_2]);
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

  test("reads the report issues of the repo that GITHUB_REPOSITORY names", () => {
    const recorded = responses();
    recorded["https://api.github.com/repos/example/fork/issues?labels=report&state=closed&sort=created&direction=asc&per_page=100"] = { json: [] };
    const { result, urls } = loggedBuild(recorded, { GITHUB_REPOSITORY: "example/fork" });
    expect(result.status).toBe(0);
    expect(urls[0]).toBe("https://api.github.com/repos/example/fork/issues?labels=report&state=closed&sort=created&direction=asc&per_page=100");
    expect(urls.some((url) => url.startsWith(`https://api.github.com/repos/${INDEX_REPO}/`))).toBe(false);
  });

  test("reads the default repo's report issues when GITHUB_REPOSITORY is empty", () => {
    const { result, urls } = loggedBuild(responses(), { GITHUB_REPOSITORY: "" });
    expect(result.status).toBe(0);
    expect(urls[0]).toBe(ISSUES);
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
    expect(urls.every((u) => u.includes("/issues?"))).toBe(true);
  });
});

describe("pnpm build", () => {
  test("names an error the reader does not expect unexpected-error, goes on, and exits 1 when 2 of 3 records fail for build-level reasons and all 3 fail", () => {
    // BETTER_NOTES is the first entry by name, so the other two are read after the error.
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
    expect(result.stderr).toContain("usage: pnpm build [<dir>] [--out <dir>]");
  });
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
      const recorded = { ...mixedFailures(tree), [ISSUES]: { json: [] } };
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
    // Three entries, read in this order. The second one's XPI never answers.
    const NAMES = ["a-first", "b-stalled", "c-third"];
    const stalledXpi = "https://github.com/example/b-stalled/releases/download/v1.0.0/plugin.xpi";
    function stalledTree(): { tree: string; recorded: Responses } {
      const tree = tempDir();
      const recorded: Responses = { [ISSUES]: { json: [] } };
      for (const name of NAMES) {
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
      const limits = { readMs: 300, buildMs: 100, startedAt: performance.now() };
      const result = await buildData(tree, fetch, undefined, undefined, limits);
      if (!result.ok) throw new Error(result.problems.join("\n"));
      expect(failures(result.text)).toEqual([
        ["a-first@example.org", "facts"],
        ["b-stalled@example.org", "request-failed"],
        ["c-third@example.org", "not-read"],
      ]);
      expect(record(JSON.parse(result.text), "c-third@example.org")?.failure?.message).toContain("after 100 ms, its time limit");
      expect(result.buildLevel).toEqual(["b-stalled@example.org", "c-third@example.org"]);
      expect(requests.map((r) => r.url)).not.toContain("https://api.github.com/repos/example/c-third");
      expect(checkOutput(JSON.parse(result.text))).toEqual([]);
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
