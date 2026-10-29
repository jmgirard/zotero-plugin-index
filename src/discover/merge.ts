import { cp, mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Fetch, githubClient } from "../upstream/reader.ts";
import { type CheckRunner, defaultBranch, HOLD_LABEL, PREFIX, unfencedLines } from "./propose.ts";

const API = "https://api.github.com";
// The account that opens the bot's pull requests with the workflow's GITHUB_TOKEN.
const BOT_LOGIN = "github-actions[bot]";
// A bot pull request opened this many hours before the run can merge, unless a run
// started by hand sets another wait.
export const DEFAULT_WAIT_HOURS = 48;
const HOUR_MS = 60 * 60 * 1000;
// More than an entry file the bot writes needs, as in a handoff.
const FILE_MAX_BYTES = 64 * 1024;
const ENTRY_FILES = ["index.json", "meta.json"];

export interface MergeOptions {
  fetch: Fetch;
  // The index repo as owner/repo.
  indexRepo: string;
  // The plugins/ folder of a checkout of the default branch.
  root: string;
  check: CheckRunner;
  now?: Date;
  // How long before `now` a pull request must have opened, in hours.
  waitHours?: number;
}

export interface MergeResult {
  merged: number[];
  skipped: { number: number; reason: string }[];
  failed: { number: number; message: string }[];
}

interface PullJson {
  number?: unknown;
  state?: unknown;
  draft?: unknown;
  body?: unknown;
  created_at?: unknown;
  user?: { login?: unknown } | null;
  labels?: { name?: unknown }[] | null;
  head?: { ref?: unknown; sha?: unknown; repo?: { full_name?: unknown } | null } | null;
  base?: { ref?: unknown } | null;
}

interface FileJson {
  filename?: unknown;
  status?: unknown;
}

// The first of the conditions on a pull request's own record that it fails, or undefined.
// The body's one Hold line outside fenced code must be `Hold: none`, so a line in the
// quoted check output cannot stand in for it.
function recordProblem(pull: PullJson, indexRepo: string, now: Date, waitHours: number): string | undefined {
  const ref = pull.head?.ref;
  const headRepo = pull.head?.repo?.full_name;
  if (typeof ref !== "string" || !ref.startsWith(PREFIX)) return `its head branch does not start with ${PREFIX}`;
  if (typeof headRepo !== "string" || headRepo.toLowerCase() !== indexRepo.toLowerCase()) return `its head branch is not in ${indexRepo}`;
  if (pull.user?.login !== BOT_LOGIN) return `its author is not ${BOT_LOGIN}`;
  const holdLines = typeof pull.body === "string" ? unfencedLines(pull.body).filter((line) => line.startsWith("Hold:")) : [];
  if (holdLines.join("\n") !== "Hold: none") return "its body has no Hold: none line";
  // GitHub label names are unique ignoring case.
  if ((pull.labels ?? []).some((label) => typeof label?.name === "string" && label.name.toLowerCase() === HOLD_LABEL)) {
    return `it has the ${HOLD_LABEL} label`;
  }
  const opened = typeof pull.created_at === "string" ? Date.parse(pull.created_at) : Number.NaN;
  // A time after `now` would pass a wait of 0, so it is refused with an unreadable one.
  if (Number.isNaN(opened) || opened > now.getTime()) return "its opening time is unreadable or after the run";
  if (now.getTime() - opened < waitHours * HOUR_MS) return `it opened less than ${waitHours} hour${waitHours === 1 ? "" : "s"} ago`;
  return undefined;
}

