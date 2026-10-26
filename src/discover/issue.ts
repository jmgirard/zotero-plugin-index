import type { Lookup } from "../upstream/host-guard.ts";
import { type Fetch, githubClient, ReadFailure } from "../upstream/reader.ts";
import { draftEntry, indexed, repoName } from "./discover.ts";
import { type BotPulls, botPulls, type CheckRunner, code, defaultBranch, propose, type Written } from "./propose.ts";

const API = "https://api.github.com";

// The label of the URL input in .github/ISSUE_TEMPLATE/add-plugin.yml. GitHub writes each
// input of a form into the issue body as a level-3 heading with the label, then the value.
export const URL_LABEL = "Repository URL";

export type ParseResult = { ok: true; url: string } | { ok: false; problem: "no-url-heading" | "no-response"; message: string };

// Returns the first non-empty line under the URL heading, trimmed. Whether that line is
// a GitHub repo URL is for the reader to judge.
export function parseIssueBody(body: string): ParseResult {
  const lines = body.split(/\r?\n/);
  const heading = lines.findIndex((line) => line.trim() === `### ${URL_LABEL}`);
  if (heading === -1) {
    return { ok: false, problem: "no-url-heading", message: `the issue body has no "### ${URL_LABEL}" heading` };
  }
  const rest = lines.slice(heading + 1);
  const end = rest.findIndex((line) => line.startsWith("### "));
  const value = (end === -1 ? rest : rest.slice(0, end)).map((line) => line.trim()).find(Boolean);
  // GitHub writes _No response_ for an empty field.
  if (!value || value === "_No response_") {
    return { ok: false, problem: "no-response", message: `the "${URL_LABEL}" field is empty` };
  }
  return { ok: true, url: value };
}

export interface IssueRunOptions {
  // The index's entries, and where the new entry is written.
  root: string;
  outDir: string;
  fetch: Fetch;
  lookup?: Lookup;
  // The index repo as owner/repo, and a checkout of it whose remote takes the push.
  indexRepo: string;
  gitDir: string;
  remote?: string;
  check: CheckRunner;
  // The issue's number and body.
  issue: number;
  body: string;
}

export interface IssueRunResult {
  // 1 when the bot itself failed (see `failed` below), or could not post the comment or
  // close the issue. A refusal is 0.
  status: 0 | 1;
  // The comment the run posted or tried to post.
  comment: string;
  errors: string[];
}

// Answers one issue opened from add-plugin.yml. If the body names a repo that the index
// or a bot pull request already has, the run reads nothing. If the parser or draftEntry
// refuses, the run closes the issue as not planned; that includes a GitHub request error
// while the reader reads the repo. If the run drafts the entry, it opens a pull request
// that closes the issue when it merges. Each answer is a comment on the issue. If the
// bot cannot read the index, its pull requests, or the default branch, or the push or
// the pull request fails, the comment says so and the issue stays open.
export async function issueRun(options: IssueRunOptions): Promise<IssueRunResult> {
  const { root, fetch, indexRepo, issue } = options;
  const github = githubClient(fetch);
  const issueUrl = `${API}/repos/${indexRepo}/issues/${issue}`;
  const errors: string[] = [];
  const answer = async (comment: string, close?: "completed" | "not_planned"): Promise<IssueRunResult> => {
    try {
      await github.post(`${issueUrl}/comments`, { body: comment });
      if (close) await github.patch(issueUrl, { state: "closed", state_reason: close });
    } catch (error) {
      errors.push((error as Error).message);
    }
    return { status: errors.length > 0 ? 1 : 0, comment, errors };
  };
  // The messages can hold text from the issue, so they go in code spans.
  const refuse = (name: string, message: string) =>
    answer(`The bot opened no pull request for this issue.\n\n\`${name}\`: ${code(message)}`, "not_planned");
  const failed = (message: string) => {
    errors.push(message);
    return answer(`The bot could not finish, so this issue stays open for a maintainer.\n\n${code(message)}`);
  };
  // The entry or the bot pull request that already has the repo `name`.
  const known = (name: string | undefined) => {
    const entry = name && index.repos.get(name);
    if (entry) return answer(`The index already lists this repo in the entry \`plugins/${entry}/\`.`, "completed");
    const pull = name && pulls.pulls.get(name);
    if (!pull) return undefined;
    return answer(
      pull.open
        ? `The bot already proposed this repo in ${pull.url}.`
        : `The bot proposed this repo in ${pull.url}, which was closed without a merge, so the bot does not propose it again.`,
      "not_planned",
    );
  };

  const parsed = parseIssueBody(options.body);
  if (!parsed.ok) return refuse(parsed.problem, parsed.message);
  let index: Awaited<ReturnType<typeof indexed>>;
  try {
    index = await indexed(root);
  } catch (error) {
    return failed(`cannot read ${root}: ${(error as Error).message}`);
  }
  let pulls: BotPulls;
  let base: string;
  try {
    pulls = await botPulls(fetch, indexRepo);
    base = await defaultBranch(fetch, indexRepo);
  } catch (error) {
    if (error instanceof ReadFailure) return failed(error.message);
    throw error;
  }
  const given = await known(githubRepo(parsed.url));
  if (given) return given;

  const drafted = await draftEntry(parsed.url, { ...options, ids: index.ids, pendingIds: pulls.ids });
  if (!drafted.ok) return refuse(drafted.failure, drafted.message);
  // A renamed repo answers for its old name, and GitHub gives its new one. The reader
  // read the given URL, so it is a GitHub repo URL.
  const repo = repoName(drafted.repoUrl) ?? githubRepo(parsed.url)!;
  const renamed = await known(repo);
  if (renamed) return renamed;

  const { id, dir, repoUrl, version, strictMinVersion, strictMaxVersion } = drafted;
  const written: Written = { repo, repoUrl, outcome: "written", id, dir, version, strictMinVersion, strictMaxVersion };
  const result = await propose({ ...options, base, written: [written] });
  if (result.failed.length > 0) return failed(result.failed[0].message);
  return answer(`The bot opened ${result.proposed[0].url}. This issue closes when that pull request merges.`);
}

// The lowercase owner/repo of a URL on github.com, which the reader would read.
function githubRepo(url: string): string | undefined {
  if (!URL.canParse(url) || !["github.com", "www.github.com"].includes(new URL(url).host)) return undefined;
  return repoName(url);
}
