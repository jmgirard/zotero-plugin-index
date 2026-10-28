<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M038: Answer issues when the recheck fails

- **Status:** in-progress
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

- [ ] AC1: When the branch-name check (`git check-ref-format`) inside
      `readHandoff` throws, `readHandoff` does not throw. It returns
      `{ ok: false, refusal: "check-failed" }` with a message that holds the
      thrown error's message. In-process tests show this for the three ways
      `entryProblem` throws. The first is a `check-ref-format` that sleeps
      past `refCheckMs`, where the message holds "passed its time limit". The
      second writes a fixed line to stderr and exits with status 2, where the
      message holds that line. The third is a `PATH` with no `git`, where the
      message holds `ENOENT`.
- [ ] AC2: In an issue run (`ISSUE_NUMBER` set), when that check exits with
      status 2, `pnpm propose` sends one request other than GET. That request
      is a comment on the issue. Its body starts with "The bot could not
      finish, so this issue stays open for a maintainer." and holds
      `` `unexpected-error`: `` followed by a code span that holds the shim's
      stderr line. The command closes nothing, pushes no `discover/` branch,
      opens no pull request, and exits 1.
- [ ] AC3: In a discover run, when that check exits with status 2,
      `pnpm propose` exits 1, sends no request other than GET, and pushes no
      `discover/` branch. Its stderr starts with "could not check the
      handoff: ", holds the shim's stderr line, and holds no line that
      matches `^\s+at `.
- [ ] AC4: In an issue run, a handoff that `readHandoff` refuses gets no
      request other than GET, pushes nothing, and exits 1, and stderr starts
      with "refused the handoff: ". This holds for the existing issue-run
      refusal cases and for a new case whose repo git refuses as a branch
      name (`example/.alpha`).
- [ ] AC5: The docs state the new behavior. README.md's "Proposing a plugin
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
- [ ] AC6: `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check` pass.

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
- [ ] T4: Run the verify slot: `npx -y pnpm@12.15.0 test` and
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

## Decisions

## Review
