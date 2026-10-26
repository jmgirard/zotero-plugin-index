<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M018: Withhold deploys when every record fails

- **Status:** review   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** normal   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** —   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** —   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** user-facing — it decides whether the public site and data deploy, and it changes when `pnpm build` exits 1   <!-- owner: plan · create/amend-via-gate; user-facing | internal — <one-clause reason>; skill conduct only — no validate check parses it -->
- **Branch/PR:** m018-every-record-fails   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

## Goal
<!-- owner: plan · create; a wrong goal returns to plan, never edited in place -->

The daily build also withholds a deploy when every record carries a failure, so it never deploys a site in which every record carries a failure.

## Scope
<!-- owner: plan · create/amend-via-gate -->

**In:** After `pnpm build` writes the file and prints its summary, it also
exits 1 when every record carries a failure, whatever the failure's name. It
then prints one stderr line that says so. The build-level bar that M017
shipped keeps its rule. README, CHANGELOG, DESIGN, the `build.yml` comment,
and the `src/build/cli.ts` comment state the second bar. The published data
keeps its shape.

**Out:** A bar for partial regressions, such as a failure share far above the
share in the live data, is not planned. The user chose the every-record bar
at the question set (D-012). A time budget for each plugin's read stays in
candidate row "Warn when the daily build degrades". A new `::warning::` or
`::error::` annotation for the second bar is not planned. The decision entry
D-012 is written by this plan, not by the milestone.

## Acceptance criteria
<!-- owner: plan · create/amend-via-gate; review reads, never reinterprets.
     Every item opens with its positional label — `ACn:` — the item's
     position counted top-to-bottom, the number Coverage cites; an
     insertion, removal, or reorder renumbers the labels and the Coverage
     lines together.
     Driving RR set → its Binding criteria appear VERBATIM here (binding-
     criteria check), each ingested as a numbered criterion carrying its tag
     — `- [ ] ACn (BCm): <verbatim>` — with its own Coverage line, since
     coverage-complete counts AC checkboxes positionally (M107); departures:
     a "Deviations from RR<NN>" table ends this section. -->

- [x] AC1: After `pnpm build` writes the file, it exits 1 when every record
      carries a failure, and it prints the line
      `all <n> records carry a failure` on stderr, where `<n>` is the number
      of records. A test whose 3 records fail with `fork`, with a GitHub API
      404 (`github-http-error`), and with `facts-invalid` shows exit status 1,
      that line with `<n>` = 3, the stdout line
      `build-level failures: 0 of 3 records`, and a written file in which
      every record carries a failure.
- [x] AC2: The every-record bar does not fire while one record has no
      failure. A test whose 3 records include exactly one with no failure,
      the other two failing with `fork`, shows exit status 0 and no stderr
      line that contains `records carry a failure`.
- [x] AC3: The build-level bar keeps its rule apart from the new bar. A test
      whose 3 records hold 2 build-level failures and 1 record with no
      failure shows exit status 1, the stderr line that ends in
      `more than half`, and no stderr line that contains
      `records carry a failure`. The existing test with 2 of 3 build-level
      failures, whose 3 records all fail, shows both stderr lines. The
      existing test with 1 of 2 build-level failures still exits 0.
- [x] AC4: Each of these six places holds the phrase
      `every record carries a failure`: the comment above the exit rule in
      `src/build/cli.ts`, the comment above `pnpm build` in
      `.github/workflows/build.yml`, README's paragraph that starts
      "A daily build updates the data", README's "Building the data"
      paragraph that states the exit status, and the `pnpm build` entries in
      cairn/DESIGN.md's Function Families and Architecture sections. With
      README's lines joined (`tr '\n' ' ' < README.md`), a search finds
      neither `for a reason of its own` nor
      `or fewer carry one, the command exits with status 0.`. The
      `## Unreleased` section of CHANGELOG.md gains one entry that holds the
      same phrase.
- [x] AC5: The published data keeps its shape:
      `git diff --stat <default-branch>...HEAD -- schemas src/build/build.ts`
      prints nothing.
- [x] AC6: `pnpm test` and `pnpm check` pass.

## Coverage
<!-- owner: plan · create/amend-via-gate; each acceptance criterion → the
     task(s) satisfying it, by positional number (AC/Task counted
     top-to-bottom). Review reads to fence evidence — tracking-rules "AC fencing". -->

