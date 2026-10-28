<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M043: Queue runs in the discover group

- **Status:** planned
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — people who file "Add a plugin" issues wait for the bot's answer, and daily discovery opens the bot's pull requests
- **Branch/PR:** —

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

- [ ] AC1: In `.github/workflows/discover.yml` and
      `.github/workflows/add-plugin-issue.yml`, the workflow-level
      `concurrency` block holds exactly three keys: `group`,
      `cancel-in-progress: false`, and `queue: max`. `test/workflows.test.ts`
      asserts the text of each file from `concurrency:` to the next
      top-level key.
- [ ] AC2: In `add-plugin-issue.yml`, the group expression gives
      `add-plugin-skipped-<run id>` to an `issues` run unless
      `contains(github.event.issue.labels.*.name, 'add-plugin')` holds, the
      same text that the `pick` job's `if:` uses. Every other run takes the
      group it takes on main: `add-plugin-skipped-<run id>` for a dispatch
      from a ref other than the default branch, and `discover` otherwise.
      `test/workflows.test.ts` asserts the group expression and the `pick`
      job's `if:`, and checks that both hold that `contains(...)` text.
- [ ] AC3: GitHub accepts both changed workflow files. A
      `workflow_dispatch` of each on the milestone branch, made while no run
      of either workflow is queued, waiting, pending, or in progress,
      concludes `skipped` or `success` with every job skipped, and
      `gh run view` shows no workflow-file error.
- [ ] AC4: Each paragraph or comment block that holds a hit of
      `grep -n -i -E 'cancel|pending|replace'` in README.md, cairn/DESIGN.md,
      CHANGELOG.md, `src/issues/unanswered.ts`,
      `.github/workflows/discover.yml`, and
      `.github/workflows/add-plugin-issue.yml` either describes the
      `discover` group as a queue (runs wait in turn, up to 100 pending, and
      GitHub cancels runs past that) or is about something other than the
      `discover` group.
- [ ] AC5: CHANGELOG.md's Unreleased section says, in the M040 entry or in
      one new entry, that runs of `Discover plugins` and
      `Add a plugin from an issue` wait in turn in their shared group, up to
      100 pending, and that the run an issue without the `add-plugin` label
      starts takes a group of its own.
- [ ] AC6: The `verify` slot is clean: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1, T2
- AC2 → T1, T2
- AC3 → T4
- AC4 → T2, T3
- AC5 → T3
- AC6 → T2, T3

## Tasks

- [ ] T1: Tests first in `test/workflows.test.ts`. The add-plugin-issue.yml
      case uses `toContain` today, so it still passes with a key appended.
      Anchor it from `concurrency:` to the next top-level key, add a
      discover.yml describe that does the same, and add the `contains(...)`
      check of AC2. Run them and see each new assertion fail on main's files.
- [ ] T2: Edit both workflows' `concurrency` blocks and the comments above
      them (`add-plugin-issue.yml` lines 19-23, `discover.yml` lines 18-19).
      Run `pnpm test` and `pnpm check`.
- [ ] T3: Update README.md (the add-plugin paragraphs near lines 498-519),
      cairn/DESIGN.md (the discover.yml and add-plugin-issue.yml lines near
      445-475), CHANGELOG.md (the M040 entry near line 276 and a new entry),
      and the `MIN_AGE_MS` comment in `src/issues/unanswered.ts`, which must
      say that an issue run can now wait longer than an hour and that the
      not-completed check covers that wait. Run the AC4 grep and classify
      each hit in one work-log line. List added lines over 80 characters.
- [ ] T4: Push the branch. Make sure that `gh run list` shows no queued,
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

## Decisions

## Review
