<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M018: Withhold deploys when every record fails

- **Status:** planned   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** normal   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** —   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** —   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** user-facing — it decides whether the public site and data deploy, and it changes when `pnpm build` exits 1   <!-- owner: plan · create/amend-via-gate; user-facing | internal — <one-clause reason>; skill conduct only — no validate check parses it -->
- **Branch/PR:** —   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

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

- [ ] AC1: After `pnpm build` writes the file, it exits 1 when every record
      carries a failure, and it prints the line
      `all <n> records carry a failure` on stderr, where `<n>` is the number
      of records. A test whose 3 records fail with `fork`, with a GitHub API
      404 (`github-http-error`), and with `facts-invalid` shows exit status 1,
      that line with `<n>` = 3, the stdout line
      `build-level failures: 0 of 3 records`, and a written file in which
      every record carries a failure.
- [ ] AC2: The every-record bar does not fire while one record has no
      failure. A test whose 3 records include exactly one with no failure,
      the other two failing with `fork`, shows exit status 0 and no stderr
      line that contains `records carry a failure`.
- [ ] AC3: The build-level bar keeps its rule apart from the new bar. A test
      whose 3 records hold 2 build-level failures and 1 record with no
      failure shows exit status 1, the stderr line that ends in
      `more than half`, and no stderr line that contains
      `records carry a failure`. The existing test with 2 of 3 build-level
      failures, whose 3 records all fail, shows both stderr lines. The
      existing test with 1 of 2 build-level failures still exits 0.
- [ ] AC4: Each of these six places holds the phrase
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
- [ ] AC5: The published data keeps its shape:
      `git diff --stat <default-branch>...HEAD -- schemas src/build/build.ts`
      prints nothing.
- [ ] AC6: `pnpm test` and `pnpm check` pass.

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

- [ ] T1: Write the tests first in `test/build.test.ts`. Change the test
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
- [ ] T2: In `src/build/cli.ts`, count the records that carry a failure.
      Print each bar's stderr line that holds, and return 1 when either bar
      holds. Update the comment above the rule. Leave `src/build/build.ts`
      and `schemas/` as they are.
- [ ] T3: State the second bar with the AC4 phrase in the six places AC4
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
