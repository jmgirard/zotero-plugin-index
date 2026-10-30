import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import { StartFailure } from "./start-test.ts";
import { parsePlan, startTests, summaryLines } from "./start-tests.ts";

const USAGE = "usage: pnpm start-tests --plan <file> --zotero <binary> --out <file>";

// Starts the Zotero binary with each plugin of the start plan that its range covers and that
// carries no result for the binary's version, and writes the results as a JSON array to --out. It exits 0 when it wrote the file, however
// many starts failed, and 1 when it cannot read the plan or the binary's Zotero version.
async function main(): Promise<number> {
  let values: { plan?: string; zotero?: string; out?: string };
  try {
    ({ values } = parseArgs({
      options: { plan: { type: "string" }, zotero: { type: "string" }, out: { type: "string" } },
      allowPositionals: false,
    }));
  } catch (error) {
    console.error(`${(error as Error).message}\n${USAGE}`);
    return 1;
  }
  if (values.plan === undefined || values.zotero === undefined || values.out === undefined) {
    console.error(USAGE);
    return 1;
  }
  let text: string;
  try {
    text = await readFile(values.plan, "utf8");
  } catch (error) {
    console.error(`plan-unreadable: cannot read ${values.plan}: ${(error as Error).message}`);
    return 1;
  }
  const parsed = parsePlan(text);
  if (!parsed.ok) {
    console.error(`plan-invalid: ${parsed.problem}`);
    return 1;
  }
  // A message can hold upstream text, such as a URL, so each goes on one line.
  const oneLine = (line: string) => line.replace(/[\r\n]+/g, " ");
  let run: Awaited<ReturnType<typeof startTests>>;
  try {
    run = await startTests({
      plan: parsed.plan,
      zotero: values.zotero,
      fetch: (url, init) => fetch(url, init),
      onItem: (entry, outcome) =>
        console.log(oneLine("reason" in outcome ? `${entry}: no result: ${outcome.reason}: ${outcome.message}` : `${entry}: ${outcome.result}`)),
    });
  } catch (error) {
    if (error instanceof StartFailure) {
      console.error(`${error.failure}: ${error.message}`);
      return 1;
    }
    throw error;
  }
  await mkdir(dirname(values.out), { recursive: true });
  await writeFile(values.out, `${JSON.stringify(run.results, null, 2)}\n`);
  for (const line of summaryLines(run)) console.log(line);
  console.log(`wrote ${run.results.length} results to ${values.out}`);
  return 0;
}

// Set exitCode rather than calling exit(), so piped output is not cut off.
process.exitCode = await main();
