# M057: Let a dispatched merge run set its own wait

**Status:** done (2026-10-30, PR #111 https://github.com/jmgirard/zotero-plugin-index/pull/111)

**Goal:** A by-hand run of `Merge bot pull requests` can merge clean bot pull requests after a shorter wait than 48 hours, so a first backfill of the index can land every clean plugin at once.

**Outcome:** `pnpm merge-discover` takes no arguments or exactly `--wait-hours <n>` (0 to 9999; the usage line
otherwise, before the `GITHUB_REPOSITORY` check); `mergeDiscover` takes `waitHours` (default `DEFAULT_WAIT_HOURS`,
48), throws on a value that is not a whole number of at least 0, and skips an unreadable or future `created_at`
with its own reason. `merge-discover.yml` gains the `wait_hours` number input (default 48) through env
`WAIT_HOURS` and `${WAIT_HOURS:+--wait-hours "$WAIT_HOURS"}`, so scheduled runs keep 48. `UNHELD_TEXT` adds "or
sooner in a run that the maintainer starts by hand". README backfill steps; D-034. Backfill, 2026-10-29 to 30:
#104 to #107 merged by hand after `pnpm check` with main's entries; five rounds of discover (`limit` 100) then
merge (`wait_hours` 0) read every tagged repo (unread 0); 210 bot pull requests merged with no failure, and the
index went from 58 to 272 entries (`pnpm check` 0 problems). 18 stay open: #103 (no Hold line) and 17 held
(name-match 6, update-host 7, new-account 3, both 1). Round 3, dispatched while a merge ran, drafted 54 entries
already merged, which its write step skipped (lesson captured).

**Decisions:** D-034 (a merge run started by hand may set a shorter wait, annotating D-033). Milestone-local: none.

**Review:** Criteria audit (full) 14 findings, all taken; claim audit 30 claims, 8 corrected, plus 1 on re-read.
Four-lens fan-out, 25 findings: 11 fixed (bot pull request text names hand runs, `mergeDiscover` refuses a bad
wait, README wait bullet and "sooner", CHANGELOG, DESIGN skip list and widths), 1 follow-up into "Close gaps in
bot holds and merges" (6), 13 rejected (1 edge). No return. CI passed. Hold audit of the 58 earlier entries: 13
flagged, reported to the user. 8 lessons marked used; 1 captured; 2026-10-28 (M042) evicted at the limit.
