<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M038: Answer issues when the recheck fails

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the person who opens an "Add a plugin" issue sees the bot's comment
- **Branch/PR:** m038-answer-recheck-failures

## Goal

When the branch-name check of `pnpm propose` cannot run, an issue run answers the issue and a discover run ends with a plain error, in place of a stack trace.

## Scope

**In:** `readHandoff` in `src/discover/handoff.ts` catches a throw from the
branch-name check (`git check-ref-format` in `entryProblem`). It returns a
new failure, `check-failed`, that is not a refusal. `src/discover/propose-cli.ts`
maps it. An issue run answers the issue with the existing "could not finish"
comment and leaves it open. A discover run prints the error and exits 1. Tests,
README.md, CHANGELOG.md, and cairn/DESIGN.md follow.

**Out:** A handoff that `readHandoff` refuses as untrusted still sends no
request in an issue run. The user kept that rule at the plan question set.
Other unanswered issue runs stay in the rows "Answer issues whose run was
canceled" and "Answer report issues left open".

## Acceptance criteria

- [x] AC1: When the branch-name check (`git check-ref-format`) inside
      `readHandoff` throws, `readHandoff` does not throw. It returns
      `{ ok: false, refusal: "check-failed" }` with a message that holds the
      thrown error's message. In-process tests show this for the three ways
      `entryProblem` throws. The first is a `check-ref-format` that sleeps
      past `refCheckMs`, where the message holds "passed its time limit". The
      second writes a fixed line to stderr and exits with status 2, where the
      message holds that line. The third is a `PATH` with no `git`, where the
      message holds `ENOENT`.
- [x] AC2: In an issue run (`ISSUE_NUMBER` set), when that check exits with
      status 2, `pnpm propose` sends one request other than GET. That request
      is a comment on the issue. Its body starts with "The bot could not
      finish, so this issue stays open for a maintainer." and holds
      `` `unexpected-error`: `` followed by a code span that holds the shim's
      stderr line. The command closes nothing, pushes no `discover/` branch,
      opens no pull request, and exits 1.
- [x] AC3: In a discover run, when that check exits with status 2,
      `pnpm propose` exits 1, sends no request other than GET, and pushes no
      `discover/` branch. Its stderr starts with "could not check the
      handoff: ", holds the shim's stderr line, and holds no line that
      matches `^\s+at `.
- [x] AC4: In an issue run, a handoff that `readHandoff` refuses gets no
      request other than GET, pushes nothing, and exits 1, and stderr starts
      with "refused the handoff: ". This holds for the existing issue-run
      refusal cases and for a new case whose repo git refuses as a branch
      name (`example/.alpha`).
- [x] AC5: The docs state the new behavior. README.md's "Proposing a plugin
      with an issue" section no longer holds the sentence "A check of the
      branch name by the command itself that passes its 30-second limit has
      the same result." It says that when that check cannot run (git cannot
      start, or exits with a status other than 1) or passes its limit, the
      bot comments the error with `unexpected-error` and leaves the issue
      open. Its sentence on the failure name in the comment covers this
      check. README.md's sentence "If that check takes longer, the command
      stops with an error before it pushes anything." also names the issue
      comment. CHANGELOG.md's Unreleased section has an entry for both runs.
      The cairn/DESIGN.md sentence "Any failure refuses the whole handoff
      before a request." is reworded: a check that cannot run is not a
      refusal, and the sentence says what each run does then.
- [x] AC6: `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check` pass.

## Coverage

- AC1 → T1
- AC2 → T2
- AC3 → T2
- AC4 → T2
- AC5 → T3
- AC6 → T4

## Tasks

- [x] T1: In `src/discover/handoff.ts`, give `readHandoff` an optional
      `refCheckMs` (default `REF_CHECK_LIMIT_MS`) that it passes to
      `entryProblem`. Catch a throw from `entryProblem` and return the new
      `HandoffRead` failure `refusal: "check-failed"`. Add in-process tests in
      `test/propose.test.ts` for the three throws: a `git` shim that runs
      `exec sleep 600` on `check-ref-format` with a short `refCheckMs`, a shim
      that prints a fixed stderr line and exits 2, and an empty `PATH`.
