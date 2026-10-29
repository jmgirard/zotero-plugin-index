import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import { draftEntry } from "../src/discover/discover.ts";
import type { IndexedName } from "../src/discover/holds.ts";
import { fixtureFetch, type Responses } from "./support/fixture-fetch.ts";
import { pluginRepo } from "./support/plugin-repo.ts";

const NOW = new Date("2026-10-29T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const publicLookup = async () => ["140.82.112.3"];

const temps: string[] = [];
afterAll(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "zpi-holds-"));
  temps.push(dir);
  return dir;
}

// The index holds one entry, "Paper Sidebar" from alice/zotero-paper-sidebar.
const INDEXED: IndexedName[] = [{ owner: "alice", repoPart: "zotero-paper-sidebar", name: "Paper Sidebar" }];

// The hold reasons of the entry that draftEntry drafts from `responses` for `repo`.
async function holds(repo: string, responses: Responses, issueRun = false) {
  const { fetch } = fixtureFetch(responses);
  const drafted = await draftEntry(`https://github.com/${repo}`, {
    fetch,
    lookup: publicLookup,
    outDir: tempDir(),
    ids: new Set(),
    names: INDEXED,
    now: NOW,
    issueRun,
  });
  if (!drafted.ok) throw new Error(`draftEntry refused: ${drafted.message}`);
  return drafted.holds;
}

const ago = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();

describe("the hold reasons", () => {
  test("an entry that meets none gets none", async () => {
    expect(await holds("bob/zotero-tagger", pluginRepo("bob/zotero-tagger", "tagger@example.org", { name: "Tagger" }))).toEqual([]);
  });

  test.each<[string, string, Parameters<typeof pluginRepo>[2], boolean, string[]]>([
    ["name-match by the manifest name", "bob/sidebar-tool", { name: "Zotero Paper Sidebar" }, false, ["name-match"]],
    ["name-match by the repo part", "bob/Paper-Sidebar", { name: "Reading Pane" }, false, ["name-match"]],
    ["owner-unread for an account with no created_at", "bob/zotero-tagger", { name: "Tagger", ownerCreatedAt: "not a date" }, false, ["owner-unread"]],
    ["new-account for an account 29 days old", "bob/zotero-tagger", { name: "Tagger", ownerCreatedAt: ago(29) }, false, ["new-account"]],
    ["update-host for an update.json on another host", "bob/zotero-tagger", { name: "Tagger", updateHost: "updates.example.org" }, false, ["update-host"]],
    ["update-host for github.com with a port", "bob/zotero-tagger", { name: "Tagger", updateHost: "github.com:8443" }, false, ["update-host"]],
    ["issue-no-topic for an issue run's repo with neither topic", "bob/zotero-tagger", { name: "Tagger", topics: ["zotero"] }, true, ["issue-no-topic"]],
  ])("%s", async (_name, repo, options, issueRun, expected) => {
    expect(await holds(repo, pluginRepo(repo, "x@example.org", options), issueRun)).toEqual(expected);
  });

  test("an account exactly 30 days old does not hold", async () => {
    expect(await holds("bob/zotero-tagger", pluginRepo("bob/zotero-tagger", "x@example.org", { name: "Tagger", ownerCreatedAt: ago(30) }))).toEqual([]);
  });

  test("owner-unread for a failed account read", async () => {
    const responses = pluginRepo("bob/zotero-tagger", "x@example.org", { name: "Tagger" });
    responses["https://api.github.com/users/bob"] = { status: 404, json: { message: "Not Found" } };
    expect(await holds("bob/zotero-tagger", responses)).toEqual(["owner-unread"]);
  });

  test("a name that matches an entry of the same owner does not hold", async () => {
    expect(await holds("alice/paper-sidebar-2", pluginRepo("alice/paper-sidebar-2", "x@example.org", { name: "Paper Sidebar" }))).toEqual([]);
  });

  test("a discover run's repo with neither topic does not hold", async () => {
    expect(await holds("bob/zotero-tagger", pluginRepo("bob/zotero-tagger", "x@example.org", { name: "Tagger", topics: [] }))).toEqual([]);
  });

  test("an entry that meets several reasons gets them in order", async () => {
    const options = { name: "Paper Sidebar", ownerCreatedAt: ago(1), updateHost: "updates.example.org", topics: [] };
    expect(await holds("bob/zotero-tagger", pluginRepo("bob/zotero-tagger", "x@example.org", options), true)).toEqual([
      "name-match",
      "new-account",
      "update-host",
      "issue-no-topic",
    ]);
  });
});
