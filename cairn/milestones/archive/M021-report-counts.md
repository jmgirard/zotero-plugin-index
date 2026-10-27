# M021: Show report counts on the plugin pages

**Status:** done (2026-10-27, PR #33 https://github.com/jmgirard/zotero-plugin-index/pull/33)

**Goal:** Each plugin page shows how many "works" and "broken" reports the version the index read has on each Zotero major, with links that open the report forms already filled in.

feature series: M020 -> M021. This milestone edits the CHANGELOG entry that M020 adds.

**Outcome:** `countReports` (`src/reports/count.ts`) drops pull requests, issues not closed as completed or whose
`closed_by` is not `github-actions[bot]`, `not-counted` issues, `parseReport` refusals, other versions, and malformed
items; per `user.id`, plugin, and major the newest by `created_at` counts, higher number on a tie. `buildData(..., indexRepo
= INDEX_REPO)` reads every page of `issues?labels=report&state=closed&sort=created&direction=asc` before any upstream
read; a failed read writes no file and exits 1 (problem lines through `oneLine`; empty `GITHUB_REPOSITORY` reads as unset).
Read records get `reports` (schema `reportCount`); `build.yml`'s build job holds `issues: read`. Pages show a `data-reports`
block: version read, counts or "No reports on this version yet.", and `reportHref` links. Forms and bot comment now present tense.

**Decisions:** none. AC1 amended to require the bot's close, matching D-013.

**Review:** AC1 amendment audited by two fresh readers; claim audit 52 read, 1 corrected. Return 1 on AC6, fixed by T6.
Four lenses, 21 findings: 10 fixed (issue order, one-line problems, empty `GITHUB_REPOSITORY`, tests, DESIGN), 2 follow-up
(row "Fail builds when closed_by goes missing" extended; new row "Bound the build's report issue read"), 9 rejected (1 edge:
a prefilled version `parseReport` refuses). CI passed. Rows "Collect works and broken user reports" and "Count only reports
the bot closed" graduated; "Test plugins load in headless Zotero" unparked. Lessons: 11 used, 1 captured, 2026-10-26 (M008,
used M009) evicted at the limit. M018 row pruned.
