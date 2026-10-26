<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M014: Read stable releases before prereleases

- **Status:** review   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** normal   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** —   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** —   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** user-facing — the published v1 data and the plugin pages change   <!-- owner: plan · create/amend-via-gate; user-facing | internal — <one-clause reason>; skill conduct only — no validate check parses it -->
- **Branch/PR:** m014-stable-releases-first   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

## Goal
<!-- owner: plan · create; a wrong goal returns to plan, never edited in place -->

If a plugin's newest stable release with an `.xpi` is a Zotero 7+ build, the index reads the plugin's facts from that release.

## Scope
<!-- owner: plan · create/amend-via-gate -->

**In:** The release choice in `readUpstream`. A fallback to a later
prerelease when the stable release is not a Zotero 7+ build. An optional
`prerelease` field in the v1 data. A "(prerelease)" mark and a new label on
the plugin page. The docs, the bot texts, and the changelog that state the
release rule. `pnpm add-plugin` and `pnpm discover` use the same reader, so
they get the new rule with no change of their own.

**Out:** A note of a newer prerelease beside the stable facts. The user chose
stable facts only at the 2026-10-26 question set, and no row holds it. A
"(prerelease)" mark on the home list stays out, and no row holds it either.
Stable-release choice by version number or tag name, for authors who do not
set GitHub's prerelease flag, stays out. The index shows what the author
declares.

## Acceptance criteria
<!-- owner: plan · create/amend-via-gate; review reads, never reinterprets.
     Every item opens with its positional label — `ACn:` — the item's
     position counted top-to-bottom, the number Coverage cites; an
     insertion, removal, or reorder renumbers the labels and the Coverage
     lines together. -->

- [x] AC1: `readUpstream` reads the manifest of the newest non-draft release
      with an `.xpi` asset whose GitHub `prerelease` value is not `true`.
      "Newest" is by `published_at`. If no such release exists, it reads the
      newest non-draft release with an `.xpi`, as before. `releaseCount` still
      counts every non-draft release with an `.xpi`. Tests in
      `test/upstream.test.ts` use recorded responses. A prerelease published
      after a stable release gives the stable release's version. A list of
      only prereleases gives the newest prerelease's version. A stable release
      and a prerelease with the same `published_at` give the stable release's
      version.
- [x] AC2: The stable release's read can fail with `no-manifest`,
      `no-zotero-id`, or `max-version-below-7`. If a release with an `.xpi`
      was published strictly later, `readUpstream` then reads the newest such
      release. It returns that release's facts, or that release's failure if
      its read fails too. With no strictly later release, it returns the
      stable failure. Only these three failure names start the fallback.
      Tests show a fallback to a passing prerelease for each of the three
      names. Tests show the prerelease's failure returned when both reads
      fail, and the stable failure returned when no later release exists.
      Tests show `update-json-http-error` and `manifest-invalid` from the
      stable release returned with no request for the prerelease's XPI.
- [x] AC3: `UpstreamFacts` and the `upstream` block of
      `schemas/plugins.v1.schema.json` gain an optional boolean `prerelease`.
      Its value is the GitHub `prerelease` flag of the release whose manifest
      was read, with `false` for any value other than `true`. So the reader
      writes it on every record, unlike `archived`. `schemaVersion` stays 1.
      Tests in `test/build.test.ts` show `pnpm build` writing `true` for a
      prerelease read and `false` for a stable read. A test shows
      `checkOutput` reporting `/plugins/0/upstream/prerelease` for a
      non-boolean value.
- [x] AC4: The plugin page labels its release fact `Release read by the
      index` in place of `Latest release with an .xpi`. If the record's
      `prerelease` is `true`, the value ends with ` (prerelease)`. Tests in
      `test/site.test.ts` show `<dt>Release read by the index</dt>` before
      `data-fact="latest-release"`. They show the mark for a prerelease
      record, and no mark for a record with `prerelease: false` or with no
      `prerelease`.
- [x] AC5: At plan time, `grep -rn -i 'newest release\|latest release\|release
      with an .xpi\|release that has an\|prerelease'` over README.md,
      CHANGELOG.md, cairn/DESIGN.md, src, site/src, .github, and schemas
      returned seven lines. Apart from the page label of AC4, they are
      README.md:97, CHANGELOG.md:11, cairn/DESIGN.md:71-72,
      src/discover/propose.ts:307, and .github/ISSUE_TEMPLATE/add-plugin.yml:9.
      Each of these sites says that the stable release is read first.
      README.md and cairn/DESIGN.md also state the fallback. `CHANGELOG.md`
      gains an Unreleased entry that states the rule and the new field. The
      entry tells consumers who check data against a saved v1 schema to fetch
      the schema again.
