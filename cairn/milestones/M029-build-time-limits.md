# M029: Bound the build's read time

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — it changes which records the published data carries and when the daily build deploys
- **Branch/PR:** m029-build-time-limits

## Goal

`pnpm build` stops each plugin read, and its whole read phase, at a time limit, so hung hosts cannot push the build job past 30 minutes.

## Scope

**In:** an abort signal in `readUpstream`, a 3-minute limit on each plugin read in `pnpm build`, an 18-minute limit on the build's read phase with the `not-read` failure for each entry it does not reach, the docs, and a decision entry.

**Out:** time limits in `pnpm discover`, `draftEntry`, and `pnpm propose` → M030. Reading several plugins at a time → not planned now; the work log names the evidence that would call for it. A page cap on the report issue read → candidate row "Bound the build's report issue read". Keeping a plugin's last good facts when its read fails → not planned (D-010: the build restores no cache).

## Acceptance criteria

- [x] AC1: `readUpstream` accepts an abort signal. A read can wait on a GitHub API answer, a host lookup, the XPI download, or the `update.json` download. If its signal aborts during one of these waits, the read returns `request-failed`, marked build-level. The message includes the signal's abort reason. The 60-second limits on each request and each lookup still apply. `test/upstream.test.ts` stalls the lookup, and the headers and the body of the API answer and of both downloads, until the abort.
- [x] AC2: `pnpm build` gives each plugin read a limit of 3 minutes. A read whose limit runs out during one of AC1's waits ends as AC1 states, and the abort reason names the 3-minute limit. Its record carries that failure, its id is in the build-level list, and the build goes on to the next plugin. A `test/build.test.ts` case puts one stalled plugin between two that answer. It shows that the stalled record failed and that the other two records hold facts.
- [x] AC3: `pnpm build` starts no plugin read after 18 minutes from the start of the command. Each entry that it did not read gets a record with the failure `not-read`, and its id is in the build-level list. The records read before the cut keep their facts. A `test/build.test.ts` case shows both.
- [x] AC4: README "Building the data" states the two limits and their values. It says that a read cut by the 3-minute limit fails as `request-failed`, that an entry left unread fails as `not-read`, and that both failures are build-level. It says that such a plugin shows no facts until a later build reads it. The failure `name` description in `schemas/plugins.v1.schema.json` names `not-read`. CHANGELOG's Unreleased section has an entry for the change.
- [x] AC5: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1
- AC2 → T2
- AC3 → T3
- AC4 → T4, T6
- AC5 → T5

## Tasks

- [x] T1: Add `signal` to the options of `readUpstream` (`src/upstream/reader.ts:103`). Wrap the fetch so that each request's signal is `AbortSignal.any` of the 60-second timeout and the outer signal. In `src/upstream/host-guard.ts`, let `withTimeout` also reject when the outer signal aborts. The `dns.lookup` behind it cannot be canceled, so only the wait ends. Put the abort reason in the failure message. Add the stall cases to `test/upstream.test.ts` as one table, with a fetch that rejects on its init signal and a `lookup` stub (LESSONS M004, M003).
- [x] T2: In `src/build/build.ts`, give `readRecord` (line 160) an `AbortSignal.timeout` of 3 minutes, with an abort reason that names the limit. Let `buildData` take the two limits as options, so tests can set them short. Add the stalled-plugin case to `test/build.test.ts`.
- [x] T3: In the `buildData` read loop, check the time since the command started before each read. Past 18 minutes, give each entry left a `not-read` record with a message that names the limit, and add its id to `buildLevel`. Add the cut case to `test/build.test.ts`.
- [x] T4: Update README "Building the data", the schema's failure `name` description, DESIGN.md's "Data build" line, and CHANGELOG Unreleased. Append a DECISIONS entry that records both cuts as build-level, annotating D-011. Search a joined copy of README for each phrase (LESSONS M018).
- [x] T5: Run `pnpm test` and `pnpm check` (LESSONS M001). Dispatch `build.yml` on the branch and read the build job's result and time. The deploy job fails off `main` (LESSONS M006).
- [x] T6: Review return 1: make README's "shows no facts" sentence cover a read cut by the 3-minute limit as well as an unread entry.

