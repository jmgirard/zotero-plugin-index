import { execFile } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, truncateSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { zipSync } from "fflate";
import { afterAll, describe, expect, test } from "vitest";
import { XPI_MAX_BYTES } from "../src/upstream/reader.ts";
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
// by its mode: "report" marks the reporter started, writes the given report, and keeps
// running; "hang" marks the reporter started and never reports; "silent" never marks it;
// and "exit" exits at once. All but "exit" start a child that sleeps for 10 minutes.
// A sh script, since it starts in milliseconds even on a loaded machine.
type ShimMode = { mode: "report"; report: object } | { mode: "hang" } | { mode: "silent" } | { mode: "exit" };

function shim(mode: ShimMode): { binary: string; seen: string } {
  const dir = tempDir();
  mkdirSync(join(dir, "app"));
  writeFileSync(join(dir, "app", "application.ini"), "[App]\nVendor=Zotero\nName=Zotero\nVersion=10.0.6\n");
  const seen = join(dir, "seen.json");
  const binary = join(dir, "zotero");
  const quote = (text: string) => `'${text.replaceAll("'", "'\\''")}'`;
  const lines = ["#!/bin/sh"];
  if (mode.mode === "exit") lines.push("exit 0");
  else {
    // The command passes -no-remote -profile <dir>, so the profile is $3.
    lines.push("sleep 600 &", `printf '{"pids":[%s,%s],"profile":"%s"}' "$$" "$!" "$3" > ${quote(seen)}`);
    if (mode.mode !== "silent") lines.push(`: > "$START_TEST_READY"`);
    if (mode.mode === "report") lines.push(`printf '%s' ${quote(JSON.stringify(mode.report))} > "$START_TEST_REPORT"`);
    lines.push("wait");
  }
  writeFileSync(binary, `${lines.join("\n")}\n`);
  chmodSync(binary, 0o755);
  return { binary, seen };
}

interface CliRun {
  code: number;
  stdout: string;
  stderr: string;
  out: string;
}

