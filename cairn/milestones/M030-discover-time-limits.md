# M030: Bound the discover run's time

- **Status:** planned
- **Priority:** normal
- **Depends on:** M029
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — it changes which repos the discover bot reads and proposes, and its docs
- **Branch/PR:** —

## Goal

A discover run stops new repo reads at a time limit and still saves its state and handoff before the job's 30-minute limit ends it.

## Scope

**In:** an 18-minute limit on the repo reads of `pnpm discover`, M029's 3-minute limit on each read that `draftEntry` makes, a 30-second limit on the branch-name `git` check, time limits on the `git` and `pnpm check` processes of `pnpm propose`, and the docs.

**Out:** the reader signal and the build limits → M029. Rereading hosts that keep failing → candidate row "Stop rereading hosts that keep failing".

## Acceptance criteria

- [ ] AC1: `pnpm discover` starts no repo read after 18 minutes from the start of the run. It then prints its report. The report counts the repos it did not reach in `unread` and holds a warning that names the time limit. The command writes its state file and, with `--handoff`, its handoff. A `test/discover.test.ts` case shows the cut, the count, the warning, and the state that the run returns.
- [ ] AC2: In `pnpm discover`, each repo read has M029's 3-minute limit. A read whose limit runs out during one of M029 AC1's waits refuses the repo with `request-failed`, marked build-level. The repo's state record stays as it was before the run. A `test/discover.test.ts` case puts one stalled repo before one that answers. It shows that refusal, the unchanged state record, and a read of the next repo.
- [ ] AC3: The branch-name `git` check (`src/discover/handoff.ts:185`) stops after 30 seconds. In `pnpm discover`, a check past its limit refuses the repo with `unexpected-error` and records nothing. In `pnpm propose`, which runs the check again, it stops the command with an error before any push. In `pnpm propose`, each other `git` process stops after 2 minutes and the `pnpm check` process after 5 minutes. A `git` or `pnpm check` process for one entry that passes its limit gives that entry a failure. The command opens no pull request for that entry and goes on to the next one. A `git fetch` past its limit fails every entry, as a failed fetch does now. Tests show the `pnpm discover` case of the branch-name check, and the one-entry case for `git` and for `pnpm check`.
- [ ] AC4: README "Finding new plugins" states the 18-minute limit, the 3-minute read limit, and the 30-second branch-name limit. "Pull requests from the bot" states the process limits. "Proposing a plugin with an issue" points to both. CHANGELOG's Unreleased section has an entry for the change.
- [ ] AC5: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1
- AC2 → T2
- AC3 → T3
- AC4 → T4
- AC5 → T5

## Tasks

- [ ] T1: In `discover` (`src/discover/discover.ts:114`), check the time since the run started before each read. Past 18 minutes, set `unread` and add a warning that names the limit. Take the limit as an option, so a test can set it short. Use "time limit" in the text, since `--budget` already names a repo count. Add the cut case to `test/discover.test.ts`, in process, since its CLI tests spawn with a 50-second timeout.
- [ ] T2: In `draftEntry` (`src/discover/discover.ts:175`), pass `readUpstream` M029's 3-minute signal. Add the stalled-repo case to `test/discover.test.ts`, with an input state that holds a record for the stalled repo.
- [ ] T3: Give the `execFile` of the branch-name check (`src/discover/handoff.ts:185`) a 30-second `timeout`. A kill gives no exit code 1, so `entryProblem` throws and `draftEntry` refuses with `unexpected-error`. In `src/discover/propose.ts`, give the `git` helper's `execFile` (line 241) a 2-minute `timeout`. Make `pnpmCheck` (line 30) stop its child after 5 minutes and reject when it kills the child, so no branch is pushed for that entry. Take the limits as options, so tests can set them short. Test with stub commands that never exit, and restore any planted file from a copy (LESSONS M010, M022).
- [ ] T4: Update README "Finding new plugins", "Pull requests from the bot", and "Proposing a plugin with an issue", DESIGN.md's "Discovery" line, and CHANGELOG Unreleased. Search a joined copy of README for each phrase (LESSONS M018).
- [ ] T5: Run `pnpm test` and `pnpm check` (LESSONS M001, M027). The discover read job runs only on the default branch, so a dispatch on the branch checks nothing.

## Work log

- 2026-10-27: created by /milestone-plan.
- 2026-10-27: idea vet: none found. A read cut by its limit is build-level, so the M026 rule that such refusals are not recorded holds, and the next run reads the repo again.
- 2026-10-27: lessons used: 2026-10-25 (M001), 2026-10-26 (M010), 2026-10-27 (M022), 2026-10-27 (M027), 2026-10-26 (M018).
- 2026-10-27: question set: run workflows by dispatch on the milestone branch — yes. Add a new npm package — no; stop and ask if one is needed.
- 2026-10-27: collision: candidate row "Bound the time of a discover run" absorbed. Parked row "Stop rereading hosts that keep failing" stays, since a limit does not stop a daily reread.
- 2026-10-27: criteria audit (full), M030 part: took "time limit" over "time budget" (AC1), the in-process test (AC1), the unchanged state record (AC2), the scope narrowed to `pnpm discover` with a README pointer for issue runs (AC2, AC4), a rejecting `pnpmCheck` (AC3), the fetch case and the one-entry wording (AC3), fixed limit values (AC3), and the README placement (AC4). Kept the `git check-ref-format` limit and stated its `pnpm propose` outcome (exit before any push through `readHandoff`), since ROADMAP's 60-line cap leaves no room for a parked row. AC5 had no finding.

## Decisions

## Review
