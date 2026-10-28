<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M036: Reword the empty languages line

- **Status:** in-progress   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** normal   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** —   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** —   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** user-facing — the plugin pages, the published `languages` data, and both published schemas change   <!-- owner: plan · create/amend-via-gate; user-facing | internal — <one-clause reason>; skill conduct only — no validate check parses it -->
- **Branch/PR:** m036-empty-languages-line   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

## Goal
<!-- owner: plan · create; a wrong goal returns to plan, never edited in place -->

A plugin page with an empty languages list says that the index found no
translations, and the languages data and schemas leave out the codes `zxx`
and `mul`, which name no one interface language.

## Scope
<!-- owner: plan · create/amend-via-gate -->

**In:**
- The empty case of `languagesText` in `site/src/data.ts:43` reads
  `Unknown (no translations found)` in place of `None declared`.
- `LANGUAGE_TAG` in `src/upstream/reader.ts` refuses a language subtag of
  `zxx` or `mul` in any letter case, as it refuses `und` (D-018). So the
  locale walk skips such a folder at its `WHOLE_TAG` test, before counting.
  The `languages` patterns of `schemas/plugins.v1.schema.json` and
  `schemas/index.v1.schema.json` copy the new pattern, so `pnpm check`
  refuses a `languages` override that holds such a tag.
- README.md, cairn/DESIGN.md, and the CHANGELOG.md Unreleased languages
  entry describe both changes.

