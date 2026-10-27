import { resolve } from "node:path";
import process, { argv } from "node:process";
import { answerReport } from "./issue.ts";

const USAGE = "usage: pnpm report-issue, with GITHUB_REPOSITORY and ISSUE_NUMBER set";
const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");

// Answers the report issue that ISSUE_NUMBER names. The issue's body and labels come from
// the GitHub API, so the workflow passes only the number. It exits 1 when the bot could
// not read, comment, or close; a refused report exits 0.
async function main(): Promise<number> {
  if (argv.length > 2) {
    console.error(USAGE);
    return 1;
  }
  const indexRepo = process.env.GITHUB_REPOSITORY ?? "";
  if (!/^[\w.-]+\/[\w.-]+$/.test(indexRepo)) {
    console.error(`GITHUB_REPOSITORY must name the index repo as <owner>/<repo>\n${USAGE}`);
    return 1;
  }
  const issue = process.env.ISSUE_NUMBER ?? "";
  if (!/^[1-9]\d*$/.test(issue)) {
    console.error(`ISSUE_NUMBER must be the number of an issue\n${USAGE}`);
    return 1;
  }
  const result = await answerReport({
    root: resolve(PACKAGE_ROOT, "plugins"),
    fetch: (url: string, init?: RequestInit) => fetch(url, init),
    indexRepo,
    issue: Number(issue),
  });
  if (result.comment !== undefined) console.log(result.comment);
  for (const error of result.errors) console.error(error);
  return result.status;
}

// Set exitCode rather than calling exit(), so piped output is not cut off.
process.exitCode = await main();
