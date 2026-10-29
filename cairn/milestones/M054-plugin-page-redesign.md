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
overrides table. A new About page that holds the method notes now on the
home intro and the plugin pages, linked from the top bar of every page.
Absorbs candidate row "Fix the Overrides table's heading level".

**Out:** the home table and the shared look → M053. Labels for reads cut
by the time limit → candidate row "Label cut reads on plugin pages".

## Acceptance criteria

- [ ] AC1: Each built plugin page opens `<main>` with a back link to the
      home page, an h1 with the display name and an "Archived" mark when
      `upstream.archived` is true, the shown description, and then links
      in this order: the file (`upstream.xpiUrl`, only when `safeHref`
      passes it), the source (the `safeHref` repo URL, plain text when it
      fails), and the releases (only for a record with `upstream`). Each
      link holds an inline SVG marked `aria-hidden="true"` and visible
      text, and the file link's text names `upstream.version`. A site test
      checks every fixture page.
- [ ] AC2: For a record with `upstream`, a "Zotero compatibility" table
      has one row per major in `ZOTERO_MAJORS` and per other major named
      by its `reports` or `startTests`, newest first. Each row's declared
      cell equals `majorSupport` (or says no range), its start cell names
      the tested release and the result of the `startTests` item for that
      major ("Not tested" when none), and its reports cell gives that
      major's works and broken counts ("None yet" when none). For a record
      with `failure`, the section shows the failure name and message
      instead of the table. A site test checks every fixture page.
- [ ] AC3: Under the table, for a record with `upstream`, the "Works" and
      "Broken" links keep the `reportHref` hrefs of today's pages, after a
      line that names `upstream.version`. A site test checks the hrefs.
- [ ] AC4: An open details section lists the facts of today's Details
      list (plugin id, archived, repository created, release read and
      prerelease, releases with an .xpi, open issues and pull requests,
      host of update.json) plus the languages line, with no `<details>`
      element. The overrides table, when a record has overrides, sits under
      an h3 inside that section. A site test checks every fixture page.
- [ ] AC5: The build writes `about/index.html`, whose text covers the
      declared range and the version marks, the start test (Linux, a new
      profile, the 3-second wait, a start is not "works"), the counting of
      user reports, overrides, and that the index does not vet plugins.
      The top bar of every built page links to it. A plugin page's only
      text on method is one line under the table that links to it; the
      "waits 3 seconds" sentence appears on the About page and on no
      plugin page. A site test checks the built pages.
- [ ] AC6: In the browser pane, plugin pages built from the deployed data
      (DeepRead, Better BibTeX, and PDF Preview) and the About page have no
      horizontal scroll at 375 px and 1280 px wide (the iframe width
      check); each CSS rule that sets a text color and a background passes
      4.5:1 in both color schemes by the existing color test.
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
- [ ] T2: Build the compatibility table and the report row (a data
      helper for the rows by major, in `site/src/data.ts`); replace the
      section tests in `test/site.test.ts`.
- [ ] T3: Replace the closed Details with the open grid and move the
      overrides table under an h3; update its tests.
- [ ] T4: Add `site/src/pages/about.astro` with the method notes moved
      from the home intro and the plugin pages, add the top bar link, cut
      the plugin page note to one linking line; test the built pages.
- [ ] T5: Build from the deployed data, serve it, run the width check and
      screenshots for the named pages, and run the color test.
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

## Decisions

## Review
