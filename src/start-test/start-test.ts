import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { strFromU8, zipSync } from "fflate";
import { ReadFailure, XPI_MAX_BYTES, xpiManifestBytes } from "../upstream/reader.ts";

// The longest one start may take, from spawning Zotero to the reporter's report.
export const START_LIMIT_MS = 90 * 1000;

// The reporter plugin, which the command installs in the profile.
export const REPORTER_ID = "start-test-reporter@zotero-plugin-index";
const REPORTER_DIR = join(dirname(fileURLToPath(import.meta.url)), "reporter");

export type StartResultName = "started" | "start-error" | "not-installed" | "timed-out";

export interface StartResult {
  id: string;
  version: string;
  zotero: string;
  result: StartResultName;
}

export type StartFailureName =
  | "zotero-missing"
  | "zotero-not-runnable"
  | "zotero-version-unknown"
  | "xpi-unreadable"
  | "no-manifest"
  | "no-zotero-id"
  | "no-version"
  | "zotero-exited"
  | "reporter-not-started"
  | "reporter-failed";

export class StartFailure extends Error {
  readonly failure: StartFailureName;
  constructor(failure: StartFailureName, message: string) {
    super(message);
    this.failure = failure;
  }
}

// What the reporter plugin writes. `startupError` is true when, from the plugin's install
// to the report, the console got Zotero's "Error running bootstrap method 'startup'" message
// for the plugin's id, which a startup that throws and an async startup that rejects within
// the reporter's wait both log. `error` is set instead when the reporter itself failed.
export type Report = { found: boolean; active: boolean; startupError: boolean } | { error: string };

// The result that a report shows. A plugin that Zotero does not list, or lists as
// inactive, was not installed; Zotero keeps a plugin active when its startup throws.
export function resultFromReport(report: Report): StartResultName {
  if ("error" in report) throw new StartFailure("reporter-failed", `the reporter plugin failed: ${report.error}`);
  if (!report.found || !report.active) return "not-installed";
  return report.startupError ? "start-error" : "started";
}

function isReport(value: unknown): value is Report {
  if (typeof value !== "object" || value === null) return false;
  const report = value as Record<string, unknown>;
  if (typeof report.error === "string") return true;
  return typeof report.found === "boolean" && typeof report.active === "boolean" && typeof report.startupError === "boolean";
}

// The plugin id and version from the XPI's manifest.json, read with the upstream reader's
// zip checks.
export function readXpiManifest(xpi: Uint8Array, name: string): { id: string; version: string } {
  let bytes: Uint8Array | undefined;
  try {
    bytes = xpiManifestBytes(xpi, name);
  } catch (error) {
    if (error instanceof ReadFailure) throw new StartFailure("xpi-unreadable", error.message);
    throw error;
  }
  if (bytes === undefined) throw new StartFailure("no-manifest", `${name} holds no manifest.json`);
  let manifest: unknown;
  try {
    manifest = JSON.parse(strFromU8(bytes));
  } catch (error) {
    throw new StartFailure("no-manifest", `the manifest.json of ${name} is not JSON: ${(error as Error).message}`);
  }
  const fields = manifest as { applications?: { zotero?: { id?: unknown } }; version?: unknown } | null;
  const id = fields?.applications?.zotero?.id;
  if (typeof id !== "string" || id === "") throw new StartFailure("no-zotero-id", `the manifest.json of ${name} has no applications.zotero.id`);
  const version = fields?.version;
  if (typeof version !== "string" || version === "") throw new StartFailure("no-version", `the manifest.json of ${name} has no version`);
  return { id, version };
}

// The Zotero version in the application.ini of the binary's install: app/application.ini
// beside the binary on Linux, ../Resources/app/application.ini on macOS.
export async function zoteroVersion(binary: string): Promise<string> {
  const dir = dirname(binary);
  for (const ini of [join(dir, "app", "application.ini"), join(dir, "..", "Resources", "app", "application.ini")]) {
    let text: string;
    try {
      text = await readFile(ini, "utf8");
    } catch {
      continue;
    }
    const version = /^Version=(\S+)$/m.exec(text)?.[1];
    if (version !== undefined) return version;
  }
  throw new StartFailure("zotero-version-unknown", `no application.ini with a Version line found for ${binary}`);
}

// Prefs that let Zotero load the reporter from the profile and install the plugin under test
// with no prompt, and keep it from first-run screens, updates, and its local HTTP server.
// Zotero plugins are not signed.
function prefs(dataDir: string): string {
  const values: Record<string, string | number | boolean> = {
    "extensions.autoDisableScopes": 0,
    "extensions.enabledScopes": 5,
    "xpinstall.signatures.required": false,
    "extensions.update.enabled": false,
    "extensions.getAddons.cache.enabled": false,
    "app.update.enabled": false,
    "datareporting.policy.dataSubmissionEnabled": false,
    "extensions.zotero.firstRun2": false,
    "extensions.zotero.firstRunGuidance": false,
    "extensions.zotero.firstRun.skipFirefoxProfileAccessCheck": true,
    "extensions.zotero.httpServer.enabled": false,
    "extensions.zotero.dataDir": dataDir,
    "extensions.zotero.useDataDir": true,
  };
  return Object.entries(values)
    .map(([name, value]) => `user_pref(${JSON.stringify(name)}, ${JSON.stringify(value)});\n`)
    .join("");
}

