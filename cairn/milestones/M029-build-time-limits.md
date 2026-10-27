# M029: Bound the build's read time

- **Status:** in-progress
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

- [ ] AC1: `readUpstream` accepts an abort signal. A read can wait on a GitHub API answer, a host lookup, the XPI download, or the `update.json` download. If its signal aborts during one of these waits, the read returns `request-failed`, marked build-level. The message includes the signal's abort reason. The 60-second limits on each request and each lookup still apply. `test/upstream.test.ts` stalls the lookup, and the headers and the body of the API answer and of both downloads, until the abort.
- [ ] AC2: `pnpm build` gives each plugin read a limit of 3 minutes. A read whose limit runs out during one of AC1's waits ends as AC1 states, and the abort reason names the 3-minute limit. Its record carries that failure, its id is in the build-level list, and the build goes on to the next plugin. A `test/build.test.ts` case puts one stalled plugin between two that answer. It shows that the stalled record failed and that the other two records hold facts.
- [ ] AC3: `pnpm build` starts no plugin read after 18 minutes from the start of the command. Each entry that it did not read gets a record with the failure `not-read`, and its id is in the build-level list. The records read before the cut keep their facts. A `test/build.test.ts` case shows both.
- [ ] AC4: README "Building the data" states the two limits and their values. It says that a read cut by the 3-minute limit fails as `request-failed`, that an entry left unread fails as `not-read`, and that both failures are build-level. It says that such a plugin shows no facts until a later build reads it. The failure `name` description in `schemas/plugins.v1.schema.json` names `not-read`. CHANGELOG's Unreleased section has an entry for the change.
- [ ] AC5: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1
- AC2 → T2
- AC3 → T3
- AC4 → T4
- AC5 → T5

## Tasks

- [x] T1: Add `signal` to the options of `readUpstream` (`src/upstream/reader.ts:103`). Wrap the fetch so that each request's signal is `AbortSignal.any` of the 60-second timeout and the outer signal. In `src/upstream/host-guard.ts`, let `withTimeout` also reject when the outer signal aborts. The `dns.lookup` behind it cannot be canceled, so only the wait ends. Put the abort reason in the failure message. Add the stall cases to `test/upstream.test.ts` as one table, with a fetch that rejects on its init signal and a `lookup` stub (LESSONS M004, M003).
- [ ] T2: In `src/build/build.ts`, give `readRecord` (line 160) an `AbortSignal.timeout` of 3 minutes, with an abort reason that names the limit. Let `buildData` take the two limits as options, so tests can set them short. Add the stalled-plugin case to `test/build.test.ts`.
- [ ] T3: In the `buildData` read loop, check the time since the command started before each read. Past 18 minutes, give each entry left a `not-read` record with a message that names the limit, and add its id to `buildLevel`. Add the cut case to `test/build.test.ts`.
- [ ] T4: Update README "Building the data", the schema's failure `name` description, DESIGN.md's "Data build" line, and CHANGELOG Unreleased. Append a DECISIONS entry that records both cuts as build-level, annotating D-011. Search a joined copy of README for each phrase (LESSONS M018).
- [ ] T5: Run `pnpm test` and `pnpm check` (LESSONS M001). Dispatch `build.yml` on the branch and read the build job's result and time. The deploy job fails off `main` (LESSONS M006).

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

## Decisions

## Review