- [x] T2: In `src/discover/propose-cli.ts`, map `check-failed`. An issue run
      calls `issueAnswer` with a `failed` outcome
      (`failure: "unexpected-error"`). A discover run prints "could not check
      the handoff: <message>" and "sent no request and pushed nothing" and
      exits 1. Add CLI tests in `test/handoff.test.ts` with the exit-2 `git`
      shim first on `PATH` for both runs, and an issue-run refusal case for
      `example/.alpha`.
- [x] T3: Update README.md (the three sentences AC5 names), CHANGELOG.md, and
      the cairn/DESIGN.md handoff paragraph. Keep lines near 76 columns.
- [x] T4: Run the verify slot: `npx -y pnpm@12.15.0 test` and
      `npx -y pnpm@12.15.0 check`.

## Work log

- 2026-10-28: created by /milestone-plan.
- 2026-10-28: tier check: milestone — the fix needs a design decision, whether a check that cannot run answers the issue, against the README's rule that it gets no answer.
- 2026-10-28: idea vet: one concern — the row asked for both "refused the handoff" (no request, per README and DESIGN) and an issue answer; the user chose to comment and keep the issue open, with the throw as a write-step failure, not a refusal.
- 2026-10-28: question set: should refused handoffs in an issue run also get a comment — no, they stay silent; no row, since the user kept the documented rule.
- 2026-10-28: collision check: absorbs the candidate row "Answer issues when the recheck fails" (M030 review); M030 shipped the 30 s limit whose throw this handles; M011 shipped `readHandoff`; no D-entry covers handoff answers (D-005 is the artifact transport).
- 2026-10-28: inbox sweep: 0 open issues; 1 open bot pull request (#57, a plugin entry) with no overlap.
- 2026-10-28: criteria audit (full mode, fresh Opus reader): 9 findings, all taken — AC1 names three throw forms (time limit, exit other than 1, no git) and the `check-failed` result, not a test file; AC2 and AC3 match the shim's stderr line, since `code()` collapses whitespace and a non-1 exit message holds no status; AC4 binds code behavior and adds the `example/.alpha` issue-run case; AC5 says "cannot run" and rewords the DESIGN sentence and two README sentences that would go stale.
- 2026-10-28: plan gate chose a `check-failed` result from `readHandoff` over a try/catch around `readHandoff` in `propose-cli.ts`, because the time-limit throw then gets an in-process test with a short `refCheckMs`; falsified by a throw from `readHandoff` outside `entryProblem` that reaches the CLI uncaught in a real run.
- 2026-10-28: lessons used: 2026-10-25 (M001), 2026-10-27 (M030, `exec sleep 600` git shim), 2026-10-27 (M022, empty PATH), 2026-10-26 (M018), 2026-10-28 (M036), 2026-10-27 (M027).
- 2026-10-28: implement started on branch m038-answer-recheck-failures, cut from main at dee9810.
- 2026-10-28: T1 done — `readHandoff` takes `refCheckMs` and returns `check-failed` with "checking the branch name of <repo> threw: <message>"; `withShim` moved to file scope in `test/propose.test.ts`; the 3 new tests failed on main by the 3 expected throws and pass; pnpm test 880 passed, 1 skipped; pnpm check 0 problems.
- 2026-10-28: T2 done — `propose-cli.ts` gives an issue run a `failed` outcome with `unexpected-error` and prefixes a discover run's message with "could not check the handoff: "; 2 CLI tests and 1 issue-run refusal case in `test/handoff.test.ts`; without the CLI change the issue test got the "read step left no handoff" comment and the discover test lacked the prefix; pnpm test 883 passed, 1 skipped; pnpm check 0 problems.
- 2026-10-28: T3 done — README "Pull requests from the bot" and "Proposing a plugin with an issue", CHANGELOG Unreleased, and the DESIGN handoff paragraph updated (rewrapped to 80 columns); the exit-2 `readHandoff` test now uses the default limit, since under load its shim passed the 300 ms limit; full runs under a load average near 8 (another session's R tests) failed timing tests in turn (`registry-schema` cached copy, pnpm check limit), which pass alone (30 of 30 in the two files).
- 2026-10-28: T4 done — pnpm test 883 passed, 1 skipped (load average 7.6); pnpm check 0 problems; claim audit reader running.
- 2026-10-28: claim audit fixes applied (README failure-name sentence no longer covers `pnpm check`; "exits with a status other than 1" became "ends with any result other than exit status 1" in README, CHANGELOG, DESIGN; rewrapped to 80 columns); re-read by the same reader pending.
- 2026-10-28: claim audit: 38 claims read, 2 corrected — README.md, CHANGELOG.md, cairn/DESIGN.md; the same reader re-read both corrections and found them true.
- 2026-10-28: all tasks done; verify slot last green at 0dc55cc (later commits change docs only); status set to review.

## Decisions

## Review

Evidence run 2026-10-28 on e9aefc6, rerun on 2540724 after the fix-now commit.

- AC1: `vitest run --reporter=verbose test/propose.test.ts` — "readHandoff when the branch-name check throws" passes its 3 cases: time limit (300 ms, message "git check-ref-format passed its time limit of 300 ms"), exit 2 (message holds "shim: check-ref-format broke"), and no git on PATH (message holds ENOENT); each asserts `{ ok: false, refusal: "check-failed" }`. On main the same 3 tests failed by the 3 throws (T1 work log).
- AC2: `test/handoff.test.ts` "an issue run comments the error, leaves the issue open, pushes nothing, and exits 1" passes: status 1, the only non-GET request is `POST .../issues/7/comments`, its body starts with "The bot could not finish, so this issue stays open for a maintainer." and holds `` `unexpected-error`: `` then a code span holding "shim: check-ref-format broke", and no `discover/` branch on the remote. No PATCH, so nothing closed.
- AC3: `test/handoff.test.ts` "a discover run prints the error with no stack trace, sends no request, pushes nothing, and exits 1" passes: status 1, no non-GET request, no `discover/` branch, stderr starts with "could not check the handoff: ", holds the shim line and "sent no request and pushed nothing", and no line matches `^\s+at `.
- AC4: `test/handoff.test.ts` "pnpm propose refuses a handoff it cannot trust" passes its issue-run cases (`ISSUE_NUMBER` 7): a plan that names an issue number, two failure names with a backtick, a second entry directory, and the new "an issue repo whose branch git refuses" (`example/.alpha`); each asserts status 1, stderr starting "refused the handoff: ", no non-GET request, and no branch. The fix-now test "an issue run still refuses, with no request, a handoff that another check refuses" also passes with git broken.
- AC5: joined-text search (`tr '\n' ' ' | sed 's/  */ /g' | grep -o`): README holds 0 copies of "A check of the branch name by the command itself that passes its 30-second limit has the same result" and of "command stops with an error before it pushes anything"; its issue section says the second job's branch-name check stops with `unexpected-error` when git cannot start, ends with any result other than exit status 1, or passes its 30-second limit, "Then the bot comments the error and leaves the issue open", and "So does a failed branch-name check of `pnpm propose`" covers the failure name; its bot section says "In an issue run, the command first comments the error on the issue". CHANGELOG Unreleased ends with the entry for both runs. DESIGN holds 0 copies of "Any failure refuses the whole handoff before a request" and says a check that cannot run "is not a refusal" and what each run does. The README's "git ends with any result other than exit status 1" covers more than AC5's parenthetical gloss, after the claim audit found a signal kill also counts.
- AC6: on 2540724, `npx -y pnpm@12.15.0 test`: 18 files passed, 884 tests passed, 1 skipped; `npx -y pnpm@12.15.0 check`: "checked 42 entries in plugins, 0 problems". Earlier full runs at a load average of 5 to 8 (another session's R tests) failed 2 timing tests that this branch does not change; a clean main checkout failed one of them in 2 of 2 runs at the same load (follow-up row below).
- Consistency gate: `cairn_validate.py` all checks passed; no principle changed, so no `cairn_impact` run; the generic profile's consistency-gate slot names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: a branch-name check that throws returned `check-failed` before the later refusal checks, so with git broken an issue run could comment on a handoff another check refuses — fix now, fixed 2540724 (the result waits until every other check passes; new test)
- diff-bug #2: `readdir` and `lstat` of entry files in `readHandoff` are not caught, so such an error still exits with a stack trace — follow-up, row "Answer issues when a handoff read throws" (pre-existing)
- diff-bug #3: `check-failed` sits in a field named `refusal` — reject, planned change: AC1 names `{ ok: false, refusal: "check-failed" }`
- diff-bug #4: the comment message says "threw" and names the repo twice — reject, style: it matches the read step's existing "checking the entry of … threw:" comment
- diff-bug #5: `readHandoff`'s doc comment omits `refCheckMs` and `check-failed` — fix now, fixed 2540724
- diff-bug #6: no test asserts the discover run's "sent no request and pushed nothing" — fix now, fixed 2540724
- diff-bug #7: the exit-2 shim is written in two test files — reject, style
- diff-bug #8: the in-process `readHandoff` tests sit in `test/propose.test.ts` — reject, style: `withShim` lives there
- diff-bug #9: a test comment restated the shim script — fix now, fixed 2540724
- blame-history #1: same check-order defect as diff-bug #1 — fix now, fixed 2540724
- blame-history #2: narrowing M011's no-request rule had no D-entry — fix now, fixed 2540724 (D-020)
- blame-history #3: DESIGN's "Any failed check refuses" read against "is not a refusal" — fix now, fixed 2540724 ("Any check that runs and fails")
- blame-history #4: every throw from `entryProblem` becomes a comment — reject, planned change: AC1 catches the check's throws, as the read step already does (`issue.ts` answers a thrown check as `failed`)
- blame-history #5: a rerun of an issue's write job posts the "could not finish" comment again — follow-up, row "Answer issues when a handoff read throws" (pre-existing, as for earlier failure answers)
- prior-review #1: the `failed` outcome comment in `handoff.ts` omits the write step's `unexpected-error` (M028 review) — fix now, fixed 2540724; the `issue.ts` read-step comment it also named describes the read step only, so no change there
- prior-review #2: the 300 ms time-limit test could flake (M030 review) — reject, false: the shim runs `exec sleep 600`, so the limit always fires whatever the load
- ripple #1: the candidate row still describes the defect — reject, planned change: post-merge hygiene graduates the row
- ripple #2: README's refusal list does not name a check that cannot run — reject, false: the list names refusals, which still send no request
- ripple #3: DESIGN's list of issue answers that leave the issue open omits this case — fix now, fixed 2540724
- ripple #4: CHANGELOG's M011 entry "refuses a handoff that does not pass its checks, before it sends any request" — reject, false: a check that cannot run is not a failed check, and refusals still come before any request
- ripple #5: DESIGN's "a check that throws … is `unexpected-error`" — reject, false: that sentence is about `draftEntry`
- ripple #6: `readHandoff` doc comment — fix now, fixed 2540724 (same as diff-bug #5)
- ripple #7: `propose-cli.ts`'s header comment says it refuses a handoff it cannot trust — reject, false: still true, and it claims nothing about other failures
- observed in evidence runs: two timing tests this branch does not change fail under load — follow-up, row "Steady the time-limit tests under load"
