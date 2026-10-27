# M029: Bound the build's read time

**Status:** done (2026-10-27, PR #46 https://github.com/jmgirard/zotero-plugin-index/pull/46)

**Goal:** `pnpm build` stops each plugin read, and its whole read phase, at a time limit, so hung hosts cannot push the build job past 30 minutes.

**Outcome:** `readUpstream` (`src/upstream/reader.ts`) takes an optional `signal`; it wraps fetch with `AbortSignal.any` and races the host lookup against the signal, and the downloader checks the signal after a redirect body's cancel, so an abort fails the read as a build-level `request-failed` with the abort reason in its message. `buildData` (`src/build/build.ts`) gives each plugin read `READ_LIMIT_MS` (3 minutes) and starts no read after `BUILD_LIMIT_MS` (18 minutes) from process start; each entry it does not reach gets the failure `not-read`, and both cuts join the build-level list, so D-011's deploy rule applies. Limits come in as an optional fifth argument `{ readMs, buildMs, startedAt }`. `fixtureFetch` gained a `stall` option. Tests: a 7-case stall table and a redirect case in `test/upstream.test.ts`; three cases in `test/build.test.ts` (per-read cut, read-phase cut, the 3-minute default under fake timers). README "Building the data" and "The daily build", the schema's `failure` descriptions, DESIGN, CHANGELOG, and a `build.yml` comment state the limits.

**Decisions:** D-015 (both cuts are build-level, annotating D-011); D-016 (the limits bound the plugin reads only, narrowing D-015); D-017 (corrects D-016's candidate row pointer).

**Review:** Plan audit (full) 14 findings over M029 and M030, all taken. Claim audit: 33 claims, 2 corrected. Review return 1: AC4's README sentence covered only unread entries (T6). Four-lens pass, 29 findings: 14 fixed in db4cf63, 4 follow-ups, 11 rejected. CI went red once on the fake-timer test's fixed loop; it now advances the clock at the stall. Hygiene: row "Warn when the daily build degrades" graduated; M026 row pruned; rows "Close gaps in the build time limits" and "Label cut reads on plugin pages" added; 9 lessons marked used M029; 1 captured; lesson 2026-10-27 (M020) evicted by rank.
