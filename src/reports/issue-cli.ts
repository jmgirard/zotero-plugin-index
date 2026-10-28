import { resolve } from "node:path";
import process, { argv } from "node:process";
import { answerReport, sweepReports } from "./issue.ts";

const USAGE = "usage: pnpm report-issue, with GITHUB_REPOSITORY and ISSUE_NUMBER set, or pnpm report-issue --sweep, with GITHUB_REPOSITORY set";
const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");

// Answers the report issue that ISSUE_NUMBER names. The issue's body and labels come from
// the GitHub API, so the workflow passes only the number. It exits 1 when the bot could
// not read, comment, or close; a refused report exits 0. With --sweep and no
// ISSUE_NUMBER, it answers the report issues that no run answered, as `sweepReports`
// picks them, and exits 1 when the list read or any answer failed.
async function main(): Promise<number> {
  const args = argv.slice(2);
  const sweep = args.length === 1 && args[0] === "--sweep";
  if (args.length > 0 && !sweep) {
    console.error(USAGE);
    return 1;
  }
  const indexRepo = process.env.GITHUB_REPOSITORY ?? "";
  if (!/^[\w.-]+\/[\w.-]+$/.test(indexRepo)) {
    console.error(`GITHUB_REPOSITORY must name the index repo as <owner>/<repo>\n${USAGE}`);
    return 1;
  }
  const issue = process.env.ISSUE_NUMBER ?? "";
  const root = resolve(PACKAGE_ROOT, "plugins");
  const fetchUrl = (url: string, init?: RequestInit) => fetch(url, init);
  if (sweep) {
    if (issue !== "") {
      console.error(`--sweep answers the issues it finds, so ISSUE_NUMBER must be unset\n${USAGE}`);
      return 1;
    }
    const result = await sweepReports({ root, fetch: fetchUrl, indexRepo, now: Date.now() });
    console.log(`the sweep tried ${result.answered.length} report issues${result.answered.map(({ issue }) => ` #${issue}`).join("")}`);
    for (const error of result.errors) console.error(error);
    return result.status;
  }
  if (!/^[1-9]\d*$/.test(issue)) {
    console.error(`ISSUE_NUMBER must be the number of an issue\n${USAGE}`);
    return 1;
  }
  const result = await answerReport({ root, fetch: fetchUrl, indexRepo, issue: Number(issue) });
  if (result.comment !== undefined) console.log(result.comment);
  for (const error of result.errors) console.error(error);
  return result.status;
}

// Set exitCode rather than calling exit(), so piped output is not cut off.
process.exitCode = await main();
