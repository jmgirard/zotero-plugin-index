import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import { treeDigest } from "./digest.ts";

const USAGE = "usage: pnpm data-digest --dir <dir> [--expect <sha256>]";

// Prints the SHA-256 of the tree under --dir (see treeDigest). With --expect, it prints a line
// and exits 0 only when the value matches, so the daily build's site job can check the data it
// downloads against the value that the build job gives.
async function main(): Promise<number> {
  let values: { dir?: string; expect?: string };
  try {
    ({ values } = parseArgs({ options: { dir: { type: "string" }, expect: { type: "string" } }, allowPositionals: false }));
  } catch (error) {
    console.error(`${(error as Error).message}\n${USAGE}`);
    return 1;
  }
  if (values.dir === undefined || values.dir === "") {
    console.error(USAGE);
    return 1;
  }
  if (values.expect !== undefined && !/^[0-9a-f]{64}$/.test(values.expect)) {
    console.error(`--expect must be 64 lowercase hex digits\n${USAGE}`);
    return 1;
  }
  // pnpm runs scripts from the package root and keeps the caller's directory in
  // INIT_CWD, so a relative path resolves against where the user typed it.
  const dir = resolve(process.env.INIT_CWD ?? process.cwd(), values.dir);
  const isDirectory = await stat(dir).then(
    (stats) => stats.isDirectory(),
    () => false,
  );
  if (!isDirectory) {
    console.error(`not a directory: ${JSON.stringify(dir)}\n${USAGE}`);
    return 1;
  }

  const result = await treeDigest(dir);
  if (!result.ok) {
    console.error(result.message);
    return 1;
  }
  if (values.expect === undefined) {
    console.log(result.sha256);
    return 0;
  }
  if (result.sha256 !== values.expect) {
    console.error(`data digest ${result.sha256} differs from the expected ${values.expect}`);
    return 1;
  }
  console.log(`data digest matches: ${result.sha256}`);
  return 0;
}

// Set exitCode rather than calling exit(), so piped output is not cut off.
process.exitCode = await main();
