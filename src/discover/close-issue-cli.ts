import process, { argv } from "node:process";
import { closeIssue } from "./close-issue.ts";

const USAGE = "usage: pnpm close-issue, with GITHUB_REPOSITORY and PR_NUMBER set";

// Closes the issue of the bot pull request that PR_NUMBER names, when that pull request
// was closed without a merge. The pull request and the issue come from the GitHub API,
// so the workflow passes only the number. It exits 1 when the bot could not read,
// comment, or close; a run with nothing to do exits 0.
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
  const pull = process.env.PR_NUMBER ?? "";
  if (!/^[1-9]\d*$/.test(pull)) {
    console.error(`PR_NUMBER must be the number of a pull request\n${USAGE}`);
    return 1;
  }
  const result = await closeIssue({
    fetch: (url: string, init?: RequestInit) => fetch(url, init),
    indexRepo,
    pull: Number(pull),
  });
  if (result.skipped !== undefined) console.log(`nothing to do: ${result.skipped}`);
  if (result.comment !== undefined) console.log(result.comment);
  for (const error of result.errors) console.error(error);
  return result.status;
}

// Set exitCode rather than calling exit(), so piped output is not cut off.
process.exitCode = await main();
