# M040: Answer issues that no bot run answered

- **Status:** planned
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the bot's comments and closes on "Add a plugin" and report issues reach the people who open them, and a closed report changes the published counts
- **Branch/PR:** —

## Goal

A daily run answers each open "Add a plugin" or report issue that no bot run answered, such as one whose run was canceled in the `discover` concurrency group.

## Scope

**In:** a new `unansweredIssues` function and `pnpm unanswered-issues` command (`src/issues/`) that list the open issues of one label that no `github-actions[bot]` comment answers. A sweep mode of `pnpm report-issue`, run by `report-issue.yml` on a daily schedule and on dispatch. A `pick` job in `add-plugin-issue.yml` that, on a daily schedule and on dispatch, names up to 3 such issues, and on `issues: opened` names the event's issue; the read and write jobs run `pnpm discover-issue` and `pnpm propose` once for each named issue. `pnpm discover-issue` reads the issue body from the API by `ISSUE_NUMBER` in place of `ISSUE_BODY`. `answerReport` posts no second comment. `issueAnswer` gives the new-pull-request answer when the open bot pull request for the repo closes this issue. Tests, README, CHANGELOG, DESIGN.

**Out:** an issue run that cancels a pending `Discover plugins` run → the candidate row "Answer issues whose run was canceled", narrowed at review. An automatic retry of a failed close of a report issue that the bot already commented on, and a label added to an issue more than 7 days after it opened → the candidate row "Answer report issues left open", narrowed at review. A cap on report issues per person → the row "Limit floods of report issues". An issue that has any bot comment, such as "The bot could not finish", stays for a maintainer, as now.

## Acceptance criteria

- [ ] AC1: `unansweredIssues` in `src/issues/unanswered.ts` returns the numbers, oldest first and at most `limit`, of the index repo's open issues (pull requests left out) that carry the given label, were created at least 1 hour and at most 7 days before the given `now`, and have no comment whose author login is `github-actions[bot]`. It returns no numbers when any of the 100 newest `issues`-event runs of the given workflow file has a status other than `completed`, and it throws when a list read fails. Tests in `test/unanswered.test.ts` cover a fixture issue on each side of each condition (label, open state, pull request, both age bounds, a bot comment against another account's comment, the limit), a run that is not completed, and a failed read, asserting which numbers return or which failure throws.
- [ ] AC2: When the issue already has a comment by `github-actions[bot]`, `answerReport` in `src/reports/issue.ts` posts no comment and sends the close it would send otherwise (completed for a taken report, not planned for a refused one). A failed read of the comments sends nothing and returns status 1. Tests in `test/report.test.ts` assert both cases and that an issue with no bot comment still gets one comment and one close.
- [ ] AC3: `pnpm report-issue --sweep` answers, with `answerReport` and in turn, each issue that `unansweredIssues` returns for the label `report`, the workflow file `report-issue.yml`, and a limit of 20. It exits 1 when the list read fails or any answer has status 1, after it tries the rest. `report-issue.yml` runs it daily on `schedule` and on `workflow_dispatch` from the default branch only, and runs `pnpm report-issue` as now on `issues: opened` with the label `report`. Tests assert a sweep over two unanswered issues and one answered issue posts two comments and two closes, and a sweep whose first answer fails still answers the second and exits 1.
- [ ] AC4: `add-plugin-issue.yml` runs daily on `schedule` and on `workflow_dispatch` from the default branch only, in the `discover` concurrency group. Its `pick` job, which reads no plugin repo, outputs the issue numbers: on `issues: opened` the event's issue when it carries `add-plugin`, else those that `pnpm unanswered-issues` prints for the label `add-plugin`, the workflow file `add-plugin-issue.yml`, and a limit of 3. The read job runs `pnpm discover-issue` and the write job runs `pnpm propose`, once for each number, with that number in `ISSUE_NUMBER`, and each job fails when any of its runs fails, after it tries the rest. `test/workflows.test.ts` asserts the triggers, the default-branch condition, the group, and that the read and write jobs take the numbers only from the `pick` job's output.
- [ ] AC5: `pnpm discover-issue` reads the issue body from the GitHub API for `ISSUE_NUMBER` and no longer reads `ISSUE_BODY`. A failed issue read is the `failed` outcome, so `pnpm propose` comments that the bot could not finish and leaves the issue open. Tests assert a body read from a fixture API and the failed outcome for an HTTP 503 answer.
- [ ] AC6: When the bot pull request open for the issue's repo has exactly one `Closes #<issue>` line outside code blocks naming this issue, `issueAnswer` posts the comment it posts for a new pull request, with that pull request's URL, and leaves the issue open, in place of "The bot already proposed this repo". Tests assert this case and that an open bot pull request naming another issue still gets the already-proposed answer.
- [ ] AC7: Each job of `add-plugin-issue.yml` and `report-issue.yml` sets `cache-mode: none` and passes issue numbers to commands only through `env:`. The `pick` job holds `contents: read`, `issues: read`, and `actions: read`; the read job adds `issues: read` to its present permissions; the report job adds `actions: read`; the write job keeps its present ones. `test/workflows.test.ts` asserts these facts for both files.
- [ ] AC8: README ("Proposing a plugin with an issue", "Reporting whether a plugin works"), CHANGELOG, and DESIGN state when each sweep runs, the conditions and limits of AC1, AC3, and AC4, that an issue with any bot comment stays for a maintainer, and that a sweep run can cancel a pending issue run, whose issue a later sweep answers. `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1
- AC2 → T2
- AC3 → T3
- AC4 → T5
- AC5 → T4
- AC6 → T4
- AC7 → T3, T5
- AC8 → T6

## Tasks

- [ ] T1: Write `test/unanswered.test.ts`, then `src/issues/unanswered.ts` with `unansweredIssues({ fetch, indexRepo, label, workflow, limit, now })`, using `githubClient(fetch).pages` for `issues?labels=<label>&state=open&sort=created&direction=asc&per_page=100`, each candidate's `comments?per_page=100`, and `actions/workflows/<file>/runs?event=issues&per_page=100`. Take the login from `REPORT_BOT` (`src/reports/count.ts`). Add `pnpm unanswered-issues --label <l> --workflow <file> --limit <n>` (`src/issues/cli.ts`), which prints one number per line, with an argument test.
- [ ] T2: In `answerReport`, read `<issue>/comments` after the issue and skip the post when a `github-actions[bot]` comment exists; add the AC2 tests to `test/report.test.ts`.
- [ ] T3: Add `--sweep` to `src/reports/issue-cli.ts` (no `ISSUE_NUMBER` then), with a test of the sweep through the CLI or an exported `sweepReports`; in `report-issue.yml` add `schedule` (daily, 03:13 UTC) and `workflow_dispatch`, an `if:` that admits them only from the default branch, `actions: read`, and the sweep step; update its `test/workflows.test.ts` block, which today asserts the `issues: opened` trigger alone.
- [ ] T4: Make `pnpm discover-issue` read the body with `githubClient(fetch).json` for `ISSUE_NUMBER` (`src/discover/issue-cli.ts`, `issueRead`), mapping a failed read to `failed`. Keep each open bot pull request's `closesLines` in `botPulls` (`src/discover/propose.ts:187`), sharing the parser with `close-issue.ts`, and use it in `issueAnswer`'s `known`. Add the AC5 and AC6 tests to `test/issue.test.ts` and `test/handoff.test.ts`.
- [ ] T5: Rework `add-plugin-issue.yml`: `schedule` (daily, 02:43 UTC, 12 hours from `Discover plugins`) and `workflow_dispatch`; the `pick` job; read and write jobs that loop over the numbers in a shell loop reading them from `env:`, with one handoff directory for each number in one artifact, `cache-mode: none`, and 30-minute timeouts. Add an `add-plugin-issue.yml` block to `test/workflows.test.ts`.
- [ ] T6: Update README, CHANGELOG `## Unreleased`, and DESIGN (Data sources, Function Families, Architecture) from same-session reads of the code, wrapped near 76 columns. Run `pnpm test` and `pnpm check`.

