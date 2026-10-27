<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M024: Filter the home list by interface language

- **Status:** in-progress   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
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
on `, `. With no such override, the list is `upstream.languages`. Each tag
of the list is then written in the form `Intl.getCanonicalLocales` returns,
once, in list order. A record with no `upstream` has an empty applied list. M023 keeps
`upstream.languages` optional, so a record may lack it.

## Acceptance criteria
<!-- owner: plan · create/amend-via-gate; review reads, never reinterprets. -->

- [x] AC1: Each plugin page whose record has `upstream` shows an "Interface
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
- [x] AC2: The built home page holds a `<label>` and a
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
- [x] AC3: The home page's script removes that `hidden` attribute. When the
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
- [x] AC4: No page built from the site fixture, other than the home page,
      holds a `<script` element. A test reads every `.html` file of that
      build to show it.
- [x] AC5: README "The site" describes the language menu, the `language`
      query parameter, the full list that shows without JavaScript, and the
      plugin page fact. The `## Unreleased` entry of `CHANGELOG.md` for the
      language list names them. If a release took that entry, a new entry
      names them.
- [x] AC6: `pnpm test` and `pnpm check` pass.

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
- 2026-10-27: amendment routed: AC1 — Scope defines the applied list that AC1's fact names as the `languages` override's value split on `, `, but `appliedLanguages` also writes each tag in `Intl.getCanonicalLocales` form once, as the M023 review note in this log asked, so an override `zh-CN, zh-CN` shows "Chinese (China)" once where the Scope text says twice (diff-bug #5); the fix-now findings landed in 0e60805; status set to in-progress for the Scope amendment alone.
- 2026-10-27: amendment return: AC1 — "Each tag of the list is then written in the form `Intl.getCanonicalLocales` returns, once, in list order." The sentence is added to the Scope paragraph that defines the applied list; no acceptance-criterion wording changed, so no criterion re-audit ran; the deliverable is unchanged, since the code already did this per the M023 review note; `test/language.test.ts` "writes each override tag in canonical form, once" pins it.
- 2026-10-27: claim audit: 64 claims read, 0 corrected — README.md, CHANGELOG.md, src/site/languages.ts, src/site/language-filter.ts, site/src/data.ts, site/src/pages/index.astro, test names; a second pass after the review's fixes added prose. The reader's own `test/site.test.ts` run failed at its `pnpm site` step in its sandbox; here `pnpm test` (676) and `pnpm check` pass.
- 2026-10-27: amendment done; status set to review.
- 2026-10-27: review return 1: the consistency gate's `weight caps` check fails — 150 plan-owned lines against a cap below 150, after the Scope amendment added a line; status set to in-progress.

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive. -->

- 2026-10-27 sync: `origin/main` is 2b317fb, the branch's merge base, so no merge was needed; no PR exists; the Copilot round is off (no header line in `cairn/PROFILE.md`).
- AC1 evidence (2026-10-27, head f3426e0): `vitest run test/language.test.ts test/site.test.ts --reporter=verbose` passes 71 of 71. "shows the interface languages for …" passes for the six records (two upstream tags, `[]`, no field, the unversioned `fr, de` override shown as "French, German", an override for another version only, a version-specific override beside an unversioned one), each against text written in the test; "shows the parts of <id> in order …" passes for all 7 records, placing `data-fact="languages"` after the declared-range line and before the reports section, outside `<details>`, and absent on the failed record's page; "shows a non-empty / an empty upstream list beside a languages override" passes ("en" and "none").
- AC2 evidence (same run): "gives each row the language subtags it applies" passes, matching every row's `data-languages="…"` against literal values, `""` for the failed `broken-plugin` and `zh` once for `min-only` (`zh-CN`, `zh-TW`); "holds a hidden language menu with one option for each subtag" passes, matching `<p class="language-filter" hidden>` with the `<label>` and `<select data-language-filter>` and the options "All languages" (`""`), then Chinese (2), English (1), French (1), German (1), Portuguese (1), Spanish (1).
- AC3 evidence: the six `rowShows` tests in `test/language.test.ts` pass (a carried subtag, `""`, an empty row, `en` against `ken`, a later subtag, `xx` with no option). Browser check at f3426e0: the fixture site built into the scratchpad at `serve/zotero-plugin-index/`, served by `python3 -m http.server 4321` (the `site-preview` entry), opened in the built-in pane: (1) `/zotero-plugin-index/` showed the menu (no `hidden` attribute left), "All languages", 7 rows visible; (2) picking "Chinese (2)" left `first-plugin@example.org` and `min-only-plugin@example.org` visible, the rows the AC2 test lists for `zh`, and the URL became `…/zotero-plugin-index/?language=zh`; (3) picking "All languages" showed 7 rows and the URL became `…/zotero-plugin-index/`; (4) loading `?language=xx` selected "All languages" with 7 rows visible.
- AC4 evidence: "has a script on the home page only" passes; it reads every `.html` file of the fixture build (8 files) and asserts `<script` in `index.html` and in no other file, so it fails if the home page loses its script or another page gains one.
- AC5 evidence: README "The site" (read 2026-10-27) has the "Interface language" menu paragraph, the `language` query parameter with `?language=zh`, "Without JavaScript, the home page shows no menu and lists every plugin", and the plugin-page paragraph naming the interface languages and "None declared". CHANGELOG has one release section, `## Unreleased`, so no release took the entry; its languages entry (M023's) names the "Interface languages" line, the menu, the `language` parameter, and the no-JavaScript list. Two lines of that entry ran past the wrap width after the claim fix and were reflowed with the same words.
- AC6 evidence: after the reflow, `pnpm test` (type check, then Vitest) passes 672 of 672 in 17 files, and `pnpm check` prints "checked 20 entries in plugins, 0 problems".
- Consistency gate: `cairn_validate.py` exits 0 (16 PASS, 8 advisories OK, `coverage complete` PASS); no principle changed, so `cairn_impact.py` is skipped; the `generic` profile's consistency-gate slot names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: the URL-parameter behavior (read `language` on load, fall back for an unknown value, set or remove it) sat in untested inline script code although README and CHANGELOG claim it — fix now, fixed 0e60805: `menuValue` and `filterHref` in `src/site/language-filter.ts`, tested in `test/language.test.ts`, which the script now calls.
- diff-bug #2: the page maps an unknown value to "" before `rowShows` sees it, so AC3's sixth `rowShows` case covers a path the page never runs, and the real fallback was untested — fix now, fixed 0e60805: the fallback is `menuValue`, tested with `xx`.
- diff-bug #3: a same-document Back step (after a hand-typed `#x`) restores the old address but leaves the menu and rows on the newer choice — fix now, fixed 0e60805: a `popstate` listener reads the address into the menu again.
- diff-bug #4: `?language=xx` selects "All languages" but leaves `?language=xx` in the address, so a copied link names a filter the page does not apply — fix now, fixed 0e60805: on load and on `popstate` a parameter that names no option is removed with `replaceState`.
- diff-bug #5: Scope defines the applied list as the override's value split on `, `, but `appliedLanguages` also writes each tag in canonical form once, from the M023 review note in the work log, so `zh-CN, zh-CN` shows once where the Scope text says twice — amendment return (the Scope promise, not the work, is wrong): routed to `/milestone-implement` for a gated Scope amendment.
- diff-bug #6: `rowLanguagesAttribute` passes `new String("")` because Astro tests for `""` with `===` — reject (planned change): AC2 asks for the literal `data-languages=""`, and its test fails if an Astro upgrade changes the output.
- diff-bug #7: the script's inline TypeScript is never type-checked — fix now, fixed 0e60805: the script's decisions moved to `src/site/language-filter.ts`, which `tsc` checks; the DOM glue left in the template follows the M007 rule that `.astro` files build without a type check, and the browser check covers it.
- diff-bug #8: with `?language=zh` the full list can paint before the module script filters it — follow-up: candidate row "Filter the home list before it paints".
- diff-bug #9: CHANGELOG line of 82 characters and README line of 92 characters past the wrap width — fix now, fixed 0e60805: reflowed.
- diff-bug #10: code-unit order would put a name that starts with a lowercase or non-ASCII letter after "Z" — reject (planned change): AC2 asks for code-unit order, and no English name the menu shows today starts that way.
- diff-bug #11: the `languageName` test checks `Intl.DisplayNames` through a one-line wrapper — reject (false): "What gets a test" requires a happy-path test for each new exported function, and `languageName` is exported for `site/src/data.ts`.
- diff-bug #12: the `rowLanguages` empty-row test runs the same path as the non-empty one, and the site test already pins `data-languages=""` — fix now, fixed 0e60805: test removed.
- diff-bug #13: the Overrides-table tests repeat `test/site-data.test.ts` coverage of `upstreamValue` — reject (planned change): AC1 names those tests.
- diff-bug #14: four of the six `rowShows` cases run the same `split(" ").includes` path — reject (planned change): AC3 names the six inputs.
- diff-bug #15: the canonical-form test mostly asserts what `Intl.getCanonicalLocales` does — reject (false): dedupe and case-fixing are `appliedLanguages`' own contract, from the M023 review note.
- diff-bug #16: the row regex and the `row()` helper break if `data-languages` moves before `data-plugin`, with no change in behavior — fix now, fixed 0e60805: both read each attribute from the row's tag by name; the menu regex keeps its exact markup, which AC2 states element by element.
- blame-history #1: `cairn/LESSONS.md` line 26 says the pages carry no script since M015 — fix now, fixed 0e60805: corrected in place (corrected M024).
- blame-history #2: D-009 has no pointer to D-014 — reject (false): DECISIONS.md is append-only, and D-014's heading names D-009 as superseded, as earlier pairs do.
- blame-history #3: `rowLanguagesAttribute` depends on Astro's exact check for `""` — reject (planned change): as diff-bug #6.
- blame-history #4: the CHANGELOG sentence "That line uses a `languages` override …" reads as if the line never shows the upstream list — fix now, fixed 0e60805: reworded to say the override's languages replace the list when one applies.
- blame-history #5: a record with no `languages` field shows "None declared", the same as `[]` — reject (planned change): AC1 names that case and its text.
- blame-history #6: CHANGELOG and README lines past the wrap width — fix now, fixed 0e60805: as diff-bug #9.
- blame-history #7: the full list shows until the module runs — follow-up: as diff-bug #8.
- prior-review #1: three added lines run past the 76-column wrap that lesson 2026-10-26 (M018) records for README, CHANGELOG, and DESIGN — fix now, fixed 0e60805: README and CHANGELOG reflowed; no added line now passes 78 columns.
- ripple #1: DESIGN's Contract boundary list of what the page shows first leaves out the interface languages, and says the other facts sit in Details — fix now, fixed 0e60805: the list names them (M024).
- ripple #2: `cairn/LESSONS.md` line 26 says no page carries a script — fix now, fixed 0e60805: as blame-history #1.
- ripple #3: DESIGN's list of the facts a reader can check leaves out the interface languages — fix now, fixed 0e60805: added (M024).
- ripple #4: README line 10 says the home page lists every plugin — reject (false): it does with the default "All languages", and the menu paragraph follows.
- ripple #5: the test title "… with the minor facts in a closed Details section" — reject (false): the minor facts are still in Details, and the test body places the languages fact outside it.
- Pass 2 evidence (2026-10-27, head dc75fd6, after the Scope amendment): `origin/main` still 2b317fb. `vitest run test/language.test.ts test/site.test.ts` passes 75 of 75 (AC1, AC2, AC4 tests as in pass 1; AC3's six `rowShows` cases plus the new `menuValue` and `filterHref` tests). Browser check on a fresh fixture build in the pane: (1) the menu shows, "All languages", 7 rows; (2) Chinese leaves `first-plugin@example.org` and `min-only-plugin@example.org`, URL `…/zotero-plugin-index/?language=zh`; (3) "All languages" shows 7 rows, URL `…/zotero-plugin-index/`; (4) `?language=xx` selects "All languages", 7 rows, and the address becomes `…/zotero-plugin-index/`. Back check: after a hand-set `#x`, picking Chinese (`?language=zh#x`), then Back, the address is `…/zotero-plugin-index/`, the menu "", 7 rows. `pnpm test` 676 of 676; `pnpm check` 0 problems.
- Pass 2 gate: `cairn_validate.py` FAILs `weight caps` — this file has 150 plan-owned lines (cap below 150) after the Scope amendment's added line; heaviest: Acceptance criteria 68, Tasks 28, Scope 21. Returned to implement.
