# M050: End the daily build within its time limits

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — `pnpm build` and the daily build that deploys the public data
- **Branch/PR:** m050-bound-report-read

## Goal

`pnpm build` ends within a bounded time, its read of the report issues and its exit after writing included.

## Scope

**In:** A total time limit of 3 minutes on the build's read of the
`report` label and the report issue pages in `src/build/build.ts`. A read
that the limit cuts is a failed report read under D-013, so the build
writes no file and reads no plugin. The exit of `src/build/cli.ts` once
its output is written and flushed, so a host lookup or other work that a
cut read left pending does not hold the process open. Tests in
`test/build.test.ts`. README "Building the data", the comment in
`.github/workflows/build.yml`, DESIGN.md, one CHANGELOG entry, and a
D-entry that annotates D-013 and D-016.

**Out:** The order in which the build reads plugins → M051. The whole
discover run's time and its own pending lookups → candidate row "Bound the
whole discover workflow's time". The API budget that a flood of report
issues spends → candidate row "Limit floods of report issues". No page cap
is added to the report read (see the work log).

## Acceptance criteria

- [x] AC1: When the read of the `report` label and the report issue pages
      passes its limit, `buildData` returns `ok: false` with one problem
      that starts with `cannot read the report issues: ` and contains
      `passed its time limit of <duration>`, and it requests no URL outside
      that read. Tests in `test/build.test.ts` show this, each with a short
      limit, for a stalled label read and for page 2 of the issues stalling
      before its headers and in its body. A test with the default limit
      under fake timers shows `passed its time limit of 3 minutes`.
- [x] AC2: `src/build/cli.ts` exits with the status that `main` returns
      once stdout and stderr have flushed, while a timer that the process
      did not end is still pending. Tests in `test/build.test.ts` run
      `pnpm build` with a preload that leaves a 10-minute timer pending.
      Each run exits in under 30 seconds, with the same exit status and
      stdout as a run with no such timer and the same `--out`, and a data
      file that matches apart from `generatedAt`. The runs are one that
      writes the file, one that writes no file and exits 1, and one whose
      stdout is over 64 KiB and arrives whole.
- [x] AC3: README "Building the data" lists a label and report issue read
      that passes 3 minutes among the cases that write no data file, and
      says that this read counts toward the 18 minutes from the command's
      start. One CHANGELOG entry under Unreleased names the report read
      limit and the exit once the output has flushed.
- [x] AC4: The profile's `verify` slot is clean: `pnpm test` and
      `pnpm check` pass.

## Coverage

- AC1 → T1, T2
- AC2 → T1, T3, T5
- AC3 → T4
- AC4 → T4

## Tasks

- [x] T1: Write the tests first. Add the AC1 cases to the "with time
      limits" block of `test/build.test.ts`, with the label or page 2 set
      to stall. Add the AC2 command tests and a preload that starts the
      timer; build the large-stdout tree and fixture in a temp dir. Give
      the AC2 tests a timeout that leaves room for two runs. See each fail
      on main, and check that it fails at the stalled read or the pending
      timer, not elsewhere.
- [x] T2: Add a report read limit to `TimeLimits` in
      `src/build/build.ts`, 3 minutes by default (`READ_LIMIT_MS`). Run the
      label and issue reads (`build.ts:118-128`) under `withinLimit`, with
      its signal on each request that `githubClient`
      (`src/upstream/reader.ts:334`) sends. Name the limit with `duration`.
- [x] T3: Make `src/build/cli.ts` exit once stdout and stderr have
      flushed, with the exit status that `main` returns.
- [x] T4: Update README "Building the data", the comment at
      `.github/workflows/build.yml:21`, and the build lines of DESIGN.md.
      Add the CHANGELOG entry and a D-entry that annotates D-013 and D-016.
      Run `pnpm test` and `pnpm check`.
- [x] T5: Review return 1: make the 64 KiB test compare the timer run's
      data file with the plain run's, apart from `generatedAt`.

