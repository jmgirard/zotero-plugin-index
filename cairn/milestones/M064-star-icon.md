# M064: Show the star count with a star icon

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — it changes what the public plugin pages show
- **Branch/PR:** m064-star-icon

## Goal

Each plugin page shows its star count as a gold star icon and a number, not as "N stars".

## Scope

**In:** the end of the plugin page's repo line (`site/src/pages/plugins/[id]/index.astro`).
A filled star icon in `site/src/components/Icon.astro`.
A `--star` color for each scheme in `site/src/layouts/Base.astro`, held to 3:1 by the contrast test.
A "GitHub Stars" tooltip and hidden text for screen readers.
The site tests, README, DESIGN.md, and the M061 CHANGELOG entry.

**Out:** a star column in the home table, which M061's question set left out and nobody asked for here.
The repo-line gaps in part (8) of the candidate row "Close small gaps on the site pages" stay in that row.

## Acceptance criteria

- [x] AC1: For each fixture record whose `upstream.stars` is set (counts 1,234, 1, and 0), the plugin page's repo line's
  last two children are the `aria-hidden` `·` span and a `data-repo-stars` element.
  That element has no `title` and has exactly two child elements, both spans, in order.
  The first span has `aria-hidden="true"` and a `title` that gives the count and its words.
  The `title` reads, for example, "1,234 GitHub Stars", or "1 GitHub Star" for a count of 1.
  The first span holds the star SVG of `Icon.astro`, then the count as `toLocaleString("en")` writes it.
  The second span is a `.visually-hidden` span whose text equals that `title`.
  With the `.visually-hidden` span removed, the line's text with tags removed reads, for example,
  "By example · example/first-plugin · 1,234".
  Tests in `test/site.test.ts` check this.
- [x] AC2: For a record with no `upstream.stars`, the repo line holds no `data-repo-stars` element and no `<svg`.
  The tests for `no-range-plugin@example.org` and `broken-plugin@example.org` check this.
- [x] AC3: A rule in `site/src/layouts/Base.astro` sets `fill: var(--star)` and `stroke: none` on the star icon.
  This overrides `.icon`'s `fill: none` and `stroke: currentColor`. A search of `site/src` for `fill` finds it set in no file but `Base.astro`.
  In `Base.astro`, `--star` is `#b07d00` in the light `:root` block.
  It is `#e3b341` in the `prefers-color-scheme: dark` block.
  The site's contrast test holds `--star` to 3:1 on `--bg` and on `--surface` in both schemes.
  Inside a `@media (forced-colors: active)` block, the star's fill is `CanvasText`.
  `Base.astro` gives `[data-repo-stars]` `white-space: nowrap`.
- [x] AC4: A built plugin page is served over HTTP and viewed in the browser pane, in the light and dark schemes.
  The star path's computed fill is `rgb(176, 125, 0)` in light and `rgb(227, 179, 65)` in dark.
  At a 375 px width, on the page of the indexed plugin with the longest owner and repo name, the star and the count
  share one line.
- [x] AC5: Three texts describe the line's end as a star icon, the count, and the "GitHub Stars" tooltip.
  They are the README plugin page paragraph, the DESIGN.md plugin page paragraph, and the M061 CHANGELOG entry.
  None of the three files contains the string "8,400 stars", by a joined-text search of each file.
- [x] AC6: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T2, T5
- AC2 → T2
- AC3 → T1
- AC4 → T4
- AC5 → T3, T5
- AC6 → T4

## Tasks

- [x] T1: Add a filled `star` icon to `Icon.astro`, and the `--star` tokens, star rule, forced-colors rule, and
  `[data-repo-stars]` nowrap rule to `Base.astro`. Add `--star` on `--bg` and `--surface` at 3:1 to `PAIRS` in `test/site.test.ts` (near line 1686).