**Out:**
- "Label cut reads on plugin pages" and the other locale rows ("Tighten the
  locale message counts", "Read UTF-16 locale files as text") stay
  candidate rows.
- A text for a record with no `languages` field apart from the empty list:
  every read since M023 sets the field, so such a record shows the same
  text. No row, since no build writes such a record.

## Acceptance criteria
<!-- owner: plan · create/amend-via-gate; review reads, never reinterprets. -->

- [ ] AC1: A plugin page whose upstream `languages` list is empty, with no
      `languages` override that applies, shows
      `Unknown (no translations found)` in its `data-fact="languages"` span.
      `test/site.test.ts` asserts this text for such a record.
- [ ] AC2: No file that `git ls-files` lists outside `cairn/`, and not
      `cairn/DESIGN.md`, holds `None declared` once its lines are joined.
      The command for each file is
      `tr '\n' ' ' < <file> | sed 's/  */ /g' | grep -c 'None declared'`.
- [ ] AC3: `localeLanguages` skips a locale folder whose canonical language
      subtag is `zxx` or `mul` before any of its files adds to a count or
      keeps a tag. So such a folder never sets the largest count. A test in
      `test/upstream.test.ts` reads an XPI with `locale/en-US/a.ftl` and with
      `locale/zxx/a.ftl`, `locale/ZXX/b.properties`, `chrome/locale/mul/a.ftl`,
      `locale/Mul_Latn/a.ftl`, `locale/zxx_US/a.ftl`, and `locale/mul/a.json`.
      Each of these `.ftl` and `.properties` files holds more than twice as
      many messages as `locale/en-US/a.ftl`. The test gets `["en-US"]`.
- [ ] AC4: `LANGUAGE_TAG` matches no whole tag whose language subtag is `zxx`
      or `mul` in any letter case. A test in `test/upstream.test.ts` finds
      that the whole-tag pattern refuses `zxx`, `ZXX`, `mul`, `Mul-Latn`, and
      `zxx-US`, and matches `mus`, `zh`, and `en-US`. The `languages`
      patterns of both schemas equal their copies of the new pattern, as the
      copy test at `test/upstream.test.ts:344` checks.
- [ ] AC5: `pnpm check` refuses a `languages` override whose value holds a
      `zxx` or `mul` tag. `test/check.test.ts` asserts an `index-schema`
      finding at `/overrides/0/value` for the values `zxx` and `en-US, MUL`.
- [ ] AC6: The README.md paragraph on the tags the list leaves out, the
      cairn/DESIGN.md locale-walk paragraph, and the CHANGELOG.md languages
      entry each say that the list leaves out `zxx` and `mul`. The README.md
      and CHANGELOG.md texts on overrides say that a `languages` override
      cannot hold them. The README.md plugin-page paragraph, the
      cairn/DESIGN.md plugin-page paragraph, and the CHANGELOG.md languages
      entry each give the empty line's text as
      `Unknown (no translations found)`.

## Coverage
<!-- owner: plan · create/amend-via-gate -->

- AC1 → T1
- AC2 → T1, T4
- AC3 → T2
- AC4 → T2
- AC5 → T3
- AC6 → T4

## Tasks
<!-- owner: plan (create) / implement (check-off, minor edits) -->

- [x] T1: Change the two empty-case rows at `test/site.test.ts:303-304` to
      the new text and see them fail. Change `languagesText` and its
      comment at `site/src/data.ts:42-45`, then see them pass.
- [x] T2: Add the AC3 and AC4 cases to `test/upstream.test.ts` and see them
      fail on the current reader. Extend the `und` lookahead in
      `LANGUAGE_TAG` (`src/upstream/reader.ts:520-524`) to `zxx` and `mul`,
      copy the pattern into both schemas, and update the comments on
      `LANGUAGE_TAG` and `localeLanguages`. See the new cases and the copy
      test pass.
- [x] T3: Add `zxx` and `en-US, MUL` to the refused values at
      `test/check.test.ts:205`. They pass once T2 lands, so first see them
      fail on a copy of the old schema (lesson M010: copy, then restore).
- [x] T4: Update README.md, cairn/DESIGN.md (plugin-page paragraph near
      line 46, locale walk near line 329), and the CHANGELOG.md Unreleased
      languages entry near line 174. Run the AC2 sweep.
- [x] T5: Run `pnpm test` and `pnpm check`. Build the site from the
      deployed `v1/plugins.json` and read the pages of
      `mktero@tenglvjun.github.io` and `zotero-except@local` in the browser
      pane.

## Work log
<!-- owner: any skill · append-only; one line per entry; absolute dates. -->

- 2026-10-28: created by /milestone-plan.
- 2026-10-28: tier check: milestone — it changes site text, the published languages data, and both schemas, and no documented behavior is restored.
- 2026-10-28: idea vet: (1) the row's wording "no locale folders were found" is false for a plugin whose folders exist but are dropped; the set chose "Unknown (no translations found)"; (2) no listed plugin ships a zxx or mul folder today, so that change only guards future data; the set chose to build it in the reader and the schemas.
- 2026-10-28: lessons used: 2026-10-25 (M001), 2026-10-26 (M010), 2026-10-26 (M015), 2026-10-26 (M018), 2026-10-27 (M027), 2026-10-28 (M035).
- 2026-10-28: collision check: absorbs candidate rows "Reword the empty languages line" (M033 review) and "Drop zxx and mul from the languages" (M025 review); no D-entry rejects either; D-006 and D-007 bear on the schema change, and D-018 records it.
- 2026-10-28: inbox sweep: 0 open issues; 1 open bot pull request (#57, a plugin addition) with no overlap.
- 2026-10-28: criteria audit (full mode, Opus reader): 5 findings, all fixed. AC3 now requires the skip before any count, with fixture files over twice en-US's count. AC3's probes now vary case, script, region, prefix, and file type. AC2 now states a fact about the files, not the sweep. The page text moved to DESIGN.md's plugin-page paragraph. AC1 is narrowed to the empty-list record.
- 2026-10-28: re-audit: AC4 and AC5 were added and AC6 widened after the set chose the schema change; the plan checked them for bounded promises (AC4 names its probes, AC5 its two values) and instrument binding (none).
- 2026-10-28: plan gate chose "Unknown (no translations found)" over "None found" because "None found" can still read as "no menus"; falsified by visitor reports that read "Unknown" as a fault of the index.
- 2026-10-28: plan gate chose to refuse zxx and mul in the reader and both schemas over the reader alone, at the user's choice, so that overrides and data agree; falsified by a plugin author who means a mul folder as a real language list.
- 2026-10-28: plan chose the `LANGUAGE_TAG` lookahead over a separate test in `localeLanguages` because the schemas copy that pattern, so one rule serves the reader and the schemas; falsified by a need to let overrides hold codes the reader skips.
- 2026-10-28: question set: neighbor rows — the user named "Drop zxx and mul from the languages" as the one neighbor; "Label cut reads on plugin pages" stays a candidate row.
- 2026-10-28: implement started; branch m036-empty-languages-line cut from main at 7025717.
- 2026-10-28: T1 done: the two empty-case rows failed with "None declared", then passed after `languagesText` changed; pnpm test 855 passed, 1 skipped; pnpm check 0 problems.
- 2026-10-28: T2 done: on the old reader the AC3 case got [mul, mul-Latn, zxx, zxx-US], so the zxx and mul counts pushed en-US out, and the pattern test failed on zxx; the `und` lookahead now also refuses zxx and mul, copied into both schemas by a string replace (5 sites); pnpm test 858 passed, 1 skipped; pnpm check 0 problems.
- 2026-10-28: T3 done: with main's index schema copied in, the `zxx` and `en-US, MUL` cases failed; with the new schema restored from a copy they passed; pnpm test 860 passed, 1 skipped; pnpm check 0 problems.
- 2026-10-28: T4 done: README.md, CHANGELOG.md, and cairn/DESIGN.md name zxx and mul and the new empty text; README and CHANGELOG also say an override cannot hold und, zxx, or mul; AC2 sweep read 171 files with 0 hits, and finds 1 hit in main's README.md; pnpm test 860 passed, 1 skipped; pnpm check 0 problems.
- 2026-10-28: left 3 simple-english lint hits in README.md (lines 99, 438) and CHANGELOG.md (line 172) as they are, since this milestone does not touch those lines.
- 2026-10-28: T5 done: pnpm test 860 passed, 1 skipped; pnpm check 0 problems; the site built from the deployed v1/plugins.json gives "Unknown (no translations found)" on exactly the pages of mktero@tenglvjun.github.io and zotero-except@local, and the browser pane showed it on zotero-except@local's page.

## Decisions
<!-- owner: implement / review · append-only; milestone-local -->

## Review
<!-- owner: review · exclusive -->
