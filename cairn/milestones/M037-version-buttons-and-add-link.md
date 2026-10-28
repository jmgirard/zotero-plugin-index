<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section. -->
# M037: Filter by Zotero version and link the add form

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — site visitors see and use the buttons and the link
- **Branch/PR:** m037-version-buttons-and-add-link

## Goal

A site visitor can narrow the home list to the plugins that declare a chosen Zotero major version, and can reach the "Add a plugin" form from the home page.

## Scope

**In:** A `data-zotero` attribute on each home row listing the majors whose
pill is all or part. A button group, "Declares Zotero", with "Any version"
and one button per entry of `ZOTERO_MAJORS`, one choice at a time, hidden in
the HTML and shown by the home page's one script (D-014, annotated by
D-019). The script combines the buttons with the language menu and keeps
the choice in a `zotero` address parameter, replacing the address as the
language menu does. Pure functions in `src/site/` for the row test, the
parameter read, and the address write. A link reading "Add a plugin" in the
home intro to the issue form. Button styles in `Base.astro`, light and dark.
README, CHANGELOG, and DESIGN updates.

**Out:** Showing the list before the script runs: candidate row "Filter the
home list before it paints". An automated browser test: candidate row "Test
the home page script in a browser". Choosing several versions at once and
counts on the buttons: not planned (question set chose one at a time; no
counts, see work log). Script on the plugin pages: none (D-014).

## Acceptance criteria

- [x] AC1: Each row of the home list carries a `data-zotero` attribute: the
      majors of `ZOTERO_MAJORS` for which `majorSupport` gives `all` or
      `some`, in `ZOTERO_MAJORS` order, joined by single spaces, and
      `data-zotero=""` when no major gives either. A test in
      `test/site.test.ts` matches each row's `data-plugin` and `data-zotero`
      on the home page built from the site fixture against values written
      out by hand for every fixture row, among them a row whose pills are
      all `none`.
- [x] AC2: The home page HTML holds a `<div class="version-filter" hidden>`
      that holds a `<span>` reading "Declares Zotero" and a
      `<div role="group">` whose `aria-labelledby` names that span's `id`.
      The group holds one `<button type="button">` reading "Any version"
      with `aria-pressed="true"`, then one per entry of `ZOTERO_MAJORS`, in
      that order, reading the major, with `aria-pressed="false"`, and no
      other buttons. The home page holds exactly one `<script>` element. A
      test in `test/site.test.ts` matches that markup.
- [x] AC3: Functions in `src/site/` decide which rows show and what the
      address says, and Vitest tests cover each of these cases: a row shows
      if and only if both the language value and the version value pass it;
      the version value "" or a value no button has passes every row; a
      major passes a row whose `data-zotero` lists it and fails a row whose
      `data-zotero` is "" or lists only other majors, `10` among them; a
      `zotero` parameter that names a button's value becomes the chosen
      value, and any other value, or none, gives ""; choosing a major sets
      `zotero=<major>` in the address, choosing "" or holding a `zotero`
      value no button has removes the parameter, and in each case a
      `language` parameter keeps its value.
- [x] AC4: In the browser pane, on a site that `pnpm site` builds from one
      fetched copy of the deployed `v1/plugins.json`, for each of the five
      buttons, once with the language menu at "All languages" and once at a
      language whose plugins include one that declares the pressed major and
      one that does not: the ids of the rows shown, collected by script in
      the pane, equal the ids whose `data-zotero` lists the pressed major
      (for "Any version", every id) among those the language menu shows, as
      computed with `majorSupport` from that same copy; the pressed button
      alone has `aria-pressed="true"`; and the address carries
      `zotero=<major>`, or no `zotero` parameter for "Any version". Changing
      the language menu while a major is pressed keeps `zotero=<major>` in
      the address and both filters on the rows, and opening the page at an
      address with `zotero=8` shows the "8" button pressed and its rows.