// Squash-merges each open bot pull request that says `Hold: none`, has no hold label,
// opened at least `waitHours` before `now`, and adds exactly one new entry, once that entry
// passes `check` beside the checkout's entries and those this run merged. Each other open
// pull request is skipped with the first condition it fails; a draft, a pull request
// for another base branch, and one whose record changed during the run are skipped
// too. A failed read of a pull request's files or contents, a failed or timed-out check,
// or a refused merge request fails that pull request, and the run goes on to the next.
// A failed read of the list of pull requests or of the default branch throws.
export async function mergeDiscover(options: MergeOptions): Promise<MergeResult> {
  const { fetch, indexRepo, root, check, now = new Date(), waitHours = DEFAULT_WAIT_HOURS } = options;
  const github = githubClient(fetch);
  const result: MergeResult = { merged: [], skipped: [], failed: [] };
  const base = await defaultBranch(fetch, indexRepo);
  const pulls = (await github.pages(`${API}/repos/${indexRepo}/pulls?state=open&per_page=100`)) as PullJson[];
  const taken = new Set((await entryNames(root)).map((name) => name.toLowerCase()));
  // The entries this run merged, which later checks see beside the checkout's.
  const mergedEntries = new Map<string, Record<string, string>>();

  for (const pull of pulls) {
    if (!Number.isSafeInteger(pull?.number)) continue;
    const number = pull.number as number;
    const skip = (reason: string) => result.skipped.push({ number, reason });
    const problem = recordProblem(pull, indexRepo, now, waitHours);
    if (problem) {
      skip(problem);
      continue;
    }
    let files: FileJson[];
    try {
      files = (await github.pages(`${API}/repos/${indexRepo}/pulls/${number}/files?per_page=100`)) as FileJson[];
    } catch (error) {
      result.failed.push({ number, message: `cannot read its files: ${(error as Error).message}` });
      continue;
    }
    const id = newEntry(files);
    if (!id) {
      skip("its files are not exactly plugins/<id>/meta.json and plugins/<id>/index.json, both added");
      continue;
    }
    if (taken.has(id.toLowerCase())) {
      skip(`the default branch already has plugins/${id} in some letter case`);
      continue;
    }
    if (pull.draft === true) {
      skip("it is a draft");
      continue;
    }
    if (pull.base?.ref !== base) {
      skip(`it does not target the default branch ${base}`);
      continue;
    }
    const sha = pull.head?.sha;
    if (typeof sha !== "string" || !/^[0-9a-f]{40}$/.test(sha)) {
      result.failed.push({ number, message: "its head has no commit SHA" });
      continue;
    }

    let work: string | undefined;
    try {
      const entry: Record<string, string> = {};
      for (const file of ENTRY_FILES) {
        entry[file] = await contents(github, `${API}/repos/${indexRepo}/contents/plugins/${encodeURIComponent(id)}/${file}?ref=${sha}`);
      }
      work = await mkdtemp(join(tmpdir(), "zpi-merge-"));
      const plugins = join(work, "plugins");
      await cp(root, plugins, { recursive: true });
      for (const [otherId, otherEntry] of [...mergedEntries, [id, entry] as const]) {
        await mkdir(join(plugins, otherId), { recursive: true });
        for (const [file, text] of Object.entries(otherEntry)) await writeFile(join(plugins, otherId, file), text);
      }
      const checked = await check(plugins);
      if (checked.status !== 0) throw new Error(`pnpm check exited with status ${checked.status}:\n${checked.output.trimEnd()}`);
      // Read again, so a hold label, an edit, or a push made since the list read stops
      // the merge. The merge request's sha also refuses a later push.
      const fresh = (await github.json(`${API}/repos/${indexRepo}/pulls/${number}`)) as PullJson | null;
      const changed =
        fresh?.state !== "open"
          ? "it is no longer open"
          : (recordProblem(fresh, indexRepo, now, waitHours) ??
            (fresh.draft === true ? "it is a draft" : undefined) ??
            (fresh.base?.ref !== base ? `it does not target the default branch ${base}` : undefined) ??
            (fresh.head?.sha !== sha ? "its head moved" : undefined));
      if (changed) {
        skip(`it changed during the run: ${changed}`);
        continue;
      }
      await github.put(`${API}/repos/${indexRepo}/pulls/${number}/merge`, { merge_method: "squash", sha });
      result.merged.push(number);
      mergedEntries.set(id, entry);
      taken.add(id.toLowerCase());
    } catch (error) {
      result.failed.push({ number, message: (error as Error).message });
    } finally {
      if (work) await rm(work, { recursive: true, force: true });
    }
  }
  return result;
}

// The id of the one entry that `files` adds, when they are exactly its two files, both
// added, and nothing else.
function newEntry(files: FileJson[]): string | undefined {
  if (files.length !== ENTRY_FILES.length) return undefined;
  const ids = new Set<string>();
  const names: string[] = [];
  for (const { filename, status } of files) {
    if (status !== "added" || typeof filename !== "string") return undefined;
    const match = /^plugins\/([^/]+)\/([^/]+)$/.exec(filename);
    if (!match || match[1].startsWith(".")) return undefined;
    ids.add(match[1]);
    names.push(match[2]);
  }
  if (ids.size !== 1 || names.sort().join("\n") !== ENTRY_FILES.join("\n")) return undefined;
  return [...ids][0];
}

// The text of a file from the contents API, which gives it in base64.
async function contents(github: ReturnType<typeof githubClient>, url: string): Promise<string> {
  const file = (await github.json(url)) as { encoding?: unknown; content?: unknown; size?: unknown } | null;
  if (file?.encoding !== "base64" || typeof file.content !== "string") throw new Error(`GET ${url} returned no base64 content`);
  const bytes = Buffer.from(file.content, "base64");
  if (bytes.length > FILE_MAX_BYTES) throw new Error(`GET ${url} returned more than ${FILE_MAX_BYTES} bytes`);
  return bytes.toString("utf8");
}

// The names in the checkout's plugins/ folder, entries or not, so a folder in any letter
// case blocks a new entry of that id. A missing folder throws, so a checkout with no
// entries is never read as an empty index.
const entryNames = (root: string) => readdir(root);
