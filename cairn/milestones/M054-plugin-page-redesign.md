# M054: Rebuild the plugin page and add an About page

- **Status:** review
- **Priority:** normal
- **Depends on:** M053
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the public plugin pages and a new public page
- **Branch/PR:** m054-plugin-page-redesign

## Goal

Each plugin page opens with its links and one compatibility table, and a
new About page holds the notes on how the index checks plugins.

## Scope

**In:** the one-column layout of
`cairn/mockups/redesign-2026-10-29/plugin.html`, which the user chose at
the plan: a back link; the name, an "Archived" mark, and the description;
icon buttons for the XPI file, the source, and the releases; a "Zotero
compatibility" table (declared support, start test, user reports per
major) with the report buttons under it; an open details grid with the
overrides table. A new About page that holds the method notes, taken
from the plugin pages and widened from the M053 legend, linked from the
top bar of every page. Absorbs candidate row "Fix the Overrides table's
heading level".

**Out:** the home table and the shared look → M053. Labels for reads cut
by the time limit → candidate row "Label cut reads on plugin pages".

## Acceptance criteria

Terms: the repo URL, "passes", a major's start result, and the site
fixture are as M053 defines them.

- [x] AC1: Each plugin page built from the site fixture opens `<main>`
      with a back link to the home page, an h1 with the display name and
      an "Archived" mark when `upstream.archived` is true, the shown
      description, and then links in this order: the file
      (`upstream.xpiUrl`, only when it passes), the source (the repo URL;
      plain text when it fails), and the releases (only for a record with
      `upstream`; `<repo URL>/releases` as plain text when the repo URL
      fails). Each link holds an inline SVG marked `aria-hidden="true"` and
      visible text, and the file link's text names `upstream.version`. A
      site test checks each such page, including the M053 fixture records
      whose repo URL or `xpiUrl` fails.
- [x] AC2: For a record with `upstream`, a "Zotero compatibility" table
      has one row per major in `ZOTERO_MAJORS` and per other major named
      by its `reports` or `startTests`, newest first. Each row's declared
      cell holds the `majorSupport` kind (or "No range" when undefined),
      its start cell names the release and result of the major's start
      result ("Not tested" when none), and its reports cell holds that
      major's works and broken counts ("None yet" when none). For a record
      with `failure`, the section holds the failure name and message in
      place of the table. A site test checks each page built from the site
      fixture, which gains a record with reports on major 11 and one with
      two start results for one major.
- [x] AC3: Under the table, for a record with `upstream`, the "Works" and
      "Broken" links have hrefs equal to `reportHref(record, "works")` and
      `reportHref(record, "broken")`, after a line that names
      `upstream.version`. A site test checks the hrefs on each page built
      from the site fixture.
- [x] AC4: A Details section headed by an h2, with no `<details>`
      element, lists the plugin id, archived, repository created, release
      read and prerelease, releases with an .xpi, open issues and pull
      requests, host of update.json, and the languages line; when a record
      has overrides, the overrides table sits under an h3 inside it. A
      site test checks each page built from the site fixture.
- [x] AC5: `pnpm site` writes `about/index.html`, whose text covers the
      declared range and its marks, the start test (Linux, a new profile,
      the 3-second wait, a start is not "works"), the counting of user
      reports, overrides and the Used column, and that the index does not
      vet plugins. The top bar of every page built from the site fixture
      links to it. On each plugin page built from the site fixture, no
      text contains these strings from the plugin page before M054:
      "waits 3 seconds", "A start test does not show that the plugin
      works", "An override marked", and "The declared range above uses";
      exactly one line in the "Zotero compatibility" section links to the
      About page, under the table for a record with `upstream` and under
      the failure message for a record with `failure`. The footer's
      not-vetted line stays on every page built from the site fixture. A
      site test checks the built pages for each of these.
- [x] AC6: In the browser pane, the plugin pages of DeepRead, Better
      BibTeX, and PDF Preview built from data whose records carry
      `xpiUrl`, and the About page, have `documentElement.scrollWidth` at
      most `clientWidth` at 375 px and 1280 px wide (the iframe width
      check).
- [x] AC7: README, DESIGN, and the series' CHANGELOG entry from M053
      describe the plugin page and the About page; the verify slot passes.

## Coverage

- AC1 → T1
- AC2 → T2
- AC3 → T2
- AC4 → T3
- AC5 → T4, T7
- AC6 → T5
- AC7 → T6