- [ ] AC6: Take the first `build.yml` run after the merge that deploys
      `v1/plugins.json`. A script reads every record of that live file. It
      names each record with a `failure` and checks none of them. For each
      record with an `upstream` block, it finds the GitHub release whose
      `published_at` equals the record's `latestReleaseDate`. The record's
      `prerelease` is `true` exactly when that release's GitHub flag is
      `true`. A mismatch fails this criterion, unless the review shows that
      the flag changed after the file's `generatedAt`. On 2026-10-26,
      zotero-pdf-preview had Zotero 6 stable releases and a Zotero 7
      prerelease, and zotlit had a prerelease newer than its stable release.
      In the live file, zotero-pdf-preview reads a prerelease and zotlit reads
      a stable release, unless a GitHub read at review time shows that their
      releases changed.
- [x] AC7: The `verify` slot is clean: `pnpm test` and `pnpm check` pass.

## Coverage
<!-- owner: plan · create/amend-via-gate; each acceptance criterion → the
     task(s) satisfying it, by positional number (AC/Task counted
     top-to-bottom). Review reads to fence evidence — tracking-rules "AC fencing". -->

- AC1 → T1, T2
- AC2 → T1, T2
- AC3 → T2, T3
- AC4 → T4
- AC5 → T5
- AC6 → T2, T3
- AC7 → T6

## Tasks
<!-- owner: plan (create) / implement (check-off, minor edits); substantive
     change is amend-via-gate. Every item opens with its positional label —
     `Tn:` — the item's position counted top-to-bottom, the number Coverage
     cites; an insertion, removal, or reorder renumbers the labels and the
     Coverage lines together. -->

- [x] T1: Write the reader tests of AC1 and AC2 in `test/upstream.test.ts`
      first, and see each new one fail. Build the release lists from the
      `test/fixtures/upstream/better-notes.json` responses, which hold a
      stable v3.3.3 and a prerelease. Add recorded XPIs for the second read.
- [x] T2: Change the release choice in `src/upstream/reader.ts:104-145`. Pick
      the stable release, read it, and on one of the three failure names read
      the newest strictly later release. Keep `releaseCount` over all
      releases with an `.xpi`. Add `prerelease` to `ReleaseJson` and
      `UpstreamFacts`.
- [x] T3: Add `prerelease` to the `upstream` block of
      `schemas/plugins.v1.schema.json` with a description. Add the
      `test/build.test.ts` tests of AC3, with fixture responses that give one
      prerelease read.
- [x] T4: Change the label and add the mark in
      `site/src/pages/plugins/[id]/index.astro:62-65`. Add the
      `test/site.test.ts` tests of AC4 and give the site fixture data the
      three `prerelease` cases.
- [x] T5: Update the five sites of AC5 and add the `CHANGELOG.md` entry.
      Update any bot-text test in `test/propose.test.ts` that quotes the old
      sentence.
- [x] T6: Run `pnpm test` and `pnpm check` through `npx -y pnpm@12.15.0`.

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

