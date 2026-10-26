<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M014: Read stable releases before prereleases

- **Status:** planned   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** normal   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** —   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** —   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** user-facing — the published v1 data and the plugin pages change   <!-- owner: plan · create/amend-via-gate; user-facing | internal — <one-clause reason>; skill conduct only — no validate check parses it -->
- **Branch/PR:** —   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

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

- [ ] AC1: `readUpstream` reads the manifest of the newest non-draft release
      with an `.xpi` asset whose GitHub `prerelease` value is not `true`.
      "Newest" is by `published_at`. If no such release exists, it reads the
      newest non-draft release with an `.xpi`, as before. `releaseCount` still
      counts every non-draft release with an `.xpi`. Tests in
      `test/upstream.test.ts` use recorded responses. A prerelease published
      after a stable release gives the stable release's version. A list of
      only prereleases gives the newest prerelease's version. A stable release
      and a prerelease with the same `published_at` give the stable release's
      version.
- [ ] AC2: The stable release's read can fail with `no-manifest`,
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
- [ ] AC3: `UpstreamFacts` and the `upstream` block of
      `schemas/plugins.v1.schema.json` gain an optional boolean `prerelease`.
      Its value is the GitHub `prerelease` flag of the release whose manifest
      was read, with `false` for any value other than `true`. So the reader
      writes it on every record, unlike `archived`. `schemaVersion` stays 1.
      Tests in `test/build.test.ts` show `pnpm build` writing `true` for a
      prerelease read and `false` for a stable read. A test shows
      `checkOutput` reporting `/plugins/0/upstream/prerelease` for a
      non-boolean value.
- [ ] AC4: The plugin page labels its release fact `Release read by the
      index` in place of `Latest release with an .xpi`. If the record's
      `prerelease` is `true`, the value ends with ` (prerelease)`. Tests in
      `test/site.test.ts` show `<dt>Release read by the index</dt>` before
      `data-fact="latest-release"`. They show the mark for a prerelease
      record, and no mark for a record with `prerelease: false` or with no
      `prerelease`.
- [ ] AC5: At plan time, `grep -rn -i 'newest release\|latest release\|release
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
- [ ] AC7: The `verify` slot is clean: `pnpm test` and `pnpm check` pass.

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

- [ ] T1: Write the reader tests of AC1 and AC2 in `test/upstream.test.ts`
      first, and see each new one fail. Build the release lists from the
      `test/fixtures/upstream/better-notes.json` responses, which hold a
      stable v3.3.3 and a prerelease. Add recorded XPIs for the second read.
- [ ] T2: Change the release choice in `src/upstream/reader.ts:104-145`. Pick
      the stable release, read it, and on one of the three failure names read
      the newest strictly later release. Keep `releaseCount` over all
      releases with an `.xpi`. Add `prerelease` to `ReleaseJson` and
      `UpstreamFacts`.
- [ ] T3: Add `prerelease` to the `upstream` block of
      `schemas/plugins.v1.schema.json` with a description. Add the
      `test/build.test.ts` tests of AC3, with fixture responses that give one
      prerelease read.
- [ ] T4: Change the label and add the mark in
      `site/src/pages/plugins/[id]/index.astro:62-65`. Add the
      `test/site.test.ts` tests of AC4 and give the site fixture data the
      three `prerelease` cases.
- [ ] T5: Update the five sites of AC5 and add the `CHANGELOG.md` entry.
      Update any bot-text test in `test/propose.test.ts` that quotes the old
      sentence.
- [ ] T6: Run `pnpm test` and `pnpm check` through `npx -y pnpm@12.15.0`.

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
