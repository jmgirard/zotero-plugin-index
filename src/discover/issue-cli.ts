import { resolve } from "node:path";
import process, { argv } from "node:process";
import { entriesDir, writePlan } from "./handoff.ts";
import { issueRead } from "./issue.ts";

const USAGE = "usage: pnpm discover-issue --handoff <dir>, with ISSUE_NUMBER and GITHUB_REPOSITORY set";
const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");

// The read step of an issue run. It writes the outcome and any drafted entry into the
// handoff for `pnpm propose`, and makes no GitHub write. It reads the body of the issue
// that ISSUE_NUMBER names from the API, so the workflow passes only the number, and no
// text from the issue enters a shell script. A refusal or a failed read is an outcome in
// the handoff, so once its arguments and environment pass, the command exits 1 only when
// it cannot write the handoff.
async function main(): Promise<number> {
  const indexRepo = process.env.GITHUB_REPOSITORY ?? "";
  const args = argv.slice(2);
  if (args.length !== 2 || args[0] !== "--handoff" || !args[1] || args[1].startsWith("--")) {
    console.error(USAGE);
    return 1;
  }
  if (!/^[\w.-]+\/[\w.-]+$/.test(indexRepo)) {
    console.error(`GITHUB_REPOSITORY must name the index repo as <owner>/<repo>\n${USAGE}`);
    return 1;
  }
  const issue = process.env.ISSUE_NUMBER ?? "";
  if (!/^[1-9]\d*$/.test(issue)) {
    console.error(`ISSUE_NUMBER must be the number of an issue\n${USAGE}`);
    return 1;
  }
  const handoff = resolve(process.env.INIT_CWD ?? process.cwd(), args[1]);
  const outcome = await issueRead({
    root: resolve(PACKAGE_ROOT, "plugins"),
    outDir: entriesDir(handoff),
    fetch: (url: string, init?: RequestInit) => fetch(url, init),
    indexRepo,
    issue: Number(issue),
  });
  try {
    await writePlan(handoff, { kind: "issue", ...outcome });
  } catch (error) {
    console.error(`cannot write the handoff in ${handoff}: ${(error as Error).message}`);
    return 1;
  }
  console.log(JSON.stringify(outcome, null, 2));
  return 0;
}

// Set exitCode rather than calling exit(), so piped output is not cut off.
process.exitCode = await main();
