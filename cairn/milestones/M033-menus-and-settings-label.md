# M033: Label the languages as menus and settings

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — it changes the text that each plugin page and the home page show to site visitors
- **Branch/PR:** m033-menus-and-settings-label

## Goal

A site visitor reads the languages that a plugin page lists as the languages of the plugin's own menus and settings, not of its description.

## Scope

**In:** the label of the languages line on each plugin page, the label of the home page's language menu, the README and CHANGELOG text that names them, and DESIGN's wording.

**Out:** dropping translations that cover little of a plugin's text → M034. The data field name `languages`, the `?language=` query parameter, the "None declared" text, and the language names → unchanged. A note on each page about the description's language → not built; README states it.

## Acceptance criteria

- [ ] AC1: Each plugin page that shows a languages line labels it `Menus and settings in:` in place of `Interface languages:`. The line keeps the same `<span data-fact="languages">` and the same text in it: the language names, or "None declared". In `test/site.test.ts`, a test asserts the new label on a built page. A test also reads every page under the fixture build's `plugins/` directory and finds `Interface languages:` in none of them.
- [ ] AC2: The text of the home page menu's `<label for="language">` reads `Menus and settings in` in place of `Interface language`. In `test/site.test.ts`, the built home page's menu test asserts the new label.
- [ ] AC3: README.md and CHANGELOG.md hold no `Interface language` label. A case-sensitive search of each file, joined into one line with runs of spaces squeezed, finds no match. README's home-menu and plugin-page paragraphs name the label `Menus and settings in`. README's plugin-page paragraph says that the description comes from the plugin's manifest or from an index override, so it can be in another language than the languages line names.
- [ ] AC4: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1, T2
- AC2 → T1, T2
- AC3 → T3
- AC4 → T4

## Tasks

- [x] T1: In `test/site.test.ts`, rewrite the test "labels the interface languages fact" (line 312) for the new label, add the loop over every built plugin page, and change the home menu test's pattern (line 418). See them fail first.
- [x] T2: Change the label in `site/src/pages/plugins/[id]/index.astro:55` and `site/src/pages/index.astro:16`. Read the built pages' text, not only the templates, for the space after the colon (LESSONS M021).
- [x] T3: Update README's home-menu and plugin-page paragraphs (lines 37-59) and the CHANGELOG Unreleased languages entry. Change "interface languages" in DESIGN's facts paragraph and in the comment of `src/site/languages.ts:1` where the text names the label. Search joined copies for each phrase (LESSONS M018).
- [x] T4: Run `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check` (LESSONS M001). Plant the old label from a copy of each template and restore from the copy, and see the T1 tests fail (LESSONS M010).

## Work log

- 2026-10-28: created by /milestone-plan.
- 2026-10-28: tier check: milestone — it changes text the site shows and the README, a change to running code that is not a bug.
- 2026-10-28: idea vet: one concern. The request read the lists as wrong, but a read of 22 of the 30 multi-language plugins' XPIs found 21 with real translations of most strings. The mismatch is that the description is the author's text in one language. Answer: relabel the list (M033) and drop translations under half done (M034).
- 2026-10-28: lessons used: 2026-10-25 (M001), 2026-10-27 (M021), 2026-10-26 (M018), 2026-10-26 (M010).
- 2026-10-28: question set: scope — relabel and drop thin translations, as two milestones. Label — "Menus and settings in". Cut — at least half.
- 2026-10-28: collision: extends done M023 and M024 (the languages line and menu). D-014 covers the menu script and is untouched, since the options are still written at build. Candidate rows on languages ("Drop zxx and mul from the languages", "Drop locale folders that copy another") stay as they are. Inbox: 0 open issues, 1 open bot discovery PR (#57) with no overlap.
- 2026-10-28: plan gate chose the label "Menus and settings in" over "Translated into" and over a note line under the old label, because it names what the list holds for a plugin with English only too; falsified by visitors who still read the list as the description's language.
- 2026-10-28: criteria audit (full): AC1 now reads every built plugin page for the old label, not one page; AC3 states the label's absence as the promise and the joined search as its check, and names both README paragraphs. AC2 and AC4 had no finding.
- 2026-10-28: criteria re-audit (full) on the final wording: no finding.
- 2026-10-28: implement started on branch m033-menus-and-settings-label, cut from main at 0b34819.
- 2026-10-28: T1, T2 done: the label test, a loop over all 8 built plugin pages, and the menu test failed on the old labels, then passed with both templates changed (61 site tests).
- 2026-10-28: T3 done: README's two paragraphs, the CHANGELOG languages entry, and DESIGN's facts paragraph name "Menus and settings in" and say the description is the author's text; joined search finds 0 "Interface language" in README.md and CHANGELOG.md. The comment in `src/site/languages.ts:1` names the data, not the label, so it stays.
- 2026-10-28: T4 done: `pnpm test` 839 passed, 1 skipped; `pnpm check` 37 entries, 0 problems. Planting both old labels from copies failed the 3 label tests; restored from the copies. A site built from the published data of 2026-10-28 showed the new line on ZotMoov's page and the new menu label in the browser pane.
- 2026-10-28: substantive amendment: AC3's last sentence changed from "says that the description is the author's own text and can be in another language than the menus" to "says that the description comes from the plugin's manifest or from an index override, so it can be in another language than the languages line names", because `shownDescription` (`src/site/description.ts`) shows a maintainer's `description` override when one applies. Wording only; what the user sees is the same.
- 2026-10-28: re-audit: AC3 (full) — satisfiable, no decision blocks it; suggested also binding CHANGELOG's wording in AC3, declined as a wider promise; T3 fixes CHANGELOG and DESIGN instead.
- 2026-10-28: T3 reopened as a minor amendment: the claim audit's findings rewrite README's menu, filter, line, and description sentences, CHANGELOG's line and description sentences, and DESIGN's description clause. Joined searches find 0 "Interface language" and 0 "author's own text" in README.md, CHANGELOG.md, and DESIGN.md.
- 2026-10-28: follow-up for review hygiene: an empty list shows "Menus and settings in: None declared", which can read as "no menus" for a plugin whose text is in its code; reword that empty case. Owed as a candidate row; ROADMAP is at its 59-line cap.
- 2026-10-28: claim audit: 16 claims read, 4 corrected — README.md, CHANGELOG.md (description source, what the line names, what the menu lists, what the filter keeps; the re-read found all four fixed and one long line, rewrapped).
- 2026-10-28: implement done; status review.

## Decisions

## Review
