# M041: Fail the build when report fields go missing

- **Status:** in-progress
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the change decides whether the daily build deploys the published report counts
- **Branch/PR:** m041-fail-missing-report-fields

## Goal

The daily build withholds the deploy, instead of publishing report counts of zero, when GitHub's issue list stops carrying `closed_by` or the `report` label is gone.

## Scope

**In:** in `buildData` (`src/build/build.ts`), a read of the `report` label of the index repo before the closed report issue list, and a check after the list that each listed issue has a `closed_by` key. Tests in `test/build.test.ts`. README, DESIGN, CHANGELOG.

**Out:** a renamed or deleted `works` or `broken` label, which makes `parseReport` refuse every report of that verdict → the row "Fail builds when closed_by goes missing", narrowed to that part at review. A page cap or time limit on the issue list → the row "Bound the build's report issue read". `countReports` keeps dropping an item with no `closed_by`, and its case in `test/report.test.ts` stays, since the build stops before the count. Reading each issue on its own when the list lacks the field is not planned: D-013 withholds the deploy instead.

## Acceptance criteria

- [ ] AC1: When an item of the closed report issue list is an object with no `pull_request` key and no `closed_by` key, `pnpm build` prints a line that starts `cannot read the report issues:` and names `closed_by` and, when the first such item's `number` is a number, that number. It then writes no data file, exits 1, and reads no plugin. An issue whose `closed_by` is `null`, a pull request item with no `closed_by` key, and an item that is not an object still let the build exit 0, as today. Verified by: tests in `test/build.test.ts` for the missing key on the first page and on the second page of the list, for an item with no numeric `number` placed after a valid item, and for the three items that still build.
- [ ] AC2: Before it reads the issue list, `pnpm build` reads the `report` label (`GET /repos/<repo>/labels/report`) of the repo whose issues it reads, `GITHUB_REPOSITORY` or else `INDEX_REPO`. Any 2xx answer with a JSON body counts as present, and the build does not check the body. When the read fails, for example with the HTTP 404 that GitHub returns for a renamed or deleted label, the build prints a line that starts `cannot read the report issues:` and names the failure. It then writes no data file, exits 1, and reads neither the issue list nor any plugin. Verified by: tests in `test/build.test.ts` for an HTTP 404 answer and a rejected fetch on the label read, and the present report-read tests updated to expect the label read as the first request.
- [ ] AC3: README's list of the cases where `pnpm build` writes no data file and exits 1, DESIGN.md's two passages that say a failed report issue read writes no file, and one new entry in CHANGELOG.md's `## Unreleased` section state the missing `closed_by` key (AC1) and the failed label read (AC2) as such cases. README's sentence "If the build cannot read the report issues" near line 110 stays as written, since both cases are failed reads of the report issues.
- [ ] AC4: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1, T4
- AC2 → T2, T4
- AC3 → T3
- AC4 → T4

## Tasks

- [x] T1: In `buildData` (`src/build/build.ts:90`), after `githubClient(fetch).pages(list)`, return the AC1 problem for the first object item with no `pull_request` and no `closed_by` key (test `typeof item === "object" && item !== null` before `"closed_by" in item`), before any plugin read. Add the AC1 tests to the "pnpm build and the report issues" block of `test/build.test.ts`, with the item on page 1, on `ISSUES_PAGE_2`, and after a valid item with no numeric `number`.
- [x] T2: Read `https://api.github.com/repos/${indexRepo}/labels/report` (the literal origin, as the list URL writes it) with `githubClient(fetch).json` before the list, inside the same `try`, so a failure takes the present `cannot read the report issues:` path. Add a shared `LABEL` constant and record it wherever `[ISSUES]` is recorded: the `responses()` fixture and the direct `buildData` recordings near `test/build.test.ts:420` and `:463`; record the `example/fork` label URL in the `GITHUB_REPOSITORY` test near line 225. Update the URL-order expectations (`urls.slice(0, 2)`, `urls[0]` near line 235, `urls.every(... "/issues?")`), and add the AC2 tests.
- [x] T3: Update README "Building the data" (the exit-1 list near line 682), DESIGN.md (the `pnpm build` passages near lines 225 and 507), and a CHANGELOG `## Unreleased` entry, written from same-session reads of the T1 and T2 code, wrapped near 76 columns.
- [ ] T4: Run `pnpm test` and `pnpm check`. Run `pnpm build --out <tmp>` once against the live API with `GITHUB_TOKEN` set from `gh auth token`, and confirm that it writes the data file and prints no `cannot read the report issues:` line (the exit status can be 1 for plugin read failures).

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
- 2026-10-28: criteria audit (full mode, fresh Opus reader), 7 findings, all taken: AC1 narrowed to object items, with items that are not objects left building as today; AC1 names the first offending item and adds a probe with no numeric `number` after a valid item; T2 names every recording that needs the label URL and writes the literal origin, since `build.ts` has no `API`; AC2 states that any 2xx JSON answer counts as present; AC3 keeps README's "cannot read the report issues" sentence as written; T4 sets `GITHUB_TOKEN` and checks for the issue-read line, not the exit status. No D-entry blocks a criterion.
- 2026-10-28: lessons used: 2026-10-25 (M001), 2026-10-28 (M038), 2026-10-26 (M018), 2026-10-28 (M036).
- 2026-10-28: implement started on branch m041-fail-missing-report-fields.
- 2026-10-28: T1 done: `buildData` returns "cannot read the report issues: issue #N in the list has no closed_by field" ("an issue" when `number` is not a number) for the first object item with no `pull_request` and no `closed_by` key; the 3 stop tests failed with exit 0 before the change; 6 new tests pass; `pnpm test` 927 passed, 1 skipped; `pnpm check` clean.
- 2026-10-28: T2 done: `buildData` reads `labels/report` with `githubClient(fetch).json` inside the issue-read `try`, sharing one client with the list read; the label is recorded in `responses()` rather than in `test/fixtures/build/responses.json`, so each test that records `[ISSUES]` by hand also records `LABEL`; 5 tests failed before the read (3 URL-order tests, the 404 and rejected-fetch tests, which built with exit 0); `pnpm test` 929 passed, 1 skipped; `pnpm check` clean.
- 2026-10-28: T3 done: README exit-1 list gains the label-read and `closed_by` cases; DESIGN.md's Data build bullet and `build.yml` passage name both; one CHANGELOG `## Unreleased` entry; README's "If the build cannot read the report issues" sentence unchanged. The simple-english lint hook also flags 4 older lines in README.md (115, 472) and CHANGELOG.md (174, 269) that this milestone does not touch; left as they are. `pnpm test` 929 passed, 1 skipped; `pnpm check` clean.

## Decisions

## Review
