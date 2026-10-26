import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process, { argv } from "node:process";
import { type DiscoveryState, discover } from "./discover.ts";

const USAGE = "usage: pnpm discover [--out <dir>] [--state <file>] [--limit <n>] [--budget <n>]";
const OPTIONS = ["--out", "--state", "--limit", "--budget"];

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
  const limit = count(values["--limit"] ?? "5");
  const budget = count(values["--budget"] ?? "100");
  if (limit === undefined || budget === undefined) {
    console.error(`--limit and --budget take a whole number of at least 1\n${USAGE}`);
    return 1;
  }

  // pnpm runs scripts from the package root and keeps the caller's directory in
  // INIT_CWD, so relative paths resolve against where the user typed them.
  // The repo's own files are found from this file, wherever the command runs from.
  const cwd = process.env.INIT_CWD ?? process.cwd();
  const root = resolve(import.meta.dirname, "../../plugins");
  const outDir = values["--out"] ? resolve(cwd, values["--out"]) : root;
  const statePath = values["--state"]
    ? resolve(cwd, values["--state"])
    : resolve(import.meta.dirname, "../../.cache/discovery-state.json");

  const warnings: string[] = [];
  const state = await readState(statePath, warnings);
  if (typeof state === "string") {
    console.error(`${state}\nwrote no entry`);
    return 1;
  }
  const result = await discover({
    root,
    outDir,
    fetch: (url, init) => fetch(url, init),
    state,
    skip: new Set(),
    limit,
    budget,
  });
  if (!result.ok) {
    console.error(`${result.message}\nwrote no entry and left ${statePath} as it was`);
    return 1;
  }
  // The report names the entries already on disk, so it is printed before the state
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
