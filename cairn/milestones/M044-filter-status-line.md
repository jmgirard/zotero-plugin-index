<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M044: Say how many plugins the filters show

- **Status:** review   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** normal   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** —   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** —   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** user-facing — site visitors see the new line   <!-- owner: plan · create/amend-via-gate; user-facing | internal — <one-clause reason>; skill conduct only — no validate check parses it -->
- **Branch/PR:** m044-filter-status-line   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

## Goal
<!-- owner: plan · create; a wrong goal returns to plan, never edited in place -->

When a site visitor filters the home list, the page says how many plugins
the filters show, or says that none match.

## Scope
<!-- owner: plan · create/amend-via-gate -->

**In:** A pure function `filterStatus` in `src/site/home-filter.ts` that
gives the line's text. A status line on the home page between the version
buttons and the list, hidden in the HTML. The page's one script writes the
line each time it sets the rows, and unhides the line when it unhides the
controls. README, CHANGELOG, and DESIGN text for the line. This absorbs the
candidate row "Say when the filters hide every plugin".

**Out:** Filtering the list before the first paint: the row "Filter the
home list before it paints" stays as a parked candidate (the plan question
set chose this). An automated browser test: the row "Test the home page
script in a browser" holds it (the user chose a hand check). A "Show all
plugins" button in the line: not chosen at the plan question set.

## Acceptance criteria
<!-- owner: plan · create/amend-via-gate; review reads, never reinterprets. -->

- [x] AC1: `filterStatus(shown, total, filtering)` in
      `src/site/home-filter.ts` returns `""` when `filtering` is false. When
      `filtering` is true and `shown` is 0, it returns
      `No plugins match these filters.` For other values, it returns
      `Showing <shown> of <total> plugins.`, with `plugin` in place of
      `plugins` when `total` is 1. A test in `test/home-filter.test.ts`
      asserts the exact text for four inputs: `filtering` false, `shown` 0,
      `total` above 1, and `total` 1.
- [x] AC2: The built home page holds exactly one element with
      `data-filter-status`, written as `<p class="filter-status"
      role="status" data-filter-status hidden></p>`. It sits after the
      closing tag of the `version-filter` div and before
      `<ul class="plugins">`. The page still holds exactly one `<script`
      element. `test/site.test.ts` asserts these facts.
- [x] AC3: A hand check in the browser pane, on a site built from the
      deployed `v1/plugins.json`, reads the line after the script runs. The
      line has no `hidden` attribute. With "All languages" and "Any version",
      its text is empty. For one language and for one major, it reads
      `Showing N of M plugins.`, where N is the count of `li.plugin` rows
      with no `hidden` attribute and M is the count of `li.plugin` rows. For
      a language and a major that hide every row, it reads
      `No plugins match these filters.` If the deployed data has no such
      pair, the check uses a site built from the test fixture for that case.
- [x] AC4: `README.md` and the new `CHANGELOG.md` entry under
      `## Unreleased` each hold `No plugins match these filters.` and
      `Showing N of M plugins.` A search of a joined copy of each file finds
      both. The `src/site/home-filter.ts` function list in `cairn/DESIGN.md`
      names `filterStatus`.
- [x] AC5: `pnpm test` and `pnpm check` pass.

## Coverage
<!-- owner: plan · create/amend-via-gate -->

- AC1 → T1
- AC2 → T2
- AC3 → T2, T4
- AC4 → T3
- AC5 → T5

## Tasks
<!-- owner: plan (create) / implement (check-off, minor edits); substantive
     change is amend-via-gate. -->

- [x] T1: Add `filterStatus` to `src/site/home-filter.ts` with a comment in
      the file's style. Add its four cases to `test/home-filter.test.ts`, run
      before the function exists, so each fails first.
- [x] T2: In `site/src/pages/index.astro`, add the hidden status `<p>`
      between the `version-filter` div (lines 35-47) and the list (line 48).
      In the script, have `show()` write `filterStatus` into the line, with
      the count of rows it leaves shown, `rows.length`, and whether the
      language or the major is not `""`. Unhide the line beside the two
      controls (lines 117-118). Add a `.filter-status` style in
      `site/src/layouts/Base.astro` if the line needs one. In
      `test/site.test.ts`, assert AC2 in the form of the existing menu and
      button tests, and keep the one-script test.
