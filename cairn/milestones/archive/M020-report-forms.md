# M020: Answer report issues from two forms

**Status:** done (2026-10-27, PR #32 https://github.com/jmgirard/zotero-plugin-index/pull/32)

**Goal:** A person can file a "works" or "broken" report on a plugin through an issue form, and a bot checks the report, answers it, and closes the issue.

feature series: M020 -> M021. M020 writes the series' one CHANGELOG entry, since the forms are visible in GitHub's issue chooser once merged, and M021 edits it.

**Outcome:** Forms `works.yml` and `broken.yml` (inputs `plugin`, `version`, `zotero`; labels `report` plus
`works` or `broken`); labels `report`, `works`, `broken`, `not-counted` created. `parseReport`
(`src/reports/report.ts`) returns the first problem: `missing-heading`, `no-response`, `unknown-plugin` (quotes no
issue text), `bad-plugin-version` (over 100 characters or whitespace), `bad-zotero-version` (first number outside 7
to the newest `ZOTERO_MAJORS`), `bad-verdict`. `pnpm report-issue` (`src/reports/issue.ts`) reads the issue from the
API and the entry ids with its own `readdir`, comments with each issue value in a `code()` span, and closes as
completed or not planned; a failed read sends nothing, a failed comment sends no close, each exits 1.
`report-issue.yml`: one job on `issues: opened` with label `report`, `contents: read`, `issues: write`,
`cache-mode: none`, no concurrency group, only the issue number in `env:`, checked by `test/workflows.test.ts`.

**Decisions:** none. D-013 (planned with M021) sets where reports live and how they count.

**Review:** Criteria audit (full) 19 findings taken; claim audit 45 read, 6 corrected. No return or amendment.
Four lenses, 42 findings: 16 fixed (stale DESIGN text, the event check and trigger test, no quoted reporter text,
message fixes), 11 follow-up into new rows "Answer report issues left open", "Count only reports the bot closed",
"Limit floods of report issues", "Fail issue runs with no plugins folder", 15 rejected (2 edge: case-sensitive id).
CI passed. Row "Collect works and broken user reports" narrowed to M021's part; M017 row pruned. Lessons: 6 used, M018's corrected (`grep -c` on a joined file), 1 captured, 2026-10-25 (M001, used M009) evicted at the limit.
