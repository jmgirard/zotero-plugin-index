<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M007: Build the plugin site

- **Status:** in-progress   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** high   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** M006   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** —   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** user-facing — Zotero users read the site to choose plugins   <!-- owner: plan · create/amend-via-gate; user-facing | internal — <one-clause reason>; skill conduct only — no validate check parses it -->
- **Branch/PR:** m007-plugin-site   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

## Goal
<!-- owner: plan · create; a wrong goal returns to plan, never edited in place -->

The Pages deploy carries a static Astro site with one page per plugin that first tells the visitor whether their Zotero version is inside the plugin's declared range.

## Scope
<!-- owner: plan · create/amend-via-gate -->

**In:** add `astro` (D-004) and a `pnpm site [--out <dir>]` script that builds the site from
`<dir>/v1/plugins.json` into `<dir>` (default `dist/`), beside the data and schemas M006 writes there, with
links under the Pages path `/zotero-plugin-index/`; a version comparison by Mozilla's Toolkit version format
in `src/site/version.ts`, with its source note; a home page that lists every plugin, and one page per plugin; a
Zotero version field whose value the visitor's browser keeps in `localStorage`; the workflow runs `pnpm site`
before the Pages upload; README, CHANGELOG, and DESIGN.md describe the site.

**Out:** the "Works" and "Broken" links and report counts → candidate "Collect works and broken user reports".
Reading stable releases before prereleases → candidate "Read stable releases before prereleases". Any package
beyond `astro`, such as `@astrojs/check` → not in this milestone; adding one is a stop for the user's yes. The
first live check of the site from the default branch → `/milestone-review` post-merge hygiene fetches the home
page and one plugin page and logs the result in this file's work log.

## Acceptance criteria
<!-- owner: plan · create/amend-via-gate; review reads, never reinterprets. -->

- [ ] AC1: `compareVersions(a, b)` in `src/site/version.ts` returns a negative number, 0, or a positive number
      as `a` is older than, equal to, or newer than `b` by Mozilla's Toolkit version format. A Vitest table holds
      every ordered example that `cairn/references/mozilla-toolkit-version.md` quotes verbatim from that format's
      page, and these three against `8.0.1`: `11.*.*` is newer, `8.0-beta.21` is older, `10.99.99` is newer.
- [ ] AC2: `rangeResult(zotero, record)` in `src/site/version.ts` returns `below`, `above`, `inside`, or
      `no-range`. A `strict_min_version` or `strict_max_version` override applies when it has no `version` or its
      `version` equals the upstream `version`; an applying override replaces the upstream value, and when two
      apply to one field, the one with the matching `version` wins. `zotero` equal to the minimum or the maximum
      gives `inside`. A missing minimum or maximum sets no bound on that side, and a record with neither, or with
      a `failure`, gives `no-range`. Tests cover each result, equality at each bound, an override that applies,
      one that does not, and both kinds on one field.
- [ ] AC3: `test/fixtures/site/plugins.json` is valid against the v1 schema and holds a `name@domain` id, a
      GUID-form `{…}` id, and a record with a `failure`. With it copied to `<out>/v1/plugins.json` and the schemas
      to `<out>/schemas/`, `pnpm site --out <out>` writes `<out>/index.html` and one
      `<out>/plugins/<id>/index.html` for each record, `<id>` being the raw id, and no other plugin page; the data
      and schema files are byte-identical before and after; and every `href` and `src` in the built HTML that
      points inside the site starts with `/zotero-plugin-index/`. A test in `test/site.test.ts` checks each
      clause over all built HTML files.
- [ ] AC4: In the built HTML of a fixture record with upstream facts, in document order, the declared range and
      the Zotero version field come before the repository link and every other fact this criterion lists. The page
      shows the repository link, the repository creation date, the latest release date, the release count, the
      open issue count, the `update.json` host, a link to the repository's releases page, every override with its
      value, its reason, and its `version` when it has one, beside the upstream value, and the sentence "This
      index does not vet the plugins it lists." The page of the fixture record with a `failure` shows the failure
      name and message and no declared range. Tests in `test/site.test.ts` read both pages, with one override that
      applies and one that does not.
- [ ] AC5: In a browser on the site built from the site fixture and served under `/zotero-plugin-index/`, with no
      stored version, a plugin page shows the declared range and no result. After the visitor enters `8.0.1` on
      the home page, each listed plugin shows its `rangeResult` for `8.0.1`, and a plugin page opened next shows
      the same result for `8.0.1` without a new entry. Shown at review in the built-in browser, against
      `rangeResult` for the same records.
