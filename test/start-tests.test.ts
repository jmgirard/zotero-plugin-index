import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterAll, afterEach, describe, expect, test, vi } from "vitest";
import type { StartPlanItem } from "../src/build/build.ts";
import { parsePlan, startTests, summaryLines } from "../src/start-test/start-tests.ts";
import { fixtureFetch, type Responses } from "./support/fixture-fetch.ts";
import { fixtureXpi } from "./support/start-fixtures.ts";

const ROOT = resolve(import.meta.dirname, "..");
const CLI = resolve(ROOT, "src/start-test/start-tests-cli.ts");
const PRELOAD = resolve(ROOT, "test/support/preload-fixture.ts");
const run = promisify(execFile);
const publicLookup = async () => ["140.82.112.3"];

const temps: string[] = [];
afterAll(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});
afterEach(() => {
  vi.restoreAllMocks();
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "zpi-start-tests-"));
  temps.push(dir);
  return dir;
}

// A stand-in for Zotero 10.0.6 for Linux. "report" marks the reporter started and reports a
// plugin that started; "silent" never marks it, so `pnpm start-test` fails. Each start's
// -profile path goes on a line of <dir>/starts.
function shim(mode: "report" | "silent"): { binary: string; starts: string } {
  const dir = tempDir();
  mkdirSync(join(dir, "app"));
  writeFileSync(join(dir, "app", "application.ini"), "[App]\nVendor=Zotero\nName=Zotero\nVersion=10.0.6\n");
  const starts = join(dir, "starts");
  writeFileSync(starts, "");
  const binary = join(dir, "zotero");
  const lines = ["#!/bin/sh", `echo "$3" >> '${starts}'`];
  if (mode === "report") {
    lines.push(`: > "$START_TEST_READY"`, `printf '%s' '{"found":true,"active":true,"startupError":false}' > "$START_TEST_REPORT"`);
  }
  lines.push("sleep 600");
  writeFileSync(binary, `${lines.join("\n")}\n`);
  chmodSync(binary, 0o755);
  return { binary, starts };
}

function startCount(starts: string): number {
  return readFileSync(starts, "utf8").split("\n").filter(Boolean).length;
}

// The started fixture of M046, served at each item's own URL.
const XPI = readFileSync(fixtureXpi("started", tempDir()));
const SHA256 = createHash("sha256").update(XPI).digest("hex");

function item(entry: string, range: Pick<StartPlanItem, "strictMinVersion" | "strictMaxVersion" | "carried">): StartPlanItem {
  return {
    entry,
    id: "started@start-test.invalid",
    version: "1.0.0",
    ...range,
    xpiUrl: `https://github.com/example/${entry}/releases/download/v1.0.0/plugin.xpi`,
    sha256: SHA256,
  };
}

function served(items: StartPlanItem[]): Responses {
  return Object.fromEntries(items.map(({ xpiUrl }) => [xpiUrl, { base64: XPI.toString("base64") }]));
}

const RANGES: [string, { strictMinVersion?: string; strictMaxVersion?: string }][] = [
  ["below", { strictMinVersion: "7.0", strictMaxVersion: "9.*" }],
  ["above", { strictMinVersion: "10.1", strictMaxVersion: "11.*" }],
  ["inside", { strictMinVersion: "7.0", strictMaxVersion: "10.99.99" }],
  ["no-min", { strictMaxVersion: "10.99.99" }],
  ["no-max", { strictMinVersion: "7.0" }],
  ["max-10-star", { strictMinVersion: "8.0", strictMaxVersion: "10.*" }],
  ["min-equal", { strictMinVersion: "10.0.6", strictMaxVersion: "10.99.99" }],
];

