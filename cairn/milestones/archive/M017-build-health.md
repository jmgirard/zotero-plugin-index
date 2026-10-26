# M017: Stop deploys only for build failures

**Status:** done (2026-10-26, PR #23 https://github.com/jmgirard/zotero-plugin-index/pull/23)

**Goal:** The daily build withholds a deploy only when more than half of the plugin reads fail for build-level reasons, and it reports its failures.

**Outcome:** The reader carries `buildLevel` on `ReadFailure` and the failed `readUpstream` result, set at `request()`,
`readText`, `readCapped`, the host-guard lookup failures and timeout, and, through exported `buildLevelStatus`, for a
GitHub API 401 or 403 and a 429 or 5xx from any host; `buildData` marks `unexpected-error` and returns the marked ids
beside `data`, never in it. `pnpm build` exits 1 only when more than half of the records carry a build-level failure,
prints `failed with <name>: <n>` lines, `build-level failures: <n> of <total> records`, and a `::warning::` line, and
prints each failure message on one line so upstream text cannot start a workflow command. A 12-entry mixed fixture
(`test/support/mixed-failures.ts`) and a golden `plugins.json` made from the old code pin the data shape. README,
CHANGELOG, DESIGN, and the `build.yml` comment state the rule. Live: dispatched run 40347408973 on main passed build
and deploy, logged `build-level failures: 0 of 17 records`, and deployed 17 records with no failure; the `::warning::`
annotation stays unobserved live, since no read failed.

**Decisions:** D-011 (withhold a deploy only for build-level failures, narrowing M006's rule). Milestone-local: none.

**Review:** Criteria audit (full) 13 findings taken; claim audit 36 read, 2 corrected. One return (AC6: DESIGN
Architecture named no definition), fixed by T7. Four-lens pass, 22 findings: 5 fixed (one-line messages with a
regression test, D-011, DESIGN wrap, test comments, work-log correction), 3 into new row "Withhold deploys when all
reads fail", 14 rejected (10 planned, 2 style, 2 false), none edge. No amendments. CI passed. "Count only build
failures for deploys" graduated; "Warn when the daily build degrades" narrowed to its time budget; M014 row pruned;
7 lessons marked used; 1 captured (golden file from unchanged code); 2026-10-26 (M008) INIT_CWD lesson evicted by rank.