async function startTestCli(args: { zotero?: string; xpi?: string; limit?: string }): Promise<CliRun> {
  const out = join(tempDir(), "result.json");
  const argv = [CLI, "--out", out];
  if (args.zotero !== undefined) argv.push("--zotero", args.zotero);
  if (args.xpi !== undefined) argv.push("--xpi", args.xpi);
  if (args.limit !== undefined) argv.push("--limit", args.limit);
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

function manifestXpi(manifest: object | string, extra: Record<string, Uint8Array> = {}): string {
  const xpi = join(tempDir(), "plugin.xpi");
  const text = typeof manifest === "string" ? manifest : JSON.stringify(manifest);
  writeFileSync(xpi, zipSync({ "manifest.json": new TextEncoder().encode(text), ...extra }));
  return xpi;
}

describe("pnpm start-test", () => {
  test.each([
    ["started", { found: true, active: true, startupError: false }],
    ["start-error", { found: true, active: true, startupError: true }],
    ["not-installed", { found: true, active: false, startupError: false }],
  ])("writes %s for the report %j", async (result, report) => {
    const { binary } = shim({ mode: "report", report });
    const xpi = fixtureXpi("started", tempDir());
    const cli = await startTestCli({ zotero: binary, xpi });
    expect(cli.code).toBe(0);
    expect(JSON.parse(readFileSync(cli.out, "utf8"))).toEqual({ id: "started@start-test.invalid", version: "1.0.0", zotero: "10.0.6", result });
  });

  test("writes timed-out, and leaves no process of the group and no temp directory, when the reporter started and no report comes", async () => {
    const { binary, seen } = shim({ mode: "hang" });
    const cli = await startTestCli({ zotero: binary, xpi: fixtureXpi("started", tempDir()), limit: "5" });
    expect(cli.code).toBe(0);
    expect(JSON.parse(readFileSync(cli.out, "utf8")).result).toBe("timed-out");
    const { pids, profile } = JSON.parse(readFileSync(seen, "utf8"));
    await expectGone(pids);
    expect(existsSync(resolve(profile, ".."))).toBe(false);
  });

  test("leaves no process of the group and no temp directory after a report", async () => {
    const { binary, seen } = shim({ mode: "report", report: { found: true, active: true, startupError: false } });
    const cli = await startTestCli({ zotero: binary, xpi: fixtureXpi("started", tempDir()) });
    expect(cli.code).toBe(0);
    const { pids, profile } = JSON.parse(readFileSync(seen, "utf8"));
    await expectGone(pids);
    expect(existsSync(resolve(profile, ".."))).toBe(false);
  });

  // Each named failure exits 1, prints its name, and writes no --out file.
  async function expectFailure(args: { zotero?: string; xpi?: string; limit?: string }, failure: string, message?: string): Promise<void> {
    const cli = await startTestCli(args);
    expect(cli.code).toBe(1);
    expect(cli.stderr).toMatch(new RegExp(`^${failure}: `));
    if (message !== undefined) expect(cli.stderr).toContain(message);
    expect(existsSync(cli.out)).toBe(false);
  }

  const started = () => fixtureXpi("started", tempDir());
  const exiting = () => shim({ mode: "exit" }).binary;

  test("fails zotero-missing when the binary does not exist", async () => {
    await expectFailure({ zotero: join(tempDir(), "zotero"), xpi: started() }, "zotero-missing");
  });

  test("fails zotero-not-runnable when the binary cannot be run", async () => {
    const binary = exiting();
    chmodSync(binary, 0o644);
    await expectFailure({ zotero: binary, xpi: started() }, "zotero-not-runnable");
  });

  test("fails zotero-version-unknown when no application.ini names a version", async () => {
    const binary = exiting();
    rmSync(join(binary, "..", "app"), { recursive: true });
    await expectFailure({ zotero: binary, xpi: started() }, "zotero-version-unknown");
  });

  test("fails xpi-unreadable when the XPI is missing", async () => {
    await expectFailure({ zotero: exiting(), xpi: join(tempDir(), "missing.xpi") }, "xpi-unreadable", "cannot read");
  });

  test("fails xpi-unreadable when the XPI is larger than the reader's cap", async () => {
    const xpi = join(tempDir(), "large.xpi");
    writeFileSync(xpi, "");
    truncateSync(xpi, XPI_MAX_BYTES + 1);
    await expectFailure({ zotero: exiting(), xpi }, "xpi-unreadable", "is larger than");
  });

  test("fails xpi-unreadable when the XPI is not a zip", async () => {
    const xpi = join(tempDir(), "plugin.xpi");
    writeFileSync(xpi, "not a zip");
    await expectFailure({ zotero: exiting(), xpi }, "xpi-unreadable", "not a readable zip");
  });

  test("fails xpi-unreadable when the XPI holds two manifest.json entries", async () => {
    const manifest = JSON.stringify({ version: "1.0.0", applications: { zotero: { id: "a@b" } } });
    const one = zipSync({ "manifest.json": new TextEncoder().encode(manifest) });
    // fflate keys files by name, so build the second entry under a placeholder name of the
    // same length and rename it in the bytes.
    const two = zipSync({ "manifest.json": new TextEncoder().encode(manifest), "manifest.jsoX": new TextEncoder().encode(manifest) });
    const bytes = Buffer.from(two);
    let at = bytes.indexOf("manifest.jsoX");
    while (at !== -1) {
      bytes.write("manifest.json", at);
      at = bytes.indexOf("manifest.jsoX", at);
    }
    expect(bytes.length).toBeGreaterThan(one.length);
    const xpi = join(tempDir(), "plugin.xpi");
    writeFileSync(xpi, bytes);
    await expectFailure({ zotero: exiting(), xpi }, "xpi-unreadable", "more than one manifest.json");
  });

  test("fails no-manifest when the XPI holds no manifest.json", async () => {
    const xpi = join(tempDir(), "plugin.xpi");
    writeFileSync(xpi, zipSync({ "bootstrap.js": new TextEncoder().encode("") }));
    await expectFailure({ zotero: exiting(), xpi }, "no-manifest");
  });

  test("fails no-manifest when manifest.json is not JSON", async () => {
    await expectFailure({ zotero: exiting(), xpi: manifestXpi("{") }, "no-manifest", "is not JSON");
  });

  test("fails no-zotero-id when the manifest has no applications.zotero.id", async () => {
    await expectFailure({ zotero: exiting(), xpi: manifestXpi({ version: "1.0.0", applications: { gecko: { id: "a@b" } } }) }, "no-zotero-id");
  });

  test("fails no-version when the manifest has no version", async () => {
    await expectFailure({ zotero: exiting(), xpi: manifestXpi({ applications: { zotero: { id: "a@b" } } }) }, "no-version");
  });

  test("fails zotero-exited when Zotero exits with no report", async () => {
    await expectFailure({ zotero: exiting(), xpi: started() }, "zotero-exited");
  });

  test("fails reporter-not-started, not timed-out, when the reporter never marks its start", async () => {
    await expectFailure({ zotero: shim({ mode: "silent" }).binary, xpi: started(), limit: "2" }, "reporter-not-started");
  });

  test("fails reporter-failed when the reporter writes an error", async () => {
    await expectFailure({ zotero: shim({ mode: "report", report: { error: "TypeError: x is null" } }).binary, xpi: started() }, "reporter-failed");
  });

  test.each([
    ["no --zotero", { xpi: "plugin.xpi" }],
    ["a --limit that is not a whole number", { zotero: "zotero", xpi: "plugin.xpi", limit: "1.5" }],
    ["a --limit over 3600", { zotero: "zotero", xpi: "plugin.xpi", limit: "3601" }],
  ])("prints the usage and exits 1 for %s", async (_name, args) => {
    const cli = await startTestCli(args);
    expect(cli.code).toBe(1);
    expect(cli.stderr).toContain("usage: pnpm start-test");
    expect(existsSync(cli.out)).toBe(false);
  });
});
