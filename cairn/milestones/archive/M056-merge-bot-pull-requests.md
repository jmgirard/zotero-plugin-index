# M056: Merge bot pull requests after a wait unless held

**Status:** done (2026-10-29, PR #110 https://github.com/jmgirard/zotero-plugin-index/pull/110)

**Goal:** The bot merges its own discovery and issue pull requests at its first daily run at least 48 hours after they open, unless it held them at opening, someone labeled them `hold` or closed them, or they fail its checks.

**Outcome:** `src/discover/holds.ts` holds `TOPICS`, `HOLD_REASONS` (`name-match`, `owner-unread`, `new-account`,
`update-host`, `issue-no-topic`), `nameKey`, `holdReasons`, `ownerCreatedAt`; `draftEntry` reads `/users/<owner>`
and the repo `topics` (beside `facts`, unpublished) and fills the handoff's required `holds`; `indexed()` also
returns owner, repo part, and name. `body()` writes `Hold: none` with `UNHELD_TEXT`, or the reasons with a
`HOLD_TEXT` sentence each; a held pull request gets the `hold` label, and a failed label request fails the entry
with its URL, so an issue run still posts the opened comment. `pnpm merge-discover` (`merge.ts`, `merge-cli.ts`)
skips by AC3's conditions (Hold line outside fences via `unfencedLines`, label in any case), drafts, and other
bases; reads the two files at the head SHA by the contents API; checks them with this run's merges beside
`plugins/`; reads the pull request again; squash-merges pinned to the SHA. `merge-discover.yml`: 05:13 UTC,
`discover` group, two write permissions, `cache-mode: none`. `githubClient.put`; `hold` label created. 8 of the
first 44 merged bot pull requests would have been held. Live run 40965380029 skipped #103 to #107 and succeeded.

**Decisions:** D-033 (the bot merges its own pull requests after a wait unless held). Milestone-local: none.

**Review:** Criteria audit (full) 16 findings, 15 taken; claim audit 58 claims, 11 corrected. Four-lens fan-out,
32 findings plus 1 own: 18 fixed (re-read before merge, fence-aware Hold line, label case, drafts and bases, issue
answer on label failure, `N entries failed`, stale docs), 6 follow-up into new row "Close gaps in bot holds and
merges" and existing "Keep the check summary in a cut body", 9 rejected (2 edge). No return. CI passed. 9 lessons
marked used, none captured (25 at the limit).
