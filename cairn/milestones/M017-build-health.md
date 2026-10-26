<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M017: Stop deploys only for build failures

- **Status:** review   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** normal   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** —   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** —   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** user-facing — it decides whether the public site and data deploy, and it changes what `pnpm build` prints   <!-- owner: plan · create/amend-via-gate; user-facing | internal — <one-clause reason>; skill conduct only — no validate check parses it -->
- **Branch/PR:** m017-build-health   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

## Goal
<!-- owner: plan · create; a wrong goal returns to plan, never edited in place -->

The daily build withholds a deploy only when more than half of the plugin reads fail for build-level reasons, and it reports its failures.

## Scope
<!-- owner: plan · create/amend-via-gate -->

**In:** the reader passes a build-level mark beside each failed read, apart
from the failure name and message; `pnpm build` counts only build-level
failures toward its exit-1 rule, prints a summary of failure names, and prints
a GitHub Actions `::warning::` line when any read fails for a build-level
reason; README, CHANGELOG, DESIGN, and the `build.yml` comment state the new
rule. The published data keeps its shape.

**Out:** a time budget for each plugin's read → candidate row "Warn when the
daily build degrades" (its remainder after this milestone); a time budget for
`pnpm discover` → candidate row "Bound the time of a discover run"; using the
mark in `pnpm discover`'s state rule → candidate row "Retry repos refused by a
download error"; writes to `$GITHUB_STEP_SUMMARY` and notifications → not
planned.

## Acceptance criteria
<!-- owner: plan · create/amend-via-gate; review reads, never reinterprets. -->

- [x] AC1: For the reads `pnpm build` makes, a failed read is build-level
      exactly when it ends in `unexpected-error`, when a request gets no whole
      response (the DNS lookup fails or times out, fetch rejects or times out,
      or the body stream errors, on any host), when the GitHub API answers
      HTTP 401 or 403, or when any host answers HTTP 429 or 500 to 599. Every
      other failure, `facts-invalid` and a GitHub API 404 included, is not
      build-level. A test checks the status rule for each status from 200 to
      599, for a GitHub API answer and for a download answer. Build tests with
      recorded responses show as build-level: a fetch rejection on the GitHub
      API, a fetch rejection on an XPI host, a DNS lookup failure for a
      download host, a body error on a GitHub API 200, an `unexpected-error`,
      a GitHub API 403, and a 503 from an `update.json` host; and as not
      build-level: a GitHub API 404, `fork`, a 404 from an XPI host, and a
      `request-failed` from too many redirects.
- [x] AC2: Once `pnpm build` has written the file, it exits 1 if and only if
      more than half of the records carry a build-level failure. Tests show 2
      of 3 build-level failures exiting 1, 1 of 2 exiting 0, and 3 of 3
      records failing with `fork` or a GitHub API 404 exiting 0.
- [x] AC3: Before its `wrote` line, `pnpm build` prints on stdout one line for
      each failure name that a record carries, sorted by name, with the number
      of records that carry it, then one line with the number of build-level
      failures out of all records (`0 of N` when no record failed). Tests
      assert these lines for a build whose records fail in more than one way
      and for a build with no failure.
- [x] AC4: When one or more records carry a build-level failure, `pnpm build`
      prints on stdout a line that starts with `::warning::` and gives that
      number, whether it then exits 0 or 1. With no build-level failure it
      prints no `::warning::` line, also when records fail with `fork`. Tests
      cover an exit-0 build, an exit-1 build, and a `fork`-only build.
- [x] AC5: For the same recorded responses, `dist/v1/plugins.json` is
      byte-identical to the default branch's output before this milestone,
      apart from `generatedAt`, on a fixture with both build-level and other
      failures.
- [x] AC6: README.md, the `## Unreleased` section of CHANGELOG.md,
      cairn/DESIGN.md (Function Families and Architecture), and the comment in
      `.github/workflows/build.yml` each state that only build-level failures
      count toward the exit-1 rule, and each names what a build-level failure
      is or points to the README for it.
