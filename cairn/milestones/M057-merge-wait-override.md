# M057: Let a dispatched merge run set its own wait

- **Status:** review
- **Priority:** high
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — it changes when the published index gains plugins and adds a workflow input
- **Branch/PR:** m057-merge-wait-override

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

- [x] AC1: `pnpm merge-discover` takes either no arguments or exactly `--wait-hours <n>`, where `<n>` matches
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
- [x] AC2: `.github/workflows/merge-discover.yml` has a `workflow_dispatch` input `wait_hours` of type `number`
      with default 48. The input appears in an expression only on the step's env line
      `WAIT_HOURS: ${{ inputs.wait_hours }}`, with no `||` default, and the run line is
      `pnpm merge-discover ${WAIT_HOURS:+--wait-hours "$WAIT_HOURS"}`, so a scheduled run, which has no inputs,
      keeps 48 hours. No `run:` line holds `${{`. Its trigger events stay `schedule` (cron `13 5 * * *`) and
      `workflow_dispatch`; its `if:`, permissions, group, and `cache-mode` are unchanged.
- [x] AC3: README's "Merging bot pull requests" section states the wait as 48 hours or the dispatched
      `wait_hours`, in the conditions list and the sentence on when a pull request can merge; says that only a run
      started by hand sets `wait_hours`, that scheduled runs wait 48 hours, and that a value the command refuses
      fails the run with nothing merged; and gives the backfill steps: start `Discover plugins` by hand with
      `limit` 100, after that run finishes start `Merge bot pull requests` by hand with `wait_hours` 0, and repeat
      both while a discover run reports unread repos. `CHANGELOG.md`'s Unreleased section has an entry for the
      input.
- [x] AC4: `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check` pass.

## Coverage

- AC1 → T1
- AC2 → T2
- AC3 → T3
- AC4 → T4

## Tasks

- [x] T1: In `src/discover/merge.ts` replace `WAIT_MS` in `recordProblem` with a `waitHours` option of
      `MergeOptions` (default 48), and give the age condition its two reasons; parse the arguments and the new
      `USAGE` in `merge-cli.ts`. Tests in `test/merge.test.ts`.
- [x] T2: Add the `wait_hours` input, the `WAIT_HOURS` env line, and the run line to
      `.github/workflows/merge-discover.yml`. In `test/workflows.test.ts`, check the trigger events, the input,
      the env line with no `||`, the run line, and that no `run:` line holds `${{`.
- [x] T3: README "Merging bot pull requests" and a CHANGELOG entry; append D-034 (a dispatched merge run may set a
      shorter wait, annotating D-033).
