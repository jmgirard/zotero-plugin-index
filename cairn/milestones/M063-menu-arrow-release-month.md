# M063: Fix the language menu arrow and release dates

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — it changes how the home page looks
- **Branch/PR:** m063-menu-arrow-release-month

## Goal

The home table writes each release month as `YYYY-MM`, and the language menu draws its
arrow inside the box.

## Scope

**In:** `monthYear` in `site/src/data.ts` and the "Latest release" cell of
`site/src/pages/index.astro`, written as `YYYY-MM` with a matching `<time datetime>`. The
language menu's CSS in `site/src/layouts/Base.astro`: `appearance: none` and one arrow
drawn by page CSS. DESIGN, README, and CHANGELOG describe the change.

**Out:** the other parts of the candidate rows this touches ("Close three gaps in the
release read" parts 1 and 2, "Close small gaps on the site pages" parts 1 to 4, 6, and 7),
which stay in those rows. The owner and stars line is in M061. The full-support marks are
in M062.

## Acceptance criteria

- [x] AC1: The home table's "Latest release" cell shows the UTC year and month of
      `latestReleaseDate` as `YYYY-MM`. Its `<time datetime>` holds the same text. A site
      test builds in America/New_York. It checks that a fixture date of
      `2026-11-01T02:00:00Z` shows `2026-11` in both places.
- [x] AC2: The language menu sets `appearance: none` and draws one down arrow from page
      CSS in `currentColor`. In the computed CSS, the arrow's inset from the menu's right
      edge equals the menu's left padding, within 1 px. Screenshots in the browser pane at
      1280 px and 375 px wide, in the light and dark color schemes, show one arrow inside
      the box.
- [x] AC3: DESIGN's and README's text on the release month and one CHANGELOG entry
      describe the `YYYY-MM` form.
- [x] AC4: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1
- AC2 → T2
- AC3 → T3
- AC4 → T4

## Tasks

- [x] T1: Change `monthYear` (line 195 of `site/src/data.ts`) to give `YYYY-MM` from the
      UTC date, use it for both the cell text and `datetime`, and add the fixture date
      and site test.
- [x] T2: Style `[data-language-filter]` in `site/src/layouts/Base.astro` with
      `appearance: none`, right padding for the arrow, and an arrow drawn in
      `currentColor`. Measure the insets and take the four screenshots in the browser
      pane.
- [x] T3: Update DESIGN, README, and CHANGELOG.
- [x] T4: Run `pnpm test` and `pnpm check`.

## Work log

- 2026-10-30: created by /milestone-plan.
- 2026-10-30: tier check: milestone — the request adds a data field and changes page and table behavior across several parts.
- 2026-10-30: idea vet: no concern found for the release month or the menu arrow.
- 2026-10-30: criteria audit (full mode, fresh Opus reader): AC2 first promised a measured arrow position, but the arrow was the browser's own and cannot be measured; it now promises a CSS-drawn arrow in `currentColor` with a computed inset, checked in both color schemes.
- 2026-10-30: absorbs part (3) of candidate "Close three gaps in the release read" (the `<time datetime>` day against the UTC month) and part (5) of "Close small gaps on the site pages" (`appearance: none` on the language menu); review hygiene narrows both rows.
- 2026-10-30: collision check: M049 and M053 shipped the menu's look and the month cell; no D-entry covers either. Inbox sweep: 0 open issues, 18 bot pull requests, none overlapping.
- 2026-10-30: lessons used: 2026-10-26 (M015, serve the built site for the browser pane), 2026-10-29 (M053, the built CSS is minified, so a test cannot match a style by its source text), 2026-10-29 (M048, check page width in same-origin iframes).
- 2026-10-30: implement started on branch m063-menu-arrow-release-month, cut from main at ad9f627.
- 2026-10-30: T1 done: `monthYear` now returns `toISOString().slice(0, 7)` and feeds both the cell text and `datetime`; `day` import dropped from index.astro; the cafe-tools fixture date moved from 2026-07-01T00:30:00Z to 2026-11-01T02:00:00Z, and the UTC test expects `2026-11` and `2025-12`; the tests failed before the change (11 in site.test.ts) and pass after. One full-suite run had 1 unnamed failure that did not repeat in 3 more runs.
- 2026-10-30: T2 choice: the arrow is two 6 px `linear-gradient` triangles in `currentColor` as the menu's background, the right one at `right var(--space-4)`, with right padding `--space-14` so the text clears it; a `forced-colors: active` block puts back `appearance: auto`, since CSS Color Adjust 1 says `background-image` computes to `none` there unless it holds a `url()` (read on w3.org this session).
- 2026-10-30: T2 done: built the site from the deployed plugins.json and served it as `m063-look` (port 4337). Computed CSS at 1280 and 375 px, light and dark: padding-left 8px, arrow layer at `calc(100% - 8px) 50%`, color `rgb(28, 28, 26)` light and `rgb(236, 236, 232)` dark; the four screenshots each show one arrow inside the box. A new style test checks `appearance: none`, both gradients in currentColor, the inset equal to the left padding, and the forced-colors fallback; it failed with the inset planted at `--space-5`. Forced colors not viewed in the pane.
- 2026-10-30: T3 done: DESIGN's home table paragraph and README's row description state the UTC `YYYY-MM` month; two CHANGELOG entries under Unreleased cover the month form and the drawn menu arrow. The simple-english hook flagged README lines 234 and 811, which this branch does not touch; left as they are.
- 2026-10-30: T4 done: `pnpm test` 1546 passed, 6 skipped; `pnpm check` 272 entries, 0 problems.
- 2026-10-30: claim audit: 13 claims read, 0 corrected — CHANGELOG.md, README.md, site/src/data.ts, site/src/layouts/Base.astro, test/site.test.ts
- 2026-10-30: the audit reader noted that the style test's forced-colors check dropped the `@media` wrapper; the test now matches the `(forced-colors: active)` block in the layout source, and it failed with that query planted as `prefers-contrast: more`. `pnpm test` 1546 passed, `pnpm check` 0 problems. Status set to review.
- 2026-10-30: review fix 2c8de3b drops the b-cafe line from the UTC month test (diff-bug #5); `pnpm test` 1546 passed, `pnpm check` 0 problems.
- 2026-10-30: step-7 approval: m063-menu-arrow-release-month approved for merge

## Decisions

## Review

- AC1 evidence (2026-10-30, head 5e12a81): `test/site.test.ts` "shows the release month in UTC" passes; `pnpmSite` builds with `TZ: "America/New_York"`, the cafe-tools fixture date is `2026-11-01T02:00:00Z`, and the test expects `<time datetime="2026-11">2026-11</time>`. The per-row test checks every fixture row's cell as `slice(0, 7)` in both places. The live-data build showed `<time datetime="2026-07">2026-07</time>` in the first row.
- AC2 evidence (2026-10-30, site rebuilt from 5e12a81 with the deployed plugins.json, served as `m063-look`): at 1280 px light and dark and 375 px light and dark, computed `appearance` is `none`, `background-image` holds 2 linear gradients, color is `rgb(28, 28, 26)` light and `rgb(236, 236, 232)` dark (the gradients use currentColor), and the arrow's inset from the menu's right edge is 9 px against a left inset of 9 px (8 px padding plus 1 px border on each side), a difference of 0. The four screenshots each show one down arrow inside the box. The style test "draws the language menu's arrow in currentColor, inset from the right by the left padding" passes.
- AC3 evidence (2026-10-30): `cairn/DESIGN.md:132` says the month is the UTC year and month as `YYYY-MM` with the same `<time datetime>`; `README.md:20-21` says the year and month in UTC, such as `2026-09`; `CHANGELOG.md:519-521`, under `## Unreleased`, gives the `2026-09` form in place of `Sep 2026`.
- AC4 evidence (2026-10-30, head 5e12a81): `pnpm test` exit 0, 25 files passed and 1 skipped, 1546 tests passed and 6 skipped; `pnpm check` checked 272 entries, 0 problems.
- Consistency gate (2026-10-30): `cairn_validate.py` exit 0, all checks passed; no DESIGN principle changed, so `cairn_impact` skipped; the generic profile's consistency-gate slot names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: `monthYear` now throws a RangeError on an invalid date string, which stops the whole site build where the old code showed "Invalid Date" in one cell — reject (edge): only a `latestReleaseDate` that is not a valid date reaches it, and the build writes GitHub's `published_at` for a published release, so it falls outside the documented and common use; the effect is a build error, not a wrong result.
- diff-bug #2: the per-row test expects `released.slice(0, 7)` while the code converts to UTC first, so a timestamp with an offset would differ; the plugin page's `day()` also slices without converting — reject (false) for the test: every fixture date ends in `Z`, where both give the same text, and the literal a-cafe test pins the UTC month apart from the code; the `day()` part is pre-existing and goes to follow-up: row "Close three gaps in the release read" part (3), narrowed at hygiene to the plugin page's day (low, kept on that row's rung).
- diff-bug #3: the new style test reads source text and breaks under refactors that keep the same CSS behavior (another padding form, `center` in place of `top 50%`, a reordered media block) — follow-up: row "Test the home page script in a browser" (low), since a computed-style test needs a browser and a new dev dependency.
- diff-bug #4: the style test does not check the arrow's shape (`no-repeat`, size, angles), so a tiled background would pass — follow-up: row "Test the home page script in a browser" (low), with #3.
- diff-bug #5: the b-cafe line of "shows the release month in UTC" repeats the per-row test and tests no time-zone boundary in a New York build — fix now, fixed 2c8de3b.
- diff-bug #6: the fixture's cafe-tools release date is after the fixture's `generatedAt` — reject (planned change): AC1 names the date `2026-11-01T02:00:00Z`, and no code or test compares a release date with `generatedAt`.
- diff-bug #7: the two triangles may show a seam at a root font size other than 16 px, and the hard stops draw jagged edges — follow-up: row "Close small gaps on the site pages" part (5), rewritten at hygiene (low, the row's rung, unchanged: no report of it).
- diff-bug #8: the name `monthYear` no longer matches its year-then-month output — reject (style).
- blame-history #1: the month cell's failure on a bad timestamp moved from one cell to the whole build, which withholds the deploy — reject (edge), as diff-bug #1.
- blame-history #2: the arrow shipped without the Safari check that row "Close small gaps on the site pages" part (5) names; the pane check covers one engine — follow-up: that row's part (5), rewritten at hygiene to name the missing Safari, Firefox, and forced-colors views.
- blame-history #3: the `YYYY-MM` format is a visible change with no D-entry, and other page text uses month names — reject (planned change): the Goal and AC1 ask for `YYYY-MM`.
- blame-history #4: the per-row expectation no longer computes UTC on its own, and the b-cafe case never tested the boundary — reject (false) for the first part, as diff-bug #2; the b-cafe part is diff-bug #5, fixed 2c8de3b.
- blame-history #5: the fixture release date is later than its `generatedAt` and today — reject (planned change), as diff-bug #6.
- blame-history #6: the CHANGELOG's "in place of `Sep 2026`" names a state no release shipped — reject (false): the site deploys daily from the default branch (DESIGN), so its readers saw `Sep 2026` since M053.
- blame-history #7: one full-suite run in implement had an unnamed failure that was not chased — follow-up: absorbed at hygiene into row "Steady the time-limit tests under load" (low, unchanged), the search-first match for full-run failures that pass alone; it did not repeat in 7 later runs and its test is unknown.
- prior-review #1: the CHANGELOG claims the drawn arrow and the forced-colors arrow with no Safari check, as M049's review warned for claims on the menu's shape — follow-up: row "Close small gaps on the site pages" part (5), as blame-history #2; the entry states what the CSS sets, which the style test checks.
- prior-review #2: `appearance: none` now applies in WebKit with no WebKit render — follow-up: same row and part, as blame-history #2.
- prior-review #3: the per-row month expectation mirrors the code — reject (false), as diff-bug #2.
- prior-review #4: the arrow's placement rests on source-text checks — follow-up: row "Test the home page script in a browser", as diff-bug #3.
- ripple #1: ROADMAP row "Close small gaps on the site pages" part (5) says the menu is "still without `appearance: none`" — fix now at step-9 hygiene, which rewrites part (5) as the plan recorded.
- ripple #2: ROADMAP row "Close three gaps in the release read" part (3) describes the home `datetime` gap that this milestone closes — fix now at step-9 hygiene, which narrows part (3) as the plan recorded.
- ripple #3: the M063 ROADMAP title says "release dates" for a month — reject (style).
- Snapshot files: none in `git diff --name-only origin/main...HEAD`.
