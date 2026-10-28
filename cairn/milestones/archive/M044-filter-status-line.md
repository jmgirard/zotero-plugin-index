# M044: Say how many plugins the filters show

**Status:** done (2026-10-28, PR #77 https://github.com/jmgirard/zotero-plugin-index/pull/77)

**Goal:** When a site visitor filters the home list, the page says how many plugins the filters show, or says that none match.

**Outcome:** `src/site/home-filter.ts` gained `filterStatus(shown, total, filtering)` ("" with no filter on, `No plugins match these filters.` at 0, else `Showing N of M plugins.`, "plugin" when M is 1) and `filterOn(filter)` (value not "" and an option has it), which `passes` and the script now share. The home page holds `<p class="filter-status" role="status" data-filter-status hidden></p>` between the version buttons and the list; the one script (D-019) writes it in `show()` with the rows not hidden and `rows.length`, and unhides it with the controls. `.filter-status:empty` drops the margin but keeps the live region displayed. README, CHANGELOG, and DESIGN follow. The plan parked "Filter the home list before it paints": the deployed page was 8,174 bytes and its script ran about 4 ms after the last byte. Hand check only, no browser test, at the user's choice.

**Decisions:** none. Plan choices: status line only, count and no-match texts, empty with no filter.

**Review:** Plan audit 11 findings, 8 fixed, 3 lapsed with the parked paint criterion. Claim audit: 33 claims, 2 corrected. Hand check on the deployed data (42 rows) and the fixture (no deployed language and major pair hides every row). Review pass (four lenses): 23 findings; 7 fixed in 8e381e3 (`filterOn`, the placement regex, stale DESIGN and header text); 8 follow-ups to new row "Close gaps around the filter line" (screen-reader announcements on load and on an unchanged count, the line's paint shift, no browser test of the line, README line 46); 6 rejected; 2 noted. CI green; merged as 95340c9. Row "Say when the filters hide every plugin" graduated. Lessons: 9 marked used M044; none captured.
