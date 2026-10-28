import { execFile } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterAll, describe, expect, test } from "vitest";
import { checkOutput, type PluginsFile, type StartPlan } from "../src/build/build.ts";
import { addResults, readResultsDir } from "../src/start-test/add-results.ts";

const ROOT = resolve(import.meta.dirname, "..");
const CLI = resolve(ROOT, "src/start-test/add-results-cli.ts");
const run = promisify(execFile);

const temps: string[] = [];
afterAll(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "zpi-add-results-"));
  temps.push(dir);
  return dir;
}

function upstream(id: string, version: string) {
  return {
    id,
    version,
    updateUrl: `https://example.org/${id}/update.json`,
    updateHost: "example.org",
    repoUrl: `https://github.com/example/${id}`,
    repoCreatedAt: "2026-01-01T00:00:00Z",
    openIssues: 0,
    releaseCount: 1,
    latestReleaseDate: "2026-10-01T00:00:00Z",
  };
}

// Two read plugins and one whose read failed.
function data(): PluginsFile {
  return {
    schemaVersion: 1,
    generatedAt: "2026-10-28T06:17:00.000Z",
    plugins: [
      { id: "alpha", repoUrl: "https://github.com/example/alpha", upstream: upstream("alpha@example.org", "1.0.0"), reports: [], overrides: [] },
      { id: "beta", repoUrl: "https://github.com/example/beta", upstream: upstream("beta@example.org", "2.0.0"), reports: [], overrides: [] },
      { id: "gamma", repoUrl: "https://github.com/example/gamma", failure: { name: "fork", message: "a fork" }, overrides: [] },
    ],
  };
}

const PLAN: StartPlan = {
  plugins: [
    { entry: "alpha", id: "alpha@example.org", version: "1.0.0", strictMinVersion: "7.0", xpiUrl: "https://x/a.xpi", sha256: "a" },
    {
      entry: "beta",
      id: "beta@example.org",
      version: "2.0.0",
      strictMinVersion: "7.0",
      strictMaxVersion: "8.*",
      xpiUrl: "https://x/b.xpi",
      sha256: "b",
    },
  ],
};

const alpha = (zotero: string, result = "started") => ({ entry: "alpha", id: "alpha@example.org", version: "1.0.0", zotero, result });
const beta = (zotero: string, result = "started") => ({ entry: "beta", id: "beta@example.org", version: "2.0.0", zotero, result });

// Writes each artifact's results file, as download-artifact lays them out, and returns the
// directory. A string is written as given.
function resultsDir(artifacts: Record<string, unknown>): string {
  const dir = tempDir();
  for (const [name, content] of Object.entries(artifacts)) {
    mkdirSync(join(dir, name));
    writeFileSync(join(dir, name, "start-results.json"), typeof content === "string" ? content : JSON.stringify(content));
  }
  return dir;
}

describe("addResults", () => {
  test("keeps a matching result and drops each result that fails a check, naming why", async () => {
    const dir = resultsDir({
      "start-results-10.0.6": [
        alpha("10.0.6"),
        { ...beta("10.0.6"), version: "1.9.0" },
        { ...beta("10.0.6"), id: "other@example.org" },
        { ...beta("10.0.6"), entry: "missing" },
        { ...alpha("10.0.6"), entry: "gamma" },
        alpha("10.0.6", "works"),
        beta("9.0.6"),
        "started",
      ],
      // In the artifact name's version, but outside beta's range of 7.0 to 8.*.
      "start-results-9.0.6": [beta("9.0.6")],
      // Two results for alpha in 7.0.32, and one for beta.
      "start-results-7.0.32": [alpha("7.0.32"), alpha("7.0.32", "start-error"), beta("7.0.32")],
      "start-results-8.0.5": "{ not json",
    });
    const outcome = addResults(data(), PLAN, await readResultsDir(dir));
    const file = (version: string) => join(`start-results-${version}`, "start-results.json");
    expect(outcome.dropped).toEqual([
      { file: file("10.0.6"), index: 1, reason: "version-mismatch" },
      { file: file("10.0.6"), index: 2, reason: "id-mismatch" },
      { file: file("10.0.6"), index: 3, reason: "unknown-entry" },
      { file: file("10.0.6"), index: 4, reason: "unknown-entry" },
      { file: file("10.0.6"), index: 5, reason: "bad-result" },
      { file: file("10.0.6"), index: 6, reason: "zotero-not-artifact" },
      { file: file("10.0.6"), index: 7, reason: "not-an-object" },
      { file: file("9.0.6"), index: 0, reason: "zotero-out-of-range" },
      { file: file("7.0.32"), index: 0, reason: "duplicate" },
      { file: file("7.0.32"), index: 1, reason: "duplicate" },
    ]);
    expect(outcome.badFiles).toEqual([file("8.0.5")]);
    expect(outcome.kept).toBe(2);
    expect(outcome.data.plugins.map((record) => record.startTests)).toEqual([
      [{ zotero: "10.0.6", result: "started" }],
      [{ zotero: "7.0.32", result: "started" }],
      undefined,
    ]);
  });

  test("drops every result of a directory whose name holds no Zotero version", async () => {
    const dir = resultsDir({ "other-artifact": [alpha("10.0.6")] });
    const outcome = addResults(data(), PLAN, await readResultsDir(dir));
    expect(outcome.dropped.map((drop) => drop.reason)).toEqual(["zotero-not-artifact"]);
    expect(outcome.data.plugins[0].startTests).toBeUndefined();
  });

  test("orders each record's results by Zotero version, and writes no empty list", async () => {
    // Read in artifact name order, 10.0.6 comes first, and a string sort would keep it there.
    const dir = resultsDir({
      "start-results-10.0.6": [alpha("10.0.6", "timed-out")],
      "start-results-7.0.32": [alpha("7.0.32", "not-installed")],
      "start-results-9.0.6": [alpha("9.0.6", "start-error"), beta("9.0.6")],
      "start-results-8.0.5": [alpha("8.0.5")],
    });
    const outcome = addResults(data(), PLAN, await readResultsDir(dir));
    expect(outcome.data.plugins[0].startTests).toEqual([
      { zotero: "7.0.32", result: "not-installed" },
      { zotero: "8.0.5", result: "started" },
      { zotero: "9.0.6", result: "start-error" },
      { zotero: "10.0.6", result: "timed-out" },
    ]);
    expect(Object.hasOwn(outcome.data.plugins[1], "startTests")).toBe(false);
    expect(checkOutput(JSON.parse(JSON.stringify(outcome.data)))).toEqual([]);
  });
});

