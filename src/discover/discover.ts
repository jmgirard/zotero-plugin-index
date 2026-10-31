import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { type WriteResult, writeEntry } from "../add-plugin/add-plugin.ts";
import { listEntries } from "../check/check.ts";
import type { Lookup } from "../upstream/host-guard.ts";
import { type Failure, type Fetch, githubClient, ReadFailure, readUpstream } from "../upstream/reader.ts";
import { duration, READ_LIMIT_MS, withinLimit } from "../upstream/time-limit.ts";
import { plannedProblem } from "./handoff.ts";
import { type HoldReason, holdReasons, type IndexedName, ownerCreatedAt, type Source, TOPICS } from "./holds.ts";

const API = "https://api.github.com";
// GitHub's repository search returns at most this many results for one query.
const SEARCH_MAX = 1000;
// A refused repo is read again after this long, even when it was not pushed.
const RECHECK_MS = 30 * 24 * 60 * 60 * 1000;
// The time after which a run starts no repo read. The discover job stops at 30 minutes,
// so this leaves time to write the state and for the steps around it.
export const RUN_LIMIT_MS = 18 * 60 * 1000;

// The zotero-chinese plugin catalog, a JSON list of objects whose `repo` is owner/repo.
// Its maintainers add plugins by hand. It is read from the contents API, so the token
// goes only to the API host.
export const CATALOG_URL = `${API}/repos/zotero-chinese/zotero-plugins/contents/plugins.json?ref=gh-pages`;
export const CATALOG_MAX_BYTES = 8 * 1024 * 1024;
export const CATALOG_MS = 60 * 1000;
// A repo name that GitHub allows. A catalog item whose `repo` does not match is skipped.
const REPO_NAME = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
// The most repos that one GraphQL lookup request names.
const LOOKUP_BATCH = 100;

export type DiscoveryFailure =Failure | Extract<WriteResult, { ok: false }>["failure"] | "not-proposable" | "unexpected-error";

// Failures that say nothing about the repo, such as a rate limit, are not recorded, so
// the next run reads the repo again. Nor is a failure the reader marks build-level, such
// as an HTTP 429 or 5xx answer for the XPI or the update.json; draftEntry checks that
// mark, since the same failure name can be either kind. Nor is an entry that writeEntry
// could not write to outDir (`entry-exists` there, `write-failed`).
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
      // Set by discover. An issue run's entry has none.
      source?: Source;
      outcome: "written";
      id: string;
      dir: string;
      version: string;
      strictMinVersion?: string;
      strictMaxVersion?: string;
      holds: HoldReason[];
    }
  | { repo: string; repoUrl: string; source: Source; outcome: "refused"; failure: DiscoveryFailure; message: string };

export interface SkippedItem {
  repo: string;
  reason: "in-index" | "in-skip-set" | "refused-before";
}

export interface Report {
  read: ReadItem[];
  skipped: SkippedItem[];
  // Candidates the run did not reach because it hit the limit, the budget, or the time
  // limit.
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
  // The longest one repo read may take, and the time after `startedAt` from which the run
  // starts no read. `startedAt` is a performance.now() time. Its default, 0, is when the
  // process started.
  readMs?: number;
  runMs?: number;
  startedAt?: number;
  // The longest the branch-name check of a drafted entry may take.
  refCheckMs?: number;
  // The catalog to read beside the topic searches, such as CATALOG_URL; none when unset.
  // Its read stops at `catalogMs` and at `catalogMaxBytes`.
  catalog?: string;
  catalogMs?: number;
  catalogMaxBytes?: number;
}

export type DiscoverResult = { ok: true; state: DiscoveryState; report: Report } | { ok: false; message: string };

interface Candidate {
  repo: string;
  repoUrl: string;
  pushedAt: string;
  source: Source;
}

