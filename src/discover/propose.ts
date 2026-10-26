import { execFile, spawn } from "node:child_process";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import type { Lookup } from "../upstream/host-guard.ts";
import { type Fetch, githubClient, ReadFailure } from "../upstream/reader.ts";
import { type DiscoverResult, type DiscoveryState, discover, indexed, type ReadItem } from "./discover.ts";

const API = "https://api.github.com";
// The bot's branches are `discover/<owner>/<repo>`, lowercase.
const PREFIX = "discover/";
// The github-actions[bot] account's name and noreply email, so GitHub links the commits
// to that account.
const BOT = { name: "github-actions[bot]", email: "41898282+github-actions[bot]@users.noreply.github.com" };

const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");

const run = promisify(execFile);

export type Written = Extract<ReadItem, { outcome: "written" }>;

// Runs `pnpm check` on a directory and returns its exit status and output.
export type CheckRunner = (dir: string) => Promise<{ status: number; output: string }>;

// Runs `pnpm check <dir>` with the pnpm that runs this command, and returns its exit
// status and its output, stderr after stdout. The check needs no GitHub token, so it
// gets none.
export const pnpmCheck: CheckRunner = (dir) =>
  new Promise((resolveCheck, reject) => {
    const { GITHUB_TOKEN: _token, ...env } = process.env;
    const child = spawn(process.env.npm_execpath ?? "pnpm", ["--silent", "--dir", PACKAGE_ROOT, "check", dir], {
      stdio: ["ignore", "pipe", "pipe"],
      env,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => resolveCheck({ status: code ?? 1, output: stdout + stderr }));
  });

export interface Proposed {
  repo: string;
  id: string;
  branch: string;
  url: string;
}

export interface ProposeFailure {
  repo: string;
  id: string;
  message: string;
}

export interface DiscoverReadOptions {
  // As for discover: the index's entries, and where new entries are written.
  root: string;
  outDir: string;
  fetch: Fetch;
  lookup?: Lookup;
  state: DiscoveryState;
  limit: number;
  budget: number;
  now?: Date;
  // The index repo as owner/repo.
  indexRepo: string;
}

// The read step of a discover run, which makes no GitHub write. It reads the index
// repo's bot pull requests and runs discovery with each repo whose bot pull request is
// open or was closed without a merge in the skip set. A failed pull-request read ends
// the run before discovery reads.
export async function discoverRead(options: DiscoverReadOptions): Promise<DiscoverResult> {
  let pulls: BotPulls;
  try {
    pulls = await botPulls(options.fetch, options.indexRepo);
  } catch (error) {
    if (error instanceof ReadFailure) return { ok: false, message: error.message };
    throw error;
  }
  return discover({ ...options, skip: pulls.skip, pendingIds: pulls.ids });
}

export interface ProposeHandoffOptions {
  // The index's entries.
  root: string;
  fetch: Fetch;
  // The index repo as owner/repo, and a checkout of it whose remote takes the pushes.
  indexRepo: string;
  gitDir: string;
  remote?: string;
  check: CheckRunner;
  // The entries of a checked discover handoff.
  entries: Written[];
}

export interface SkippedEntry {
  repo: string;
  id: string;
  reason: "in-index" | "in-bot-pull";
}

export type ProposeHandoffResult =
  | { ok: true; proposed: Proposed[]; failed: ProposeFailure[]; skipped: SkippedEntry[] }
  | { ok: false; message: string };

// The write step of a discover run. It checks the index and the bot pull requests again
// by repo and plugin id, since they can change while the read step runs, and opens one
// pull request for each entry neither has. A failed read of the index, the pull
// requests, or the default branch ends the run before any push; a failure for one entry
// is reported, and the run goes on.
export async function proposeHandoff(options: ProposeHandoffOptions): Promise<ProposeHandoffResult> {
  const { root, fetch, indexRepo, entries } = options;
  let index: Awaited<ReturnType<typeof indexed>>;
  try {
    index = await indexed(root);
  } catch (error) {
    return { ok: false, message: `cannot read ${root}: ${(error as Error).message}` };
  }
  let pulls: BotPulls;
  let base: string;
  try {
    pulls = await botPulls(fetch, indexRepo);
    base = await defaultBranch(fetch, indexRepo);
  } catch (error) {
    if (error instanceof ReadFailure) return { ok: false, message: error.message };
    throw error;
  }
  const skipped: SkippedEntry[] = [];
  const written: Written[] = [];
  for (const entry of entries) {
    const { repo, id } = entry;
    if (index.repos.has(repo) || index.ids.has(id.toLowerCase())) skipped.push({ repo, id, reason: "in-index" });
    else if (pulls.skip.has(repo) || pulls.ids.has(id.toLowerCase())) skipped.push({ repo, id, reason: "in-bot-pull" });
    else written.push(entry);
  }
  const { proposed, failed } = await propose({ ...options, base, written });
  return { ok: true, proposed, failed, skipped };
}

export interface BotPulls {
  // The lowercase owner/repo of each bot pull request that is open or was closed without
  // a merge. A merged one's entry is in the index, which discovery reads.
  skip: Set<string>;
  // The same pull requests by owner/repo, with their URLs.
  pulls: Map<string, { url: string; open: boolean }>;
  // The lowercase plugin ids whose entry directories the open ones add, so another repo
  // with the same id is not proposed beside them.
  ids: Set<string>;
}

// A pull request from a fork is not the bot's, whatever its branch is named.
export async function botPulls(fetch: Fetch, indexRepo: string): Promise<BotPulls> {
  const github = githubClient(fetch);
  const list = (await github.pages(`${API}/repos/${indexRepo}/pulls?state=all&per_page=100`)) as PullJson[];
  const skip = new Set<string>();
  const pulls = new Map<string, { url: string; open: boolean }>();
  const ids = new Set<string>();
  for (const pull of list) {
    const ref = pull?.head?.ref;
    const headRepo = pull?.head?.repo?.full_name;
    if (typeof ref !== "string" || !ref.startsWith(PREFIX)) continue;
    if (typeof headRepo !== "string" || headRepo.toLowerCase() !== indexRepo.toLowerCase()) continue;
    const parts = ref.slice(PREFIX.length).split("/");
    if (parts.length !== 2 || !parts[0] || !parts[1]) continue;
    if (pull.state === "open" || (pull.state === "closed" && !pull.merged_at)) {
      const repo = parts.join("/").toLowerCase();
      skip.add(repo);
      const url = typeof pull.html_url === "string" ? pull.html_url : `https://github.com/${indexRepo}/pull/${pull.number}`;
      // An open one wins over a closed one for the same repo, whatever the list order.
      if (!pulls.get(repo)?.open) pulls.set(repo, { url, open: pull.state === "open" });
    }
    if (pull.state !== "open") continue;
    const files = (await github.pages(`${API}/repos/${indexRepo}/pulls/${pull.number}/files?per_page=100`)) as {
      filename?: unknown;
    }[];
    for (const { filename } of files) {
      const id = typeof filename === "string" ? /^plugins\/([^/]+)\//.exec(filename)?.[1] : undefined;
      if (id) ids.add(id.toLowerCase());
    }
  }
  return { skip, pulls, ids };
}

interface PullJson {
  number?: unknown;
  state?: unknown;
  merged_at?: unknown;
  html_url?: unknown;
  head?: { ref?: unknown; repo?: { full_name?: unknown } | null };
}

export async function defaultBranch(fetch: Fetch, indexRepo: string): Promise<string> {
  const url = `${API}/repos/${indexRepo}`;
  const repo = (await githubClient(fetch).json(url)) as { default_branch?: unknown } | null;
  if (typeof repo?.default_branch !== "string") throw new ReadFailure("request-failed", `GET ${url} returned no default_branch`);
  return repo.default_branch;
}

export interface ProposeOptions {
  fetch: Fetch;
  indexRepo: string;
  gitDir: string;
  remote?: string;
  base: string;
  written: Written[];
  check: CheckRunner;
  // The index repo's issue that asked for the entries, which their pull requests close.
  issue?: number;
}

// For each entry, runs the check on a directory that holds only that entry, force-pushes
// the branch `discover/<owner>/<repo>` with one commit on top of the default branch that
// adds the entry's two files, and opens a pull request from it. The commits are built
// with a temporary index file, so the checkout's working tree and branch do not change.
export async function propose(options: ProposeOptions): Promise<{ proposed: Proposed[]; failed: ProposeFailure[] }> {
  const { fetch, indexRepo, gitDir, remote = "origin", base, written, check, issue } = options;
  const proposed: Proposed[] = [];
  const failed: ProposeFailure[] = [];
  if (written.length === 0) return { proposed, failed };
  const github = githubClient(fetch);
  // The fetch and the push reach the remote with the token, if one is set, as the header
  // that actions/checkout would store. It goes through git's environment configuration,
  // so it is in no argument and no config file.
  const token = process.env.GITHUB_TOKEN;
  const auth: Record<string, string> = token
    ? {
        GIT_CONFIG_COUNT: "1",
        GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
        GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`,
      }
    : {};
  const git = async (args: string[], env: Record<string, string> = {}) => {
    try {
      return (await run("git", args, { cwd: gitDir, env: { ...process.env, ...env } })).stdout.trim();
    } catch (error) {
      const { stderr } = error as { stderr?: string };
      throw new Error(`git ${args[0]} failed: ${stderr?.trim() || (error as Error).message}`);
    }
  };
  let work: string | undefined;
  try {
    let baseCommit: string;
    try {
      work = await mkdtemp(join(tmpdir(), "zpi-propose-"));
      await git(["fetch", "--quiet", remote, base], auth);
      baseCommit = await git(["rev-parse", "FETCH_HEAD^{commit}"]);
    } catch (error) {
      for (const { repo, id } of written) failed.push({ repo, id, message: (error as Error).message });
      return { proposed, failed };
    }
    for (const [n, entry] of written.entries()) {
      const { repo, id, dir } = entry;
      const branch = `${PREFIX}${repo}`;
      try {
        const checkDir = join(work, `check-${n}`);
        await cp(dir, join(checkDir, id), { recursive: true });
        const checked = await check(checkDir);

        const index = { GIT_INDEX_FILE: join(work, `index-${n}`) };
        await git(["read-tree", baseCommit], index);
        for (const file of ["meta.json", "index.json"]) {
          const blob = await git(["hash-object", "-w", join(dir, file)]);
          await git(["update-index", "--add", "--cacheinfo", `100644,${blob},plugins/${id}/${file}`], index);
        }
        const tree = await git(["write-tree"], index);
        const commit = await git(["commit-tree", "--no-gpg-sign", tree, "-p", baseCommit, "-m", `Add ${repo}`], {
          GIT_AUTHOR_NAME: BOT.name,
          GIT_AUTHOR_EMAIL: BOT.email,
          GIT_COMMITTER_NAME: BOT.name,
          GIT_COMMITTER_EMAIL: BOT.email,
        });
        // Forced, so a branch left by an earlier run, whose request failed, is replaced.
        await git(["push", "--quiet", "--force", remote, `${commit}:refs/heads/${branch}`], auth);

        const pull = (await github.post(`${API}/repos/${indexRepo}/pulls`, {
          title: `Add ${repo}`,
          head: branch,
          base,
          body: body(entry, checked, issue),
        })) as { html_url?: unknown };
        proposed.push({ repo, id, branch, url: typeof pull?.html_url === "string" ? pull.html_url : "" });
      } catch (error) {
        failed.push({ repo, id, message: (error as Error).message });
      }
    }
  } finally {
    if (work) await rm(work, { recursive: true, force: true });
  }
  return { proposed, failed };
}

// The pull request body. The manifest's values and the check output are in code spans
// and a code block, so text in them cannot mention a GitHub user. With `issue`, the body
// says that issue asked for the entry, and closes it.
export function body(entry: Written, checked: { status: number; output: string }, issue?: number): string {
  const declared = (value: string | undefined) => (value === undefined ? "not declared" : code(value));
  const fence = "`".repeat(Math.max(3, ...[...checked.output.matchAll(/`+/g)].map(([run]) => run.length + 1)));
  const found = issue === undefined ? `found ${entry.repoUrl} by its GitHub topic` : `read ${entry.repoUrl} from issue #${issue}`;
  return [
    `The discovery bot ${found} and drafted this entry from its newest release with an \`.xpi\` file.`,
    ...(issue === undefined ? [] : ["", `Closes #${issue}`]),
    "",
    `- Repo: ${entry.repoUrl}`,
    `- Version: ${code(entry.version)}`,
    `- Declared Zotero range: strict_min_version ${declared(entry.strictMinVersion)}, strict_max_version ${declared(entry.strictMaxVersion)}`,
    "",
    `\`pnpm check\` on a directory with only this entry exited with status ${checked.status}:`,
    "",
    fence,
    checked.output.trimEnd(),
    fence,
    "",
    "If this pull request is closed without a merge, the bot does not propose this repo again, from its topic or from an issue.",
  ].join("\n");
}

// Each run of whitespace becomes one space, since a blank line would end the code span.
export function code(text: string): string {
  const value = text.replace(/\s+/g, " ");
  const ticks = "`".repeat(Math.max(1, ...[...value.matchAll(/`+/g)].map(([run]) => run.length + 1)));
  return `${ticks} ${value} ${ticks}`;
}
