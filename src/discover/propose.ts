import { execFile, spawn } from "node:child_process";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import type { Lookup } from "../upstream/host-guard.ts";
import { type Fetch, githubClient, ReadFailure } from "../upstream/reader.ts";
import { duration } from "../upstream/time-limit.ts";
import { type DiscoverResult, type DiscoveryState, discover, type indexed, type ReadItem, repoName } from "./discover.ts";
import type { HoldReason } from "./holds.ts";

const API = "https://api.github.com";
// The bot's branches are `discover/<owner>/<repo>`, lowercase.
export const PREFIX = "discover/";
// The github-actions[bot] account's name and noreply email, so GitHub links the commits
// to that account.
const BOT = { name: "github-actions[bot]", email: "41898282+github-actions[bot]@users.noreply.github.com" };

const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");

const run = promisify(execFile);

export type Written = Extract<ReadItem, { outcome: "written" }>;

// Runs `pnpm check` on a directory and returns its exit status and output.
export type CheckRunner = (dir: string) => Promise<{ status: number; output: string }>;

// The longest one `git` process that `propose` runs, and one `pnpm check` process, may take.
// The branch-name check of a handoff has its own limit, REF_CHECK_LIMIT_MS.
export const GIT_LIMIT_MS = 2 * 60 * 1000;
export const CHECK_LIMIT_MS = 5 * 60 * 1000;

