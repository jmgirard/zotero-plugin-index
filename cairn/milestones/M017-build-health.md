<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M017: Stop deploys only for build failures

- **Status:** in-progress   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
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

- [ ] AC1: For the reads `pnpm build` makes, a failed read is build-level
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
- [ ] AC2: Once `pnpm build` has written the file, it exits 1 if and only if
      more than half of the records carry a build-level failure. Tests show 2
      of 3 build-level failures exiting 1, 1 of 2 exiting 0, and 3 of 3
      records failing with `fork` or a GitHub API 404 exiting 0.
- [ ] AC3: Before its `wrote` line, `pnpm build` prints on stdout one line for
      each failure name that a record carries, sorted by name, with the number
      of records that carry it, then one line with the number of build-level
      failures out of all records (`0 of N` when no record failed). Tests
      assert these lines for a build whose records fail in more than one way
      and for a build with no failure.
- [ ] AC4: When one or more records carry a build-level failure, `pnpm build`
      prints on stdout a line that starts with `::warning::` and gives that
      number, whether it then exits 0 or 1. With no build-level failure it
      prints no `::warning::` line, also when records fail with `fork`. Tests
      cover an exit-0 build, an exit-1 build, and a `fork`-only build.
- [ ] AC5: For the same recorded responses, `dist/v1/plugins.json` is
      byte-identical to the default branch's output before this milestone,
      apart from `generatedAt`, on a fixture with both build-level and other
      failures.
- [ ] AC6: README.md, the `## Unreleased` section of CHANGELOG.md,
      cairn/DESIGN.md (Function Families and Architecture), and the comment in
      `.github/workflows/build.yml` each state that only build-level failures
      count toward the exit-1 rule, and each names what a build-level failure
      is or points to the README for it.
- [ ] AC7: `pnpm test` and `pnpm check` pass.

## Coverage
<!-- owner: plan · create/amend-via-gate -->

- AC1 → T1, T2, T3
- AC2 → T1, T3
- AC3 → T1, T4
- AC4 → T1, T4
- AC5 → T1, T3
- AC6 → T5
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

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive. -->
