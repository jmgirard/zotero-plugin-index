# M018: Withhold deploys when every record fails

**Status:** done (2026-10-26, PR #29 https://github.com/jmgirard/zotero-plugin-index/pull/29)

**Goal:** The daily build also withholds a deploy when every record carries a failure, so it never deploys a site in which every record carries a failure.

**Outcome:** After it writes the file, `pnpm build` in `src/build/cli.ts` also exits 1 when every record carries a
failure, whatever its name, and prints `all <n> records carry a failure` on stderr; each bar that holds prints its
own line. The build-level bar (more than half) is unchanged, and `src/build/build.ts` and `schemas/` are untouched.
Tests: an all-fail build with `fork`, a GitHub API 404, and `facts-invalid` exits 1; one clean record keeps exit 0;
2 build-level failures beside 1 clean record exit 1 with only the build-level line. README, CHANGELOG, DESIGN, and
the `build.yml` comment state the bar. Live: dispatched run 40399504550 on main passed build and deploy, logged
`build-level failures: 0 of 17 records`, and printed no every-record line.

**Decisions:** D-012 (also withhold a deploy when every record carries a failure, annotating D-011), written at
plan. Milestone-local: none.

**Review:** Criteria audit (full) 10 findings taken; claim audit 20 read, 2 corrected. No returns, no amendments.
Four-lens pass, 25 findings: 6 fixed (README term and exit-0 scope, two CHANGELOG lines, a test name), 2 follow-up,
17 rejected (9 planned, 6 false, 2 style), none edge. AC3 to AC6 ticks landed before their evidence lines, which
were added in the same pass. CI passed. "Withhold deploys when all reads fail" narrowed and retitled "Count more
GitHub answers as build-level"; M015 row pruned; 4 lessons marked used; 1 captured (join wrapped doc lines before
a phrase search); 2026-10-26 (M011) token-permissions lesson evicted by rank.
