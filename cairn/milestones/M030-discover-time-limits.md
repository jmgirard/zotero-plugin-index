# M030: Bound the discover run's time

- **Status:** review
- **Priority:** normal
- **Depends on:** M029
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — it changes which repos the discover bot reads and proposes, and its docs
- **Branch/PR:** m030-discover-time-limits

## Goal

A discover run stops new repo reads at a time limit and still saves its state and handoff before the job's 30-minute limit ends it.

## Scope

**In:** an 18-minute limit on the repo reads of `pnpm discover`, M029's 3-minute limit on each read that `draftEntry` makes, a 30-second limit on the branch-name `git` check, time limits on the `git` and `pnpm check` processes of `pnpm propose`, and the docs.

**Out:** the reader signal and the build limits → M029. Rereading hosts that keep failing → candidate row "Stop rereading hosts that keep failing".

## Acceptance criteria

- [x] AC1: `pnpm discover` starts no repo read after 18 minutes from the start of the run. It then prints its report. The report counts the repos it did not reach in `unread` and holds a warning that names the time limit. The command writes its state file and, with `--handoff`, its handoff. A `test/discover.test.ts` case shows the cut, the count, the warning, and the state that the run returns.
- [x] AC2: In `pnpm discover`, each repo read has M029's 3-minute limit. A read whose limit runs out during one of M029 AC1's waits refuses the repo with `request-failed`, marked build-level. The repo's state record stays as it was before the run. A `test/discover.test.ts` case puts one stalled repo before one that answers. It shows that refusal, the unchanged state record, and a read of the next repo.
- [x] AC3: The branch-name `git` check (`src/discover/handoff.ts:185`) stops after 30 seconds. In `pnpm discover`, a check past its limit refuses the repo with `unexpected-error` and records nothing. In `pnpm propose`, which runs the check again, it stops the command with an error before any push. In `pnpm propose`, each other `git` process stops after 2 minutes and the `pnpm check` process after 5 minutes. A `git` or `pnpm check` process for one entry that passes its limit gives that entry a failure. The command opens no pull request for that entry and goes on to the next one. A `git fetch` past its limit fails every entry, as a failed fetch does now. Tests show the `pnpm discover` case of the branch-name check, and the one-entry case for `git` and for `pnpm check`.
- [x] AC4: README "Finding new plugins" states the 18-minute limit, the 3-minute read limit, and the 30-second branch-name limit. "Pull requests from the bot" states the process limits. "Proposing a plugin with an issue" points to both. CHANGELOG's Unreleased section has an entry for the change.
- [x] AC5: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1
- AC2 → T2
- AC3 → T3
- AC4 → T4
- AC5 → T5

## Tasks

- [x] T1: In `discover` (`src/discover/discover.ts:114`), check the time since the run started before each read. Past 18 minutes, set `unread` and add a warning that names the limit. Take the limit as an option, so a test can set it short. Use "time limit" in the text, since `--budget` already names a repo count. Add the cut case to `test/discover.test.ts`, in process, since its CLI tests spawn with a 50-second timeout.
- [x] T2: In `draftEntry` (`src/discover/discover.ts:175`), pass `readUpstream` M029's 3-minute signal. Add the stalled-repo case to `test/discover.test.ts`, with an input state that holds a record for the stalled repo.
- [x] T3: Give the `execFile` of the branch-name check (`src/discover/handoff.ts:185`) a 30-second `timeout`. A kill gives no exit code 1, so `entryProblem` throws and `draftEntry` refuses with `unexpected-error`. In `src/discover/propose.ts`, give the `git` helper's `execFile` (line 241) a 2-minute `timeout`. Make `pnpmCheck` (line 30) stop its child after 5 minutes and reject when it kills the child, so no branch is pushed for that entry. Take the limits as options, so tests can set them short. Test with stub commands that never exit, and restore any planted file from a copy (LESSONS M010, M022).
- [x] T4: Update README "Finding new plugins", "Pull requests from the bot", and "Proposing a plugin with an issue", DESIGN.md's "Discovery" line, and CHANGELOG Unreleased. Search a joined copy of README for each phrase (LESSONS M018).
- [x] T5: Run `pnpm test` and `pnpm check` (LESSONS M001, M027). The discover read job runs only on the default branch, so a dispatch on the branch checks nothing.

## Work log

