import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import process, { argv } from "node:process";
import { issueRun } from "./issue.ts";
import { pnpmCheck } from "./propose.ts";

const USAGE = "usage: pnpm discover-issue, with ISSUE_NUMBER, ISSUE_BODY, and GITHUB_REPOSITORY set";
const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");

// The issue's number and body come from the environment, so the workflow passes the
// body through `env:` and never writes it into a shell script.
async function main(): Promise<number> {
  const issue = process.env.ISSUE_NUMBER ?? "";
  const indexRepo = process.env.GITHUB_REPOSITORY ?? "";
  if (argv.length > 2) {
    console.error(USAGE);
    return 1;
  }
  if (!/^[1-9]\d*$/.test(issue)) {
    console.error(`ISSUE_NUMBER must be the number of an issue\n${USAGE}`);
    return 1;
  }
  if (!/^[\w.-]+\/[\w.-]+$/.test(indexRepo)) {
    console.error(`GITHUB_REPOSITORY must name the index repo as <owner>/<repo>\n${USAGE}`);
    return 1;
  }

  let draftDir: string;
  try {
    draftDir = await mkdtemp(join(tmpdir(), "zpi-issue-"));
  } catch (error) {
    console.error(`cannot create a draft directory: ${(error as Error).message}`);
    return 1;
  }
  try {
    const result = await issueRun({
      root: join(PACKAGE_ROOT, "plugins"),
      outDir: draftDir,
      fetch: (url: string, init?: RequestInit) => fetch(url, init),
      indexRepo,
      // The checkout whose remote takes the push is the caller's directory.
      gitDir: process.env.INIT_CWD ?? process.cwd(),
      check: pnpmCheck,
      issue: Number(issue),
      body: process.env.ISSUE_BODY ?? "",
    });
    console.log(result.comment);
    for (const error of result.errors) console.error(error);
    return result.status;
  } finally {
    await rm(draftDir, { recursive: true, force: true });
  }
}

// Set exitCode rather than calling exit(), so piped output is not cut off.
process.exitCode = await main();
