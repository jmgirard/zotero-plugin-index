import { join, resolve } from "node:path";
import process, { argv } from "node:process";
import { findGaps } from "./description-gaps.ts";

const USAGE = "usage: pnpm description-gaps <data file>";

// The checkout's entries, found from this file so that the command reads them from any directory.
const PLUGINS = join(import.meta.dirname, "..", "..", "plugins");

async function main(): Promise<number> {
  const args = argv.slice(2);
  if (args.length !== 1) {
    console.error(USAGE);
    return 1;
  }

  // pnpm runs scripts from the package root and keeps the caller's directory in
  // INIT_CWD, so a relative path resolves against where the user typed it.
  const dataPath = resolve(process.env.INIT_CWD ?? process.cwd(), args[0]);
  const result = await findGaps(dataPath, PLUGINS);
  if (!result.ok) {
    console.error(result.message);
    return 1;
  }
  // Whitespace in the shown text, tabs and line breaks included, prints as one space, so
  // each gap stays one line of tab-separated fields.
  for (const { id, gap, shown } of result.gaps) {
    console.log([id, gap, ...(shown === undefined ? [] : [shown.trim().replace(/\s+/g, " ")])].join("\t"));
  }
  console.log(`description gaps: ${result.gaps.length}`);
  return 0;
}

// Set exitCode rather than calling exit(), so piped output is not cut off.
process.exitCode = await main();
