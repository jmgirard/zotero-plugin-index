import { readdir } from "node:fs/promises";
import { code } from "../discover/propose.ts";
import { type Fetch, githubClient } from "../upstream/reader.ts";
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
  // The comment the run posted or tried to post, if it got that far.
  comment?: string;
  errors: string[];
}

// Answers one report issue. It reads the issue and the entry ids, then comments and
// closes the issue: as completed when `parseReport` takes the report, and as not planned
// with the problem when it refuses it. The comment puts each value taken from the issue
// in a code span, so it cannot link or mention anyone. A failed read sends nothing, a
// failed comment sends no close, and either failure, or a failed close, makes the
// status 1.
export async function answerReport(options: ReportAnswerOptions): Promise<ReportRunResult> {
  const { root, fetch, indexRepo, issue } = options;
  const github = githubClient(fetch);
  const issueUrl = `${API}/repos/${indexRepo}/issues/${issue}`;
  let body: string;
  let labels: string[];
  let ids: Set<string>;
  try {
    const record = (await github.json(issueUrl)) as { body?: unknown; labels?: unknown };
    body = typeof record?.body === "string" ? record.body : "";
    labels = (Array.isArray(record?.labels) ? record.labels : []).map((label) => (typeof label === "string" ? label : label?.name));
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
      `The bot took this report: ${code(plugin)} version ${code(version)} ${verdict} on Zotero ${code(String(zoteroMajor))}.`,
      "",
      "The report counts only while the index reads that plugin version, and once per GitHub account for each plugin and Zotero major.",
    ].join("\n");
    close = "completed";
  } else {
    comment = `The bot did not take this report.\n\n\`${parsed.problem}\`: ${code(parsed.message)}`;
    close = "not_planned";
  }
  try {
    await github.post(`${issueUrl}/comments`, { body: comment });
    await github.patch(issueUrl, { state: "closed", state_reason: close });
  } catch (error) {
    return { status: 1, comment, errors: [(error as Error).message] };
  }
  return { status: 0, comment, errors: [] };
}

// The names of the entry directories. Unlike `listEntries`, a missing directory fails,
// so a wrong path cannot refuse every report as an unknown plugin.
async function entryIds(root: string): Promise<Set<string>> {
  const entries = await readdir(root, { withFileTypes: true });
  return new Set(entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")).map((entry) => entry.name));
}
