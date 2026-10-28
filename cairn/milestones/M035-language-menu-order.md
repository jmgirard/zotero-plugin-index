# M035: Sort the language menu by count

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — site visitors see the home page menu's order
- **Branch/PR:** m035-language-menu-order

## Goal

The home page's "Menus and settings in" menu lists the languages that the most plugins ship first.

## Scope

**In:** `languageOptions` in `src/site/languages.ts` sorts its options by the
number of plugins, largest first, and options with the same number by
language name in code-unit order; its comment, its unit test, the site
fixture and home page menu test, and the README and CHANGELOG text on the
menu say so.

**Out:** the "All languages" option, which stays first and is not sorted;
the order of `data-languages` on rows and of the "Menus and settings in"
line on plugin pages, which stay as they are; the menu script's paint
timing and a browser test of it, which stay the candidate rows "Filter the
home list before it paints" and "Test the home page script in a browser".

## Acceptance criteria

- [x] AC1: `languageOptions` in `src/site/languages.ts` returns its options
      sorted by the number of rows that carry each subtag, largest first,
      and options with the same number sorted by language name in code-unit
      order, and its comment states that order. A test in
      `test/language.test.ts` asserts the exact options for records that
      give at least two subtags at each of two counts, where a sort by
      option text alone and a sort by count alone, keeping the order of
      first appearance, each give another order.
- [x] AC2: The home page's menu lists "All languages" first and then the
      options in the AC1 order, as the menu test in `test/site.test.ts`
      asserts with the exact list built from the site fixture.
- [x] AC3: README's paragraph on the "Menus and settings in" menu and the
      CHANGELOG `## Unreleased` entry that describes the menu each say that
      the menu lists the languages with the most plugins first, and
      languages with the same number of plugins by name.
- [x] AC4: `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check` pass.

## Coverage

- AC1 → T1
- AC2 → T2
- AC3 → T3
- AC4 → T4

## Tasks

- [x] T1: Rewrite the `languageOptions` test (`test/language.test.ts:89-98`,
      renaming "sorts by text") for records that meet AC1, and see it fail
      against the current sort. Then change the sort and its comment
      (`src/site/languages.ts:35-44`). The file spawns no pnpm, so
      `./node_modules/.bin/vitest run test/language.test.ts` runs it fast.
- [x] T2: Add languages to the site fixture (`test/fixtures/site/plugins.json`)
      so that at least two languages have 2 plugins and one of them sorts by
      name after a language with 1 plugin (for example a second `es` and a
      second `fr` or `de`). Update the menu test (`test/site.test.ts:423-436`)
      and each other site test the fixture change moves, such as the row
      languages at `test/site.test.ts:412-420`. See the menu test fail
      against the current sort.
- [x] T3: Add the order to README (lines 37-47) and to the CHANGELOG
      Unreleased menu entry (lines 205-209), written against the built page's
      output. Search joined copies of README, CHANGELOG, and DESIGN for other
      text on the menu order and fix any found.
- [x] T4: Run `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check`.
      `check` can fail offline with `registry-schema-unavailable`, so rerun it
      online before calling it red. Build the site from the local
      `dist/v1/plugins.json` with `pnpm site` and read the real menu's order
      in the browser pane.

## Work log