## Tasks

- [x] T1: Add the icon set to the layout and rebuild the page head in
      `site/src/pages/plugins/[id]/index.astro`; test the head and links.
- [x] T2: Add the fixture records AC2 names; build the compatibility
      table and the report row (a data helper for the rows by major, in
      `site/src/data.ts`); replace the section tests in `test/site.test.ts`.
- [x] T3: Replace the closed Details with the h2 section and grid, and
      move the overrides table under an h3; update its tests.
- [x] T4: Add `site/src/pages/about.astro` with the method notes from the
      plugin pages and the M053 legend, add the top bar link, cut the
      named sentences, and add the linking line; test the built pages.
- [x] T5: Build from data with `xpiUrl`, serve it, run the width check,
      and save a screenshot of each named page at each width for Review.
- [x] T6: Update README, DESIGN, and the M053 CHANGELOG entry; run the
      verify slot.
- [x] T7: Test the amended AC5: the moved strings on the whole page, and
      the About line under the failure message on failed records' pages.

## Work log

- 2026-10-29: created by /milestone-plan.
- 2026-10-29: tier check: milestone — the request is a site redesign with design choices over more than one sitting.
- 2026-10-29: idea vet: gap — a prominent download button could read as an endorsement; reading taken: a plain button beside Source and Releases, which the user chose; gap — one table holding three sources could read as a combined verdict; reading taken: one column per source, no summary column; no flaw.
- 2026-10-29: question set: plugin page layout — one column; XPI link — direct link to the author's file; method notes — a new About page linked from every page.
- 2026-10-29: plan gate chose one column over a side panel for links and facts because it reads the same on phones and desktops; falsified by the user choosing the side panel at the merge question.
- 2026-10-29: plan gate chose an open details grid over keeping the closed Details section because the closed section hid the facts the redesign shortens; falsified by a page whose grid runs longer than the compatibility table on a phone.
- 2026-10-29: feature series: M053 -> M054
- 2026-10-29: absorbed candidate row "Fix the Overrides table's heading level" (AC4).
- 2026-10-29: lessons used: 2026-10-26 (M015) serving the built site; 2026-10-27 (M021) Astro line breaks; 2026-10-28 (M035) deployed data for hand checks; 2026-10-28 (M037) block nesting; 2026-10-29 (M048) iframe width check.
- 2026-10-29: criteria audit (full mode, fresh Opus reader): 6 findings here plus 1 shared with M053, all fixed: "every fixture page" made "each page built from the site fixture", with failing-link fixtures and the releases fallback named; a major-11 reports fixture and a two-result fixture added, newest result used; report hrefs tied to `reportHref`; Details given an h2 above the overrides h3; the method-text claim narrowed to named sentences with the footer exempt, and "the build" made `pnpm site`; the color clause dropped (M053 AC6 owns it); Scope no longer moves notes from a home intro that M053 removes. Note kept, no change: the links come before the table, as in the mockup the user chose.
- 2026-10-29: started by /milestone-implement on branch m054-plugin-page-redesign.
- 2026-10-29: choice: the file link uses the same plain `.btn` style as Source and Releases, not the mockup's dark primary button, per the plan's idea vet (a plain button, not an endorsement); link texts "Download <version> (.xpi)", "Source", "Releases"; the Archived mark reuses the home table's `.badge`.
- 2026-10-29: choice: the fixture gains `next-plugin@example.org`, whose `upstream.repoUrl` fails `safeHref` (the releases plain-text case AC1 names), with reports on majors 8 and 11 and start results 8.0.3, 8.0.4, and 12.0.1 (two on one major, one on a major only its start tests name, for AC2).
- 2026-10-29: T1 done: back link, head with the Archived badge, and download, source, and releases links with icons; the About card now holds only the languages line and shows only for a read record; head test checks link order, hrefs, icons, and text on every fixture page, and went red on all 13 pages with `aria-hidden` removed from the icon.
- 2026-10-29: choice: the declared cell shows the home table's mark (hidden from screen readers, titled with `supportText`) and the mockup's words Yes, Partly, or No; the start cell shows ● or ✕, the result in words, and "Zotero <release>"; the reports cell shows "N works M broken"; helpers `compatMajors`, `majorReport`, and `startWords` in `site/src/data.ts`; `Support.astro`, `startTestsText`, and the pill styles removed as unused.
- 2026-10-29: T2 done: one "Zotero compatibility" card replaces the Declared support, Start test, and User reports cards; it holds the version line, the table, the declared range line, and the report row; tests compare every fixture page's rows with rows built from `majorSupport` and the data, pin the next-plugin rows, and went red (24 tests) with the major order reversed and the works href swapped.
- 2026-10-29: choice: the Details facts keep AC4's order with the languages line last; the About card that held only the languages line is gone; card h2s take the mockup's 15 px weight-650 style and the Overrides h3 takes the old small uppercase heading style.
- 2026-10-29: T3 done: an open "Details" card (h2) with a `dl.facts` grid replaces the closed `<details>`, and the overrides table sits under an h3 in it; the test checks each page's fact labels in order, no `<details>` or `<summary>`, and the h3, and went red on the 4 pages with overrides when the h3 was planted back as an h2.
- 2026-10-29: choice: the About page has five cards (declared range, start test, user reports, overrides, what the index does not do), written from `version.ts`, `bootstrap.js`, `start-test.ts`, `count.ts`, and README read this session; About is the first top bar link; a failed record's page has no table, so its About line sits under the failure message in the same card.
- 2026-10-29: T4 done: `about/index.html` built, top bar link on every page, the four moved sentences gone from plugin pages, one "How the index checks plugins" line in each compatibility card; the built About page first had "and<code>" with its space dropped (Astro line breaks), fixed with `{" "}`; the text check now strips tags without adding spaces and went red when that space was planted out again.
- 2026-10-29: T5: built from the deployed `v1/plugins.json` (generatedAt 2026-10-29T19:12:45.935Z, 56 records, all with `xpiUrl`), served on port 4329 (`m054-live` in the excluded `.claude/launch.json`); the first 375 px look showed table headers broken mid-word ("Zo ter o") under the body's `overflow-wrap: anywhere`, fixed with `overflow-wrap: normal` on the table, a no-wrap declared cell, and smaller cell padding at 560 px or less.
- 2026-10-29: T5 done: iframe width check with `border: 0`, after the fix: DeepRead, Better BibTeX, and PDF Preview plugin pages and the About page all have scrollWidth equal to clientWidth at 375 (375/375) and 1280 (1280/1280); a planted 900 px block gave 900/375; DOMParser nesting check found no block inside a `<p>`; screenshots of the four pages at 375 and 1280 px were taken in the pane (no tool saves them to the repo; the pane keeps them in this session's tool results).
- 2026-10-29: T6 done: README's site section (top bar, plugin page, About page, `pnpm site` output) and DESIGN's site paragraphs, pill example, and module notes describe the new pages; the M053 CHANGELOG entry gains the About link and the plugin page and About page text, and says it replaces the layout the older Unreleased entries describe, which stay as written (no release yet); verify passes (1179 tests, 56 entries, 0 problems).
- 2026-10-29: claim audit: 99 claims read, 3 corrected — README.md, CHANGELOG.md (the declared range shows under the table only when the plugin declares one, twice; the new layout still has two cards).
- 2026-10-29: all tasks done; status set to review.
- 2026-10-29: review pass 1: merged main (2ab094f, two plugin entries) into the branch; verify green; AC1–AC4, AC6, AC7 verified and ticked; gate passed.
- 2026-10-29: amendment routed: AC5 — "one line under the table links to the About page" cannot hold on the 3 fixture pages of failed records, which have no table (AC2); their About line sits under the failure message in the same card.
- 2026-10-29: re-audit: AC5 (full) — satisfiable on all 13 fixture pages (schema `oneOf` upstream/failure), no IP or D-entry conflict, no probe cited, test clause not an instrument finding, proportionate; 2 findings: the footer clause's "every page" lacks the fixture qualifier, and "today's page" drifts after the merge; both fixed toward the narrower wording; test gaps noted (no failure-message order check; moved sentences checked in `<main>` only).
- 2026-10-29: re-audit: AC5 (full) — satisfiable on all 15 fixture pages, no IP or D-entry conflict, bounded, no probe, proportionate; 2 low findings: the four quoted "sentences" are fragments (substring or whole-sentence reading), and "one line" can read as at least one or exactly one; the same 2 test gaps; this is the second re-audit of AC5, so further wording change goes to the user.
- 2026-10-29: user chose the strict wording at the AC5 chip (over keeping the reviewed wording or stopping); no further reader spawned for AC5.
- 2026-10-29: amendment return: AC5 — "On each plugin page built from the site fixture, no text contains these strings from the plugin page before M054: "waits 3 seconds", "A start test does not show that the plugin works", "An override marked", and "The declared range above uses"; exactly one line in the "Zotero compatibility" section links to the About page, under the table for a record with `upstream` and under the failure message for a record with `failure`. The footer's not-vetted line stays on every page built from the site fixture."
- 2026-10-29: minor amendment: T7 added and mapped to AC5 for the two test gaps both readers named; T7 done: the moved-strings check now reads each plugin page's whole markup and text, and failed records' pages check the failure message before the About line; moving the About line above the failure message failed the 3 failure pages; verify passes (1179 tests, 58 entries, 0 problems); status set to review.

## Decisions

## Review

Pass 1, 2026-10-29, on c0c43dc (branch after merging main at 2ab094f; verify: 1179 tests passed, 6 skipped; `pnpm check` 58 entries, 0 problems).

- AC1 evidence: `test/site.test.ts` "opens the main content of <id> with a back link, the name, the description, and the links" passes for all 13 fixture pages, plus "covers each shape of page head link" (a read record and a failed one whose repo URL fails, an `xpiUrl` that fails, one that passes): 14 of 14 passed. The test matches the back link, the h1 with the `Archived` badge only for `archived: true`, the shown description, and the download, source, and releases items in order, each link with an `aria-hidden="true"` SVG and its text, the download text naming `upstream.version`, and the plain-text source and releases fallbacks.
- AC2 evidence: "shows the table of <id>, or the failure of a record that was not read" for all 13 pages, the pinned next-plugin rows (12, 11, 10, 9, 8, 7; 8.0.4 newest of 8.0.3 and 8.0.4; reports on 11), the mark title test, and the fixture shape test: 16 of 16 passed. The fixture gains `next-plugin@example.org`, which has reports on major 11 and two start results on major 8, and also one on 12. Each cell carries the kind in `data-declared` and on the mark's `data-support`; failed records show the failure name and message and no table.
- AC3 evidence: "puts the report links of <id> under the table, after a line that names the version read" for all 13 pages (hrefs equal `reportHref(record, verdict)`; order `</table>`, prompt line naming the version, Works, Broken; failed records have none), plus the URL tests: 16 of 16 passed.
- AC4 evidence: "lists the facts of <id> in an open Details section, with the overrides under an h3" for all 13 pages: 13 of 13 passed (h2 "Details", no `<details>` or `<summary>`, facts in AC4's order ending with "Menus and settings in", the overrides table under `<h3>Overrides</h3>` on the 4 pages with overrides, no h2 Overrides).
- AC5 evidence: the About page tests, the top bar test over all 15 built pages, and the page list test: 20 of 20 passed. `about/index.html` is written; its text holds the declared range and marks, the start test on Linux in a new profile with the 3-second wait (pinned to `SETTLE_MS = 3000`) and "A start is not a report that the plugin works", the report counting, overrides and the Used column, and "This index does not vet the plugins it lists"; the four moved sentences are absent from all 13 plugin pages ("waits 3 seconds" shown present on the About page); the footer line is on every page. Not ticked: AC5 says "one line under the table links to the About page" on each plugin page, and the 3 fixture pages of failed records (`broken-plugin`, `_x-y+z.w@{v}`, `ssh-plugin`) have no table, as AC2 requires; their link line sits under the failure message. The criterion as written fails on those pages, so it goes to a gated amendment.
- AC6 evidence: fresh deployed `v1/plugins.json` (generatedAt 2026-10-29T19:12:45.935Z, 56 records, 56 with `xpiUrl`), site rebuilt on c0c43dc and served on port 4329; iframe width check with `border: 0`: DeepRead, Better BibTeX, PDF Preview, and About pages 375/375 at 375 px and 1280/1280 at 1280 px, each plugin page with its download link; a planted 900 px block gave 900/375.
- AC7 evidence: README, `cairn/DESIGN.md`, and CHANGELOG each name the About page (4 lines each) and the "Zotero compatibility" table; the CHANGELOG change is inside the M053 entry; verify passes as above.
- Gate: `cairn_validate.py` all checks passed; no DESIGN principle changed, so `cairn_impact` skipped; the generic profile's consistency-gate names no toolchain checks.

Pass 2, 2026-10-29, on 55f1f99 (main unmoved at 2ab094f; since c0c43dc only `test/site.test.ts` changed outside `cairn/`; verify: 1179 tests passed, 6 skipped; `pnpm check` 58 entries, 0 problems). Site tests 196 of 196 passed: AC1 14, AC2 16, AC3 16, AC4 13, AC5 20, so pass 1's AC1–AC4, AC6, and AC7 evidence stands on the same page code.

- AC5 evidence (amended wording): the About page tests, the top bar and footer test over all 15 built pages, and the page list test: 20 of 20 passed. `about/index.html` text holds each named topic; on all 13 plugin pages none of the four strings is in the markup or the tag-stripped text; each page's `<main>` holds exactly one About href, in the `data-about-line` line of the compatibility card, after `</table>` on the 10 read records' pages and after the failure message on the 3 failed records' pages; the footer's not-vetted line is on all 15 pages. A planted swap of the failure message and the About line failed the 3 failure pages (T7).
- Gate (pass 2): `cairn_validate.py` all checks passed.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: the h1 joins the name and the "Archived" badge with no space, so the heading's text reads "Old PluginArchived" — fix now, fixed 9007997
- diff-bug #2: `.btn` edges take `--line-strong`, 1.40 to 1.66:1 on `--bg` and `--surface`, below the 3:1 the other controls hold, and no test covers `.btn` — fix now, fixed 9007997 (border `--faint`, a forced-colors ButtonText edge, `.btn` added to the edge test on `--surface` and `--bg`)
- diff-bug #3: the download button shows no prerelease mark, and no page says the author can replace the file (D-029) — follow-up, row "Close small gaps on the site pages"
- diff-bug #4: a start release with leading zeros, such as "07.0.1", gives a "7" row with no result and an "07" row; schema-valid, never written by the build — follow-up, row "Close small gaps on the site pages"
- diff-bug #5: `majorReport` shows only the first item for a major, so a second item's counts drop; schema-valid, never written by the build — fix now, fixed 9007997 (counts summed, regression test added)
- diff-bug #6: the declared mark's support text sits in `title` on an `aria-hidden` span, so screen readers hear only "Partly" with no range — fix now, fixed 9007997 (visible mark and word hidden, `supportText` in visually-hidden text, as the M015 pills had)
- diff-bug #7: "1 works" and a `{works: 0, broken: 0}` item read oddly — reject, style: the counts keep the verdict names as the page before M054 wrote them ("3 works, 1 broken")
- diff-bug #8: stale "pill" comments in `site/src/data.ts` and `src/site/version.ts` and the `pilled` name in the test — fix now, fixed 9007997
- diff-bug #9: four wording gaps (the CHANGELOG fallback sentence reads as if a bad repo URL hides the `.xpi` link; README calls the plain-text fallbacks links with icons; DESIGN splits the one About line in two; About leaves out a rejected async startup) — fix now, fixed 9007997
- diff-bug #10: the About link has no `aria-current="page"` on the About page — follow-up, row "Close small gaps on the site pages"
- diff-bug #11: a scrolling `.table-wrap` takes no keyboard focus; the overrides table had the same wrapper before M054 — follow-up, row "Close small gaps on the site pages"
- diff-bug #12: an `http://` `xpiUrl` becomes a download link — reject, planned change: AC1 shows the file link when `xpiUrl` passes `safeHref`, the rule every site link uses
- diff-bug #13: next-plugin's start result on 12.0.1 and its scheme-less `repoUrl` cannot come from the build — reject, false: the pages render any schema-valid record, and those shapes test the plain-text and extra-major paths AC1 and AC2 name
- diff-bug #14: rewrapped README and CHANGELOG lines pass the files' usual line width — reject, style
- diff-bug #15 (tests): the "holds the phrase that the plugin page check looks for" test repeats the start-test text check — fix now, fixed 9007997 (removed)
- diff-bug #16 (tests): `START_LIMIT_MS` read from the source with a regex though the module exports it — fix now, fixed 9007997 (imported)
- diff-bug #17 (tests): `expectedRows` repeats the steps of `compatMajors` and `majorStart` — reject, false: it builds rows from `majorSupport` and `compareVersions`, and the pinned next-plugin and a-cafe rows are literal facts stated apart from the page code
- diff-bug #18 (tests): the fixture check for an extra report major sits beside the stricter major-11 check — fix now, fixed 9007997 (removed)
- diff-bug #19 (tests): the report buttons' `aria-describedby` markup is asserted on all 10 read pages by one code path — fix now, fixed 9007997 (one test on one page)
- diff-bug #20 (tests): no-range-plugin's "No range" cells repeat what the per-page table test checks — fix now, fixed 9007997 (removed)
- diff-bug #21 (tests): the section test re-checks that failed pages have no languages fact — fix now, fixed 9007997 (removed)
- diff-bug #22 (tests): the top bar test re-checks that `about/index.html` exists — fix now, fixed 9007997 (removed)
- diff-bug #23 (tests): the mark test pins whole `<span>` strings with their attribute order — fix now, fixed 9007997 (replaced by a test of the spoken text)
- diff-bug (a) and (b): no added code awaits, and no skill step is added.
- blame-history #1: `.btn` edges below 3:1 bring back the M048 and M053 edge fix — fix now, fixed 9007997 (with diff-bug #2)
- blame-history #2: the M015 pills' hidden support text is gone — fix now, fixed 9007997 (with diff-bug #6)
- blame-history #3: the "not works" caveat left the plugin page — reject, planned change: AC5 moves it to the About page, which the page links
- blame-history #4: the table shows only the newest start result of each major — reject, planned change: AC2 names the major's start result as M053 defines it
- blame-history #5: Details is open, not a closed `<details>` — reject, planned change: Scope and AC4
- blame-history #6: "(archived)" became an "Archived" badge — reject, false: the reviewer finds no regression, the marker and the fact stay
- blame-history #7: the Overrides heading moved from h2 to h3 — reject, planned change: AC4 and the absorbed candidate row
- blame-history #8: a failing `xpiUrl` gives no text fallback — reject, planned change: AC1
- prior-review #1: `.btn` edges below 3:1 again — fix now, fixed 9007997 (with diff-bug #2)
- prior-review #2: the start caveat moved off the plugin page — reject, planned change: AC5
- prior-review #3: the Used column note moved off the plugin page — reject, planned change: AC5
- prior-review #4: an older Unreleased CHANGELOG entry quotes the old report prompt — reject, planned change: older Unreleased entries stay as written, and the series entry says it replaces that layout
- prior-review #5: the table header reads "Declared" where the home table reads "Declares Zotero" — reject, style
- ripple #1: the candidate row "Fix the Overrides table's heading level" describes the old page — reject, planned change: AC4 absorbs it, and post-merge hygiene removes the row
- ripple #2: the candidate row "Label cut reads on plugin pages" quotes the removed "Not read:" text — fix now, fixed 9007997 (row corrected, marked `corrected M054`)
- ripple #3: DESIGN's `pnpm site` module note leaves out the About page — fix now, fixed 9007997
- ripple #4: `cairn/references/mozilla-toolkit-version.md` says the site shows pills — fix now, fixed 9007997 (marked `corrected M015, M054`)
- ripple #5: the `site/src/data.ts` comment on pill hidden text — fix now, fixed 9007997 (with diff-bug #8)
- ripple #6: the `src/site/version.ts` comment on pills — fix now, fixed 9007997 (with diff-bug #8)
- ripple #7: a `test/report.test.ts` case name says "with a pill" — fix now, fixed 9007997
- ripple #8: the `pilled` name in `test/site.test.ts` — fix now, fixed 9007997 (with diff-bug #8)
- ripple #9: CHANGELOG's site entry points to "the entry on version pills" — reject, planned change: older Unreleased entries stay as written
- ripple #10: CHANGELOG says the home page shows "(archived)" — reject, planned change: older Unreleased entries stay as written, and the M053 entry says "Archived"
- ripple #11: other older Unreleased entries describe pills, the closed Details section, and the old prompt — reject, planned change: same ground
- ripple #12: the redesign mockup's wording differs from the built page — reject, false: `cairn/mockups/README.md` says the mockups are look references that no test or page reads
- AC6 recheck after the fixes, on 9007997 with the same deployed data: the four pages are 375/375 at 375 px and 1280/1280 at 1280 px; each `.btn` computes the `--faint` border color; the PDF Preview h1 text reads "Zotero PDF Preview Archived".
- Return floor: no finding shows a criterion failing or a load-bearing defect, so status stays `review`; fix-now work: verify passes (1180 tests, 58 entries, 0 problems), and planted defects (first item only, `--line-strong` edge, the hidden text removed) failed the new tests.