## Work log

- 2026-10-29: created by /milestone-plan.
- 2026-10-29: tier check: not run — work named at the question set.
- 2026-10-29: question set: work — candidate row "Close gaps in the build time limits"; scope — all of its gaps, split where the size rules call for it.
- 2026-10-29: idea vet: no gap or flaw. A cut report read fails the build, as D-013 asks for any failed report read, so a flood of report issues still withholds the deploy, now after 3 minutes; the flood itself stays with candidate row "Limit floods of report issues".
- 2026-10-29: collision check: D-013, D-015, D-016, and D-017 read; M029 shipped the plugin read limits and this extends them. The source row is absorbed in full (M021 and M029 reviews). Rows "Limit floods of report issues" and "Bound the whole discover workflow's time" are distinct and named in Out.
- 2026-10-29: inbox sweep: no open issues; 2 open pull requests, both bot plugin proposals with no overlap.
- 2026-10-29: split: M050 covers the report read limit and the exit; the read order becomes M051, planned now, which depends on M050; no candidate row is left.
- 2026-10-29: lessons used: 2026-10-25 (M001) pnpm through npx and spawn tests through `pnpm test`; 2026-10-27 (M030) fake timers and the `performance.now` spy; 2026-10-28 (M038) time-limit tests under load; 2026-10-26 (M018) search a joined README copy; 2026-10-28 (M036) long lines after an Edit.
- 2026-10-29: plan gate chose a total time limit over a page cap because a cap that counts part of the list gives wrong counts (D-013) and a cap that fails the build stops deploys at a list size that reads in seconds; falsified by a run log where the report read passes 3 minutes while GitHub answers each page in under 2 seconds.
- 2026-10-29: plan gate chose an exit after flushed output over a cancelable c-ares resolver because that resolver does not read the hosts file or search domains as the getaddrinfo lookup that fetch uses does, so the host check would read different answers; falsified by a run whose stdout or stderr is cut short at the exit.
- 2026-10-29: changelog: one entry for this milestone, apart from M051's.
- 2026-10-29: plan committed while the criteria audit ran, so the tree stays clean at the stop; the audit's dispositions follow in a second plan commit.
- 2026-10-29: criteria audit (full): 6 findings on M050, all disposed. Fixed: AC2 compares runs with one `--out` and the data file apart from `generatedAt`, bounds the exit at 30 s, and adds a no-file run and a run with over 64 KiB of stdout; AC1 stalls page 2 before headers and in the body and quotes `passed its time limit of <duration>`; AC3 adds that the read counts toward the 18 minutes. Answered: AC3's no-file claim adds no CLI test hook, since the CLI's existing tested path writes no file for any `ok: false`, and the claim is narrowed to a README list entry; the D-entry, DESIGN, and `build.yml` comment stay in T4 as records.
- 2026-10-29: status in-progress; branch m050-bound-report-read cut from main at c7d844d.
- 2026-10-29: T1: on the unchanged code the 4 report-read tests timed out at the stalled request, and the 3 exit tests' timer runs hit the 40 s spawn limit (ETIMEDOUT) while the runs without the timer finished.
- 2026-10-29: T1: with `spawnSync` reading as fast as the build writes, the 64 KiB test passed with a planted exit that skips the flush, so the test now pauses stdout for 2 s over 1500 entries; with that plant it fails at the stdout comparison (output cut short), and with the flush it passes.
- 2026-10-29: T2 choices: `TimeLimits.reportsMs`, default `READ_LIMIT_MS`; one `withinLimit` around the label and issue reads, with `boundFetch` (now exported from `src/upstream/reader.ts`) under `githubClient`, so the existing failure text gains the limit reason.
- 2026-10-29: T3 choices: `cli.ts` awaits an empty write on stdout and stderr, then calls `process.exit(code)`; the old `exitCode` comment is replaced.
- 2026-10-29: T1–T3 share one commit, since the T1 tests stay red until T2 and T3. Verify clean: 1067 tests passed, 6 skipped; `pnpm check` 56 entries, 0 problems.
- 2026-10-29: T4: README adds the report read to the 18-minute paragraph and to the no-file list; `build.yml` comment names the 3-minute report limit; DESIGN's build lines name the limit and the exit; CHANGELOG entry under Unreleased; D-027 annotates D-013 and D-016. The simple-english hook flagged README lines 64, 78, 135, 536 and CHANGELOG lines 174–355, all present before this branch, left as they are. Verify clean: 1067 passed, 6 skipped; `pnpm check` 0 problems.
- 2026-10-29: claim audit: 19 claims read, 1 corrected — CHANGELOG.md ("only each page had a limit of 60 seconds" now names each request, the label read included); re-read by the same reader pending.
- 2026-10-29: claim audit re-read: the corrected sentence is true against main's `request` (60 s per request) and main's build, which bounded only the plugin reads.
- 2026-10-29: status review; all tasks checked, verify clean at 5ae561e (1067 passed, 6 skipped; `pnpm check` 0 problems); 623a9de changes CHANGELOG text only.
- 2026-10-29: review return 1: AC2 — the 64 KiB test ("writes the whole stdout of over 64 KiB before it exits") does not compare the timer run's data file with the plain run's apart from `generatedAt`; add that comparison.
- 2026-10-29: status in-progress for review return 1.
- 2026-10-29: T5 added for review return 1 (minor amendment; Coverage AC2 → T1, T3, T5).
- 2026-10-29: T5: `takeData` moves to the describe block; the 64 KiB test now reads the plain run's data file (asserting 1500 records, so the comparison is not two empty reads) and compares the timer run's file with it, `generatedAt` removed. Verify clean: 1067 passed, 6 skipped; `pnpm check` 0 problems.
- 2026-10-29: status review.
- 2026-10-29: claim audit for return 1: no second pass; cd244aa adds test code and one test comment ("The data file in `out` without its generatedAt …"), which the review lenses read in the full diff.
- 2026-10-29: review fix-now ccec64c: the report read default moves from `READ_LIMIT_MS` to its own `REPORTS_LIMIT_MS` (also 3 minutes), a change to T2's stated default; the stall tests' limit goes from 200 to 1000 ms.

