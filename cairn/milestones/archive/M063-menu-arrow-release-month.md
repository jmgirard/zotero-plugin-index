# M063: Fix the language menu arrow and release dates

**Status:** done (2026-10-30, PR #346 https://github.com/jmgirard/zotero-plugin-index/pull/346)

**Goal:** The home table writes each release month as `YYYY-MM`, and the language menu draws its arrow inside the box.

**Outcome:** `monthYear` in `site/src/data.ts` returns `toISOString().slice(0, 7)`, the UTC year and month, and the home "Latest release" cell uses it for both its text and its `<time datetime>`; `index.astro` no longer imports `day`. The cafe-tools site fixture date is `2026-11-01T02:00:00Z`, and a New York build test expects `2026-11`. `[data-language-filter]` in `Base.astro` sets `appearance: none`, right padding `--space-14`, and two `--space-3` `linear-gradient` triangles in `currentColor` placed `right var(--space-4)` (the left padding); a `@media (forced-colors: active)` block puts back `appearance: auto`, since forced colors drop gradients. A style test checks both. DESIGN, README, and two CHANGELOG entries describe the month form and the arrow. Checked in the Chromium browser pane at 1280 and 375 px, light and dark; no Safari, Firefox, or forced-colors view.

**Decisions:** none.

**Review:** four-lens fan-out, 22 findings: 3 fixed (a repeated December check dropped from the UTC test, 2c8de3b; the two ROADMAP parts this work made stale rewritten at hygiene), 9 sent to rows, 10 rejected (2 as edge: an invalid `latestReleaseDate` now throws and stops the build). Hygiene narrowed "Close three gaps in the release read" part (3) to the plugin page's day and rewrote "Close small gaps on the site pages" part (5) to the missing Safari, Firefox, and forced-colors views and a possible arrow seam; "Test the home page script in a browser" gained the arrow's source-text test, and "Steady the time-limit tests under load" one unnamed full-run failure. Claim audit: 13 claims, 0 corrected. Lesson captured on `cssRules` and forced colors.
