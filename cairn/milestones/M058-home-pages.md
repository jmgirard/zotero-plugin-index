# M058: Page the home table

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — it changes what the home page shows and adds an address parameter
- **Branch/PR:** m058-home-pages

## Goal

When its script runs, the home table shows the plugins that its filters pass 50 at a time, with a numbered pager, so the 272-plugin index stays easy to scan.

## Scope

**In:** paging in the home page script over the rows the search box, the language menu, and the version buttons
pass; a pager below the table; a `page` address parameter with Back and Forward; pure helpers in
`src/site/home-filter.ts`; README and CHANGELOG.

**Out:** the page's weight and the full list that paints before the script pages it, which stay in row "Filter
the home list before it paints" (extended by this plan); pages built as separate HTML files, which would need the
filters to read the data file (not asked for).

## Acceptance criteria

- [x] AC1: When the script runs, the home table shows at most 50 of the rows that the search box, the language
      menu, and the version buttons pass, in table order: on page `p` it shows the passed rows numbered
      50(p−1)+1 to 50p, counting from 1, and hides the rest. P, the number of pages, is the passed rows divided by
      50, rounded up, and at least 1. A pager below the table, a `nav` labeled "Pages", holds a Previous button,
      the text "Page p of P" in a polite live region, and a Next button. At page 1 Previous, and at page P Next,
      has `aria-disabled="true"` and does nothing when pressed. The pager is hidden when the filters pass 50 rows
      or fewer, and it is hidden in the built HTML whatever display its other style rules give it, so a page
      without JavaScript shows every row and no pager. The count beside the filters still counts every row the
      filters pass, on all pages. Tests: page-count helper cases for 0, 1, 50, 51, 100, 101, and 272 passed
      rows; page-rows helper cases for the first, a middle, and the last page of 272; and the built script run in
      `node:vm` over at least 101 rows, where page 1 shows the first 50 passed rows, the pager reads "Page 1 of
      P", Previous has `aria-disabled="true"`, the count with no filter on reads the total, a filter that passes
      more than 50 rows gives a count of "N of M plugins" with N over 50, a filter that passes exactly 50 rows
      hides the pager, and one that passes 51 shows "Page 1 of 2".
- [x] AC2: A press of Next or Previous shows that page, scrolls the table's top into view, drops any address
      write that typing left waiting, and adds a history entry with `pushState` whose address has `page=<p>` for p
      of 2 or more and no `page` parameter for page 1. Each input event of the search box, change of the menu,
      and click of a version button shows page 1; the address loses `page` when the filters' write runs, after
      the typing pause for the search box. On load, and when Back or Forward changes the address, the script
      reads the filter parameters first, then the first `page` parameter: a value that is a whole number from 2
      to P, in digits with no sign or leading zero, shows that page, and any other value shows page 1 and is
      removed from the address with `replaceState`. Every address the filters or the load write keeps a `page`
      that names the page shown, other than 1. Tests in the `node:vm` run: Next writes `?page=2` and shows passed
      rows 51 to 100; Next again writes `?page=3`; Previous on page 3 writes `?page=2`; Previous on page 2 writes
      no `page`; Next at page P writes nothing; typing then Next before the pause, then the timers, leaves
      `page=2`; a search input and a menu change on page 2 each show page 1 and remove `page`; `?page=3` on load
      shows passed rows 101 on; `?page=1`, `?page=`, `?page=0`, `?page=-2`, `?page=x`, `?page=02`, and a page
      past P each show page 1 and are removed; a `q` that passes 20 rows with `page=2` shows page 1 and removes
      `page`; Back to an address with `page=2` shows page 2, and Back to one with no `page` shows page 1.
- [x] AC3: README's home page section states that the table shows 50 plugins a page when the script runs, the
      pager, the `page` parameter and what the page does with a value that names no page, that a filter change
      goes back to page 1, that the count covers the plugins on every page, and that a page without JavaScript
      lists every plugin. `CHANGELOG.md`'s Unreleased section has an entry for the pages.
- [x] AC4: `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check` pass.

## Coverage

- AC1 → T1, T2, T3
- AC2 → T2, T3
- AC3 → T4
- AC4 → T5

## Tasks

- [x] T1: Add the paging helpers to `src/site/home-filter.ts` (page count, the rows of a page, the page an
      address names), with tests beside the existing helper tests.
