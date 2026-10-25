import { spawnSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Ajv } from "ajv";
import dns from "node:dns";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import pluginsSchema from "../schemas/plugins.v1.schema.json" with { type: "json" };
import { buildData, checkOutput, writeData } from "../src/build/build.ts";
import { fixtureFetch, loadFixture, type Responses } from "./support/fixture-fetch.ts";

const ROOT = resolve(import.meta.dirname, "..");
const TREE = resolve(ROOT, "test/fixtures/build/plugins");
const PRELOAD = resolve(ROOT, "test/support/preload-fixture.ts");
const BETTER_NOTES = "Knowledge4Zotero@windingwind.com";
const SECOND = "second-plugin@example.org";
const FORKED = "forked-plugin@example.org";

// buildData runs the reader's host check in this process, so each host resolves to one
// public address without DNS, as the preload does for the spawned commands.
vi.spyOn(dns.promises, "lookup").mockResolvedValue([{ address: "140.82.112.3", family: 4 }] as never);

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
function pnpmBuild(args: string[], fixture?: string) {
  const pnpmPath = process.env.npm_execpath;
  if (!pnpmPath) throw new Error("run the tests with `pnpm test`, so they can call pnpm");
  const { INIT_CWD: _outer, GITHUB_TOKEN: _token, ...env } = process.env;
  if (fixture) Object.assign(env, { ZPI_FIXTURE: fixture, NODE_OPTIONS: `--import=${PRELOAD}` });
  return spawnSync(pnpmPath, ["--silent", "--dir", ROOT, "build", ...args], { encoding: "utf8", env, timeout: 50_000 });
}

interface Output {
  plugins: { id: string; upstream?: Record<string, unknown>; failure?: { name: string; message: string }; overrides: unknown[] }[];
}

function readOutput(out: string): Output {
  return JSON.parse(readFileSync(join(out, "v1", "plugins.json"), "utf8"));
}

function record(output: Output, id: string) {
  return output.plugins.find((plugin) => plugin.id === id);
}

describe("pnpm build over the fixture tree", () => {
  // This run writes the default dist/, so a file already there is copied aside first and
  // put back afterward.
  const out = join(ROOT, "dist");
  const v1 = join(out, "v1");
  const file = join(v1, "plugins.json");
  let backup: string | undefined;
  let made: string | undefined;
  let result: ReturnType<typeof pnpmBuild>;
  beforeAll(() => {
    if (existsSync(file)) {
      backup = join(tempDir(), "plugins.json");
      copyFileSync(file, backup);
    }
    made = !existsSync(out) ? out : !existsSync(v1) ? v1 : undefined;
    result = pnpmBuild([TREE], writeFixture(responses()));
  }, 60_000);
  afterAll(() => {
    if (backup) copyFileSync(backup, file);
    else if (made) rmSync(made, { recursive: true, force: true });
    else rmSync(file, { force: true });
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

  test("keeps an override apart from the upstream value it corrects", () => {
    const plugin = record(readOutput(out), BETTER_NOTES);
    expect(plugin?.overrides).toEqual([
      { field: "strict_max_version", value: "9.*", reason: "A test override: the plugin fails to load on Zotero 10." },
    ]);
    expect(plugin?.upstream?.strictMaxVersion).toBe("10.99.99");
  });
});

describe("pnpm build", () => {
  test("names an error the reader does not expect unexpected-error and goes on", () => {
    // BETTER_NOTES is the first entry by name, so the other two are read after the error.
    const recorded = responses();
    recorded["https://api.github.com/repos/windingwind/zotero-better-notes"] = { unexpected: "planted reader error" };
    const out = tempDir();
    const result = pnpmBuild([TREE, "--out", out], writeFixture(recorded));
    expect(result.status).toBe(0);
    const output = readOutput(out);
    expect(output.plugins.map((plugin) => plugin.id).sort()).toEqual(readdirSync(TREE).sort());
    expect(output.plugins[0].id).toBe(BETTER_NOTES);
    expect(record(output, BETTER_NOTES)?.failure).toEqual({ name: "unexpected-error", message: "planted reader error" });
    expect(record(output, SECOND)?.upstream?.id).toBe(SECOND);
    expect(record(output, FORKED)?.failure?.name).toBe("fork");
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
});

describe("writeData", () => {
  test("reports a directory it cannot make", async () => {
    const blocker = join(tempDir(), "file");
    writeFileSync(blocker, "");
    expect(await writeData(join(blocker, "dist"), "{}\n")).toEqual({
      ok: false,
      message: expect.stringContaining("cannot write"),
    });
  });

  test("removes its temporary file when the file cannot be replaced", async () => {
    const out = tempDir();
    mkdirSync(join(out, "v1", "plugins.json", "taken"), { recursive: true });
    expect((await writeData(out, "{}\n")).ok).toBe(false);
    expect(readdirSync(join(out, "v1"))).toEqual(["plugins.json"]);
  });
});
