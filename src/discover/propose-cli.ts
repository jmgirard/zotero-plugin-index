import { resolve } from "node:path";
import process, { argv } from "node:process";
import { readHandoff } from "./handoff.ts";
import { issueAnswer } from "./issue.ts";
import { pnpmCheck, proposeHandoff, type Written } from "./propose.ts";

const USAGE = "usage: pnpm propose <handoff dir> [--limit <n>], with GITHUB_REPOSITORY set, and ISSUE_NUMBER for an issue run";

// The write step of a discover run, or of an issue run when ISSUE_NUMBER is set. It reads
// the handoff that `pnpm discover --handoff` or `pnpm discover-issue --handoff` wrote,
// refuses one it cannot trust before any GitHub request, and then pushes the branches,
// opens the pull requests, and answers the issue.
async function main(): Promise<number> {
  const args = argv.slice(2);
  const dir = args[0];
  let limit = 5;
  if (!dir || dir.startsWith("--") || (args.length !== 1 && args.length !== 3)) {
    console.error(USAGE);
    return 1;
  }
  if (args.length === 3) {
    if (args[1] !== "--limit" || !/^[1-9]\d*$/.test(args[2])) {
      console.error(`--limit takes a whole number of at least 1\n${USAGE}`);
      return 1;
    }
    limit = Number(args[2]);
  }
  const indexRepo = process.env.GITHUB_REPOSITORY ?? "";
  if (!/^[\w.-]+\/[\w.-]+$/.test(indexRepo)) {
    console.error(`GITHUB_REPOSITORY must name the index repo as <owner>/<repo>\n${USAGE}`);
    return 1;
  }
  // The issue number comes from the workflow, never from the handoff: the event's
  // issue, or a number the sweep's pick job read from the API.
  const issueNumber = process.env.ISSUE_NUMBER;
  if (issueNumber !== undefined && !/^[1-9]\d*$/.test(issueNumber)) {
    console.error(`ISSUE_NUMBER must be the number of an issue\n${USAGE}`);
    return 1;
  }

  const cwd = process.env.INIT_CWD ?? process.cwd();
  const handoff = resolve(cwd, dir);
  const read = await readHandoff(handoff, issueNumber ? "issue" : "discover", issueNumber ? 1 : limit);
  if (!read.ok && read.refusal === "handoff-refused") {
    console.error(`refused the handoff: ${read.message}\nsent no request and pushed nothing`);
    return 1;
  }
  const common = {
    fetch: (url: string, init?: RequestInit) => fetch(url, init),
    indexRepo,
    // The checkout whose remote takes the pushes is the caller's directory.
    gitDir: cwd,
    check: pnpmCheck,
  };

  if (issueNumber) {
    let issueRead: Parameters<typeof issueAnswer>[0]["read"];
    if (read.ok && read.plan.kind === "issue") {
      const { kind: _kind, ...outcome } = read.plan;
      issueRead = { outcome, dir: outcome.outcome === "entry" ? read.dirs.get(outcome.entry.id) : undefined };
    } else if (!read.ok && read.refusal === "check-failed") {
      // The check failed to run, so the issue gets the same answer as a read that threw.
      issueRead = { outcome: { outcome: "failed", failure: "unexpected-error", message: read.message } };
    }
    const result = await issueAnswer({ ...common, issue: Number(issueNumber), read: issueRead });
    console.log(result.comment);
    for (const error of result.errors) console.error(error);
    return result.status;
  }

  if (!read.ok) {
    const lead = read.refusal === "check-failed" ? "could not check the handoff: " : "";
    console.error(`${lead}${read.message}\nsent no request and pushed nothing`);
    return 1;
  }
  if (read.plan.kind !== "discover") return 1;
  const dirs = read.dirs;
  const entries = read.plan.entries.map((entry): Written => ({ ...entry, outcome: "written", dir: dirs.get(entry.id)! }));
  const result = await proposeHandoff({ ...common, entries });
  if (!result.ok) {
    console.error(`${result.message}\npushed nothing`);
    return 1;
  }
  const { proposed, failed, skipped } = result;
  console.log(JSON.stringify({ proposed, skipped }, null, 2));
  if (failed.length > 0) {
    const lines = failed.map(({ repo, id, message }) => `- ${repo} (${id}): ${message}`);
    // A held entry whose label request failed has an open pull request, which its message names.
    console.error(`${failed.length} entries failed:\n${lines.join("\n")}`);
    return 1;
  }
  return 0;
}

// Set exitCode rather than calling exit(), so piped output is not cut off.
process.exitCode = await main();
