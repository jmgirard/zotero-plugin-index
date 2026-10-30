# M063: Fix the language menu arrow and release dates

- **Status:** planned
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — it changes how the home page looks
- **Branch/PR:** —

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

- [ ] AC1: The home table's "Latest release" cell shows the UTC year and month of
      `latestReleaseDate` as `YYYY-MM`. Its `<time datetime>` holds the same text. A site
      test builds in America/New_York. It checks that a fixture date of
      `2026-11-01T02:00:00Z` shows `2026-11` in both places.
- [ ] AC2: The language menu sets `appearance: none` and draws one down arrow from page
      CSS in `currentColor`. In the computed CSS, the arrow's inset from the menu's right
      edge equals the menu's left padding, within 1 px. Screenshots in the browser pane at
      1280 px and 375 px wide, in the light and dark color schemes, show one arrow inside
      the box.
- [ ] AC3: DESIGN's and README's text on the release month and one CHANGELOG entry
      describe the `YYYY-MM` form.
- [ ] AC4: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1
- AC2 → T2
- AC3 → T3
- AC4 → T4

## Tasks

- [ ] T1: Change `monthYear` (line 195 of `site/src/data.ts`) to give `YYYY-MM` from the
      UTC date, use it for both the cell text and `datetime`, and add the fixture date
      and site test.
- [ ] T2: Style `[data-language-filter]` in `site/src/layouts/Base.astro` with
      `appearance: none`, right padding for the arrow, and an arrow drawn in
      `currentColor`. Measure the insets and take the four screenshots in the browser
      pane.
- [ ] T3: Update DESIGN, README, and CHANGELOG.
- [ ] T4: Run `pnpm test` and `pnpm check`.

## Work log

- 2026-10-30: created by /milestone-plan.
- 2026-10-30: tier check: milestone — the request adds a data field and changes page and table behavior across several parts.
- 2026-10-30: idea vet: no concern found for the release month or the menu arrow.
- 2026-10-30: criteria audit (full mode, fresh Opus reader): AC2 first promised a measured arrow position, but the arrow was the browser's own and cannot be measured; it now promises a CSS-drawn arrow in `currentColor` with a computed inset, checked in both color schemes.
- 2026-10-30: absorbs part (3) of candidate "Close three gaps in the release read" (the `<time datetime>` day against the UTC month) and part (5) of "Close small gaps on the site pages" (`appearance: none` on the language menu); review hygiene narrows both rows.
- 2026-10-30: collision check: M049 and M053 shipped the menu's look and the month cell; no D-entry covers either. Inbox sweep: 0 open issues, 18 bot pull requests, none overlapping.
- 2026-10-30: lessons used: 2026-10-26 (M015, serve the built site for the browser pane), 2026-10-29 (M053, the built CSS is minified, so a test cannot match a style by its source text), 2026-10-29 (M048, check page width in same-origin iframes).

## Decisions

## Review
