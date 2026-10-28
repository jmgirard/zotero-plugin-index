import { REPORT_BOT } from "../reports/count.ts";
import { type Fetch, githubClient } from "../upstream/reader.ts";

const API = "https://api.github.com";
const HOUR_MS = 60 * 60 * 1000;
// An issue's own run is usually done this long after the issue opens. A run that waits
// longer in its concurrency group has not completed, so while it is among the 100
// newest `issues` runs, unansweredIssues returns none until it has.
export const MIN_AGE_MS = HOUR_MS;
// An issue whose run keeps failing before it comments is retried for this long.
export const MAX_AGE_MS = 7 * 24 * HOUR_MS;

export interface UnansweredOptions {
  fetch: Fetch;
  // The index repo as owner/repo.
  indexRepo: string;
  label: string;
  // The workflow file that answers issues of the label, such as `report-issue.yml`.
  workflow: string;
  limit: number;
  now: number;
}

// The numbers, oldest first and at most `limit`, of the open issues with `label` that
// were created from MIN_AGE_MS to MAX_AGE_MS before `now` and that no comment of the
// bot answers, on any page of the comments. Pull requests are left out. While any of the
// 100 newest `issues` runs of `workflow` has not completed, it returns none, since such
// a run can still answer its issue. A failed read throws.
export async function unansweredIssues(options: UnansweredOptions): Promise<number[]> {
  const { fetch, indexRepo, label, workflow, limit, now } = options;
  const github = githubClient(fetch);
  const repo = `${API}/repos/${indexRepo}`;
  const runs = (await github.json(`${repo}/actions/workflows/${encodeURIComponent(workflow)}/runs?event=issues&per_page=100`)) as {
    workflow_runs?: unknown;
  };
  if (!Array.isArray(runs?.workflow_runs)) throw new Error(`the runs of ${workflow} are not a list`);
  if (runs.workflow_runs.some((run: { status?: unknown } | null) => run?.status !== "completed")) return [];

  const issues = (await github.pages(`${repo}/issues?labels=${encodeURIComponent(label)}&state=open&sort=created&direction=asc&per_page=100`)) as IssueJson[];
  const numbers: number[] = [];
  for (const issue of issues) {
    if (numbers.length >= limit) break;
    if (!Number.isSafeInteger(issue?.number) || issue.pull_request !== undefined || issue.state !== "open") continue;
    const labels = Array.isArray(issue.labels) ? issue.labels.map((item) => (typeof item === "string" ? item : item?.name)) : [];
    if (!labels.includes(label)) continue;
    const age = now - Date.parse(typeof issue.created_at === "string" ? issue.created_at : "");
    if (!(age >= MIN_AGE_MS && age <= MAX_AGE_MS)) continue;
    const comments = (await github.pages(`${repo}/issues/${issue.number}/comments?per_page=100`)) as { user?: { login?: unknown } | null }[];
    if (comments.some((comment) => comment?.user?.login === REPORT_BOT)) continue;
    numbers.push(issue.number as number);
  }
  return numbers;
}

interface IssueJson {
  number?: unknown;
  state?: unknown;
  created_at?: unknown;
  pull_request?: unknown;
  labels?: (string | { name?: unknown } | null)[];
}