- 2026-10-26: created by /milestone-plan from the candidate row "Read stable releases before prereleases" (M002, M008 reviews).
- 2026-10-26: tier check: milestone — it changes the release rule that DESIGN.md and README.md document, and it adds a data field.
- 2026-10-26: idea vet: one concern. zotero-pdf-preview's stable releases are Zotero 6 builds, so a stable-only rule drops it. The set chose a fallback to a later release. The row's zotmoov example no longer holds, since 1.2.34 is now stable.
- 2026-10-26: question set: whether the review can run build.yml on main after the merge and read the live pages — yes (asked in the first plan run of 2026-10-26).
- 2026-10-26: question set: what to do when the stable release is not a Zotero 7+ build — fall back to the newest later release.
- 2026-10-26: question set: whether to mark prerelease reads in the data and on the page — yes, an optional v1 field under D-006 and D-007.
- 2026-10-26: plan gate chose a fallback on three manifest failures over a stable-only rule because the stable-only rule drops zotero-pdf-preview; falsified by a listed plugin whose fallback read shows facts a stable-release user cannot install.
- 2026-10-26: plan gate chose a `prerelease` field and page mark over no mark because a page can show a beta with nothing saying so; falsified by consumers that break on the new v1 field.
- 2026-10-26: criteria audit (full) returned 11 findings, 10 taken. Goal reworded to match AC1 and AC2. Ties, `releaseCount`, the both-fail case, both build values, `checkOutput`, and the label test added. AC2's other-failure promise narrowed to two tested names. AC5 grep widened and add-plugin.yml:9 added. AC6 now names failure records, the deploying run, and two moved plugins. AC7: no finding.
- 2026-10-26: collision sweep: no D-entry covers prereleases. M002 and M008 shipped the newest-release rule and recorded this row. D-006 and D-007 allow the optional v1 field. Inbox: 0 open issues, and 1 open bot pull request with no overlap.
- 2026-10-26: lessons used: 2026-10-25 (M001, used M013) pnpm via npx; 2026-10-25 (M002, used M011) fixture preload; 2026-10-25 (M002) template prerelease with no .xpi; 2026-10-25 (M006, used M013) Pages deploys from main only; 2026-10-25 (M007, used M013) match the data attribute form.
- 2026-10-26: implement started on m014-stable-releases-first.
- 2026-10-26: T1: 13 new reader tests; 11 failed before T2. The no-later-release cases and the both-fail case passed before T2, since the old rule also read the newest release there.
- 2026-10-26: T2: `readRelease` now holds the manifest and update.json read, so the fallback can run it twice. `UpstreamFacts.prerelease` is optional in the type, to match the schema and older records. The reader always sets it.
- 2026-10-26: T3: example/second-plugin's one release is now a prerelease in the build fixture. T1 to T3 share one commit, since the build tests fail between T2 and T3. `pnpm test` 437 passed; `pnpm check` 17 entries, 0 problems.
- 2026-10-26: T4: the page puts " (prerelease)" after the publish date, so the value ends with it as AC4 says. The site fixture gives old-plugin `prerelease: true` and first-plugin `false`; the GUID record has none. The label test and the old-plugin mark test failed before the page change. `test/site.test.ts` 25 passed after it.
- 2026-10-26: T5: the five AC5 sites now name the stable release first, and README.md and DESIGN.md state the fallback. CHANGELOG.md has a new Unreleased entry. README.md's data section names the `prerelease` field. DESIGN.md's Contract boundary "last release" now reads as the release the index read (corrected M014). No propose test quoted the old bot sentence. README.md:132's "checks" lint hit was there before this branch and stays.
- 2026-10-26: T6: `pnpm test` 441 passed in 12 files; `pnpm check` 17 entries, 0 problems; the issue form parses with Ruby YAML.
- 2026-10-26: claim audit: 44 claims read, 4 corrected — .github/ISSUE_TEMPLATE/add-plugin.yml, src/discover/propose.ts, CHANGELOG.md (twice). The issue form and bot sentence now cover the no-stable case. The changelog names `pnpm discover-issue` and states the fallback as one condition. The re-read found all four true. `pnpm test` 441 passed after the fixes.
- 2026-10-26: implement done; status review.
- 2026-10-26: step-7 approval: m014-stable-releases-first approved for merge

## Decisions
<!-- owner: implement / review · append-only; milestone-local; promote
     cross-cutting ones to cairn/DECISIONS.md.
     EXEMPT from the 150-line cap (D-074) because D-045 makes it history like the work log — dated dispositions, never edited — so the cap must never demand a trim here either.
     Entries carry their rationale; the counterweight `decisions format`
     advisory watches for pasted output, not for entry length (D-075). -->

- 2026-10-26 (review): promoted to D-008. The stable-first rule with its fallback replaces M002's prereleases-included rule, and the moved values of existing v1 fields are not a breaking change.

## Review
<!-- owner: review · exclusive; evidence per criterion, consistency-gate
     results, review findings + triage. EXEMPT from the 150-line cap (M55),
     as are the work log (D-046) and the decisions section (D-074); evidence
     never scrambles plan-owned content. -->

Pass 1, 2026-10-26, on m014-stable-releases-first at 76946a9 plus a CHANGELOG.md re-wrap. `vitest run --reporter=verbose` 441 passed in 12 files; `pnpm test` (tsc, then Vitest) 441 passed.