describe("startTests", () => {
  test("starts each item whose manifest range covers Zotero 10.0.6, and no other", async () => {
    const { binary, starts } = shim("report");
    const plan = { plugins: RANGES.map(([entry, range]) => item(entry, range)) };
    const outcome = await startTests({ plan, zotero: binary, fetch: fixtureFetch(served(plan.plugins)).fetch, lookup: publicLookup });
    const inRange = ["inside", "no-min", "no-max", "max-10-star", "min-equal"];
    expect(outcome.results).toEqual(
      inRange.map((entry) => ({ entry, id: "started@start-test.invalid", version: "1.0.0", zotero: "10.0.6", result: "started" })),
    );
    expect(outcome.outOfRange).toEqual(["below", "above"]);
    expect(outcome.skipped).toEqual([]);
    expect(startCount(starts)).toBe(inRange.length);
  });

  test("writes no result for an XPI whose SHA-256 differs from the plan, and does not start it", async () => {
    const { binary, starts } = shim("report");
    const changed = { ...item("changed", {}), sha256: "0".repeat(64) };
    const plan = { plugins: [changed, item("kept", {})] };
    const outcome = await startTests({ plan, zotero: binary, fetch: fixtureFetch(served(plan.plugins)).fetch, lookup: publicLookup });
    expect(outcome.results.map((result) => result.entry)).toEqual(["kept"]);
    expect(outcome.skipped).toEqual([
      { entry: "changed", reason: "hash-mismatch", message: `the XPI at ${changed.xpiUrl} has SHA-256 ${SHA256}, not ${"0".repeat(64)}` },
    ]);
    expect(startCount(starts)).toBe(1);
  });

  test("writes no result for a failed download or a host the reader's check refuses", async () => {
    const { binary, starts } = shim("report");
    const missing = item("missing", {});
    const local = { ...item("local", {}), xpiUrl: "http://127.0.0.1/plugin.xpi" };
    const plan = { plugins: [missing, local] };
    const recorded = { [missing.xpiUrl]: { status: 404, text: "Not Found" }, [local.xpiUrl]: { base64: XPI.toString("base64") } };
    const outcome = await startTests({ plan, zotero: binary, fetch: fixtureFetch(recorded).fetch, lookup: publicLookup });
    expect(outcome.results).toEqual([]);
    expect(outcome.skipped).toEqual([
      { entry: "missing", reason: "download-failed", message: `xpi-unreadable: the XPI at ${missing.xpiUrl} returned HTTP 404` },
      { entry: "local", reason: "download-failed", message: expect.stringMatching(/^host-refused: /) },
    ]);
    expect(startCount(starts)).toBe(0);
  });

  test("writes no result when pnpm start-test fails, here as reporter-not-started", async () => {
    const { binary } = shim("silent");
    const plan = { plugins: [item("silent", {})] };
    const outcome = await startTests({
      plan,
      zotero: binary,
      fetch: fixtureFetch(served(plan.plugins)).fetch,
      lookup: publicLookup,
      startLimitSeconds: 1,
    });
    expect(outcome.results).toEqual([]);
    expect(outcome.skipped).toEqual([{ entry: "silent", reason: "start-failed", message: expect.stringMatching(/^reporter-not-started: /) }]);
  });

  // A stand-in for `pnpm start-test` that exits 0 and leaves the --out file missing or writes
  // the given text to it.
  test.each([
    ["no result file", undefined, /^cannot read the result of pnpm start-test: /],
    ["a result of the wrong shape", JSON.stringify({ id: "x", version: "1", zotero: "10.0.6", result: "works" }), /^pnpm start-test wrote a result of the wrong shape$/],
  ])("writes no result when the start leaves %s", async (_name, text, message) => {
    const { binary } = shim("report");
    const cli = join(tempDir(), "start-test.mjs");
    const write = text === undefined ? "" : `fs.writeFileSync(out, ${JSON.stringify(text)});`;
    writeFileSync(cli, `import fs from "node:fs";\nconst out = process.argv[process.argv.indexOf("--out") + 1];\n${write}\n`);
    const plan = { plugins: [item("odd", {})] };
    const outcome = await startTests({ plan, zotero: binary, fetch: fixtureFetch(served(plan.plugins)).fetch, lookup: publicLookup, startTestCli: cli });
    expect(outcome.results).toEqual([]);
    expect(outcome.skipped).toEqual([{ entry: "odd", reason: "start-failed", message: expect.stringMatching(message) }]);
  });

  test("neither downloads nor starts an item that carries a result for the binary's version, and counts it as carried", async () => {
    const { binary, starts } = shim("report");
    const carried = item("carried", { carried: [{ zotero: "10.0.6", result: "started" }] });
    const other = item("other", { carried: [{ zotero: "9.0.6", result: "started" }] });
    const plan = { plugins: [carried, other] };
    const { fetch, requests } = fixtureFetch(served(plan.plugins));
    const outcome = await startTests({ plan, zotero: binary, fetch, lookup: publicLookup });
    expect(requests.map((request) => request.url)).toEqual([other.xpiUrl]);
    expect(outcome.results.map((result) => result.entry)).toEqual(["other"]);
    expect(outcome.carried).toEqual(["carried"]);
    expect(startCount(starts)).toBe(1);
    expect(summaryLines(outcome)).toEqual(["Zotero 10.0.6: 1 results, 0 without a result, 1 carried, 0 outside the manifest range"]);
  });

  test("counts a carried item as carried, not as not started, after the total limit", async () => {
    const { binary, starts } = shim("report");
    const plan = { plugins: [item("first", {}), item("carried", { carried: [{ zotero: "10.0.6", result: "started" }] }), item("third", {})] };
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    const outcome = await startTests({
      plan,
      zotero: binary,
      fetch: fixtureFetch(served(plan.plugins)).fetch,
      lookup: publicLookup,
      limitMs: 1000,
      onItem: () => (now = 1000),
    });
    expect(outcome.carried).toEqual(["carried"]);
    expect(outcome.notStarted).toEqual(["third"]);
    expect(startCount(starts)).toBe(1);
  });

  test("starts no new plugin after the total limit and keeps the results it has", async () => {
    const { binary, starts } = shim("report");
    const plan = { plugins: ["first", "second", "third"].map((entry) => item(entry, {})) };
    // The clock passes the limit once the first start is done.
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    const outcome = await startTests({
      plan,
      zotero: binary,
      fetch: fixtureFetch(served(plan.plugins)).fetch,
      lookup: publicLookup,
      limitMs: 1000,
      onItem: () => (now = 1000),
    });
    expect(outcome.results.map((result) => result.entry)).toEqual(["first"]);
    expect(outcome.notStarted).toEqual(["second", "third"]);
    expect(startCount(starts)).toBe(1);
    expect(summaryLines(outcome)).toEqual([
      "Zotero 10.0.6: 1 results, 0 without a result, 0 carried, 0 outside the manifest range",
      "::warning::2 plugins were not started after the limit of 20 minutes",
    ]);
  });
});

