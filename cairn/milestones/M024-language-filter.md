<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M024: Filter the home list by interface language

- **Status:** review   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** normal   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** M023   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** —   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** user-facing — it changes the public site's home page and plugin pages   <!-- owner: plan · create/amend-via-gate; user-facing | internal — <one-clause reason>; skill conduct only — no validate check parses it -->
- **Branch/PR:** m024-language-filter   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

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

- [x] T1: Add records to `test/fixtures/site/plugins.json` for AC1's six
      cases and AC2's `zh-CN` and `zh-TW` record. The fixture must stay
      valid against the v1 schema (the existing fixture test).
- [x] T2: Write the tests for AC3's six inputs first, then add the language
      helpers to `src/site/`: the applied list, the display name, the row's
      subtags, the menu options, and the function that decides whether a row
      shows.
- [x] T3: Add the plugin page fact to `site/src/pages/plugins/[id]/index.astro`
      and a `languages` key to `upstreamValue` in `site/src/data.ts`, with
      AC1's tests. Write `{" "}` at a line end before an element.
- [x] T4: Add the menu, the row attributes, and the `<script>` to
      `site/src/pages/index.astro`, the script importing T2's function. Add
      AC2's and AC4's tests, matching attributes in their `data-x="` form.
      Update tests that count the built files, if the script becomes an
      `_astro/` file.
- [x] T5: Build the site from the fixture. Serve it with a
      `.claude/launch.json` entry running `python3 -m http.server`, with the
      site at `<dir>/zotero-plugin-index/` and the file kept out of git
      through `.git/info/exclude`. Run AC3's four browser steps in the
      built-in browser pane and record what each step showed.
- [x] T6: README "The site", the CHANGELOG entry, and DESIGN ("Contract
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
- 2026-10-27: from the M023 review: the `languages` override pattern accepts a repeated tag and other letter case (`zh-CN, zh-CN`, `ZH-cn`), so the applied list should write each tag in `Intl.getCanonicalLocales` form once before the page fact, the row's `data-languages`, and the menu counts use it. M023 also added the `languages` key to `upstreamValue`, so T3 keeps it and adds AC1's table tests.
- 2026-10-27: T1 done: the site fixture gains languages on five records and a seventh record, `locale-plugin@example.org`, for the override pair; `first` holds two upstream tags, `old` `[]`, `guid` no field, `no-range` the unversioned `fr, de` override, `min-only` `zh-CN, zh-TW` with an override for version 1.0.0 only, and `locale` a version-specific `pt-BR, es-419` beside an unversioned `es`. `pnpm test` (647) and `pnpm check` pass.
- 2026-10-27: T2 choice: the filter function `rowShows(rowLanguages, value, options)` sits alone in `src/site/language-filter.ts`, with no imports, so the page's script bundles only it; it takes the menu's values so that a value no option has shows every row, AC3's sixth input. The build helpers (`appliedLanguages`, `languageName`, `rowLanguages`, `languageOptions`) sit in `src/site/languages.ts`; `appliedLanguages` passes the list through `Intl.getCanonicalLocales`, which writes each tag in canonical form once, per the M023 review note.
- 2026-10-27: T2 done: `test/language.test.ts` was red before the two files existed and passes with 14 tests, AC3's six `rowShows` inputs among them. `pnpm test` (661) and `pnpm check` pass.
- 2026-10-27: T3 done: the plugin page shows `<p class="languages">Interface languages: <span data-fact="languages">…</span></p>` between the declared-range line and the reports section, from `languagesText` in `site/src/data.ts`; `.languages` takes the muted color of `.range`. The page-order test now places the fact; six fact tests and two Overrides-table tests added. `pnpm test` (669) and `pnpm check` pass.
- 2026-10-27: T4 choices: the menu is `<p class="language-filter" hidden>` holding `<label for="language">Interface language</label>` and `<select id="language" data-language-filter>`; the script updates the URL with `history.replaceState`, so a menu change adds no history entry and Back leaves the page; on load it leaves an unknown `language` value in the URL. Astro writes an attribute whose value is `""` as its bare name, so `rowLanguagesAttribute` in `site/src/data.ts` passes an empty value as a String object, which Astro writes as `data-languages=""` (seen in a fixture build before and after).
- 2026-10-27: T4 done: Astro inlines the script as `<script type="module">` in `index.html`, so no `_astro/` file exists and no file-count test changed. Tests added for each row's `data-languages`, the menu's options, and a script on the home page only (AC4); the row helper of the home-page tests now matches `data-plugin="<id>" `. `pnpm test` (672) and `pnpm check` pass.
- 2026-10-27: T5 done: the fixture site was built into the scratchpad at `serve/zotero-plugin-index/` and served by the `site-preview` entry of `.claude/launch.json` (already in `.git/info/exclude`), on port 4321. In the built-in browser pane: (1) loading `/zotero-plugin-index/` showed the menu, with "All languages" selected and all 7 rows visible; (2) picking "Chinese (2)" left visible only `first-plugin@example.org` and `min-only-plugin@example.org`, and the URL became `/zotero-plugin-index/?language=zh`; (3) picking "All languages" showed all 7 rows and the URL lost its query; (4) loading `?language=xx` selected "All languages" with all 7 rows visible. Loading `?language=zh` also selected Chinese and showed the same 2 rows.
- 2026-10-27: T5 fix: the pane showed the label touching the menu, because Astro drops the line break between `</label>` and `<select>`; a `{" "}` now writes a space, and the menu test matches it. `pnpm test` (672) and `pnpm check` pass.
- 2026-10-27: T6 done: README "The site" gains a paragraph on the menu, the `language` parameter, and the full list without JavaScript, and its plugin-page paragraph names the languages fact; M023's `## Unreleased` CHANGELOG entry gains the page fact and the menu (series rule); DESIGN's Contract boundary, site build line, and Architecture script line now state the fact, the menu, and the one script (D-014). The simple-english lint hook still flags README lines 93, 350, 364 and CHANGELOG lines 74, 165, all in text older than this milestone; left as they are. `pnpm test` (672) and `pnpm check` pass.
- 2026-10-27: claim audit: 38 claims read, 3 corrected — CHANGELOG.md (the languages line shows only on pages of plugins the index read), README.md (a failed plugin's page has no languages line), src/site/languages.ts (the `appliedLanguages` comment now names the override case); the same Opus reader re-read the three and found each true. `pnpm test` (672) and `pnpm check` pass.
- 2026-10-27: implement done; status set to review.

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive. -->
