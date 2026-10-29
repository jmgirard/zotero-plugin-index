# M055: Show English descriptions where upstream has them

- **Status:** in-progress
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — it changes the published data and the text every plugin row and page shows
- **Branch/PR:** m055-english-descriptions

## Goal

Each plugin shows an English description when its XPI, its GitHub repo, or an index override has one.

## Scope

**In:** the reader reads an English `_locales` message before the default
locale's, for the name and the description; the data publishes the GitHub
repo's About text as `upstream.repoDescription`; `shownDescription` picks
between the manifest text and the GitHub text by their CJK share; the
plugin page's Details card shows both texts; English `description`
overrides (D-030, D-031) for the eight entries AC6 names; README,
CHANGELOG, About page, DESIGN, and schema prose.

**Out:** machine translation, which needs a paid service or a model, against
DESIGN's no-paid-service line (no row: not planned); asking authors upstream
to add English text, which is the authors' act; the registry `meta.json`
description, which the site does not show; reading an English description
from README files or Fluent files at build time; overrides for plugins
added after this plan, which follow D-030 case by case.

## Acceptance criteria

- [ ] AC1: For each of a release's manifest `name` and `description` that is
      a `__MSG_<key>__` placeholder, the published `upstream.name` or
      `upstream.description` is the `message` of that key, matched ignoring
      case, from the first of `_locales/en/`, `_locales/en_US/`, and
      `_locales/en_GB/`, in that order, that qualifies: its `messages.json`
      is within the reader's size limits, parses as a JSON object, and holds
      the key with a string `message` whose `trim()` is not empty. An
      English file that the size limits refuse is skipped, not a read
      failure. This holds whatever `default_locale` names, and when it is
      absent. With no folder that qualifies, the value is the default
      locale's message, as before, and undefined with no `default_locale`.
      `test/upstream.test.ts` shows each folder alone; `en` over `en_GB`;
      `en_US` over `en_GB`; fall-through to `en_US` from an `en` that lacks
      the key, is not JSON, is an array, or has a non-string message; a
      blank `en` message, an oversize `en` file, and no English folder
      (default); another key case; no `default_locale` with and without
      `en`; the name from `en`; name and description from two folders.
- [ ] AC2: Each published record whose read succeeds carries
      `upstream.repoDescription`, the GitHub repo response's `description`
      with outer whitespace trimmed, when it is a string whose `trim()` is
      not empty. The field is left out when that `description` is null,
      missing, not a string, or blank. `schemas/plugins.v1.schema.json`
      defines it in the `upstream` definition as an optional string holding
      at least one non-whitespace character, and the schema stays version 1.
      Tests in `test/upstream.test.ts` show present (with outer spaces),
      null, missing, a number, and blank; `test/build.test.ts` validates a
      record with the field and one without against the schema.
- [ ] AC3: `shownDescription` returns an applying `description` override
      when there is one. Otherwise its candidates are `upstream.description`
      (the manifest text) and `upstream.repoDescription` (the GitHub text),
      and it drops each one that is missing, blank, or only repeats the
      shown name (the M015 rule). A text's CJK share is C / (C + W), where C
      counts its characters matching `\p{Script=Han}`, `\p{Script=Hiragana}`,
      `\p{Script=Katakana}`, or `\p{Script=Hangul}` and W counts its maximal
      runs of other `\p{L}` letters; it is 0 when C + W is 0. It returns
      the manifest text when it is left and its share is below 0.5; else
      the GitHub text when it is left and either the manifest text was
      dropped or the GitHub text's share is lower than the manifest
      text's; else the manifest text when it is left; else undefined.
      `test/description.test.ts` shows, as manifest/GitHub: override beside
      both; en/en and en/zh (manifest); zh/en, zh with Latin product
      names/en, ja with kana/en, ko/en, zh/mixed of lower share, name-only/zh
      (GitHub); zh/zh of higher share, equal shares at 0.5 or more,
      zh/name-only, zh/none, digits-only/en (manifest); both name-only
      (undefined).
- [ ] AC4: A plugin page's Details card shows a "Manifest description" fact
      when `upstream.description` is present and a "GitHub description" fact
      when `upstream.repoDescription` is present, each with its text, and
      leaves out each fact whose field is absent. Tests in
      `test/site.test.ts` show a record with both, with each alone, and
      with neither.
