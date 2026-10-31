<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M068: Warn when the Zotero release lists fall behind

- **Status:** review   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** normal   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** —   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** —   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** internal — the warnings go only to the maintainer's build log, and the data and site do not change
- **Branch/PR:** m068-release-list-warnings   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

## Goal
<!-- owner: plan · create; a wrong goal returns to plan, never edited in place -->

The daily build warns the maintainer when Zotero ships a major or an earlier major's release that the hand-kept lists in `src/site/version.ts` do not hold.

## Scope
<!-- owner: plan · create/amend-via-gate -->

**In:** a `::warning::` line when the current release's major is not the last entry of `ZOTERO_MAJORS`. A
daily read of the changelog page of each `LAST_RELEASES` major, with a `::warning::` line when the page names a
newer release, and one when the read fails. A test that fails when the two lists disagree. The docs for these
warnings. The candidate row "Keep the Zotero release lists current" in full.

**Out:** writing the earlier majors' newest releases into the data, so that the marks change with no edit (the
user chose warnings at the 2026-10-31 question set, D-040). Failing the run or opening an issue on a warning
(not asked; a warning never withholds a deploy, D-036). Editing the lists when Zotero ships a release: that
stays a hand edit, which the warning names.

## Acceptance criteria
<!-- owner: plan · create/amend-via-gate; review reads, never reinterprets.
     Every item opens with its positional label — `ACn:` — the item's
     position counted top-to-bottom, the number Coverage cites; an
     insertion, removal, or reorder renumbers the labels and the Coverage
     lines together. -->

- [ ] AC1: On a release answer of 11.0.0, `pnpm build` prints one `::warning::` line that names 11.0.0 and 10,
      the last entry of `ZOTERO_MAJORS` in `src/site/version.ts`; on a release answer of 10.0.7 it prints no
      such line.
- [ ] AC2: `pnpm build` reads `https://www.zotero.org/support/7.0_changelog`, `8.0_changelog`, and
      `9.0_changelog`, one for each key of `LAST_RELEASES`, with no token, and cuts each read at
      `ZOTERO_RELEASE_LIMIT_MS`. On pages that hold the heading markup of those pages as saved on 2026-10-30
      (first headings 7.0.32, 8.0.5, and 9.0.6), it prints no changelog `::warning::` line; on a 9.0 page whose
      first heading is 9.0.7, it prints one `::warning::` line naming 9, 9.0.7, and 9.0.6.
- [ ] AC3: Each of these 9.0 changelog read outcomes prints one `::warning::` line naming 9 and the cause: a
      non-2xx answer, a request that throws, a body read that fails, a read cut by the time limit, and a page
      with no "Changes in 9." heading. In each of these cases, and in the warning cases of AC1 and AC2, the
      exit code and the written `v1/plugins.json` equal those of a build whose only change is the non-warning
      answer (release 10.0.7, a 9.0 page headed 9.0.6), apart from `generatedAt`, and in AC1's case apart from
      `zoteroRelease`.
- [ ] AC4: `pnpm test` fails when a major in `ZOTERO_MAJORS` other than the last has no `LAST_RELEASES` entry,
      when `LAST_RELEASES` has a key not in `ZOTERO_MAJORS`, or when it has a key equal to the last entry of
      `ZOTERO_MAJORS`.
- [ ] AC5: README's "Building the data" section and the Unreleased section of `CHANGELOG.md` state which
      changelog pages the build reads, the warnings of AC1 to AC3, and that those warnings change neither the
      exit code nor the data.

## Coverage
<!-- owner: plan · create/amend-via-gate; each acceptance criterion → the
     task(s) satisfying it, by positional number (AC/Task counted
     top-to-bottom). Review reads to fence evidence — tracking-rules "AC fencing". -->

- AC1 → T1, T2
- AC2 → T1, T2
- AC3 → T1, T2
- AC4 → T1
- AC5 → T3

## Tasks
<!-- owner: plan (create) / implement (check-off, minor edits); substantive
     change is amend-via-gate. Every item opens with its positional label —
     `Tn:` — the item's position counted top-to-bottom, the number Coverage
     cites; an insertion, removal, or reorder renumbers the labels and the
     Coverage lines together. -->

- [x] T1: Tests first. In `test/build.test.ts`, add changelog answers to `responses()` (near line 48) that keep
      the first two `<h2 id=…>Changes in …` headings of each page in `cairn/references/sources/`, so every
      existing build test reads them quietly. Add `loggedBuild` cases for AC1, AC2, and each AC3 outcome, each
      comparing exit code and data with the non-warning build. Cut the read by time as the M030 lesson says. In
      `test/version.test.ts`, add the AC4 test, and plant each of its three defects in a copy of
      `src/site/version.ts` (the M010 lesson) to see it fail.
