import { writeFile } from "node:fs/promises";
import process from "node:process";
import { parseArgs } from "node:util";
import { START_LIMIT_MS, StartFailure, startTest } from "./start-test.ts";

const USAGE = "usage: pnpm start-test --zotero <binary> --xpi <file> --out <file> [--limit <seconds>]";

// Starts one Zotero binary with one plugin XPI and writes the result as JSON to --out. It
// exits 0 for each of the four results, and 1 with the failure's name when it cannot run
// the start, writing no --out file then.
async function main(): Promise<number> {
  let values: { zotero?: string; xpi?: string; out?: string; limit?: string };
  try {
    ({ values } = parseArgs({
      options: { zotero: { type: "string" }, xpi: { type: "string" }, out: { type: "string" }, limit: { type: "string" } },
      allowPositionals: false,
    }));
  } catch (error) {
    console.error(`${(error as Error).message}\n${USAGE}`);
    return 1;
  }
  if (values.zotero === undefined || values.xpi === undefined || values.out === undefined) {
    console.error(USAGE);
    return 1;
  }
  let limitMs = START_LIMIT_MS;
  if (values.limit !== undefined) {
    // An hour at most, well inside the longest delay a Node timer takes.
    if (!/^[1-9]\d*$/.test(values.limit) || Number(values.limit) > 3600) {
      console.error(`--limit must be a whole number of seconds from 1 to 3600\n${USAGE}`);
      return 1;
    }
    limitMs = Number(values.limit) * 1000;
  }
  try {
    const result = await startTest({ zotero: values.zotero, xpi: values.xpi, limitMs });
    await writeFile(values.out, `${JSON.stringify(result, null, 2)}\n`);
    console.log(`${result.id} ${result.version} in Zotero ${result.zotero}: ${result.result}`);
    return 0;
  } catch (error) {
    if (error instanceof StartFailure) {
      console.error(`${error.failure}: ${error.message}`);
      return 1;
    }
    throw error;
  }
}

// Set exitCode rather than calling exit(), so piped output is not cut off.
process.exitCode = await main();