- [ ] AC6: `.github/workflows/build.yml` runs `pnpm site` after `pnpm build` and before the Pages upload step,
      with no `if:` condition. README describes the site and its version field, and CHANGELOG's `## Unreleased`
      gains one entry for the site.
- [ ] AC7: The `verify` slot is clean: `pnpm test` and `pnpm check` pass.

## Coverage
<!-- owner: plan · create/amend-via-gate -->

- AC1 → T1, T2
- AC2 → T2
- AC3 → T3, T4
- AC4 → T5
- AC5 → T6
- AC6 → T7
- AC7 → T8

## Tasks
<!-- owner: plan (create) / implement (check-off, minor edits) -->

- [x] T1: Read Mozilla's Toolkit version format page and write `cairn/references/mozilla-toolkit-version.md`
      (source note template, its ordered examples quoted verbatim, provenance) with its `INDEX.md` line.
- [x] T2: Tests first, then `compareVersions` and `rangeResult` in `src/site/version.ts`, in plain TypeScript
      that both Vitest and the Astro browser script import.
- [ ] T3: Add `astro` at an exact version (D-004) with `npx -y pnpm@12.15.0 add`; make sure that `pnpm test`
      (tsc, then Vitest) still passes beside Astro's Vite, and find out whether `astro build` empties its
      `outDir`. A peer conflict or a second package is a stop.
- [ ] T4: Astro project under `site/`, static output, `base: "/zotero-plugin-index/"`; `pnpm site` builds into a
      staging directory and copies the pages into `<out>`, so the data and schemas stay; the site fixture and the
      `test/site.test.ts` page-set, unchanged-bytes, and link-prefix tests (spawned pnpm needs its own hook timeout).
- [ ] T5: Home page and plugin page templates; plugin links use `encodeURIComponent(id)`; the content tests.
- [ ] T6: The version field and the browser script that stores the value and fills in each result; check it in
      the built-in browser over a local static server that serves `<out>` under `/zotero-plugin-index/`.
- [ ] T7: `build.yml` `pnpm site` step; README section, CHANGELOG entry, DESIGN.md Architecture line.
- [ ] T8: Run the `verify` slot.

## Work log
<!-- owner: any skill · append-only; one line per entry; absolute dates. -->

- 2026-10-25: created by /milestone-plan.
- 2026-10-25: tier check: not run — work named at the question set.
- 2026-10-25: idea vet: no concern beyond M006's mass-failure deploy; the page states the declared range and the visitor's place in it, with no combined verdict (DESIGN.md Data sources).
- 2026-10-25: question set: site tooling — use a framework; the plan picked Astro (D-004) over other static-site tools because it builds plain HTML with TypeScript and ships no browser runtime by default; falsified by Astro failing beside Vitest 5 or TypeScript 7 in this repo.
- 2026-10-25: plan gate chose an override for the range when one applies to the upstream version over the upstream value alone, because DESIGN.md says an override corrects a fact the author cannot fix; the page still shows both values; falsified by a maintainer ruling that the visitor check must read upstream facts only.
- 2026-10-25: split: two features, not a feature series — see M006's work log; this milestone ships its own changelog entry.
- 2026-10-25: collision: candidate "Publish the site and data on Pages" is taken by M006 and this milestone; its started token names M006.
- 2026-10-25: criteria audit (full mode, fresh Opus reader): 7 findings on M007, all taken — AC3 gets `--out`, a staging build (Astro may empty its outDir), a hand-made site fixture with a GUID id, raw-id directories, and a `/zotero-plugin-index/` link-prefix check; AC2 states equality and which override wins; AC1 states the three signs and quotes the source's examples; AC4 fixes document order and probes an override that does not apply; AC5 names its data and the served path; no finding on AC6, AC7.
- 2026-10-25: lessons used: 2026-10-25 (M001) pnpm via npx; 2026-10-25 (M001) INIT_CWD for relative paths; 2026-10-25 (M003) beforeAll hookTimeout.
- 2026-10-25: T1 done: the Toolkit version format now lives on MDN's "Legacy Version Formats" page; the note quotes its rules and its 12-line example chain; the simple-english hook flags the note's `— observed` stamp, kept because cairn's staleness check reads that form.
- 2026-10-25: T2 done: `compareVersions`, `declaredRange` (exported for the page templates), and `rangeResult` in `src/site/version.ts` with a structural `RangeRecord` type so the file has no imports; "*" is +Infinity per the source's wording; tests failed first (no module), then 407 pass; two planted defects (string-exists rule, override precedence) turned 59 and 1 tests red.

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive. -->