- [x] AC7: `pnpm test` and `pnpm check` pass.

## Coverage
<!-- owner: plan · create/amend-via-gate -->

- AC1 → T1, T2, T3
- AC2 → T1, T3
- AC3 → T1, T4
- AC4 → T1, T4
- AC5 → T1, T3
- AC6 → T5, T7
- AC7 → T6

## Tasks
<!-- owner: plan (create) / implement (check-off, minor edits) -->

- [x] T1: Before any code change, build the mixed-failure fixture (recorded
      responses under `test/fixtures/build/`, using `error`, `bodyError`, and
      `unexpected` in `test/support/fixture-fetch.ts`) and commit its
      `plugins.json` from the default-branch code as the AC5 golden file. Then
      write the failing tests for AC1 to AC4, and rewrite the two tests of the
      old rule (`test/build.test.ts:152`, `:170`).
- [x] T2: In `src/upstream/reader.ts`, carry a build-level mark on
      `ReadFailure` and the `{ ok: false }` result, never by parsing
      `message`. Set it at `request()` (328), `readText` (336), `readCapped`
      (346), the lookup failures in `src/upstream/host-guard.ts:57-65`, the
      GitHub API non-ok answer in `get()` (261) for 401, 403, 429, and 5xx,
      and the download non-ok answers (XPI 412, `update.json` 565) for 429
      and 5xx. Add the status-rule test.
- [x] T3: In `src/build/build.ts`, mark `unexpected-error` in `readRecord`
      (131) and return the build-level count beside `data`, outside the
      records; in `src/build/cli.ts:35-43`, base the exit-1 rule on it.
- [x] T4: In `src/build/cli.ts`, print the failure-name summary, the
      build-level line, and the `::warning::` line.
- [x] T5: Update README.md (around lines 60 and 336-340), CHANGELOG.md (edit
      the Unreleased entry at line 48 and add the summary and warning),
      cairn/DESIGN.md (147, 314), and the comment at `build.yml:37`. Grep for
      "more than half" and "carry a failure" as a reviewer aid.
- [x] T6: Run the verify slot: `npx -y pnpm@12.15.0 test` and
      `npx -y pnpm@12.15.0 check`.
- [x] T7: Review return 1: make the DESIGN.md Architecture paragraph point
      to README "Building the data" for what a build-level failure is.

## Work log
<!-- owner: any skill · append-only; one line per entry; absolute dates. -->