## Work log

- 2026-10-27: created by /milestone-plan.
- 2026-10-27: tier check: not run — work named at the question set.
- 2026-10-27: idea vet: none found. Both cuts count as build-level, so D-011's deploy rule holds unchanged. At 28 plugins the build step takes about 1 minute, so the limits act only on hung hosts.
- 2026-10-27: lessons used: 2026-10-25 (M001), 2026-10-25 (M003), 2026-10-25 (M004), 2026-10-25 (M006), 2026-10-26 (M018).
- 2026-10-27: question set: run workflows by dispatch on the milestone branch — yes. Add a new npm package — no; stop and ask if one is needed.
- 2026-10-27: inbox sweep: 0 open issues and 0 open pull requests.
- 2026-10-27: collision: candidate row "Warn when the daily build degrades" absorbed; M006 and M017 already shipped its warning and summary. D-011 and D-012 extended, not contradicted.
- 2026-10-27: split: M029 covers the reader signal and the build; the discover limits become M030 (planned now, depends on M029).
- 2026-10-27: criteria audit (full), M029 part: took the abort-reason message (AC1), header and body stalls (AC1), the cut narrowed to AC1's waits (AC2), the README line on unread plugins (AC4), and the clock at the start of the command with 18 minutes in place of 20 (AC3). The decision entry stays a task (T4), since it is a recording act. AC5 had no finding.
- 2026-10-27: plan gate chose a per-read limit plus a read-phase limit over reading several plugins at a time, because concurrency changes the GitHub API request pattern and is not needed at 28 plugins; falsified by a build step past 10 minutes with no hung host.
- 2026-10-27: plan gate chose `request-failed` for a read cut by its limit over a new failure name, because README already lists a timeout as a request with no whole response; falsified by a data user who needs to tell limit cuts from network timeouts.
- 2026-10-27: branch m029-build-time-limits cut from main at 37e40f0; status in-progress.
- 2026-10-27: T1 done. `readUpstream` wraps fetch (`AbortSignal.any`) and the lookup (a race with the signal) when given a signal; the lookup wrap sits in the reader, not in `host-guard.ts`'s `withTimeout`, so host-guard is unchanged. `fixtureFetch` gained a `stall` option. A 7-case table covers the lookup and the headers and body of the API answer, the XPI, and the update.json; with the signal ignored (planted), all 7 went red. `pnpm test` 718 passed, `pnpm check` clean.
- 2026-10-27: T2 and T3 done in one commit, since both change the `buildData` read loop. `buildData` takes a fifth argument `{ readMs, buildMs, startedAt }`; `startedAt` is a `performance.now()` time whose default 0 is the process start, so the 18 minutes count from the start of the command. `READ_LIMIT_MS` and `BUILD_LIMIT_MS` are exported constants. Two `test/build.test.ts` cases over a three-plugin tree with a stalled XPI; with no signal passed (planted) both went red, and with the read-phase check removed (planted) the not-read case went red. `pnpm test` 720 passed, `pnpm check` clean.
- 2026-10-27: T4 done. README "Building the data" gained a limits paragraph and two build-level list changes, the schema's failure `name` description names `not-read`, DESIGN's "Data build" line states the limits, CHANGELOG Unreleased gained one entry, and DECISIONS gained D-015 (annotating D-011). Each README phrase found once in a joined copy. `pnpm test` 720 passed, `pnpm check` clean.
- 2026-10-27: T5 done. Branch pushed; `build.yml` dispatched on it (run 40529804385): build job success in 89 s, "build-level failures: 0 of 28 records", 28 records with 0 failed reads; the deploy job failed as off-`main` runs do (LESSONS M006).
- 2026-10-27: claim audit: 33 claims read, 2 corrected — CHANGELOG.md (the old bound also had the lookup's 60 s limit), src/upstream/reader.ts (an abort hidden by a redirect body's cancel now fails the download as a build-level cut with the reason; `downloader` takes the signal; new test, red with the check planted out). `pnpm test` 721 passed, `pnpm check` clean.
- 2026-10-27: all tasks done; status review.
- 2026-10-27: review return 1: AC4 fails as written — README says "Such a plugin shows no facts until a later build reads it" right after the `not-read` sentence, so it covers only unread entries, not a read cut by the 3-minute limit; AC4 asks it for both.
- 2026-10-27: T6 added (minor amendment, AC4 → T4, T6) and done: README now reads "A plugin with either failure shows no facts until a later build reads it", found once in a joined copy. `pnpm test` 721 passed, `pnpm check` clean. Status review.
- 2026-10-27: review paused at the user's request with the four reviewers stopped; resumed with a fresh spawn.
- 2026-10-27: step-7 approval: m029-build-time-limits approved for merge

