# M046: Start one plugin in a headless Zotero

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** internal: a command that only its own `ci.yml` test job runs, and no published page or data file uses until M047
- **Branch/PR:** m046-start-one-plugin

## Goal

`pnpm start-test` starts one Zotero build with one plugin XPI in a new
profile and writes whether the plugin started.

## Scope

**In:** A new command `pnpm start-test --zotero <binary> --xpi <file>
--out <file>` under `src/start-test/`. The command makes a new profile
and data directory in a temp directory. It installs a small reporter
plugin of the index's own into that profile, then starts the binary. The
reporter plugin waits for Zotero's main window, then installs the XPI from
its file. It then reports whether Zotero lists the plugin as active and whether the
plugin's `startup` threw. One time limit covers the whole start. At the
limit, or after the report, the command ends every process in the run's
process group. It then removes the temp directory. The scope also
holds four fixture plugins under `test/fixtures/start/`, one for each
result. When `ZOTERO_BIN` is set, a test file runs the fixtures against
that real Zotero binary. A new `ci.yml` job downloads Zotero 10.0.6 for Linux
and runs that file under `xvfb-run`. This is the first part of the
candidate row "Test plugins load in headless Zotero".

**Out:** These go to M047: running the command over the listed plugins,
the data field, the plugin page line, and the README, CHANGELOG, and
DESIGN text. A test of a plugin on a Zotero outside its declared range is
not planned (question set, 2026-10-28). A check that a started plugin
works is not planned, because a start is the whole claim.

## Acceptance criteria

- [x] AC1: `pnpm start-test --zotero <binary> --xpi <file> --out <file>`
      writes one JSON object to `--out`. The object holds the plugin id
      and version from the XPI's `manifest.json`, the Zotero version that
      the binary reports, and a `result`. The result is `started`,
      `start-error`, `not-installed`, or `timed-out`, and the command exits
      0 for each of the four. The command exits 1, names the failure, and
      writes no `--out` file in three cases: the binary does not exist,
      the XPI is not a readable zip, or the XPI's manifest has no
      `applications.zotero.id`. A test asserts each named failure.
- [x] AC2: With Zotero 10.0.6 for Linux under `xvfb-run`, the four
      fixture plugins get these results. The plugin whose `startup` returns
      gets `started`. The plugin whose `startup` throws gets `start-error`.
      The plugin whose `strict_max_version` is `9.*` gets `not-installed`.
      The plugin whose `startup` never returns gets `timed-out`.
      `test/start-test-zotero.test.ts` asserts the four results, and it
      passes in the `ci.yml` job `start-test` on the branch's last commit.
- [x] AC3: After the time limit passes, or after the reporter plugin
      reports, no process of the run's process group stays alive, and the
      run's temp directory is gone. Two shim tests show both: one shim
      writes no report and never exits, under a short limit, and one shim
      writes a report and leaves a child process alive.
- [x] AC4: The `verify` slot is clean: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1, T3
- AC2 → T2, T4, T5
- AC3 → T1, T3
- AC4 → T6

## Tasks

- [x] T1: Write the command in `src/start-test/`. It parses the
      arguments and reads the manifest. Reuse the fflate zip read of
      `src/upstream/reader.ts` where it fits. It writes a temp profile with
      the prefs that Zotero needs to load a side-loaded plugin with no
      prompt. It spawns Zotero with `detached: true` and kills the group
      with `process.kill(-pid, "SIGKILL")`. It removes the temp directory
      in `finally`. Add the `start-test` script to `package.json`.
- [x] T2: Write the reporter plugin under `src/start-test/reporter/`. It
      is a bootstrap plugin. It waits for the main window, installs the
      subject plugin from its XPI, reads its add-on state, and finds a
      bootstrap `startup` error for the subject's id. It writes the report
      to the path the command gives, then quits Zotero. Try each piece on
      the local macOS Zotero 10.0.6 first.
- [x] T3: Write the unit tests in `test/start-test.test.ts`. They cover
      each named failure of AC1 and the two shim cases of AC3. They also
      cover the report read for each of the four results, from a shim that
      writes a report.
- [x] T4: Write four fixture plugins under `test/fixtures/start/`, which
      the test zips into XPIs. Write `test/start-test-zotero.test.ts`. If
      `ZOTERO_BIN` is set, it runs the fixtures against that binary.
      Otherwise it skips.