- 2026-10-27: created by /milestone-plan.
- 2026-10-27: idea vet: none found. A read cut by its limit is build-level, so the M026 rule that such refusals are not recorded holds, and the next run reads the repo again.
- 2026-10-27: lessons used: 2026-10-25 (M001), 2026-10-26 (M010), 2026-10-27 (M022), 2026-10-27 (M027), 2026-10-26 (M018).
- 2026-10-27: question set: run workflows by dispatch on the milestone branch — yes. Add a new npm package — no; stop and ask if one is needed.
- 2026-10-27: collision: candidate row "Bound the time of a discover run" absorbed. Parked row "Stop rereading hosts that keep failing" stays, since a limit does not stop a daily reread.
- 2026-10-27: criteria audit (full), M030 part: took "time limit" over "time budget" (AC1), the in-process test (AC1), the unchanged state record (AC2), the scope narrowed to `pnpm discover` with a README pointer for issue runs (AC2, AC4), a rejecting `pnpmCheck` (AC3), the fetch case and the one-entry wording (AC3), fixed limit values (AC3), and the README placement (AC4). Kept the `git check-ref-format` limit and stated its `pnpm propose` outcome (exit before any push through `readHandoff`), since ROADMAP's 60-line cap leaves no room for a parked row. AC5 had no finding.
- 2026-10-27: started; branch `m030-discover-time-limits` cut from main at b5614f6.
- 2026-10-27: T1+T2 in one commit, since both change the same read loop. API: `discover` takes `readMs`, `runMs`, and `startedAt` (performance.now() time, default 0 as in `buildData`); `draftEntry` takes `readMs`; `RUN_LIMIT_MS` (18 min) is new in `discover.ts`, and `READ_LIMIT_MS` and `duration` come from `src/build/build.ts` (`duration` now exported). The time check sits beside the budget check, so `unread` counts every candidate left, as the budget cut does.
- 2026-10-27: T1+T2 tests: 4 cases in `test/discover.test.ts` "the time limits" (per-read cut with kept record, build-level mark through `draftEntry`, run cut with unread and warning, both defaults under fake timers). Planted no signal and no run check on a copy: each plant failed its cases; restored. `pnpm test` 726 passed, `pnpm check` 0 problems.
- 2026-10-27: T3 API: `REF_CHECK_LIMIT_MS` (30 s) in `handoff.ts`, passed as `refCheckMs` through `discover`, `draftEntry`, and `plannedProblem`; `GIT_LIMIT_MS` (2 min) as `gitMs` on `propose` and `proposeHandoff`; `pnpmCheck(dir, ms = CHECK_LIMIT_MS)` (5 min). A killed `git` throws "git <cmd> passed its time limit of …". `pnpmCheck` starts pnpm in its own process group, kills the group with SIGKILL at the limit, and rejects at once, since a plain kill left pnpm's child holding the output pipe.
- 2026-10-27: T3 tests: branch-name case in `test/discover.test.ts` (git shim, 300 ms), and "the write step's process time limits" in `test/propose.test.ts` (git shim on `hash-object` of one entry, 2000 ms; pnpm shim whose child sleeps, 1000 ms). Plants on copies: no git timeout, no ref-check timeout, and a plain `child.kill()` each failed their case; restored. `pnpm test` 729 passed, `pnpm check` 0 problems.
- 2026-10-27: T4: README "Finding new plugins" (new paragraph: 3-minute read, 30-second branch check, 18-minute cut, `unread`, warning), "Pull requests from the bot" (2- and 5-minute limits, fetch case, propose's own branch check), "Proposing a plugin with an issue" (examples and pointers to both sections); DESIGN.md Discovery line; CHANGELOG Unreleased entry. Each README phrase found in a joined copy. Ran `pnpm propose` on a handoff with a hanging `check-ref-format` shim: exit 1 after 30.3 s from `readHandoff`, before any request. Added a test pinning the 30 s, 2 min, and 5 min defaults. The simple-english hook still flags README lines 94 and 413 and CHANGELOG line 170, all older text outside this change. `pnpm test` 730 passed, `pnpm check` 0 problems.
- 2026-10-27: T5: `pnpm test` 730 passed and `pnpm check` 0 problems at d056f34. Claim audit reader (Opus, fresh context) started; result pending.
- 2026-10-27: claim audit: 54 claims read, 4 corrected — CHANGELOG.md, README.md, src/discover/propose.ts. Fixed: the CHANGELOG's "fails only that entry" (a fetch fails every entry), README's and `GIT_LIMIT_MS`'s "each git process" (the branch-name recheck has its own 30 s limit), and README's issue-run text (a recheck past 30 s in `pnpm propose` exits before `issueAnswer`, so the bot posts no comment). The reader reread all four as true. `pnpm test` 730 passed, `pnpm check` 0 problems.
- 2026-10-27: open concern for review: in an issue run, a branch-name recheck in `pnpm propose` that throws (time limit, or a git that cannot start, which predates this branch) leaves the issue with no comment; README now states this. Catching the throw in `propose-cli.ts` is a possible follow-up.
- 2026-10-27: all tasks done; status review.

## Decisions

## Review

- 2026-10-27 route: no PR for the branch, main at b5614f6 equals the merge base, Copilot round off → fresh review.
- AC1 evidence: `test/discover.test.ts` "starts no read once the run limit has passed, counts the rest as unread, and warns" passed (reads t3 and t2 only, `unread` 1, warning "reads no repo after 1000 ms, its time limit", returned state equal to the input); "names the default limits …" passed (18 minutes). `src/discover/cli.ts` read: on `result.ok` it writes the plan with `--handoff` (`writePlan`), prints the report, then writes the state (tmp + rename); the cut returns `ok`.
- AC2 evidence: "refuses a read that passes its limit as request-failed, keeps its record, and reads the next repo" passed (t2's XPI stalls at headers; t3 written, t2 `request-failed` "passed its time limit of 200 ms", t1 written; returned state holds t2's input record unchanged); "marks a read that passes its limit as build-level" passed (`draftEntry` gives `recorded: false, buildLevel: true`); the default test names "time limit of 3 minutes".
- AC3 evidence: "refuses, without recording, a repo whose branch-name check passes its limit" passed (`unexpected-error`, "git check-ref-format passed its time limit of 300 ms", state `{}`, outDir empty); "fails one entry whose git process passes its limit …" passed (alpha fails "git hash-object passed its time limit of 2000 ms", beta proposed, 1 POST, only `discover/example/beta` on the remote); "fails one entry whose pnpm check passes its limit …" passed (same shape, 1000 ms); "default to the 30 seconds, 2 minutes, and 5 minutes …" passed. `node src/discover/propose-cli.ts` on a one-entry handoff with a hanging `check-ref-format` shim exited 1 with "git check-ref-format passed its time limit of 30000 ms" from `readHandoff`, which runs before any request or push. Fetch case by code read: the `git` helper carries `timeout: gitMs` and the fetch block's catch fails every entry (`propose.ts`), as the existing "names every entry as failed when the default branch cannot be fetched" test shows for a failed fetch.
- AC4 evidence: section-scoped grep of README: "Finding new plugins" holds the 3-minute read, the 30-second branch check, and the 18-minute cut; "Pull requests from the bot" holds the 2- and 5-minute limits; "Proposing a plugin with an issue" holds "a read stopped at 3 minutes", "branch-name check stopped at 30 seconds", and "\"Finding new plugins\" gives both time limits". Joined-copy grep found each phrase once. CHANGELOG line 210 entry "`pnpm discover` stops each repository read …" sits in the first `##` section, Unreleased.
- AC5 evidence: `npx -y pnpm@12.15.0 test`: tsc clean, 17 files, 730 tests passed; `npx -y pnpm@12.15.0 check`: 28 entries, 0 problems (2026-10-27, branch head plus a README rewrap).
- consistency gate: `cairn_validate.py` exit 0, all checks passed; no DESIGN principle changed, so no `cairn_impact` run; the generic profile's consistency-gate slot names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: the run-limit test passes only if the search, the t3 read, and its git spawn finish within 1000 ms of real time — fix now: `performance.now()` is mocked and moves past the limit when t2's stalled XPI is requested; a clock 1 ms short fails the case, fixed 3bb57b0
- diff-bug #2: no total limit on `pnpm propose` (per-process limits can pass the 30- and 15-minute write jobs) or on the search and bot pull request reads before the loop; README implied the job stays inside 30 minutes — fix now for the README sentence (now names the first job, and says `pnpm propose` has no whole-run limit), fixed 3bb57b0; follow-up for the limit: new row "Bound the whole discover workflow's time"
- diff-bug #3: execFile's timeout sends SIGTERM only, so a git that ignores SIGTERM is never stopped — reject (edge): git exits on SIGTERM and cleans up its lock files, which SIGKILL would leave; the effect is a slow run
- diff-bug #4: `killed` is also set when output passes `maxBuffer`, which would be named a time limit — reject (edge): `check-ref-format` and the propose git commands print far under 1 MiB; the effect is a wrong error message
- diff-bug #5: the detached `pnpm check` is not stopped by a Ctrl-C or SIGTERM sent to `pnpm propose` alone — reject (edge): only a hand stop mid-check reaches it, and the check then runs to its own end
- diff-bug #6: `pnpmCheck` races (timer at exit, failed spawn) — reject (false): reviewer found no defect
- diff-bug #7: `draftEntry` timer after settle — reject (false): reviewer found no defect
- diff-bug #8: the cut check sits before the in-index and skip checks, so `unread` counts repos that would be skipped, and the warning says "1 repos" — reject (planned change, style): the plan put the check beside the budget check, whose `unread` counts the same way; the plural is style
- diff-bug #9: `duration` prints the 30-second limit as "30000 ms" — reject (style)
- diff-bug #10: discover, handoff, and propose import from `src/build/build.ts`, which loads the build's two Ajv schemas — fix now: `READ_LIMIT_MS` and `duration` moved to `src/upstream/time-limit.ts`, fixed 3bb57b0
- diff-bug #11: `draftEntry` copies `readRecord`'s AbortController and timer — fix now: both use `withinLimit` in `src/upstream/time-limit.ts`, fixed 3bb57b0
- diff-bug #12: the defaults test only compares constants — fix now: the 5-minute `pnpm check` default is now a fake-timer test (not settled at 5 min − 1 ms, rejected at 5 min); the two git limits stay checked by value, since execFile's timer is not faked, fixed 3bb57b0
- diff-bug #13: the build-level test overlaps the default test — reject (false): only `draftEntry`'s result carries `buildLevel` and `recorded`, which no other case asserts
- diff-bug #14: `readMs: 200` also bounds the t3 and t1 reads — fix now: 1000 ms in the read case and the run-limit case, fixed 3bb57b0
- diff-bug #15: no test for the propose recheck timeout, which leaves an issue run with no comment — follow-up: new row "Answer issues when the recheck fails"
- blame-history #1: `pnpm propose` has no run-level budget — follow-up: same as diff-bug #2
- blame-history #2: a timed-out `check-ref-format` is `unexpected-error`, not build-level, against D-015 — reject (planned change): AC3 names `unexpected-error`; it is not recorded, and issue runs treat it as failed
- blame-history #3: the recheck throw crashes `pnpm propose` instead of printing "refused the handoff" (M011 contract) — follow-up: row "Answer issues when the recheck fails"
- blame-history #4: detached `pnpm check` misses SIGINT — reject (edge): as diff-bug #5
- blame-history #5: execFile may leave git grandchildren holding the pipe — reject (false): the diff-bug reviewer measured a callback at 310 ms with a background grandchild
- blame-history #6: the run cut counts `unread` with no `not-read` failure, unlike D-015's build rule — reject (planned change): AC1 names `unread`; discover has no deploy rule
- blame-history #7: D-016's lookup gap also applies to discover — follow-up: row "Bound the whole discover workflow's time"
- prior-review #1: the propose recheck timeout leaves an issue with no comment (M019, M028 rules) — follow-up: row "Answer issues when the recheck fails"
- prior-review #2: the run-limit test is timing-dependent, as M029's CI failure was — fix now: as diff-bug #1, fixed 3bb57b0
- ripple #1: ROADMAP row "Bound the time of a discover run" describes resolved work — reject (planned change): post-merge hygiene graduates it
- ripple #2: README says discover reads "in the same way as `pnpm add-plugin`", which has no time limit — reject (false): the sentence names the reader and the bar, and the time-limit paragraph follows in the same section
- ripple #3: README's state-file paragraph says it records each refused repo — reject (false): that paragraph lists exceptions, and the next paragraph names the two new ones
- ripple #4: DESIGN.md says any failure refuses the whole handoff, but the recheck now throws — follow-up: row "Answer issues when the recheck fails"
- ripple #5: README's 30-minute sentence holds only for the read job — fix now: as diff-bug #2, fixed 3bb57b0
- ripple #6: `discover.yml` comment "the state records repos that were refused" — reject (false): it holds for the refusals the state records
- verify after fixes: `pnpm test` 731 passed, `pnpm check` 0 problems.
