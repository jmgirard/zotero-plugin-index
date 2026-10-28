# M041: Fail the build when report fields go missing

**Status:** done (2026-10-28, PR #74 https://github.com/jmgirard/zotero-plugin-index/pull/74)

**Goal:** The daily build withholds the deploy, instead of publishing report counts of zero, when GitHub's issue list stops carrying `closed_by` or the `report` label is gone.

**Outcome:** `buildData` (`src/build/build.ts`) reads `labels/report` of `GITHUB_REPOSITORY` or `INDEX_REPO` with
`githubClient(fetch).json`, then the closed report issue list on the same client, in one `try`; a failed label read
(HTTP 404 for a renamed or deleted label) takes the `cannot read the report issues:` path and reads neither the list nor
any plugin. After the list, the first object item, not an array, with no `pull_request` and no `closed_by` key returns
"cannot read the report issues: issue #N in the list has no closed_by field" ("an issue" when `number` is not a number).
A `null` `closed_by`, pull requests, and non-object items still build; `countReports` is unchanged. Tests in
`test/build.test.ts` share a `LABEL` constant recorded in `responses()` and the direct `buildData` recordings. README
"Building the data", DESIGN, and a CHANGELOG entry name both cases; README says a fork that builds the data needs a
`report` label.

**Decisions:** D-021 annotates D-013: a missing label or `closed_by` key withholds the deploy, at the cost that a renamed
or deleted label, or a fork with no `report` label, stops every deploy until it exists.

**Review:** Plan criteria audit 7 findings taken; claim audit 28 read, 3 corrected. Four lenses, 21 items: 8 fixed (array
items, first-item test, stale request-order and Contract-boundary prose, README label-read and fork lines, D-021), 1
follow-up (null `closed_by` on every issue → new row "Catch more silent zero report counts", with the `works`/`broken`
label gap from the plan), 10 rejected (3 planned, 2 style, 2 false on wording, 2 umbrella sentences still true, 1 row
left to hygiene), 2 noted (the first scheduled build shows `issues: read` covers the label read). CI passed. Row "Fail
builds when closed_by goes missing" graduated; M040 row pruned at plan for the line cap. Lessons: 6 used, 0 captured.
