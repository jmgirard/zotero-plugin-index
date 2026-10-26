import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { type WriteResult, writeEntry } from "../add-plugin/add-plugin.ts";
import { listEntries } from "../check/check.ts";
import type { Lookup } from "../upstream/host-guard.ts";
import { type Failure, type Fetch, githubClient, ReadFailure, readUpstream } from "../upstream/reader.ts";

const API = "https://api.github.com";
export const TOPICS = ["zotero-plugin", "zotero-addon"];
// GitHub's repository search returns at most this many results for one query.
const SEARCH_MAX = 1000;
// A refused repo is read again after this long, even when it was not pushed.
const RECHECK_MS = 30 * 24 * 60 * 60 * 1000;

export type DiscoveryFailure = Failure | Extract<WriteResult, { ok: false }>["failure"] | "unexpected-error";

// Failures that say nothing about the repo, such as a rate limit, are not recorded, so
// the next run reads the repo again.
const NOT_RECORDED = new Set<DiscoveryFailure>(["github-http-error", "request-failed", "unexpected-error"]);

// A repo that was read and refused. `pushedAt` is the repo's pushed_at at that read.
export interface StateRecord {
  pushedAt: string;
  failure: DiscoveryFailure;
  checkedAt: string;
}

// Keyed by the repo's lowercase owner/repo.
export type DiscoveryState = Record<string, StateRecord>;

export type ReadItem =
  | {
      repo: string;
      repoUrl: string;
      outcome: "written";
      id: string;
      dir: string;
      version: string;
      strictMinVersion?: string;
      strictMaxVersion?: string;
    }
  | { repo: string; repoUrl: string; outcome: "refused"; failure: DiscoveryFailure; message: string };

export interface SkippedItem {
  repo: string;
  reason: "in-index" | "in-skip-set" | "refused-before";
}

export interface Report {
  read: ReadItem[];
  skipped: SkippedItem[];
  // Candidates the run did not reach because it hit the limit or the budget.
  unread: number;
  warnings: string[];
}

export interface DiscoverOptions {
  // The entries the index has. New entries are written to outDir.
  root: string;
  outDir: string;
  fetch: Fetch;
  lookup?: Lookup;
  state: DiscoveryState;
  // Lowercase owner/repo names that are not read.
  skip: Set<string>;
  // Lowercase plugin ids that an open pull request adds. A repo with one is refused,
  // and the refusal is not recorded, since it says nothing about the repo.
  pendingIds?: Set<string>;
  // The most entries to write, and the most repos to read.
  limit: number;
  budget: number;
  now?: Date;
}

export type DiscoverResult = { ok: true; state: DiscoveryState; report: Report } | { ok: false; message: string };

interface Candidate {
  repo: string;
  repoUrl: string;
  pushedAt: string;
}

// Searches both topics and reads each repo the index does not have, newest pushed first,
// until it has written `limit` entries or read `budget` repos. A failed search ends the
// run before any read. The input state is not changed; the result carries the new one,
// which keeps records only for repos that the search found and the index lacks.
export async function discover(options: DiscoverOptions): Promise<DiscoverResult> {
  const { root, outDir, fetch, lookup, skip, limit, budget, now = new Date() } = options;
  const warnings: string[] = [];
  let candidates: Candidate[];
  try {
    candidates = await search(fetch, warnings);
  } catch (error) {
    if (error instanceof ReadFailure) return { ok: false, message: error.message };
    throw error;
  }
  let index: Awaited<ReturnType<typeof indexed>>;
  try {
    index = await indexed(root);
  } catch (error) {
    return { ok: false, message: `cannot read ${root}: ${(error as Error).message}` };
  }
  const state: DiscoveryState = {};
  for (const { repo } of candidates) {
    if (options.state[repo] && !index.repos.has(repo)) state[repo] = options.state[repo];
  }
  const report: Report = { read: [], skipped: [], unread: 0, warnings };
  let written = 0;

  for (const [at, { repo, repoUrl, pushedAt }] of candidates.entries()) {
    if (written >= limit || report.read.length >= budget) {
      report.unread = candidates.length - at;
      break;
    }
    if (index.repos.has(repo)) {
      report.skipped.push({ repo, reason: "in-index" });
      continue;
    }
    if (skip.has(repo)) {
      report.skipped.push({ repo, reason: "in-skip-set" });
      continue;
    }
    const record = state[repo];
    const age = record ? now.getTime() - Date.parse(record.checkedAt) : Number.NaN;
    if (record && record.pushedAt === pushedAt && age >= 0 && age < RECHECK_MS) {
      report.skipped.push({ repo, reason: "refused-before" });
      continue;
    }

    const refuse = (failure: DiscoveryFailure, message: string, recorded = !NOT_RECORDED.has(failure)) => {
      if (recorded) state[repo] = { pushedAt, failure, checkedAt: now.toISOString() };
      report.read.push({ repo, repoUrl, outcome: "refused", failure, message });
    };
    let read: Awaited<ReturnType<typeof readUpstream>>;
    try {
      read = await readUpstream(repoUrl, fetch, { lookup });
    } catch (error) {
      // A bug in the reader, not a fact about the repo; the run goes on.
      refuse("unexpected-error", `reading ${repoUrl} threw: ${(error as Error).message}`);
      continue;
    }
    if (!read.ok) {
      refuse(read.failure, read.message);
      continue;
    }
    const { id, version, strictMinVersion, strictMaxVersion } = read.facts;
    // Entry directories may be in another place than outDir, so writeEntry cannot see them.
    if (index.ids.has(id.toLowerCase())) {
      refuse("entry-exists", `the index already has an entry for the id ${id}`);
      continue;
    }
    if (options.pendingIds?.has(id.toLowerCase())) {
      refuse("entry-exists", `an open pull request already adds an entry for the id ${id}`, false);
      continue;
    }
    const entry = await writeEntry(outDir, read.facts);
    if (!entry.ok) {
      // An existing directory in outDir, or a failed write, is about outDir, not the repo.
      refuse(entry.failure, entry.message, entry.failure === "unsafe-id");
      continue;
    }
    delete state[repo];
    index.ids.add(id.toLowerCase());
    written++;
    report.read.push({ repo, repoUrl, outcome: "written", id, dir: entry.dir, version, strictMinVersion, strictMaxVersion });
  }
  return { ok: true, state, report };
}