describe("parsePlan", () => {
  const planWith = (carried: unknown) => JSON.stringify({ plugins: [item("ok", {}), { ...item("a", {}), carried }] });

  test("takes an item with or without a carried list of started results", () => {
    const carried = [
      { zotero: "7.0.32", result: "started" },
      { zotero: "10.0.6", result: "started" },
    ];
    expect(parsePlan(planWith(carried))).toEqual({ ok: true, plan: JSON.parse(planWith(carried)) });
    expect(parsePlan(JSON.stringify({ plugins: [item("ok", {})] })).ok).toBe(true);
  });

  test.each([
    ["a carried value that is not a list", { zotero: "7.0.32", result: "started" }, "that is not a list"],
    ["an item that is not an object", [null], "whose item 0 has no string zotero"],
    ["an item with no string zotero", [{ zotero: 7, result: "started" }], "whose item 0 has no string zotero"],
    ["an item that is not started", [{ zotero: "7.0.32", result: "start-error" }], "whose item 0 is not a started result"],
    ["an item with no result", [{ zotero: "7.0.32" }], "whose item 0 is not a started result"],
    [
      "two items with one Zotero version",
      [
        { zotero: "7.0.32", result: "started" },
        { zotero: "7.0.32", result: "started" },
      ],
      "that names Zotero 7.0.32 twice",
    ],
  ])("refuses %s", (_name, carried, problem) => {
    expect(parsePlan(planWith(carried))).toEqual({ ok: false, problem: `plan item 1 has a carried list ${problem}` });
  });
});