## Decisions

## Review

Pass 2 (after review return 1), head f69a600, main level with origin.

- AC1: `pnpm exec vitest run --reporter=verbose` shows the 7-case table in `test/upstream.test.ts` passing: the lookup, and headers and body of the API answer, the XPI, and the update.json, each returning `request-failed`, build-level, with the abort reason in the message. The redirect case passes too. The existing "no answer within 60 s" lookup test passes, so the 60 s limits still apply. T1's plant (signal ignored) turned all 7 red.
- AC2: `test/build.test.ts` "fails a read that passes its limit as request-failed and reads the next plugin" passes: a-first facts, b-stalled `request-failed`, c-third facts, `buildLevel` = [b-stalled]. A scratch run of `buildData` with default limits (timers fired at once) set a 180000 ms timer and gave "the read passed its time limit of 3 minutes" for each stalled plugin.
- AC3: `test/build.test.ts` "reads no plugin once the build limit has passed, and fails each entry left as not-read" passes: a-first facts, c-third `not-read` with no request to its repo, `buildLevel` includes c-third, output valid. The scratch run with `startedAt` 18 minutes back gave "not-read: the build reads no plugin after 18 minutes, its time limit" for both entries. `src/build/cli.ts:28` passes no `startedAt`, so the default 0 (process start for `performance.now()`) counts from the command's start.
- AC4: a joined copy of README finds once each "The command gives each plugin read 3 minutes", "the record fails with `request-failed`", "starts no plugin read after 18 minutes from its start", "gets a record that fails with `not-read`", "A plugin with either failure shows no facts until a later build reads it", and the build-level list with "a read stopped at 3 minutes included" and "a `not-read` entry". The schema's failure `name` description names not-read. CHANGELOG Unreleased holds one `not-read` entry.
- AC5: at f69a600, `pnpm test`: 17 files, 721 tests passed; `pnpm check`: 28 entries, 0 problems. Branch dispatch of `build.yml` (run 40529804385, before T6's README-only change): build job success.
- Gate: `cairn_validate.py` all checks passed (exit 0); generic profile names no toolchain checks; no DESIGN principle changed, so no `cairn_impact` run.
- spawned: diff-bug, blame-history, prior-review, ripple (a first spawn was stopped at the user's pause and reported nothing).
- diff-bug #1: the not-read test's 100 ms build limit can cut a-first on a slow runner — fix now (limits 1500/1000 ms), fixed db4cf63.
- diff-bug #2: `boundLookup` adds its listener before calling the lookup, so a lookup that throws at once leaves a listener whose later abort is unhandled — fix now (lookup started first), fixed db4cf63.
- diff-bug #3: an abandoned `dns.lookup` holds a thread and can keep the process open after the build ends — follow-up, absorbed into "Bound the build's report issue read" at hygiene.
- diff-bug #4: the redirect test aborts before the response returns, not during `cancel()` — reject, false: the test drives the added check, and with the check planted out it went red.
- diff-bug #5: README's list item "a timeout, a read stopped at 3 minutes included" reads badly — fix now ("such as a read stopped at 3 minutes"), fixed db4cf63.
- diff-bug #6: README and CHANGELOG added lines run 84 and 92 columns — fix now (rewrapped), fixed db4cf63.
- diff-bug #7: no automated test covers the "3 minutes" wording — fix now (fake-timer test with default limits; red with a 4-minute default planted), fixed db4cf63.
- diff-bug #8: the stall table's header cases share `request()`'s catch, and the body cases share `readCapped` — reject, planned change: AC1 names each stall.
- diff-bug #9: the not-read test repeats b-stalled's checks from the first test — reject, style: they are part of the record list it asserts.
- diff-bug #10: `checkOutput(...)` toEqual `[]` cannot fail after `result.ok` — fix now (removed), fixed db4cf63.
- diff-bug #11: the test comment "read in this order" restates `NAMES` — fix now (trimmed), fixed db4cf63.
- blame-history #1: the report-issue read has no total limit, so D-015's "cannot take the build job past its 30-minute limit" overclaims — fix now (D-016 narrows D-015), fixed db4cf63; the gap is absorbed into "Bound the build's report issue read" at hygiene.
- blame-history #2: entries are read in sorted order, so a cut build skips the same last plugins every day — follow-up, new row "Rotate which plugins a cut build skips" at hygiene.
- blame-history #3: a slow but live host's 3-minute cuts count as build-level and can withhold deploys — reject, planned change: D-015 names this cost.
- blame-history #4: the default `startedAt` of 0 ties the clock to process uptime — reject, planned change: AC3 counts from the command's start, and `cli.ts` is the one caller.
- blame-history #5: CPU-bound unzip runs past the limit — reject, planned change: the plan audit scoped AC2 to the waits, and the 50 MiB cap bounds it.
- blame-history #6: a lookup whose wait ended keeps running — follow-up, same row as diff-bug #3.
- prior-review #1: the README and CHANGELOG lines over the wrap width — fix now, same fix as diff-bug #6, fixed db4cf63.
- prior-review #2: the not-read test's timing margin — fix now, same fix as diff-bug #1, fixed db4cf63.
- prior-review #3: no passing control beside the stall table — reject, false: "returns the facts of a plugin that meets the bar" reads the same fixture with no stall.
- ripple #1: DESIGN's `readUpstream(repoUrl, fetch, { lookup })` omits `signal` — fix now, fixed db4cf63.
- ripple #2: ROADMAP row "Warn when the daily build degrades" still says each request stops only at 60 s — reject, planned change: hygiene graduates the row.
- ripple #3: README "The daily build" omits that the 30-minute job stop deploys nothing — fix now, fixed db4cf63.
- ripple #4: the reader's `Failure` type and README's note on it do not list `not-read` — reject, false: build-side names such as `facts-invalid` sit outside that type too.
- ripple #5: the schema's `failure` description says "Why the upstream read failed" only — fix now (adds "or why the build did not read the plugin"), fixed db4cf63.
- ripple #6: `build.yml`'s 30-minute limit has no comment tying it to the build's limits — fix now, fixed db4cf63.
- ripple #7: CHANGELOG's older build-level examples do not name the cuts — reject, false: they are examples and stay true.
- ripple #8: the plugin page prints "Not read: not-read" and "Not read: request-failed" for cut reads — follow-up, new row "Label cut reads on plugin pages" at hygiene.
- ripple #9: README says the build reads each plugin "in the same way as `pnpm add-plugin`" — reject, false: the read is the same; the limits sit around it.
- Follow-up rows land in the hygiene commit, since ROADMAP is at 59 of its under-60 lines until hygiene graduates a row and prunes a terminal one.
- Fixes verified at db4cf63: `pnpm test` 17 files, 722 passed; `pnpm check` 28 entries, 0 problems; `build.yml` parses with `timeout-minutes` 30. Snapshot files changed: none.
