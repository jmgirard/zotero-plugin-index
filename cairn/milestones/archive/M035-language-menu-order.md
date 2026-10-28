# M035: Sort the language menu by count

**Status:** done (2026-10-28, PR #62 https://github.com/jmgirard/zotero-plugin-index/pull/62)

**Goal:** The home page's "Menus and settings in" menu lists the languages that the most plugins ship first.

**Outcome:** `languageOptions` in `src/site/languages.ts` sorts the menu options by the number of rows that carry each subtag, largest first, then by English name in code-unit order (it was code-unit order of the option text, set by M024); "All languages" stays a fixed first option. The `languageOptions` test uses records where a text sort and a count-only sort each give another order. The site fixture's first-plugin gained `es`, so the home page menu test expects Chinese (2), Spanish (2), then the 1-plugin languages. README, the Unreleased CHANGELOG menu entry, and DESIGN state the order.

**Decisions:** none. The plan chose code-unit name order over `Intl.Collator("en")`, and editing M024's Unreleased CHANGELOG entry over a new one (work log).

**Review:** All 4 criteria verified; fresh plants of the old and a count-only sort failed the tests. Claim audit at implement: 9 claims, 0 corrected. Four-lens review: 11 findings; 4 fixed in `f381d05` (rewrapped README and CHANGELOG paragraphs, DESIGN states the order); 7 rejected (3 planned code-unit tie-break behavior, 4 reporting no defect). CI green; squash-merged as `6ee7cb9`. Lessons: 5 marked used M035; 1 captured (build the site from the deployed data file for a hand check); 2026-10-26 (M010, used M022) on Ruby's YAML 1.1 `on:` key evicted by rank. Plan: M032's done row pruned from ROADMAP for the line cap.