// Searches both topics, adds the repos of the catalog when `catalog` is set, and reads
// each repo the index does not have, newest pushed first, until it has written `limit`
// entries, read `budget` repos, or passed `runMs`. A failed topic search ends the run
// before any read; a failed catalog read or lookup only warns. The input state is not
// changed; the result carries the new one, which keeps each record whose repo the index
// lacks and that the run found or whose refusal is under 30 days old, so a repo that one
// run does not find, such as one whose source failed, keeps its record.
export async function discover(options: DiscoverOptions): Promise<DiscoverResult> {
  const { root, outDir, fetch, lookup, skip, limit, budget, now = new Date() } = options;
  const { readMs = READ_LIMIT_MS, runMs = RUN_LIMIT_MS, startedAt = 0, refCheckMs } = options;
  const warnings: string[] = [];
  let candidates: Candidate[];
  try {
    candidates = await search(fetch, warnings);
  } catch (error) {
    if (error instanceof ReadFailure) return { ok: false, message: error.message };
    throw error;
  }
  if (options.catalog !== undefined) {
    const { catalog, catalogMs = CATALOG_MS, catalogMaxBytes = CATALOG_MAX_BYTES } = options;
    // A name that a topic search returned needs no lookup.
    const known = new Set(candidates.map(({ repo }) => repo));
    const names = (await readCatalog(fetch, catalog, catalogMaxBytes, catalogMs, warnings)).filter((name) => !known.has(name.toLowerCase()));
    candidates = joinCandidates(candidates, await lookUp(fetch, names, "catalog", warnings));
  }
  let index: Awaited<ReturnType<typeof indexed>>;
  try {
    index = await indexed(root);
  } catch (error) {
    return { ok: false, message: `cannot read ${root}: ${(error as Error).message}` };
  }
  const state: DiscoveryState = {};
  const found = new Set(candidates.map(({ repo }) => repo));
  for (const [repo, record] of Object.entries(options.state)) {
    const age = now.getTime() - Date.parse(record?.checkedAt);
    if (!index.repos.has(repo) && (found.has(repo) || (age >= 0 && age < RECHECK_MS))) state[repo] = record;
  }
  const report: Report = { read: [], skipped: [], unread: 0, warnings };
  let written = 0;

  for (const [at, { repo, repoUrl, pushedAt, source }] of candidates.entries()) {
    if (written >= limit || report.read.length >= budget) {
      report.unread = candidates.length - at;
      break;
    }
    if (performance.now() - startedAt >= runMs) {
      report.unread = candidates.length - at;
      warnings.push(`the run reads no repo after ${duration(runMs)}, its time limit, so it did not reach ${report.unread} repos`);
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

    const drafted = await draftEntry(repoUrl, {
      fetch,
      lookup,
      outDir,
      ids: index.ids,
      names: index.names,
      pendingIds: options.pendingIds,
      readMs,
      refCheckMs,
      now,
    });
    if (!drafted.ok) {
      const { failure, message } = drafted;
      if (drafted.recorded) state[repo] = { pushedAt, failure, checkedAt: now.toISOString() };
      report.read.push({ repo, repoUrl, source, outcome: "refused", failure, message });
      continue;
    }
    const { id, dir, version, strictMinVersion, strictMaxVersion, holds } = drafted;
    delete state[repo];
    index.ids.add(id.toLowerCase());
    written++;
    // The name and URL that draftEntry checked, which can differ from the search
    // result's after a rename.
    const read = { repo: repoName(drafted.repoUrl) ?? repo, repoUrl: drafted.repoUrl };
    report.read.push({ ...read, source, outcome: "written", id, dir, version, strictMinVersion, strictMaxVersion, holds });
  }
  return { ok: true, state, report };
}

export type Drafted =
  | {
      ok: true;
      id: string;
      dir: string;
      repoUrl: string;
      version: string;
      strictMinVersion?: string;
      strictMaxVersion?: string;
      holds: HoldReason[];
    }
  // `recorded` is false for a refusal that says nothing about the repo. `buildLevel` marks a
  // refusal that usually points at the bot rather than at the repo: a reader failure that
  // the reader marks build-level, a read that threw, or an entry that writeEntry could not
  // write to outDir (`entry-exists` there, `write-failed`). A `buildLevel` refusal is never
  // recorded.
  | { ok: false; failure: DiscoveryFailure; message: string; recorded: boolean; buildLevel?: true };

export interface DraftOptions {
  fetch: Fetch;
  lookup?: Lookup;
  outDir: string;
  // The lowercase plugin ids of the index's entries, and of the entries that open pull
  // requests add.
  ids: Set<string>;
  pendingIds?: Set<string>;
  // The index's entries by owner, repo part, and name, for the `name-match` hold.
  names: IndexedName[];
  // The longest the read of the repo, and the branch-name check of its entry, may take.
  readMs?: number;
  refCheckMs?: number;
  // The time the owner's account age is measured to, and whether an issue run drafts the
  // entry, for the hold reasons.
  now?: Date;
  issueRun?: boolean;
}

// Reads one repo and writes its entry to outDir, unless the index or an open pull
// request already has its plugin id. `repoUrl` in the result is the URL GitHub gives
// for the repo. A read that passes `readMs` fails as request-failed, marked build-level.
export async function draftEntry(repoUrl: string, options: DraftOptions): Promise<Drafted> {
  const { fetch, lookup, outDir, ids, pendingIds, readMs = READ_LIMIT_MS, refCheckMs } = options;
  const refuse = (failure: DiscoveryFailure, message: string, recorded = !NOT_RECORDED.has(failure), buildLevel = false): Drafted => ({
    ok: false,
    failure,
    message,
    recorded,
    ...(buildLevel && { buildLevel: true }),
  });
  let read: Awaited<ReturnType<typeof readUpstream>>;
  try {
    read = await withinLimit(readMs, (signal) => readUpstream(repoUrl, fetch, { lookup, signal }));
  } catch (error) {
    // A bug in the reader, not a fact about the repo.
    return refuse("unexpected-error", `reading ${repoUrl} threw: ${(error as Error).message}`, false, true);
  }
  if (!read.ok) return refuse(read.failure, read.message, !read.buildLevel && !NOT_RECORDED.has(read.failure), read.buildLevel);
  const { id, version, strictMinVersion, strictMaxVersion } = read.facts;
  // Entry directories may be in another place than outDir, so writeEntry cannot see them.
  if (ids.has(id.toLowerCase())) return refuse("entry-exists", `the index already has an entry for the id ${id}`);
  if (pendingIds?.has(id.toLowerCase())) {
    return refuse("entry-exists", `an open pull request already adds an entry for the id ${id}`, false);
  }
  const entry = await writeEntry(outDir, read.facts);
  // An existing directory in outDir, or a failed write, is about outDir, not the repo, so
  // it is not recorded and is marked build-level.
  if (!entry.ok) {
    const unsafe = entry.failure === "unsafe-id";
    return refuse(entry.failure, entry.message, unsafe, !unsafe);
  }
  const repo = repoName(read.facts.repoUrl);
  const holds = repo
    ? holdReasons({
        repo,
        name: read.facts.name,
        updateHost: read.facts.updateHost,
        topics: read.topics,
        issueRun: options.issueRun ?? false,
        ownerCreatedAt: await ownerCreatedAt(fetch, repo.split("/")[0]),
        now: options.now ?? new Date(),
        indexed: options.names,
      })
    : [];
  // `pnpm propose` refuses a handoff with an entry it cannot push, so such a repo is
  // refused here, and recorded.
  let problem: string | undefined;
  try {
    problem = repo
      ? await plannedProblem({ repo, repoUrl: read.facts.repoUrl, id, version, strictMinVersion, strictMaxVersion, holds }, entry.dir, refCheckMs)
      : `${read.facts.repoUrl} names no owner/repo`;
  } catch (error) {
    await rm(entry.dir, { recursive: true, force: true });
    return refuse("unexpected-error", `checking the entry of ${read.facts.repoUrl} threw: ${(error as Error).message}`);
  }
  if (problem) {
    await rm(entry.dir, { recursive: true, force: true });
    return refuse("not-proposable", `the bot cannot propose ${read.facts.repoUrl}: ${problem}`);
  }
  return { ok: true, id, dir: entry.dir, repoUrl: read.facts.repoUrl, version, strictMinVersion, strictMaxVersion, holds };
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
        if (!found.has(repo)) found.set(repo, { repo, repoUrl, pushedAt, source: "topic" });
      }
      next = /<([^>]+)>;\s*rel="next"/.exec(link ?? "")?.[1];
    }
  }
  return newestFirst([...found.values()]);
}