interface SearchItem {
  full_name?: unknown;
  html_url?: unknown;
  pushed_at?: unknown;
}

// The union of both topics' search results, newest pushed first. The search is sorted,
// so its pages do not shift between requests as best-match order can.
async function search(fetch: Fetch, warnings: string[]): Promise<Candidate[]> {
  const github = githubClient(fetch);
  const found = new Map<string, Candidate>();
  for (const topic of TOPICS) {
    const seen = new Set<string>();
    const query = new URLSearchParams({ q: `topic:${topic}`, sort: "updated", order: "desc", per_page: "100" });
    let next: string | undefined = `${API}/search/repositories?${query}`;
    while (next) {
      if (!URL.canParse(next) || new URL(next).origin !== API) {
        throw new ReadFailure("request-failed", `the next page ${next} is not on ${API}`);
      }
      if (seen.has(next)) throw new ReadFailure("request-failed", `the next page ${next} was read before`);
      seen.add(next);
      const { body, link } = await github.get(next);
      const page = body as { total_count?: unknown; incomplete_results?: unknown; items?: unknown } | null;
      if (typeof page !== "object" || page === null || !Array.isArray(page.items)) {
        throw new ReadFailure("request-failed", `GET ${next} returned a body with no list of items`);
      }
      if (page.incomplete_results === true) {
        warnings.push(`GET ${next} returned incomplete results, so the run may miss some repos`);
      }
      if (seen.size === 1 && typeof page.total_count === "number" && page.total_count > SEARCH_MAX) {
        warnings.push(`topic:${topic} has ${page.total_count} repos, and the search returns only the first ${SEARCH_MAX}`);
      }
      for (const item of page.items as SearchItem[]) {
        const { full_name: name, html_url: repoUrl, pushed_at: pushedAt } = item ?? {};
        if (typeof name !== "string" || typeof repoUrl !== "string" || typeof pushedAt !== "string" || Number.isNaN(Date.parse(pushedAt))) {
          warnings.push(`GET ${next} returned an item with no full_name, html_url, or valid pushed_at`);
          continue;
        }
        const repo = name.toLowerCase();
        if (!found.has(repo)) found.set(repo, { repo, repoUrl, pushedAt });
      }
      next = /<([^>]+)>;\s*rel="next"/.exec(link ?? "")?.[1];
    }
  }
  return [...found.values()].sort((a, b) => Date.parse(b.pushedAt) - Date.parse(a.pushedAt) || a.repo.localeCompare(b.repo));
}

// The lowercase owner/repo names and plugin ids of the entries under root. An entry
// whose meta.json cannot be read still counts by its directory name, which is its id;
// `pnpm check` reports such entries.
async function indexed(root: string): Promise<{ repos: Set<string>; ids: Set<string> }> {
  const repos = new Set<string>();
  const ids = new Set<string>();
  for (const { name } of await listEntries(root)) {
    ids.add(name.toLowerCase());
    try {
      const meta = JSON.parse(await readFile(join(root, name, "meta.json"), "utf8"));
      const repo = repoName(meta?.repoUrl);
      if (repo) repos.add(repo);
    } catch {
      // Not readable, so only the id counts.
    }
  }
  return { repos, ids };
}

function repoName(url: unknown): string | undefined {
  if (typeof url !== "string" || !URL.canParse(url)) return undefined;
  const [owner, repo] = new URL(url).pathname.split("/").filter(Boolean);
  return owner && repo ? `${owner}/${repo.replace(/\.git$/, "")}`.toLowerCase() : undefined;
}
