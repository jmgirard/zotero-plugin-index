# M051: Alternate the build's plugin read order by day

- **Status:** review
- **Priority:** normal
- **Depends on:** M050
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — which plugins the public data leaves unread after a cut build
- **Branch/PR:** m051-alternate-read-order

## Goal

`pnpm build` reads plugins in id order on even UTC days and in reverse id order on odd ones, so a build that its 18-minute limit cuts does not leave the same plugins unread every day.

## Scope

**In:** The order of the plugin reads in `buildData`
(`src/build/build.ts:150`). The data file, the build-level list, and the
start plan keep id order. Tests in `test/build.test.ts`. README "Building
the data", DESIGN.md, and one CHANGELOG entry.

**Out:** The report read limit and the exit after writing → M050. The
discover command's read order is not part of the source row and stays as
it is. Keeping earlier data for an unread plugin needs a cache, which
D-010 rules out for the deploy build; no work is planned for it.

## Acceptance criteria

- [x] AC1: `buildData` reads the entries in the order that `listEntries`
      returns (id order) when the whole UTC days from 1970-01-01 to `now`
      are even, and in reverse when they are odd. A test in
      `test/build.test.ts` with `now` set to 2026-10-31T23:30Z (day 20757)
      and 2026-11-01T00:30Z (day 20758) shows the repo API requests in
      reverse order on the first date and in id order on the second.
- [x] AC2: On the odd date, with four entries and a build limit that
      leaves at least two records with `upstream` and at least one entry
      `not-read`, the data file lists its records in id order, and
      `buildLevel` and the start plan list their ids in id order.
- [x] AC3: README "Building the data" states the AC1 order, and that the
      entries that get `not-read` are then the last ids on even days and
      the first ids on odd days. One CHANGELOG entry under Unreleased
      states the same.
- [x] AC4: The profile's `verify` slot is clean: `pnpm test` and
      `pnpm check` pass.

## Coverage

- AC1 → T1, T2
- AC2 → T1, T2
- AC3 → T3
- AC4 → T3

## Tasks

- [x] T1: Write the tests first in the "with time limits" block of
      `test/build.test.ts`: the request order on the two AC1 dates, and
      the output, `buildLevel`, and plan order on the odd date with a cut.
      Give every existing `buildData` test whose result depends on read
      order a fixed `now`, so `pnpm test` passes on any day. See the
      odd-date test fail on main at the request order.
- [x] T2: Order the entries by the parity of `now`'s UTC day count before
      the read loop in `src/build/build.ts`, and put the records back in id
      order before `countReports` and the output.
- [x] T3: Update README "Building the data" and the build lines of
      DESIGN.md, and add the CHANGELOG entry. They state the order rule
      only, not that a plugin is never left unread two days running, which
      no test shows. Run `pnpm test` and `pnpm check`.

## Work log

