import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import process, { argv } from "node:process";
import { CATALOG_URL, CODE_SEARCHES, type DiscoverResult, type DiscoveryState, discover } from "./discover.ts";
import { entriesDir, planned, writePlan } from "./handoff.ts";
import { discoverRead, type Written } from "./propose.ts";

const USAGE = "usage: pnpm discover [--out <dir> | --handoff <dir>] [--state <file>] [--limit <n>] [--budget <n>]";
const OPTIONS = ["--out", "--handoff", "--state", "--limit", "--budget"];
const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");

async function main(): Promise<number> {
  const args = argv.slice(2);
  const values: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    const value = args[i + 1];
    if (!OPTIONS.includes(args[i]) || !value || value.startsWith("--") || args[i] in values) {
      console.error(USAGE);
      return 1;
    }
    values[args[i]] = value;
  }
  if (values["--out"] && values["--handoff"]) {
    console.error(USAGE);
    return 1;
  }
  const limit = count(values["--limit"] ?? "5");
  const budget = count(values["--budget"] ?? "100");
  if (limit === undefined || budget === undefined) {
    console.error(`--limit and --budget take a whole number of at least 1\n${USAGE}`);
    return 1;
  }
  const indexRepo = process.env.GITHUB_REPOSITORY;
  if (values["--handoff"] && !/^[\w.-]+\/[\w.-]+$/.test(indexRepo ?? "")) {
    console.error(`--handoff needs GITHUB_REPOSITORY set to the index repo as <owner>/<repo>\n${USAGE}`);
    return 1;
  }

  // pnpm runs scripts from the package root and keeps the caller's directory in
  // INIT_CWD, so relative paths resolve against where the user typed them.
  // The repo's own files are found from this file, wherever the command runs from.
  const cwd = process.env.INIT_CWD ?? process.cwd();
  const root = join(PACKAGE_ROOT, "plugins");
  const statePath = values["--state"]
    ? resolve(cwd, values["--state"])
    : join(PACKAGE_ROOT, ".cache/discovery-state.json");
  const handoff = values["--handoff"] ? resolve(cwd, values["--handoff"]) : undefined;
  // With --handoff, the entries go into the handoff for `pnpm propose`.
  const outDir = handoff ? entriesDir(handoff) : values["--out"] ? resolve(cwd, values["--out"]) : root;

  const warnings: string[] = [];
  const state = await readState(statePath, warnings);
  if (typeof state === "string") {
    console.error(`${state}\nwrote no entry`);
    return 1;
  }
  const options = { root, outDir, fetch: (url: string, init?: RequestInit) => fetch(url, init), state, limit, budget, catalog: CATALOG_URL, codeSearch: CODE_SEARCHES };
  let result: DiscoverResult;
  if (handoff) {
    result = await discoverRead({ ...options, indexRepo: indexRepo! });
  } else {
    result = await discover({ ...options, skip: new Set() });
  }
  if (!result.ok) {
    console.error(`${result.message}\nwrote no entry and left ${statePath} as it was`);
    return 1;
  }
  if (handoff) {
    const written = result.report.read.filter((item): item is Written => item.outcome === "written");
    try {
      await writePlan(handoff, { kind: "discover", entries: written.map(planned) });
    } catch (error) {
      console.error(`cannot write the handoff in ${handoff}: ${(error as Error).message}`);
      return 1;
    }
  }
  // The report names the entries already written, so it is printed before the state
  // write, which can still fail.
  result.report.warnings.unshift(...warnings);
  console.log(JSON.stringify(result.report, null, 2));
  try {
    // Written to a temporary file first, so a cut-off write leaves the old state.
    await mkdir(dirname(statePath), { recursive: true });
    await writeFile(`${statePath}.tmp`, `${JSON.stringify(result.state, null, 2)}\n`);
    await rename(`${statePath}.tmp`, statePath);
  } catch (error) {
    console.error(`cannot write ${statePath}: ${(error as Error).message}`);
    return 1;
  }
  return 0;
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
