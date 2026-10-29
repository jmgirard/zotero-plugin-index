# M053: Show the home list as a table

- **Status:** review
- **Priority:** normal
- **Depends on:** M052
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the public home page and the look of every page
- **Branch/PR:** m053-home-table

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

Terms: the repo URL is `upstream.repoUrl ?? record.repoUrl`, as the
plugin page uses it; a link "passes" when `safeHref` returns it. A
major's start result is the `startTests` item whose `zotero` release has
that major, the newest by `compareVersions` when several do. The site
fixture is `test/fixtures/site/plugins.json`.

- [x] AC1: The home page holds one `<table>` whose `<tbody>` has one row
      per record in the data file, ordered by
      `a.localeCompare(b, "en", { sensitivity: "base" })` on display name,
      ties by `id`. Each row holds a link to the plugin page, an
      "Archived" mark when `upstream.archived` is true, the shown
      description, and one cell per major in `ZOTERO_MAJORS` holding a
      declared mark whose kind is `majorSupport` for that record (`all`,
      `some`, or `none`), or no mark when `majorSupport` is undefined, with
      visually hidden text naming it. A record with `failure` holds "Not
      read" in place of those cells. A site test checks each row built
      from the site fixture against its record, and the fixture holds two
      records whose names differ only in letter case or accent.
- [x] AC2: Each version cell holds the major's start result, when one
      exists, as a second mark in its own element with its own visually
      hidden text (started, or the failure kind), and no start mark when
      none exists. Under the table a legend names each declared mark and
      each start mark, and says that a declared range is not a test
      result. A site test checks the start marks per row and the legend,
      and the fixture holds a record with a range whose start results
      cover some majors only.
- [x] AC3: Each row holds the record's language subtags in the order of
      their first tag in `languages` (all of them when 3 or fewer, else the
      first 2 and "+N" for the rest), the `latestReleaseDate` as
      `toLocaleDateString("en", { month: "short", year: "numeric",
      timeZone: "UTC" })`, a source link to the repo URL when it passes
      (none when it fails), and a download link to `upstream.xpiUrl` when
      it passes (none when it fails or is absent). A site test checks
      these per row built from the site fixture, which holds a record with
      4 or more subtags, records with and without `xpiUrl`, one record
      whose repo URL fails, and one whose `xpiUrl` fails.
- [x] AC4: `rowShows` returns true if and only if the row's display name
      or shown description contains the trimmed query, both lowercased
      (an empty query matches every row), and the language and version
      tests also pass; `filterHref` writes the query to `?q=` (and removes
      `q` for an empty query), and the page reads it back on load and on
      Back or Forward, as it does the other filters. The
      language menu keeps the order of `languageOptions` (most plugins
      first). Unit tests in `test/home-filter.test.ts` cover each clause,
      and a site test checks that the built page script passes the search
      box's value to `rowShows`.
- [x] AC5: The built home page's HTML holds every row with no `hidden`
      attribute, and the search box, the menu, the buttons, and the count
      inside elements with `hidden`, and `Base.astro` has a rule that sets
      `display: none` on each of those `[hidden]` elements, so a page read
      without JavaScript shows every plugin and no control. A site test
      checks the built HTML and the rules.
- [x] AC6: Every page built from the site fixture has the top bar and the
      footer. Sizes in `Base.astro` come from tokens by the M049 rule. In
      both color schemes, as read from `Base.astro` by the color test,
      each text token (`--text`, `--muted`, `--link`) passes 4.5:1 on each
      surface token (`--bg`, `--surface`, `--hover`), each status token
      (`--ok`, `--part`, `--bad`) passes 4.5:1 on its own background
      (`--ok-bg`, `--part-bg`, `--bad-bg`) and on `--surface`, and each
      mark or icon token (`--faint`, `--none`) passes 3:1 on `--surface`.
- [x] AC7: In the browser pane, the home page built from data whose
      records carry `xpiUrl` (the deployed data once a build after M052
      has run, else a local copy with `xpiUrl` added) has
      `documentElement.scrollWidth` at most `clientWidth` at 375 px and
      1280 px wide (the iframe width check).
- [x] AC8: README, DESIGN, and CHANGELOG under Unreleased describe the
      table, the search box, and the new look; the verify slot passes.

## Coverage

