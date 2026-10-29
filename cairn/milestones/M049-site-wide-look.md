# M049: Give the whole site the card look

- **Status:** planned
- **Priority:** normal
- **Depends on:** M048
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the public site's shared header, footer, and home page
- **Branch/PR:** —

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

- [ ] AC1: Outside the `:root` blocks and `.visually-hidden`, each value
      part of each `border-radius`, `padding*`, `margin*`, `gap`, and
      `font-size` declaration in the CSS of `Base.astro` is a `var()`,
      `0`, or `auto`.
- [ ] AC2: No `.astro` file under `site/src` other than `Base.astro` holds
      a `<style>` element or a `style` attribute.
- [ ] AC3: On the built fixture home page, each row keeps, in order, the
      name link and its `href`, the `data-archived` mark, the
      `data-description` line, and the pills (`data-major`,
      `data-support`, `title`, hidden text) or the status line. Each `li`
      keeps `data-plugin`, `data-languages`, and `data-zotero`.
      `p.language-filter`, `div.version-filter`, and the filter status
      line keep `hidden`. The select, the buttons, and the status line
      keep their `id`, `data-*`, `value`, `aria-pressed`, and `role`
      attributes. Each of these matches the built page at the merge
      commit of M048.
- [ ] AC4: On the built fixture home page, served from a local server at
      the Pages base path in the browser pane, each non-empty menu option
      and each major button shows exactly the rows that match. For a
      major, those are the rows whose pill for it is "all" or "some". The
      status line then reads what `filterStatus(shown, total, true)`
      returns.
- [ ] AC5: Each text and background pair that one rule added or changed by
      this milestone sets together has a contrast ratio of at least 4.5:1
      by the WCAG 2.2 relative-luminance formula, in the light and the
      dark `:root` blocks. The pairs are found from the diff of
      `Base.astro` against the merge commit of M048.
- [ ] AC6: The built fixture home page, served as in AC4, shows no
      horizontal page scroll at viewport widths 360 px and 1280 px. The
      measure is `document.documentElement.scrollWidth <=
      document.documentElement.clientWidth`.
- [ ] AC7: One `CHANGELOG.md` entry under Unreleased describes the new
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

- [ ] T1: Write the tests first: the AC1 declaration test, the AC2 style
      test, and the AC3 home row and filter checks. Make the AC1 and AC2
      tests show that they read a non-empty set of declarations and files.
      See the AC1 test fail on the literal values left after M048.
- [ ] T2: Add the spacing and type-size properties. Restyle the header,
      the footer, the intro, the filters, and the home rows with them.
      Extend the AC6 color-pair test of M048 with each pair this
      milestone adds.
- [ ] T3: Serve the built fixture site at the Pages base path. Check the
      language menu and the version buttons (AC4) and measure AC6 at both
      widths. Take screenshots.
- [ ] T4: Add the CHANGELOG entry. Run `pnpm test` and `pnpm check`.

## Work log

- 2026-10-29: created by /milestone-plan.
- 2026-10-29: tier check: milestone — new layout work with design choices.
- 2026-10-29: idea vet: no concern. The change restyles shared parts and shows the same facts.
- 2026-10-29: lessons used: 2026-10-26 (M015) local server for the pane, 2026-10-25 (M007) match the attribute form in page tests, 2026-10-27 (M024) an empty attribute value prints as a bare name.
- 2026-10-29: question set: reach — whole site, so this milestone exists.
- 2026-10-29: plan gate chose a whole-site restyle over plugin pages alone, at the user's choice; falsified by a home page check where the filters stop working after the restyle.
- 2026-10-29: criteria audit (full): 8 findings, all fixed. AC1 allows `auto`, skips `.visually-hidden`, covers longhands and each value part, and drops its test-text clause (moved to T1). AC2 covers `.astro` files and `style` attributes. AC3 lists the parts and attributes the script uses, at M048's merge commit. AC4 checks each option and button and names `filterStatus`. AC5 covers changed rules. Out now says how far AC1 reaches into the plugin page rules.

## Decisions

## Review
