import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import process, { argv } from "node:process";
import { type DiscoveryState, discover, type Report } from "./discover.ts";
import { type ProposeFailure, type Proposed, pnpmCheck, proposeRun } from "./propose.ts";

const USAGE = "usage: pnpm discover [--out <dir>] [--state <file>] [--limit <n>] [--budget <n>] [--propose]";
const OPTIONS = ["--out", "--state", "--limit", "--budget"];
const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");

async function main(): Promise<number> {
  const args = argv.slice(2);
  const values: Record<string, string> = {};
  let propose = false;
  for (let i = 0; i < args.length; i += 2) {
    if (args[i] === "--propose" && !propose) {
      propose = true;
      i--;
      continue;
    }
    const value = args[i + 1];
    if (!OPTIONS.includes(args[i]) || !value || value.startsWith("--") || args[i] in values) {
      console.error(USAGE);
      return 1;
    }
    values[args[i]] = value;
  }
  const limit = count(values["--limit"] ?? "5");
  const budget = count(values["--budget"] ?? "100");
  if (limit === undefined || budget === undefined) {
    console.error(`--limit and --budget take a whole number of at least 1\n${USAGE}`);
    return 1;
  }
  const indexRepo = process.env.GITHUB_REPOSITORY;
  if (propose && !/^[\w.-]+\/[\w.-]+$/.test(indexRepo ?? "")) {
    console.error(`--propose needs GITHUB_REPOSITORY set to the index repo as <owner>/<repo>\n${USAGE}`);
    return 1;
  }

  // pnpm runs scripts from the package root and keeps the caller's directory in
  // INIT_CWD, so relative paths resolve against where the user typed them.
  // The repo's own files are found from this file, wherever the command runs from.
  const cwd = process.env.INIT_CWD ?? process.cwd();
  const root = join(PACKAGE_ROOT, "plugins");
  // With --propose, the entries go into pull requests, so by default they are drafted
  // outside the checkout.
  const draftDir = propose && !values["--out"] ? await mkdtemp(join(tmpdir(), "zpi-discover-")) : undefined;
  const outDir = values["--out"] ? resolve(cwd, values["--out"]) : (draftDir ?? root);
  const statePath = values["--state"]
    ? resolve(cwd, values["--state"])
    : join(PACKAGE_ROOT, ".cache/discovery-state.json");

  try {
    const warnings: string[] = [];
    const state = await readState(statePath, warnings);
    if (typeof state === "string") {
      console.error(`${state}\nwrote no entry`);
      return 1;
    }
    const options = { root, outDir, fetch: (url: string, init?: RequestInit) => fetch(url, init), state, limit, budget };
    let result:
      | { ok: true; state: DiscoveryState; report: Report; proposed?: Proposed[]; failed?: ProposeFailure[] }
      | { ok: false; message: string };
    if (propose) {
      // The checkout whose remote takes the pushes is the caller's directory.
      result = await proposeRun({ ...options, indexRepo: indexRepo!, gitDir: cwd, check: pnpmCheck });
    } else {
      result = await discover({ ...options, skip: new Set() });
    }
    if (!result.ok) {
      console.error(`${result.message}\nwrote no entry and left ${statePath} as it was`);
      return 1;
    }
    // The report names the entries already written and the pull requests already opened,
    // so it is printed before the state write, which can still fail.
    result.report.warnings.unshift(...warnings);
    const { proposed, failed = [] } = result;
    console.log(JSON.stringify(proposed ? { ...result.report, proposed } : result.report, null, 2));
    let status = 0;
    if (failed.length > 0) {
      const lines = failed.map(({ repo, id, message }) => `- ${repo} (${id}): ${message}`);
      console.error(`opened no pull request for ${failed.length} entries:\n${lines.join("\n")}`);
      status = 1;
    }
    try {
      // Written to a temporary file first, so a cut-off write leaves the old state.
      await mkdir(dirname(statePath), { recursive: true });
      await writeFile(`${statePath}.tmp`, `${JSON.stringify(result.state, null, 2)}\n`);
      await rename(`${statePath}.tmp`, statePath);
    } catch (error) {
      console.error(`cannot write ${statePath}: ${(error as Error).message}`);
      return 1;
    }
    return status;
  } finally {
    if (draftDir) await rm(draftDir, { recursive: true, force: true });
  }
}

function count(value: string): number | undefined {
  return /^[1-9]\d*$/.test(value) ? Number(value) : undefined;
}

// A missing state file is an empty state. So is one that is not a JSON object, with a
// warning: the state only saves reads, so losing it costs reads, not entries. A file
// that cannot be read returns the problem, since the run could not save its state there.
async function readState(path: string, warnings: string[]): Promise<DiscoveryState | string> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    return `cannot read ${path}: ${(error as Error).message}`;
  }
  try {
    const state = JSON.parse(text);
    if (typeof state === "object" && state !== null && !Array.isArray(state)) return state;
  } catch {
    // Reported below.
  }
  warnings.push(`${path} is not a JSON object, so the run started from an empty state`);
  return {};
}

// Set exitCode rather than calling exit(), so piped output is not cut off.
process.exitCode = await main();
