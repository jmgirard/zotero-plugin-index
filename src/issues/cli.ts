import process, { argv } from "node:process";
import { unansweredIssues } from "./unanswered.ts";

const USAGE = "usage: pnpm unanswered-issues --label <label> --workflow <file> --limit <n>, with GITHUB_REPOSITORY set";

// Prints, one per line, the numbers of the open issues with the label that no bot
// comment answers, as `unansweredIssues` picks them. A workflow passes the output to its
// jobs, so each line is a number and nothing else. It exits 1 when a read fails.
async function main(): Promise<number> {
  const args = argv.slice(2);
  const values = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    const [name, value] = [args[i], args[i + 1]];
    if (!["--label", "--workflow", "--limit"].includes(name) || values.has(name) || value === undefined || value.startsWith("--")) {
      console.error(USAGE);
      return 1;
    }
    values.set(name, value);
  }
  const label = values.get("--label") ?? "";
  const workflow = values.get("--workflow") ?? "";
  const limit = values.get("--limit") ?? "";
  if (!/^[\w.-]+$/.test(label) || !/^[\w.-]+\.ya?ml$/.test(workflow) || !/^(?:[1-9]\d?|100)$/.test(limit)) {
    console.error(`--label must be a label name, --workflow a workflow file name, and --limit a number from 1 to 100\n${USAGE}`);
    return 1;
  }
  const indexRepo = process.env.GITHUB_REPOSITORY ?? "";
  if (!/^[\w.-]+\/[\w.-]+$/.test(indexRepo)) {
    console.error(`GITHUB_REPOSITORY must name the index repo as <owner>/<repo>\n${USAGE}`);
    return 1;
  }
  try {
    const numbers = await unansweredIssues({
      fetch: (url: string, init?: RequestInit) => fetch(url, init),
      indexRepo,
      label,
      workflow,
      limit: Number(limit),
      now: Date.now(),
    });
    for (const number of numbers) console.log(number);
  } catch (error) {
    console.error(`cannot list the unanswered ${label} issues: ${(error as Error).message}`);
    return 1;
  }
  return 0;
}

// Set exitCode rather than calling exit(), so piped output is not cut off.
process.exitCode = await main();
