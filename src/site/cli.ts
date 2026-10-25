import { resolve } from "node:path";
import process, { argv } from "node:process";
import { buildSite } from "./site.ts";

const USAGE = "usage: pnpm site [--out <dir>]";

async function main(): Promise<number> {
  const args = argv.slice(2);
  const outAt = args.indexOf("--out");
  const out = outAt === -1 ? undefined : args[outAt + 1];
  if (args.length !== (outAt === -1 ? 0 : 2) || (outAt !== -1 && !out)) {
    console.error(USAGE);
    return 1;
  }

  // pnpm runs scripts from the package root and keeps the caller's directory in
  // INIT_CWD, so relative paths resolve against where the user typed them.
  const cwd = process.env.INIT_CWD ?? process.cwd();
  const outDir = out ? resolve(cwd, out) : resolve("dist");

  const built = await buildSite(outDir);
  if (!built.ok) {
    console.error(`site-failed: ${built.message}`);
    return 1;
  }
  console.log(`wrote ${built.pages} pages to ${outDir}`);
  return 0;
}

// Set exitCode rather than calling exit(), so piped output is not cut off.
process.exitCode = await main();
