import { join, resolve } from "node:path";
import process, { argv } from "node:process";
import { mergeDiscover } from "./merge.ts";
import { pnpmCheck } from "./propose.ts";

const USAGE = "usage: pnpm merge-discover, with GITHUB_REPOSITORY set";
const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");

// Merges the bot pull requests that `mergeDiscover` passes, checking each entry beside the
// entries in this checkout's plugins/ folder. It prints each pull request it merged or
// skipped, and exits 1 when any pull request failed or the list of pull requests could
// not be read.
async function main(): Promise<number> {
  if (argv.length > 2) {
    console.error(USAGE);
    return 1;
  }
  const indexRepo = process.env.GITHUB_REPOSITORY ?? "";
  if (!/^[\w.-]+\/[\w.-]+$/.test(indexRepo)) {
    console.error(`GITHUB_REPOSITORY must name the index repo as <owner>/<repo>\n${USAGE}`);
    return 1;
  }
  let result: Awaited<ReturnType<typeof mergeDiscover>>;
  try {
    result = await mergeDiscover({
      fetch: (url: string, init?: RequestInit) => fetch(url, init),
      indexRepo,
      root: join(PACKAGE_ROOT, "plugins"),
      check: (dir) => pnpmCheck(dir),
    });
  } catch (error) {
    console.error(`merged nothing: ${(error as Error).message}`);
    return 1;
  }
  for (const number of result.merged) console.log(`merged #${number}`);
  for (const { number, reason } of result.skipped) console.log(`skipped #${number}: ${reason}`);
  for (const { number, message } of result.failed) console.error(`failed #${number}: ${message}`);
  return result.failed.length > 0 ? 1 : 0;
}

// Set exitCode rather than calling exit(), so piped output is not cut off.
process.exitCode = await main();