## Decisions

## Review

- Pass 1, 2026-10-29, at 6de3fbe, main at c7d844d (not moved). Load average 5.05.
- AC1 evidence: `vitest run test/build.test.ts -t "report read"` (verbose): the three "stops the report read at its limit and reads no plugin when …" cases (label stalls before headers, page 2 before headers, page 2 in body; 200 ms limit) and "names the default report read limit of 3 minutes" passed; each asserts the exact problem `cannot read the report issues: request-failed: GET <url> failed[ while reading the body]: the read passed its time limit of <duration>` and that every request is the label or an issue page.
- AC2 evidence: the three "pnpm build with a timer still pending" tests passed (0.8 s, 0.6 s, 2.9 s). The 64 KiB test compares exit status and stdout but not the data file, so AC2's "a data file that matches apart from `generatedAt`" is unshown for that run: not ticked, review return 1.
- AC3 evidence: README.md:718-720 says the label and report issue read counts toward the 18 minutes; README.md:769-771 lists a read that takes more than 3 minutes in all among the cases that write no data file; CHANGELOG.md:371-377 is one Unreleased entry naming the 3-minute report read limit and the exit once the output is written.
- Pass 2, 2026-10-29, at 474f4b8 after return 1, main at c7d844d (not moved). AC2 evidence: the three "pnpm build with a timer still pending" tests passed (0.5 s, 0.5 s, 2.8 s run time). Each timer run exits in under 30 s and matches the plain run with the same `--out` in exit status, stdout, and data file apart from `generatedAt`: the file-writing run (status 0), the no-file run (status 1, no file in either, stderr also equal), and the 1500-entry run (stdout over 64 KiB read after a 2 s pause, 1500 records in the compared file).
- AC4 evidence: `pnpm test` at 6de3fbe: tsc clean, 22 files passed and 1 skipped, 1067 tests passed and 6 skipped; `pnpm check`: 56 entries, 0 problems. Re-run at cd244aa (the tree of 474f4b8 outside `cairn/`): 1067 passed, 6 skipped; `pnpm check` 0 problems.
- Consistency gate (pass 2): `cairn_validate.py` all checks passed; no principle changed, so `cairn_impact` skipped; the generic profile's consistency-gate slot names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: the bare `stream.write("", cb)` in `src/build/cli.ts:86` has no error listener, so an EPIPE from a reader that closed the pipe (`pnpm build | head`) can end the command with exit 1 and a stack trace — reject, edge: only a closed stdout pipe reaches it, outside the documented use (the daily build and a terminal), and its effect is an error.
- diff-bug #2: the 64 KiB test can fail only on macOS, since Node writes stdout pipes synchronously on Linux — reject, false: on Linux no output is left unwritten at exit, so there is no defect there to catch.
- diff-bug #3: `src/upstream/time-limit.ts:1` calls `READ_LIMIT_MS` the limit of one plugin read, but it now also bounds the report read — fix now, fixed ccec64c (the report read takes its own `REPORTS_LIMIT_MS` in `build.ts`, so the comment holds).
- diff-bug #4: CHANGELOG "Before, only each request, the label read and each page, …" reads awkwardly and its wrap is uneven — reject, style.
- diff-bug #5: the 64 KiB test copies `pnpmBuild`'s env stripping — reject, style.
- diff-bug #6: the 200 ms `reportsMs` in the stall table must also cover the label and page 1 reads, so a pause under load can cut the wrong URL — fix now, fixed ccec64c (1000 ms).
- diff-bug #7: no tests of unchanged behavior, no history comments; each table case has its own reason — noted.
- blame-history #1: `cli.ts` replaces the `exitCode` line from 717e31d and its piped-output reason — reject, planned change (T3, D-027); the flush keeps the reason and the 64 KiB test guards it.
- blame-history #2: `reportsMs` defaults to the plugin read constant, so a change to one changes the other — fix now (with diff-bug #3), fixed ccec64c.
- blame-history #3: the `build.yml` comment does not state the worst-case margin — reject, style.
- blame-history #4: `boundFetch` is now exported from the reader — reject, planned change (T2); the composition with `request()`'s timeout is correct.
- blame-history #5: the M021 and M041 read code is kept unchanged — noted.
- blame-history #6: README and CHANGELOG claims match the code — noted.
- prior-review #1: the new command tests add wall-clock bounds (`< 30` s, a 2 s pause), the load sensitivity that M029, M030, and M038 reviews raised — reject, planned change: AC2 names the 30 s bound, and the runs took 0.5–2.9 s.
- prior-review #2: `reportsMs: 200` repeats the short-limit pattern that M029 and M030 reviews fixed — fix now (with diff-bug #6), fixed ccec64c.
- prior-review #3: the diff reverses the documented `exitCode` choice — reject, planned change (as blame-history #1).
- ripple #1: candidate row "Close gaps in the build time limits" still says the report read has no total limit and a lookup can hold the process open — fix now, at post-merge hygiene, which narrows the row to the read order gap that M051 holds.
- ripple #2: candidate row "Bound the whole discover workflow's time" cites the build row for the pending-lookup gap — fix now, at post-merge hygiene, stating the discover gap in the row itself.
- ripple #3: the `time-limit.ts` comment, as diff-bug #3 — fix now, fixed ccec64c.
- Fix-now verify at ccec64c: 1067 passed, 6 skipped; `pnpm check` 56 entries, 0 problems.
- ripple #4: twelve other CLIs keep "Set exitCode rather than calling exit()" — reject, false: those commands still set `exitCode`, so the comments hold for them.