describe("the startTests schema", () => {
  const withTests = (startTests: unknown) => {
    const file = data();
    Object.assign(file.plugins[0], { startTests });
    return JSON.parse(JSON.stringify(file));
  };

  test.each([
    ["an empty list", [], "/plugins/0/startTests must NOT have fewer than 1 items"],
    ["an unknown result", [{ zotero: "10.0.6", result: "works" }], "/plugins/0/startTests/0/result must be equal to one of the allowed values"],
    ["an extra field", [{ zotero: "10.0.6", result: "started", log: "x" }], "/plugins/0/startTests/0 must NOT have additional properties"],
  ])("rejects %s", (_name, startTests, problem) => {
    expect(checkOutput(withTests(startTests))).toContain(problem);
  });
});

describe("pnpm add-start-results", () => {
  test("writes the kept results into the data file and prints how many it dropped", async () => {
    const dir = tempDir();
    writeFileSync(join(dir, "plugins.json"), JSON.stringify(data()));
    writeFileSync(join(dir, "plan.json"), JSON.stringify(PLAN));
    const results = resultsDir({ "start-results-10.0.6": [alpha("10.0.6"), beta("10.0.6")], "start-results-7.0.32": "{" });
    const { stdout } = await run(process.execPath, [
      CLI,
      "--data",
      join(dir, "plugins.json"),
      "--plan",
      join(dir, "plan.json"),
      "--results",
      results,
    ]);
    const written = JSON.parse(readFileSync(join(dir, "plugins.json"), "utf8"));
    expect(written.plugins.map((record: { startTests?: unknown }) => record.startTests)).toEqual([
      [{ zotero: "10.0.6", result: "started" }],
      undefined,
      undefined,
    ]);
    expect(Object.keys(written.plugins[0])).toEqual(["id", "repoUrl", "upstream", "reports", "startTests", "overrides"]);
    expect(stdout).toContain('dropped "start-results-10.0.6/start-results.json" item 1: zotero-out-of-range\n');
    expect(stdout).toContain('dropped "start-results-7.0.32/start-results.json": not a JSON array\n');
    expect(stdout).toContain("kept 1 start results; dropped 1 results and 1 files that are not a JSON array\n");
  });

  test("exits 1 and leaves the data file as it was when the plan is not a plan", async () => {
    const dir = tempDir();
    const text = JSON.stringify(data());
    writeFileSync(join(dir, "plugins.json"), text);
    writeFileSync(join(dir, "plan.json"), "[]");
    const failed = await run(process.execPath, [CLI, "--data", join(dir, "plugins.json"), "--plan", join(dir, "plan.json"), "--results", dir]).catch(
      (error) => error as { code: number; stderr: string },
    );
    expect(failed).toMatchObject({ code: 1, stderr: "plan-invalid: the plan has no plugins list\n" });
    expect(readFileSync(join(dir, "plugins.json"), "utf8")).toBe(text);
  });
});