- [x] T3: Add the line to the README's home page paragraphs (lines 30-62),
      a `CHANGELOG.md` entry under `## Unreleased`, and `filterStatus` to the
      DESIGN.md function list (near line 244) and its home page text (near
      line 49). Keep prose near 76 columns, and list long added lines with
      `git diff -U0 main | grep '^+' | awk 'length > 80'`.
- [x] T4: Hand check AC3. Download the deployed `v1/plugins.json`, run
      `pnpm site --out <dir>`, serve it with a `.claude/launch.json` entry
      kept out of git, and read each case with `read_page` or JavaScript.
      Check the page's nesting with `DOMParser`. Write each case's address
      and the text read in the work log for review.
- [x] T5: Run `pnpm test` and `pnpm check` (through
      `npx -y pnpm@12.15.0`).

## Work log
<!-- owner: any skill · append-only; one line per entry; absolute dates. -->

- 2026-10-28: created by /milestone-plan.
- 2026-10-28: tier check: milestone — new home page behavior, and the line's text was a choice for the user.
- 2026-10-28: idea vet: one concern. The flash that "Filter the home list before it paints" fixes is likely invisible: the deployed home page was 8,174 bytes over the wire, and its script ran about 4 ms after the last byte. The question set chose the status line only and parked that row. No concern on the status line.
- 2026-10-28: question set: automated browser test — hand check only, no new dev dependency (asked in the first plan run this session, restated in this run's argument).
- 2026-10-28: question set: paint fix — status line only, park the row.
- 2026-10-28: question set: line text — a count while a filter is on, the no-match text at zero, empty with no filter.
- 2026-10-28: plan gate chose the status line only over a classic script built from the tested functions and over a second script, because the flash was not seen at 8,174 bytes; falsified by a home page over about 14 KB over the wire or a reported flash.
- 2026-10-28: collision check: row "Say when the filters hide every plugin" absorbed in full. Row "Filter the home list before it paints" made parked with a promotion condition. D-014 and D-019 hold, so the page keeps one script. M024 and M037 shipped the filters. Row "Test the home page script in a browser" stays.
- 2026-10-28: inbox sweep: 0 open issues; 1 open pull request (#57, a discovery bot pull request), no overlap.
- 2026-10-28: criteria audit (full mode, fresh Opus reader): 11 findings and 1 pass. Fixed 8 on these criteria: four inputs named and no removal clause (AC1), exactly one element (AC2), the script unhides the line, a Back case dropped since the script only replaces history entries, the no-JavaScript case read from the built HTML through AC2, M defined with a fixture fallback, and the recording moved to T4 (AC3), the doc texts and the DESIGN site named (AC4). 3 findings on the paint criterion lapsed when the question set parked it.
- 2026-10-28: lessons used: 2026-10-25 (M001), 2026-10-25 (M007), 2026-10-26 (M015), 2026-10-26 (M018), 2026-10-27 (M021), 2026-10-27 (M024), 2026-10-28 (M035), 2026-10-28 (M036), 2026-10-28 (M037).
- 2026-10-28: started /milestone-implement on branch m044-filter-status-line, cut from main at 0a947f0.
- 2026-10-28: T1 done: `filterStatus` in `src/site/home-filter.ts`; its four `test/home-filter.test.ts` cases failed with "filterStatus is not a function" first, then passed. `pnpm test` 940 passed, 1 skipped; `pnpm check` 0 problems.
- 2026-10-28: T2 done: hidden `<p class="filter-status" role="status" data-filter-status hidden>` between the version buttons and the list; `show()` writes `filterStatus` (rows not hidden, `rows.length`, language or major not ""), and the script unhides the line with the controls. Chose `.filter-status:empty { margin: 0 }` over `display: none` for the empty line, so the live region stays in the page and screen readers hear each new text. The new `test/site.test.ts` case failed with index.astro stashed (`match` gave null), then passed. `pnpm test` 941 passed, 1 skipped; `pnpm check` 0 problems.
- 2026-10-28: T3 done: README paragraph after the version buttons, CHANGELOG entry at the end of `## Unreleased`, DESIGN home page text and `home-filter.ts` list. Joined-copy search: each of README and CHANGELOG holds each of the two texts once; DESIGN names `filterStatus`. No added prose line over 80 columns. The simple-english hook flags the README sentence ending in "Showing N of M plugins." as long because it does not split after a period inside quotes; the sentence has 16 words, so it stays. The CSS comment in `Base.astro` was reworded to state only what the rule does.
- 2026-10-28: T4 hand check (browser pane, `python3 -m http.server` on a site built at 529e8a1, deployed `v1/plugins.json` downloaded 2026-10-28, 42 rows): no parameter → line not hidden, text "", 42 shown, margin 0px; `?language=zh` → "Showing 27 of 42 plugins.", 27 rows not hidden; `?zotero=7` → "Showing 25 of 42 plugins.", 25; `?language=de&zotero=10` → "Showing 8 of 42 plugins.", 8; `?language=xx` → address cleared, text ""; menu set to ja → "Showing 5 of 42 plugins.", 5; then button 8 → same, 5; then All languages and Any version → "". The deployed data has no language and major pair that hides every row, so per AC3 the fixture build (`test/fixtures/site/plugins.json`, 9 rows) was used: `?language=es&zotero=10` → "No plugins match these filters.", 0 rows shown, margin 16px. `DOMParser` on the page: the line's next sibling is `ul.plugins`.
- 2026-10-28: T5 done at 529e8a1 (also covers T3's files): `pnpm test` 19 files, 941 passed, 1 skipped; `pnpm check` 42 entries, 0 problems.
- 2026-10-28: claim audit: 33 claims read, 2 corrected — README.md, CHANGELOG.md (M now "the number that the page lists, shown or not"), site/src/pages/index.astro (the no-JavaScript comment names the status line); the same reader re-read both and found them true. Left as is: the docs do not mention the singular "plugin" when M is 1, since the index lists more than one plugin. Not fixed here (text outside this branch, and ROADMAP is at 59 of 60 lines): README line 46 says an unknown `language` parameter shows every plugin, but not that the page removes the parameter, as the `zotero` paragraph says. Review can dispose of it.
- 2026-10-28: after the claim audit fixes: `pnpm test` 941 passed, 1 skipped; `pnpm check` 0 problems. Status set to review.
- 2026-10-28: review fix-now: `filterOn` added to `src/site/home-filter.ts` and used by `passes` and the script; its three `test/home-filter.test.ts` cases failed with the function missing, then passed. Placement regex pinned to the version-filter markup. DESIGN script paragraph and function list, and the `home-filter.ts` header, name the status line. `pnpm test` 944 passed, 1 skipped; `pnpm check` 0 problems. Browser pane on rebuilt sites: no parameter → ""; `?language=zh` → `Showing 27 of 42 plugins.`; `?zotero=8&language=xx` → address becomes `?zotero=8`, `Showing 30 of 42 plugins.`; fixture `?language=es&zotero=10` → `No plugins match these filters.`

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive. -->

Evidence at 9061f59, branch level with main at 0a947f0, 2026-10-28.

- AC1: `vitest run test/home-filter.test.ts --reporter=verbose`: the four `filterStatus` cases pass ("no filter is on" → "", "a filter hides every row" → `No plugins match these filters.`, "a filter shows some rows" → `Showing 8 of 42 plugins.`, "the list holds one row" → `Showing 1 of 1 plugin.`); 29 of 29 pass. At T1 each failed with "filterStatus is not a function" before the function existed.
- AC2: `pnpm exec vitest run test/site.test.ts --reporter=verbose`: "holds one hidden status line between the version buttons and the list" passes (one `\sdata-filter-status` match, and the exact `<p class="filter-status" role="status" data-filter-status hidden></p>` between `</div></div>` of the version filter and `<ul class="plugins">`); "has a script on the home page only" passes (one `<script`). 67 of 67 pass. At T2 the status case failed with index.astro stashed.
- AC3: browser pane, `python3 -m http.server`, sites rebuilt at 9061f59 with `pnpm site --out`. Deployed `v1/plugins.json` (downloaded 2026-10-28, 42 rows): no parameter → line not hidden, text "", 42 of 42 rows shown; `?language=zh` → `Showing 27 of 42 plugins.`, 27 rows without `hidden`, 42 `li.plugin`; `?zotero=8` → `Showing 30 of 42 plugins.`, 30 and 42. The deployed data has no language and major pair that hides every row (all 45 × 4 pairs checked at T4), so the fixture build (9 rows) was used: `?language=es&zotero=10` → `No plugins match these filters.`, 0 shown; `?language=de&zotero=7` → the same, 0 shown. In every case the line had no `hidden` attribute after the script ran.
- AC4: joined-copy search (`tr '\n' ' ' | sed 's/  */ /g' | grep -oF`): README.md holds `No plugins match these filters.` once and `Showing N of M plugins.` once; CHANGELOG.md holds each once, in the entry the diff adds at lines 322-329 under `## Unreleased` (the file's only `## ` heading). `cairn/DESIGN.md` line 247 names `filterStatus` in the `src/site/home-filter.ts` list.
- AC5: `npx -y pnpm@12.15.0 test`: type check clean, 19 test files, 941 passed, 1 skipped (the case-sensitive volume case, per the M031 lesson). `npx -y pnpm@12.15.0 check`: 42 entries, 0 problems.

Consistency gate: `cairn_validate.py` all checks passed (exit 0). No principle changed, so no `cairn_impact` run. The generic profile names no toolchain checks.

spawned: diff-bug, blame-history, prior-review, ripple

- diff-bug #1: returning to All languages and Any version writes "", so screen readers hear nothing — reject (planned change: the question set chose an empty line with no filter on).
- diff-bug #2: a change that keeps the same count writes the same text, which some screen readers do not repeat — follow-up, row "Close gaps around the filter line".
- diff-bug #3: on a load with `?language=` or `?zotero=` the first text is written while the line is still `hidden`, so it is not announced — follow-up, same row.
- diff-bug #4: the placement regex in `test/site.test.ts` used `.*?` with the `s` flag, so it did not pin the version-filter div — fix now, fixed 8e381e3.
- diff-bug #5: `cairn/DESIGN.md` lines 556-558 named only the menu and the buttons as the script's jobs — fix now, fixed 8e381e3.
- diff-bug #6: ROADMAP row "Say when the filters hide every plugin" is still listed — reject (planned change: step 9 hygiene graduates it).
- diff-bug #7: `filtering` was computed apart from `passes`, so a value that no option has could count as on in a future path — fix now, fixed 8e381e3 (`filterOn`).
- diff-bug #8: the `:empty` rule works — noted, no finding.
- diff-bug #9: README line 46 does not say the page removes an unknown `language` parameter — follow-up, same row.
- diff-bug (tests): no case has `filtering` false with `shown` 0 — reject (false: with no filter on every row shows, and the build refuses an empty index).
- blame-history #1: the absorbed row is still listed — reject (planned change, as diff-bug #6).
- blame-history #2: DESIGN lines 556-558 stale — fix now, fixed 8e381e3 (as diff-bug #5).
- blame-history #3: README line 46 — follow-up (as diff-bug #9).
- blame-history #4: `if (status)` and `status?.` guard an element that is always in the HTML — reject (style: it matches the script's guard on the menu and buttons).
- blame-history #5: the loose placement regex — fix now, fixed 8e381e3 (as diff-bug #4).
- prior-review #1: the status line's DOM code has only a hand check, and row "Test the home page script in a browser" does not name it — follow-up, row "Close gaps around the filter line" (that row holds findings from M024 and M037, so it is not extended).
- prior-review #2: the on-or-off test for the filters sat in the untested script — fix now, fixed 8e381e3 (`filterOn`, as diff-bug #7).
- prior-review #3: on a filtered address the line appears after the first paint and moves the list down by its height and margin — follow-up, row "Close gaps around the filter line" (row "Filter the home list before it paints" holds findings from two milestones, so it is not extended).
- prior-review #4: README line 46 — follow-up (as diff-bug #9).
- prior-review #5: the regex test of built HTML does not reopen the `<div>` in `<p>` trap, since T4 ran `DOMParser` — noted, no finding.
- ripple #1: the absorbed row is still listed — reject (planned change, as diff-bug #6).
- ripple #2: row "Test the home page script in a browser" omits the status line — follow-up (as prior-review #1).
- ripple #3: the `src/site/home-filter.ts` header named only the menu and the buttons — fix now, fixed 8e381e3.

Row to add at step 9 (ROADMAP is at 59 lines until hygiene removes the absorbed row): `- [low] Close gaps around the filter line: (1) on a load with `?language=` or `?zotero=` the script writes the line's first text while the line is still hidden, so screen readers do not announce it, and a change that keeps the same count writes the same text, which some screen readers do not repeat; (2) on such a load the line appears after the first paint and moves the list down, as "Filter the home list before it paints" says for the rows; (3) the line's DOM code (the count, the unhide) has only a hand check, as "Test the home page script in a browser" says for the menu and buttons; (4) README line 46 says an unknown `language` parameter shows every plugin, but not that the page removes it, as the `zotero` paragraph says (M044 review) — added 2026-10-28 — M024, M037, M044`
