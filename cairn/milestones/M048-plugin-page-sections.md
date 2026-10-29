# M048: Lay out the plugin pages in card sections

- **Status:** in-progress
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the public site's plugin pages
- **Branch/PR:** m048-plugin-page-sections

## Goal

Each plugin page groups its facts into a header block and titled card sections, with the declared Zotero support first.

## Scope

**In:** The plugin page template `site/src/pages/plugins/[id]/index.astro`.
The CSS rules in `site/src/layouts/Base.astro` that the plugin pages use,
and new custom properties for the card look. Works and Broken links that
look like buttons. The plugin page tests in `test/site.test.ts`. The
plugin page paragraph of `README.md` and the plugin page sentence of
`cairn/DESIGN.md`. One `CHANGELOG.md` entry. The home list's rows switch
to the card properties (AC5).

**Out:** The shared header, the footer, and the rest of the home list's
look. M049 gives them the same look. The "Not read: <failure name>" wording stays with the
candidate row "Label cut reads on plugin pages". New data fields stay out.
A script on the plugin pages stays out, because this layout needs none
(D-026 allows one).

## Acceptance criteria

- [ ] AC1: On the built page of each record in
      `test/fixtures/site/plugins.json`, the main content opens with a
      header block that is not a `<header>` element. The block holds the
      h1 name, the "(archived)" mark where the record is archived, and the
      description where `shownDescription` returns one.
- [ ] AC2: Between the header block and `<details>`, each such page shows
      exactly these h2 sections, in this order. "Declared support" comes
      first. "Start test" follows
      where the record was read and has a non-empty `startTests`. "User
      reports" follows where the record was read. "About" comes last. The
      closed Details section follows the sections.
- [ ] AC3: On each such page, "Declared support" holds the pills or the
      failure or "No declared range" status, and the declared range where
      one is declared. "Start test" holds the "Starts in Zotero" line and
      its note. "User reports" holds the report version line, the counts
      or the no-reports line, and the Works and Broken links. "About"
      holds the "Menus and settings in" line where the record was read,
      the repository fact (`data-fact="repository"`), and the releases
      link where the record was read. Details holds the facts
      that it holds on `main` at 48ef631.
- [ ] AC4: On each such page, the Works, Broken, repository, and releases
      links have the same `href` values as on `main` at 48ef631.
- [ ] AC5: `Base.astro` defines the card's border color, radius, padding,
      and background as custom properties. The header block, each of the
      four AC2 sections, and the home list's rows take those four values from them.
      The Works link takes its colors from `--all-text` on `--all-bg`. The
      Broken link takes its colors from a new `--broken-text` on
      `--broken-bg` pair, in the light and the dark block.
- [ ] AC6: In the light and the dark `:root` blocks of `Base.astro`, each
      of these pairs has a contrast ratio of at least 4.5:1 by the WCAG 2.2
      relative-luminance formula: `--text`, `--muted`, and `--link`, each
      on `--card` and on `--page`. Also `--all-text` on `--all-bg`,
      `--some-text` on `--some-bg`, `--none-text` on `--none-bg`, and
      `--broken-text` on `--broken-bg`. The same holds for each text and
      background pair that one rule added or changed by this milestone
      sets together,
      found from the diff of `Base.astro` against `main` at 48ef631.
- [ ] AC7: The built fixture site, served from a local server at the Pages
      base path, shows no horizontal page scroll on the page of each
      fixture record, with Details open, at viewport widths 360 px and
      1280 px. The measure is `document.documentElement.scrollWidth <=
      document.documentElement.clientWidth` in the browser pane.
- [ ] AC8: The plugin page paragraph of `README.md`, the plugin page
      sentence of `cairn/DESIGN.md`, and one `CHANGELOG.md` entry under
      Unreleased describe the header block and the four sections. The profile's `verify` slot is clean: `pnpm test` and
      `pnpm check` pass.

## Coverage

- AC1 → T1, T2
- AC2 → T1, T2
- AC3 → T1, T2
- AC4 → T1, T2
- AC5 → T3
- AC6 → T3
- AC7 → T4
- AC8 → T5

## Tasks

- [x] T1: Write the tests first. Rewrite the order test at
      `test/site.test.ts:235` for the header block, the four sections, and
      what each holds. Keep each `href` check, and add one for any link
      that has none. Run them and see them fail.
- [x] T2: Restructure `site/src/pages/plugins/[id]/index.astro` into the
      header block and the four sections. Make the Works and Broken links
      button-shaped. Run the tests and see them pass.
