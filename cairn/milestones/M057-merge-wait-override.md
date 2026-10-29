# M057: Let a dispatched merge run set its own wait

- **Status:** planned
- **Priority:** high
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — it changes when the published index gains plugins and adds a workflow input
- **Branch/PR:** —

## Goal

A by-hand run of `Merge bot pull requests` can merge clean bot pull requests after a shorter wait than 48 hours, so a first backfill of the index can land every clean plugin at once.

## Scope

**In:** a `--wait-hours <n>` option of `pnpm merge-discover` (default 48, 0 allowed); a `wait_hours` input of
`merge-discover.yml` that only a dispatch sets; skip reasons that name the wait in force; README, CHANGELOG, and
D-034 annotating D-033. After the merge: merge #104 to #107 by hand and run the backfill (T5, T6).

**Out:** any change to the hold reasons or to `pnpm discover`'s limits; removing entries that the hold audit of
the 58 merged entries flagged (the user's call, reported in chat); the merge job's whole-run limit, which stays in
row "Close gaps in bot holds and merges" (6).

## Acceptance criteria

- [ ] AC1: `pnpm merge-discover` takes either no arguments or exactly `--wait-hours <n>`, where `<n>` matches
      `^(0|[1-9]\d{0,3})$`. With no arguments the wait is 48 hours. The age condition (README: "It opened at least
      48 hours before the run") becomes "opened at least `<n>` hours before the run's `now`". A pull request that
      fails it is skipped with `it opened less than <n> hour ago` when `<n>` is 1 and `it opened less than <n> hours
      ago` otherwise; one whose `created_at` cannot be parsed or falls after `now` is skipped with
      `its opening time is unreadable or after the run`. Any other arguments print
      `usage: pnpm merge-discover [--wait-hours <n>], with GITHUB_REPOSITORY set` on stderr, send no request, and
      exit 1, before the `GITHUB_REPOSITORY` check. Tests, with `now` injected: `--wait-hours 0` merges a pull
      request opened 1 minute before `now`; no option skips one opened 47 hours before with the 48-hour reason;
      `--wait-hours 2` skips one opened 1 hour before with the 2-hour reason and merges one opened exactly 2 hours
      before; `--wait-hours 1` gives the 1-hour reason; a `created_at` after `now` and one that is not a date get
      the unreadable reason with wait 0. With `ZPI_REQUESTS` set, `--wait-hours`, `--wait-hours -1`,
      `--wait-hours 1.5`, `--wait-hours 10000`, `--wait 0`, `--wait-hours=2`, `--wait-hours 2 --wait-hours 3`,
      `--wait-hours 2 x`, and `x` each exit 1 with the usage line and leave the log empty.
- [ ] AC2: `.github/workflows/merge-discover.yml` has a `workflow_dispatch` input `wait_hours` of type `number`
      with default 48. The input appears in an expression only on the step's env line
      `WAIT_HOURS: ${{ inputs.wait_hours }}`, with no `||` default, and the run line is
      `pnpm merge-discover ${WAIT_HOURS:+--wait-hours "$WAIT_HOURS"}`, so a scheduled run, which has no inputs,
      keeps 48 hours. No `run:` line holds `${{`. Its trigger events stay `schedule` (cron `13 5 * * *`) and
      `workflow_dispatch`; its `if:`, permissions, group, and `cache-mode` are unchanged.
- [ ] AC3: README's "Merging bot pull requests" section states the wait as 48 hours or the dispatched
      `wait_hours`, in the conditions list and the sentence on when a pull request can merge; says that only a run
      started by hand sets `wait_hours`, that scheduled runs wait 48 hours, and that a value the command refuses
      fails the run with nothing merged; and gives the backfill steps: start `Discover plugins` by hand with
      `limit` 100, after that run finishes start `Merge bot pull requests` by hand with `wait_hours` 0, and repeat
      both while a discover run reports unread repos. `CHANGELOG.md`'s Unreleased section has an entry for the
      input.
- [ ] AC4: `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check` pass.

## Coverage

- AC1 → T1
- AC2 → T2
- AC3 → T3
- AC4 → T4

## Tasks

- [ ] T1: In `src/discover/merge.ts` replace `WAIT_MS` in `recordProblem` with a `waitHours` option of
      `MergeOptions` (default 48), and give the age condition its two reasons; parse the arguments and the new
      `USAGE` in `merge-cli.ts`. Tests in `test/merge.test.ts`.
- [ ] T2: Add the `wait_hours` input, the `WAIT_HOURS` env line, and the run line to
      `.github/workflows/merge-discover.yml`. In `test/workflows.test.ts`, check the trigger events, the input,
      the env line with no `||`, the run line, and that no `run:` line holds `${{`.
- [ ] T3: README "Merging bot pull requests" and a CHANGELOG entry; append D-034 (a dispatched merge run may set a
      shorter wait, annotating D-033).
- [ ] T4: Run the verify slot.
- [ ] T5: After the merge, merge #104 to #107 by hand, each with its own approval marker (granted).
- [ ] T6: After the merge, run rounds: dispatch `Discover plugins` with `limit` 100, wait for it to finish, then
      dispatch `Merge bot pull requests` with `wait_hours` 0 and wait for it; repeat while the discover run reports
      unread repos; report the merged and held counts (granted).

## Work log

- 2026-10-29: created by /milestone-plan.
- 2026-10-29: tier check: milestone — new command option and workflow input that change when plugins land, and a rule change to D-033.
- 2026-10-29: idea vet: none found; the request names the behavior, and the scheduled job keeps D-033's 48 hours.
- 2026-10-29: lessons used: 2026-10-25 (M001), 2026-10-25 (M006, PyYAML), 2026-10-26 (M018), 2026-10-28 (M043).
- 2026-10-29: collision check: M056 (done) shipped the 48-hour job; D-033 sets the 48-hour wait and is annotated by D-034, not superseded, since scheduled runs keep it. The discover run of 2026-10-29 reported 378 unread repos.
- 2026-10-29: inbox sweep: no open issues; open bot pull requests #103 to #107 are this plan's subject (#103 held by `update-host`; #104 to #107 clean by a `holdReasons` hand check); no other disposition.
- 2026-10-29: hold audit of the 58 merged entries at the user's request: 13 would be held (update-host 8, name-match 4 in two pairs, issue-no-topic 1), reported in chat; removing any is the user's call.
- 2026-10-29: criteria audit (full, fresh Opus reader): 14 findings, all taken: the age condition named by its README words; the arguments as none or exactly the option, with five more probes; the usage text and its order before the GITHUB_REPOSITORY check; "1 hour", and an unreadable or future `created_at` given its own reason; `ZPI_REQUESTS` named; trigger events instead of an unchanged `on:` block; no `${{` in any `run:` line and no `||`; the test clause moved to T2; the README states refused values and the README wait sentence; the backfill waits for each discover run to finish (GitHub does not promise queue order), with limit 100.
- 2026-10-29: question set: backfill — allowed in full: merge #104 to #107 by hand, then rounds of discover (limit 100) and merge (wait 0) until no unread repos, and report merged and held counts. Round size — limit 100.
- 2026-10-29: plan gate chose a dispatch input over merging only the four open pull requests by hand, at the user's choice, because about 378 repos are unread; falsified by a backfill that the hand route finishes in fewer steps.