- AC1 → T1, T2
- AC2 → T1, T2
- AC3 → T1, T2
- AC4 → T3
- AC5 → T2
- AC6 → T1, T2, T3

## Tasks
<!-- owner: plan (create) / implement (check-off, minor edits); substantive
     change is amend-via-gate. Every item opens with its positional label —
     `Tn:` — the item's position counted top-to-bottom, the number Coverage
     cites; an insertion, removal, or reorder renumbers the labels and the
     Coverage lines together. -->

- [x] T1: Write the tests first in `test/build.test.ts`. Change the test
      "exits 0 with no warning when every record fails for reasons that are
      not build-level" (line 211) to the AC1 test. Make its third record fail
      with `facts-invalid`, for example with no `created_at` in the repo
      response. Add the AC2 test, with SECOND made a fork. Add the AC3 test.
      Its tree has no FORKED entry, so build it in the test, for example
      with a copy of an entry under a new id. Add the both-lines assertion
      to the 2-of-3 test (line 174). The test "prints each failure message
      on one line" also fails all 3 records and will exit 1, and it asserts
      no exit status. Run the new tests and see them fail on the unchanged
      code.
- [x] T2: In `src/build/cli.ts`, count the records that carry a failure.
      Print each bar's stderr line that holds, and return 1 when either bar
      holds. Update the comment above the rule. Leave `src/build/build.ts`
      and `schemas/` as they are.
- [x] T3: State the second bar with the AC4 phrase in the six places AC4
      names. In README, replace the sentences that say a build in which
      every record fails exits 0. Add the CHANGELOG `## Unreleased` entry.
      Run the AC4 searches.
- [ ] T4: After the merge, as part of review, dispatch `build.yml` on `main`
      (the user allowed this at the question set). Read the build log for a
      `records carry a failure` line and the deploy job's result, and write
      the result as one work-log line. This is an observation, not a
      criterion, since live rate limits can also fail the run.

## Work log
<!-- owner: any skill · append-only; one line per entry; absolute dates.
     EXEMPT from the 150-line cap (D-046): history under D-045, never edited,
     so the cap must never demand a trim here. Wrapped entries get a WARN.
     The rejected-alternative record (/milestone-plan step 4) takes this form:
     `- YYYY-MM-DD: plan gate chose <approach> over <alternative> because
     <reason>; falsified by <evidence class>.` — one per approach choice the
     gate actually weighed, none where it weighed none, and it is the record
     `/milestone-review`'s thrash trigger (b) reads. It lives here rather than
     below so an instantiated file inherits no placeholder to delete.
     A milestone of a feature series also carries the plan's
     `feature series: M<a> -> M<b>[ -> …]` line (tracking-rules "Feature series"). -->

