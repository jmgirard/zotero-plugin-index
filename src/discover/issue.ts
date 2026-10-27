import { rm } from "node:fs/promises";
import type { Lookup } from "../upstream/host-guard.ts";
import { type Fetch, githubClient } from "../upstream/reader.ts";
import { draftEntry, indexed, repoName } from "./discover.ts";
import { type IssueOutcome, MESSAGE_MAX, planned, plannableRepo } from "./handoff.ts";
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

export interface IssueReadOptions {
  // The index's entries, and where the new entry is drafted.
  root: string;
  outDir: string;
  fetch: Fetch;
  lookup?: Lookup;
  // The index repo as owner/repo.
  indexRepo: string;
  // The issue's body.
  body: string;
}

// The read step of an issue run, which makes no GitHub write. If the body names a repo
// that the index or a bot pull request already has, it reads nothing. If the parser or
// draftEntry refuses, the outcome names the failure; that includes a GitHub HTTP 404
// for a repo that does not exist. If the read of the repo stops with a failure that the
// reader marks build-level, such as a rate limit, or throws, or the check of the drafted
// entry throws, the outcome is `failed` with the failure name, so the write step leaves
// the issue open and the run fails. If the bot cannot read the index, its pull requests,
// or the default branch, the outcome is `failed` too.
// A message is cut to what a comment quotes, so a long one cannot make the handoff too
// large for the write step.
export async function issueRead(options: IssueReadOptions): Promise<IssueOutcome> {
  const outcome = await readOutcome(options);
  if (outcome.outcome === "refused" || outcome.outcome === "failed") {
    return { ...outcome, message: outcome.message.slice(0, MESSAGE_MAX + 1) || "no message" };
  }
  return outcome;
}

async function readOutcome(options: IssueReadOptions): Promise<IssueOutcome> {
  const { root, fetch, indexRepo } = options;
  const parsed = parseIssueBody(options.body);
  if (!parsed.ok) return { outcome: "refused", failure: parsed.problem, message: parsed.message };
  let index: Awaited<ReturnType<typeof indexed>>;
  try {
    index = await indexed(root);
  } catch (error) {
    return { outcome: "failed", message: `cannot read ${root}: ${(error as Error).message}` };
  }
  let pulls: BotPulls;
  try {
    pulls = await botPulls(fetch, indexRepo);
    // Read here too, so a failure ends the run before the repo is read.
    await defaultBranch(fetch, indexRepo);
  } catch (error) {
    // Any error here is the bot's, so the issue gets an answer either way.
    return { outcome: "failed", message: (error as Error).message };
  }
  // A name of a shape the handoff refuses is never `known`: the read goes on, and
  // draftEntry refuses such a repo as not-proposable.
  const known = (name: string | undefined) => !!name && plannableRepo(name) && (index.repos.has(name) || pulls.pulls.has(name));
  const given = githubRepo(parsed.url);
  if (known(given)) return { outcome: "known", repo: given! };

  const drafted = await draftEntry(parsed.url, { ...options, ids: index.ids, pendingIds: pulls.ids });
  if (!drafted.ok) {
    const { failure, message } = drafted;
    // A rate limit, an outage, or an entry check that throws says nothing about the
    // plugin, so the issue stays open.
    const failed = drafted.buildLevel || failure === "unexpected-error";
    return failed ? { outcome: "failed", failure, message } : { outcome: "refused", failure, message };
  }
  // A renamed repo answers for its old name, and GitHub gives its new one. The reader
  // read the given URL, so it is a GitHub repo URL.
  const repo = repoName(drafted.repoUrl) ?? given!;
  if (known(repo)) {
    // The handoff holds only the entries it plans.
    await rm(drafted.dir, { recursive: true, force: true });
    return { outcome: "known", repo };
  }
  return { outcome: "entry", entry: planned({ ...drafted, repo }) };
}

export interface IssueAnswerOptions {
  // The index's entries.
  root: string;
  fetch: Fetch;
  // The index repo as owner/repo, and a checkout of it whose remote takes the push.
  indexRepo: string;
  gitDir: string;
  remote?: string;
  check: CheckRunner;
  // The issue's number, and the read step's outcome with the drafted entry's directory,
  // or undefined when the read step left no handoff.
  issue: number;
  read: { outcome: IssueOutcome; dir?: string } | undefined;
}

