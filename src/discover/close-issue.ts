import { type Fetch, githubClient } from "../upstream/reader.ts";
import { PREFIX } from "./propose.ts";

const API = "https://api.github.com";
// The account that posts the comments of a workflow run with the built-in token.
const BOT_LOGIN = "github-actions[bot]";
const ISSUE_LABEL = "add-plugin";

export interface CloseIssueOptions {
  fetch: Fetch;
  // The index repo as owner/repo, and the number of the closed pull request.
  indexRepo: string;
  pull: number;
}

export interface CloseIssueResult {
  // 1 when the bot could not read the pull request, the issue, or its comments, or could
  // not post the comment or close the issue.
  status: 0 | 1;
  // Why the run sent nothing, when it had nothing to do.
  skipped?: string;
  // The comment the run posted or tried to post.
  comment?: string;
  errors: string[];
}

// Closes the "Add a plugin" issue of a bot pull request that was closed without a merge.
// The pull request must have a head branch under discover/ in the index repo and exactly
// one `Closes #<n>` line outside code blocks. Issue n must be open, have the add-plugin
// label, and have a bot comment with the pull request's URL, and no bot comment may
// already say that the pull request was closed without a merge. Then the run comments
// and closes the issue as not planned. In any other case it sends nothing. A failed read
// sends nothing, a failed comment sends no close, and either failure, or a failed close,
// makes the status 1.
export async function closeIssue(options: CloseIssueOptions): Promise<CloseIssueResult> {
  const { fetch, indexRepo, pull: number } = options;
  const github = githubClient(fetch);
  const skip = (skipped: string): CloseIssueResult => ({ status: 0, skipped, errors: [] });

  let pull: PullJson | null;
  try {
    pull = (await github.json(`${API}/repos/${indexRepo}/pulls/${number}`)) as PullJson | null;
  } catch (error) {
    return { status: 1, errors: [(error as Error).message] };
  }
  if (pull?.merged === true || pull?.merged_at) return skip(`pull request ${number} was merged`);
  if (pull?.state !== "closed") return skip(`pull request ${number} is not closed`);
  const ref = pull.head?.ref;
  const headRepo = pull.head?.repo?.full_name;
  if (typeof ref !== "string" || !ref.startsWith(PREFIX) || typeof headRepo !== "string" || headRepo.toLowerCase() !== indexRepo.toLowerCase()) {
    return skip(`the head branch of pull request ${number} is not a ${PREFIX} branch of ${indexRepo}`);
  }
  const closes = closesLines(typeof pull.body === "string" ? pull.body : "");
  if (closes.length !== 1) return skip(`the body of pull request ${number} has ${closes.length} Closes lines outside code blocks, not 1`);
  const url = typeof pull.html_url === "string" ? pull.html_url : `https://github.com/${indexRepo}/pull/${number}`;

  const issueUrl = `${API}/repos/${indexRepo}/issues/${closes[0]}`;
  let issue: IssueJson | null;
  let comments: CommentJson[];
  try {
    issue = (await github.json(issueUrl)) as IssueJson | null;
    comments = (await github.pages(`${issueUrl}/comments?per_page=100`)) as CommentJson[];
  } catch (error) {
    return { status: 1, errors: [(error as Error).message] };
  }
  if (issue === null || typeof issue !== "object" || "pull_request" in issue) return skip(`item ${closes[0]} is a pull request`);
  if (issue.state !== "open") return skip(`issue ${closes[0]} is not open`);
  const labels = (Array.isArray(issue.labels) ? issue.labels : []).map((label) => (typeof label === "string" ? label : label?.name));
  if (!labels.includes(ISSUE_LABEL)) return skip(`issue ${closes[0]} has no ${ISSUE_LABEL} label`);
  // The URL must not run on into more digits, so pull/9 does not match pull/90.
  const named = new RegExp(`${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?!\\d)`);
  const bot = comments.flatMap((comment) => (comment?.user?.login === BOT_LOGIN && typeof comment.body === "string" && named.test(comment.body) ? [comment.body] : []));
  if (bot.length === 0) return skip(`no bot comment on issue ${closes[0]} holds ${url}`);
  if (bot.some((text) => text.includes("closed without a merge"))) {
    return skip(`a bot comment on issue ${closes[0]} already says ${url} was closed without a merge`);
  }

  const comment = `${url} was closed without a merge, so the bot closes this issue as not planned.`;
  try {
    await github.post(`${issueUrl}/comments`, { body: comment });
    await github.patch(issueUrl, { state: "closed", state_reason: "not_planned" });
  } catch (error) {
    return { status: 1, comment, errors: [(error as Error).message] };
  }
  return { status: 0, comment, errors: [] };
}

// The issue numbers of the lines that are exactly `Closes #<n>`, outside fenced code
// blocks. A fence closes on a line of the same character, at least as long, and nothing
// else.
function closesLines(body: string): number[] {
  const numbers: number[] = [];
  let fence: string | undefined;
  for (const line of body.split(/\r?\n/)) {
    if (fence) {
      const close = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(line)?.[1];
      if (close && close[0] === fence[0] && close.length >= fence.length) fence = undefined;
      continue;
    }
    const open = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (open) {
      fence = open;
      continue;
    }
    const closes = /^Closes #([1-9]\d*)$/.exec(line)?.[1];
    if (closes) numbers.push(Number(closes));
  }
  return numbers;
}

interface PullJson {
  state?: unknown;
  merged?: unknown;
  merged_at?: unknown;
  html_url?: unknown;
  body?: unknown;
  head?: { ref?: unknown; repo?: { full_name?: unknown } | null };
}

interface IssueJson {
  state?: unknown;
  labels?: unknown;
}

interface CommentJson {
  user?: { login?: unknown } | null;
  body?: unknown;
}