- [x] T5: Add the `ci.yml` job `start-test`. It downloads Zotero 10.0.6
      for Linux from `download.zotero.org` and compares its SHA-256 with a
      value in the workflow. It installs the Ubuntu packages that Zotero
      needs. It runs `test/start-test-zotero.test.ts` under `xvfb-run` with
      `ZOTERO_BIN` set. Parse the workflow with Ruby's YAML before the push.
- [x] T6: Run the `verify` slot, and fix what fails.

## Work log

- 2026-10-28: created by /milestone-plan.
- 2026-10-28: tier check: milestone, because the work adds two commands, CI jobs, and a data field, and it needs design decisions.
- 2026-10-28: idea vet: 4 concerns. A start is not "works", and the set chose a start-only claim. A start outside the declared range cannot happen for users, and the set chose inside the range only. CI would run unreviewed plugin code, and the set chose an isolated job (D-023). The tested builds were open, and the set chose a pinned list of 7.0.32, 8.0.5, 9.0.6, and 10.0.6.
- 2026-10-28: lessons used: 2026-10-27 (M030) process group kill; 2026-10-25 (M006) Ruby YAML parse; 2026-10-28 (M038) time-limit tests under load; 2026-10-25 (M001) pnpm through npx.
- 2026-10-28: feature series: M046 -> M047
- 2026-10-28: question set: may implement push the milestone branch and dispatch workflows on it? Yes (asked at the first run of this plan, same day).
- 2026-10-28: question set: may CI run listed plugins' code, download Zotero from download.zotero.org, and apt-install xvfb, libasound2t64, and libdbus-glib-1-2? Yes (D-023).
- 2026-10-28: collision check: absorbs candidate row "Test plugins load in headless Zotero" in full with M047. No D-entry rejects it. D-010 governs the new jobs. Inbox: 0 open issues, and 1 open bot PR (#57) with no overlap.
- 2026-10-28: criteria audit (reduced mode, fresh Opus reader): 2 findings, both fixed. AC2 now promises that the test file passes in CI, not what the CI log shows. AC3 now has two shim tests, one for each trigger, and Scope narrows to the process group.
- 2026-10-28: plan gate chose a reporter plugin in the test profile over driving Zotero through its remote debugging protocol, as zotero-plugin-scaffold does, because it needs no protocol client; falsified by Zotero refusing to load a side-loaded plugin from the profile with no prompt.
- 2026-10-28: implement: branch m046-start-one-plugin cut from main at 9e210b1.
- 2026-10-28: substantive amendment: Scope now says that the reporter plugin installs the XPI from its file after Zotero's main window is ready, not that the command puts the XPI in the profile. On the local macOS Zotero 10.0.6, a plugin loaded from the profile whose id sorts after the reporter's threw with no console message left by the time the reporter read the console, and a listener added at the reporter's start did not see it either. With install after start, both id orders gave start-error. The criteria are unchanged, and the deliverable the user sees is unchanged.
- 2026-10-28: T1 decision: the manifest read uses fflate's `unzipSync` with a filter for `manifest.json` of at most 1 MiB, not the reader's private zip helpers, which take a download and a release tag. The Zotero version comes from `app/application.ini` beside the binary (Linux) or `../Resources/app/application.ini` (macOS), since `zotero --version` prints the Firefox version (140.17.0esr). Two named failures beyond AC1's three: `zotero-version-unknown`, `no-manifest`, and `zotero-exited` (Zotero exits with no report). Time limit 90 s, `--limit` in seconds.
- 2026-10-28: T1–T4 done: `src/start-test/start-test.ts`, `cli.ts`, `reporter/`, four fixtures, `test/start-test.test.ts` (12 tests) and `test/start-test-zotero.test.ts`. Plants: without the group kill both AC3 tests fail on the live pid list; without the temp removal both fail on the profile's directory. Local Zotero 10.0.6 on macOS with `MOZ_HEADLESS=1`: the 4 fixtures got their 4 results.
- 2026-10-28: correction to the T1 decision line: it names three failures beyond AC1's three, not two.
- 2026-10-28: T5 done: `ci.yml` job `start-test` downloads Zotero 10.0.6 for Linux, checks SHA-256 246c2574…dd63 (read from one download on 2026-10-28), apt-installs xvfb, libasound2t64, and libdbus-glib-1-2, and runs the real-Zotero test under `xvfb-run`. Ruby YAML parse clean. CI run 40763793696 on 0878eff: `check` and `start-test` both success.
- 2026-10-28: T6 done: the first full `pnpm test` at load average 11 to 14 failed the timed-out shim test (the node shim had not written its pid file within the 2 s limit) and the registry-schema cached-copy case (lesson M038). The shim is now a `sh` script and that test's limit 5 s. Plants rerun: both AC3 tests fail without the group kill and without the temp removal. Full `pnpm test`: 971 passed, 5 skipped; `pnpm check`: 42 entries, 0 problems.
- 2026-10-28: claim audit: not owed — internal tier.
- 2026-10-28: step-7 approval: m046-start-one-plugin approved for merge

## Decisions

## Review

Evidence at 4b7aad2, 2026-10-28; `main` had not moved since the branch cut (9e210b1).

- AC1: `vitest run test/start-test.test.ts --reporter=verbose`, 12 passed: the four results, each from the CLI with exit 0 and the expected `{ id, version, zotero, result }` in `--out` (not-installed from both a missing and an inactive add-on); `zotero-missing`, `xpi-unreadable`, and `no-zotero-id` each exit 1 with the name first on stderr and no `--out` file (also `zotero-version-unknown`, `no-manifest`, `zotero-exited`).
- AC2: CI run 40764657998 on 4b7aad2 (the branch's last commit), job `start-test` success: `sha256sum --check` printed OK for Zotero 10.0.6 for Linux; under `xvfb-run`, `test/start-test-zotero.test.ts` passed 4 of 4, logging "started: started", "start-error: start-error", "not-installed: not-installed", and "timed-out: timed-out" in Zotero 10.0.6 (the last after its 60 s limit).
- AC3: same run as AC1: "writes timed-out, and leaves no process of the group and no temp directory, when no report comes" and "leaves no process of the group and no temp directory after a report" passed. Plants on the implement branch (work log, T1–T4 and T6 lines): without the group kill both fail on the live pid list; without the temp removal both fail on the profile's directory.
- AC4: `npx -y pnpm@12.15.0 test` at 4b7aad2: tsc clean, 971 passed, 5 skipped (the real-Zotero file, with no ZOTERO_BIN, among them); `pnpm check`: "checked 42 entries in plugins, 0 problems". CI job `check` on 4b7aad2: success.

Consistency gate: `cairn_validate.py` all checks passed; the `generic` profile names no toolchain checks; no principle changed, so no `cairn_impact` run.

spawned: diff-bug, blame-history, prior-review, ripple

- diff-bug #1: `ci.yml` job `start-test` sets `cache: pnpm`, against D-023's "no cache" — reject (false): D-023 binds the start-test job that M047 adds to `build.yml`, where listed plugins' code runs; this `ci.yml` job runs only the repo's own fixtures, as the `check` job beside it with the same cache does.
- diff-bug #2: the `ci.yml` job inherits `contents: read` and checkout keeps the token in `.git/config` — reject (false) for this job, as for #1; follow-up: M047's work log now asks for `persist-credentials: false` on its `build.yml` start-test job.
- diff-bug #3: the temp directory is removed while killed processes may still be writing, so `rm` can throw ENOTEMPTY and the CLI exits with a stack trace — fix now, fixed cc8518a.
- diff-bug #4: a binary that relaunches itself and exits ends the run as `zotero-exited` — reject (edge): no relaunch seen on Zotero 10.0.6 for macOS or Linux CI; the effect is a named error.
- diff-bug #5: any spawn error, such as EACCES, is reported as `zotero-missing` — fix now, fixed cc8518a: new failure `zotero-not-runnable`.
- diff-bug #6: a reporter that throws or never loads gives `timed-out` with exit 0, which M047 would publish as the plugin's result — fix now, fixed cc8518a: the reporter marks its start and writes its own error; the command fails `reporter-not-started` or `reporter-failed`.
- diff-bug #7: an async `startup` that rejects may get `started`, and one that never resolves gets `started` after the 3 s wait — reject (false) for a rejection within the wait: on Zotero 10.0.6, a new fixture whose async startup rejects gets start-error from Zotero's bootstrap message alone (a rule matching errors from the plugin's XPI file was tried and removed, since the result did not change without it); follow-up: M047's work log asks that the page text name the 3 s wait.
- diff-bug #8: a plugin that quits or crashes Zotero gets `zotero-exited`, not one of the four results — reject (edge): a startup that quits Zotero is outside common use; the effect is a named error.
- diff-bug #9: a `--limit` at or over 2147484 s overflows the timer and times out at once — fix now, fixed cc8518a: `--limit` takes 1 to 3600.
- diff-bug #10: the manifest read trusts the declared size and inflates the whole entry — fix now, fixed cc8518a (with prior-review #1).
- diff-bug #11: a manifest with no `version` gives `version: ""` — fix now, fixed cc8518a: new failure `no-version`.
- diff-bug #12: `finish` names `timer` and `poll` before their declarations — fix now, fixed cc8518a: declared first.
- diff-bug #13: the reporter and fixtures are JavaScript where DESIGN says TypeScript — reject (planned change): Zotero loads only a JavaScript `bootstrap.js`.
- diff-bug (c): two `not-installed` rows run one branch, several error branches are not fired, and the real-Zotero test logs with `console.log` — fix now, fixed cc8518a for the first two (one row dropped; tests added for a missing XPI, an XPI over the cap, two manifest.json entries, manifest not JSON, no version, a binary that cannot run, the reporter failures, and the CLI's usage refusals); reject (planned change) the `console.log`, which writes AC2's evidence in the CI log.
- blame-history #1: same as diff-bug #1 — reject (false), as there.
- blame-history #2: same as diff-bug #2 — reject (false), with the same follow-up.
- blame-history #3: `xpinstall.signatures.required: false` turns off signature checks with no D-entry — reject (false): Zotero plugins are not signed, so a profile that checks signatures installs none; a code comment now says so.
- prior-review #1: the manifest read reintroduces the unbounded inflate that M012 removed from the reader — fix now, fixed cc8518a: the reader's guarded read is exported as `xpiManifestBytes` and used here.
- prior-review #2: two manifest.json entries keep the last, against M005's refusal — fix now, fixed cc8518a, by the same change.
- prior-review #3: no entry-count bound and no 50 MiB cap — fix now, fixed cc8518a, by the same change and a size check before the read.
- prior-review #4: the timed-out shim test still races the shim's start under load — reject (false): the `sh` shim with a 5 s limit passed at load average 10, which lesson M038's exception for a shim that never ends allows.
- prior-review #5: the real-Zotero test's 60 s limit inside a 90 s timeout — reject (false): the margin is by design, and CI passed on 4b7aad2.
- prior-review #6: same as diff-bug #3 — fix now, fixed cc8518a, as there.
- ripple #1: DESIGN.md says `ci.yml` runs `pnpm test` and `pnpm check` only — follow-up: M047's work log names it, with DESIGN text planned there (Scope Out).
- ripple #2: `vitest.config.ts` lists the tests that start pnpm processes without the new files — reject (false): neither file starts pnpm.
- ripple #3: README "Running the tests" does not say the real-Zotero test needs `ZOTERO_BIN` — reject (planned change): README text is M047's (Scope Out); follow-up in M047's work log.
- ripple #4: README has no section for `pnpm start-test` — reject (planned change), as #3, same follow-up.
- ripple #5: DESIGN's Function Families has no start-test entry, and the reporter is JavaScript — reject (planned change) for DESIGN text, M047's; follow-up in M047's work log.
- ripple #6: CHANGELOG has no entry — reject (planned change): the series' one entry is M047's (Scope Out).
- ripple #7: the candidate row says the CI job installs listed plugins — reject (false): the row states the series' target, and M047 graduates it.

Re-verification after the fixes, at cc8518a, 2026-10-28: AC1 `test/start-test.test.ts` 22 passed (each failure name, and the four `xpi-unreadable`/`no-manifest` causes by message); AC3 plants rerun: without the group kill both AC3 tests fail on the live pid list, without the temp removal both fail on the profile's directory; real Zotero 10.0.6 on macOS: 5 fixtures passed, `start-error-async` included; AC4 full `pnpm test` 981 passed, 6 skipped, `pnpm check` 42 entries, 0 problems.
AC2 re-verification: CI run 40766600665 on eb493dc (the branch's last code-bearing commit): `check` and `start-test` success; Zotero 10.0.6 hash OK; started, start-error, start-error-async (start-error), not-installed, and timed-out each got its result.
Snapshot files: none changed. Open PRs by the operator: 0, under the feature cap of 1.
