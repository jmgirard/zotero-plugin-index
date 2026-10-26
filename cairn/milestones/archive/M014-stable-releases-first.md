# M014: Read stable releases before prereleases

**Status:** done (2026-10-26, PR #20 https://github.com/jmgirard/zotero-plugin-index/pull/20)

**Goal:** If a plugin's newest stable release with an `.xpi` is a Zotero 7+ build, the index reads the plugin's facts from that release.

**Outcome:** `readUpstream` (`src/upstream/reader.ts`) picks the newest non-draft release with an `.xpi` whose GitHub
`prerelease` is not `true`, else the newest release. A stable read failing with `no-manifest`, `no-zotero-id`, or
`max-version-below-7` falls back to the newest release with a strictly later `published_at`. Other failures return
as they are. The manifest and update.json read moved into `readRelease`. `releaseCount` still counts all releases
with an `.xpi`. The facts and the v1 schema's `upstream` block gain an optional boolean `prerelease`, and
`schemaVersion` stays 1. The plugin page labels the fact "Release read by the index" and ends it with
" (prerelease)" for a prerelease read. README.md, CHANGELOG.md, DESIGN.md, the add-plugin issue form, and the bot
pull request text state the rule. Live: run 40331953229 deployed 17 records, each `prerelease` matching GitHub's
flag. zotero-pdf-preview reads prerelease 1.0.0-4 (its stable releases are Zotero 6), and zotlit reads stable 2.1.4.

**Decisions:** D-008 (stable first with the fallback, superseding M002's prereleases-included rule; moved values of
existing v1 fields are not a breaking change). Milestone-local: none beyond that promotion.

**Review:** Criteria audit (full) 11 findings, 10 taken. Claim audit read 44 claims and corrected 4. One four-lens
pass, 25 findings: 6 fixed (same-date fallback test, a vacuous assertion, repeated test inputs, a stale test title,
D-008 twice), 2 to new rows "Order releases with bad dates safely" and "State the bar for the release read",
17 rejected. No returns, no amendments. CI passed. Row "Read stable releases before prereleases" graduated. Lessons:
6 marked used, 2 captured, 2 evicted by rank: 2026-10-25 (M004) Vitest fake timers, 2026-10-25 (M007) Vitest
BASE_URL.