- [x] T2: Add the pager markup to `site/src/pages/index.astro` and the paging to its script: count passed rows
      apart from paged-out ones, hide rows off the page, the Previous and Next handlers, `pushState`, the
      scroll, page 1 on a filter event, and `page` read on load and on `popstate` after the filters; the pager's
      styles in `site/src/layouts/Base.astro` with the `[hidden]` rule its controls already have.
- [x] T3: Let `homeScript` in `test/site.test.ts` take generated rows beside the built ones, with stand-ins for
      the pager, `pushState`, and `scrollIntoView`, and write the AC1 and AC2 script tests.
- [x] T4: README home section and a CHANGELOG entry.
- [x] T5: Run the verify slot; look at the built home page in the browser pane at 375 px and at desktop width,
      with the iframe width check (LESSONS M048) and the 375 px look (LESSONS M054), built from the deployed data
      file (LESSONS M035).

## Work log

- 2026-10-30: created by /milestone-plan.
- 2026-10-30: tier check: milestone — new page behavior, an address parameter, and a design choice of pager.
- 2026-10-30: idea vet: gap — "pagination" could mean pages built as separate files or paging in the script; reading taken: script paging over the filtered rows, which keeps search, filters, and the count across every plugin, as the source row asks. No flaw.
- 2026-10-30: lessons used: 2026-10-25 (M007), 2026-10-27 (M024), 2026-10-28 (M035), 2026-10-28 (M037), 2026-10-29 (M048, iframe width), 2026-10-29 (M053), 2026-10-29 (M054).
- 2026-10-30: collision check: absorbs candidate row "Page the home table as it grows"; D-026 allows the script and needs the page to read in full without it, which the hidden pager keeps; row "Filter the home list before it paints" stays out and gains this plan's effect (more rows paint, then hide).
- 2026-10-30: inbox sweep: no open issues; 18 open bot pull requests, none about the site; no disposition.
- 2026-10-30: criteria audit (full, fresh Opus reader): 16 findings, all taken: P defined and at least 1; the count counts passed rows on all pages, with a probe over 50; the pager's `[hidden]` holds against its display rule; 50/51 and 100/101 boundaries; generated rows in the `node:vm` run, not a second site build; `aria-disabled` and a live region instead of `disabled`; scroll to the table's top; Next drops a waiting typing write, and filter, load, and Back writes keep `page`; filters read before `page`; every filter event resets the page; more invalid forms and first-parameter reading; 2 to 3 and back; README's count wording; the paint row extended.
- 2026-10-30: question set: pager style — numbered pages with Previous and Next and `?page=`; page size — 50.
- 2026-10-30: plan gate chose numbered pages with `pushState` over a "Show more" button, at the user's choice, because a page can be linked and Back returns to it; falsified by visitors who lose their place more often with pages than with a growing list.
- 2026-10-30: plan gate chose paging in the script over pages built as separate files because the filters and the count already need every row in the page; falsified by a page weight that the `?page` view alone would cut enough to matter.
- 2026-10-30: implement started on branch m058-home-pages.
- 2026-10-30: T1 to T3 done: `PAGE_SIZE`, `pageCount`, `onPage`, and `chosenPage` in `src/site/home-filter.ts` (25 helper tests); the pager `nav` (hidden in the HTML, `.pager[hidden]` in Base.astro's hide rule) and the script's paging: `passed()` counts rows apart from paging, rows off the page hide, Previous and Next check `aria-disabled`, drop a waiting typing write, `pushState`, and scroll `.table-card`; filter events set page 1; load and `popstate` read the filters, then `page`. `homeScript` takes generated rows and stand-ins for the pager, `pushState`, and `scrollIntoView`; 17 paging tests. Planted counting by visible rows, a kept typing write, and no end check turned 3 red. `pnpm test` 1328 passed, `pnpm check` 272 entries clean.
- 2026-10-30: T5 done: verify slot clean (1328 tests; 272 entries). Browser pane: the deployed data had 58 plugins (the build after the backfill had not run), so the look used it copied to 174 rows (ids `copy2-`, `copy3-`), built with `pnpm site --out` and served by a `.claude/launch.json` entry (`m058-look`). Page 1 showed 50 of 174, "Page 1 of 4", count "174 plugins", Previous `aria-disabled="true"`; Next went to `?page=2`, rows 51 to 100, the table's top at 0, focus kept on Next; Back went to page 1. Iframes of `?page=4` at 375, 760, and 1200 px: `scrollWidth` equals `clientWidth`. Screenshots at 375 px and 1024 px show the pager on one line, Next greyed on page 4.
- 2026-10-30: claim audit: 46 claims read, 5 corrected — README.md, CHANGELOG.md, src/site/home-filter.ts, site/src/pages/index.astro. Fixed: "pager paragraph", Back returns to the address before (filters included), the ends do nothing, a filter change shows page 1 at once while the search box's address drops `page` after the typing pause, and the CHANGELOG's pager and page-number conditions; plus 4 stale comments (home-filter header, `filterStatus`, `filterHref`, `fromAddress`). The re-read found the `fromAddress` comment still wrong for `?page=1`, now fixed. Also rewrapped README lines that earlier edits joined.
- 2026-10-30: T4 done: README's opening paragraph and home section (the count covers every page; a new paragraph for the pager, `page`, Back, and the reset to page 1; the script paragraph names the pager) and a CHANGELOG entry.
- 2026-10-30: review started; origin/main an ancestor of the branch; Copilot round off.
- 2026-10-30: step-7 approval: m058-home-pages approved for merge

## Decisions

- 2026-10-30 (review): Previous and Next add history entries with `pushState`, narrowing M037's milestone-local rule that the address is replaced, not pushed. The search box, the menu, the buttons, load, and Back still replace it. Reason: the user chose numbered pages that Back steps through (plan question set).

## Review

- AC1: 2026-10-30, `pnpm test` 1328 passed. `test/home-filter.test.ts`: page counts for 0, 1, 50, 51, 100, 101, 272 passed rows (1, 1, 1, 2, 2, 3, 6); page rows for pages 1, 3, 6 of 272 (0–49, 100–149, 250–271). `test/site.test.ts` "pages", over the 13 built rows and 120 generated: page 1 shows the first 50 rows, "Page 1 of 3", Previous `aria-disabled="true"`, count "133 plugins"; `?q=bulk` gives "120 of 133 plugins" and its first 50; a 50-row filter sets the pager `hidden` and a 51-row filter shows "Page 1 of 2". The built HTML holds the pager `nav` with `hidden`, and `.pager[hidden]` is in the `display: none` rule. Implement planted counting by visible rows; the count test went red.
- AC2: `test/site.test.ts` "pages" (passed 2026-10-30): Previous on page 1 pushes nothing; Next pushes `?page=2` and shows rows 51–100, Next `?page=3`, Next at page 3 nothing, Previous `?page=2`, Previous the address with no `page`; 4 scrolls of `.table-card`; no `replaceState`. Typing "bulk", then Next, then the timers: pushes `?q=bulk&page=2`, no write. On `?page=2`, a search input shows page 1 at once and the timers write `?q=bulk`; a menu change writes the address with no `page`. `?page=3` on load shows rows 101 on with no write; `page=1`, empty, `0`, `-2`, `x`, `02`, and `4` each show page 1 and write the address without it; `?q=gamma&page=2` (20 rows) shows page 1 and writes `?q=gamma`; popstate to `?page=2` shows rows 51–100 and to no `page` shows page 1. The browser look (T5) showed Next scroll the table top to 0 and Back return to page 1. Planted no end check and a kept typing write turned tests red.
- AC3: joined README (LESSONS M018), 2026-10-30, each once: "Its script shows 50 at a time", "The table shows 50 of the plugins that the filters pass at a time", the pager reading "Page p of P", the `page` query parameter, "the page shows page 1 and removes the parameter", "shows page 1 at once" for a filter change, "The count covers the plugins on every page", and "Without JavaScript, the home page shows none of them and lists every plugin". The Unreleased CHANGELOG holds the pages entry once.
- AC4: 2026-10-30: `npx -y pnpm@12.15.0 test` 24 files passed, 1 skipped, 1328 tests passed, 6 skipped; `npx -y pnpm@12.15.0 check` "checked 272 entries in plugins, 0 problems".
- consistency gate: `cairn_validate.py` all checks passed; no principle changed; the `generic` profile names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: typing, then Next within half a second, then Back returns to the address before the typing, not page 1 of the typed search — follow-up, row "Close small gaps on the site pages" (6), promote when a user reports it; AC2 asks Next to drop the waiting write.
- diff-bug #2: "Page p of P" and the count are both polite live regions, so a keystroke that changes the page count announces both — follow-up, same row (6).
- diff-bug #3: in forced colors an end button looks enabled — fix now: a `forced-colors` rule gives `aria-disabled` buttons `GrayText`, fixed 7b6cd08.
- diff-bug #4: the scroll to `.table-card` leaves the toolbar above it off-screen — reject (planned change): AC2 names the table's top.
- diff-bug #5: `?page=2` stays in the address for half a second after a search input — reject (planned change): AC2 and the README state it.
- diff-bug #6: a reload at `?page=3` paints the full list first — follow-up, row "Filter the home list before it paints", which the plan extended with this case.
- diff-bug #7: the `Math.min` clamp in `show()` never fires — reject (style): a guard with no effect.
- diff-bug #8: `data-page-step` was never read; the script chose buttons by order — fix now: the script reads `dataset.pageStep` for the step and the end, fixed 7b6cd08.
- diff-bug #9: a duplicate `page` parameter keeps its second value — reject (edge): only a hand-edited address with two `page` values reaches it, outside common use, and the page shown is still the first value's.
- diff-bug #10: seven invalid `page` values run one script path — reject (planned change): AC2 names each.
- diff-bug #11: some helper cases repeat paths — reject (planned change): AC1 names them.
- diff-bug #12: the paging tests hard-code 3 pages from a 13-row fixture — fix now: `PAGES` from the fixture size, a named test that it is 3, and the past-P case `PAGES + 1`, fixed 7b6cd08.
- diff-bug #13: generated rows slice the selector text — reject (style): the built-row stand-ins do the same.
- diff-bug #14: no test for a version button on page 2 or page status after popstate — reject (false): the button shares `update()` with the tested menu change, and popstate runs `show()`.
- blame-history #1: a Forward entry can restore filters that a later change replaced — reject (planned change): each pushed entry keeps its own address by design.
- blame-history #2: M037 recorded "address replaced not pushed"; Previous and Next now push — fix now: a milestone-local decision records it, below, and DESIGN states both.
- blame-history #3: DESIGN does not mention the pager — fix now: the home paragraph, the count, `home-filter.ts`'s exports, and the script's history, fixed 7b6cd08.
- blame-history #4: the pager's live region repeats the M044 announcement gap — follow-up, row (6).
- blame-history #5: README's opening said "lists every plugin" and "shows 50" side by side — fix now: it says which holds without and with JavaScript, fixed 7b6cd08.
- blame-history #6: the count's N now counts every page — reject (false): the README and DESIGN say so.
- prior-review #1: `?page=3` paints the top rows first — follow-up, row "Filter the home list before it paints", extended by the plan.
- prior-review #2: the pager's first text is written while hidden, and it changes per key — follow-up, row (6).
- prior-review #3: the page weight after the change is not measured — fixed by measuring: `main` and the branch built from the same 174-row data give home pages of 539,981 and 541,723 bytes, 22,946 and 23,476 bytes gzipped at level 9 (2026-10-30).
- prior-review #4: the pager button edge is outside the contrast guard and has no forced-colors rule — fix now: `.pager button` joins the edge test, and the forced-colors rule above, fixed 7b6cd08.
- prior-review #5: the pager's clicks run only against stand-ins — follow-up, row "Test the home page script in a browser", extended.
- ripple #1: DESIGN said the home page lists the plugins in one table with no pager — fix now, fixed 7b6cd08.
- ripple #2: DESIGN said the count gives how many plugins show — fix now, fixed 7b6cd08.
- ripple #3: README said "All languages" shows every plugin — fix now: "passes", fixed 7b6cd08.
- ripple #4: CHANGELOG's site entry said the home page lists every plugin — fix now: it points to the pages entry, fixed 7b6cd08.
- ripple #5: CHANGELOG says the home page lists the plugins in one table — reject (false): it still is one table.
- ripple #6: `rowShows`'s comment said whether the table shows a row — fix now, fixed 7b6cd08.
- ripple #7, #8, #9: DESIGN's parameter list, `home-filter.ts` exports, and script history omitted the pager — fix now, fixed 7b6cd08.
- ripple #10: Base.astro's home comment omitted the pager — fix now, fixed 7b6cd08.
- ripple #11: an older CHANGELOG entry describes a "Showing N of M" line that M053 replaced — reject (false): a pre-existing change record this diff does not touch, and the M053 entry describes the count.
- ripple #12: the source row still reads as open — reject (false): its `started M058` token graduates it at hygiene.
- after the fixes (7b6cd08): `pnpm test` 1329 passed, 6 skipped; `pnpm check` 0 problems. No finding met the return floor.
