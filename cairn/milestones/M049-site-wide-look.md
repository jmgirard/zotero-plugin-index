# M049: Give the whole site the card look

- **Status:** review
- **Priority:** normal
- **Depends on:** M048
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the public site's shared header, footer, and home page
- **Branch/PR:** m049-site-wide-look

## Goal

The shared header, the footer, and the home page take the spacing, type sizes, and card look that M048 gives the plugin pages.

## Scope

**In:** The CSS in `site/src/layouts/Base.astro` for the header, the
footer, the home intro, the filters, and the home rows. Custom properties
for spacing and type sizes. Markup changes in `Base.astro` and
`site/src/pages/index.astro` where the look needs them, with the same
facts shown. Tests in `test/site.test.ts`. One `CHANGELOG.md` entry.

**Out:** What the home rows show and how the filters behave stay as they
are. The plugin page's structure is M048. This milestone only moves the
literal values of its rules to custom properties. A browser test of the
home script stays with the candidate row "Test the home page script in a
browser".

## Acceptance criteria

- [x] AC1: Outside the `:root` blocks and `.visually-hidden`, each value
      part of each `border-radius`, `padding*`, `margin*`, `gap`, and
      `font-size` declaration in the CSS of `Base.astro` is a `var()`,
      `0`, or `auto`.
- [x] AC2: No `.astro` file under `site/src` other than `Base.astro` holds
      a `<style>` element or a `style` attribute.
- [x] AC3: On the built fixture home page, each row keeps, in order, the
      name link and its `href`, the `data-archived` mark, the
      `data-description` line, and the pills (`data-major`,
      `data-support`, `title`, hidden text) or the status line. Each `li`
      keeps `data-plugin`, `data-languages`, and `data-zotero`.
      `p.language-filter`, `div.version-filter`, and the filter status
      line keep `hidden`. The select, the buttons, and the status line
      keep their `id`, `data-*`, `value`, `aria-pressed`, and `role`
      attributes. Each of these matches the built page at the merge
      commit of M048.
- [x] AC4: On the built fixture home page, served from a local server at
      the Pages base path in the browser pane, each non-empty menu option
      and each major button shows exactly the rows that match. For a
      major, those are the rows whose pill for it is "all" or "some". The
      status line then reads what `filterStatus(shown, total, true)`
      returns.
- [x] AC5: Each text and background pair that one rule added or changed by
      this milestone sets together has a contrast ratio of at least 4.5:1
      by the WCAG 2.2 relative-luminance formula, in the light and the
      dark `:root` blocks. The pairs are found from the diff of
      `Base.astro` against the merge commit of M048.
- [x] AC6: The built fixture home page, served as in AC4, shows no
      horizontal page scroll at viewport widths 360 px and 1280 px. The
      measure is `document.documentElement.scrollWidth <=
      document.documentElement.clientWidth`.
- [x] AC7: One `CHANGELOG.md` entry under Unreleased describes the new
      look of the header, the footer, and the home page. The profile's
      `verify` slot is clean: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1, T2
- AC2 → T1
- AC3 → T1, T2
- AC4 → T3
- AC5 → T2
- AC6 → T3
- AC7 → T4

## Tasks

- [x] T1: Write the tests first: the AC1 declaration test, the AC2 style
      test, and the AC3 home row and filter checks. Make the AC1 and AC2
      tests show that they read a non-empty set of declarations and files.
      See the AC1 test fail on the literal values left after M048.
- [x] T2: Add the spacing and type-size properties. Restyle the header,
      the footer, the intro, the filters, and the home rows with them.
      Extend the AC6 color-pair test of M048 with each pair this
      milestone adds.
- [x] T3: Serve the built fixture site at the Pages base path. Check the
      language menu and the version buttons (AC4) and measure AC6 at both
      widths. Take screenshots.
- [x] T4: Add the CHANGELOG entry. Run `pnpm test` and `pnpm check`.

## Work log

