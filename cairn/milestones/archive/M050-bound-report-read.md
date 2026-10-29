# M050: End the daily build within its time limits

**Status:** done (2026-10-29, PR #99 https://github.com/jmgirard/zotero-plugin-index/pull/99)

**Goal:** `pnpm build` ends within a bounded time, its read of the report issues and its exit after writing included.

**Outcome:** `buildData` runs the `report` label read and every issue page under one `withinLimit` of `REPORTS_LIMIT_MS` (3 minutes, `TimeLimits.reportsMs`), with `boundFetch`, now exported from `src/upstream/reader.ts`, under `githubClient`. A cut read fails as `cannot read the report issues: request-failed: … the read passed its time limit of <duration>`, so the build writes no file, reads no plugin, and exits 1 (D-013, D-027). `src/build/cli.ts` awaits an empty write on stdout and stderr, then calls `process.exit(code)`, so leftover work such as a cut host lookup no longer holds the process open. Tests: a stalled label, a page 2 stalled before headers and in its body, the 3-minute default under fake timers, and three `pnpm build` runs with a pending 10-minute timer (`test/support/preload-pending-timer.ts`) that match a plain run in status, stdout, and data file, one with over 64 KiB of stdout read after a 2 s pause. README, `build.yml`, DESIGN, and CHANGELOG describe the limit and the exit. The read-order gap of the source row went to M051.

**Decisions:** D-027 (the report read stops at 3 minutes and fails the build; page cap rejected).

**Review:** The plan audit had 10 findings, 8 fixed and 2 answered. The claim audit read 19 claims and corrected 1 (CHANGELOG's "only each page"). Review return 1: the 64 KiB test did not compare data files, fixed in T5. The four-lens pass raised 20 findings: 7 fixed (the stall tests' limit raised to 1000 ms, the report read's own constant, two candidate rows corrected at hygiene), 10 rejected (5 planned changes, 2 false, 2 style, 1 edge: an EPIPE when stdout is closed early), 3 noted. Lessons: 6 marked used M050; 1 captured (2026-10-29, M050, `spawnSync` drains the pipe); 1 evicted by rank (2026-10-27, M022, empty PATH to fail a spawned command).
