# M008: Find new plugin repos by topic search

**Status:** done (2026-10-26, PR #8 https://github.com/jmgirard/zotero-plugin-index/pull/8)

**Goal:** `pnpm discover` searches the `zotero-plugin` and `zotero-addon` topics on GitHub and drafts an entry for each new repo that passes the inclusion bar, up to a set number per run.

feature series: M008 -> M009 -> M010.

**Outcome:** `discover()` (`src/discover/discover.ts`) pages through both topics' search (`sort=updated`, API host
only), joins them by lowercase owner/repo, skips repos an entry's `repoUrl` names (ignoring case) or a skip set
names, and reads the rest with `readUpstream`, newest `pushed_at` first, up to `budget` reads and `limit` entries
written through `writeEntry`; an id an entry has is `entry-exists`. A state file keeps refused repos for those the
search found and the index lacks, read again on a new `pushed_at` or after 30 days; `github-http-error`,
`request-failed`, `unexpected-error`, and output-directory refusals are not kept. The report lists read items
(written with version and range, or a typed failure), skips, an unread count, and warnings. The CLI
(`src/discover/cli.ts`, `--limit 5 --budget 100`, `.cache/discovery-state.json`) prints the report before the state
write. `reader.ts` exports `githubClient`, whose `get` refuses URLs off the API host. README and CHANGELOG: M009.

**Decisions:** none milestone-local.

**Review:** Four-lens fan-out, one pass, 31 findings: 19 fixed on the branch, 5 rejected (1 edge: concurrent
local runs), 7 to candidate rows: new "Retry repos refused by a download error", and notes in "Stop inflating past
the declared size", "Warn when the daily build degrades", "Catch stray and unportable entry files", and "Read
stable releases before prereleases". CI passed. Lessons: 7 marked used M008, 2 captured.
