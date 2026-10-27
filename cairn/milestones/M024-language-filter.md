<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M024: Filter the home list by interface language

- **Status:** planned   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** normal   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** M023   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** —   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** user-facing — it changes the public site's home page and plugin pages   <!-- owner: plan · create/amend-via-gate; user-facing | internal — <one-clause reason>; skill conduct only — no validate check parses it -->
- **Branch/PR:** —   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

## Goal
<!-- owner: plan · create; a wrong goal returns to plan, never edited in place -->

A site visitor can narrow the home list to the plugins that ship one
interface language.

## Scope
<!-- owner: plan · create/amend-via-gate -->

**In:** each plugin page shows its interface languages. The home page gets
a language menu that a script shows and runs, with the choice kept in a
`language` query parameter. Without JavaScript the home page shows the full
list and no menu. README, CHANGELOG, and DESIGN follow, under D-014.

**Out:**
- The data field and the override → M023.
- Links from a plugin page's languages to the filtered home list. The goal
  needs only the menu, so no row.

The applied list of a record comes from the `languages` override that
applies to the version the index read, as `usedOverride` in
`src/site/version.ts` picks it. The list is that override's `value`, split
on `, `. With no such override, the list is `upstream.languages`. A record
with no `upstream` has an empty applied list. M023 keeps
`upstream.languages` optional, so a record may lack it.

## Acceptance criteria
<!-- owner: plan · create/amend-via-gate; review reads, never reinterprets. -->

- [ ] AC1: Each plugin page whose record has `upstream` shows an "Interface
      languages" fact (`data-fact="languages"`) outside the Details section.
      It comes after the declared-range line if the page has one, and before
      the reports section. The fact names each tag of the applied list by
      `new Intl.DisplayNames(["en"], { type: "language", languageDisplay: "standard" }).of(tag)`,
      in list order, joined by `, `. If the list is empty, the fact says
      "None declared". Tests in `test/site.test.ts` check the fact's text for
      six records against text written in the test:
      - two tags in `upstream.languages`, `[]`, and no `languages` field;
      - an override with no version whose value `fr, de` is out of
        code-unit order, shown in that order;
      - an override for another version only, so the upstream list shows;
      - an override for the version read beside one with no version, where
        the version-specific override's list shows.
      In the Overrides table, a `languages` override shows the upstream list
      joined by `, ` as its upstream value. If that list is empty or absent,
      the table shows "none". Tests check the table for an empty and a
      non-empty upstream list.
- [ ] AC2: The built home page holds a `<label>` and a
      `<select data-language-filter>` inside one element with the `hidden`
      attribute. The first option is "All languages", with the value `""`.
      Then comes one option for each subtag that some row carries. The
      option's value is the subtag. Its text, written at build, is
      `DisplayNames.of(subtag)`, with the `DisplayNames` of AC1. A space
      follows, then the number of rows that carry the subtag in parentheses,
      such as `Chinese (2)`. These options are sorted by text in code-unit
      order. Each plugin row carries `data-languages`. Its value is the
      language subtags (`new Intl.Locale(tag).language`) of the row's
      applied list, each once, in code-unit order, joined by single spaces.
      A test over the site fixture checks each row's `data-languages="`
      attribute and each option's value and text against values written in
      the test. The fixture holds a record with `zh-CN` and `zh-TW`, counted
      once under `zh`. It also holds a record whose read failed, whose row
      carries `data-languages=""`.
- [ ] AC3: The home page's script removes that `hidden` attribute. When the
      visitor picks an option, the script shows each row whose
      `data-languages`, split on spaces, contains the option's value, and
      hides each other row. "All languages" shows every row. The script then
      sets the URL's `language` query parameter to the value, keeping the
      path, and removes the parameter for "All languages". When the page
      loads with a `language` parameter equal to an option's value, the
      script selects that option and applies the same filter. With any other
      value, it selects "All languages" and shows every row. A function in
      `src/site/` decides whether a row shows. Tests in `test/` cover six
      inputs: a subtag the row carries, `""`, a row with an empty
      `data-languages`, `en` against a row that carries only `ken`, and a
      row with several subtags whose match is not the first. The sixth is a
      value that no option has, where the page shows every row. A browser
      check on the site built from the fixture, served on this machine with
      the output directory at `/zotero-plugin-index/`, shows four things.
      Loading the home page shows the menu. Picking Chinese leaves visible
      exactly the fixture rows the test lists for `zh`, and the URL then
      ends with `?language=zh`. Picking "All languages" shows every row and
      drops the parameter. Loading `?language=xx` selects "All languages"
      and shows every row.
- [ ] AC4: No page built from the site fixture, other than the home page,
      holds a `<script` element. A test reads every `.html` file of that
      build to show it.
