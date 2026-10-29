# M048: Lay out the plugin pages in card sections

- **Status:** review
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

- [x] AC1: On the built page of each record in
      `test/fixtures/site/plugins.json`, the main content opens with a
      header block that is not a `<header>` element. The block holds the
      h1 name, the "(archived)" mark where the record is archived, and the
      description where `shownDescription` returns one.
- [x] AC2: Between the header block and `<details>`, each such page shows
      exactly these h2 sections, in this order. "Declared support" comes
      first. "Start test" follows
      where the record was read and has a non-empty `startTests`. "User
      reports" follows where the record was read. "About" comes last. The
      closed Details section follows the sections.
- [x] AC3: On each such page, "Declared support" holds the pills or the
      failure or "No declared range" status, and the declared range where
      one is declared. "Start test" holds the "Starts in Zotero" line and
      its note. "User reports" holds the report version line, the counts
      or the no-reports line, and the Works and Broken links. "About"
      holds the "Menus and settings in" line where the record was read,
      the repository fact (`data-fact="repository"`), and the releases
      link where the record was read. Details holds the facts
      that it holds on `main` at 48ef631.
- [x] AC4: On each such page, the Works, Broken, repository, and releases
      links have the same `href` values as on `main` at 48ef631.
- [x] AC5: `Base.astro` defines the card's border color, radius, padding,
      and background as custom properties. The header block, each of the
      four AC2 sections, and the home list's rows take those four values from them.
      The Works link takes its colors from `--all-text` on `--all-bg`. The
      Broken link takes its colors from a new `--broken-text` on
      `--broken-bg` pair, in the light and the dark block.
- [x] AC6: In the light and the dark `:root` blocks of `Base.astro`, each
      of these pairs has a contrast ratio of at least 4.5:1 by the WCAG 2.2
      relative-luminance formula: `--text`, `--muted`, and `--link`, each
      on `--card` and on `--page`. Also `--all-text` on `--all-bg`,
      `--some-text` on `--some-bg`, `--none-text` on `--none-bg`, and
      `--broken-text` on `--broken-bg`. The same holds for each text and
      background pair that one rule added or changed by this milestone
      sets together,
      found from the diff of `Base.astro` against `main` at 48ef631.
- [x] AC7: The built fixture site, served from a local server at the Pages
      base path, shows no horizontal page scroll on the page of each
      fixture record, with Details open, at viewport widths 360 px and
      1280 px. The measure is `document.documentElement.scrollWidth <=
      document.documentElement.clientWidth` in the browser pane.
- [x] AC8: The plugin page paragraph of `README.md`, the plugin page
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
- [x] T5: Update the README paragraph and the DESIGN.md plugin page
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
- 2026-10-29: T5: README's plugin page paragraph, DESIGN's plugin page sentence, and a new CHANGELOG entry describe the header block, the four cards, and the report buttons; README drops its sentence on the reports and links, which the card sentence now covers. `pnpm test` 1050 passed, `pnpm check` 0 problems.
- 2026-10-29: claim audit: 29 claims read, 7 corrected — CHANGELOG.md, README.md, site/src/layouts/Base.astro, test/site.test.ts. The re-read found one README sentence still missing the failure page; fixed with the reader's wording. The dark-block check now compares color names, not counts.
- 2026-10-29: all tasks done; status set to review.
- 2026-10-29: step-7 approval: m048-plugin-page-sections approved for merge

## Decisions

## Review