- AC1: `test/upstream.test.ts` passed "reads the stable release" (version 3.3.3, `prerelease` false, `releaseCount` 3 with the beta counted), "reads the newest prerelease when no release is stable" (3.4.0-beta.1), and "reads the stable release when the prerelease has the same publish date" (3.3.3). The `prerelease` absent and "true"-string cases read as stable.
- AC2: passed "reads the prerelease when the stable release fails with" no-manifest, no-zotero-id, and max-version-below-7 (each 3.4.0-beta.1, `prerelease` true). Passed "returns %s when no release is later than the stable one" for the same three names. Passed "returns the prerelease's failure when both reads fail" (stable no-manifest, prerelease max-version-below-7, result max-version-below-7). Passed update-json-http-error and manifest-invalid "without reading the prerelease" (no request for the beta XPI).
- AC3: `src/upstream/reader.ts:28` declares `prerelease?: boolean`, and `schemas/plugins.v1.schema.json:96` adds the boolean `prerelease` to `upstream`. `schemaVersion` is still `const: 1`. `test/build.test.ts` passed "writes the prerelease value that the reader read" (second-plugin true, better-notes false) and "reports a record whose prerelease value is not a boolean" (`/plugins/0/upstream/prerelease`).
- AC4: `test/site.test.ts` passed "labels the release fact as the release the index read" (`<dt>Release read by the index</dt>` before `data-fact="latest-release"`). It passed the mark test for old-plugin (`prerelease: true`, "0.4.1, published 2024-07-01 (prerelease)"), first-plugin (`false`, no mark), and the GUID record (no field, no mark).
- AC5: the plan's grep, rerun at head, shows README.md:97, CHANGELOG.md:11, cairn/DESIGN.md:72, src/discover/propose.ts:307, and .github/ISSUE_TEMPLATE/add-plugin.yml:9 each naming the newest stable release first. README.md:96-104 and cairn/DESIGN.md:72-79 state the fallback. CHANGELOG.md:94-108 is the new Unreleased entry: the rule, the `prerelease` field, and "fetch any saved copy of it again".
- AC6: waits on the first deploying `build.yml` run after the merge.
- AC7: `pnpm test` 441 passed (tsc clean); `pnpm check` checked 17 entries in plugins, 0 problems.
- gate: `cairn_validate.py` all checks passed. No principle changed, so no impact report. The generic profile names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple.
- diff-bug #1: the strict "later" check had no test, and `>=` would read the stable XPI twice with the same result — fix now, fixed e5d96c4 (a same-date case and a one-XPI-request check; a planted `>=` failed both).
- diff-bug #2: a listed plugin can newly fail when its older stable release fails with a name outside the three — reject, planned change (AC2). A local `pnpm build` against live GitHub on 2026-10-26 wrote 17 records with 0 failures.
- diff-bug #3: when both reads fail, only the prerelease's failure comes back — reject, planned change (AC2).
- diff-bug #4: an invalid `published_at` gives NaN and an undefined sort order — follow-up, row "Order releases with bad dates safely" (pre-existing sort).
- diff-bug #5: the no-later-release check that beta.5 is never requested holds whatever the fallback does — fix now, fixed e5d96c4 (it now asserts the XPI requests are exactly the stable XPI once).
- diff-bug #6: `prerelease` could be required on the reader's return type — reject, style.
- diff-bug #7: the "absent" prerelease case and the three-name no-later loop repeat one code path — fix now, fixed e5d96c4 (one string case, one failure name).
- diff-bug #8: the first-plugin page case repeats the label test's page read — reject, planned change (AC4 names three cases).
- diff-bug #9: the build fixture lost a second stable read — reject, false: better-notes is read from a stable release.
- diff-bug #10: the bot body states the rule, not which release was read — reject, planned change (AC5 asks the site to state the rule).
- diff-bug #11: `latestReleaseDate` can hold an older stable date — reject, planned change (the v1 name stays; its description is accurate).
- blame-history #1: existing v1 fields now describe a different release, and no record says this is not breaking — fix now, fixed e5d96c4 (D-008).
- blame-history #2: DESIGN.md's bar says "at least one release" with a readable update.json, but the reader checks one release — follow-up, row "State the bar for the release read" (pre-existing since M002).
- blame-history #3: M002's "prereleases included" outcome is reversed with no D-entry — fix now, fixed e5d96c4 (D-008).
- blame-history #4: a Zotero 6-only plugin can report the prerelease's failure name — reject, planned change (AC2).
- blame-history #5: `latestReleaseDate` and `data-fact="latest-release"` keep "latest" — reject, planned change (v1 name frozen; the label changed per AC4).
- blame-history #6: the bot sentence and schema description leave out "later" — reject, false: the bot text appears only after a read that passed, and the schema's "only when" states a necessary condition, as the claim audit read.
- blame-history #7: second-plugin now runs the prerelease path in the archived build test — reject, false: that test asserts `archived`, which the release choice does not touch.
- blame-history #8: the fallback adds a second download for affected plugins — reject, planned change (the user chose the fallback; M004 caps hold per download).
- prior-review #1: a second optional field under the strict v1 `upstream` block, as the row "Let old v1 schemas accept new fields" names — reject, planned change (chosen at the gate with that cost stated; CHANGELOG tells consumers to fetch the schema).
- prior-review #2: `addBeta` builds the prerelease XPI in the test, not from a recording — reject, false: it is a recorded-response `xpi` entry, and the tests check release choice, not manifest shape.
- prior-review #3: the fallback adds time to `pnpm build` and `pnpm discover` — reject, planned change (one more download for one listed plugin today).
- prior-review #4: second-plugin is now prerelease-only — reject, false: intended, and its fixture source says so.
- prior-review #5: the bot body grows by about 130 characters — reject, false: the body stays far below GitHub's 65,536-character limit.
- ripple #1: test/upstream.test.ts:127's title states the removed rule — fix now, fixed e5d96c4.
- snapshot: no changed snapshot files.
- verify after fixes: `pnpm test` 439 passed.
