# M035: Sort the language menu by count

- **Status:** planned
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — site visitors see the home page menu's order
- **Branch/PR:** —

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

- [ ] AC1: `languageOptions` in `src/site/languages.ts` returns its options
      sorted by the number of rows that carry each subtag, largest first,
      and options with the same number sorted by language name in code-unit
      order, and its comment states that order. A test in
      `test/language.test.ts` asserts the exact options for records that
      give at least two subtags at each of two counts, where a sort by
      option text alone and a sort by count alone, keeping the order of
      first appearance, each give another order.
- [ ] AC2: The home page's menu lists "All languages" first and then the
      options in the AC1 order, as the menu test in `test/site.test.ts`
      asserts with the exact list built from the site fixture.
- [ ] AC3: README's paragraph on the "Menus and settings in" menu and the
      CHANGELOG `## Unreleased` entry that describes the menu each say that
      the menu lists the languages with the most plugins first, and
      languages with the same number of plugins by name.
- [ ] AC4: `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check` pass.

## Coverage

- AC1 → T1
- AC2 → T2
- AC3 → T3
- AC4 → T4

## Tasks

- [ ] T1: Rewrite the `languageOptions` test (`test/language.test.ts:89-98`,
      renaming "sorts by text") for records that meet AC1, and see it fail
      against the current sort. Then change the sort and its comment
      (`src/site/languages.ts:35-44`). The file spawns no pnpm, so
      `./node_modules/.bin/vitest run test/language.test.ts` runs it fast.
- [ ] T2: Add languages to the site fixture (`test/fixtures/site/plugins.json`)
      so that at least two languages have 2 plugins and one of them sorts by
      name after a language with 1 plugin (for example a second `es` and a
      second `fr` or `de`). Update the menu test (`test/site.test.ts:423-436`)
      and each other site test the fixture change moves, such as the row
      languages at `test/site.test.ts:412-420`. See the menu test fail
      against the current sort.
- [ ] T3: Add the order to README (lines 37-47) and to the CHANGELOG
      Unreleased menu entry (lines 205-209), written against the built page's
      output. Search joined copies of README, CHANGELOG, and DESIGN for other
      text on the menu order and fix any found.
- [ ] T4: Run `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check`.
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

## Decisions

## Review