- consistency gate: `cairn_validate.py` all checks passed (1 advisory: sizing, 8 criteria, logged at plan); no principle changed, so no `cairn_impact`; the generic profile names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- AC1: `pnpm exec vitest run test/site.test.ts` — "opens the main content of %s with a header block of the name and the description" passed for all 9 fixture ids (the block is `div.card.page-head`, holds exactly the h1 with its archived mark and the `shownDescription` line, and `<main>` holds no `<header`).
- AC2: "shows the sections of %s in order, each with its facts" passed for all 9 ids: Declared support, Start test (no-range-plugin only), User reports (the 7 read records), About; "holds the minor facts of %s in a closed Details section after the sections" passed for all 9.
- AC3: the same section test asserts each section's markers in order and that each fact marker appears exactly once on the page; the Details test asserts the id, repository, release, and override facts inside `<details>`, as on main at 48ef631.
- AC4: built the fixture site at 48ef631 (detached worktree) and at the branch head; for all 9 pages the Works, Broken, repository, and releases `href` values are equal (7 pages with 4 links, the 2 failed-read pages with the repository link only).
- AC5: `Base.astro` defines `--card-border`, `--card-radius`, `--card-padding` beside `--card` in `:root`; the `.plugin, .card, details` rule takes all four from them (`.card` is on the header block and each of the four sections, `.plugin` on the home rows); `.button[data-report="works"]` uses `--all-text` on `--all-bg` and `[data-report="broken"]` `--broken-text` on `--broken-bg`, defined in the light and the dark block; after the review fixes the test "colors each report button from its verdict's pair" checks both rules.
- AC6: "gives each listed text and background pair a contrast of at least 4.5:1" passed in light and dark (10 pairs, dark keys equal light keys); the color declarations added in `git diff 48ef631 -- site/src/layouts/Base.astro` set only `--muted` on `--card` (h2), the two button pairs, and `--card` behind `details` text, all in the list; the forced-colors rule uses system colors.
- AC7: fixture site rebuilt at the head after the review fixes and served at `/zotero-plugin-index/` (port 4324); 18 of 18 iframe loads (9 pages × 360 and 1280 px, Details open) gave `scrollWidth <= clientWidth`; the page carries one inline `<style>` and no stylesheet link.
- AC8: README plugin page paragraph (`README.md:75-80`), DESIGN plugin page sentence (`cairn/DESIGN.md:64-71`), and the CHANGELOG Unreleased entry describe the header block and the four cards; `pnpm test` 1050 passed, 6 skipped; `pnpm check` 48 entries, 0 problems.
- ripple #1: CHANGELOG.md:134 says the repository and releases links sit "under the declared range"; they are now in About — fix now
- ripple #2: cairn/DESIGN.md:150 calls the report controls a "Works" link and a "Broken" link, against the file's new "button" — fix now
- ripple #3: CHANGELOG.md:170 says the page shows a "Works" link and a "Broken" link — reject (false): they are still `<a>` links, and the new entry records that they look like buttons
- ripple #4: cairn/LESSONS.md:23 quotes "Report that it" — reject (false): a record of the M021 bug, not a claim about the current page
- prior-review #1: the report buttons' fills are 1.07 to 1.27:1 against the card and their border is transparent, so a button has no visible edge, the point M037's review raised for the version buttons — fix now: `.button` border is `currentColor` (the text color, at least 3:1 on `--card` in both schemes), and a new test checks the rule and those pairs; it failed on a planted transparent border
- diff-bug #1: the Works and Broken links left the sentence, so in a link list they read only "Works" and "Broken" (WCAG 2.4.4) — fix now: the prompt `<p>` has `id="report-prompt"` and each button `aria-describedby="report-prompt"`; the report link test checks both
- diff-bug #2: no test checks AC5's button colors or the `button` class — fix now: a "site colors" test matches each `.button[data-report]` rule to its pair, and the report link test matches `class="button"`
- diff-bug #3: `sections()` would miss a stray h2 or a section with another class before `<details>` — fix now: the section test counts every `<section` and `<h2` from `<main>` to `<details>` against the sections found
- diff-bug #4: the lazy `</section>` match would cut a card that held a nested section — reject (false): no card holds one, and the count from diff-bug #3 fails on a nested section
- diff-bug #5: the Details test's "About before `<details>`" line repeats the section test — fix now: removed
- diff-bug #6: the dark-keys check runs the same in both scheme cases — fix now: its own test
- diff-bug #7: `details` copied the card declarations without the card's margin rules, and its Overrides h2 showed at full size — fix now: `details` joins the `.plugin, .card` rule, gets the last-child margin rule, and shares the card h2 style
- diff-bug #8: the Overrides h2 inside Details reads as a sibling of About in the outline — follow-up: candidate row "Fix the Overrides table's heading level" (predates the diff)
- diff-bug #9: the sections have no accessible name, so they are not region landmarks — reject (false): the plan asked for titled cards, not landmarks; the h2s carry heading navigation
- diff-bug #10: uppercase h2s may be spelled out — reject (false): `text-transform` leaves the DOM text "Declared support", which screen readers read
- diff-bug #11: `.reports p` repeats `.card p` — reject (style)
- diff-bug #12: the stylesheet grew past Astro's 4 KB inline limit, so each page now links `_astro/Base.*.css` where main inlined it — fix now: `inlineStylesheets: "always"` in `site/astro.config.ts`; a built-site test checks a `<style>` and no stylesheet link on every page, and failed with the setting removed
- diff-bug #13: README's "Unknown (no translations found)" sentence sits after the start-test note — fix now: moved beside the languages sentences
- diff-bug #14: README, DESIGN, and CHANGELOG omit the "No declared range" line, and DESIGN omits the read conditions — fix now: all three name it, and DESIGN names the conditions
- blame-history #1: Details became a filled card, which no criterion names, replacing M015's top border — reject (planned change): Scope In covers the CSS the plugin pages use, and the card look is the Goal; named at the implement hand-off
- blame-history #2: the repository and releases links moved below the reports, reversing M015's placement — reject (planned change): the plan question set chose it
- blame-history #3: "Declared support" heads a card that says the build could not read the plugin — reject (planned change): AC2 names that heading on every page
- blame-history #4: nothing stops a section from moving below Details — fix now: same fix as diff-bug #3
- blame-history #5: the M021 report sentence was replaced — reject (planned change): noted as no regression by the lens itself
- blame-history #6: the "Start test" heading names a test against D-023's start-fact wording — reject (false): D-023 keeps start results apart from works verdicts, which the separate card and its note do
- blame-history #7: `.links` margin and gap changed and the `.start-tests` class left — reject (planned change): restyling the plugin page CSS is Scope In, and no rule used the class
- blame-history #8: DESIGN's link wording — reject (false): already fixed by ripple #2
- review fixes re-verified: `pnpm test` 1055 passed, 6 skipped; `pnpm check` 0 problems; `cairn_validate.py` all checks passed.