function newestFirst(candidates: Candidate[]): Candidate[] {
  return candidates.sort((a, b) => Date.parse(b.pushedAt) - Date.parse(a.pushedAt) || a.repo.localeCompare(b.repo));
}

// Adds the repos that another source found to `candidates`, keyed by the lowercase name
// that the lookup returned, so a repo that a source earlier in the order names keeps that
// source.
function joinCandidates(candidates: Candidate[], found: Candidate[]): Candidate[] {
  const joined = new Map(candidates.map((candidate) => [candidate.repo, candidate]));
  for (const candidate of found) if (!joined.has(candidate.repo)) joined.set(candidate.repo, candidate);
  return newestFirst([...joined.values()]);
}

// The owner/repo names that the catalog lists. A failed read warns and gives no names, and
// an item with no usable name warns and is skipped.
async function readCatalog(fetch: Fetch, url: string, max: number, ms: number, warnings: string[]): Promise<string[]> {
  let items: unknown;
  try {
    const text = await githubClient(fetch).raw(url, max, ms);
    try {
      items = JSON.parse(text);
    } catch (error) {
      throw new ReadFailure("request-failed", `GET ${url} returned a body that is not JSON: ${(error as Error).message}`);
    }
    if (!Array.isArray(items)) throw new ReadFailure("request-failed", `GET ${url} returned a body that is not a list`);
  } catch (error) {
    if (!(error instanceof ReadFailure)) throw error;
    warnings.push(`the run reads no repo from the catalog, since its read failed: ${error.message}`);
    return [];
  }
  const names: string[] = [];
  for (const [at, item] of items.entries()) {
    const repo = typeof item === "object" && item !== null ? (item as { repo?: unknown }).repo : undefined;
    if (typeof repo === "string" && REPO_NAME.test(repo)) {
      names.push(repo);
    } else {
      warnings.push(`catalog item ${at} has no owner/repo name, so the run skips it: ${JSON.stringify(item)?.slice(0, 200)}`);
    }
  }
  return names;
}

