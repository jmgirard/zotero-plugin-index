import { execFile } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { zipSync } from "fflate";
import { afterAll, describe, expect, test } from "vitest";
import { fixtureXpi } from "./support/start-fixtures.ts";

const ROOT = resolve(import.meta.dirname, "..");
const CLI = resolve(ROOT, "src/start-test/cli.ts");
const run = promisify(execFile);

const temps: string[] = [];
afterAll(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "zpi-start-test-"));
  temps.push(dir);
  return dir;
}

// A stand-in for the Zotero binary, with the app/application.ini that Linux Zotero has. It
// records its own pid, its child's pid, and the -profile path in <dir>/seen.json, then acts
// by its mode: "report" writes the given report and keeps running, "hang" never reports,
// and "exit" exits at once. "report" and "hang" start a child that sleeps for 10 minutes.
type ShimMode = { mode: "report"; report: object } | { mode: "hang" } | { mode: "exit" };

function shim(mode: ShimMode): { binary: string; seen: string } {
  const dir = tempDir();
  mkdirSync(join(dir, "app"));
  writeFileSync(join(dir, "app", "application.ini"), "[App]\nVendor=Zotero\nName=Zotero\nVersion=10.0.6\n");
  const seen = join(dir, "seen.json");
  const binary = join(dir, "zotero");
  writeFileSync(
    binary,
    `#!/usr/bin/env node
const { spawn } = require("node:child_process");
const { writeFileSync } = require("node:fs");
const mode = ${JSON.stringify(mode)};
if (mode.mode === "exit") process.exit(0);
const child = spawn("sleep", ["600"], { stdio: "ignore" });
const profile = process.argv[process.argv.indexOf("-profile") + 1];
writeFileSync(${JSON.stringify(seen)}, JSON.stringify({ pids: [process.pid, child.pid], profile }));
if (mode.mode === "report") writeFileSync(process.env.START_TEST_REPORT, JSON.stringify(mode.report));
setInterval(() => {}, 1000);
`,
  );
  chmodSync(binary, 0o755);
  return { binary, seen };
}

interface CliRun {
  code: number;
  stdout: string;
  stderr: string;
  out: string;
}

async function startTestCli(args: { zotero: string; xpi: string; limit?: number }): Promise<CliRun> {
  const out = join(tempDir(), "result.json");
  const argv = [CLI, "--zotero", args.zotero, "--xpi", args.xpi, "--out", out];
  if (args.limit !== undefined) argv.push("--limit", String(args.limit));
  try {
    const { stdout, stderr } = await run(process.execPath, argv);
    return { code: 0, stdout, stderr, out };
  } catch (error) {
    const failed = error as { code: number; stdout: string; stderr: string };
    return { code: failed.code, stdout: failed.stdout, stderr: failed.stderr, out };
  }
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// A killed process stays until its parent reaps it, so wait up to 5 s for each to go.
async function expectGone(pids: number[]): Promise<void> {
  for (let i = 0; i < 50 && pids.some(alive); i++) await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  expect(pids.filter(alive)).toEqual([]);
}

describe("pnpm start-test", () => {
  test.each([
    ["started", { found: true, active: true, startupError: false }],
    ["start-error", { found: true, active: true, startupError: true }],
    ["not-installed", { found: true, active: false, startupError: false }],
    ["not-installed", { found: false, active: false, startupError: false }],
  ])("writes %s for the report %j", async (result, report) => {
    const { binary } = shim({ mode: "report", report });
    const xpi = fixtureXpi("started", tempDir());
    const cli = await startTestCli({ zotero: binary, xpi });
    expect(cli.code).toBe(0);
    expect(JSON.parse(readFileSync(cli.out, "utf8"))).toEqual({ id: "started@start-test.invalid", version: "1.0.0", zotero: "10.0.6", result });
  });

  test("writes timed-out, and leaves no process of the group and no temp directory, when no report comes", async () => {
    const { binary, seen } = shim({ mode: "hang" });
    const cli = await startTestCli({ zotero: binary, xpi: fixtureXpi("started", tempDir()), limit: 2 });
    expect(cli.code).toBe(0);
    expect(JSON.parse(readFileSync(cli.out, "utf8")).result).toBe("timed-out");
    const { pids, profile } = JSON.parse(readFileSync(seen, "utf8"));
    await expectGone(pids);
    expect(existsSync(resolve(profile, ".."))).toBe(false);
  });

  test("leaves no process of the group and no temp directory after a report", async () => {
    const { binary, seen } = shim({ mode: "report", report: { found: true, active: true, startupError: false } });
    const cli = await startTestCli({ zotero: binary, xpi: fixtureXpi("started", tempDir()) });
    expect(JSON.parse(readFileSync(cli.out, "utf8")).result).toBe("started");
    const { pids, profile } = JSON.parse(readFileSync(seen, "utf8"));
    await expectGone(pids);
    expect(existsSync(resolve(profile, ".."))).toBe(false);
  });

  // Each named failure exits 1, prints its name, and writes no --out file.
  async function expectFailure(args: { zotero: string; xpi: string }, failure: string): Promise<void> {
    const cli = await startTestCli(args);
    expect(cli.code).toBe(1);
    expect(cli.stderr).toMatch(new RegExp(`^${failure}: `));
    expect(existsSync(cli.out)).toBe(false);
  }

  test("fails zotero-missing when the binary does not exist", async () => {
    await expectFailure({ zotero: join(tempDir(), "zotero"), xpi: fixtureXpi("started", tempDir()) }, "zotero-missing");
  });

  test("fails zotero-version-unknown when no application.ini names a version", async () => {
    const { binary } = shim({ mode: "exit" });
    rmSync(join(binary, "..", "app"), { recursive: true });
    await expectFailure({ zotero: binary, xpi: fixtureXpi("started", tempDir()) }, "zotero-version-unknown");
  });

  test("fails xpi-unreadable when the XPI is not a zip", async () => {
    const xpi = join(tempDir(), "plugin.xpi");
    writeFileSync(xpi, "not a zip");
    await expectFailure({ zotero: shim({ mode: "exit" }).binary, xpi }, "xpi-unreadable");
  });

  test("fails no-manifest when the XPI holds no manifest.json", async () => {
    const xpi = join(tempDir(), "plugin.xpi");
    writeFileSync(xpi, zipSync({ "bootstrap.js": new TextEncoder().encode("") }));
    await expectFailure({ zotero: shim({ mode: "exit" }).binary, xpi }, "no-manifest");
  });

  test("fails no-zotero-id when the manifest has no applications.zotero.id", async () => {
    const xpi = join(tempDir(), "plugin.xpi");
    writeFileSync(xpi, zipSync({ "manifest.json": new TextEncoder().encode(JSON.stringify({ version: "1.0.0", applications: { gecko: { id: "a@b" } } })) }));
    await expectFailure({ zotero: shim({ mode: "exit" }).binary, xpi }, "no-zotero-id");
  });

  test("fails zotero-exited when Zotero exits with no report", async () => {
    await expectFailure({ zotero: shim({ mode: "exit" }).binary, xpi: fixtureXpi("started", tempDir()) }, "zotero-exited");
  });
});
