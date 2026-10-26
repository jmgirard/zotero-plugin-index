import { execFile } from "node:child_process";
import { lstat, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { Ajv } from "ajv";

// A handoff is what a read job leaves for the write job: `plan.json` and one directory
// `entries/<id>/` for each drafted entry. The read job reads repos that anyone can name,
// so the write job trusts nothing in a handoff that it does not check here.

const run = promisify(execFile);

export const PLAN_FILE = "plan.json";
export const ENTRIES_DIR = "entries";
const ENTRY_FILES = ["index.json", "meta.json"];
// More than an entry file the bot writes needs, and small enough to read at once.
const FILE_MAX_BYTES = 64 * 1024;
// The most characters of a message that an issue comment quotes. The read step cuts a
// message to one more than this, so the comment still marks the cut.
export const MESSAGE_MAX = 2000;

export interface PlannedEntry {
  repo: string;
  repoUrl: string;
  id: string;
  version: string;
  strictMinVersion?: string;
  strictMaxVersion?: string;
}

// An issue run's read step ends in one of these. `known` names a repo that an entry or a
// bot pull request already has, so the read step drafted nothing for it.
export type IssueOutcome =
  | { outcome: "entry"; entry: PlannedEntry }
  | { outcome: "known"; repo: string }
  | { outcome: "refused"; failure: string; message: string }
  // `failure` names the reader failure when the bot's read of the repo failed.
  | { outcome: "failed"; failure?: string; message: string };

export type Plan = { kind: "discover"; entries: PlannedEntry[] } | ({ kind: "issue" } & IssueOutcome);

// A Mozilla add-on id: a GUID in braces, or email-like.
const ADDON_ID = /^(\{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}|[A-Za-z0-9-._]*@[A-Za-z0-9-._]+)$/;
// A lowercase owner/repo, as the bot keys repos.
const REPO = /^[a-z0-9_.-]+\/[a-z0-9_.-]+$/;

const text = (maxLength: number) => ({ type: "string", minLength: 1, maxLength });
const entrySchema = {
  type: "object",
  additionalProperties: false,
  required: ["repo", "repoUrl", "id", "version"],
  properties: {
    repo: text(200),
    repoUrl: text(300),
    id: text(200),
    version: text(500),
    strictMinVersion: text(500),
    strictMaxVersion: text(500),
  },
};
const issue = (outcome: string, properties: Record<string, unknown>, optional: Record<string, unknown> = {}) => ({
  type: "object",
  additionalProperties: false,
  required: ["kind", "outcome", ...Object.keys(properties)],
  properties: { kind: { const: "issue" }, outcome: { const: outcome }, ...properties, ...optional },
});
// The failure name goes into a code span as it is, so it has no backtick or space.
const failureName = { type: "string", pattern: "^[a-z0-9][a-z0-9-]{0,59}$" };
const validatePlan = new Ajv({ allErrors: true }).compile({
  oneOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "entries"],
      properties: { kind: { const: "discover" }, entries: { type: "array", items: entrySchema } },
    },
    issue("entry", { entry: entrySchema }),
    issue("known", { repo: text(200) }),
    issue("refused", { failure: failureName, message: text(MESSAGE_MAX + 1) }),
    issue("failed", { message: text(MESSAGE_MAX + 1) }, { failure: failureName }),
  ],
});
const validateEntry = new Ajv({ allErrors: true }).compile(entrySchema);

// Returns why `readHandoff` would refuse a handoff with this entry and its drafted
// directory, or undefined. The read step checks each entry it drafts, so an entry of its
// own never refuses a handoff.
export async function plannedProblem(entry: PlannedEntry, entryDir: string): Promise<string | undefined> {
  if (!validateEntry(JSON.parse(JSON.stringify(entry)))) return "a field is empty or longer than the handoff allows";
  return (await entryProblem(entry)) ?? entryDirProblem(entryDir, entry.id);
}

// Whether a repo name has the shape a handoff accepts.
export const plannableRepo = (repo: string) => REPO.test(repo) && repo.length <= 200;

// Writes `plan.json` into `dir`. The read step has already drafted the entries into
// `entriesDir(dir)`.
export async function writePlan(dir: string, plan: Plan): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, PLAN_FILE), `${JSON.stringify(plan, null, 2)}\n`);
}

export const entriesDir = (dir: string) => join(dir, ENTRIES_DIR);

export type HandoffRead =
  | { ok: true; plan: Plan; dirs: Map<string, string> }
  | { ok: false; refusal: "no-handoff" | "handoff-refused"; message: string };