- [ ] AC5: README, CHANGELOG, the About page
      (`site/src/pages/about.astro`), `cairn/DESIGN.md` (its description
      text and its Architecture text on the reader), and the `name`,
      `description`, and `repoDescription` prose of
      `schemas/plugins.v1.schema.json` state that an English `_locales`
      message is read before the default locale's for the name and the
      description, and that the shown description is an applying override,
      else the manifest text or the GitHub text by the AC3 rule. DESIGN's
      override rule (Data sources item 3) and the `reason` prose of
      `schemas/index.v1.schema.json` state the D-030 and D-031 case. README
      and CHANGELOG also say that a saved copy of the v1 schema must be
      fetched again (D-007).
- [ ] AC6: Each of these eight entries, which the plan found still showing
      no description or one with a CJK share of 0.5 or more under the AC1
      to AC3 rules, from the deployed data and the GitHub repo texts read
      on 2026-10-29 with overrides left out: `ai4paper-v2@cpc.dev`,
      `bibtex-clean@ouyangjiahong.github.io`, `jasminum@linxzh.com`,
      `papermind-connector@papermind.local`, `papilot@dev.local`,
      `zotero-ocr@bib.uni-mannheim.de`, `zoterogpt-sidebar@workbuddy.local`,
      and `zoterostyle@polygon.org`, carries in `plugins/<id>/index.json` a
      `description` override with no `version`, whose `value` has a CJK
      share of 0 and holds at least one Latin letter, and whose `reason`
      names the upstream file or section the text was drawn from and says
      that the upstream has no English description or only one that
      repeats the name. Whether each `value` is English that says what the
      plugin does is judged by the user at the merge question. `pnpm check`
      passes.
- [ ] AC7: The `verify` slot is clean: `pnpm test` and `pnpm check`.

## Coverage

- AC1 → T1
- AC2 → T2
- AC3 → T3
- AC4 → T4
- AC5 → T5
- AC6 → T6
- AC7 → T7

## Tasks

- [x] T1: In `src/upstream/reader.ts`, read `_locales/en/`, `en_US/`, and
      `en_GB/` `messages.json` beside the default locale's (`readManifest`
      near line 560), skipping a file the size limits refuse, and resolve
      `name` and `description` through the first qualifying English folder
      before the default (`localized`, line 302). Tests per AC1.
- [x] T2: Add `repoDescription` to `UpstreamFacts` and the facts built from
      `meta` (reader.ts line 205); add it to the `upstream` definition of
      `schemas/plugins.v1.schema.json`. Tests per AC2.
- [x] T3: Rewrite `shownDescription` in `src/site/description.ts` with a
      `cjkShare` helper and the AC3 order; tests in
      `test/description.test.ts`.
- [x] T4: Add the two Details facts to `site/src/pages/plugins/[id]/index.astro`;
      tests in `test/site.test.ts`.
- [x] T5: Update README, CHANGELOG, `site/src/pages/about.astro`,
      `cairn/DESIGN.md` (lines ~46-49, ~106-108, ~172, and the reader's
      Architecture text), and the two schemas' prose per AC5.
- [x] T6: For each AC6 entry, read its README (English file or section
      first), write a one- or two-sentence English `description` override
      with its reason, and run `pnpm check`.
- [ ] T7: Run the `verify` slot.

## Work log

