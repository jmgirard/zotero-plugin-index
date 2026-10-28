# M041: Fail the build when report fields go missing

- **Status:** planned
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the change decides whether the daily build deploys the published report counts
- **Branch/PR:** —

## Goal

The daily build withholds the deploy, instead of publishing report counts of zero, when GitHub's issue list stops carrying `closed_by` or the `report` label is gone.

## Scope

**In:** in `buildData` (`src/build/build.ts`), a read of the `report` label of the index repo before the closed report issue list, and a check after the list that each listed issue has a `closed_by` key. Tests in `test/build.test.ts`. README, DESIGN, CHANGELOG.

**Out:** a renamed or deleted `works` or `broken` label, which makes `parseReport` refuse every report of that verdict → the row "Fail builds when closed_by goes missing", narrowed to that part at review. A page cap or time limit on the issue list → the row "Bound the build's report issue read". `countReports` keeps dropping an item with no `closed_by`, and its case in `test/report.test.ts` stays, since the build stops before the count. Reading each issue on its own when the list lacks the field is not planned: D-013 withholds the deploy instead.

## Acceptance criteria

- [ ] AC1: When an item of the closed report issue list has no `pull_request` key and no `closed_by` key, `pnpm build` prints a line that starts `cannot read the report issues:` and names `closed_by` and, when the item's `number` is a number, that number. It then writes no data file, exits 1, and reads no plugin. An issue whose `closed_by` is `null`, and a pull request item with no `closed_by` key, still let the build exit 0. Verified by: tests in `test/build.test.ts` for the missing key on the first page and on the second page of the list, and for the two items that still build.
- [ ] AC2: Before it reads the issue list, `pnpm build` reads the `report` label (`GET /repos/<repo>/labels/report`) of the repo whose issues it reads, `GITHUB_REPOSITORY` or else `INDEX_REPO`. When that read fails, for example with the HTTP 404 that GitHub returns for a renamed or deleted label, the build prints a line that starts `cannot read the report issues:` and names the failure. It then writes no data file, exits 1, and reads neither the issue list nor any plugin. Verified by: tests in `test/build.test.ts` for an HTTP 404 answer and a rejected fetch on the label read, and the present report-read tests updated to expect the label read as the first request.
- [ ] AC3: README's list of the cases where `pnpm build` writes no data file and exits 1, DESIGN.md's two passages that say a failed report issue read writes no file, and one new entry in CHANGELOG.md's `## Unreleased` section state the missing `closed_by` key (AC1) and the failed label read (AC2) as such cases.
- [ ] AC4: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1, T4
- AC2 → T2, T4
- AC3 → T3
- AC4 → T4

## Tasks

- [ ] T1: In `buildData` (`src/build/build.ts:90`), after `githubClient(fetch).pages(list)`, return the AC1 problem for the first issue item with no `closed_by` key (`!("closed_by" in item)`), before any plugin read. Add the AC1 tests to the "pnpm build and the report issues" block of `test/build.test.ts`, with the item on page 1 and on `ISSUES_PAGE_2`.
- [ ] T2: Read `${API}/repos/${indexRepo}/labels/report` with `githubClient(fetch).json` before the list, inside the same `try`, so a failure takes the present `cannot read the report issues:` path. Add the label URL to the `responses()` fixture, update the URL-order expectations (`urls.slice(0, 2)`, `urls.every(... "/issues?")`), and add the AC2 tests, including one for `GITHUB_REPOSITORY`.
- [ ] T3: Update README "Building the data" (the exit-1 list near line 682), DESIGN.md (the `pnpm build` passages near lines 225 and 507), and a CHANGELOG `## Unreleased` entry, written from same-session reads of the T1 and T2 code, wrapped near 76 columns.
- [ ] T4: Run `pnpm test` and `pnpm check`. Run `pnpm build --out <tmp>` once against the live API and confirm that it reads the label and the list and writes the file.

## Work log

- 2026-10-28: created by /milestone-plan.
- 2026-10-28: tier check: not run — work named at the question set.
- 2026-10-28: question set: work — the row "Fail builds when closed_by goes missing"; label check — also fail when the `report` label is renamed or deleted.
- 2026-10-28: idea vet: none found. D-013 already says that counts the build cannot read withhold the deploy, and a list item with no `closed_by` or a missing label are such cases. A live read on 2026-10-28 found a `closed_by` key on all 72 closed items of the repo's issue list and the `report` label present, so this guards against a future change.
- 2026-10-28: plan gate chose to fail the build over reading each issue on its own when `closed_by` is missing, because D-013 withholds the deploy for any unreadable count and a per-issue read adds one request per report; falsified by GitHub dropping `closed_by` from the list for good while keeping it on the single-issue read.
- 2026-10-28: plan gate chose a label read over treating an empty list as a failure, because an empty list is the true answer before the first report and after `not-counted` removals; falsified by a renamed label that the label read still finds.
- 2026-10-28: collision: absorbs the row "Fail builds when closed_by goes missing" in part; the rows "Bound the build's report issue read" and "Limit floods of report issues" cross-referenced; D-013 applied, not changed. No done milestone does this; M021 added the count.
- 2026-10-28: inbox sweep: 0 open issues; 1 open pull request, discovery bot pull request #57, with no overlap.
- 2026-10-28: the `works` and `broken` label gap, found while vetting, went into the absorbed row as its remainder instead of a new row, and the done M040 row was pruned (archive kept), since ROADMAP.md stood at 59 of its 60 lines (Scope Out).
- 2026-10-28: lessons used: 2026-10-25 (M001), 2026-10-28 (M038), 2026-10-26 (M018), 2026-10-28 (M036).

## Decisions

## Review