// Runs `pnpm check <dir>` with the pnpm that runs this command, and returns its exit
// status and its output, stderr after stdout. The check needs no GitHub token, so it
// gets none. Once `ms` has passed, it kills the check and every process the check
// started, and rejects.
export const pnpmCheck = (dir: string, ms = CHECK_LIMIT_MS): ReturnType<CheckRunner> =>
  new Promise((resolveCheck, reject) => {
    const { GITHUB_TOKEN: _token, ...env } = process.env;
    // In a process group of its own, so the kill also reaches the node process that pnpm
    // starts, which would otherwise keep the output open.
    const child = spawn(process.env.npm_execpath ?? "pnpm", ["--silent", "--dir", PACKAGE_ROOT, "check", dir], {
      stdio: ["ignore", "pipe", "pipe"],
      env,
      detached: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    const timer = setTimeout(() => {
      try {
        process.kill(-child.pid!, "SIGKILL");
      } catch {
        // The group has already ended.
      }
      child.stdout.destroy();
      child.stderr.destroy();
      reject(new Error(`pnpm check passed its time limit of ${duration(ms)}`));
    }, ms);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolveCheck({ status: code ?? 1, output: stdout + stderr });
    });
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
// open or was closed without a merge in the skip set. A failed read of the pull requests
// or the default branch ends the run before discovery reads; the write step reads the
// default branch again.
export async function discoverRead(options: DiscoverReadOptions): Promise<DiscoverResult> {
  let pulls: BotPulls;
  try {
    pulls = await botPulls(options.fetch, options.indexRepo);
    await defaultBranch(options.fetch, options.indexRepo);
  } catch (error) {
    if (error instanceof ReadFailure) return { ok: false, message: error.message };
    throw error;
  }
  return discover({ ...options, skip: pulls.skip, pendingIds: pulls.ids });
}

export interface ProposeHandoffOptions {
  fetch: Fetch;
  // The index repo as owner/repo, and a checkout of it whose remote takes the pushes.
  indexRepo: string;
  gitDir: string;
  remote?: string;
  check: CheckRunner;
  // The longest one git process may take.
  gitMs?: number;
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

// The write step of a discover run. It checks the bot pull requests again by repo and
// plugin id, since they can change while the read step runs, and the index at the
// default branch's newest commit, which each pull request builds on. It opens one pull
// request for each entry neither has. A failed read of the pull requests or the default
// branch ends the run before any push. A failed fetch of the default branch, or read of
// its index, fails every entry; a failure for one entry is reported, and the run goes on.
export async function proposeHandoff(options: ProposeHandoffOptions): Promise<ProposeHandoffResult> {
  const { fetch, indexRepo, entries } = options;
  let pulls: BotPulls;
  let base: string;
  try {
    pulls = await botPulls(fetch, indexRepo);
    base = await defaultBranch(fetch, indexRepo);
  } catch (error) {
    if (error instanceof ReadFailure) return { ok: false, message: error.message };
    throw error;
  }
  if (entries.length === 0) return { ok: true, proposed: [], failed: [], skipped: [] };
  let pushBase: PushBase;
  try {
    pushBase = await fetchBase({ ...options, base });
  } catch (error) {
    const failed = entries.map(({ repo, id }) => ({ repo, id, message: (error as Error).message }));
    return { ok: true, proposed: [], failed, skipped: [] };
  }
  const { index } = pushBase;
  const skipped: SkippedEntry[] = [];
  const written: Written[] = [];
  for (const entry of entries) {
    const { repo, id } = entry;
    if (index.repos.has(repo) || index.ids.has(id.toLowerCase())) skipped.push({ repo, id, reason: "in-index" });
    else if (pulls.skip.has(repo) || pulls.ids.has(id.toLowerCase())) skipped.push({ repo, id, reason: "in-bot-pull" });
    else written.push(entry);
  }
  const { proposed, failed } = await propose({ ...options, pushBase, written });
  return { ok: true, proposed, failed, skipped };
}

export interface BotPulls {
  // The lowercase owner/repo of each bot pull request that is open or was closed without
  // a merge. A merged one's entry is in the index, which discovery reads.
  skip: Set<string>;
  // The same pull requests by owner/repo, with their URLs, and for an open one, the issue
  // its body closes when it has exactly one `Closes #<n>` line outside code blocks.
  pulls: Map<string, { url: string; open: boolean; closes?: number }>;
  // The lowercase plugin ids whose entry directories the open ones add, so another repo
  // with the same id is not proposed beside them.
  ids: Set<string>;
}

// A pull request from a fork is not the bot's, whatever its branch is named.
export async function botPulls(fetch: Fetch, indexRepo: string): Promise<BotPulls> {
  const github = githubClient(fetch);
  const list = (await github.pages(`${API}/repos/${indexRepo}/pulls?state=all&per_page=100`)) as PullJson[];
  const skip = new Set<string>();
  const pulls = new Map<string, { url: string; open: boolean; closes?: number }>();
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
      const closes = pull.state === "open" ? closesLines(typeof pull.body === "string" ? pull.body : "") : [];
      // An open one wins over a closed one for the same repo, whatever the list order.
      if (!pulls.get(repo)?.open) pulls.set(repo, { url, open: pull.state === "open", ...(closes.length === 1 ? { closes: closes[0] } : {}) });
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
  body?: unknown;
  head?: { ref?: unknown; repo?: { full_name?: unknown } | null };
}

// The issue numbers of the lines that are exactly `Closes #<n>`, outside fenced code
// blocks. A fence closes on a line of the same character, at least as long, with
// nothing else on the line but whitespace.
export function closesLines(body: string): number[] {
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

export async function defaultBranch(fetch: Fetch, indexRepo: string): Promise<string> {
  const url = `${API}/repos/${indexRepo}`;
  const repo = (await githubClient(fetch).json(url)) as { default_branch?: unknown } | null;
  if (typeof repo?.default_branch !== "string") throw new ReadFailure("request-failed", `GET ${url} returned no default_branch`);
  return repo.default_branch;
}

type Git = (args: string[], env?: Record<string, string>) => Promise<string>;

// Runs git in `gitDir` and returns its trimmed output. A process that passes `ms` is
// killed, and the error says so.
function gitRunner(gitDir: string, ms: number): Git & { bytes: (args: string[], input: string) => Promise<Buffer> } {
  // Runs git with `input`, if any, on its stdin, and returns its output as bytes.
  async function bytes(args: string[], input?: string, env: Record<string, string> = {}): Promise<Buffer> {
    try {
      const pending = run("git", args, {
        cwd: gitDir,
        env: { ...process.env, ...env },
        timeout: ms,
        maxBuffer: GIT_OUTPUT_MAX,
        encoding: "buffer",
      });
      if (input !== undefined) pending.child.stdin?.end(input);
      return (await pending).stdout;
    } catch (error) {
      const { code, killed, stderr } = error as { code?: unknown; killed?: unknown; stderr?: Buffer };
      if (code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") throw new Error(`git ${args[0]} wrote more than ${GIT_OUTPUT_MAX} bytes`);
      if (killed) throw new Error(`git ${args[0]} passed its time limit of ${duration(ms)}`);
      throw new Error(`git ${args[0]} failed: ${stderr?.toString().trim() || (error as Error).message}`);
    }
  }
  const git: Git = async (args, env = {}) => (await bytes(args, undefined, env)).toString("utf8").trim();
  return Object.assign(git, { bytes: (args: string[], input: string) => bytes(args, input) });
}

// The most output one git process may write. The index's ls-tree listing takes about 300
// bytes for each entry.
const GIT_OUTPUT_MAX = 64 * 1024 * 1024;

// The fetch and the push reach the remote with the token, if one is set, as the header
// that actions/checkout would store. It goes through git's environment configuration,
// so it is in no argument and no config file.
function tokenEnv(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  return token
    ? {
        GIT_CONFIG_COUNT: "1",
        GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
        GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`,
      }
    : {};
}

// The default branch, the commit fetched from it, which each pull request builds on,
// and the index at that commit.
export interface PushBase {
  branch: string;
  commit: string;
  index: Pick<Awaited<ReturnType<typeof indexed>>, "repos" | "ids">;
}

// Fetches the default branch `base` from `remote` and reads the index at the fetched
// commit, with four git processes at most. A commit with no plugins/ folder fails, so a
// missing folder is never read as an empty index.
export async function fetchBase(options: { gitDir: string; remote?: string; base: string; gitMs?: number }): Promise<PushBase> {
  const { gitDir, remote = "origin", base, gitMs = GIT_LIMIT_MS } = options;
  const git = gitRunner(gitDir, gitMs);
  await git(["fetch", "--quiet", remote, base], tokenEnv());
  const commit = await git(["rev-parse", "FETCH_HEAD^{commit}"]);
  return { branch: base, commit, index: await indexAt(git, base, commit) };
}

// The index at `commit`, in the shape of `indexed` less its names: each folder under plugins/ whose name
// does not start with "." is an entry, and a meta.json in it that is JSON names its repo.
// Two git processes read it: one ls-tree, from the repo root whatever the checkout's
// current folder, and one cat-file for every meta.json.
async function indexAt(git: ReturnType<typeof gitRunner>, branch: string, commit: string): Promise<PushBase["index"]> {
  const repos = new Map<string, string>();
  const ids = new Set<string>();
  const metas: [string, string][] = [];
  let folder = false;
  for (const line of (await git(["ls-tree", "-r", "-t", "-z", "--full-tree", commit, "--", "plugins"])).split("\0")) {
    const match = /^\d+ (\w+) ([0-9a-f]+)\tplugins(\/.+)?$/s.exec(line);
    if (!match) continue;
    const [, type, object, sub] = match;
    if (!sub) {
      folder = type === "tree";
      continue;
    }
    const path = sub.slice(1);
    if (type === "tree" && !path.includes("/") && !path.startsWith(".")) ids.add(path.toLowerCase());
    const name = /^([^/.][^/]*)\/meta\.json$/.exec(path)?.[1];
    if (type === "blob" && name) metas.push([name, object]);
  }
  if (!folder) throw new Error(`the default branch ${branch} at ${commit} has no plugins/ folder`);
  if (metas.length === 0) return { repos, ids };
  // Each object comes back as "<object> blob <size>", a newline, its bytes, and a newline.
  const out = await git.bytes(["cat-file", "--batch"], metas.map(([, object]) => `${object}\n`).join(""));
  let at = 0;
  for (const [name] of metas) {
    const end = out.indexOf(0x0a, at);
    const header = out.subarray(at, end < 0 ? undefined : end).toString("utf8");
    const size = Number(/^[0-9a-f]+ blob (\d+)$/.exec(header)?.[1] ?? Number.NaN);
    if (end < 0 || !Number.isSafeInteger(size)) throw new Error(`git cat-file returned "${header}" for plugins/${name}/meta.json`);
    const text = out.subarray(end + 1, end + 1 + size).toString("utf8");
    at = end + 1 + size + 1;
    let meta: { repoUrl?: unknown } | null;
    try {
      meta = JSON.parse(text);
    } catch {
      // Not JSON, so only the id counts.
      continue;
    }
    const repo = repoName(meta?.repoUrl);
    if (repo) repos.set(repo, name);
  }
  return { repos, ids };
}

export interface ProposeOptions {
  fetch: Fetch;
  indexRepo: string;
  gitDir: string;
  remote?: string;
  // From fetchBase, run on the same checkout.
  pushBase: PushBase;
  written: Written[];
  check: CheckRunner;
  // The longest one git process may take.
  gitMs?: number;
  // The index repo's issue that asked for the entries, which their pull requests close.
  issue?: number;
}

// For each entry, runs the check on a directory that holds only that entry, force-pushes
// the branch `discover/<owner>/<repo>` with one commit on top of the fetched default
// branch commit that adds the entry's two files, and opens a pull request from it. The
// commits are built with a temporary index file, so the checkout's working tree and
// branch do not change. A git process that passes `gitMs` is killed and fails its entry.
export async function propose(options: ProposeOptions): Promise<{ proposed: Proposed[]; failed: ProposeFailure[] }> {
  const { fetch, indexRepo, gitDir, remote = "origin", pushBase, written, check, gitMs = GIT_LIMIT_MS, issue } = options;
  const { branch: base, commit: baseCommit } = pushBase;
  const proposed: Proposed[] = [];
  const failed: ProposeFailure[] = [];
  if (written.length === 0) return { proposed, failed };
  const github = githubClient(fetch);
  const auth = tokenEnv();
  const git = gitRunner(gitDir, gitMs);
  let work: string | undefined;
  try {
    try {
      work = await mkdtemp(join(tmpdir(), "zpi-propose-"));
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
        })) as { html_url?: unknown; number?: unknown };
        const url = typeof pull?.html_url === "string" ? pull.html_url : "";
        if (entry.holds.length > 0) {
          // The body's Hold line keeps `pnpm merge-discover` from merging a held pull
          // request even when this label request fails.
          try {
            if (!Number.isSafeInteger(pull?.number)) throw new Error("the create request's answer has no pull request number");
            await github.post(`${API}/repos/${indexRepo}/issues/${pull.number}/labels`, { labels: [HOLD_LABEL] });
          } catch (error) {
            throw new Error(`opened ${url || branch} but could not add the ${HOLD_LABEL} label: ${(error as Error).message}`);
          }
        }
        proposed.push({ repo, id, branch, url });
      } catch (error) {
        failed.push({ repo, id, message: (error as Error).message });
      }
    }
  } finally {
    if (work) await rm(work, { recursive: true, force: true });
  }
  return { proposed, failed };
}

// The most characters (code points) of the check output that a pull request body quotes.
// The entry schema in handoff.ts allows at most 300 characters for the URL and 500 for each
// version, so with this cut the body stays far below GitHub's limit of 65,536 characters.
// A test in test/propose.test.ts builds a body near the longest the schema allows and
// checks its length.
const CHECK_OUTPUT_MAX = 10_000;

// The label that keeps `pnpm merge-discover` from merging a bot pull request.
export const HOLD_LABEL = "hold";

// The sentence a pull request body gives for each hold reason.
export const HOLD_TEXT: Record<HoldReason, string> = {
  "name-match":
    "The plugin's name or repo name matches an entry from another owner, with the words zotero, plugin, addon, and for left out.",
  "owner-unread": "The bot could not read when the repo owner's GitHub account was made.",
  "new-account": "The repo owner's GitHub account is less than 30 days old.",
  "update-host": "The plugin's update.json is not on github.com or raw.githubusercontent.com, so its updates come from another host.",
  "issue-no-topic": "An issue proposed this repo, and the repo has neither the zotero-plugin nor the zotero-addon topic.",
};

// The sentence after `Hold: none`.
export const UNHELD_TEXT =
  "The bot can merge this pull request at its first daily run at least 48 hours after it opens, unless it has the `hold` label or is closed.";

// The pull request body. The manifest's values and the check output are in code spans
// and a code block, so text in them cannot mention a GitHub user. With `issue`, the body
// says that issue asked for the entry, and closes it. A check output longer than
// CHECK_OUTPUT_MAX is cut, and the body says so. The Hold line names the entry's hold
// reasons, or says `Hold: none`, which `pnpm merge-discover` looks for.
export function body(entry: Written, checked: { status: number; output: string }, issue?: number): string {
  const declared = (value: string | undefined) => (value === undefined ? "not declared" : code(value));
  const trimmed = checked.output.trimEnd();
  const chars = [...trimmed];
  const cut = chars.length > CHECK_OUTPUT_MAX;
  // The cut text is trimmed again, so a cut at a line break leaves no blank line before
  // the closing fence.
  const output = cut ? chars.slice(0, CHECK_OUTPUT_MAX).join("").trimEnd() : trimmed;
  const fence = "`".repeat(Math.max(3, ...[...output.matchAll(/`+/g)].map(([run]) => run.length + 1)));
  const found = issue === undefined ? `found ${entry.repoUrl} by its GitHub topic` : `read ${entry.repoUrl} from issue #${issue}`;
  return [
    `The discovery bot ${found} and drafted this entry from its newest stable release with an \`.xpi\` file, or from its newest prerelease if no stable release has one or that release is not a Zotero 7+ build.`,
    ...(issue === undefined ? [] : ["", `Closes #${issue}`]),
    "",
    `- Repo: ${entry.repoUrl}`,
    `- Version: ${code(entry.version)}`,
    `- Declared Zotero range: strict_min_version ${declared(entry.strictMinVersion)}, strict_max_version ${declared(entry.strictMaxVersion)}`,
    "",
    `\`pnpm check\` on a directory with only this entry exited with status ${checked.status}:`,
    "",
    fence,
    output,
    fence,
    ...(cut ? ["", `The output above is cut to its first ${CHECK_OUTPUT_MAX.toLocaleString("en-US")} characters.`] : []),
    "",
    ...(entry.holds.length === 0
      ? ["Hold: none", "", UNHELD_TEXT]
      : [`Hold: ${entry.holds.join(", ")}`, "", "The bot does not merge this pull request itself.", "", ...entry.holds.map((reason) => `- \`${reason}\`: ${HOLD_TEXT[reason]}`)]),
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
