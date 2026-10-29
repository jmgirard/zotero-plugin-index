# M051: Alternate the build's plugin read order by day

- **Status:** planned
- **Priority:** normal
- **Depends on:** M050
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — which plugins the public data leaves unread after a cut build
- **Branch/PR:** —

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

- [ ] AC1: `buildData` reads the entries in id order when the whole UTC
      days from 1970-01-01 to `now` are even, and in reverse id order when
      they are odd. A test in `test/build.test.ts` with three entries and
      one date of each kind shows the repo API requests in that order.
- [ ] AC2: On a date of each kind, the data file lists its records in id
      order, and `buildLevel` and the start plan list their ids in id
      order. The AC1 test shows this for the odd date, with a build limit
      that leaves at least one entry `not-read`.
- [ ] AC3: README "Building the data" states the AC1 order, and that the
      entries a cut build leaves unread are then the last ids on even days
      and the first ids on odd days. One CHANGELOG entry under Unreleased
      states the same.
- [ ] AC4: The profile's `verify` slot is clean: `pnpm test` and
      `pnpm check` pass.

## Coverage

- AC1 → T1, T2
- AC2 → T1, T2
- AC3 → T3
- AC4 → T3

## Tasks

- [ ] T1: Write the tests first in the "with time limits" block of
      `test/build.test.ts`: the request order on an even and an odd date,
      and the output, `buildLevel`, and plan order on the odd date with a
      cut. See the odd-date test fail on main at the request order.
- [ ] T2: Order the entries by the parity of `now`'s UTC day count before
      the read loop in `src/build/build.ts`, and put the records back in id
      order before `countReports` and the output.
- [ ] T3: Update README "Building the data" and the build lines of
      DESIGN.md, and add the CHANGELOG entry. Run `pnpm test` and
      `pnpm check`.

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

## Decisions

## Review
