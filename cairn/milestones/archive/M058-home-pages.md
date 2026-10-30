# M058: Page the home table

**Status:** done (2026-10-30, PR #339 https://github.com/jmgirard/zotero-plugin-index/pull/339)

**Goal:** When its script runs, the home table shows the plugins that its filters pass 50 at a time, with a numbered pager, so the 272-plugin index stays easy to scan.

**Outcome:** `src/site/home-filter.ts` gains `PAGE_SIZE` (50), `pageCount` (at least 1), `onPage`, and `chosenPage`
(digits 2 to P, no sign or leading zero, else 1). `site/src/pages/index.astro` adds a `nav` "Pages" pager, hidden in
the HTML (`.pager[hidden]` in Base.astro's hide rule), with Previous, a `role="status"` "Page p of P", and Next,
chosen by `data-page-step`. The script counts `passed()` rows apart from paging, hides rows off the page, marks the
ends `aria-disabled` (a `forced-colors` rule greys them), and on Previous or Next drops a waiting typing write,
`pushState`s `?page=<p>` (none for page 1), and scrolls `.table-card` into view. Each filter event shows page 1;
load and `popstate` read the filters, then `page`, removing a value that names no page. `homeScript` takes 120
generated rows with stand-ins for the pager, `pushState`, and `scrollIntoView`; the pager joins the edge-contrast
test. Browser pane on 174 rows: Next to `?page=2`, Back to page 1, no sideways scroll at 375 to 1200 px. Paging
adds 530 bytes gzipped to that page (22,946 to 23,476).

**Decisions:** milestone-local: Previous and Next push history entries, narrowing M037's replace-only rule; the
filters, load, and Back still replace.

**Review:** Criteria audit (full) 16 findings, all taken; claim audit 46 claims, 5 corrected, plus 4 stale comments
and 1 on re-read. Four-lens fan-out, 37 findings: 17 fixed (forced colors, `data-page-step`, contrast guard, page
counts from the fixture, DESIGN and docs, the M037 decision), 7 follow-up into "Close small gaps on the site pages"
(6), "Filter the home list before it paints", and "Test the home page script in a browser", 13 rejected (1 edge).
No return. CI passed. "Page the home table as it grows" graduated. 13 lessons marked used, none captured.
