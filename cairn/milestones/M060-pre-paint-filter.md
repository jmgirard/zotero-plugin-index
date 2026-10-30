<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M060: Filter the home list before it paints

- **Status:** planned   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** normal   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** —   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** —   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** user-facing — it changes which home table rows a visitor sees while the page loads   <!-- owner: plan · create/amend-via-gate; user-facing | internal — <one-clause reason>; skill conduct only — no validate check parses it -->
- **Branch/PR:** —   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

## Goal
<!-- owner: plan · create; a wrong goal returns to plan, never edited in place -->

A visitor who opens a home page address never sees a table row that the page's script then hides.

## Scope
<!-- owner: plan · create/amend-via-gate -->

**In:**
- `prePaintStyle(search, size)` in `src/site/home-filter.ts`: a function
  that calls no other function and reads no module constant, so its source
  text runs on its own. It returns CSS text for an address's search string.
  With a non-blank `q`, or a `language` or `zotero` value that is not
  `[A-Za-z0-9-]+`, the CSS hides every `.plugins tbody tr`. Otherwise it
  hides each row outside the asked page of the rows whose `data-languages`
  and `data-zotero` hold the asked values (`[data-x~="v"]`, and
  `:nth-child(An+B of S)` when a filter is on), and drops the top border of
  that page's first row. A `page` value is the asked page only when it is
  digits with no leading zero and is 2 or more, as `chosenPage` reads it;
  any other value asks for page 1.
- A classic inline script in `site/src/pages/index.astro`, before the table,
  built at site build from the source text of `prePaintStyle`. Where the
  browser runs module scripts (`"noModule" in HTMLScriptElement.prototype`),
  it appends `<style data-pre-paint>` with that CSS to `<head>`.
- The module script removes `style[data-pre-paint]` once its first pass has
  set each row's `hidden`, and also when the page lacks its controls.
- Unit tests of `prePaintStyle`, site tests that run the built page's two
  scripts in `node:vm`, and a browser-pane check on a site built from the
  deployed data file.
- DESIGN.md (the home page paragraph, the site build module list, and a
  Known issues entry), and one CHANGELOG entry.

**Out:**
- The toolbar, count, and pager appear after the first paint and move the
  table down → candidate row "Close small gaps on the site pages", item (4).
- An automated browser test → candidate row "Test the home page script in a
  browser".
- A browser without `:nth-child(… of S)` (Chrome before 111, Firefox before
  113) drops the page rule and paints every row a filter passes until the
  script runs → the DESIGN.md Known issues entry that T4 writes.
- Smaller home page markup → candidate row "Close small gaps on the site
  pages", item (7).

## Acceptance criteria
<!-- owner: plan · create/amend-via-gate; review reads, never reinterprets. -->

- [ ] AC1: In the browser pane, on a site built from the deployed data file,
      a copy of the home page with its module script removed displays the
      same rows, by `data-plugin` id, as the full page displays, for each of
      these addresses: the bare address, `?page=2`, the last page,
      `?page=02`, `?zotero=Z` and `?zotero=Z&page=2` for a major Z that more
      than 50 rows declare, `?language=L` for the subtag L with the most
      rows, and `?language=L&zotero=Z2&page=2` for a major Z2 that more than
      50 of those rows declare. For `?q=pdf`, `?language=xx`, and `?page=99`
      the copy displays no row.
- [ ] AC2: In the browser pane, the built home page loaded in an iframe whose
      `sandbox` attribute holds `allow-same-origin` and not `allow-scripts`
      displays every row, for the bare address and for `?zotero=Z&page=2`.
- [ ] AC3: A site test runs the built home page's classic inline script in
      `node:vm` with a stand-in `location.search` and document, for each
      search string of AC1's list. Each run appends one
      `style[data-pre-paint]` to the head, whose text equals
      `prePaintStyle(<that search string>, PAGE_SIZE)`. A run whose stand-in
      `HTMLScriptElement.prototype` lacks `noModule` appends no style.
- [ ] AC4: Unit tests of `prePaintStyle` assert its exact CSS text for: the
      empty search; each `page` value of `2`, `1`, `02`, `0`, `-2`, `2.0`,
      `abc`, and an empty value; a `language`, a `zotero`, and both, each
      with and without `page=2`; a `language` value holding `"`, `]`, or a
      space; and a `q` that is blank and one that is not.
- [ ] AC5: Site tests in `node:vm` show that no `style[data-pre-paint]` is
      left in the stand-in head once the module script's first pass ends,
      on the built page and on a page whose search box is missing.
- [ ] AC6: DESIGN.md and one CHANGELOG entry state that the home page paints
      only the asked rows before its script runs, that a `q` address paints
      no row until then, and which browsers paint a filter's rows on every
      page; each claim is written against the AC1 check or a test.
