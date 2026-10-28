<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M043: Queue runs in the discover group

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — people who file "Add a plugin" issues wait for the bot's answer, and daily discovery opens the bot's pull requests
- **Branch/PR:** m043-queue-discover-runs

## Goal

A new run in the `discover` concurrency group waits its turn, so an opened issue or a sweep no longer cancels a pending `Discover plugins` run or issue run.

## Scope

**In:** Add `queue: max` to the workflow-level `concurrency` block of
`.github/workflows/discover.yml` and `.github/workflows/add-plugin-issue.yml`.
GitHub's docs ("Control the concurrency of workflows and jobs", read
2026-10-28) say that `queue: max` lets up to 100 runs be pending in a group.
Without it, one run can be pending, and a newer run cancels it. Past 100
pending, GitHub cancels further runs. The run that an opened issue without
the `add-plugin` label starts takes a group of its own, since its `pick` job
skips. Tests in `test/workflows.test.ts`. The workflow comments, README.md,
cairn/DESIGN.md, CHANGELOG.md, and the `MIN_AGE_MS` comment in
`src/issues/unanswered.ts` say so.

**Out:** The `report-sweep` group of `report-issue.yml` keeps one pending
run, since a newer sweep that cancels a pending sweep does the same work.
A dispatch of `discover.yml` from another ref still enters the `discover`
group, and one from a branch cut before this change enters it with the
default one-pending setting: row "Close the gaps in the issue sweeps". The
M040 sweep stays, and it answers the issue of a run that GitHub cancels past
100 pending.

## Acceptance criteria

- [x] AC1: In `.github/workflows/discover.yml` and
      `.github/workflows/add-plugin-issue.yml`, the workflow-level
      `concurrency` block holds exactly three keys: `group`,
      `cancel-in-progress: false`, and `queue: max`. `test/workflows.test.ts`
      asserts the text of each file from `concurrency:` to the next
      top-level key.
- [x] AC2: In `add-plugin-issue.yml`, the group expression gives
      `add-plugin-skipped-<run id>` to an `issues` run unless
      `contains(github.event.issue.labels.*.name, 'add-plugin')` holds, the
      same text that the `pick` job's `if:` uses. Every other run takes the
      group it takes on main: `add-plugin-skipped-<run id>` for a dispatch
      from a ref other than the default branch, and `discover` otherwise.
      `test/workflows.test.ts` asserts the group expression and the `pick`
      job's `if:`, and checks that both hold that `contains(...)` text.
- [x] AC3: GitHub accepts both changed workflow files. A
      `workflow_dispatch` of each on the milestone branch, made while no run
      of either workflow is queued, waiting, pending, or in progress,
      concludes `skipped` or `success` with every job skipped, and
      `gh run view` shows no workflow-file error.
- [x] AC4: Each paragraph or comment block that holds a hit of
      `grep -n -i -E 'cancel|pending|replace'` in README.md, cairn/DESIGN.md,
      CHANGELOG.md, `src/issues/unanswered.ts`,
      `.github/workflows/discover.yml`, and
      `.github/workflows/add-plugin-issue.yml` either describes the
      `discover` group as a queue (runs wait in turn, up to 100 pending, and
      GitHub cancels runs past that) or is about something other than the
      `discover` group.
- [x] AC5: CHANGELOG.md's Unreleased section says, in the M040 entry or in
      one new entry, that runs of `Discover plugins` and
      `Add a plugin from an issue` wait in turn in their shared group, up to
      100 pending, and that the run an issue without the `add-plugin` label
      starts takes a group of its own.
- [x] AC6: The `verify` slot is clean: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1, T2
- AC2 → T1, T2
- AC3 → T4
- AC4 → T2, T3
- AC5 → T3
- AC6 → T2, T3

## Tasks

- [x] T1: Tests first in `test/workflows.test.ts`. The add-plugin-issue.yml
      case uses `toContain` today, so it still passes with a key appended.
      Anchor it from `concurrency:` to the next top-level key, add a
      discover.yml describe that does the same, and add the `contains(...)`
      check of AC2. Run them and see each new assertion fail on main's files.
- [x] T2: Edit both workflows' `concurrency` blocks and the comments above
      them (`add-plugin-issue.yml` lines 19-23, `discover.yml` lines 18-19).
      Run `pnpm test` and `pnpm check`.