async function reporterXpi(): Promise<Uint8Array> {
  return zipSync({
    "manifest.json": await readFile(join(REPORTER_DIR, "manifest.json")),
    "bootstrap.js": await readFile(join(REPORTER_DIR, "bootstrap.js")),
  });
}

function killGroup(pid: number | undefined): void {
  if (pid === undefined) return;
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    // The group has already ended.
  }
}

export interface StartTestOptions {
  zotero: string;
  xpi: string;
  limitMs?: number;
}

// Starts the Zotero binary with the reporter plugin in a new profile and data directory, and
// returns the result. The reporter installs the XPI once Zotero is ready: a plugin loaded
// from the profile at start can throw before the reporter listens, and Zotero clears the
// console's earlier messages. Zotero runs with MOZ_HEADLESS set; on Linux it also
// needs a display, such as the one xvfb-run gives. At the time limit, or once the reporter
// has written its report, every process of the run's process group is killed and the
// temp directory removed. A run whose reporter never started fails rather than timing out,
// so a broken setup is not reported as the plugin's result.
export async function startTest(options: StartTestOptions): Promise<StartResult> {
  const limitMs = options.limitMs ?? START_LIMIT_MS;
  if (!existsSync(options.zotero)) throw new StartFailure("zotero-missing", `no Zotero binary at ${options.zotero}`);
  const zotero = await zoteroVersion(options.zotero);
  let xpi: Uint8Array;
  try {
    if ((await stat(options.xpi)).size > XPI_MAX_BYTES) {
      throw new StartFailure("xpi-unreadable", `${options.xpi} is larger than ${XPI_MAX_BYTES} bytes`);
    }
    xpi = await readFile(options.xpi);
  } catch (error) {
    if (error instanceof StartFailure) throw error;
    throw new StartFailure("xpi-unreadable", `cannot read ${options.xpi}: ${(error as Error).message}`);
  }
  const { id, version } = readXpiManifest(xpi, options.xpi);

  const temp = await mkdtemp(join(tmpdir(), "start-test-"));
  try {
    const profile = join(temp, "profile");
    const dataDir = join(temp, "data");
    await mkdir(join(profile, "extensions"), { recursive: true });
    await mkdir(dataDir);
    await writeFile(join(profile, "prefs.js"), prefs(dataDir));
    await writeFile(join(profile, "extensions", `${REPORTER_ID}.xpi`), await reporterXpi());
    // The reporter installs this copy once Zotero is ready, so it sees the plugin start.
    const subjectXpi = join(temp, "subject.xpi");
    await writeFile(subjectXpi, xpi);

    const paths = { report: join(temp, "report.json"), ready: join(temp, "ready"), subjectXpi };
    const report = await runZotero(options.zotero, profile, id, paths, limitMs);
    return { id, version, zotero, result: report === undefined ? "timed-out" : resultFromReport(report) };
  } finally {
    // A killed process can take a moment to end, so retry a removal that meets its files.
    await rm(temp, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}

// Resolves with the report, or with undefined at the time limit once the reporter has
// started. Zotero quits itself after the reporter writes, but the group is killed either
// way, so no process it started stays.
function runZotero(
  binary: string,
  profile: string,
  id: string,
  paths: { report: string; ready: string; subjectXpi: string },
  limitMs: number,
): Promise<Report | undefined> {
  return new Promise((resolveRun, reject) => {
    let settled = false;
    let timer: NodeJS.Timeout | undefined;
    let poll: NodeJS.Timeout | undefined;
    let pid: number | undefined;
    const finish = (settle: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(poll);
      killGroup(pid);
      settle();
    };
    const readReport = async (): Promise<Report | undefined> => {
      let text: string;
      try {
        text = await readFile(paths.report, "utf8");
      } catch {
        return undefined;
      }
      let report: unknown;
      try {
        report = JSON.parse(text);
      } catch {
        return undefined;
      }
      return isReport(report) ? report : undefined;
    };
    const child = spawn(binary, ["-no-remote", "-profile", profile], {
      stdio: "ignore",
      detached: true,
      env: {
        ...process.env,
        MOZ_HEADLESS: "1",
        START_TEST_REPORT: paths.report,
        START_TEST_READY: paths.ready,
        START_TEST_SUBJECT: id,
        START_TEST_XPI: paths.subjectXpi,
      },
    });
    pid = child.pid;
    // The timer and the poll keep the command alive until the run settles; after that, a
    // process the kill missed does not hold the command open.
    child.unref();
    timer = setTimeout(() => {
      if (existsSync(paths.ready)) finish(() => resolveRun(undefined));
      else finish(() => reject(new StartFailure("reporter-not-started", `the reporter plugin did not start within the time limit for ${id}`)));
    }, limitMs);
    poll = setInterval(async () => {
      const report = await readReport();
      if (report !== undefined) finish(() => resolveRun(report));
    }, 250);
    child.on("error", (error) => finish(() => reject(new StartFailure("zotero-not-runnable", `cannot run ${binary}: ${error.message}`))));
    child.on("exit", async () => {
      const report = await readReport();
      if (report !== undefined) finish(() => resolveRun(report));
      else finish(() => reject(new StartFailure("zotero-exited", `Zotero exited before the reporter wrote a report for ${id}`)));
    });
  });
}