export interface IssueRunResult {
  // 1 when the bot itself failed (see `failed` below), or could not post the comment or
  // close the issue. A refusal is 0.
  status: 0 | 1;
  // The comment the run posted or tried to post.
  comment: string;
  errors: string[];
}

// The write step of an issue run. It checks the bot pull requests again by repo and
// plugin id, since they can change while the read step runs, and the index in its
// checkout, which is the commit the read step saw. Then it opens a pull request that
// closes the issue when it merges, or closes the issue. Each answer is a comment on the
// issue. If the read step failed, a build-level or thrown read of the repo and a thrown
// check of the drafted entry included, or
// the bot cannot read the index, its pull requests, or the default branch, or the push
// or the pull request fails, the comment says so and the issue stays open, and the
// status is 1.
export async function issueAnswer(options: IssueAnswerOptions): Promise<IssueRunResult> {
  const { root, fetch, indexRepo, issue, read } = options;
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
  // The messages can hold text from the issue, so they go in code spans, cut short so
  // the comment stays far below GitHub's limit of 65,536 characters.
  const quoted = (message: string) => code(message.length > MESSAGE_MAX ? `${message.slice(0, MESSAGE_MAX)}…` : message);
  const refuse = (name: string, message: string) =>
    answer(`The bot opened no pull request for this issue.\n\n\`${name}\`: ${quoted(message)}`, "not_planned");
  const failed = (message: string, failure?: string) => {
    errors.push(message);
    const named = failure ? `\`${failure}\`: ${quoted(message)}` : quoted(message);
    return answer(`The bot could not finish, so this issue stays open for a maintainer.\n\n${named}`);
  };

  if (!read) return failed("the read step left no handoff");
  const { outcome } = read;
  if (outcome.outcome === "failed") return failed(outcome.message, outcome.failure);
  if (outcome.outcome === "refused") return refuse(outcome.failure, outcome.message);
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
    return failed((error as Error).message);
  }
  // The entry or the bot pull request that already has the repo `name`.
  const known = (name: string) => {
    const entry = index.repos.get(name);
    if (entry) return answer(`The index already lists this repo in the entry \`plugins/${entry}/\`.`, "completed");
    const pull = pulls.pulls.get(name);
    if (!pull) return undefined;
    return answer(
      pull.open
        ? `The bot already proposed this repo in ${pull.url}.`
        : `The bot proposed this repo in ${pull.url}, which was closed without a merge, so the bot does not propose it again.`,
      "not_planned",
    );
  };

  if (outcome.outcome === "known") {
    return known(outcome.repo) ?? failed(`the read step found ${outcome.repo} in the index or a bot pull request, and the write step does not`);
  }
  const { entry } = outcome;
  const given = known(entry.repo);
  if (given) return given;
  const id = entry.id.toLowerCase();
  if (index.ids.has(id)) return refuse("entry-exists", `the index already has an entry for the id ${entry.id}`);
  if (pulls.ids.has(id)) return refuse("entry-exists", `an open pull request already adds an entry for the id ${entry.id}`);

  const written: Written = { ...entry, outcome: "written", dir: read.dir! };
  const result = await propose({ ...options, base, written: [written], issue });
  if (result.failed.length > 0) return failed(result.failed[0].message);
  const { url, branch } = result.proposed[0];
  // The create request's answer can lack the URL; the branch still names the pull request.
  // `pnpm close-issue` closes the issue only when this comment holds the URL.
  if (!url) return answer(`The bot opened a pull request from the branch \`${branch}\`. This issue closes when that pull request merges.`);
  return answer(
    `The bot opened ${url}. This issue closes when that pull request merges. If that pull request is closed without a merge, the bot closes this issue as not planned.`,
  );
}

// The lowercase owner/repo of a URL on github.com, which the reader would read.
function githubRepo(url: string): string | undefined {
  if (!URL.canParse(url) || !["github.com", "www.github.com"].includes(new URL(url).host)) return undefined;
  return repoName(url);
}
