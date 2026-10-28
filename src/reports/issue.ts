import { readdir } from "node:fs/promises";
import { code } from "../discover/propose.ts";
import { unansweredIssues } from "../issues/unanswered.ts";
import { type Fetch, githubClient } from "../upstream/reader.ts";
import { REPORT_BOT } from "./count.ts";
import { parseReport } from "./report.ts";

const API = "https://api.github.com";

export interface ReportAnswerOptions {
  // The index's entries, one directory for each plugin id.
  root: string;
  fetch: Fetch;
  // The index repo as owner/repo, and the number of the report issue.
  indexRepo: string;
  issue: number;
}

export interface ReportRunResult {
  // 1 when the bot could not read the issue or the entries, or could not post the
  // comment or close the issue. A refused report is 0.
  status: 0 | 1;
  // The comment the run posted or tried to post, if it got that far and the bot had not
  // commented already.
  comment?: string;
  errors: string[];
}

// Answers one report issue. It reads the issue, its comments, and the entry ids, then
// comments and closes the issue: as completed when `parseReport` takes the report, and
// as not planned with the problem when it refuses it. When the bot already commented,
// as a run whose close failed did, it sends the close alone. The comment puts each value
// taken from the issue in a code span, so it cannot link or mention anyone. A failed
// read sends nothing, a failed comment sends no close, and either failure, or a failed
// close, makes the status 1.
export async function answerReport(options: ReportAnswerOptions): Promise<ReportRunResult> {
  const { root, fetch, indexRepo, issue } = options;
  const github = githubClient(fetch);
  const issueUrl = `${API}/repos/${indexRepo}/issues/${issue}`;
  let body: string;
  let labels: string[];
  let ids: Set<string>;
  let answered: boolean;
  try {
    const record = (await github.json(issueUrl)) as { body?: unknown; labels?: unknown };
    body = typeof record?.body === "string" ? record.body : "";
    labels = (Array.isArray(record?.labels) ? record.labels : [])
      .map((label) => (typeof label === "string" ? label : label?.name))
      .filter((name): name is string => typeof name === "string");
    const comments = (await github.pages(`${issueUrl}/comments?per_page=100`)) as { user?: { login?: unknown } | null }[];
    answered = comments.some((comment) => comment?.user?.login === REPORT_BOT);
    ids = await entryIds(root);
  } catch (error) {
    return { status: 1, errors: [(error as Error).message] };
  }

  const parsed = parseReport(body, labels, ids);
  let comment: string;
  let close: "completed" | "not_planned";
  if (parsed.ok) {
    const { plugin, version, zoteroMajor, verdict } = parsed.report;
    comment = [
      `The bot took this report: ${code(plugin)} version ${code(version)} ${verdict === "works" ? "works" : "is broken"} on Zotero ${code(String(zoteroMajor))}.`,
      "",
      "The index shows report counts on its plugin pages. It counts this report only while it reads that plugin version, and once per GitHub account for each plugin and Zotero major.",
    ].join("\n");
    close = "completed";
  } else {
    comment = `The bot did not take this report.\n\n\`${parsed.problem}\`: ${code(parsed.message)}`;
    close = "not_planned";
  }
  try {
    if (!answered) await github.post(`${issueUrl}/comments`, { body: comment });
    await github.patch(issueUrl, { state: "closed", state_reason: close });
  } catch (error) {
    return { status: 1, ...(answered ? {} : { comment }), errors: [(error as Error).message] };
  }
  return { status: 0, ...(answered ? {} : { comment }), errors: [] };
}

// The most report issues one sweep answers.
export const SWEEP_LIMIT = 20;

export interface ReportSweepOptions {
  root: string;
  fetch: Fetch;
  indexRepo: string;
  now: number;
}

export interface ReportSweepResult {
  // 1 when the list read failed or any answer had status 1.
  status: 0 | 1;
  // Each issue the sweep answered, in turn, with its result.
  answered: { issue: number; result: ReportRunResult }[];
  errors: string[];
}

// Answers, in turn, each report issue that no run of `report-issue.yml` answered, as
// `unansweredIssues` picks them, at most SWEEP_LIMIT. A failed answer does not stop the
// sweep, so the rest are still answered.
export async function sweepReports(options: ReportSweepOptions): Promise<ReportSweepResult> {
  const { root, fetch, indexRepo, now } = options;
  let issues: number[];
  try {
    issues = await unansweredIssues({ fetch, indexRepo, label: "report", workflow: "report-issue.yml", limit: SWEEP_LIMIT, now });
  } catch (error) {
    return { status: 1, answered: [], errors: [(error as Error).message] };
  }
  const answered: ReportSweepResult["answered"] = [];
  for (const issue of issues) answered.push({ issue, result: await answerReport({ root, fetch, indexRepo, issue }) });
  const errors = answered.flatMap(({ issue, result }) => result.errors.map((error) => `issue ${issue}: ${error}`));
  return { status: answered.some(({ result }) => result.status === 1) ? 1 : 0, answered, errors };
}

// The names of the entry directories. Unlike `listEntries`, a missing directory fails,
// so a wrong path cannot refuse every report as an unknown plugin.
async function entryIds(root: string): Promise<Set<string>> {
  const entries = await readdir(root, { withFileTypes: true });
  return new Set(entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")).map((entry) => entry.name));
}