describe("pnpm start-tests", () => {
  async function cli(args: string[], responses: Responses = {}) {
    const fixture = join(tempDir(), "responses.json");
    writeFileSync(fixture, JSON.stringify({ source: "start-tests test", repoUrl: "", responses }));
    const env = { ...process.env, ZPI_FIXTURE: fixture, NODE_OPTIONS: `--import=${PRELOAD}` };
    try {
      const { stdout, stderr } = await run(process.execPath, [CLI, ...args], { env });
      return { code: 0, stdout, stderr };
    } catch (error) {
      const failed = error as { code: number; stdout: string; stderr: string };
      return { code: failed.code, stdout: failed.stdout, stderr: failed.stderr };
    }
  }

  test("writes the results of the plan's starts as a JSON array", async () => {
    const { binary } = shim("report");
    const dir = tempDir();
    const plugins = [item("inside", {}), item("below", { strictMaxVersion: "9.*" })];
    writeFileSync(join(dir, "plan.json"), JSON.stringify({ plugins }));
    // The daily build names a directory that does not exist yet.
    const out = join(dir, "results", "start-results.json");
    const result = await cli(["--plan", join(dir, "plan.json"), "--zotero", binary, "--out", out], served(plugins));
    expect(result.stderr).toBe("");
    expect(result.code).toBe(0);
    expect(JSON.parse(readFileSync(out, "utf8"))).toEqual([
      { entry: "inside", id: "started@start-test.invalid", version: "1.0.0", zotero: "10.0.6", result: "started" },
    ]);
    expect(result.stdout).toContain("inside: started\n");
    expect(result.stdout).toContain("Zotero 10.0.6: 1 results, 0 without a result, 0 carried, 1 outside the manifest range\n");
    expect(result.stdout).not.toContain("::warning::");
  });

  // Each case writes no --out file.
  test.each([
    ["a plan item with no id", JSON.stringify({ plugins: [{ entry: "a" }] }), "plan-invalid: plan item 0 has no string id\n"],
    ["a bound that is not a string", JSON.stringify({ plugins: [{ ...item("a", {}), strictMaxVersion: 10 }] }), "plan-invalid: plan item 0 has no string strictMaxVersion\n"],
    ["a plan that is not JSON", "{", /^plan-invalid: the plan is not JSON: /],
    ["no plan file", undefined, /^plan-unreadable: cannot read .*plan\.json: ENOENT/],
  ])("exits 1 naming %s", async (_name, text, stderr) => {
    const { binary } = shim("report");
    const dir = tempDir();
    if (text !== undefined) writeFileSync(join(dir, "plan.json"), text);
    const result = await cli(["--plan", join(dir, "plan.json"), "--zotero", binary, "--out", join(dir, "out.json")]);
    expect(result.code).toBe(1);
    if (typeof stderr === "string") expect(result.stderr).toBe(stderr);
    else expect(result.stderr).toMatch(stderr);
    expect(existsSync(join(dir, "out.json"))).toBe(false);
  });

  test("exits 1 with zotero-version-unknown for a binary with no application.ini", async () => {
    const dir = tempDir();
    writeFileSync(join(dir, "plan.json"), JSON.stringify({ plugins: [] }));
    writeFileSync(join(dir, "zotero"), "#!/bin/sh\n");
    const result = await cli(["--plan", join(dir, "plan.json"), "--zotero", join(dir, "zotero"), "--out", join(dir, "out.json")]);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/^zotero-version-unknown: /);
    expect(existsSync(join(dir, "out.json"))).toBe(false);
  });

  test("prints the usage without --out", async () => {
    const result = await cli(["--plan", "plan.json", "--zotero", "zotero"]);
    expect(result.code).toBe(1);
    expect(result.stderr).toBe("usage: pnpm start-tests --plan <file> --zotero <binary> --out <file>\n");
  });
});
