# M053: Show the home list as a table

- **Status:** planned
- **Priority:** normal
- **Depends on:** M052
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the public home page and the look of every page
- **Branch/PR:** —

## Goal

The home page lists the plugins in one table, in a new site look that
replaces the card look of M048 and M049.

## Scope

**In:** the look of `cairn/mockups/redesign-2026-10-29/index.html`,
which the user reviewed and chose at the plan: new color and size
tokens in `site/src/layouts/Base.astro` for both color schemes; a top bar
(site name, "Add a plugin", "Data") and a footer (the not-vetted line, the
build date, the data link) on every page; the home heading and a one-line
intro; a toolbar with a search box, the language menu, the Zotero version
buttons, and a plugin count; the table; a legend under it. Plugin pages
keep their M048 sections and take the new tokens.

**Out:** the plugin page layout, the About page, and the top bar's About
link → M054. The Safari check of the menu → candidate row "Check the
language menu in Safari". Browser tests of the page script → candidate
row "Test the home page script in a browser".

## Acceptance criteria

- [ ] AC1: The home page holds one `<table>` whose `<tbody>` has one row
      per record in the data file, ordered by display name with
      `localeCompare` (base sensitivity). Each row holds a link to the
      plugin page, an "Archived" mark when `upstream.archived` is true,
      the shown description, and one cell per major in `ZOTERO_MAJORS`
      whose support (`all`, `some`, `none`, or none) equals `majorSupport`
      for that record, with visually hidden text naming it. A record with
      `failure` shows "Not read" in place of those cells. A site test
      checks each row of the fixture build against the fixture data.
- [ ] AC2: Each version cell of a record with `startTests` also shows the
      result for that major's tested release (started, or the failure
      kind) with visually hidden text, and shows nothing for an untested
      major. Each row shows its language subtags (up to 3, then "+N"), the
      month and year of `latestReleaseDate`, a source link to the
      `safeHref` repo URL, and a download link to `upstream.xpiUrl` when
      `safeHref` passes it and nothing when the record has none. A site
      test checks these facts per row of the fixture build.
- [ ] AC3: The search box keeps a row shown only when its display name or
      shown description contains the typed text, ignoring case, and
      combines with the language and version filters; the text round-trips
      through `?q=` as the other filters do through theirs. The language
      menu keeps the order of `languageOptions` (most plugins first).
      Unit tests in `test/home-filter.test.ts` cover the match, the
      combination, and `?q=`.
- [ ] AC4: The built home page's HTML shows every row, and holds the
      search box, the menu, the buttons, and the count inside elements
      with `hidden`, so a page read without JavaScript shows every plugin
      and no control. A site test checks the built HTML.
- [ ] AC5: Every built page has the top bar and the footer; the style
      rule test of M049 (sizes from tokens) passes on the new
      `Base.astro`; each CSS rule that sets a text color and a background
      passes 4.5:1 in both color schemes by the existing color test.
- [ ] AC6: In the browser pane, the home page built from the deployed
      data has no horizontal scroll at 375 px and 1280 px wide (the iframe
      width check), and a screenshot at each width is recorded in Review.
- [ ] AC7: README, DESIGN, and CHANGELOG under Unreleased describe the
      table, the search box, and the new look; the verify slot passes.

## Coverage

- AC1 → T1, T3
- AC2 → T3
- AC3 → T2, T4
- AC4 → T3, T4
- AC5 → T1, T5
- AC6 → T6
- AC7 → T7

## Tasks

- [ ] T1: Rewrite the tokens and shared rules in `Base.astro` (palette for
      both schemes, sizes, top bar, footer, buttons, version marks) and
      update the style and color tests in `test/site.test.ts`.
- [ ] T2: Add the search match and `?q=` handling to
      `src/site/home-filter.ts` (`rowShows`, `filterHref`) with unit tests.
- [ ] T3: Rewrite `site/src/pages/index.astro` as the table (row facts,
      version cells with start results, languages, date, links), sorted
      by display name; replace the home tests in `test/site.test.ts`.
- [ ] T4: Wire the search box into the page script beside the menu and
      buttons; keep the controls hidden in the HTML; test the hidden HTML.
- [ ] T5: Check the plugin pages under the new tokens: the M048 sections
      still render and pass the color test.
- [ ] T6: Build from the deployed data (lesson M035), serve it (lesson
      M015), and run the width check and screenshots.
- [ ] T7: Update README, DESIGN, CHANGELOG; run the verify slot.

## Work log

- 2026-10-29: created by /milestone-plan.
- 2026-10-29: tier check: milestone — the request is a site redesign with design choices over more than one sitting.
- 2026-10-29: idea vet: gap — start-test dots inside the declared-range cells could read as one combined verdict; reading taken: separate marks with a legend naming each source; gap — the search box is new beyond the request; the user chose it at the question set; no flaw.
- 2026-10-29: question set: home table parts — search box, start test dots, languages and date columns, link icons; the language menu keeps its order by plugin count.
- 2026-10-29: plan gate chose sorting rows by display name over the data file's entry order because entry ids put names out of reading order (an uppercase id sorts first); falsified by a user report that the order hides plugins.
- 2026-10-29: plan gate chose one table over keeping cards because the user asked for a table after reviewing the card look; falsified by the user rejecting the table at the merge question.
- 2026-10-29: feature series: M053 -> M054
- 2026-10-29: lessons used: 2026-10-25 (M007) script selector grep; 2026-10-26 (M015) serving the built site; 2026-10-27 (M021) Astro line breaks; 2026-10-27 (M024) empty attributes; 2026-10-28 (M035) deployed data for hand checks; 2026-10-28 (M037) block nesting; 2026-10-29 (M048) inline CSS limit; 2026-10-29 (M048) iframe width check.

## Decisions

## Review