- [ ] AC5: README "The site" describes the language menu, the `language`
      query parameter, the full list that shows without JavaScript, and the
      plugin page fact. The `## Unreleased` entry of `CHANGELOG.md` for the
      language list names them. If a release took that entry, a new entry
      names them.
- [ ] AC6: `pnpm test` and `pnpm check` pass.

## Coverage
<!-- owner: plan · create/amend-via-gate; each acceptance criterion → the
     task(s) satisfying it, by positional number (AC/Task counted
     top-to-bottom). Review reads to fence evidence — tracking-rules "AC fencing". -->

- AC1 → T1, T3
- AC2 → T1, T4
- AC3 → T2, T4, T5
- AC4 → T4
- AC5 → T6
- AC6 → T6

## Tasks
<!-- owner: plan (create) / implement (check-off, minor edits); substantive
     change is amend-via-gate. -->

- [ ] T1: Add records to `test/fixtures/site/plugins.json` for AC1's six
      cases and AC2's `zh-CN` and `zh-TW` record. The fixture must stay
      valid against the v1 schema (the existing fixture test).
- [ ] T2: Write the tests for AC3's six inputs first, then add the language
      helpers to `src/site/`: the applied list, the display name, the row's
      subtags, the menu options, and the function that decides whether a row
      shows.
- [ ] T3: Add the plugin page fact to `site/src/pages/plugins/[id]/index.astro`
      and a `languages` key to `upstreamValue` in `site/src/data.ts`, with
      AC1's tests. Write `{" "}` at a line end before an element.
- [ ] T4: Add the menu, the row attributes, and the `<script>` to
      `site/src/pages/index.astro`, the script importing T2's function. Add
      AC2's and AC4's tests, matching attributes in their `data-x="` form.
      Update tests that count the built files, if the script becomes an
      `_astro/` file.
- [ ] T5: Build the site from the fixture. Serve it with a
      `.claude/launch.json` entry running `python3 -m http.server`, with the
      site at `<dir>/zotero-plugin-index/` and the file kept out of git
      through `.git/info/exclude`. Run AC3's four browser steps in the
      built-in browser pane and record what each step showed.
- [ ] T6: README "The site", the CHANGELOG entry, and DESIGN ("Contract
      boundary", and the Architecture line that says the pages carry no
      script). Run `pnpm test` and `pnpm check`.

## Work log
<!-- owner: any skill · append-only; one line per entry; absolute dates. -->

- 2026-10-27: created by /milestone-plan.
- 2026-10-27: tier check: milestone — a new site feature that adds the site's first script.
- 2026-10-27: idea vet: three concerns, each answered at the question set. (1) The fact reads only locale folders: the user chose folders plus a `languages` override, in M023. (2) A filter needs a script, against D-009: the user chose a filter menu with a script over one page per language and over no filter, recorded as D-014. (3) zh-CN and zh-TW grouping: the user chose one group per language subtag. The user also chose the plugin page's main part for the fact over the Details section.
- 2026-10-27: lessons used: 2026-10-26 (M015, used M021) on serving the built site to the browser pane; 2026-10-27 (M021) on Astro dropping a line break before an element; 2026-10-25 (M007, used M021) on matching the attribute form when a page has a script; 2026-10-25 (M001, used M022) on running pnpm through npx.
- 2026-10-27: feature series: M023 -> M024
- 2026-10-27: question set: may the run act on GitHub to test — "n/a"; M024 needs no GitHub action, and its browser check runs on this machine.
- 2026-10-27: criteria audit (full mode), first round on per-language pages: its site findings (display-name form, Overrides "none", override cases, code-unit order, D-009) carried into this version. Second round, after the user chose a script, returned 11 findings, all fixed: serve at the Pages path; split `data-languages` on spaces, with the `ken` and later-subtag cases; filter on load; four browser steps stated as page behavior; Overrides-table tests and the `fr, de` order case; the fact's position named; M023's optional field named; AC4 bounded to the fixture build; options written at build; a label. Its `und` finding went to M023.
- 2026-10-27: plan gate chose a filter menu run by a script over one static page per language, at the user's choice; falsified by visitors who need the filter but run no JavaScript.
- 2026-10-27: plan gate chose a menu hidden in the HTML until the script runs over a menu that always shows, so a page without JavaScript shows the full list and no control that does nothing; falsified by a visitor who reads the hidden menu as missing.
- 2026-10-27: plan gate chose to keep the choice in a `language` query parameter over no URL state, so a filtered list can be linked; falsified by the parameter breaking the Pages path or the browser's back button.
- 2026-10-27: changelog: edits M023's `## Unreleased` entry under the series rule.

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive. -->