- 2026-10-26: created by /milestone-plan.
- 2026-10-26: tier check: not run — work named at the question set
- 2026-10-26: idea vet: two concerns. (1) A deleted repo's GitHub 404 has the same failure name as a rate limit, so counting by name would still block deploys on a steady state; answered: count by HTTP status and cause. (2) A per-plugin time budget guards a case that needs about 30 hung requests at 17 plugins; answered: leave it as a candidate.
- 2026-10-26: lessons used: 2026-10-25 (M001, pnpm via npx), 2026-10-25 (M002, preload fixture), 2026-10-25 (M003, fetch Proxy), 2026-10-25 (M004, DNS stubs), 2026-10-25 (M006, deploys from main only), 2026-10-26 (M010, plant and restore from a copy)
- 2026-10-26: question set: work — build health, joining rows "Count only build failures for deploys" and "Warn when the daily build degrades"; deploy rule — by HTTP status and cause; per-plugin time budget — left as a candidate; live check — yes, review may dispatch `Build data` on main once after the merge and read its log and the deployed data.
- 2026-10-26: collision check: absorbs "Count only build failures for deploys" in full and "Warn when the daily build degrades" in part (its per-plugin time budget stays in that row); changes M006's exit rule (done, archived); D-006 and D-007 untouched because the data keeps its shape; no planned or in-progress overlap.
- 2026-10-26: inbox sweep: 0 open issues; 1 open PR (#15, a bot discovery proposal) with no overlap.
- 2026-10-26: criteria audit (full mode, fresh Opus reader): 13 findings, all taken. AC1 now says "exactly when", lists the no-response causes (DNS, fetch, body stream), scopes to the build's reads, and adds build probes for a download-host rejection, a DNS failure, and a body error; AC2 says "once the file is written ... if and only if"; AC3 fixes stream, order, place, and the no-failure case; AC4 fixes stream and adds the exit-1 case; AC5 became a byte comparison with the pre-change output; AC6 states the docs' content instead of a grep; tasks name the two old-rule tests.
- 2026-10-26: plan chose a build-level mark carried beside the failure over new failure names or parsing `message`, because new names change the published data and message parsing breaks on rewording; falsified by evidence that data consumers need the cause in `plugins.json`.
- 2026-10-26: plan chose to count HTTP 429 and 5xx from any host over GitHub API answers only (audit finding): an outage of GitHub's release-asset host fails every record as `xpi-unreadable`, which the old rule blocked and an API-only rule would deploy; falsified by evidence that download-host 5xx answers come from steady plugin-side faults often enough to pass half the records.
- 2026-10-26: a GitHub 403 for one blocked repo counts as build-level; accepted, since one record cannot pass the half rule alone.
- 2026-10-26: implement started on branch m017-build-health.
- 2026-10-26: T1 done: `test/support/mixed-failures.ts` writes 12 entries (7 build-level causes, 4 others, 1 passing); golden `test/fixtures/build/mixed-failures.plugins.json` made by `buildData` on unchanged `src/` with a fixed date; new tests red for the right reason (no summary lines, no `buildLevel`, no `buildLevelStatus`), golden test green. The DNS-timeout reader test now expects the build-level mark.
- 2026-10-26: implement chose: `buildData` returns `buildLevel` (sorted ids) beside `data`; summary lines read `failed with <name>: <n>` and `build-level failures: <n> of <total> records`; the warning reads `::warning::<n> of <total> records carry a build-level failure`.
- 2026-10-26: T2 done: `ReadFailure` and the failed `readUpstream` result carry `buildLevel`; `buildLevelStatus(status, "github-api" | "download")` is exported; marks set at `request()`, `readText`, `readCapped`, the lookup failures in `host-guard.ts`, `get()`, and the XPI and `update.json` non-ok answers; `send()` left unmarked (not a build read). Four rows of the reader's failure table moved to a build-level table, plus an XPI 502 row. Reader, discover, issue, add-plugin, and propose tests: 283 passed.
- 2026-10-26: T3 done: `buildData` returns `buildLevel` (record order), `unexpected-error` counts, and `cli.ts` exits 1 on more than half build-level. `tsc` clean; build tests 21 passed, 5 red on the summary lines that T4 adds.
- 2026-10-26: T4 done: `cli.ts` prints `failed with <name>: <n>` lines sorted by name, the build-level line, and the `::warning::` line before `wrote`; build tests 26 passed. Planted `buildLevelStatus` returning true (copy and restore): reader tests went red on the 404 rows; restored file matches the commit.
- 2026-10-26: T5 done: README (top paragraph and "Building the data", now listing the four build-level causes), CHANGELOG (M006 entry edited, new entry for the rule, summary, and warning), DESIGN (Function Families and Architecture), `build.yml:37` comment. Grep for "more than half", "carry a failure", "half of", and "deploys nothing" over README, CHANGELOG, DESIGN, `.github`, `site/src`, and `src`: every hit states the build-level rule or a site-build failure. The simple-english hook's pre-existing README:67 "validate" hit left alone.
- 2026-10-26: T6 done: `pnpm test` 483 passed (14 files); `pnpm check` 17 entries, 0 problems.
- 2026-10-26: claim audit: 36 claims read, 2 corrected — README.md, src/build/build.ts, src/build/cli.ts, src/upstream/reader.ts, test/build.test.ts ("points at the build" softened to "usually", since a plugin's own dead download host also counts; one test name made exact). The `::warning::` annotation claim matches GitHub's documented workflow command but is unobserved; the granted post-merge `Build data` run checks it. Verify re-run: 483 passed, 0 problems.
- 2026-10-26: implement complete; status set to review.
- 2026-10-26: review return 1: AC6 — the DESIGN.md Architecture paragraph (`cairn/DESIGN.md:315-318`) states the build-level exit rule but neither names what a build-level failure is nor points to the README for it.
- 2026-10-26: minor amendment: T7 added for review return 1, Coverage AC6 → T5, T7. T7 done: the Architecture paragraph now says "as README "Building the data" defines it". Docs only; `pnpm test` and `pnpm check` unaffected, run below.
- 2026-10-26: implement complete after return 1; status set to review.
- 2026-10-26: correction to the "implement chose" line above: `buildData` returns `buildLevel` in record order, not sorted; records follow entry order, which the listing sorts.
- 2026-10-26: review pass 2: four lenses, 27 findings; 6 fix now (message on one line with a regression test, D-011, DESIGN rewrap, two test comments, this correction), 4 follow-up into new row "Withhold deploys when all reads fail", 17 rejected. Verify: 484 passed, 0 problems.
- 2026-10-26: correction to the line above: the four lenses reported 22 findings (diff-bug 12, blame-history 6, prior-review 4, ripple 0): 5 fix now in 43176b9, 3 follow-up into row "Withhold deploys when all reads fail", 14 rejected.
- 2026-10-26: step-7 approval: m017-build-health approved for merge

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive. -->

Pass 1, 2026-10-26, on m017-build-health at e2a685a (level with origin/main 8f4c32f).

- AC1: `buildData` test "names the records whose failure is build-level" passes with the exact list api-403, api-body-error, api-reject, dns-fail, unexpected, update-503, xpi-reject (the fixture's api-404, fork, xpi-404, redirect-loop, and passing entries absent); `buildLevelStatus` test over 200–599 for both sources passes; facts-invalid test asserts `buildLevel` `[]`; reader table "fails with buildLevel when …" (403, connect, body cut, XPI body cut, XPI 502) and lookup fail, no-address, and 60 s timeout tests pass with `buildLevel: true`. Marks set only at `request()`, `readText`, `readCapped`, `get()`, XPI and `update.json` non-ok, host-guard lookups, and build.ts `unexpected-error`.
- AC2: CLI tests pass: 2 of 3 build-level exits 1 with "2 of 3 records carry a build-level failure, more than half"; 1 of 2 exits 0; 3 of 3 (404 and two forks) exits 0. `cli.ts` exits 1 only on `buildLevel * 2 > total`, after `writeData`.
- AC3: CLI tests assert the sorted `failed with <name>: <n>` lines and `build-level failures: <n> of <total> records` for mixed failures and `0 of 2` with no failure-name line for no failures. Manual run on the 12-entry mixed tree printed the per-record lines, five sorted name lines, `build-level failures: 6 of 12 records`, the warning, then `wrote 12 records`.
- AC4: CLI tests pass: `::warning::` line on the exit-1 build and the exit-0 1-of-2 build; none on the fork-only and the 404-and-forks builds.
- AC5: "writes the same file as before the build-level rule" passes; the golden file's only commit is ebc6fb5, whose `src/` equals main's (`git diff main ebc6fb5 -- src` empty).
- AC6: FAIL. README, CHANGELOG, DESIGN Function Families, and `build.yml:37` state the rule and define it or point to README. DESIGN Architecture (`cairn/DESIGN.md:315-318`) states the build-level rule but neither names what a build-level failure is nor points to README.
- AC7: `pnpm test` 483 passed (14 files); `pnpm check` 17 entries, 0 problems.
- Gate: `cairn_validate.py` all checks passed; profile consistency-gate: none (generic).

Pass 2, 2026-10-26, at 91af72f (level with origin/main), after review return 1.

- AC6: README "Building the data" lists the four build-level causes and README:60-63 points to it; CHANGELOG's new Unreleased entry says only build-level failures count and points to README, and its M006 entry defines one by example; DESIGN Function Families (147-150) and Architecture (316-317) both say "as README "Building the data" defines it"; `build.yml:37` names examples and points to README.
- AC1–AC5, AC7: code unchanged since pass 1 (T7 touched `cairn/DESIGN.md` only); `pnpm test` 483 passed and `pnpm check` 0 problems at 91af72f.
- Gate: `cairn_validate.py` all checks passed.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: a failure message holds upstream text (a raw `update_url`), so a newline in it can start a `::stop-commands::` line that hides the new `::warning::` or fakes annotations — fix now: `cli.ts` puts each message on one line; regression test planted `\n::stop-commands::planted` in an update_url (red before, green after), fixed 43176b9
- diff-bug #2: a dead plugin domain's lookup failure counts as build-level every day — reject, planned change (AC1 "on any host"; README says so)
- diff-bug #3: a GitHub API 200 with an HTML body is not build-level — follow-up: row "Withhold deploys when all reads fail"
- diff-bug #4: a 403 from GitHub's release-asset host is not build-level — follow-up: row "Withhold deploys when all reads fail"
- diff-bug #5: `buildLevel` is `boolean`, `true | undefined`, and `boolean | undefined` in different types — reject, style
- diff-bug #6: the work log's "implement chose" line says sorted ids, the code keeps record order — fix now: correcting work-log line, fixed 43176b9
- diff-bug #7: the new DESIGN Architecture lines are not wrapped — fix now: rewrapped, fixed 43176b9
- diff-bug #8: the fork-only warning test runs the same path as the 404-and-forks test — reject, planned change (AC4 names a fork-only build)
- diff-bug #9: the `buildLevelStatus` test's expectation restates the rule — reject, false: the expectation is the AC1 list stated apart from the code, and the planted always-true rule turned it red
- diff-bug #10: the two "body cut off" rows reach the same `readCapped` catch — reject, false: both rows reach the `readCapped` catch, but through different callers (`checkUpdateJson` and `readManifest`), and each row guards its caller; both rows predate M017 and only moved tables
- diff-bug #11: mixed-failure cases repeat reader-table and CLI cases — reject, planned change (AC1 names each probe)
- diff-bug #12: narrative comments at `test/build.test.ts:176-177` and `:214` — fix now: removed, fixed 43176b9
- blame-history #1: the build-level rule reverses M006's purpose with no D-entry; a reader or schema regression that fails every record with a named failure now deploys — fix now: D-011 records the decision and its cost; the safety net goes to new row "Withhold deploys when all reads fail", fixed 43176b9
- blame-history #2: zip-structure `xpi-unreadable` failures are never build-level — follow-up: row "Withhold deploys when all reads fail"
- blame-history #3: the M006 exit tests were replaced with no test of exit 1 for mostly non-build-level failures — reject, planned change (AC2: such a build exits 0)
- blame-history #4: several repos answering 403 each count — reject, planned change (work log 2026-10-26 accepts the 403 rule)
- blame-history #5: one shared download host's 429 or 5xx across many plugins can block a deploy — reject, planned change (work log: 429 and 5xx from any host)
- blame-history #6: README top paragraph has a long joined line — reject, style (the line predates M017)
- prior-review #1: `unexpected-error` now counts toward the deploy block — reject, planned change (AC1)
- prior-review #2: every fetch rejection and lookup failure counts on any host — reject, planned change (AC1)
- prior-review #3: a GitHub API 403 for one blocked repo counts — reject, planned change (work log)
- prior-review #4: an empty DNS answer counts as build-level — reject, planned change (AC1 "the DNS lookup fails")
- ripple: no ripple evidence outside the diff; ROADMAP:20-21 describe the pre-M017 rule as dated rows that carry "started M017"
- Return floor: diff-bug #1 is not load-bearing for users (only a crafted upstream file reaches it, and it hides a warning, not a deploy decision), so no status return.
