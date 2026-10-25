import { resolve } from "node:path";
import process, { argv } from "node:process";
import { buildData, writeData } from "./build.ts";

const USAGE = "usage: pnpm build [<dir>] [--out <dir>]";

async function main(): Promise<number> {
  const args = argv.slice(2);
  const outAt = args.indexOf("--out");
  const out = outAt === -1 ? undefined : args[outAt + 1];
  const positional = args.filter((_arg, i) => outAt === -1 || (i !== outAt && i !== outAt + 1));
  if (positional.length > 1 || (outAt !== -1 && !out)) {
    console.error(USAGE);
    return 1;
  }

  // pnpm runs scripts from the package root and keeps the caller's directory in
  // INIT_CWD, so relative paths resolve against where the user typed them.
  const cwd = process.env.INIT_CWD ?? process.cwd();
  const root = positional[0] ? resolve(cwd, positional[0]) : "plugins";
  const outDir = out ? resolve(cwd, out) : "dist";

  const built = await buildData(root, (url, init) => fetch(url, init));
  if (!built.ok) {
    for (const problem of built.problems) console.error(problem);
    console.error("wrote no file");
    return 1;
  }
  const written = await writeData(outDir, built.text);
  if (!written.ok) {
    console.error(`write-failed: ${written.message}`);
    return 1;
  }
  const failed = built.data.plugins.filter((plugin) => plugin.failure);
  for (const { id, failure } of failed) console.log(`${id}: ${failure!.name}: ${failure!.message}`);
  const total = built.data.plugins.length;
  console.log(`wrote ${total} records to ${written.path}, ${failed.length} with a failed upstream read`);
  // So many failures point at the build (a bad token, a GitHub outage), not at the
  // plugins. Exit 1, so the daily job deploys nothing and the last good data stays.
  if (failed.length * 2 > total) {
    console.error(`${failed.length} of ${total} records carry a failure, more than half`);
    return 1;
  }
  return 0;
}

// Set exitCode rather than calling exit(), so piped output is not cut off.
process.exitCode = await main();