- [x] T2: In `src/build/zotero-release.ts`, add a changelog read that takes the first "Changes in N." release
      of the page, awaiting the body before the parse (the M062 lesson). In `src/build/build.ts` (near line
      219), run the changelog reads at the same time as the release read, so all of them end within the one
      limit, and return the warnings. In `src/build/cli.ts`, print each as one `::warning::` line before the
      writes, beside the release warning, and leave the exit code and data as they are.
- [x] T3: Docs: README "Building the data", the `CHANGELOG.md` Unreleased entry, DESIGN's Architecture line for
      the build, the `LAST_RELEASES` comment in `src/site/version.ts`, and the "Traces to" list of
      `cairn/references/zotero-changelogs.md`. Wrap prose near 76 columns (the M036 lesson).
- [x] T4: Run the `verify` slot. Dispatch Build data on the milestone branch with
      `gh workflow run build.yml --ref <branch>`, and log whether its build step printed a changelog warning on
      the live pages.

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

- 2026-10-31: created by /milestone-plan.
- 2026-10-31: tier check: not run — work named at the question set
- 2026-10-31: idea vet: gap — the row's "check against the changelog pages" could warn or set the releases itself; the set chose a warning with a hand edit; gap — a `::warning::` line in a scheduled run reaches the maintainer only when they open the run; reading taken: the same `::warning::` form as M062's release warning, which the row names; no flaw.
- 2026-10-31: question set: work to plan — candidate row "Keep the Zotero release lists current"; patches of earlier majors — warn from the changelog pages, marks change after a hand edit; Build data runs by hand — granted on the milestone branch before review and on main after the merge.
- 2026-10-31: collision check: the candidate row (M062 review) is absorbed in full; M062 (done) shipped `LAST_RELEASES` and this extends it; D-036 keeps the earlier majors hand-kept, which this plan keeps, and D-040 annotates it; inbox sweep: 0 open issues, 19 open bot pull requests, none overlapping.
- 2026-10-31: plan gate chose warnings from the changelog pages over writing each earlier major's newest release into the data, because the user chose it and it keeps D-036's data shape; falsified by a warning that sits unread while the marks of a stale list stay wrong for a week or more.
- 2026-10-31: criteria audit (reduced): 8 findings, all taken: AC1 and AC2 state behavior on named answers, not the test file; AC2 names all three pages; AC3's failure cases narrowed to the 9.0 page and its baseline defined, apart from `zoteroRelease` in AC1's case; AC4's plant step moved to T1; the live-run criterion moved to T4 and replaced by AC2's saved-markup case.
- 2026-10-31: changelog: one Unreleased entry, since `CHANGELOG.md` records `pnpm build` behavior.
- 2026-10-31: lessons used: 2026-10-25 (M001), 2026-10-26 (M010), 2026-10-27 (M030), 2026-10-28 (M036), 2026-10-30 (M062), 2026-10-31 (M066, merge deploys nothing).
- 2026-10-31: implement started; branch m068-release-list-warnings cut from main at 876ab62.
- 2026-10-31: T1 done: changelog fixtures built from the saved heading markup in `responses()`; two spawned `pnpm build` cases (quiet pages; 11.0.0 + a 9.0.7 page + a 500 on 8.0 together) and in-process cases for each AC3 outcome, the newer page, and 11.0.0; the AC4 test in `test/version.test.ts` failed on each of the three planted list defects (8 missing, key 6, key 10) and passed restored.
- 2026-10-31: T2 done: `changelogUrl`, `readChangelogRelease`, `releaseListWarnings`, and the shared `ReleaseRead` type in `src/build/zotero-release.ts`; `buildData` runs the reads with `Promise.all` under `releaseMs` and returns `releaseWarnings`; the CLI prints each as `::warning::`. Planting no CLI print and no newer-release compare each turned one new test red. `pnpm test` 1637 passed.
- 2026-10-31: implementation choice: the time-cut case uses a real 1000 ms limit, as the release cases do, not the M030 `performance.now` spy, since `withinLimit` cuts by a timer and the release tests already use that form.
- 2026-10-31: T3 done: README "Building the data" (time-limit sentence and a new paragraph with the three warning cases), one CHANGELOG Unreleased entry, DESIGN's build line, the `LAST_RELEASES` comment, and the source note's "Traces to"; no added line over 80 columns. The simple-english hook flagged only lines older than this branch in README, CHANGELOG, and the source note, which stay as they are. `pnpm test` 1637 passed; `pnpm check` 0 problems.
- 2026-10-31: T4 done: Build data run 41205738969 on the branch at 5e67246; its build job passed and printed no `::warning::` line (272 records, 0 build-level), so the live 7.0, 8.0, and 9.0 changelog reads did not fail and named no release newer than the lists; the start-test jobs were still running and are not changed by this branch.
- 2026-10-31: claim audit: not owed — internal tier
- 2026-10-31: implement done; status review.

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