- 2026-10-29: created by /milestone-plan.
- 2026-10-29: tier check: not run — work named at the question set.
- 2026-10-29: question set: work — candidate row "Close gaps in the build time limits"; scope — all of its gaps, split where the size rules call for it.
- 2026-10-29: idea vet: no gap or flaw. A build only deploys when at most half of its records carry a build-level failure, `not-read` included, so on two days that both deploy the forward and reverse cuts leave disjoint entries unread.
- 2026-10-29: split: the third gap of the source row (M029 review, D-016); M050 holds the other two.
- 2026-10-29: depends on M050 because both change `buildData` and the same README section, not because this needs M050's behavior.
- 2026-10-29: lessons used: 2026-10-25 (M001) pnpm through npx and spawn tests through `pnpm test`; 2026-10-26 (M018) search a joined README copy; 2026-10-28 (M036) long lines after an Edit.
- 2026-10-29: plan gate chose a direction that alternates by day over a rotation or shuffle by date because two days' cuts that both let the build deploy never leave the same entry unread under alternation, while a rotation or shuffle can; falsified by two deployed builds on consecutive days whose data both mark one plugin `not-read`.
- 2026-10-29: changelog: one entry for this milestone, apart from M050's.
- 2026-10-29: criteria audit (full): 4 findings on M051, all fixed. AC1 uses two dates on each side of UTC midnight whose day counts differ in parity and whose days of the month do not (31 and 1), and names `listEntries` order; AC2 uses four entries so the plan holds two or more items and names only the odd date; T1 fixes `now` in existing order-dependent tests; AC3 says `not-read`, and T3 keeps the two-day claim out of README and CHANGELOG.
- 2026-10-29: implement started on branch m051-alternate-read-order, cut from main at 17065b3.
- 2026-10-29: T1: four tests in "with time limits": request order on ODD (2026-10-31T23:30Z) and EVEN (2026-11-01T00:30Z), and the 4-entry odd-date cut (records, `buildLevel`, plan in id order); the existing cut test gets EVEN. Both odd-date tests failed on main at the request order and the cut output. The spawned `pnpm build` tests cannot take a `now`; none of their assertions depends on read order, so the one comment that claimed an order now names both days.
- 2026-10-29: T2: `buildData` reads entry indices in id order, reversed when `floor(now / day) % 2 !== 0`, writes each record at its index, and builds `buildLevel` from the indices in id order, so `countReports`, the file, and the plan see id order. Choice: index slots over a re-sort, since ids are directory names and index order is `listEntries` order.
- 2026-10-29: verify: `pnpm test` 1070 passed, 6 skipped, on an odd day (20755); with the parity shifted for today only, every test without a fixed date also passed (the 4 fixed-date tests failed, as the shift flips them too). `pnpm check`: 56 entries, 0 problems.
- 2026-10-29: T3: README "Building the data" and the CHANGELOG entry state the rule against `generatedAt` (the same `now` that sets the order), the `not-read` ids on even and odd days, and that the file keeps id order; DESIGN.md's build bullet adds the rule and the id-order outputs. No two-day claim. Verify: `pnpm test` 1070 passed, 6 skipped; `pnpm check` 0 problems.
- 2026-10-29: claim audit: 18 claims read, 1 corrected — test/build.test.ts (the cut test's comment said b-stalled passes the build limit; it now says b-stalled's read passes it, so a-first is not read; re-read TRUE). README.md, CHANGELOG.md, src/build/build.ts: no false claim.
- 2026-10-29: implement done; status review. Verify: `pnpm test` 1070 passed, 6 skipped; `pnpm check` 56 entries, 0 problems.

## Decisions

## Review

- 2026-10-29 sync: origin/main at 17065b3, the branch's base; no merge needed. Copilot round off (no PROFILE line).
- AC1: `vitest run test/build.test.ts -t "UTC day"` on the branch: "reads the plugins in reverse id order on an odd UTC day" (now 2026-10-31T23:30Z, day 20757) and "in id order on an even UTC day" (2026-11-01T00:30Z, day 20758) pass, asserting the `api.github.com/repos/example/<name>` request URLs in c, b, a and a, b, c order. The same test file against main's `build.ts` (detached worktree): the odd-day test fails, the even-day one passes. Code: `src/build/build.ts` reverses the `listEntries` index order when `floor(now / day) % 2 !== 0`.
- AC2: "writes the records, the build-level list, and the start plan in id order on an odd UTC day that the build limit cuts" passes: 4 entries, now day 20757, readMs 1500, buildMs 1000; records a not-read, b request-failed, c and d with upstream (2 records with upstream, 1 not-read); `buildLevel` [a, b] (read order gives [b, a]); plan entries [c, d] (read order gives [d, c]). It fails on main's `build.ts`, and it fails on a planted branch variant that writes the records and `buildLevel` in read order.
- AC3: README.md lines 717–722, under "## Building the data" (line 679), state the even/odd rule against `generatedAt` (which is `now`), that `not-read` falls on the last ids on even days and the first ids on odd days, and that the file keeps id order. `git diff main...HEAD -- CHANGELOG.md` adds 1 entry (lines 378–384), under `## Unreleased`, stating the same rule and the same `not-read` ids. Neither claims a plugin is never unread two days running.
- AC4: `pnpm test` (tsc --noEmit, then Vitest) at e550e78: 22 files passed, 1 skipped; 1070 tests passed, 6 skipped. `pnpm check`: checked 56 entries in plugins, 0 problems.
- gate: `cairn_validate.py` exit 0, all checks passed (coverage complete PASS). No DESIGN.md principle changed, so `cairn_impact` skipped. The generic profile's consistency-gate slot names no toolchain checks.