- [ ] AC7: `pnpm test` and `pnpm check` pass.

## Coverage
<!-- owner: plan · create/amend-via-gate -->

- AC1 → T2, T3
- AC2 → T3
- AC3 → T2
- AC4 → T1
- AC5 → T2
- AC6 → T4
- AC7 → T5

## Tasks
<!-- owner: plan (create) / implement (check-off, minor edits) -->

- [ ] T1: Write the AC4 tests in `test/home-filter.test.ts`, then
      `prePaintStyle` in `src/site/home-filter.ts`, with no call to another
      function and no read of `PAGE_SIZE` (the size is an argument).
- [ ] T2: In `site/src/pages/index.astro`, add before `.table-card` a
      `<script is:inline>` whose text is built with `set:html` from
      `String(prePaintStyle)`, `PAGE_SIZE`, and the `noModule` check; in the
      module script, remove `style[data-pre-paint]` after the first `show()`
      and when the guard fails. Extend `homeScript` in `test/site.test.ts`
      (head, style, `HTMLScriptElement`, and a run of the classic script);
      its stand-ins throw on an unknown selector. Add the AC3 and AC5 tests.
      A page test that greps the built HTML can also match the new script's
      text: match attribute forms.
- [ ] T3: Build the site from the deployed `v1/plugins.json` (`pnpm site
      --out <dir>`), serve it with a `.claude/launch.json` http.server entry
      kept out of git, and write the copy without the module script beside
      the home page. In one `javascript_tool` call per list, load each AC1
      address in an iframe and compare the `data-plugin` ids of rows whose
      computed `display` is not `none`; load the AC2 iframes. Log the
      home page's gzipped bytes before and after.
- [ ] T4: Update DESIGN.md (the home page paragraph, the `home-filter.ts`
      line of the site build list, a Known issues entry for the browsers
      that drop the page rule) and add one CHANGELOG entry.
- [ ] T5: Run `pnpm test` and `pnpm check`.

## Work log
<!-- owner: any skill · append-only; one line per entry; absolute dates. -->

- 2026-10-30: created by /milestone-plan.
- 2026-10-30: tier check: not run — work named at the question set.
- 2026-10-30: question set: which work to plan — "Filter the home list before it paints".
- 2026-10-30: question set: may the run push its branch and start workflows on it by hand — yes, `gh workflow run --ref <branch>` where a workflow changes; no run touches main or deploys.
- 2026-10-30: idea vet: gap, a `q` filter cannot be written in CSS (`rowShows` lowercases with `toLowerCase`) — reading taken: a `q` address paints no row until the script runs; gap, a browser that runs classic scripts but not module scripts would keep the style — reading taken: the classic script adds it only where `noModule` exists; gap, `:nth-child(… of S)` is missing before Chrome 111 and Firefox 113 — reading taken: the page rule is its own CSS rule, so those browsers drop only it, and DESIGN.md names the limit; no flaw.
- 2026-10-30: plan gate chose a classic script before the table that writes CSS from a tested function over a classic script after the table that runs the full filter, because the browser paints rows while the 59,671-byte (801,348 decoded) page streams in, before a script after the table can run; falsified by a browser-pane load in which a row the script hides paints.
- 2026-10-30: plan gate chose building the classic script from `String(prePaintStyle)` over a bundler step (esbuild or rolldown, both only transitive) because a bundler would be a new direct dependency; falsified by a built page whose classic script text differs in behavior from the tested function (AC3).
- 2026-10-30: plan gate chose CSS that shows the asked rows for `language`, `zotero`, and `page` over hiding every row until the script runs for any parameter, because the rows can then paint while the page streams in; falsified by a browser in which the `~=` and `of S` rules show a row that `passes` and `onPage` hide (AC1).
- 2026-10-30: collision check: absorbs candidate row "Filter the home list before it paints" in full; works under D-026 (a feature can add a second script; each page reads in full without JavaScript); M024, M037, M053, and M058 shipped the filters and pager this builds on; no D-entry needed.
- 2026-10-30: inbox sweep: no open issues; 18 open bot "Add …" pull requests, none overlapping.
- 2026-10-30: added item (7) on the home page's markup size to candidate row "Close small gaps on the site pages", from the investigation's size read of the deployed page; a new row would pass the ROADMAP's 60-line cap.
- 2026-10-30: checkpoint: plan committed while the full criteria audit runs; a second plan commit applies its findings before implement starts.
- 2026-10-30: lessons used: 2026-10-25 (M001), 2026-10-25 (M007), 2026-10-26 (M015), 2026-10-28 (M035), 2026-10-29 (M048, iframe widths), 2026-10-29 (M053).

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive. -->