- 2026-10-28: created by /milestone-plan.
- 2026-10-28: tier check: not run — work named at the question set.
- 2026-10-28: idea vet: no concern; the order serves visitors looking for common languages, keyboard type-ahead in a select still jumps by first letter, and "All languages" stays first.
- 2026-10-28: collision check: M024 (done) set the menu's sort by option text; this milestone extends it. No candidate row, planned milestone, or D-entry overlaps; D-014 needs the options written at build time, and they still are.
- 2026-10-28: inbox sweep: 0 open issues; 1 open PR (#57, a discovery bot PR adding a plugin), no overlap.
- 2026-10-28: lessons used: 2026-10-25 (M001), 2026-10-27 (M027) on running vitest without pnpm, 2026-10-26 (M018) on searching wrapped docs, 2026-10-26 (M015) on viewing a built site.
- 2026-10-28: plan gate chose code-unit order for names over `Intl.Collator("en")` because it matches the old sort and `rowLanguages` and gives the same order for English language names; falsified by a listed language whose English name starts with a lowercase or accented letter.
- 2026-10-28: plan gate chose editing M024's Unreleased CHANGELOG entry over a new entry because no release is tagged, so the menu has not shipped in either order; falsified by a tagged release that holds the menu entry.
- 2026-10-28: criteria audit (full mode, fresh Opus reader): 4 findings. AC1 test could pass for a count-only sort — fixed, the test must also beat that sort. AC2 bound the fixture's shape, an instrument — fixed, the fixture shape moved to T2. Stale comment and test name in AC1's files — fixed, AC1 names the comment and T1 the test name. AC4's `check` can fail offline — answered in T4. No IP or D-entry blocks a criterion.
- 2026-10-28: question set: user chose this work in place of the offered candidates; the CI dependency question was answered n/a.
- 2026-10-28: implement started on branch m035-language-menu-order, cut from main at 49783ad.
- 2026-10-28: T1 done: `languageOptions` sorts by count, then name; the new test failed on the old text sort and on a planted count-only sort, and passes with the change; `pnpm test` 855 passed, 1 skipped; `pnpm check` 37 entries, 0 problems.
- 2026-10-28: T2 done: the fixture's first-plugin gained `es`, so Chinese and Spanish have 2 plugins and Spanish sorts after English (1); the menu test expects that list and failed only on the old sort; the row and plugin-page tests follow the fixture; `pnpm test` 855 passed, 1 skipped; `pnpm check` 0 problems.
- 2026-10-28: T3 done: README and the Unreleased CHANGELOG menu entry state the order, matching the T2 menu test's list; joined-copy searches of README, CHANGELOG, DESIGN, and a grep of src, site/src, and test found no other order text; the simple-english hook flagged README lines 100 and 436 and CHANGELOG line 172, which this branch did not write, so they stay.
- 2026-10-28: T4 done: `pnpm test` 855 passed, 1 skipped; `pnpm check` 37 entries, 0 problems. The local `dist/v1/plugins.json` predates the languages field, so the site was built from the deployed `v1/plugins.json` (38 pages); its menu reads All languages, English (35), Chinese (27), Italian (8), German (6), then on to the 44 count-sorted options; the browser pane showed that order, and picking Italian showed 8 rows.
- 2026-10-28: claim audit: 9 claims read, 0 corrected — src/site/languages.ts, test/language.test.ts, test/site.test.ts, README.md, CHANGELOG.md; its optional "After 'All languages'" lead-in was not taken, since README describes that option on its own.
- 2026-10-28: implement complete; status review.

## Decisions

## Review

- AC1 evidence (2026-10-28): `src/site/languages.ts:43` sorts by `b.count - a.count`, then by name with `<`/`>`; the comment at lines 35-37 states that order. `test/language.test.ts` "counts each subtag once per row and sorts by count, then by name" passes (20/20); its records give French and Spanish at 2, Chinese and German at 1. Fresh plants: main's text sort and a count-only sort each fail that test; file restored, `git status` clean.
- AC2 evidence (2026-10-28): the menu test in `test/site.test.ts:423-436` asserts All languages, Chinese (2), Spanish (2), English (1), French (1), German (1), Portuguese (1) on the home page built from the site fixture, and passes in `pnpm test`; with main's sort planted it fails (1 of 61), the only site test to fail.
- AC3 evidence (2026-10-28): README.md:39-41 reads "The languages with the most plugins come first, and languages with the same number of plugins come in order of their names." CHANGELOG.md:207-208, in the Unreleased entry that introduces the menu, reads "The menu lists the languages with the most plugins first, and languages with the same number of plugins by name."
- AC4 evidence (2026-10-28): `npx -y pnpm@12.15.0 test` exit 0, 17 files, 855 passed, 1 skipped; `npx -y pnpm@12.15.0 check` exit 0, 37 entries, 0 problems. (The AC4 box was ticked one edit before this line landed, after a failed edit; this line is the evidence it rests on.)
- consistency gate (2026-10-28): `cairn_validate.py` exit 0, all checks passed; no principle changed, so no `cairn_impact` run; the generic profile names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: the name tie-break is code-unit order, so a subtag `Intl.DisplayNames` cannot name sorts as its lowercase tag after capitalized names, and two subtags with one name keep first-appearance order — reject (planned change: the plan chose code-unit order and recorded this as its falsifier; no deployed name hits it)
- diff-bug #2: README.md:41 and CHANGELOG.md:209 leave short wrapped lines — fix now, fixed f381d05
- diff-bug #3: the renamed "three upstream tags" case follows from the fixture change — reject (false: it reports no defect)
- blame-history #1: the sort replaces M024's text order — reject (planned change)
- blame-history #2: CHANGELOG.md:209 short line after the edit — fix now (same fix as diff-bug #2), fixed f381d05
- blame-history #3: the fixture's new `es` breaks no other fixture user — reject (false: it reports no defect)
- blame-history #4: two subtags with one display name keep first-appearance order — reject (planned change, as diff-bug #1)
- blame-history #5: DESIGN states no old order — reject (false: it reports no defect; prior-review #1 covers the missing new order)
- prior-review #1: DESIGN's menu paragraph (cairn/DESIGN.md:46-48) does not state the new order, though M033's review had DESIGN state the menu's rules — fix now, fixed f381d05
- prior-review #2: README.md:41 and CHANGELOG.md:209 ragged wrap — fix now (same fix as diff-bug #2), fixed f381d05
- fix verify (2026-10-28): after f381d05, `pnpm test` 855 passed, 1 skipped; `pnpm check` 0 problems; the edited README, CHANGELOG, and DESIGN lines are 60 to 75 columns.
- ripple: no ripple evidence