- 2026-10-26: created by /milestone-plan.
- 2026-10-26: tier check: not run — work named at the question set.
- 2026-10-26: question set: what to work on — candidate row "Withhold deploys when all reads fail"; which bar — every record carries a failure; live run — the user allowed one `build.yml` dispatch on `main` after the merge.
- 2026-10-26: idea vet: no concern found. The bar does what its name says for every failure name, the user chose it, and its one cost (an index where every plugin fails for good never deploys) is stated in D-012.
- 2026-10-26: lessons used: 2026-10-25 (M001) run pnpm through npx; 2026-10-25 (M002) CLI tests against recorded responses; 2026-10-25 (M006) Pages deploys from main only, so check live after the merge.
- 2026-10-26: plan gate chose the every-record bar over a bar on a failure share far above the live data's, because the user picked it and it needs no read of the live data; falsified by a regression that fails most but not all records and still deploys.
- 2026-10-26: plan chose a second bar in `src/build/cli.ts` over a change to `buildData`, because the exit rule already lives there and the data must keep its shape; falsified by a need for the bar outside the CLI.
- 2026-10-26: collision check: D-011 names this candidate row as its safety net, so D-012 annotates it; M017 (done) shipped the build-level bar that this milestone keeps; the candidate row is absorbed in full.
- 2026-10-26: inbox sweep: no open issues; 6 open bot "Add plugin" pull requests, none overlapping.
- 2026-10-26: criteria audit (full, fresh Opus reader): 10 findings, all taken. Docs check moved from a grep that missed a wrapped README line to a fixed phrase at six named places and a line-joined search; added AC3 for the build-level bar alone, since every existing build-level test also fails all records; added `facts-invalid` to the all-fail test; moved the live run from a criterion to T4; added AC5 for the data shape; moved the D-entry to this plan; narrowed the Goal; D-012 names the never-deploy risk.
- 2026-10-26: changelog: one new `## Unreleased` entry (T3).
- 2026-10-26: implement started on branch m018-every-record-fails.
- 2026-10-26: T1 done (its checkpoint commit carried no tick, added here): the all-fail test now uses `fork`, a GitHub API 404, and `facts-invalid`; added the one-clean-record test and the build-level-alone test, whose tree copies SECOND under the id `second-copy@example.org` so both read the 503. On the old code the all-fail test and the 2-of-3 both-lines assertion failed, and the two new tests passed, as they pin kept behavior.
- 2026-10-26: T2 done: `src/build/cli.ts` prints each bar's stderr line that holds and returns 1 when either holds; `build.ts` and `schemas/` untouched. `pnpm test` 486 passed, `pnpm check` 17 entries, 0 problems.
- 2026-10-26: T3 done: the AC4 phrase is in the cli.ts comment (rewrapped onto one line), the build.yml comment, both README paragraphs, both DESIGN entries, and a new CHANGELOG entry; line-joined searches find neither old README sentence; `git diff main...HEAD -- schemas src/build/build.ts` is empty. README line 68's "validate" is an older style-hook hit, left alone as outside this change. `pnpm test` 486 passed, `pnpm check` clean, cairn_validate passed.
- 2026-10-26: claim audit: 20 claims read, 2 corrected — CHANGELOG.md (the "before" sentence stated a risk as past fact, said "no plugin data" where records keep their ids, and contrasted "named" with build-level failures; "whatever its name" became "build-level or not"). The reader also noted that the 2-of-3 test's exit 1 no longer separates the two bars; the AC3 test covers the build-level bar alone.
- 2026-10-26: T1-T3 done, verify clean; status set to review. T4 runs after the merge.
- 2026-10-26: step-7 approval: m018-every-record-fails approved for merge

## Decisions
<!-- owner: implement / review · append-only; milestone-local; promote
     cross-cutting ones to cairn/DECISIONS.md.
     EXEMPT from the 150-line cap (D-074) because D-045 makes it history like the work log — dated dispositions, never edited — so the cap must never demand a trim here either.
     Entries carry their rationale; the counterweight `decisions format`
     advisory watches for pasted output, not for entry length (D-075). -->

## Review
<!-- owner: review · exclusive; evidence per criterion, consistency-gate
     results, review findings + triage. EXEMPT from the 150-line cap (M55),
     as are the work log (D-046) and the decisions section (D-074); evidence
     never scrambles plan-owned content. -->

Pass 1, 2026-10-26, on b26d80a; main had not moved since the branch was cut.

