import process from "node:process";
import { parseArgs } from "node:util";
import { carryPlan, PREVIOUS_URL } from "./carry.ts";

const USAGE = "usage: pnpm carry-start-results --plan <file> --data <file> [--previous <url>]";

// Writes into the start plan the `started` results of the deployed data at --previous that it
// can reuse (see carryResults), on the day of the --data file's generatedAt. It prints one line
// and exits 0, whatever goes wrong with the read, so start results never withhold a deploy
// (D-024); it exits 1 only for a usage error, which is a fault of the workflow.
async function main(): Promise<number> {
  let values: { plan?: string; data?: string; previous?: string };
  try {
    ({ values } = parseArgs({
      options: { plan: { type: "string" }, data: { type: "string" }, previous: { type: "string" } },
      allowPositionals: false,
    }));
  } catch (error) {
    console.error(`${(error as Error).message}\n${USAGE}`);
    return 1;
  }
  if (values.plan === undefined || values.data === undefined) {
    console.error(USAGE);
    return 1;
  }
  const { code, line } = await carryPlan({ plan: values.plan, data: values.data, previous: values.previous ?? PREVIOUS_URL, fetch });
  // The line can quote an error message, so a line break in it becomes a space.
  console.log(line.replaceAll(/[\r\n]+/g, " "));
  return code;
}

// Set exitCode rather than calling exit(), so piped output is not cut off.
process.exitCode = await main();
