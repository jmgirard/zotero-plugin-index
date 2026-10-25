import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Ajv } from "ajv";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import pluginsSchema from "../schemas/plugins.v1.schema.json" with { type: "json" };
import { buildData, checkOutput, writeData } from "../src/build/build.ts";
import { loadFixture, type Responses } from "./support/fixture-fetch.ts";

const ROOT = resolve(import.meta.dirname, "..");
const TREE = resolve("test/fixtures/build/plugins");
const PRELOAD = resolve("test/support/preload-fixture.ts");
const BETTER_NOTES = "Knowledge4Zotero@windingwind.com";
const SECOND = "second-plugin@example.org";
const FORKED = "forked-plugin@example.org";

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
    ...loadFixture("test/fixtures/build/responses.json").responses,
    ...loadFixture("test/fixtures/upstream/better-notes.json").responses,
  };
}

function writeFixture(recorded: Responses): string {
  const path = join(tempDir(), "responses.json");
  writeFileSync(path, JSON.stringify({ source: "build test", repoUrl: "", responses: recorded }));
  return path;
}

// pnpm sets npm_execpath to its own binary when it runs `pnpm test`. The preload makes
// the command answer its requests from `fixture` instead of the network.
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
  let out: string;
  let result: ReturnType<typeof pnpmBuild>;
  beforeAll(() => {
    out = tempDir();
    result = pnpmBuild([TREE, "--out", out], writeFixture(responses()));
  });

  test("writes dist/v1/plugins.json, valid against its schema, with one record per entry", () => {
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    const output = readOutput(out);
    const validate = new Ajv({ allErrors: true }).compile(pluginsSchema);
    expect(validate(output), JSON.stringify(validate.errors)).toBe(true);
    const entries = readdirSync(TREE);
    expect(entries).toHaveLength(3);
    expect(output.plugins.map((plugin) => plugin.id).sort()).toEqual(entries.sort());
  });

  test("exits 0 and gives the failing entry the reader's failure name", () => {
    expect(result.status).toBe(0);
    const output = readOutput(out);
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
    const recorded = responses();
    recorded["https://api.github.com/repos/example/second-plugin"] = { unexpected: "planted reader error" };
    const out = tempDir();
    const result = pnpmBuild([TREE, "--out", out], writeFixture(recorded));
    expect(result.status).toBe(0);
    const output = readOutput(out);
    expect(output.plugins.map((plugin) => plugin.id).sort()).toEqual(readdirSync(TREE).sort());
    expect(record(output, SECOND)?.failure).toEqual({ name: "unexpected-error", message: "planted reader error" });
    expect(record(output, BETTER_NOTES)?.upstream).toBeDefined();
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
      problems: [expect.stringMatching(new RegExp(`^${SECOND}: index.json: /overrides/0 must have required property`))],
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
    expect(problems).toContain("/plugins/0 must match exactly one schema in oneOf");
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
});