// Reads and checks the handoff in `dir`. `kind` is the kind of run the write job does,
// and `limit` the most entries a discover handoff may hold. `dirs` maps each planned
// entry's id to its directory.
export async function readHandoff(dir: string, kind: Plan["kind"], limit: number): Promise<HandoffRead> {
  const refuse = (message: string): HandoffRead => ({ ok: false, refusal: "handoff-refused", message });
  let planText: string;
  try {
    const stat = await lstat(join(dir, PLAN_FILE));
    if (!stat.isFile()) return refuse(`${PLAN_FILE} is not a regular file`);
    if (stat.size > 4 * FILE_MAX_BYTES * Math.max(limit, 1)) return refuse(`${PLAN_FILE} is larger than the run needs`);
    planText = await readFile(join(dir, PLAN_FILE), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { ok: false, refusal: "no-handoff", message: `the read job left no ${PLAN_FILE} in ${dir}` };
    }
    return refuse(`cannot read ${PLAN_FILE}: ${(error as Error).message}`);
  }
  let plan: unknown;
  try {
    plan = JSON.parse(planText);
  } catch {
    return refuse(`${PLAN_FILE} is not valid JSON`);
  }
  if (!validatePlan(plan)) return refuse(`${PLAN_FILE} does not match the handoff schema`);
  const checked = plan as Plan;
  if (checked.kind !== kind) return refuse(`the handoff is for a ${checked.kind} run, not a ${kind} run`);

  let entries: PlannedEntry[] = [];
  if (checked.kind === "discover") entries = checked.entries;
  else if (checked.outcome === "entry") entries = [checked.entry];
  if (entries.length > limit) return refuse(`the handoff holds ${entries.length} entries, more than the limit of ${limit}`);
  const repos: string[] = [];
  if (checked.kind === "issue" && checked.outcome === "known") repos.push(checked.repo);
  for (const entry of entries) {
    const problem = await entryProblem(entry);
    if (problem) return refuse(problem);
    repos.push(entry.repo);
  }
  for (const repo of repos) {
    if (!REPO.test(repo)) return refuse(`the repo ${JSON.stringify(repo)} is not a lowercase owner/repo`);
  }
  const ids = entries.map(({ id }) => id);
  if (new Set(ids.map((id) => id.toLowerCase())).size !== ids.length) return refuse("the handoff holds one plugin id twice");
  if (new Set(repos).size !== repos.length) return refuse("the handoff holds one repo twice");

  // The entries directory holds exactly the planned entries, each with only its two files.
  const root = entriesDir(dir);
  let names: string[] = [];
  try {
    if (!(await lstat(root)).isDirectory()) return refuse(`${ENTRIES_DIR} is not a directory`);
    names = await readdir(root);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") return refuse(`cannot read ${ENTRIES_DIR}: ${(error as Error).message}`);
  }
  const extra = names.filter((name) => !ids.includes(name));
  if (extra.length > 0) return refuse(`${ENTRIES_DIR} holds ${JSON.stringify(extra[0])}, which the plan does not name`);
  const dirs = new Map<string, string>();
  for (const id of ids) {
    const entryDir = join(root, id);
    const problem = await entryDirProblem(entryDir, id);
    if (problem) return refuse(problem);
    dirs.set(id, entryDir);
  }
  return { ok: true, plan: checked, dirs };
}

async function entryProblem(entry: PlannedEntry): Promise<string | undefined> {
  const { id, repo, repoUrl } = entry;
  if (!ADDON_ID.test(id) || id.startsWith(".")) return `the id ${JSON.stringify(id)} is not a Mozilla add-on id`;
  if (!REPO.test(repo)) return `the repo ${JSON.stringify(repo)} is not a lowercase owner/repo`;
  if (!URL.canParse(repoUrl) || repoUrl.toLowerCase() !== `https://github.com/${repo}`) {
    return `the repo URL ${JSON.stringify(repoUrl)} is not the GitHub URL of ${repo}`;
  }
  try {
    await run("git", ["check-ref-format", `refs/heads/discover/${repo}`]);
  } catch (error) {
    // git exits 1 for a name it refuses; any other failure says nothing about the name.
    if ((error as { code?: unknown }).code !== 1) throw error;
    return `the branch name discover/${repo} is not a valid git branch name`;
  }
  return undefined;
}

async function entryDirProblem(entryDir: string, id: string): Promise<string | undefined> {
  let stat: Awaited<ReturnType<typeof lstat>>;
  try {
    stat = await lstat(entryDir);
  } catch {
    return `${ENTRIES_DIR} has no directory for the id ${id}`;
  }
  if (!stat.isDirectory()) return `${ENTRIES_DIR}/${id} is not a directory`;
  const files = (await readdir(entryDir)).sort();
  if (files.join("\n") !== ENTRY_FILES.join("\n")) {
    return `${ENTRIES_DIR}/${id} holds ${JSON.stringify(files)}, not only ${ENTRY_FILES.join(" and ")}`;
  }
  for (const file of files) {
    const fileStat = await lstat(join(entryDir, file));
    if (!fileStat.isFile()) return `${ENTRIES_DIR}/${id}/${file} is not a regular file`;
    if (fileStat.size > FILE_MAX_BYTES) return `${ENTRIES_DIR}/${id}/${file} is larger than ${FILE_MAX_BYTES} bytes`;
  }
  return undefined;
}

// The fields of a drafted entry that the plan carries.
export function planned(written: PlannedEntry): PlannedEntry {
  const { repo, repoUrl, id, version, strictMinVersion, strictMaxVersion } = written;
  return { repo, repoUrl, id, version, strictMinVersion, strictMaxVersion };
}