- [x] T3: Update README.md (the add-plugin paragraphs near lines 498-519),
      cairn/DESIGN.md (the discover.yml and add-plugin-issue.yml lines near
      445-475), CHANGELOG.md (the M040 entry near line 276 and a new entry),
      and the `MIN_AGE_MS` comment in `src/issues/unanswered.ts`, which must
      say that an issue run can now wait longer than an hour and that the
      not-completed check covers that wait. Run the AC4 grep and classify
      each hit in one work-log line. List added lines over 80 characters.
- [x] T4: Push the branch. Make sure that `gh run list` shows no queued,
      waiting, pending, or in-progress run of either workflow, then run
      `gh workflow run <file> --ref <branch>` for each, and record each
      run's conclusion and jobs from `gh run view`.

## Work log

- 2026-10-28: created by /milestone-plan.
- 2026-10-28: tier check: not run — work named at the question set
- 2026-10-28: question set: which candidate to plan — row "Answer issues whose run was canceled" (chip "Stop issues canceling discovery")
- 2026-10-28: idea vet: no concern. (1) GitHub's `queue: max` keeps up to 100 pending runs in a group, so it stops the cancel that the row names up to that cap. (2) No `Discover plugins` run was canceled in its 7 runs, and 4 issues were opened in all, so the change serves later volume at the cost of two config lines. (3) The row's framing predates GitHub's queue option (changelog 2026-05-07), so the plan uses that option.
- 2026-10-28: collision check: candidate row "Answer issues whose run was canceled" absorbed in full. The M022 plan audit's finding that a group per issue is no fix stands, since this plan keeps one shared group. M040 (done) added the sweep, kept here as the fallback past 100 pending. No D-entry overlaps.
- 2026-10-28: collision check: row "Close the gaps in the issue sweeps" gains the case of a dispatch from a branch cut before this change, which enters the group with the default one-pending setting.
- 2026-10-28: inbox sweep: 0 open issues; 1 open PR (#57, a bot discovery PR) with no overlap.
- 2026-10-28: lessons used: 2026-10-25 (M001), 2026-10-26 (M018), 2026-10-28 (M036), 2026-10-27 (M027).
- 2026-10-28: plan gate chose `queue: max` on the shared group over a group per issue (two runs could push one branch, M022 plan audit) and over a `discover` group on the write jobs alone (a job-level group still keeps one pending job); falsified by a run log that shows a run in the `discover` group canceled while fewer than 100 runs were pending.
- 2026-10-28: criteria audit (full, Opus reader): 9 findings, all taken. Background said the test asserts the block exactly; it uses `toContain`, so T1 anchors it. AC1 now names the three keys and the anchored text, and the docs citation moved to Scope. AC2 now ties the group to the `pick` job's `contains(...)` text and no longer promises a Review-section evaluation. AC3 now covers both workflows, an empty group, and the `skipped` conclusion of a run whose jobs all skip. AC4 now uses paragraphs, the docs' overflow wording, and `src/issues/unanswered.ts`; the ROADMAP row leaves at review hygiene. AC5 no longer says "no longer" of a state no release had. Mixed queue settings: T4 dispatches into an empty group, and old-branch dispatches went to a row. The `MIN_AGE_MS` comment joined T3. GitHub's docs name no maximum pending time, so the docs will say only "up to 100 pending".
- 2026-10-28: T4's branch dispatches run no job and were not posed at the question set; the agent takes them as part of implement's checks.
- 2026-10-28: changelog: one entry under Unreleased (AC5), or an edit of the M040 entry.
- 2026-10-28: implement started on branch m043-queue-discover-runs, cut from main at 171917a.
- 2026-10-28: T1: `test/workflows.test.ts` gains a `concurrency` helper (the top-level block up to the next unindented line, and each non-comment line setting a `concurrency` key), an anchored block test for each workflow, and the shared `contains(...)` label check; the 3 new tests fail on main's files because the block lacks `queue: max` and the label clause; 38 others pass.
- 2026-10-28: T1 choice: one group expression that wraps the issue clause and the dispatch clause in parentheses before `&& format(...)`, since GitHub's `&&` binds tighter than `||`.
- 2026-10-28: T2: both `concurrency` blocks gain `queue: max`, the add-plugin-issue.yml group gains the unlabeled-issue clause, and both comments describe the queue; Ruby's YAML parser reads the three keys in each; `pnpm test` 936 passed, 1 skipped (the case-sensitive volume case); `pnpm check` 42 entries, 0 problems.
- 2026-10-28: T3: README's group paragraph, DESIGN's add-plugin-issue.yml line, CHANGELOG's M040 entry (cancel example and sweep-cancel sentences removed) plus one new entry, the add-plugin-issue.yml schedule comment, and the `MIN_AGE_MS` comment now describe the queue; both sweeps call `unansweredIssues`, so the comment holds for both. `pnpm test` 936 passed, 1 skipped; `pnpm check` 0 problems.
- 2026-10-28: T3 AC4 grep (27 hit lines): queue text at DESIGN.md:469-470, CHANGELOG.md:315-317, README.md:516, add-plugin-issue.yml:7 and 22, discover.yml:21; `cancel-in-progress` keys at add-plugin-issue.yml:27 and discover.yml:24; other subjects at DESIGN.md:555 (BASE_URL), CHANGELOG.md:133 and README.md:34, 72, 240, 722 (replaces), README.md:559 (report group), and the handoff `replaces` comments and `cancelled()` conditions at add-plugin-issue.yml:115, 118 and discover.yml:71, 74, 86; `src/issues/unanswered.ts` has none.
- 2026-10-28: T3: added prose lines in README, CHANGELOG, and DESIGN are at most 80 characters; added workflow and source comments run to 88, as the comments around them do. The simple-english hook flagged older text (README.md:115, 480; CHANGELOG.md:174, 269, 312), left as is since this milestone does not own it.
- 2026-10-28: T4: pushed the branch at 2c994ac; `gh run list` showed no run of either workflow other than `completed`; dispatched both on the branch: add-plugin-issue.yml run 40698348713 and discover.yml run 40698353541 each concluded `skipped`, every job `skipped` (pick, read, write; read, write), and `gh run view` showed no workflow-file error.
- 2026-10-28: claim audit: 21 claims read, 2 corrected — .github/workflows/add-plugin-issue.yml (the schedule comment now says the sweep answers an issue whose run GitHub canceled, and the concurrency comment says a later sweep can answer such an issue while it is at most 7 days old; the same reader's re-read found both hold).
- 2026-10-28: implement done; `pnpm test` 936 passed, 1 skipped; `pnpm check` 0 problems; status set to review.
- 2026-10-28: review: AC1-AC6 evidence recorded and ticked; `cairn_validate` passed; generic profile adds no toolchain checks; four-lens review spawned, findings pending (checkpoint).
- 2026-10-28: review: 22 findings settled (10 fix now, 5 follow-up, 7 reject; none shows a criterion failing or a load-bearing defect, so no return); fixes in 083c15d; after them `pnpm test` 936 passed, 1 skipped, `pnpm check` 0 problems, the AC4 grep's queue paragraphs still describe the queue, and added prose lines stay within 80 characters.

## Decisions

## Review

Evidence gathered 2026-10-28 on branch head 3451bee; main at 171917a, unmoved since the cut.

- AC1: `awk` over each file prints the top-level block as `group`, `cancel-in-progress: false`, `queue: max` and nothing else (discover.yml group `discover`); Vitest verbose: "queues its runs in the discover group" and "queues the runs whose pick job can run in the discover group…" pass, each asserting the block up to the next unindented line plus a single non-comment `concurrency:` line; T1 recorded both failing on main's files for the missing `queue: max` line.
- AC2: the committed group is `((issues && !contains(github.event.issue.labels.*.name, 'add-plugin')) || (workflow_dispatch && ref != default)) && format('add-plugin-skipped-{0}', run_id) || 'discover'` (`&&` above `||`). Evaluated: unlabeled issue → skipped group; labeled issue → `discover`; schedule → `discover`; default-branch dispatch → `discover`; other-ref dispatch → skipped group, matching main's result for the last four. Vitest: "tests the label in the group with the same text as the pick job" passes, asserting `github.event_name == 'issues' && !<contains text>` in the block and `github.event_name == 'issues' && <contains text>` in the pick job; the block test asserts the whole expression; the pick `if:` stays asserted exactly by the triggers test. The claim audit's independent evaluation of the five cases agreed.
- AC3: `gh run view` read 2026-10-28: run 40698348713 (Add a plugin from an issue) and run 40698353541 (Discover plugins), both `workflow_dispatch` on the branch at 2c994ac, conclude `skipped` with every job `skipped` (3 and 2 jobs) and no workflow-file error; T4 logged no non-completed run of either workflow just before. Since 2c994ac, `git diff 2c994ac HEAD -- .github` changes only comment lines in add-plugin-issue.yml, so the dispatched files' keys are the ones that merge.
- AC4: `grep -n -i -E 'cancel|pending|replace'` over the six files: 27 hit lines in 14 paragraphs or comment blocks. Queue descriptions: README.md:514-520, CHANGELOG.md:314-320 (its "Before" sentence names the old behavior as past), DESIGN.md:468-473, add-plugin-issue.yml:6-9 and 20-25, discover.yml:18-21. Other subjects: the `cancel-in-progress` keys (add-plugin-issue.yml:28, discover.yml:24); README.md:34, 72, 240, 722, CHANGELOG.md:133, DESIGN.md:555 (`replaces` about descriptions, language lists, entries, pages, BASE_URL); README.md:559 (the report group); handoff `replaces` comments and `cancelled()` conditions (add-plugin-issue.yml:116, 119; discover.yml:71, 74, 86). `src/issues/unanswered.ts`: no hits.
- AC5: CHANGELOG.md Unreleased, new last entry: "Runs of `Discover plugins` and `Add a plugin from an issue` wait in turn in their shared concurrency group, up to 100 pending. … The run that an issue without the label `add-plugin` starts does nothing, and it now takes a group of its own." Backed by the AC1 and AC2 tests.
- AC6: `pnpm test`: 19 files, 936 passed, 1 skipped (the case-sensitive volume case); `pnpm check`: 42 entries, 0 problems.
- gate: `cairn_validate` all checks passed; the generic profile's consistency-gate names no toolchain checks; no DESIGN principle changed, so no `cairn_impact` run.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: AC3's dispatches show GitHub accepts the files, not that a second run waits instead of canceling — reject (planned change: the plan took the queue behavior from GitHub's docs and AC3 checks acceptance only).
- diff-bug #2: the label test hardcodes the `contains(...)` text a third time and repeats the exact checks — fix now, fixed 083c15d: take the text from the pick job's `if:` with a regex and assert the group holds its negation.
- diff-bug #3: the `keys` regex `concurrency\s*:` also matches a step name or script line holding that text — fix now, fixed 083c15d: match only a key line, `^\s*["']?concurrency["']?\s*:`, ignoring case.
- diff-bug #4: the test comment above the block test restates the test name — fix now, fixed 083c15d: delete it.
- diff-bug #5: "run in turn" can read as a promise of arrival order, which GitHub's docs say is not guaranteed — fix now, fixed 083c15d: say runs go one at a time and GitHub does not promise their order.
- diff-bug #6: the `MIN_AGE_MS` comment holds only while the waiting run is among the 100 newest `issues` runs — fix now, fixed 083c15d: say so in the comment.
- diff-bug #7: the CHANGELOG entry's "a later sweep can answer its issue" overstates, since the sweep's own limits apply — fix now, fixed 083c15d: "as for any unanswered issue".
- diff-bug #8: a dispatch from a branch cut before this change joins with the default one-pending setting — follow-up: already in row "Close the gaps in the issue sweeps" (plan).
- blame-history #1: `discover.yml` dispatches from another ref still enter the `discover` group, now taking a queue place — follow-up: absorbed by row "Close the gaps in the issue sweeps", which names that gap.
- blame-history #2: the `MIN_AGE_MS` comment does not say that the not-completed check is the real guard — reject (false: the comment's second sentence says a waiting run keeps `unansweredIssues` returning none).
- blame-history #3: README and DESIGN no longer say that a sweep run waits in the `discover` group — fix now, fixed 083c15d: name the runs that use the group (labeled issue runs, sweeps, default-branch dispatches).
- blame-history #4: no test or run shows the queue's waiting or its cap of 100 — reject (planned change, as diff-bug #1).
- prior-review #1: the `keys` match is case-sensitive and misses a quoted key, the form M016's review taught the cache check to catch — fix now, fixed 083c15d (with diff-bug #3).
- ripple #1: ROADMAP row "Answer issues whose run was canceled" still states the old cancel as open — follow-up: the row graduates at this milestone's post-merge hygiene.
- ripple #2: DESIGN.md says add-plugin-issue.yml runs on opened issues "when that label is set" and in the `discover` group with no exception — fix now, fixed 083c15d (with blame-history #3).
- ripple #3: README says the workflow runs in the `discover` group, true only for labeled issue runs, sweeps, and default-branch dispatches — fix now, fixed 083c15d (with blame-history #3).
- ripple #4: row "Close the gaps in the issue sweeps" may need a recheck — reject (false: its M043 note describes old-branch dispatches, which is accurate).
- ripple #5: row "Answer report issues left open" points at the row that hygiene removes — follow-up: hygiene updates that pointer when it graduates the row.
- ripple #6: report-issue.yml says a newer sweep cancels a pending one — reject (false: the `report-sweep` group keeps one pending run, Scope Out).
- ripple #7: workflow comments say a run is "still on its way" — reject (false: the meaning matches the code and the new comment).