- 2026-10-29: created by /milestone-plan.
- 2026-10-29: tier check: milestone — new data field, new selection rule, and a design decision on translation overrides.
- 2026-10-29: idea vet: gap — the request assumes an English description exists upstream wherever menus are in English; 1 of 10 Chinese entries ships one in its XPI, so the plan reads the GitHub About text as a second source and asked the user (answered: both sources); flaw — a translation is not a correction under DESIGN's override rule; set answer: write the overrides under a new D-entry (D-030).
- 2026-10-29: investigation: deployed data of 2026-10-29 had 56 records, 10 with Chinese descriptions and 7 hidden as name-only; GitHub About text is English or English-led for 4 of the 10 and informative for 5 of the 7; only Doc2X ships `_locales/en/messages.json`.
- 2026-10-29: collision check: M015 (done) shipped the name-only rule, extended here; D-006/D-007 allow the new optional field in v1; no candidate row, planned milestone, or D-entry rejection overlaps.
- 2026-10-29: inbox sweep: 0 open issues; 5 open bot PRs (#103-#107) add plugins and do not overlap; the AC3 rule covers them once merged.
- 2026-10-29: lessons used: 2026-10-28 (M035) build the real site from the deployed data; 2026-10-25 (M001) run pnpm through npx; 2026-10-26 (M018) search joined copies of wrapped prose.
- 2026-10-29: criteria audit (full mode, fresh Opus reader): 10 findings; 1-9 taken (case-insensitive keys, non-blank message, narrowed folder order with fall-through cases, trimmed repo text and fuller cases, D-007 refetch notice, script-property CJK share with 0 for no letters, reverse-direction and Hangul and kana cases, a 0.5 threshold so one Chinese text does not replace another, both texts in Details, share wording in docs); 10 (translation is not a correction) went to the question set.
- 2026-10-29: question set: description source — English locale plus GitHub About text; hand-written English overrides — yes, under a new D-entry; English locale name — use it for the name too (the user's choice over the recommendation, since the site is English).
- 2026-10-29: plan gate chose the GitHub About text as the fallback over hand overrides alone because it needs no upkeep for new plugins; falsified by GitHub texts that, once shown, are mostly off-topic or promotional.
- 2026-10-29: re-audit of AC1 and AC6 after the name answer (full mode, fresh Opus reader): 9 findings, all taken: AC6's list froze to eight named ids, since a list built from `shownDescription` empties once overrides land; the list keeps only successful reads; the value needs a Latin letter and English is judged at the merge question; DESIGN item 3 and the `reason` schema prose join AC5; AC1 gained order, shape, case, size-limit, and no-default cases, a `trim()` blank rule, and skip-on-size; AC1 and AC2 now name behavior with tests as evidence.
- 2026-10-29: computing the AC6 list showed that a per-letter CJK share let AskGPT and BibTeX Clean keep Chinese text, since each Latin letter counted once; AC3 now counts runs of other letters as one unit each, and a mostly-CJK manifest gives way to a GitHub text of lower share; under it 9 of the 17 weak entries get a readable text and 8 need overrides. Not re-audited by a fresh reader.
- 2026-10-29: plan gate chose C / (C + letter runs) over a per-letter share because a Han character is closer to a word than a Latin letter is; falsified by a listed plugin whose shown text is mostly CJK while an English-led candidate exists.
- 2026-10-29: implement started on branch m055-english-descriptions.
- 2026-10-29: T1 done: `localized` reads `en`, `en_US`, `en_GB` messages before the default locale's; `englishMessages` skips a refused, non-JSON, or non-object file; 17 new upstream tests; planted wrong order failed 2 tests and a dropped blank check failed 1.
- 2026-10-29: T2 done: `repoDescription` in `UpstreamFacts` and the schema (`pattern: "\\S"`); 5 reader cases and 1 schema test; a dropped blank check and a dropped pattern each failed their test. Build tests run through pnpm (M001 lesson).
- 2026-10-29: T3 done: `shownDescription` picks per AC3 with an exported `cjkShare` (regex `v` flag set difference for the other-letter runs); 15 pick cases and 4 share cases; a `<=` tie plant failed 1 test and dropping the 0.5 threshold failed 5.
- 2026-10-29: T4 done: "Manifest description" and "GitHub description" facts open the Details list, before "Archived on GitHub"; site fixture gives first-plugin both texts and old-plugin GitHub text only; a hidden GitHub fact failed 4 site tests.
- 2026-10-29: T5 done: README (description rule, override case, English-file size line), CHANGELOG entry with the refetch notice, About page "Descriptions" section plus an override sentence (2 site tests), DESIGN (description text, item 3, reader Architecture, `cjkShare`), and the prose of both schemas; full `pnpm test` 1227 passed, 6 skipped.
- 2026-10-29: T6 done: eight `description` overrides with no `version`; Jasminum and Papilot copied from their English READMEs (`doc/README-en.md`, `README.en.md`), Zotero OCR drawn from its English README, five translated from Chinese READMEs; a script found each value at CJK share 0 with a Latin letter and each reason saying the upstream has no English description; `pnpm check` 58 entries, 0 problems.
- 2026-10-29: T7: `pnpm test` 1227 passed, 6 skipped; `pnpm check` 58 entries, 0 problems. A live `pnpm build` into the scratchpad read 58 records, 0 failed, all 58 with `repoDescription`; under `shownDescription` none shows no description or one of CJK share 0.5 or more (8 overrides, 9 GitHub texts, Doc2X from its English locale). The site built from it showed Doc2X as "doc2x-ai-translate" with both Details texts, and four pages had no sideways scroll at 375 px.
