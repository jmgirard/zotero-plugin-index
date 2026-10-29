# M051: Alternate the build's plugin read order by day

**Status:** done (2026-10-29, PR #100 https://github.com/jmgirard/zotero-plugin-index/pull/100)

**Goal:** `pnpm build` reads plugins in id order on even UTC days and in reverse id order on odd ones, so a build that its 18-minute limit cuts does not leave the same plugins unread every day.

**Outcome:** `buildData` in `src/build/build.ts` reverses the `listEntries` index order when `floor(now / day) % 2 !== 0`, writes each record at its entry's index, and builds `buildLevel` from the indices, so the data file, `buildLevel`, `countReports`, and the start plan keep id order. Tests in `test/build.test.ts` check the repo request order on 2026-10-31T23:30Z (odd) and 2026-11-01T00:30Z (even) and a four-entry odd-day cut; the existing cut test got a fixed even date. README "Building the data", the CHANGELOG, and DESIGN.md state the rule against `generatedAt`. The source row's other two gaps shipped in M050.

**Decisions:** D-028 (alternation by UTC day, annotating D-015; records the same-parity limit).

**Review:** four-lens fan-out, 22 findings: 13 fixed on the branch (README stray wrap line and id-order wording, DESIGN.md phrasing and provenance, wider limits for the four-entry cut test, D-028), 9 rejected (2 edge: an invalid `now`, dates before 1970; 7 false). Claim audit: 18 claims, 1 test comment corrected. Graduated candidate row "Close gaps in the build time limits". Lessons marked used: M001, M010, M018, M036, M038; none captured (25-lesson limit, nothing worth an eviction).