## Work log

- 2026-10-28: created by /milestone-plan.
- 2026-10-28: tier check: not run — work named at the question set.
- 2026-10-28: question set: work — sweep unanswered issues (rows "Answer issues whose run was canceled" and "Answer report issues left open"); run — implement right away in this session.
- 2026-10-28: question set: live checks on GitHub (opening test issues, dispatching a workflow) were not asked, so implement stops for the user's yes before any.
- 2026-10-28: idea vet: none found. A scheduled pass over open issues that no bot comment answers is the usual repair for missed or canceled event runs; it covers both labels the rows name, and the name says what it does.
- 2026-10-28: plan gate chose one `pick` job and a shell loop over its numbers in the existing read and write jobs over a job matrix, because matrix jobs share one job output (the read job's `artifact-id`) and a rerun of failed jobs would look for an artifact of another attempt; falsified by a matrix design whose write job finds each issue's handoff from this attempt only.
- 2026-10-28: plan gate chose a daily sweep inside `add-plugin-issue.yml` and its `discover` group over a separate workflow dispatching issue runs, because each dispatched run in the group cancels the pending one, so a batch of dispatches answers at most two issues; falsified by GitHub queueing more than one pending run in a group.
- 2026-10-28: plan gate chose to sweep only issues with no bot comment over also closing report issues the bot commented on, because a maintainer may reopen a report on purpose and the sweep cannot tell that from a failed close without reading issue events; falsified by a report left open after a failed close that a manual rerun does not close.
- 2026-10-28: plan gate chose the 1-hour and 7-day age bounds and the not-completed-run check over an age bound alone, so no sweep answers an issue whose own run is pending, and an issue whose run keeps failing before a comment stops being retried after 7 days.
- 2026-10-28: collision: absorbs part of the rows "Answer issues whose run was canceled" and "Answer report issues left open", both narrowed to their rest (Scope Out); "Limit floods of report issues" cross-referenced. D-005 (artifact handoff) still holds; D-013 holds, since the sweep closes with the same token, so its reports count; D-020 unchanged. No done milestone does this.
- 2026-10-28: inbox sweep: 0 open issues; 1 open pull request, discovery bot pull request #57, with no overlap.
- 2026-10-28: lessons used: 2026-10-25 (M001), 2026-10-25 (M006), 2026-10-27 (M022), 2026-10-26 (M018), 2026-10-28 (M036).
- 2026-10-28: checkpoint commit at a turn end while the full criteria audit (fresh Opus reader) runs; the criteria may change before implement starts.

## Decisions

## Review
