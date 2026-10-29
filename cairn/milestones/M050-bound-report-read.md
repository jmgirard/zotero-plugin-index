# M050: End the daily build within its time limits

- **Status:** in-progress
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
- [ ] AC2: `src/build/cli.ts` exits with the status that `main` returns
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
- AC2 → T1, T3
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

## Decisions

## Review

- Pass 1, 2026-10-29, at 6de3fbe, main at c7d844d (not moved). Load average 5.05.
- AC1 evidence: `vitest run test/build.test.ts -t "report read"` (verbose): the three "stops the report read at its limit and reads no plugin when …" cases (label stalls before headers, page 2 before headers, page 2 in body; 200 ms limit) and "names the default report read limit of 3 minutes" passed; each asserts the exact problem `cannot read the report issues: request-failed: GET <url> failed[ while reading the body]: the read passed its time limit of <duration>` and that every request is the label or an issue page.
- AC2 evidence: the three "pnpm build with a timer still pending" tests passed (0.8 s, 0.6 s, 2.9 s). The 64 KiB test compares exit status and stdout but not the data file, so AC2's "a data file that matches apart from `generatedAt`" is unshown for that run: not ticked, review return 1.
- AC3 evidence: README.md:718-720 says the label and report issue read counts toward the 18 minutes; README.md:769-771 lists a read that takes more than 3 minutes in all among the cases that write no data file; CHANGELOG.md:371-377 is one Unreleased entry naming the 3-minute report read limit and the exit once the output is written.
- AC4 evidence: `pnpm test` at 6de3fbe: tsc clean, 22 files passed and 1 skipped, 1067 tests passed and 6 skipped; `pnpm check`: 56 entries, 0 problems.
