<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M044: Say how many plugins the filters show

- **Status:** in-progress   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
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

- [ ] AC1: `filterStatus(shown, total, filtering)` in
      `src/site/home-filter.ts` returns `""` when `filtering` is false. When
      `filtering` is true and `shown` is 0, it returns
      `No plugins match these filters.` For other values, it returns
      `Showing <shown> of <total> plugins.`, with `plugin` in place of
      `plugins` when `total` is 1. A test in `test/home-filter.test.ts`
      asserts the exact text for four inputs: `filtering` false, `shown` 0,
      `total` above 1, and `total` 1.
- [ ] AC2: The built home page holds exactly one element with
      `data-filter-status`, written as `<p class="filter-status"
      role="status" data-filter-status hidden></p>`. It sits after the
      closing tag of the `version-filter` div and before
      `<ul class="plugins">`. The page still holds exactly one `<script`
      element. `test/site.test.ts` asserts these facts.
- [ ] AC3: A hand check in the browser pane, on a site built from the
      deployed `v1/plugins.json`, reads the line after the script runs. The
      line has no `hidden` attribute. With "All languages" and "Any version",
      its text is empty. For one language and for one major, it reads
      `Showing N of M plugins.`, where N is the count of `li.plugin` rows
      with no `hidden` attribute and M is the count of `li.plugin` rows. For
      a language and a major that hide every row, it reads
      `No plugins match these filters.` If the deployed data has no such
      pair, the check uses a site built from the test fixture for that case.
- [ ] AC4: `README.md` and the new `CHANGELOG.md` entry under
      `## Unreleased` each hold `No plugins match these filters.` and
      `Showing N of M plugins.` A search of a joined copy of each file finds
      both. The `src/site/home-filter.ts` function list in `cairn/DESIGN.md`
      names `filterStatus`.
- [ ] AC5: `pnpm test` and `pnpm check` pass.

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
- [ ] T2: In `site/src/pages/index.astro`, add the hidden status `<p>`
      between the `version-filter` div (lines 35-47) and the list (line 48).
      In the script, have `show()` write `filterStatus` into the line, with
      the count of rows it leaves shown, `rows.length`, and whether the
      language or the major is not `""`. Unhide the line beside the two
      controls (lines 117-118). Add a `.filter-status` style in
      `site/src/layouts/Base.astro` if the line needs one. In
      `test/site.test.ts`, assert AC2 in the form of the existing menu and
      button tests, and keep the one-script test.
- [ ] T3: Add the line to the README's home page paragraphs (lines 30-62),
      a `CHANGELOG.md` entry under `## Unreleased`, and `filterStatus` to the
      DESIGN.md function list (near line 244) and its home page text (near
      line 49). Keep prose near 76 columns, and list long added lines with
      `git diff -U0 main | grep '^+' | awk 'length > 80'`.
- [ ] T4: Hand check AC3. Download the deployed `v1/plugins.json`, run
      `pnpm site --out <dir>`, serve it with a `.claude/launch.json` entry
      kept out of git, and read each case with `read_page` or JavaScript.
      Check the page's nesting with `DOMParser`. Write each case's address
      and the text read in the work log for review.
- [ ] T5: Run `pnpm test` and `pnpm check` (through
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

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive. -->
