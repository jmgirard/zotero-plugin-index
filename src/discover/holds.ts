import { type Fetch, githubClient } from "../upstream/reader.ts";

// The GitHub topics that discovery searches.
export const TOPICS = ["zotero-plugin", "zotero-addon"];

// How discover found a repo. A repo that several sources name takes the first in this order.
export const SOURCES = ["topic", "catalog", "code-search"] as const;
export type Source = (typeof SOURCES)[number];

// Why the bot holds a pull request for the maintainer instead of letting
// `pnpm merge-discover` merge it, in the order a `holds` list gives them.
export const HOLD_REASONS = ["name-match", "owner-unread", "new-account", "update-host", "issue-no-topic"] as const;
export type HoldReason = (typeof HOLD_REASONS)[number];

const API = "https://api.github.com";
// An owner account younger than this holds the pull request.
const NEW_ACCOUNT_MS = 30 * 24 * 60 * 60 * 1000;
// The hosts of an update.json that GitHub serves.
const GITHUB_HOSTS = ["github.com", "raw.githubusercontent.com"];
// Runs of a name that say nothing about which plugin it is.
const NOISE = new Set(["zotero", "plugin", "addon", "for"]);

// One entry of the index: its repo's lowercase owner and repo part, and its meta.json name.
export interface IndexedName {
  owner: string;
  repoPart: string;
  name?: string;
}

// A text lowercased and split into runs of a-z and 0-9, with the runs in NOISE dropped,
// then joined.
export function nameKey(text: string): string {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((run) => !NOISE.has(run)).join("");
}

export interface HoldFacts {
  // The new repo as lowercase owner/repo.
  repo: string;
  // The manifest name, when the manifest has one.
  name?: string;
  updateHost: string;
  topics: string[];
  // Whether the entry comes from an issue run.
  issueRun: boolean;
  // The owner's account creation time, or undefined when it could not be read.
  ownerCreatedAt?: Date;
  now: Date;
  indexed: IndexedName[];
}

export function holdReasons(facts: HoldFacts): HoldReason[] {
  const [owner, repoPart] = facts.repo.split("/");
  const nameKeyOf = facts.name === undefined ? "" : nameKey(facts.name);
  const repoKey = nameKey(repoPart);
  const matches = facts.indexed.some(
    (entry) =>
      entry.owner.toLowerCase() !== owner.toLowerCase() &&
      ((nameKeyOf !== "" && entry.name !== undefined && nameKey(entry.name) === nameKeyOf) || (repoKey !== "" && nameKey(entry.repoPart) === repoKey)),
  );
  const held: Record<HoldReason, boolean> = {
    "name-match": matches,
    "owner-unread": facts.ownerCreatedAt === undefined,
    "new-account": facts.ownerCreatedAt !== undefined && facts.now.getTime() - facts.ownerCreatedAt.getTime() < NEW_ACCOUNT_MS,
    "update-host": !GITHUB_HOSTS.includes(facts.updateHost),
    "issue-no-topic": facts.issueRun && !facts.topics.some((topic) => TOPICS.includes(topic)),
  };
  return HOLD_REASONS.filter((reason) => held[reason]);
}

// The owner's account creation time from `GET /users/<owner>`, or undefined when the read
// fails or gives no parseable `created_at`.
export async function ownerCreatedAt(fetch: Fetch, owner: string): Promise<Date | undefined> {
  try {
    const user = (await githubClient(fetch).json(`${API}/users/${owner}`)) as { created_at?: unknown } | null;
    const created = typeof user?.created_at === "string" ? Date.parse(user.created_at) : Number.NaN;
    return Number.isNaN(created) ? undefined : new Date(created);
  } catch {
    return undefined;
  }
}
