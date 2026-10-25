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
    if (!OPTIONS.includes(args[i]) || args[i + 1] === undefined || args[i] in values) {
      console.error(USAGE);
      return 1;
    }
    values[args[i]] = args[i + 1];
  }
  const limit = count(values["--limit"] ?? "5");
  const budget = count(values["--budget"] ?? "100");
  if (limit === undefined || budget === undefined) {
    console.error(`--limit and --budget take a whole number of at least 1\n${USAGE}`);
    return 1;
  }

  // pnpm runs scripts from the package root and keeps the caller's directory in
  // INIT_CWD, so relative paths resolve against where the user typed them.
  const cwd = process.env.INIT_CWD ?? process.cwd();
  const outDir = values["--out"] ? resolve(cwd, values["--out"]) : "plugins";
  const statePath = values["--state"]
    ? resolve(cwd, values["--state"])
    : resolve(import.meta.dirname, "../../.cache/discovery-state.json");

  const warnings: string[] = [];
  const state = await readState(statePath, warnings);
  const result = await discover({
    root: "plugins",
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
  // Written to a temporary file first, so a cut-off write leaves the old state.
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(`${statePath}.tmp`, `${JSON.stringify(result.state, null, 2)}\n`);
  await rename(`${statePath}.tmp`, statePath);
  result.report.warnings.unshift(...warnings);
  console.log(JSON.stringify(result.report, null, 2));
  return 0;
}

function count(value: string): number | undefined {
  return /^[1-9]\d*$/.test(value) ? Number(value) : undefined;
}

// A missing state file is an empty state. So is one that is not a JSON object, with a
// warning: the state only saves reads, so losing it costs reads, not entries.
async function readState(path: string, warnings: string[]): Promise<DiscoveryState> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
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