- [x] T4: Run the verify slot.
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
- 2026-10-29: implement started on branch m057-merge-wait-override.
- 2026-10-29: T1 done: `DEFAULT_WAIT_HOURS` (48) and a `waitHours` option replace `WAIT_MS`; an unreadable or future `created_at` gets its own reason before the wait test; `merge-cli.ts` takes no arguments or exactly `--wait-hours <n>` and prints the new `USAGE` before the `GITHUB_REPOSITORY` check. 15 new tests in `test/merge.test.ts` (31 in the file); planted `<=`, a dropped future-time check, and a CLI that let `x` through turned 4 red.
- 2026-10-29: T2 done: `merge-discover.yml` gains the `wait_hours` number input (default 48), the `WAIT_HOURS` env line, and the `${WAIT_HOURS:+…}` run line, with a comment on scheduled runs and refused values. `test/workflows.test.ts` checks the `on:` block with the input, the step's run and env lines, that `wait_hours` appears in one expression only, and that no `run:` line holds `${{`; a planted `|| 48` turned 1 test red. Ruby's YAML parse shows the input and the step.
- 2026-10-29: T3 done: README's conditions list and merge sentence name the dispatched wait, a new paragraph covers `wait_hours`, scheduled runs, refused values, and `--wait-hours`, and numbered backfill steps wait for each discover run to finish; a CHANGELOG entry; DESIGN item 1 and the merge Architecture bullet name M057 and D-034. D-034 landed with the plan commit.
- 2026-10-29: T4 done: `pnpm test` 1287 passed, 6 skipped; `pnpm check` 58 entries, 0 problems.
- 2026-10-29: claim audit: not owed is false (user-facing, lines added); spawned below.
- 2026-10-29: claim audit: 30 claims read, 8 corrected — src/discover/merge.ts, src/discover/merge-cli.ts, .github/workflows/merge-discover.yml, README.md, CHANGELOG.md, cairn/DESIGN.md. Fixed: the NaN reason in the opening-time comment, the README wait bullet and merge sentence (a hand run uses its own wait, not either), "rounds" in the CHANGELOG, DESIGN's 0 to 9999 range and the CLI as the default's source, the CLI's exit cases, and how GitHub formats the number. The re-read found all corrected and one more stale comment (`mergeDiscover`'s throws), fixed. The previous line's wording was a slip: this line is the audit record.
- 2026-10-29: main moved to 136e4b0 (a candidate row added at the user's request); review step 1 merges it.
- 2026-10-29: review started; main merged into the branch (9213e12), origin/main an ancestor; Copilot round off.

## Decisions

## Review

- AC1: `test/merge.test.ts` (31, passed 2026-10-29 after the main merge): "a wait of 0 merges a pull request opened 1 minute before the run"; the conditions test skips #6, opened 47 hours before, with "it opened less than 48 hours ago" under no option; "a wait of 2 skips one opened 1 hour before with the 2-hour reason and merges one opened exactly 2 hours before"; "a wait of 1 names 1 hour"; a `created_at` an hour after `now` and "yesterday" each get "its opening time is unreadable or after the run" at wait 0; "passes --wait-hours to the run" prints "skipped #1: it opened less than 3 hours ago"; the nine refusals (`--wait-hours`, `-1`, `1.5`, `10000`, `--wait 0`, `--wait-hours=2`, the flag twice, `2 x`, `x`) each exit 1 with stderr exactly the new usage line, with `GITHUB_REPOSITORY` unset and `ZPI_REQUESTS` set, and an empty log. Implement planted `<=`, a dropped future-time check, and a CLI that let `x` through; each turned tests red.
- AC2: `test/workflows.test.ts` "merge-discover.yml" (4, passed 2026-10-29): the `on:` block is the `13 5 * * *` schedule and `workflow_dispatch` with input `wait_hours`, `type: number`, `default: 48`; the step reads `run: pnpm merge-discover ${WAIT_HOURS:+--wait-hours "$WAIT_HOURS"}` with env `GITHUB_TOKEN` and `WAIT_HOURS: ${{ inputs.wait_hours }}`; `wait_hours` appears in exactly one expression, that one; no `run:` line holds `${{`; `if:`, permissions, group, `cache-mode: none` checks unchanged and passing. Ruby's YAML parse gives the same input and step. A planted `|| 48` turned the env test red.
- AC3: joined README (LESSONS M018) on 2026-10-29: the conditions bullet "in a run started by hand, at least that run's `wait_hours`" (1), the merge sentence "once its `wait_hours` (48 unless changed) passes" (1), the input paragraph ("When you start the workflow by hand, its `wait_hours` input sets the wait", "Scheduled runs have no inputs, so they always wait 48 hours", "the run fails and merges nothing", 1 each), and the backfill steps "Start `Discover plugins` by hand with `limit` 100", "After that run finishes, start `Merge bot pull requests` by hand with `wait_hours` 0", "Repeat both steps while a discover run reports unread repos" (1 each). The Unreleased CHANGELOG holds the `wait_hours` entry once.
- AC4: 2026-10-29 after the main merge: `npx -y pnpm@12.15.0 test` 24 files passed, 1 skipped, 1287 tests passed, 6 skipped; `npx -y pnpm@12.15.0 check` "checked 58 entries in plugins, 0 problems".
- consistency gate: `cairn_validate.py` all checks passed; no principle changed; the `generic` profile names no toolchain checks. T5 and T6 run after the merge, by the plan.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: the nine CLI refusal cases run one code path, each spawning pnpm — reject (planned change): AC1 names each probe.
- diff-bug #2: `mergeDiscover` takes any `waitHours`, so NaN or a negative value lets every age pass — fix now: it throws before any request; 3 tests, fixed b2a563c.
- diff-bug #3: with wait 0, a runner clock behind GitHub's skips a pull request opened seconds before the run as "after the run" — reject (edge): only a pull request seconds old on a skewed runner reaches it, outside the backfill's use, where the merge starts after discovery ends; the effect is a skip that a later run undoes.
- diff-bug #4: odd renderings of a `type: number` input (1e3, 1e+21, an empty field) — reject (false): each is refused with nothing merged or falls back to 48, as the README says.
- diff-bug #5: a wait-0 run between the create request and the label request — reject (false): the create request already writes the Hold line, and the runs share the `discover` group.
- diff-bug #6: values read before an await — reject (false): the re-read uses the same `now` and `waitHours`, and age only grows.
- diff-bug #7: the "no `${{` in a `run:` line" test misses a `run: |` block — reject (false): the file has none, and AC2 binds `run:` lines.
- diff-bug #8: the workflows test pins the input's description text — reject (style).
- diff-bug #9: the two unreadable-time cases are distinct branches — reject (false): noted as fine.
- diff-bug #10: a DESIGN line of 84 characters — fix now: rewrapped, fixed b2a563c.
- diff-bug #11: the backfill relies on a discover run reporting unread repos — reject (false): the 2026-10-29 discover run log prints `"unread": 378`.
- ripple #1: `UNHELD_TEXT` in each new bot pull request body names only the 48-hour daily run — fix now: it adds "or sooner in a run that the maintainer starts by hand", fixed b2a563c.
- ripple #2: the M056 CHANGELOG entry states 48 hours as the rule — fix now: it points to the next entry, fixed b2a563c.
- ripple #3: DESIGN's merge skip list omits the wait and the unreadable-time skip — fix now, fixed b2a563c.
- ripple #4: README's "sooner" is false for `wait_hours` above 48 — fix now: "a smaller value merges it sooner", fixed b2a563c.
- ripple #5: DESIGN item 1's daily rule — reject (false): no conflict.
- prior-review #1: with wait 0 the backfill makes the unbounded merge loop the main path (M056 row item 6) — follow-up, existing row "Close gaps in bot holds and merges" (6); not load-bearing: each merge lands before the next, so a run cut at 30 minutes loses only its summary and the next round goes on.
- prior-review #2: a wait-0 merge lands before the daily start-test sees the plugin (row item 1) — reject (planned change): D-034 accepts it, and Scope Out leaves that row item.
- prior-review #3: `UNHELD_TEXT` — same as ripple #1, fixed b2a563c.
- blame-history #1: README's conditions bullet reads as either wait being enough — fix now: "It opened at least the run's wait before the run: 48 hours, or that run's `wait_hours` in a run started by hand.", fixed b2a563c.
- blame-history #2: `UNHELD_TEXT` — same as ripple #1, fixed b2a563c.
- blame-history #3: `mergeDiscover` takes any `waitHours` — same as diff-bug #2, fixed b2a563c.
- blame-history #4: D-034 accepts a merge seconds after opening — reject (planned change): the entry records it.
- blame-history #5: the new unreadable-time reason replaces the 48-hour one for NaN — reject (false): intended, and the guard is needed.
- blame-history #6: the DESIGN line width — same as diff-bug #10, fixed b2a563c.
- after the fixes (b2a563c): `pnpm test` 1290 passed, 6 skipped; `pnpm check` 0 problems. AC3 still holds: the conditions bullet now reads "48 hours, or that run's `wait_hours` in a run started by hand", and the merge sentence "A run started by hand uses its own `wait_hours` (48 unless changed) instead". No finding met the return floor.
