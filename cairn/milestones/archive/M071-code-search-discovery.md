# M071: Find plugins by GitHub code search

**Status:** done (2026-10-31, PR #504 https://github.com/jmgirard/zotero-plugin-index/pull/504)

**Goal:** `pnpm discover` also runs five GitHub code searches for Zotero plugin files, so a plugin that no topic and no catalog names can reach the index.

**Outcome:** `discover()` takes a `codeSearch` option, which `pnpm discover` sets to `CODE_SEARCHES` (two
`manifest.json` and three `package.json` queries). `searchCode` pages `/search/code` through `githubClient().get`,
which now takes a time limit (60 s), sends at most `CODE_SEARCH_RATE` 10 requests in any 60 s (failed ones
counted, plus 1 ms), and sends none from `CODE_SEARCH_CUTOFF_MS` 8 minutes after `startedAt`. A failed request or
a page with no items warns by query and ends only that query; item warnings cap at 10 a query; queries that all
finish empty warn once. Names go through M070's skip and `lookUp` in a shared `add`; a name whose lookup failed
stays open to a later source. Join order topic, catalog, code search (`SOURCES`). One injected `Clock` drives the
pacing and every `runMs` check. `body()` says "by GitHub code search for Zotero plugin files"; no
`issue-no-topic` hold (D-042). `discover.yml` gains a `budget` dispatch input. README, DESIGN, CHANGELOG.

**Decisions:** none new; D-042 (plan). Scope amended at the T6 stop, by the user's choice: a branch dispatch skips
the read job, so the token check moved to the first run on main after the merge.

**Review:** Claim audit 60 claims, 5 corrected. Four-lens fan-out, 34 findings: 16 fixed (empty-index warning,
lookup-failure names reopened, item warning cap, tests for next links, incomplete results, body stall, stale DESIGN
and README lines), 8 to rows (new parked "Harden code search against limits"; notes in "Check each redirect of
GitHub API reads", "Skip closed bot pull requests in local discover runs", "Bound the whole discover workflow's
time"), 9 rejected, 1 noted. CI passed. Candidate "Find plugins whose repos carry no topic" graduated. Lessons: 8
used M071, none captured. The backfill rounds and the token check run after the merge (Scope).