- AC1 → T1, T3
- AC2 → T1, T3
- AC3 → T1, T3
- AC4 → T2, T4
- AC5 → T4
- AC6 → T5, T6
- AC7 → T7
- AC8 → T8

## Tasks

- [x] T1: Add to the site fixture the records AC1 to AC3 name (a case or
      accent twin, a ranged record with partial start results, 4+
      subtags, `xpiUrl` present, a failing repo URL, a failing `xpiUrl`),
      and refresh `test/fixtures/site/home-facts.json` if it reads them.
- [x] T2: Add the search match and `?q=` handling to
      `src/site/home-filter.ts` (`rowShows`, `filterHref`) with unit tests.
- [x] T3: Rewrite `site/src/pages/index.astro` as the table (declared and
      start marks, legend, languages, date, links), sorted as AC1 says;
      replace the home tests in `test/site.test.ts`.
- [x] T4: Wire the search box into the page script beside the menu and
      buttons; keep the controls hidden with `[hidden]` rules; test the
      built HTML, the rules, and the script's call.
- [x] T5: Rewrite the tokens and shared rules in `Base.astro` (palette for
      both schemes, sizes, top bar, footer, buttons, marks); rewrite the
      color test to read the tokens and check the AC6 pairs; keep the
      M049 size test passing.
- [x] T6: Check the plugin pages under the new tokens: the M048 sections
      still render and the tests pass.
- [x] T7: Build from data with `xpiUrl` (lesson M035), serve it (lesson
      M015), run the width check, and save a screenshot at each width for
      the Review section.
- [x] T8: Update README, DESIGN, CHANGELOG; run the verify slot.

## Work log