- [x] T2: Change the repo line's end in the plugin page template.
  Change `starsText` in `site/src/data.ts` to give "1 GitHub Star" and "1,234 GitHub Stars".
  Update the repo line tests in `test/site.test.ts` (near lines 426 and 449 to 451) for the markup and both texts.
- [x] T3: Rewrite the README plugin page paragraph, the DESIGN.md plugin page paragraph, and the M061 CHANGELOG entry.
- [x] T4: Run `pnpm test` and `pnpm check`. Build the site from the deployed data, serve it through `.claude/launch.json`,
  and view a plugin page in the browser pane in both schemes and at 375 px.
- [x] T5: Rebuild the repo line's end to the amended AC1 (review return), with its tests, and rewrite README,
  CHANGELOG, and DESIGN.md to match.

## Work log

- 2026-10-30: created by /milestone-plan.
- 2026-10-30: tier check: milestone — a change to running code that is not a bug; the user chose the full milestone over a plain branch and PR.
- 2026-10-30: idea vet: gap — "instead of the text" could drop the count; reading taken: keep the number, replace only the word. flaw — the bright yellow #e3b341 is 1.8:1 on the light background and the star is the only visible cue once the word goes; the set chose #b07d00 in light and #e3b341 in dark, held to 3:1.
- 2026-10-30: collision check: M061 (done) shipped the repo line with "N stars"; this plans an extension of it. No candidate row, D-entry, or open issue overlaps. Inbox sweep: 0 open issues; 19 open PRs, all bot "Add" PRs, none overlapping.
- 2026-10-30: lessons used: 2026-10-27 (M021) Astro drops line breaks, write `{" "}`; 2026-10-30 (M063) cssRules drops `@media`, match the layout source by regex; 2026-10-26 (M015) serve the built site through launch.json; 2026-10-28 (M035) build from the deployed data; 2026-10-26 (M018) search a joined copy of wrapped prose; 2026-10-28 (M036) end an Edit's old text at a line break; 2026-10-25 (M001) run pnpm through npx.
- 2026-10-30: question set: star color — darker gold #b07d00 in light, #e3b341 in dark, held to 3:1.
- 2026-10-30: question set: star side — star first, with a hover tooltip "X GitHub Stars" (the user's own answer); the hidden screen-reader words match the tooltip.
- 2026-10-30: plan gate chose a `.visually-hidden` word over an `aria-label` on the span because an `aria-label` on a plain span is not read by all screen readers; falsified by a screen reader that reads the hidden word twice with the `title`.
- 2026-10-30: plan gate chose to edit the M061 CHANGELOG entry over a new entry because both sit under Unreleased and describe one line; falsified by a release cut between M061 and M064.
- 2026-10-30: criteria audit (full): 10 findings. Taken: the space sits inside the hidden span; AC1 states the page and names the tests as the check; the star sets `stroke: none`; `--star` joins the 3:1 contrast test; the dark view uses a served page; the computed fill is a page property, not a record; a 375 px one-line check; forced colors checked by source read only; AC4 (now AC5) searches for the plain string. No problem in AC2, AC5 (now AC6), or proportion.
- 2026-10-30: criteria re-audit (full) of the criteria the question set changed: 4 findings, all taken. AC1 names the last two children and defines visible text as the text with the hidden span removed; AC2 checks for no `<svg`; AC3 sets the fill in a `Base.astro` rule, with a `site/src` search, and holds the nowrap rule; AC4 states the computed fills as `rgb()` and checks the longest owner and repo name. Its note that the `title` can make some screen readers read the count twice is accepted: the user asked for the tooltip, and the hidden words keep the count readable where the `title` is not read.
- 2026-10-30: T1 done: a filled `star` path in `Icon.astro` (a five-point star in the 24-unit box); `--star` in both schemes; `[data-repo-stars] .icon` fills it with no stroke, `CanvasText` in forced colors, and the element does not wrap. The star rules are selected through `[data-repo-stars]` rather than a new icon class, so `Icon.astro` keeps one class. `PAIRS` holds `--star` at 3:1 on `--bg` and `--surface`, and a source test matches the three rules. Planted #e3b341 in light (1.81:1) and `fill: Canvas`: each turned its test red. `pnpm test` 1547 passed, `pnpm check` 0 problems.
- 2026-10-30: T2 done: the repo line ends `·`, then `<span data-repo-stars title="1,234 GitHub Stars">`, the star, the count, and a `.visually-hidden` " GitHub Stars". `starsWord` in `data.ts` gives the words and `starsText` the count with them, so the `title` and the hidden words share one source. The head test replaces each icon with `<svg>` before its exact match, and the repo line test checks the visible text, the spoken text, the `title`, and no `<svg` without stars. Tests went red first (6 failed); a planted hidden span with no leading space turned the same 6 red. `pnpm test` 1547 passed, `pnpm check` 0 problems.
- 2026-10-30: T3 done: README's plugin page paragraph and the M061 CHANGELOG entry give "★ 8,400" and the "8,400 GitHub Stars" tooltip and hidden text; DESIGN.md's plugin page paragraph names the icon, `--star`, the `title`, the hidden span, `starsText`, and `starsWord`. A joined-text search finds "8,400 stars" 0 times in each of the three files. No added line is over 80 characters. `pnpm test` 1547 passed, `pnpm check` 0 problems.
- 2026-10-30: T4 done: built the site from the deployed `v1/plugins.json` and served it as `m064-look` (port 4338) in `.claude/launch.json`. Better BibTeX's page: light fill `rgb(176, 125, 0)`, dark fill `rgb(227, 179, 65)`, stroke `none`, `title` "7,253 GitHub Stars". At 375 px, the page of `scientific-name-italicizer@example.com` (the longest owner and repo name with stars, 52 characters) shows "· ★ 0" on one line, `[data-repo-stars]` has 1 client rect, and the page width is 375 with no side scroll.
- 2026-10-30: status review; all tasks checked, `pnpm test` and `pnpm check` clean.
- 2026-10-30: claim audit: 17 claims read, 3 corrected — README.md, CHANGELOG.md (the tooltip gives the count with its label; the hidden text adds only the words), cairn/DESIGN.md (the `title` holds the count, the span "GitHub Star" or "GitHub Stars"), test/site.test.ts (the column is the full text, not the spoken text). Re-read of the 3 by the same reader pending. `pnpm test` 1547 passed, `pnpm check` 0 problems.
- 2026-10-30: claim audit re-read: the same reader found all corrected claims true (README, CHANGELOG, DESIGN.md, the test comment).
- 2026-10-30: amendment routed: AC1 — the criterion puts the `title` on the element that also holds the hidden words, so a screen reader can read the count twice (blame-history #1, against M054's fix 9007997), and its leading space inside the hidden span is dropped in layout (diff-bug #1); the fix-now items for the repo line test and the README and CHANGELOG wording ride with the amendment.
- 2026-10-30: checkpoint: the AC1 structure is in code (an `aria-hidden` span with the `title`, the star and the count, then a `.visually-hidden` span with `starsText`; `starsWord` removed), with tests that check the `title`, the hidden text, and the star path (a planted outer `title` turned 6 red, a planted `releases` icon 3 red), and README, CHANGELOG and DESIGN.md rewritten; `pnpm test` 1547 passed, `pnpm check` 0 problems. The amended AC1 text waits on its second fresh reader before it is written here.
- 2026-10-30: re-audit: AC1 (full) — 4 findings, all taken: the outer element must have no `title` and exactly two child spans; the promise is scoped to the fixture records; DESIGN.md's hidden-span wording must change (done in T5).
- 2026-10-30: re-audit: AC1 (full) — 1 finding: the plural rule is given only by example; answered without change, since the criterion names the count 0 and the test pins "0 GitHub Stars", so the narrower wording stands. The reader also noted that AC4's evidence predates the extra span; review re-takes it.
- 2026-10-30: amendment return: AC1 — "That element has no `title` and has exactly two child elements, both spans, in order. The first span has `aria-hidden="true"` and a `title` that gives the count and its words."
- 2026-10-30: T5 added and done (minor amendment for the review return): the amended structure, tests, and docs; Coverage maps AC1 and AC5 to T5 too. All criterion boxes unticked so review re-verifies at the new head.
- 2026-10-30: status review; `pnpm test` 1547 passed, `pnpm check` 0 problems.
- 2026-10-30: claim audit: 21 claims read, 0 corrected — README.md, CHANGELOG.md, cairn/DESIGN.md, Icon.astro, test/site.test.ts (the lines added since 9c7f547).

## Decisions

## Review

- 2026-10-30, branch head 9c7f547, default branch not moved since the cut.
- AC1: the 3 "opens the main content" tests for first-plugin (1,234), old-plugin (1) and the GUID plugin (0) pass; they match the head exactly, with the `·` span and the `data-repo-stars` element (its `title`, `<svg>`, the count, and the hidden span with its leading space) as the line's last two children. The 3 matching "shows the owner, the repo, and any stars" tests pass on the visible text ("… · 1,234"), the full text ("… · 1,234 GitHub Stars"), and the `title` ("1 GitHub Star" for 1).
- AC2: the "shows the owner…" tests for no-range-plugin and broken-plugin pass, asserting no `title`, no `data-repo-stars`, and no `<svg` in the line.
- AC3: `Base.astro` line 38 `--star: #b07d00;` (light `:root`), line 87 `--star: #e3b341;` (dark block), lines 634-636 `[data-repo-stars] .icon` sets `fill: var(--star)` and `stroke: none`, line 641 `fill: CanvasText` inside `@media (forced-colors: active)`, and the `[data-repo-stars]` rule sets `white-space: nowrap`. `grep -rn fill site/src` outside `Base.astro` finds 4 prose lines and no fill set. The light and dark token-pair contrast tests pass with `--star` on `--bg` and `--surface` (light 3.39 and 3.63, dark 9.30 and 8.58).
- AC4: site rebuilt at 9c7f547 from the deployed data and served on port 4338. Better BibTeX page: light fill `rgb(176, 125, 0)`, dark fill `rgb(227, 179, 65)` (`prefers-color-scheme: dark` matched), stroke `none` in both. At 375 px, `scientific-name-italicizer@example.com` (longest owner and repo with stars): `[data-repo-stars]` has 1 client rect, page scroll width 375.
- AC5: README, DESIGN.md and CHANGELOG paragraphs describe the star icon, the count, and the "GitHub Stars" tooltip; a joined-text search finds "8,400 stars" 0 times in each.
- AC6: `pnpm test` 25 files passed, 1547 tests passed, 6 skipped; `pnpm check` checked 272 entries, 0 problems.
- Consistency gate: `cairn_validate.py` all checks passed; no principle changed, so no impact report; the generic profile names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- blame-history #1: the `title` on the span that also holds the hidden words lets a screen reader read the count twice, which M054's review fixed (9007997) by putting the `title` on an `aria-hidden` part and keeping one hidden copy — amendment return: AC1 mandates this structure, so the criterion is wrong (routed below)
- diff-bug #1: the leading space inside the absolutely positioned `.visually-hidden` span is dropped in layout (the built page's `innerText` of the span reads "GitHub Stars"), so a screen reader can read "1,234GitHub Stars" — amendment return with blame-history #1: the new AC1 puts the whole phrase in the hidden span, so no leading space is needed
- diff-bug #2: the `title` repeats the hidden words — amendment return with blame-history #1
- prior-review #1: the `title` repeats the hidden words (M054) — amendment return with blame-history #1
- diff-bug #6: the head test accepts any icon in the repo line — fix now, with the AC1 amendment (the repo line test checks the star path)
- blame-history #3: no test checks the star path — fix now, with diff-bug #6
- ripple #1: README and CHANGELOG say the hidden text adds "GitHub Stars", but a count of 1 gives "GitHub Star" — fix now, with the AC1 amendment, which rewrites both sentences
- prior-review #3: the CHANGELOG rewrite left short lines — fix now, with the AC1 amendment's rewrap
- prior-review #4: the README rewrite left short lines — fix now, with the AC1 amendment's rewrap
- diff-bug #11: README and CHANGELOG short lines — fix now, with prior-review #3 and #4
- blame-history #5: CHANGELOG and README short lines — fix now, with prior-review #3 and #4
- diff-bug #4: no test checks that the forced-colors block comes after the base star rule, which it must to win at equal specificity — fix now (the test compares their positions; moving the block up turned it red)
- diff-bug #5: the CSS test's name leaves out the nowrap check — fix now (renamed)
- diff-bug #7: the comment above the repo line test repeats what its column names show — fix now, with the AC1 amendment's test rewrite
- ripple #2: DESIGN.md says `Icon.astro` draws the line icons, and it now also holds the filled star — fix now (DESIGN.md names the star and where it is filled)
- blame-history #4: `Icon.astro`'s comment does not say that the star draws as an outline outside the repo line — fix now (the comment says so)
- prior-review #2: the star's forced-colors fill has no browser view, only a source test — follow-up: new parked row "View the star in forced colors mode", promote when a user reports it, since no documented use runs the site in forced colors and the rule follows M063's tested pattern
- diff-bug #3: a `title` on a span gives no tooltip to keyboard or touch users — reject, planned change: the user asked for the icon in place of the word, with a hover tooltip
- blame-history #2: the visible word "stars" is gone, so sighted users who do not hover lose the label — reject, planned change (as diff-bug #3)
- prior-review #5: README and CHANGELOG call #b07d00 "gold" — reject, planned change: the question set chose it as the darker gold
- prior-review #6: README writes "★ 8,400" while the page draws an SVG — reject, false: the same sentence says the star is an icon, and "★" shows what a reader sees
- ripple #3: "★ 8,400" in README and CHANGELOG — reject, false (as prior-review #6)
- diff-bug #8: the no-stars assertion sits inside an `if` — reject, style
- diff-bug #9: the 1,234 and 0 rows share the plural branch — reject, false: the reviewer finds both rows in scope (the guard on 0 and the grouping on 1,234)
- diff-bug #10: the template formats the count with `toLocaleString` apart from `starsText` — reject, style: one call, the same format, and the test pins both
- diff-bug #12: the star path is Feather's polygon while the other paths look like Lucide's — reject, false: Lucide's paths come from Feather under the same permissive terms, and the repo credits neither, as before
- Re-review after the AC1 amendment return, 2026-10-30, branch head f6544d8, default branch not moved.
- AC1: the 3 "opens the main content" tests match the head exactly: `·` span, then `<span data-repo-stars>` with no `title` and two child spans, the `aria-hidden` one with `title="<starsText>"` holding the icon and the count, then `.visually-hidden` with the same text. The 3 "shows the owner…" tests pass on the visible text ("… · 1,234"), the `title` and the hidden text ("1,234 GitHub Stars", "1 GitHub Star", "0 GitHub Stars"), and the star path. Built Better BibTeX page: outer `title` null, inner `title` "7,253 GitHub Stars", hidden text the same.
- AC2: the no-range-plugin and broken-plugin tests pass, asserting no `data-repo-stars` and no `<svg` in the line.
- AC3: `--star` #b07d00 (line 38) and #e3b341 (line 87); `[data-repo-stars] .icon` fill `var(--star)`, stroke `none`; `CanvasText` in the forced-colors block, which the source test shows comes after the base rule; nowrap rule present. `grep -rn fill site/src` outside `Base.astro`: 4 prose lines, no fill set. Both scheme contrast tests pass.
- AC4: site rebuilt at f6544d8. Better BibTeX: light fill `rgb(176, 125, 0)`, dark `rgb(227, 179, 65)`, stroke `none`. At 375 px on `scientific-name-italicizer@example.com`, the visible star-and-count span has 1 client rect, page scroll width 375.
- AC5: README, CHANGELOG and DESIGN.md describe the icon, the count, the "GitHub Stars" tooltip ("1 GitHub Star" for 1), and the hidden copy; "8,400 stars" found 0 times in each by joined-text search.
- AC6: `pnpm test` 1547 passed, 6 skipped; `pnpm check` 272 entries, 0 problems.
- Consistency gate: `cairn_validate.py` all checks passed; no principle changed; the generic profile names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- blame-history #1: D-029 says a plain link does not read as an endorsement, and the gold star has no decision entry — reject, false: D-029 governs how the download link is styled, and the star is no link
- blame-history #2: the visible count and the hidden copy touch with no space, so copied or found text reads "1,2341,234 GitHub Stars" — fix now (a space between the two spans; the built page reads `7,253</span> <span class="visually-hidden">`)
- blame-history #3: "GitHub Stars" is only in a hover tooltip, which touch and keyboard users do not get — reject, planned change: the user chose the icon with a hover tooltip
- blame-history #4: the forced-colors fill has no browser view — follow-up: the parked row "View the star in forced colors mode", filed in the first pass
- blame-history #5: `Icon.astro` and DESIGN.md call the icons line icons — reject, false: DESIGN.md lines 385-386 and the `Icon.astro` comment already name the filled star
- diff-bug #1: the tooltip label is not reachable by keyboard or touch — reject, planned change (as blame-history #3)
- diff-bug #2: `nowrap` covers the star and count but not the `·` before them, so the dot can end a line — reject, style: a wrap point at a separator, and AC4 asks only that the star and count stay together
- diff-bug #3: the source test checks cosmetic CSS text (`nowrap`, fill, stroke) — reject, planned change: AC3 names each rule, as M063's forced-colors test does
- diff-bug #4: the test copies the star's whole path from `Icon.astro`, so a redrawn star breaks it — reject, planned change: AC1 names the star SVG of `Icon.astro`, and the check caught a swapped icon when planted
- diff-bug #5: the 1,234 and 0 rows share the plural branch — reject, false: the reviewer keeps both (0 tests the `!== undefined` guard)
- diff-bug #6: the head test builds its expected `title` with `starsText` — reject, false: the repo line test pins the words as literals
- diff-bug #7: `vertical-align: -0.125em` is a raw length — reject, false: the M049 rule does not cover `vertical-align`
- diff-bug #8: the light `--star` (#b07d00) is near `--part` (#8a5a00), which marks partial support in the table below — reject, planned change: the question set chose this gold for 3:1 contrast, and the star sits in the head, away from the table's marks
- diff-bug #9: `Icon.astro`'s comment opens with "a line icon" before naming the star — reject, style
- prior-review #1: the forced-colors fill has no browser view — follow-up: the parked row "View the star in forced colors mode"
- prior-review #2: the new parked row restates part (5) of "Close small gaps on the site pages" — reject, false: part (5) covers the language menu's arrow, not the star
- prior-review #3: README and CHANGELOG claim "gold" and a tooltip with no browser check — reject, false: AC4's browser view read the fill and the inner `title` "7,253 GitHub Stars"
- prior-review #4: README splits the quoted "1 GitHub Star" across a line break — fix now (rewrapped; CHANGELOG's split "8,400 GitHub Stars" rewrapped too)
- prior-review #5: the words sit in both the `title` and the hidden span — reject, planned change: AC1 and M054's declared-mark pattern
- ripple #1: README line 150's "The line reads `By <owner> · <owner>/<repo>`" omits the star — reject, false: the next sentence adds the star for a plugin with a count
- After the fixes: `pnpm test` 1547 passed, `pnpm check` 0 problems; the two criteria the fixes touch (AC1 markup, AC5 docs) still hold: the head test's exact match collapses the added space, and "8,400 stars" is found 0 times.
