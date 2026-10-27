# M028: Keep issues open on entry write errors

**Status:** done (2026-10-27, PR #45 https://github.com/jmgirard/zotero-plugin-index/pull/45)

**Goal:** The "Add a plugin" bot leaves an issue open, and its run fails, when the bot cannot write the entry it drafted for the plugin.

**Outcome:** `draftEntry` (`src/discover/discover.ts`) marks a `writeEntry` refusal other than `unsafe-id` (an `entry-exists` from the output directory, or `write-failed`) as `buildLevel`, with `recorded` unchanged, so `readOutcome` (`src/discover/issue.ts`) turns it into the `failed` outcome: a "could not finish" comment with the failure name and message, no close, exit 1. An id that an entry or an open bot pull request has, and `unsafe-id`, still close the issue as not planned; the discover run's recording is unchanged. Tests in `test/issue.test.ts`: the old close test became a two-case open-issue table (an outDir under a regular file gives `write-failed`), and a two-case table pins the id-clash and `unsafe-id` closes. README, the Unreleased CHANGELOG "Add a plugin" entry, DESIGN, and the `Drafted`, `draftEntry`, `issueRead`, `issueAnswer`, and handoff comments state the rule.

**Decisions:** none. The plan chose the `buildLevel` mark over matching failure names, since the index-id refusal shares `entry-exists`, and over a new field.

**Review:** Plan audit (full) 3 findings taken. Claim audit: 18 claims read, 7 corrected. Planted defect (`unsafe-id` marked too) turned the `unsafe-id` case red. Four-lens pass, 13 findings: 3 fixed in `423c2f7` (CHANGELOG and README rewraps, the recording comment), 9 rejected (4 planned, 4 false, 1 style), 1 noted, none follow-up. CI green. Hygiene: row "Keep issues open on entry write errors" graduated; M025 row pruned; 4 lessons marked used M028; none captured.
