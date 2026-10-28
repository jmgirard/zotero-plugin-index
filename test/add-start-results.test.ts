import { execFile } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterAll, describe, expect, test } from "vitest";
import { checkOutput, type PluginsFile, type StartPlan } from "../src/build/build.ts";
import { addResults, readResultsDir, RESULTS_MAX_BYTES } from "../src/start-test/add-results.ts";

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
    // A plan item whose record in the data failed, as when the plan and the data disagree.
    { entry: "gamma", id: "gamma@example.org", version: "1.0.0", xpiUrl: "https://x/g.xpi", sha256: "g" },
  ],
};

// The versions the tests' artifacts name.
const TESTED = ["7.0.32", "8.0.5", "9.0.6", "10.0.6"];

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
        { entry: "gamma", id: "gamma@example.org", version: "1.0.0", zotero: "10.0.6", result: "started" },
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
    const outcome = addResults(data(), PLAN, await readResultsDir(dir), TESTED);
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

  test("drops every result of an artifact whose name holds no tested version", async () => {
    const dir = resultsDir({ "other-artifact": [alpha("10.0.6")], "start-results-99": [alpha("99")] });
    const outcome = addResults(data(), PLAN, await readResultsDir(dir), TESTED);
    expect(outcome.dropped.map((drop) => [drop.file.split("/")[0], drop.reason])).toEqual([
      ["other-artifact", "untested-zotero"],
      ["start-results-99", "untested-zotero"],
    ]);
    expect(outcome.data.plugins[0].startTests).toBeUndefined();
  });

  // A root user can read a file with no permissions.
  test.skipIf(process.getuid?.() === 0)("drops as a bad file an entry that it cannot read", async () => {
    const dir = resultsDir({ "start-results-10.0.6": [alpha("10.0.6")] });
    chmodSync(join(dir, "start-results-10.0.6", "start-results.json"), 0o000);
    const outcome = addResults(data(), PLAN, await readResultsDir(dir), TESTED);
    expect(outcome.badFiles).toEqual([join("start-results-10.0.6", "start-results.json")]);
  });

  test("drops as a bad file an entry that is a directory, a link, or over the size limit, and keeps the rest", async () => {
    const dir = resultsDir({ "start-results-10.0.6": [alpha("10.0.6")] });
    mkdirSync(join(dir, "start-results-9.0.6", "start-results.json"), { recursive: true });
    mkdirSync(join(dir, "start-results-8.0.5"));
    symlinkSync(join(dir, "start-results-10.0.6", "start-results.json"), join(dir, "start-results-8.0.5", "start-results.json"));
    mkdirSync(join(dir, "start-results-7.0.32"));
    writeFileSync(join(dir, "start-results-7.0.32", "start-results.json"), `[${" ".repeat(RESULTS_MAX_BYTES)}]`);
    const outcome = addResults(data(), PLAN, await readResultsDir(dir), TESTED);
    expect(outcome.badFiles.map((file) => file.split("/")[0])).toEqual(["start-results-7.0.32", "start-results-8.0.5", "start-results-9.0.6"]);
    expect(outcome.data.plugins[0].startTests).toEqual([{ zotero: "10.0.6", result: "started" }]);
  });

  test("orders each record's results by Zotero version, and writes no empty list", async () => {
    // Read in artifact name order, 10.0.6 comes first, and a string sort would keep it there.
    const dir = resultsDir({
      "start-results-10.0.6": [alpha("10.0.6", "timed-out")],
      "start-results-7.0.32": [alpha("7.0.32", "not-installed")],
      "start-results-9.0.6": [alpha("9.0.6", "start-error"), beta("9.0.6")],
      "start-results-8.0.5": [alpha("8.0.5")],
    });
    const outcome = addResults(data(), PLAN, await readResultsDir(dir), TESTED);
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
    ["a zotero value that is not a version", [{ zotero: "10.0.6 started", result: "started" }], '/plugins/0/startTests/0/zotero must match pattern "^[0-9]+(\\.[0-9]+)*$"'],
  ])("rejects %s", (_name, startTests, problem) => {
    expect(checkOutput(withTests(startTests))).toContain(problem);
  });

  test("rejects startTests on a record with no upstream", () => {
    const file = data();
    Object.assign(file.plugins[2], { startTests: [{ zotero: "10.0.6", result: "started" }] });
    expect(checkOutput(JSON.parse(JSON.stringify(file)))).toContain("/plugins/2 must have property upstream when property startTests is present");
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
      "--tested",
      "7.0.32,10.0.6",
    ]);
    const written = JSON.parse(readFileSync(join(dir, "plugins.json"), "utf8"));
    expect(written.plugins.map((record: { startTests?: unknown }) => record.startTests)).toEqual([
      [{ zotero: "10.0.6", result: "started" }],
      undefined,
      undefined,
    ]);
    expect(Object.keys(written.plugins[0])).toEqual(["id", "repoUrl", "upstream", "reports", "startTests", "overrides"]);
    expect(stdout).toContain('dropped "start-results-10.0.6/start-results.json" item 1: zotero-out-of-range\n');
    expect(stdout).toContain('dropped "start-results-7.0.32/start-results.json": not a readable JSON array\n');
    expect(stdout).toContain("kept 1 start results; dropped 1 results and 1 files that are not a readable JSON array\n");
  });

  test("adds no results and exits 0 when the results directory is missing", async () => {
    const dir = tempDir();
    writeFileSync(join(dir, "plugins.json"), JSON.stringify(data()));
    writeFileSync(join(dir, "plan.json"), JSON.stringify(PLAN));
    const missing = join(dir, "results");
    const { stdout } = await run(process.execPath, addArgs(dir, missing));
    expect(stdout).toContain(`no results directory at ${missing}, so no start results are added\n`);
    expect(JSON.parse(readFileSync(join(dir, "plugins.json"), "utf8")).plugins.some((record: object) => "startTests" in record)).toBe(false);
  });

  // A record that the schema rejects: its upstream has no version.
  const invalid = data();
  delete (invalid.plugins[0].upstream as { version?: string }).version;

  test.each<[string, { plan?: string; text?: string; results?: string }, RegExp]>([
    ["the plan is not a plan", { plan: "[]" }, /^plan-invalid: the plan has no plugins list\n$/],
    ["the data has no plugins list", { text: "{}" }, /^\S+plugins\.json has no plugins list\n$/],
    ["the data is not JSON", { text: "{" }, /^cannot read the data or the plan: /],
    ["the schema rejects the new data", { text: JSON.stringify(invalid) }, /^the output \/plugins\/0\/upstream must have required property 'version'\n[\s\S]*wrote no file\n$/],
    ["the results path is a file", { results: "plugins.json" }, /^cannot read the results directory \S+plugins\.json: ENOTDIR/],
  ])("exits 1 and leaves the data file as it was when %s", async (_name, { plan = JSON.stringify(PLAN), text = JSON.stringify(data()), results }, stderr) => {
    const dir = tempDir();
    writeFileSync(join(dir, "plugins.json"), text);
    writeFileSync(join(dir, "plan.json"), plan);
    const failed = await fails(addArgs(dir, results ? join(dir, results) : dir));
    expect(failed.code).toBe(1);
    expect(failed.stderr).toMatch(stderr);
    expect(readFileSync(join(dir, "plugins.json"), "utf8")).toBe(text);
  });

  // A root user can write the read-only directory.
  test.skipIf(process.getuid?.() === 0)("exits 1 with write-failed and leaves the data file as it was when it cannot write", async () => {
    const dir = tempDir();
    const text = JSON.stringify(data());
    writeFileSync(join(dir, "plugins.json"), text);
    writeFileSync(join(dir, "plan.json"), JSON.stringify(PLAN));
    const results = resultsDir({ "start-results-10.0.6": [alpha("10.0.6")] });
    chmodSync(dir, 0o555);
    try {
      const failed = await fails(addArgs(dir, results));
      expect(failed.code).toBe(1);
      expect(failed.stderr).toMatch(/^write-failed: cannot write \S+plugins\.json: EACCES/);
    } finally {
      chmodSync(dir, 0o755);
    }
    expect(readFileSync(join(dir, "plugins.json"), "utf8")).toBe(text);
  });

  test.each([
    ["without --tested", ["--data", "d", "--plan", "p", "--results", "r"], "--tested <version>"],
    ["for a --tested list with an empty version", ["--data", "d", "--plan", "p", "--results", "r", "--tested", "7.0.32,,10.0.6"], "--tested must list Zotero versions"],
  ])("prints the usage %s", async (_name, args, message) => {
    const failed = await fails([CLI, ...args]);
    expect(failed).toMatchObject({ code: 1, stderr: expect.stringContaining(message) });
  });
});

// The exit code and stderr of a run that is meant to fail; a run that exits 0 gives code 0.
async function fails(args: string[]): Promise<{ code: number; stderr: string }> {
  try {
    const { stderr } = await run(process.execPath, args);
    return { code: 0, stderr };
  } catch (error) {
    return error as { code: number; stderr: string };
  }
}

function addArgs(dir: string, results: string): string[] {
  return [CLI, "--data", join(dir, "plugins.json"), "--plan", join(dir, "plan.json"), "--results", results, "--tested", TESTED.join(",")];
}
