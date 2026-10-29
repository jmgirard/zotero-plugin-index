# M049: Give the whole site the card look

**Status:** done (2026-10-29, PR #98 https://github.com/jmgirard/zotero-plugin-index/pull/98)

**Goal:** The shared header, the footer, and the home page take the spacing, type sizes, and card look that M048 gives the plugin pages.

**Outcome:** `site/src/layouts/Base.astro` adds `--space-N` (N eighths of a rem: 1–6, 8, 12), `--text-xs/s/l`, and `--radius-pill`, and every margin, padding, gap, `border-radius`, and `font-size` outside `:root` and `.visually-hidden` is one of them, `0`, or `auto`; plugin page values are unchanged. The header and footer are `card site-head` and `card site-foot` on every page, replacing their border lines. The home h1 and intro sit in `div.card.page-head`. The filter rows are flex rows with `[hidden]` overrides, with small, bold, `--muted` labels. The select takes the version buttons' pill style and focus outline. The status line is small and `--muted`. The home list has no outer margin, and a row's last child has no bottom margin. Tests: each such CSS value part, no style in other `.astro` files, the home rows' and filters' facts against `test/fixtures/site/home-facts.json` (read by `test/support/home-facts.ts` from the build at dc1caf0), and 4.5:1 for each rule that sets a text color and a background together. CHANGELOG and DESIGN describe the look and the style rule.

**Decisions:** none.

**Review:** The plan audit had 8 findings, all fixed. The claim audit read 21 claims and corrected 5. The four-lens pass raised 21 findings: 5 fixed (DESIGN overclaim, an unverified CHANGELOG claim on the menu's rounded shape, `import.meta.main` on Node 24.0–24.1, a restating comment), 1 also sent to the candidate row "Check the language menu in Safari", and 16 rejected (planned changes, false, style, and 1 edge). Lessons: 8 marked used M049; none captured or retired.