interface LookupAnswer {
  data?: Record<string, { nameWithOwner?: unknown; url?: unknown; pushedAt?: unknown } | null> | null;
  errors?: { type?: unknown; path?: unknown; message?: unknown }[];
}

// Asks GitHub's GraphQL API for the current name, URL, and pushed_at of each repo named,
// LOOKUP_BATCH repos to a request. The names go in as variables, so no name changes the
// query. A repo that GitHub does not have, one with no pushed_at, and each repo of a
// failed request get no candidate. A failed request gets one warning for all its repos,
// and each other such repo one warning.
async function lookUp(fetch: Fetch, names: string[], source: Source, warnings: string[]): Promise<Candidate[]> {
  const github = githubClient(fetch);
  const unique = [...new Map(names.map((name) => [name.toLowerCase(), name])).values()];
  const found: Candidate[] = [];
  for (let start = 0; start < unique.length; start += LOOKUP_BATCH) {
    const batch = unique.slice(start, start + LOOKUP_BATCH);
    const variables: Record<string, string> = {};
    const fields = batch.map((name, i) => {
      [variables[`o${i}`], variables[`n${i}`]] = name.split("/");
      return `r${i}: repository(owner: $o${i}, name: $n${i}) { nameWithOwner url pushedAt }`;
    });
    const declared = batch.map((_, i) => `$o${i}: String!, $n${i}: String!`).join(", ");
    const query = `query(${declared}) { ${fields.join(" ")} }`;
    const failed = (why: string) =>
      warnings.push(`the run reads none of ${batch.length} ${source} repos from ${batch[0]}, since their lookup failed: ${why}`);
    let answer: LookupAnswer;
    try {
      answer = (await github.post(`${API}/graphql`, { query, variables })) as LookupAnswer;
    } catch (error) {
      if (!(error instanceof ReadFailure)) throw error;
      failed(error.message);
      continue;
    }
    const errors = Array.isArray(answer?.errors) ? answer.errors : [];
    const data = answer?.data;
    if (typeof data !== "object" || data === null) {
      failed(`the answer has no data${errors.length ? `: ${errors.map((error) => String(error?.message)).join("; ")}` : ""}`);
      continue;
    }
    for (const [i, name] of batch.entries()) {
      const repo = data[`r${i}`];
      if (repo === null || repo === undefined) {
        const error = errors.find((each) => Array.isArray(each?.path) && each.path[0] === `r${i}`);
        warnings.push(
          error?.type === "NOT_FOUND"
            ? `GitHub has no repo ${name}, which the ${source} names, so the run does not read it`
            : `the lookup of ${name} failed, so the run does not read it: ${error ? String(error.message) : "no answer"}`,
        );
        continue;
      }
      const { nameWithOwner, url, pushedAt } = repo;
      if (typeof nameWithOwner !== "string" || typeof url !== "string" || typeof pushedAt !== "string" || Number.isNaN(Date.parse(pushedAt))) {
        warnings.push(`the lookup of ${name} gave no name, URL, or valid pushed_at, so the run does not read it`);
        continue;
      }
      found.push({ repo: nameWithOwner.toLowerCase(), repoUrl: url, pushedAt, source });
    }
  }
  return found;
}

// The plugin ids of the entries under root by their lowercase owner/repo names, the
// lowercase ids, and each entry's owner, repo part, and name. An entry whose meta.json
// cannot be read still counts by its directory name, which is its id; `pnpm check`
// reports such entries.
export async function indexed(root: string): Promise<{ repos: Map<string, string>; ids: Set<string>; names: IndexedName[] }> {
  const repos = new Map<string, string>();
  const ids = new Set<string>();
  const names: IndexedName[] = [];
  for (const { name } of await listEntries(root)) {
    ids.add(name.toLowerCase());
    try {
      const meta = JSON.parse(await readFile(join(root, name, "meta.json"), "utf8"));
      const repo = repoName(meta?.repoUrl);
      if (!repo) continue;
      repos.set(repo, name);
      const [owner, repoPart] = repo.split("/");
      names.push({ owner, repoPart, ...(typeof meta.name === "string" && { name: meta.name }) });
    } catch {
      // Not readable, so only the id counts.
    }
  }
  return { repos, ids, names };
}

// The lowercase owner/repo of a URL, from the first two parts of its path, on any host.
export function repoName(url: unknown): string | undefined {
  if (typeof url !== "string" || !URL.canParse(url)) return undefined;
  const [owner, repo] = new URL(url).pathname.split("/").filter(Boolean);
  return owner && repo ? `${owner}/${repo.replace(/\.git$/, "")}`.toLowerCase() : undefined;
}
