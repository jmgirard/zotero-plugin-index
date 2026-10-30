# M064: Show the star count with a star icon

- **Status:** planned
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — it changes what the public plugin pages show
- **Branch/PR:** —

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

- [ ] AC1: For a record whose `upstream.stars` is set, the repo line's last two children are the `aria-hidden` `·`
  span and a `data-repo-stars` element. That element holds, in order, three parts.
  The first is a filled star SVG with `aria-hidden="true"`.
  The second is the count as `toLocaleString("en")` writes it.
  The third is a `.visually-hidden` span that holds " GitHub Star" for a count of 1 and " GitHub Stars" otherwise.
  The span's text starts with that space.
  The element's `title` is the count and the same words, such as "1,234 GitHub Stars".
  With the `.visually-hidden` span removed, the line's text with tags removed reads, for example,
  "By example · example/first-plugin · 1,234".
  With all tags removed and no span removed, it reads "By example · example/first-plugin · 1,234 GitHub Stars".
  Tests in `test/site.test.ts` check this for the fixture counts 1,234, 1, and 0.
- [ ] AC2: For a record with no `upstream.stars`, the repo line holds no `data-repo-stars` element and no `<svg`.
  The tests for `no-range-plugin@example.org` and `broken-plugin@example.org` check this.
- [ ] AC3: A rule in `site/src/layouts/Base.astro` sets `fill: var(--star)` and `stroke: none` on the star icon.
  This overrides `.icon`'s `fill: none` and `stroke: currentColor`. A search of `site/src` for `fill` finds it set in no file but `Base.astro`.
  In `Base.astro`, `--star` is `#b07d00` in the light `:root` block.
  It is `#e3b341` in the `prefers-color-scheme: dark` block.
  The site's contrast test holds `--star` to 3:1 on `--bg` and on `--surface` in both schemes.
  Inside a `@media (forced-colors: active)` block, the star's fill is `CanvasText`.
  `Base.astro` gives `[data-repo-stars]` `white-space: nowrap`.
- [ ] AC4: A built plugin page is served over HTTP and viewed in the browser pane, in the light and dark schemes.
  The star path's computed fill is `rgb(176, 125, 0)` in light and `rgb(227, 179, 65)` in dark.
  At a 375 px width, on the page of the indexed plugin with the longest owner and repo name, the star and the count
  share one line.
- [ ] AC5: Three texts describe the line's end as a star icon, the count, and the "GitHub Stars" tooltip.
  They are the README plugin page paragraph, the DESIGN.md plugin page paragraph, and the M061 CHANGELOG entry.
  None of the three files contains the string "8,400 stars", by a joined-text search of each file.
- [ ] AC6: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T2
- AC2 → T2
- AC3 → T1
- AC4 → T4
- AC5 → T3
- AC6 → T4

## Tasks

- [ ] T1: Add a filled `star` icon to `Icon.astro`, and the `--star` tokens, star rule, forced-colors rule, and
  `[data-repo-stars]` nowrap rule to `Base.astro`. Add `--star` on `--bg` and `--surface` at 3:1 to `PAIRS` in `test/site.test.ts` (near line 1686).
- [ ] T2: Change the repo line's end in the plugin page template.
  Change `starsText` in `site/src/data.ts` to give "1 GitHub Star" and "1,234 GitHub Stars".
  Update the repo line tests in `test/site.test.ts` (near lines 426 and 449 to 451) for the markup and both texts.
- [ ] T3: Rewrite the README plugin page paragraph, the DESIGN.md plugin page paragraph, and the M061 CHANGELOG entry.
- [ ] T4: Run `pnpm test` and `pnpm check`. Build the site from the deployed data, serve it through `.claude/launch.json`,
  and view a plugin page in the browser pane in both schemes and at 375 px.

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

## Decisions

## Review
