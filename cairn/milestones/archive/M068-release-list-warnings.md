# M068: Warn when the Zotero release lists fall behind

**Status:** done (2026-10-31, PR #351 https://github.com/jmgirard/zotero-plugin-index/pull/351)

**Goal:** The daily build warns the maintainer when Zotero ships a major or an earlier major's release that the hand-kept lists in `src/site/version.ts` do not hold.

**Outcome:** `src/build/zotero-release.ts` gains `changelogUrl`, `readChangelogRelease` (no token; the first
`<h1-6>` "Changes in N.x" heading whose version is not followed by a letter, digit, `.`, or `-`, so a beta heading
is passed over), `releaseListWarnings`, and the shared `ReleaseRead` type. `buildData` runs the release read and one
changelog read per `LAST_RELEASES` key with `Promise.all` under `releaseMs` (30 s) and returns `releaseWarnings`,
kept out of the data. The CLI prints each as a `::warning::` line after the release warning and before the writes,
with no change to the exit code. The lines are: a release from a newer major than the last of `ZOTERO_MAJORS`, which
names both lists to edit; a page naming a newer release than `LAST_RELEASES`; a failed read or a page with no
heading. A `test/version.test.ts` test fails when `LAST_RELEASES` does not hold exactly the majors before the last.
Test fixtures copy the saved pages' heading markup. README "Building the data", CHANGELOG, DESIGN, `build.yml`'s
time comment, and the source note `cairn/references/zotero-changelogs.md` are updated. Branch run 41205738969 read the
live pages with no warning.

**Decisions:** D-040 (warn from the changelog pages and keep the lists hand-kept, annotating D-036).

**Review:** Criteria audit (reduced) 8 findings, all taken. 5 of 5 criteria passed, with direct `pnpm build` runs per
warning case over the whole saved pages. Four-lens fan-out, 18 findings: 15 fixed in 9501830 (newer-major rule,
both lists named, beta headings, `buildLevel` asserted, duplicate checks dropped, stale comments and prose), 3
rejected (2 planned change, 1 style), no return. CI passed. 8 lessons marked used M068; none captured. The candidate
row "Keep the Zotero release lists current" graduated.
