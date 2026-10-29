# M054: Rebuild the plugin page and add an About page

- **Status:** planned
- **Priority:** normal
- **Depends on:** M053
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the public plugin pages and a new public page
- **Branch/PR:** —

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

- [ ] AC1: Each plugin page built from the site fixture opens `<main>`
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
- [ ] AC2: For a record with `upstream`, a "Zotero compatibility" table
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
- [ ] AC3: Under the table, for a record with `upstream`, the "Works" and
      "Broken" links have hrefs equal to `reportHref(record, "works")` and
      `reportHref(record, "broken")`, after a line that names
      `upstream.version`. A site test checks the hrefs on each page built
      from the site fixture.
- [ ] AC4: A Details section headed by an h2, with no `<details>`
      element, lists the plugin id, archived, repository created, release
      read and prerelease, releases with an .xpi, open issues and pull
      requests, host of update.json, and the languages line; when a record
      has overrides, the overrides table sits under an h3 inside it. A
      site test checks each page built from the site fixture.
- [ ] AC5: `pnpm site` writes `about/index.html`, whose text covers the
      declared range and its marks, the start test (Linux, a new profile,
      the 3-second wait, a start is not "works"), the counting of user
      reports, overrides and the Used column, and that the index does not
      vet plugins. The top bar of every page built from the site fixture
      links to it. On each plugin page built from the site fixture, these
      sentences of today's page are absent: "waits 3 seconds", "A start
      test does not show that the plugin works", and the override
      paragraph's "An override marked" and "The declared range above uses"
      sentences; one line under the table links to the About page. The
      footer's not-vetted line stays on every page. A site test checks the
      built pages for each of these.
- [ ] AC6: In the browser pane, the plugin pages of DeepRead, Better
      BibTeX, and PDF Preview built from data whose records carry
      `xpiUrl`, and the About page, have `documentElement.scrollWidth` at
      most `clientWidth` at 375 px and 1280 px wide (the iframe width
      check).
- [ ] AC7: README, DESIGN, and the series' CHANGELOG entry from M053
      describe the plugin page and the About page; the verify slot passes.

## Coverage

- AC1 → T1
- AC2 → T2
- AC3 → T2
- AC4 → T3
- AC5 → T4
- AC6 → T5
- AC7 → T6

## Tasks

- [ ] T1: Add the icon set to the layout and rebuild the page head in
      `site/src/pages/plugins/[id]/index.astro`; test the head and links.
- [ ] T2: Add the fixture records AC2 names; build the compatibility
      table and the report row (a data helper for the rows by major, in
      `site/src/data.ts`); replace the section tests in `test/site.test.ts`.
- [ ] T3: Replace the closed Details with the h2 section and grid, and
      move the overrides table under an h3; update its tests.
- [ ] T4: Add `site/src/pages/about.astro` with the method notes from the
      plugin pages and the M053 legend, add the top bar link, cut the
      named sentences, and add the linking line; test the built pages.
- [ ] T5: Build from data with `xpiUrl`, serve it, run the width check,
      and save a screenshot of each named page at each width for Review.
- [ ] T6: Update README, DESIGN, and the M053 CHANGELOG entry; run the
      verify slot.

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

## Decisions

## Review
