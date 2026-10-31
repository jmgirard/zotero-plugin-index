import { resolve } from "node:path";
import process, { argv } from "node:process";
import { findGaps } from "./description-gaps.ts";

const USAGE = "usage: pnpm description-gaps <data file>";

async function main(): Promise<number> {
  const args = argv.slice(2);
  if (args.length !== 1) {
    console.error(USAGE);
    return 1;
  }

  // pnpm runs scripts from the package root and keeps the caller's directory in
  // INIT_CWD, so a relative path resolves against where the user typed it. The entries
  // are the checkout's plugins/ folder.
  const dataPath = resolve(process.env.INIT_CWD ?? process.cwd(), args[0]);
  const result = await findGaps(dataPath, "plugins");
  if (!result.ok) {
    console.error(result.message);
    return 1;
  }
  for (const { id, gap, shown } of result.gaps) console.log(`${id}\t${gap}\t${shown ?? ""}`);
  console.log(`${result.gaps.length} plugins with a description gap`);
  return 0;
}

// Set exitCode rather than calling exit(), so piped output is not cut off.
process.exitCode = await main();