- 2026-10-29: created by /milestone-plan.
- 2026-10-29: tier check: milestone — new layout work with design choices.
- 2026-10-29: idea vet: no concern. The change restyles shared parts and shows the same facts.
- 2026-10-29: lessons used: 2026-10-26 (M015) local server for the pane, 2026-10-25 (M007) match the attribute form in page tests, 2026-10-27 (M024) an empty attribute value prints as a bare name.
- 2026-10-29: question set: reach — whole site, so this milestone exists.
- 2026-10-29: plan gate chose a whole-site restyle over plugin pages alone, at the user's choice; falsified by a home page check where the filters stop working after the restyle.
- 2026-10-29: criteria audit (full): 8 findings, all fixed. AC1 allows `auto`, skips `.visually-hidden`, covers longhands and each value part, and drops its test-text clause (moved to T1). AC2 covers `.astro` files and `style` attributes. AC3 lists the parts and attributes the script uses, at M048's merge commit. AC4 checks each option and button and names `filterStatus`. AC5 covers changed rules. Out now says how far AC1 reaches into the plugin page rules.
- 2026-10-29: status in-progress; branch m049-site-wide-look cut from main at fad2e7e.
- 2026-10-29: T1: `test/support/home-facts.ts` reads the home rows' and filters' AC3 facts from built HTML by data attributes; `test/fixtures/site/home-facts.json` holds them from the fixture home page built at fad2e7e, whose site code equals the M048 merge dc1caf0. The AC1 test failed on 42 literal values before T2. Planted defects (no `hidden` on the language menu, a 1.3:1 select color, a `style` attribute in Support.astro) each turned their test red.
- 2026-10-29: T1 and T2 share one commit, since the AC1 test stays red until T2.
- 2026-10-29: T2 choices: `--space-N` is N eighths of a rem (1–6, 8, 12), `--text-xs/s/l`, `--radius-pill`; header and footer take the card class as `.site-head` and `.site-foot`; the home h1 and intro sit in `div.card.page-head`; the filters get no wrapper card, since they are hidden without JavaScript and an empty card would show; the select takes the version buttons' shape; plugin page values unchanged; footer top margin 2rem to 1.5rem, its paragraphs 0.25rem apart; a home row's last child loses its bottom margin.
- 2026-10-29: T2: for AC5, a new test checks every rule that sets a text color and a background together, in both schemes, instead of extending M048's pair list; the one new pair is the select's `--text` on `--card`, already on that list. Verify clean: 1060 tests passed, 6 skipped; `pnpm check` 56 entries, 0 problems.
- 2026-10-29: T3: fixture site at commit 4ede776 served on port 4326 under `/zotero-plugin-index/`. Each of the 6 menu options and 4 major buttons showed exactly its matching rows, with "Showing n of 9 plugins." as `filterStatus(n, 9, true)` gives; Any version reset to 9 rows and an empty status. Width in 360 and 1280 px iframes: scrollWidth equals clientWidth, also with `?language=zh&zotero=9`; a planted 900 px div gave 916 > 360. Screenshots taken at 1280 and 360 px (dark scheme), footer included.
- 2026-10-29: T4: CHANGELOG entry under Unreleased for the header, footer, and home look; DESIGN's style note names the custom-property and no-other-style rules. README describes facts, not looks, so it needs no change. Verify clean: 1060 tests passed, 6 skipped; `pnpm check` 56 entries, 0 problems.
- 2026-10-29: claim audit: 21 claims read, 5 corrected — CHANGELOG.md, test/site.test.ts, test/support/home-facts.ts
- 2026-10-29: claim audit fixes: the CHANGELOG names the bold labels; the AC1 test name lists its properties, exemptions, and allowed values; the helper's comments say which classes it still reads, that it prints the fixture's "facts" field, and which attributes it keeps. The same reader re-read the five: all true. Open concern: WebKit may not draw a rounded border on a native `<select>` without `appearance: none`; not checked in Safari. Verify clean: 1060 passed, 6 skipped; `pnpm check` 0 problems.
- 2026-10-29: status review.

## Decisions

## Review

- Route (d): no PR for the branch; main at fad2e7e, the branch's base, so no sync. Copilot round off (no header line). Head a09b510.
- Verify (2026-10-29, head a09b510): `pnpm test` 1060 passed, 6 skipped, 22 files; `pnpm check` 56 entries, 0 problems.
- AC1: test "takes each margin, padding, gap, corner radius, and font size outside :root and .visually-hidden from a custom property, 0, or auto" passed; it found each of border-radius, padding, margin, margin-left, gap, and font-size, and no literal part. Planted literals failed it at T1 (42 parts).
- AC2: test "leaves styles out of every other .astro file" passed over the three other files (pages/index.astro, pages/plugins/[id]/index.astro, components/Support.astro); a planted `style` attribute in Support.astro failed it at T1.
- AC3: fixture home page built fresh at dc1caf0 (M048 merge, in a detached worktree) and at a09b510; `homeFacts` gave identical output for both (9 rows, 40 parts, the two filters' `hidden`, select, 7 options, 5 buttons, status line attributes), equal to `test/fixtures/site/home-facts.json`. Test "keeps the facts of its rows and filters as the page had them before the restyle" passed; dropping `hidden` from the language menu failed it at T1.
- AC4: a09b510 fixture build served at `http://localhost:4326/zotero-plugin-index/` in the browser pane. Each of the 6 options (zh, es, en, fr, de, pt) and the 4 majors showed exactly the rows that match (2, 2, 1, 1, 1, 1; 3, 3, 3, 1), the majors by pills of "all" or "some"; the status line read "Showing n of 9 plugins.", which is `filterStatus(n, 9, true)` for n ≥ 1. Any version gave back 9 rows and an empty line.
- AC5: rules of `Base.astro` at a09b510 not present verbatim at dc1caf0: 34. Those that set a text and a background together: `body` --text on --page 15.59 light, 15.47 dark; `[data-language-filter]` and `[data-version-filter] button` --text on --card 16.83 light, 13.93 dark. Both "each rule sets together" contrast tests passed; a planted 1.3:1 select color failed them at T1.
- AC6: same served build, home page in same-origin iframes: 360 px wide, scrollWidth 360 = clientWidth 360; 1280 px wide, 1280 = 1280. At T3 a planted 900 px div gave 916 > 360.
- AC7: `CHANGELOG.md` holds one new entry under Unreleased (the only one `git diff main` adds there), "The header, the footer, and the home page take the card look of the plugin pages…", naming the header, footer, and home page. Verify clean as above.
- Gate: `cairn_validate.py` all checks passed (exit 0); no principle changed, so no `cairn_impact`; the generic profile names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