- [x] T3: In `Base.astro`, add the card properties, the section and h2
      styles, the button styles, and the `--broken-*` pair. Make the home
      rows use the card properties. Add a test that reads the `:root`
      blocks and checks each AC6 pair.
- [x] T4: Build the fixture site and the site from the deployed data.
      Serve each at the Pages base path through `.claude/launch.json` and
      `preview_start`. Measure AC7 on each fixture page. Take screenshots
      at both widths.
- [ ] T5: Update the README paragraph and the DESIGN.md plugin page
      sentence (`cairn/DESIGN.md:69`, "links first"), and add the
      CHANGELOG entry. Run `pnpm test` and `pnpm check`.

## Work log

- 2026-10-29: created by /milestone-plan.
- 2026-10-29: tier check: milestone — new layout work with design choices.
- 2026-10-29: idea vet: one concern. Moving the links above the pills goes against the banked note "Each page answers 'does it work on my Zotero?' first". The set kept the support first, with the links in About. A "Compatibility" section with the start test would read as a combined verdict (DESIGN out of scope, D-023), so the plan named it "Declared support" and gave the start test its own section.
- 2026-10-29: lessons used: 2026-10-26 (M015) local server for the pane, 2026-10-28 (M035) site from deployed data, 2026-10-27 (M021) `{" "}` at line ends, 2026-10-28 (M037) no `<div>` inside `<p>`, 2026-10-25 (M007) match the attribute form in page tests.
- 2026-10-29: criteria audit (full): 9 findings, all fixed. The home link stays in the layout, and the block is no `<header>`. The promises cover the fixture records. The href criterion binds values, not test text. New color pairs come from the diff. The browser check uses a local server, one scheme, Details open. The no-script check left with D-026.
- 2026-10-29: question set: links — below the reports, in About; style — cards; report links — two buttons; reach — whole site, so M049 covers the header, the footer, and the home list.
- 2026-10-29: plan gate chose links in About below the reports over links in the header because the support answer stays first; falsified by visitor reports that the repository link is hard to find.
- 2026-10-29: plan gate chose cards over open sections with rules and over two columns because cards match the home rows and keep one reading order; falsified by a page check showing nested borders that crowd at 360 px.
- 2026-10-29: plan gate chose button links for Works and Broken over text links; falsified by report counts that drop after the change.
- 2026-10-29: split: M048 covers the plugin pages, and M049 (planned now, depends on M048) covers the header, the footer, and the home list.
- 2026-10-29: user superseded D-019 with D-026 at the plan, so AC6 of the audited draft (no script on plugin pages) left the criteria.
- 2026-10-29: criteria re-audit (full): 6 findings on M048, all fixed. AC1 forbids any `<header>` element and names `shownDescription`. AC2 counts only the sections before `<details>`, so the Overrides h2 stays out. AC3 names the repository fact, since no fixture has an unsafe URL. Scope names the home row change. AC6 covers changed rules too. DESIGN.md's "links first" sentence joins AC8 and T5.
- 2026-10-29: T1: the plugin page tests now check the header block, the four sections and their facts, and the Details section on each of the 9 fixture pages; the 27 new tests fail on the current page. The report link tests allow attributes after `href`, which they still match exactly.
- 2026-10-29: T2: the page is a `div.card.page-head` and four `section.card` elements marked `data-section`; the Works and Broken links carry `class="button"` after `href` and sit under the line "Tried this version on Zotero? Report what you found:", in place of "Report that it Works or is Broken." 88 site tests pass.
- 2026-10-29: T3: `--card-border`, `--card-radius`, and `--card-padding` join `--card`; `.card`, `.plugin`, and `details` use them. Section h2s are small uppercase `--muted` labels. Buttons are pills with a transparent border that forced colors draw. `--broken-*` is #a4261a on #fde7e5 (light) and #f5aaa1 on #44201c (dark). The new rules set only the AC6 pairs (muted h2 on card, the two button pairs, details on card). The color test failed on a planted #6a3a35 broken text (1.54:1). `pnpm test` 1050 passed, `pnpm check` 0 problems.
- 2026-10-29: T4: built the fixture site (10 pages) and a site from the deployed `v1/plugins.json` (49 pages), served at `/zotero-plugin-index/` on ports 4324 and 4325 (`.claude/launch.json`, git-excluded). In 360 px and 1280 px iframes with Details open, all 18 fixture page loads gave `scrollWidth == clientWidth`; a planted 900 px block gave 916 > 360. Screenshots of the live Linter for Zotero page at 800 px and the fixture First Plugin page at 360 px, dark scheme (the pane's scheme).

## Decisions

## Review