- [x] AC5: The home page's intro holds a link reading "Add a plugin" whose
      href is
      `https://github.com/jmgirard/zotero-plugin-index/issues/new?template=add-plugin.yml`.
      A test in `test/site.test.ts` checks the link and that
      `.github/ISSUE_TEMPLATE/` holds the file its `template` value names.
- [x] AC6: `README.md` describes the version buttons (what a pressed button
      shows, the `zotero` parameter, and that without JavaScript the page
      shows no buttons and every plugin) and the "Add a plugin" link, and
      `CHANGELOG.md`'s Unreleased section has one entry for both.
- [x] AC7: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1
- AC2 → T3
- AC3 → T2
- AC4 → T3, T6
- AC5 → T4
- AC6 → T5
- AC7 → T1, T2, T3, T4

## Tasks

- [x] T1: Add `rowMajors` (or a like name) beside `majorSupport` in
      `src/site/version.ts` and an attribute wrapper in `site/src/data.ts`
      that passes `new String("")` for an empty value, as
      `rowLanguagesAttribute` does (LESSONS M024). Add a fixture record whose
      pills are all `none`. Write `data-zotero` on each row in
      `site/src/pages/index.astro`; test every row against hand-written
      values.
- [x] T2: Add the version filter functions to `src/site/` (extend
      `language-filter.ts` or rename it to cover both filters, keeping the
      script's imports plain TypeScript with no imports): row test, `zotero`
      parameter read, address write that keeps other parameters. Tests for
      each AC3 case.
- [x] T3: Add the hidden button group after the language menu in
      `index.astro`; extend the one script to read `?zotero=`, set
      `aria-pressed`, filter rows by both values on button press, menu
      change, load, and `popstate`, replace the address, and unhide the
      group. Pressed and focus styles in `Base.astro` for light and dark.
      Site tests for the markup and the one `<script>`; match attribute
      forms, not bare strings (LESSONS M007).
- [x] T4: Add the "Add a plugin" link to the home intro, with `{" "}` at
      line ends where text meets an element (LESSONS M021); site test for
      the href and the template file.
- [x] T5: README home page section (buttons, parameter, no-JavaScript
      fallback, link), one CHANGELOG Unreleased entry, DESIGN Contract
      boundary and Architecture (the one script now runs both filters).
      Wrap prose near 76 columns and list long added lines (LESSONS M036).
- [x] T6: Hand check in the browser pane per AC4: fetch the deployed data
      once, `pnpm site --out <dir>`, serve with `python3 -m http.server`
      from a `.claude/launch.json` entry kept out of git (LESSONS M015,
      M035), collect shown ids by script for each case, and compare with
      ids from `majorSupport` over the same copy.

## Work log

- 2026-10-28: created by /milestone-plan.
- 2026-10-28: tier check: milestone — new home page behavior with a design decision on what a version button keeps.
- 2026-10-28: idea vet: one concern, which plugins a version button keeps (part of a version is mostly a maximum of `10.0.*`, 11 of 42 live plugins for Zotero 10); question set chose all or part. Framing as "Declares Zotero" follows DESIGN's rule that pills show only the declared range.
- 2026-10-28: question set: which plugins a button keeps — all or part; one version or several — one at a time; where the add link goes — home page intro.
- 2026-10-28: lessons used: 2026-10-25 (M001), 2026-10-25 (M007), 2026-10-26 (M015), 2026-10-27 (M021), 2026-10-27 (M024), 2026-10-28 (M035), 2026-10-28 (M036).
- 2026-10-28: collision check: D-014 says the home page carries one language-filter script; the buttons join that script, recorded as D-019 annotating D-014. D-009 and M015 removed a typed version field for pills; the buttons filter by the pills' majors and add no typed field, so no rejection applies. Candidate rows "Filter the home list before it paints" and "Test the home page script in a browser" also cover the new buttons and stay as rows.
- 2026-10-28: inbox sweep: 0 open issues; 1 open PR (bot discovery PR #57), no overlap.
- 2026-10-28: criteria audit (full mode, fresh Opus reader): 9 findings, all fixed — AC1 named a fixture shape that does not exist, now hand-written values for every row plus an all-none fixture row; AC2 markup and labeling pinned, one `<script>` added; AC3 if-and-only-if, empty and other-major rows, unknown parameter removal, wiring claim dropped to AC4; AC4 one fetched data copy, ids collected by script, a mixed language, language change while a major is pressed; D-014 annotation and DESIGN update added (D-019, T5).
- 2026-10-28: plan gate chose replacing the address on a button press over adding a history entry because the language menu replaces it and Back then leaves the page for both; falsified by visitors or the maintainer expecting Back to undo a filter press.
- 2026-10-28: plan gate chose one script for both filters over a second script because D-014 keeps the site at one script and both filters act on the same rows; falsified by the script growing past what one module can test through pure functions.
- 2026-10-28: plan gate chose buttons with no counts over counts like the language menu's because a count that ignores the chosen language misleads beside a filtered list; falsified by visitors asking how many plugins declare a version.
- 2026-10-28: implement started on branch m037-version-buttons-and-add-link.
- 2026-10-28: T1 done — `rowMajors` in `src/site/version.ts`, `rowMajorsAttribute` in `site/src/data.ts` sharing an `attributeValue` helper with `rowLanguagesAttribute`, fixture record `zotero6-plugin@example.org` (range 6.0 to 6.*, all pills none), site test with hand-written values for all 9 rows; `pnpm test` 863 passed, `pnpm check` 0 problems.
- 2026-10-28: T2 done — renamed `src/site/language-filter.ts` to `home-filter.ts` (one module for both filters) with `passes`, `rowShows` (both filters), `chosenValue` (was `menuValue`), and `filterHref(href, name, value)`; tests moved to `test/home-filter.test.ts`; the script uses the new names for the language menu. Planted `||` for `&&` in `rowShows` (2 tests red) and a substring match in `passes` (1 red), both restored; `pnpm test` 881 passed.
- 2026-10-28: substantive amendment: AC2's wrapper changes from `<p class="version-filter" hidden>` to `<div class="version-filter" hidden>`, because a `<div>` cannot sit inside a `<p>` (the parser closes the `<p>`, so the group would show without JavaScript); the label is pinned as a `<span>` inside the wrapper whose `id` the group's `aria-labelledby` names, "no other buttons" and "exactly one `<script>`" added. Wording only; the user sees the same buttons.
- 2026-10-28: re-audit: AC2 (full) — the `<p>`-to-`<div>` wording left the label's place and element open (it could sit outside the hidden wrapper) and did not rule out extra buttons; both fixed in the wording above; a regex test cannot see browser parsing, left to the T6 hand check.
- 2026-10-28: re-audit: AC2 (full) — nothing blocking; notes that the test also pins `value="<major>"` and the span id's uniqueness is unchecked; no wording change.
- 2026-10-28: T3 done — hidden `div.version-filter` with span label and `role="group"` buttons after the language menu; the one script now reads `language` and `zotero`, sets `aria-pressed`, filters rows with `rowShows`, replaces the address on button press and menu change, re-reads on load and `popstate`, and unhides both filters; pressed and focus styles with light and dark tokens in `Base.astro`; site tests for the markup and one `<script>`. "Any version" has no `value` attribute, so its value is "" without Astro's bare-attribute rule.
- 2026-10-28: T4 done — `ADD_PLUGIN_HREF` in `site/src/data.ts`; intro sentence "Is a plugin missing? Add a plugin with a GitHub issue form, which needs a GitHub account."; site test for the href and the template file; `pnpm test` 883 passed.
- 2026-10-28: T5 done — README paragraphs on the buttons (all-or-part rule, no-range and failed rows hidden, both filters together, `?zotero=`, unknown value removed, no-JavaScript fallback) and the intro link; one CHANGELOG Unreleased entry; DESIGN Contract boundary, Function Families (`home-filter.ts`, `rowMajors`), and Architecture (one script, D-019). The simple-english hook flags 3 older README and CHANGELOG lines this branch did not touch; left as they are.
- 2026-10-28: T6 done — deployed `v1/plugins.json` fetched once (generatedAt 2026-10-28T02:03:27.093Z, sha256 prefix ea94c5b5489d10d1, 42 plugins), site built from it, served on port 4321; expected ids per case from `majorSupport` and `rowLanguages` over that copy. Language `zh` (28 plugins) mixes declaring and not declaring every major. All 10 cases (5 buttons × All languages, zh) matched exactly (counts 42/26/31/34/38 and 28/17/20/23/25), one pressed button each, `zotero` parameter set or absent as AC4 says; language change while 8 pressed kept `zotero=8` and both filters; `?zotero=8` opened with 8 pressed and its 31 rows; `?zotero=6&language=zh` became `?language=zh` with Any version pressed. DOMParser of the served HTML: wrapper hidden, all 5 buttons inside it, no row hidden, 1 script. Screenshots at desktop and 375 px width, dark scheme.
- 2026-10-28: claim audit: 31 claims read, 1 corrected — test/home-filter.test.ts (a test name said a value no button has is removed by `filterHref`; it passes "" and the removal comes from `chosenValue`; renamed, re-read true).
- 2026-10-28: implement complete; `pnpm test` 883 passed, `pnpm check` 0 problems; status set to review.

## Decisions

## Review

Evidence at 153c2c1, 2026-10-28; `pnpm test` 883 passed, 1 skipped; `pnpm check` 42 entries, 0 problems.

- AC1: `test/site.test.ts` "gives each row the Zotero majors it declares all or part of" passed; it matches `data-plugin` and `data-zotero` of all 9 fixture rows against hand-written values, including `zotero6-plugin@example.org` (pills all none) as `""`.
- AC2: "holds hidden version buttons, Any version pressed, then one for each major" passed (wrapper `div.version-filter hidden`, span id equal to the group's `aria-labelledby`, Any version `aria-pressed="true"` then 7, 8, 9, 10 `aria-pressed="false"`, nothing else in the group); "has a script on the home page only" passed with exactly one `<script` on the home page. DOMParser of the served page (T6): all 5 buttons inside the hidden wrapper.
- AC3: `test/home-filter.test.ts` 31 tests passed: `rowShows` true only when both filters pass (4 combinations); version "" and an unknown value pass every row; a major passes a listing row and fails `""` and other-major rows, 10 among them; `chosenValue` keeps a button's value and gives "" for an unknown value or none; `filterHref` sets `zotero=<major>`, removes it for "" with a major or an unknown value held, and keeps `language` in each.
- AC4: re-run at 153c2c1 in the browser pane on a site built from the fetched deployed copy (generatedAt 2026-10-28T02:03:27.093Z, 42 plugins); ids collected by script and compared with ids from `majorSupport` and `rowLanguages` over that copy. All 10 cases matched exactly (All languages 42/26/31/34/38; `zh`, which mixes declaring and not declaring every major, 28/17/20/23/25), one button pressed each time, `zotero` absent for Any version and `zotero=<major>` otherwise. Changing the language to All and to `zh` while 8 was pressed kept `zotero=8` and matched the expected ids; opening `?zotero=8` showed 8 pressed and its 31 rows.
- AC5: "links the intro to the Add a plugin form" passed: the intro's link reading "Add a plugin" has href `https://github.com/jmgirard/zotero-plugin-index/issues/new?template=add-plugin.yml`, and `.github/ISSUE_TEMPLATE/add-plugin.yml` exists.
- AC6: joined-text search: README holds the "Declares Zotero" paragraph (all-or-part rule, `zotero` query parameter, "without JavaScript the home page shows no buttons and lists every plugin") and the intro-link paragraph; CHANGELOG Unreleased holds one new entry naming the buttons, `?zotero=`, and the "Add a plugin" issue form.
- AC7: `pnpm test` 883 passed, 1 skipped (18 files); `pnpm check` 0 problems.
- Consistency gate: `cairn_validate.py` all checks passed (exit 0); no principle changed, so no `cairn_impact`; the generic profile names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: no automated test of the CHANGELOG's button claims; the script wiring is covered by the hand check only — follow-up, absorbed into "Test the home page script in a browser"
- diff-bug #2: README paragraph ragged ("show. The" line, a 118-column line) — fix now
- diff-bug #3: DESIGN Architecture says templates import `version.ts` through `data.ts` and `Support.astro`, but `index.astro` imports `ZOTERO_MAJORS` directly — fix now
- diff-bug #4: `aria-pressed` gives toggle semantics to a one-of-N choice; pressing a pressed major does not clear it — reject, planned change: AC2 names `aria-pressed` buttons, and "Any version" is the clear action
- diff-bug #5: no message or count when the filters hide every row — follow-up, new row "Say when the filters hide every plugin"
- diff-bug #6: unpressed button border (`--line`) about 1.15:1 light and 1.5:1 dark; in forced-colors mode only bold marks the pressed button — fix now (border `--muted`; forced-colors 3px `ButtonText` border on the pressed button)
- diff-bug #7: the buttons run only when the language menu exists (`if (select && buttons.length > 0)`) — reject, false: both always render in the same template, and no page state reaches a missing menu
- diff-bug #8: README and CHANGELOG say "from 7 to 10" while the buttons come from `ZOTERO_MAJORS` — reject, false: true at this head, and README's pill paragraph states the same range and changes with it
- diff-bug #9: tests the doctrine excludes: repeated paths in `passes`, `rowShows`, `chosenValue`, `filterHref`; the `ZOTERO_MAJORS` constant check; attribute-order regexes; no direct `rowMajors` test — fix now for the repeats (removed "Any version on a row with no majors", "neither passes", "both are at their all value", the language `chosenValue` pairs, the second `zotero` set expect, "the zotero parameter already set", the `ZOTERO_MAJORS` expect; AC3-named cases kept); reject the regex order as style (same pattern as the language-menu test) and the `rowMajors` item as false (an internal helper, tested through every fixture row)
- blame-history #1: `?zotero=` has the same before-paint gap as `?language=` — follow-up, absorbed into "Filter the home list before it paints"
- blame-history #2: the untested script block grew — follow-up, absorbed into "Test the home page script in a browser"
- blame-history #3: README ragged wrap; DESIGN "carried no script from M015" reads awkwardly — README fix now (same as diff-bug #2); DESIGN sentence reject, style (pre-existing wording, still true)
- blame-history #4: `data.ts` comment dropped the concrete `data-languages` example — reject, style
- prior-review #1: ragged README rewrap repeats M026, M028, M033, M035 findings — fix now (same as diff-bug #2)
- prior-review #2: `?zotero=` before-paint gap — follow-up, absorbed into "Filter the home list before it paints"
- prior-review #3: new site tests pin attribute strings and order, the brittleness M024 fixed — reject, style: AC2 names the attributes, and the language-menu test uses the same form
- ripple #1: README "A script runs the menu. Without JavaScript, the home page shows no menu" is now incomplete — reject, false: still true, and the next paragraph states the button fallback
- ripple #2: ROADMAP row "Test the home page script in a browser" names only the menu's DOM code — follow-up, row widened
- ripple #3: DESIGN Contract boundary's menu sentence sits apart from the buttons — reject, false: true, and the following sentence names the buttons and D-019
- ripple #4: ROADMAP row "Filter the home list before it paints" names only `?language=` — follow-up, row widened
