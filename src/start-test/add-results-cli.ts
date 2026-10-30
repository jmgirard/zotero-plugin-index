import { readFile, rename, rm, writeFile } from "node:fs/promises";
import process from "node:process";
import { parseArgs } from "node:util";
import { checkOutput, type PluginsFile } from "../build/build.ts";
import { addResults, readResultsDir, type ResultsFile } from "./add-results.ts";
import { parsePlan } from "./start-tests.ts";

const USAGE = "usage: pnpm add-start-results --data <file> --plan <file> --results <dir> --tested <version>[,<version>…]";

// Adds the start-test results under --results to the data file in place, keeping only the
// results that match the plan and name a --tested version (see addResults). It exits 1,
// leaving the file as it was, when it cannot read the data, the plan, or the results
// directory's listing, or when the schema rejects the new data. A missing results directory
// adds no results, and an entry in it that cannot be read drops as a bad file.
async function main(): Promise<number> {
  let values: { data?: string; plan?: string; results?: string; tested?: string };
  try {
    ({ values } = parseArgs({
      options: { data: { type: "string" }, plan: { type: "string" }, results: { type: "string" }, tested: { type: "string" } },
      allowPositionals: false,
    }));
  } catch (error) {
    console.error(`${(error as Error).message}\n${USAGE}`);
    return 1;
  }
  if (values.data === undefined || values.plan === undefined || values.results === undefined || !values.tested) {
    console.error(USAGE);
    return 1;
  }
  const tested = values.tested.split(",");
  if (!tested.every((version) => /^[0-9]+(\.[0-9]+)*$/.test(version))) {
    console.error(`--tested must list Zotero versions joined by commas, such as 7.0.32,10.0.6\n${USAGE}`);
    return 1;
  }
  let data: PluginsFile;
  let planText: string;
  try {
    data = JSON.parse(await readFile(values.data, "utf8"));
    planText = await readFile(values.plan, "utf8");
  } catch (error) {
    console.error(`cannot read the data or the plan: ${(error as Error).message}`);
    return 1;
  }
  if (!Array.isArray(data?.plugins)) {
    console.error(`${values.data} has no plugins list`);
    return 1;
  }
  const parsed = parsePlan(planText);
  if (!parsed.ok) {
    console.error(`plan-invalid: ${parsed.problem}`);
    return 1;
  }
  let files: ResultsFile[];
  try {
    files = await readResultsDir(values.results);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`cannot read the results directory ${values.results}: ${(error as Error).message}`);
      return 1;
    }
    console.log(`no results directory at ${values.results}, so no start results are added`);
    files = [];
  }
  const outcome = addResults(data, parsed.plan, files, tested);
  // File names come from the workflow, but JSON quoting keeps any of them on one line.
  for (const { file, index, reason } of outcome.dropped) console.log(`dropped ${JSON.stringify(file)} item ${index}: ${reason}`);
  for (const file of outcome.badFiles) console.log(`dropped ${JSON.stringify(file)}: not a readable JSON array`);
  const text = `${JSON.stringify(outcome.data, null, 2)}\n`;
  const problems = checkOutput(JSON.parse(text));
  if (problems.length > 0) {
    for (const problem of problems) console.error(`the output ${problem}`);
    console.error("wrote no file");
    return 1;
  }
  const temporary = `${values.data}.tmp`;
  try {
    await writeFile(temporary, text);
    await rename(temporary, values.data);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => {});
    console.error(`write-failed: cannot write ${values.data}: ${(error as Error).message}`);
    return 1;
  }
  console.log(
    `kept ${outcome.kept} start results, ${outcome.carried} of them carried; dropped ${outcome.dropped.length} results and ${outcome.badFiles.length} files that are not a readable JSON array`,
  );
  return 0;
}

// Set exitCode rather than calling exit(), so piped output is not cut off.
process.exitCode = await main();
