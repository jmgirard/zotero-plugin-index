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
  // A message can hold upstream text, such as an update_url. Each goes on one line, so no
  // part of it starts a line that GitHub Actions reads as a workflow command.
  const oneLine = (text: string) => text.replace(/[\r\n]+/g, " ");
  for (const { id, failure } of failed) console.log(`${id}: ${failure!.name}: ${oneLine(failure!.message)}`);
  const counts = new Map<string, number>();
  for (const { failure } of failed) counts.set(failure!.name, (counts.get(failure!.name) ?? 0) + 1);
  for (const name of [...counts.keys()].sort()) console.log(`failed with ${name}: ${counts.get(name)}`);
  const total = built.data.plugins.length;
  const buildLevel = built.buildLevel.length;
  console.log(`build-level failures: ${buildLevel} of ${total} records`);
  // GitHub Actions shows this line as a warning on the run.
  if (buildLevel > 0) console.log(`::warning::${buildLevel} of ${total} records carry a build-level failure`);
  console.log(`wrote ${total} records to ${written.path}, ${failed.length} with a failed upstream read`);
  // A build-level failure, such as a rate limit or a network error, usually points at the
  // build, not at the plugin. When more than half of the records carry one, exit 1, so the daily
  // build deploys nothing and the last good data stays. Also exit 1 when
  // every record carries a failure of any name, since a reader or schema bug can fail them
  // all with named failures.
  const tooManyBuildLevel = buildLevel * 2 > total;
  const allFailed = failed.length === total;
  if (tooManyBuildLevel) console.error(`${buildLevel} of ${total} records carry a build-level failure, more than half`);
  if (allFailed) console.error(`all ${total} records carry a failure`);
  return tooManyBuildLevel || allFailed ? 1 : 0;
}

// Set exitCode rather than calling exit(), so piped output is not cut off.
process.exitCode = await main();