- AC1: `pnpm test` 486 passed in 14 files. The test "exits 1 with no warning when every record fails for reasons that are not build-level" passed; it asserts status 1, stderr `all 3 records carry a failure`, the summary `failed with facts-invalid: 1`, `fork: 1`, `github-http-error: 1`, `build-level failures: 0 of 3 records`, and a written file in which every record has a failure.
- AC2: same run; "exits 0 while one record has no failure, though the others fail" passed; it asserts status 0, no stderr `records carry a failure`, and the summary `failed with fork: 2`, `build-level failures: 0 of 3 records`.
- AC3: same run; "exits 1 when 2 of 3 records fail for build-level reasons and one has no failure" passed (status 1, the `more than half` line, no `records carry a failure` line); the 2-of-3 test passed with both stderr lines asserted; "exits 0 and warns when exactly half of the records fail for build-level reasons" passed with status 0.
- AC4: with each file's lines joined and comment marks removed, the phrase `every record carries a failure` occurs once in the `src/build/cli.ts` comment, once in the `build.yml` comment, in README lines 60-65 and in the "Building the data" paragraph at 351-362, and in both DESIGN entries (lines 144-153 and 313-322). Line-joined README searches for `for a reason of its own` and `or fewer carry one, the command exits with status 0.` each found 0. The branch adds one CHANGELOG entry under `## Unreleased`, and it holds the phrase.
- AC5: `git diff --stat main...HEAD -- schemas src/build/build.ts` printed nothing.
- AC6: `pnpm test` 486 passed in 14 files (the run above); `pnpm check` checked 17 entries, 0 problems.
- Record: the AC3 to AC6 ticks landed one edit before their evidence lines, which a chain of failed edits left unwritten; the lines above were written from the same commands' output in the same pass.
- Consistency gate: `cairn_validate.py` all checks passed; no DESIGN principle changed, so `cairn_impact` was skipped; the generic profile's consistency-gate slot names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: both DESIGN entries split the AC4 phrase across a line break, so a line grep finds 4 of 6 places — reject (false: AC4's evidence joined each file's lines, and the criterion asks that the place holds the phrase)
- diff-bug #2: one idea has four phrasings, and README's "of any kind" stands outside the defined term "failure name" — fix now, fixed c3fdb8b (README line 63 now says "whatever its name")
- diff-bug #3: the CHANGELOG entry states a hypothetical site as past fact and makes the bug the thing that deploys — fix now, fixed c3fdb8b (the "Before" sentences reworded)
- diff-bug #4: the 2-of-3 test's name explains its exit 1 by one bar, though both now produce it — fix now, fixed c3fdb8b (name adds "and all 3 fail")
- diff-bug #5: `failed.length === total` holds with 0 records — reject (false: `buildData` refuses an empty tree at build.ts:50, so 0 records never reach the check)
- diff-bug #6: the cli.ts comment wraps one line short — reject (style)
- diff-bug #7: the AC2 test runs the same path as "prints no warning when only a fork fails" — reject (planned change: AC2 names it, and it pins the bar's boundary)
- diff-bug #8: the `summary(...)` assertions in the AC2 and AC3 tests repeat unchanged formatting — reject (false: they confirm which failures the fixture produced, as the failure-identity rule asks)
- diff-bug #9: the AC3 test's `not.toContain("records carry a failure")` passes if the message wording changes — reject (false: the AC1 test pins the wording positively)
- blame-history #1: the every-record bar brings back D-011's never-deploy problem at 100% — reject (planned change: D-012 records the cost)
- blame-history #2: the branch flips the exit 0 that M017 pinned in its test and README — reject (planned change: D-011 named the gap and D-012 covers the reversal)
- blame-history #3: a regression that fails 99 of 100 records still deploys — reject (planned change: the user declined the share bar, D-012)
- blame-history #4: no test pins an all-fork index as exit 1 — reject (false: the bar counts any failure without reading the name, and the AC1 test already mixes three names)
- blame-history #5: the 2-of-3 test no longer isolates the build-level bar — reject (planned change: the AC3 test covers it)
- blame-history #6: D-011 has no pointer to D-012 — reject (false: DECISIONS is append-only, and D-012's heading names D-011, which the back-reference search finds)
- blame-history #7: two README sentences in a row end "the build also deploys nothing" — reject (style)
- prior-review #1: the M017 review's HTTP 200 with an HTML body and 403 from the release-asset host stay unmarked as build-level, so a partial regression still deploys — follow-up (candidate row "Withhold deploys when all reads fail" narrowed at hygiene to these cases)
- prior-review #2: a partial degradation at half or fewer still deploys with no warning — follow-up (already held by row "Warn when the daily build degrades")
- prior-review #3: the CHANGELOG sentence on the site's past state is unverified — fix now, fixed c3fdb8b (merged with diff-bug #3; a failed record has no `upstream` block, build.ts:139-148)
- prior-review #4: DESIGN line length and the repeated README sentence — reject (style)
- ripple #1: CHANGELOG.md:129 says `pnpm build` counts only build-level failures toward its exit-1 rule, now false — fix now, fixed c3fdb8b (now "its more-than-half exit-1 rule")
- ripple #2: the M018 candidate row in ROADMAP still lists the all-records bar as open — reject (planned change: hygiene graduates the row)
- ripple #3: README "Otherwise, the command exits with status 0" overstates, since other failures exit 1 — fix now, fixed c3fdb8b (now "In every other build that writes the file")
