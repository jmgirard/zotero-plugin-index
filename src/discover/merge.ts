import { cp, mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Fetch, githubClient } from "../upstream/reader.ts";
import { type CheckRunner, HOLD_LABEL, PREFIX } from "./propose.ts";

const API = "https://api.github.com";
// The account that opens the bot's pull requests with the workflow's GITHUB_TOKEN.
const BOT_LOGIN = "github-actions[bot]";
// A bot pull request opened this long before the run can merge.
export const WAIT_MS = 48 * 60 * 60 * 1000;
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
}

export interface MergeResult {
  merged: number[];
  skipped: { number: number; reason: string }[];
  failed: { number: number; message: string }[];
}

interface PullJson {
  number?: unknown;
  body?: unknown;
  created_at?: unknown;
  user?: { login?: unknown } | null;
  labels?: { name?: unknown }[] | null;
  head?: { ref?: unknown; sha?: unknown; repo?: { full_name?: unknown } | null } | null;
}

interface FileJson {
  filename?: unknown;
  status?: unknown;
}

// Squash-merges each open bot pull request that says `Hold: none`, has no hold label,
// opened at least WAIT_MS before `now`, and adds exactly one new entry, once that entry
// passes `check` beside the checkout's entries and those this run merged. Each other open
// pull request is skipped with the first condition it fails. A failed read of a pull
// request's files or contents, a failed or timed-out check, or a refused merge request
// fails that pull request, and the run goes on to the next. A failed read of the list of
// pull requests throws.
export async function mergeDiscover(options: MergeOptions): Promise<MergeResult> {
  const { fetch, indexRepo, root, check, now = new Date() } = options;
  const github = githubClient(fetch);
  const result: MergeResult = { merged: [], skipped: [], failed: [] };
  const pulls = (await github.pages(`${API}/repos/${indexRepo}/pulls?state=open&per_page=100`)) as PullJson[];
  const taken = new Set((await entryNames(root)).map((name) => name.toLowerCase()));
  // The entries this run merged, which later checks see beside the checkout's.
  const mergedEntries = new Map<string, Record<string, string>>();

  for (const pull of pulls) {
    if (!Number.isSafeInteger(pull?.number)) continue;
    const number = pull.number as number;
    const skip = (reason: string) => result.skipped.push({ number, reason });
    const ref = pull.head?.ref;
    const headRepo = pull.head?.repo?.full_name;
    if (typeof ref !== "string" || !ref.startsWith(PREFIX)) {
      skip(`its head branch does not start with ${PREFIX}`);
      continue;
    }
    if (typeof headRepo !== "string" || headRepo.toLowerCase() !== indexRepo.toLowerCase()) {
      skip(`its head branch is not in ${indexRepo}`);
      continue;
    }
    if (pull.user?.login !== BOT_LOGIN) {
      skip(`its author is not ${BOT_LOGIN}`);
      continue;
    }
    if (typeof pull.body !== "string" || !pull.body.split(/\r?\n/).includes("Hold: none")) {
      skip("its body has no Hold: none line");
      continue;
    }
    if ((pull.labels ?? []).some((label) => label?.name === HOLD_LABEL)) {
      skip(`it has the ${HOLD_LABEL} label`);
      continue;
    }
    const opened = typeof pull.created_at === "string" ? Date.parse(pull.created_at) : Number.NaN;
    if (!(now.getTime() - opened >= WAIT_MS)) {
      skip("it opened less than 48 hours ago");
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