- 2026-10-29: created by /milestone-plan.
- 2026-10-29: tier check: milestone — the request is a site redesign with design choices over more than one sitting.
- 2026-10-29: idea vet: gap — start-test dots inside the declared-range cells could read as one combined verdict; reading taken: separate marks with a legend naming each source; gap — the search box is new beyond the request; the user chose it at the question set; no flaw.
- 2026-10-29: question set: home table parts — search box, start test dots, languages and date columns, link icons; the language menu keeps its order by plugin count.
- 2026-10-29: plan gate chose sorting rows by display name over the data file's entry order because entry ids put names out of reading order (an uppercase id sorts first); falsified by a user report that the order hides plugins.
- 2026-10-29: plan gate chose one table over keeping cards because the user asked for a table after reviewing the card look; falsified by the user rejecting the table at the merge question.
- 2026-10-29: feature series: M053 -> M054
- 2026-10-29: lessons used: 2026-10-25 (M007) script selector grep; 2026-10-26 (M015) serving the built site; 2026-10-27 (M021) Astro line breaks; 2026-10-27 (M024) empty attributes; 2026-10-28 (M035) deployed data for hand checks; 2026-10-28 (M037) block nesting; 2026-10-29 (M048) inline CSS limit; 2026-10-29 (M048) iframe width check.
- 2026-10-29: criteria audit (full mode, fresh Opus reader): 9 findings here plus 1 shared with M054, all fixed: sort call and tie rule named, "none" split from no mark; a case or accent fixture twin; language, date, repo URL, and xpiUrl rules named, "shows" made "holds"; fixture records named for partial start results, 4+ subtags, xpiUrl, and failing links; the start mark gets its own element and a legend AC (no combined verdict); search made an if-and-only-if property of `rowShows` plus a script check; `[hidden]` rules added to the no-JS AC; the color AC now lists token pairs, since the old test reads M049 tokens; the screenshot moved to T7 and the width check runs on data with xpiUrl; the legend keeps "a declared range is not a test result" between the M053 and M054 merges. The ACs went from 7 to 8.
- 2026-10-29: sizing: kept 8 ACs over the 7 tripwire rather than split, because the table's columns, its filters, and the shared look ship as one page change and a split would deploy a half-built table; 8 tasks, 138 plan-owned lines.
- 2026-10-29: implement started; branch m053-home-table cut from main at 9b7211b.
- 2026-10-29: T1-T5 in one checkpoint, because the site tests of each read the page the others build; verify green (1135 tests, pnpm check 0 problems).
- 2026-10-29: T1: fixture adds a-cafe ("Café Tools") and b-cafe ("cafe tools"), placed so data order and code-unit order both disagree with the tie rule, a-cafe with 6 tags (5 subtags), xpiUrl, and two 8.x start results listed older first; b-cafe with an ftp: xpiUrl; ssh-plugin, a failure with a git@ repoUrl.
- 2026-10-29: T1: deleted test/fixtures/site/home-facts.json and test/support/home-facts.ts: they froze the M049 card list's facts, which the table replaces on purpose; the new row tests check each cell.
- 2026-10-29: T2: rowShows takes the row's name and description and the query as a fourth argument; filterStatus now always gives a count ("12 plugins", "2 of 12 plugins", or "No plugins match these filters."), the mockup's count.
- 2026-10-29: T3: kept the existing labels "Menus and settings in" and "Declares Zotero" over the mockup's "Language" and "Zotero", and "Any" for the first button as the mockup has it; descriptions clamp at 2 lines, not the mockup's 1, and carry no title copy.
- 2026-10-29: T3: marks are text glyphs (✓ ◐ – ● ✕) as on the plugin pages; the source and download links use inline SVG from a new Icon.astro; the source link's label says "Source code", since a failed record's repoUrl need not be GitHub.
- 2026-10-29: T4: the script test runs the built, minified script in node:vm against stand-in elements (the function names are mangled, so a grep for rowShows cannot work); a stand-in throws on any selector it does not know.
- 2026-10-29: T5: the mockup's --faint and --none failed 3:1 on --surface (light 2.54 and 1.97, dark --none 2.23); changed to #8a8a84 and #8f8f88 in light and #74746d in dark; the other mockup colors pass every AC6 pair.
- 2026-10-29: planted defects, each red then restored: no id tie-break (4 tests), first start result over newest (2), script ignoring the search box (3), no .search[hidden] rule (1), the mockup's --faint (1).
- 2026-10-29: T7: the deployed data (generatedAt 2026-10-29T15:00:32Z, 56 records) had no xpiUrl, so a local copy gave each of the 56 read records `<repoUrl>/releases/download/v<version>/<repo>-<version>.xpi`; built and served it as m053-live on port 4328.
- 2026-10-29: T7: width check in same-origin iframes: home 375/375 and 1280/1280 with 56 rows and 56 download links, a planted 900 px div gave 916 at 375; a plugin page 375/375 and 1280/1280; the table card's scrollWidth equals its clientWidth (341) at 375.
- 2026-10-29: T7: in the pane, ?q=pdf&zotero=8 showed 12 of 56 rows; typing "zotmoov" showed 1 row and wrote ?q=zotmoov&zotero=8. Screenshots: scratchpad m053-shots/home-375.jpg, home-1280.jpg, plugin-1280.jpg (dark scheme; the pane's light emulation does not apply, lesson M015).
- 2026-10-29: T6: the ZotMoov plugin page shows its M048 sections (support, start test, reports, about, Details) under the new tokens; the plugin page tests pass.
- 2026-10-29: T7: the built home page from that data is 180,376 bytes, 16,668 gzipped (level 9), against 10,938 for the deployed page today; this passes the "about 14 KB" promotion condition of the parked row "Filter the home list before it paints", for review hygiene to read. The style element is about 2.7 KB of the gzipped size.
- 2026-10-29: T8: README "The site" rewritten for the table, the marks, the start marks, the links, the search box, the count, and the top bar; DESIGN's site paragraphs and site build bullet updated; one CHANGELOG entry for the M053 -> M054 series, which M054 edits; added a test for the 760 px and 560 px column rules, which the entry claims; verify green (1136 tests, pnpm check 0 problems).
- 2026-10-29: claim audit: 140 claims read, 8 corrected — README.md, CHANGELOG.md, site/src/pages/index.astro, site/src/components/Icon.astro, test/site.test.ts, test/home-filter.test.ts (reader's count approximate, counted by hand).
- 2026-10-29: after the audit: rewrapped its README and CHANGELOG edits; the reader left the legend note open because a fix changes a tested string, so the note now says a declared range "comes from the plugin's manifest and the index's overrides, not from a test", and its test matches; verify green (1136 tests, pnpm check 0 problems).
- 2026-10-29: T8: the simple-english lint flags README lines 107, 165, and 574 and CHANGELOG lines 174 to 355; all are in text this milestone does not change, so they stay.

## Decisions

## Review

Evidence run 2026-10-29 on m053-home-table at 00da167, main unmoved at 9b7211b: `pnpm test` 1136 passed, 6 skipped; `pnpm check` 0 problems in 56 entries; verbose run of test/site.test.ts and test/home-filter.test.ts 196 passed, 0 failed.

- AC1: "holds one table whose body has one row per record, by name and then by id" passed (one `<table>`, 12 rows in a literal order where "Café Tools" and "cafe tools" tie and sort by id, against data order b-cafe first); "shows the name cell of %s" 12 of 12 passed (link, Archived mark, shown description); "shows the version cells of %s" checks the mark kinds and hidden text per major and "Not read" for the 3 failure records; "holds each shape of home table row" passed (case or accent twin present).
- AC2: "shows the version cells of %s" 12 of 12 passed, each start mark in its own `span.start` with hidden text "Start test: Zotero <release> <words>", none where no result exists, the expected result found by the test's own newest-by-compareVersions pick; "shows the newest start result of a major and none for a declared major with no result" passed (a-cafe 8 shows 8.0.10 over 8.0.3 listed first; major 9 declared all with no start mark); "names each declared mark and each start mark in a legend under the table" passed (legend after `</table>`, items for ✓ ◐ – ● ✕, note "A declared range comes from the plugin's manifest and the index's overrides, not from a test."); the fixture-shape test confirms a range with partial start results.
- AC3: "shows the languages, the release date, and the links of %s" 12 of 12 passed (codes computed in the test from appliedLanguages in first-tag order, `<time>` text from toLocaleDateString with timeZone UTC, links from safeHref); "shows the first two of four or more language codes" passed (a-cafe "fr de +3"); "shows the release month in UTC" passed (2025-12-31T23:30Z gives "Dec 2025"); "links a source and a download only when the address passes" passed (a-cafe both, b-cafe ftp: xpiUrl source only, first-plugin no xpiUrl source only, ssh-plugin git@ repoUrl none); fixture-shape test confirms 4+ subtags, xpiUrl present, absent, and failing, and a failing repo URL.
- AC4: test/home-filter.test.ts rowShows, filterHref, and filterStatus tests 31 passed: search on name, description only, letter case, outer spaces, spaces-only and empty query, no match, a match hidden by a failing language or version filter; `?q=` written, removed for "", and read back. "the home page script" 3 of 3 passed, running the built script in node:vm: `?q=TOOLS` on load shows a-cafe and b-cafe, typing " LOG " shows b-cafe and writes `?q=LOG`, popstate to `?q=edits` reads it back. "holds a hidden language menu with one option for each subtag, most plugins first" passed (English (3) first).
- AC5: "holds every row without hidden, and the search box, the menu, the buttons, and the count inside hidden elements" passed (12 rows with no hidden attribute; `p.search`, `p.language-filter`, `div.version-filter`, `p.filter-status` each carry hidden and hold the one input, select, 5 buttons, and the count); "hides each control's element while it has hidden" passed (a display: none rule names each of the four `[hidden]` selectors).
- AC6: "puts the top bar and the footer on every page" passed over all 13 built pages; the M049 size test ("takes each margin, padding, gap, corner radius, and font size ... from a custom property, 0, or auto") passed; "gives each listed token pair its contrast in the light scheme" and "in the dark scheme" passed, 17 pairs each (3 text tokens on 3 surfaces at 4.5:1, 3 status tokens on their own background and on --surface at 4.5:1, --faint and --none on --surface at 3:1); the "sets together", "redefines every hex", and report-button tests also passed.
- AC7: rebuilt at 00da167 from the deployed data of 2026-10-29T15:00:32Z with xpiUrl added to its 56 read records (no deployed build carries xpiUrl yet), served as m053-live; in the browser pane's same-origin iframes the home page had scrollWidth 375 at clientWidth 375 and 1280 at 1280, 56 rows and 56 download links each; a planted 900 px div gave 916 at 375. Screenshots from T7: scratchpad m053-shots/home-375.jpg and home-1280.jpg.
- AC8: README "The site" describes the table ("lists every plugin in one table"), the marks and start marks, the search box and `?q=`, the count, and the top bar; DESIGN's site paragraphs and site build bullet name the table, search box, and tokens in Base.astro; CHANGELOG line 391 under `## Unreleased` (the file's only section) holds the series entry for the new look, the table, and the search box; verify slot green as above.
