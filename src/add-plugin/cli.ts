import { resolve } from "node:path";
import process, { argv } from "node:process";
import { readUpstream } from "../upstream/reader.ts";
import { writeEntry } from "./add-plugin.ts";

const USAGE = "usage: pnpm add-plugin <github-url> [--out <dir>]";

async function main(): Promise<number> {
  const args = argv.slice(2);
  const outAt = args.indexOf("--out");
  const out = outAt === -1 ? undefined : args[outAt + 1];
  const positional = args.filter((_arg, i) => outAt === -1 || (i !== outAt && i !== outAt + 1));
  if (positional.length !== 1 || (outAt !== -1 && !out)) {
    console.error(USAGE);
    return 1;
  }

  // pnpm runs scripts from the package root and keeps the caller's directory in
  // INIT_CWD, so a relative --out resolves against where the user typed it.
  const outDir = out ? resolve(process.env.INIT_CWD ?? process.cwd(), out) : "plugins";

  const read = await readUpstream(positional[0], (url, init) => fetch(url, init));
  if (!read.ok) {
    console.error(`${read.failure}: ${read.message}`);
    return 1;
  }
  const written = await writeEntry(outDir, read.facts);
  if (!written.ok) {
    console.error(`${written.failure}: ${written.message}`);
    return 1;
  }
  console.log(`wrote meta.json and index.json in ${written.dir}`);
  return 0;
}

// Set exitCode rather than calling exit(), so piped output is not cut off.
process.exitCode = await main();
