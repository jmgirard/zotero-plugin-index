# M046: Start one plugin in a headless Zotero

- **Status:** in-progress
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
and data directory in a temp directory. It installs the XPI and a small
reporter plugin of the index's own into that profile, then starts the
binary. The reporter plugin waits for Zotero's main window. It then
reports whether Zotero lists the plugin as active and whether the
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

- [ ] AC1: `pnpm start-test --zotero <binary> --xpi <file> --out <file>`
      writes one JSON object to `--out`. The object holds the plugin id
      and version from the XPI's `manifest.json`, the Zotero version that
      the binary reports, and a `result`. The result is `started`,
      `start-error`, `not-installed`, or `timed-out`, and the command exits
      0 for each of the four. The command exits 1, names the failure, and
      writes no `--out` file in three cases: the binary does not exist,
      the XPI is not a readable zip, or the XPI's manifest has no
      `applications.zotero.id`. A test asserts each named failure.
- [ ] AC2: With Zotero 10.0.6 for Linux under `xvfb-run`, the four
      fixture plugins get these results. The plugin whose `startup` returns
      gets `started`. The plugin whose `startup` throws gets `start-error`.
      The plugin whose `strict_max_version` is `9.*` gets `not-installed`.
      The plugin whose `startup` never returns gets `timed-out`.
      `test/start-test-zotero.test.ts` asserts the four results, and it
      passes in the `ci.yml` job `start-test` on the branch's last commit.
- [ ] AC3: After the time limit passes, or after the reporter plugin
      reports, no process of the run's process group stays alive, and the
      run's temp directory is gone. Two shim tests show both: one shim
      writes no report and never exits, under a short limit, and one shim
      writes a report and leaves a child process alive.
- [ ] AC4: The `verify` slot is clean: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1, T3
- AC2 → T2, T4, T5
- AC3 → T1, T3
- AC4 → T6

## Tasks

- [ ] T1: Write the command in `src/start-test/`. It parses the
      arguments and reads the manifest. Reuse the fflate zip read of
      `src/upstream/reader.ts` where it fits. It writes a temp profile with
      the prefs that Zotero needs to load a side-loaded plugin with no
      prompt. It spawns Zotero with `detached: true` and kills the group
      with `process.kill(-pid, "SIGKILL")`. It removes the temp directory
      in `finally`. Add the `start-test` script to `package.json`.
- [ ] T2: Write the reporter plugin under `src/start-test/reporter/`. It
      is a bootstrap plugin. It waits for the main window, reads the
      subject plugin's add-on state, and finds a bootstrap `startup` error
      for the subject's id. It writes the report to the path the command
      gives, then quits Zotero. Try each piece on the local macOS Zotero
      10.0.6 first.
- [ ] T3: Write the unit tests in `test/start-test.test.ts`. They cover
      each named failure of AC1 and the two shim cases of AC3. They also
      cover the report read for each of the four results, from a shim that
      writes a report.
- [ ] T4: Write four fixture plugins under `test/fixtures/start/`, which
      the test zips into XPIs. Write `test/start-test-zotero.test.ts`. If
      `ZOTERO_BIN` is set, it runs the fixtures against that binary.
      Otherwise it skips.
- [ ] T5: Add the `ci.yml` job `start-test`. It downloads Zotero 10.0.6
      for Linux from `download.zotero.org` and compares its SHA-256 with a
      value in the workflow. It installs the Ubuntu packages that Zotero
      needs. It runs `test/start-test-zotero.test.ts` under `xvfb-run` with
      `ZOTERO_BIN` set. Parse the workflow with Ruby's YAML before the push.
- [ ] T6: Run the `verify` slot, and fix what fails.

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

## Decisions

## Review
