<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M007: Build the plugin site

- **Status:** review   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
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

- [x] AC1: `compareVersions(a, b)` in `src/site/version.ts` returns a negative number, 0, or a positive number
      as `a` is older than, equal to, or newer than `b` by Mozilla's Toolkit version format. A Vitest table holds
      every ordered example that `cairn/references/mozilla-toolkit-version.md` quotes verbatim from that format's
      page, and these three against `8.0.1`: `11.*.*` is newer, `8.0-beta.21` is older, `10.99.99` is newer.
- [x] AC2: `rangeResult(zotero, record)` in `src/site/version.ts` returns `below`, `above`, `inside`, or
      `no-range`. A `strict_min_version` or `strict_max_version` override applies when it has no `version` or its
      `version` equals the upstream `version`; an applying override replaces the upstream value, and when two
      apply to one field, the one with the matching `version` wins. `zotero` equal to the minimum or the maximum
      gives `inside`. A missing minimum or maximum sets no bound on that side, and a record with neither, or with
      a `failure`, gives `no-range`. Tests cover each result, equality at each bound, an override that applies,
      one that does not, and both kinds on one field.
- [x] AC3: `test/fixtures/site/plugins.json` is valid against the v1 schema and holds a `name@domain` id, a
      GUID-form `{…}` id, and a record with a `failure`. With it copied to `<out>/v1/plugins.json` and the schemas
      to `<out>/schemas/`, `pnpm site --out <out>` writes `<out>/index.html` and one
      `<out>/plugins/<id>/index.html` for each record, `<id>` being the raw id, and no other plugin page; the data
      and schema files are byte-identical before and after; and every `href` and `src` in the built HTML that
      points inside the site starts with `/zotero-plugin-index/`. A test in `test/site.test.ts` checks each
      clause over all built HTML files.
- [x] AC4: In the built HTML of a fixture record with upstream facts, in document order, the declared range and
      the Zotero version field come before the repository link and every other fact this criterion lists. The page
      shows the repository link, the repository creation date, the latest release date, the release count, the
      open issue count, the `update.json` host, a link to the repository's releases page, every override with its
      value, its reason, and its `version` when it has one, beside the upstream value, and the sentence "This
      index does not vet the plugins it lists." The page of the fixture record with a `failure` shows the failure
      name and message and no declared range. Tests in `test/site.test.ts` read both pages, with one override that
      applies and one that does not.
- [x] AC5: In a browser on the site built from the site fixture and served under `/zotero-plugin-index/`, with no
      stored version, a plugin page shows the declared range and no result. After the visitor enters `8.0.1` on
      the home page, each listed plugin shows its `rangeResult` for `8.0.1`, and a plugin page opened next shows
      the same result for `8.0.1` without a new entry. Shown at review in the built-in browser, against
      `rangeResult` for the same records.
- [x] AC6: `.github/workflows/build.yml` runs `pnpm site` after `pnpm build` and before the Pages upload step,
      with no `if:` condition. README describes the site and its version field, and CHANGELOG's `## Unreleased`
      gains one entry for the site.
- [x] AC7: The `verify` slot is clean: `pnpm test` and `pnpm check` pass.

## Coverage
<!-- owner: plan · create/amend-via-gate -->

- AC1 → T1, T2
- AC2 → T2
- AC3 → T3, T4
- AC4 → T5
- AC5 → T6, T9
- AC6 → T7
- AC7 → T8, T11

## Tasks
<!-- owner: plan (create) / implement (check-off, minor edits) -->

- [x] T1: Read Mozilla's Toolkit version format page and write `cairn/references/mozilla-toolkit-version.md`
      (source note template, its ordered examples quoted verbatim, provenance) with its `INDEX.md` line.
- [x] T2: Tests first, then `compareVersions` and `rangeResult` in `src/site/version.ts`, in plain TypeScript
      that both Vitest and the Astro browser script import.
- [x] T3: Add `astro` at an exact version (D-004) with `npx -y pnpm@12.15.0 add`; make sure that `pnpm test`
      (tsc, then Vitest) still passes beside Astro's Vite, and find out whether `astro build` empties its
      `outDir`. A peer conflict or a second package is a stop.
- [x] T4: Astro project under `site/`, static output, `base: "/zotero-plugin-index/"`; `pnpm site` builds into a
      staging directory and copies the pages into `<out>`, so the data and schemas stay; the site fixture and the
      `test/site.test.ts` page-set, unchanged-bytes, and link-prefix tests (spawned pnpm needs its own hook timeout).
- [x] T5: Home page and plugin page templates; plugin links use `encodeURIComponent(id)`; the content tests.
- [x] T6: The version field and the browser script that stores the value and fills in each result; check it in
      the built-in browser over a local static server that serves `<out>` under `/zotero-plugin-index/`.
- [x] T7: `build.yml` `pnpm site` step; README section, CHANGELOG entry, DESIGN.md Architecture line.
- [x] T8: Run the `verify` slot.
- [x] T9: Review return 1: the version field reads the first run that starts with a digit, so pasted About Zotero
      text such as "Version 7.0.11 (64-bit)" compares as 7.0.11; tests first.
- [x] T10: The fix-now findings of review pass 1 (Review section): field refresh on Back and across tabs, typed
      text kept, a "Used" column from the override `appliedValue` picks, env restored, `.astro/` ignored, `site/`
      type-checked, non-http repo URLs unlinked, the untested branches and error paths tested, the comparator table
      cut to adjacent groups, DESIGN.md and README fixes, the spawn timeout at 50 s.
- [x] T11: Run the `verify` slot.

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
- 2026-10-25: T3 done: `astro` 7.4.2 (published 2026-10-21) under `dependencies`, beside `ajv` and `fflate`, which `pnpm build` also runs; its one peer (`@astrojs/markdown-remark`) is optional, so no second package; Astro and Vitest share one Vite 8.3.5; `pnpm test` passes; Astro empties `outDir` unless `vite.build.emptyOutDir` is false (`static-build.js:66`).
- 2026-10-25: T4 done (one commit with T3): `site/` Astro project, `src/site/site.ts` builds into a temp dir and replaces each top-level entry in `<out>` (so a removed plugin's page goes), refusing to write `v1/` or `schemas/`; `pnpm site` sets `ASTRO_TELEMETRY_DISABLED=1` so the build sends no telemetry; templates read the base from `site/src/base.ts`, because Vitest's `BASE_URL` env var replaced `import.meta.env.BASE_URL` in the spawned build (seen as `href="/"`, then reproduced with `BASE_URL=/`); the link-prefix test was red on that, and the page-set test went red with the stale-page removal planted out.
- 2026-10-25: T5 done: home table (plugin, declared range, result slot) and plugin page (name, id, declared range, facts as `data-fact` elements, override table with an "Applies" column); the version field sits in the shared header and the not-vetted sentence in the shared footer; the page name uses an applying `name` override, so `appliedValue` is now exported; content tests pass (638 total) and went red with `overrideApplies` planted to always true.
- 2026-10-25: T6 done: the shared layout's script (Astro inlines it) reads and writes `localStorage["zotero-version"]`, tolerates storage being off, and fills each `data-result-for` slot with `rangeResult` text and a `data-result` attribute; built-in browser over `python3 -m http.server` serving the fixture build under `/zotero-plugin-index/`: with storage cleared, first-plugin showed "Zotero 7.0 to 8.*" and no result; typing 8.0.1 on the home page gave no-range, inside, above, below for the four rows, equal to Node's `rangeResult`; the GUID page opened by its link showed "below" with the field prefilled; the failure-page test now matches the attribute, since the inlined script names the selector.
- 2026-10-25: T7 done: `build.yml` runs `pnpm site` as step 6, after `pnpm build` and before both uploads, with no `if:` (read with ruby's YAML); README gains "The site", "Building the site", and "The daily workflow" sections; one CHANGELOG entry; DESIGN.md Architecture gains the site bullet.
- 2026-10-25: T8 done: `pnpm test` 638 passed in 7 files, `pnpm check` 14 entries with 0 problems; `pnpm site` over the real `dist/` (data from 2026-10-25) wrote 15 pages.
- 2026-10-25: claim audit: 66 claims read, 7 corrected — site/astro.config.ts, site/src/data.ts, src/site/version.ts, site/src/layouts/Base.astro, site/src/pages/index.astro, site/src/pages/plugins/[id]/index.astro, README.md; one was a code mismatch (a failed record's page name took a no-version name override that the table marked "no"), fixed in `appliedValue` with a regression test red before the fix; the same reader re-read all 7 as true; 639 tests pass, `pnpm check` clean.
- 2026-10-25: status review; implement complete, handed to /milestone-review.
- 2026-10-25: review return 1: diff-bug #1, the version field takes pasted About Zotero text such as "Version 7.0.11 (64-bit)" as version 0 and reports "older than the declared minimum"; the fix-now findings of review pass 1 (Review section) go back with it.
- 2026-10-25: minor amendment: T9 (the return), T10 (fix-now findings), T11 (verify) added; Coverage AC5 → T6, T9 and AC7 → T8, T11.
- 2026-10-25: T9 done: `zoteroVersion` in `src/site/version.ts` takes the first run that starts with a digit and stops at a space, comma, or parenthesis; the six new tests failed first (no export), then pass (645 total); the browser script stores what was typed and compares the version read from it; it also keeps text typed before the script ran and re-reads storage on a Back restore (`pageshow` persisted) and on a `storage` event (diff-bug #2, #3).
- 2026-10-25: T10 done: `usedOverride` in version.ts picks the override that sets a field, and `appliedValue` and the page's renamed "Used" column both read it; `buildSite` takes a `siteRoot` for tests and restores its two env vars; `.gitignore` covers `.astro/` at any depth; tsconfig includes `site/` (a planted type error in `site/src/base.ts` failed tsc); a non-http `repoUrl` shows as text; `loadData` names a file with no `plugins` list; new tests cover the usage error, that Astro failure, the clash branch (`test/fixtures/site-clash`), `rangeText`'s four forms, `displayName`, `overrideUsed`, `safeHref`, the home "Not read" cell, and the failure page heading; the comparator table now checks each member against its group's first and adjacent groups (310 tests in 8 files); README drops the telemetry sentence, explains pasting, rewraps; DESIGN.md gains the Function Families entry, the declared range in the Contract boundary list, and `pnpm site` in the build.yml bullet; built-in browser: pasting "Version 7.0.11 (64-bit)" gave no-range, inside, inside, below; first-plugin's Used column read yes, no; changing to 9.5 there and pressing Back showed 9.5 and above, above, inside on the home page.
- 2026-10-25: T11 done: `pnpm test` 310 passed in 8 files, `pnpm check` 14 entries with 0 problems, both after the last T10 edit.
- 2026-10-25: claim audit: 78 claims read, 3 corrected — site/src/pages/plugins/[id]/index.astro, site/src/data.ts, site/src/layouts/Base.astro; two loose wordings also fixed (src/site/version.ts, README.md, CHANGELOG.md); the same reader re-read them true and proposed the final CHANGELOG wording, taken; 310 tests pass, `pnpm check` clean.
- 2026-10-25: status review; review return 1 worked (T9-T11), handed to /milestone-review.

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive. -->

Evidence (2026-10-25, branch head c06eea1, main 772aef2 unmoved):

- AC1: `vitest run test/version.test.ts`: 390 table cases pass (each pair equal within a group, older and newer across groups), plus `11.*.*`, `8.0-beta.21`, `10.99.99` against `8.0.1` with signs +1, -1, +1; a node script parsed the note's verbatim Examples block into 20 groups (27 versions) and found it equal to the test's `ORDERED` array.
- AC2: same run, `rangeResult` block, 15 tests pass: below, above, inside; equal to the minimum and equal to the maximum give inside; missing minimum and missing maximum set no bound; neither bound and a `failure` give no-range; an unversioned override and one naming the upstream version replace the upstream value; one naming another version does not apply; with both kinds on `strict_max_version`, the versioned one wins in either order; no override applies to a failed record.
- AC3: `vitest run test/site.test.ts`: fixture valid against the v1 schema with a `name@domain` id, a GUID id, and a `failure` record; `pnpm site --out` exits 0; `<out>/plugins/` holds exactly the 4 raw ids, each with only `index.html` (a seeded stale page is gone); data and both schemas byte-identical; every non-scheme `href`/`src` in all 5 HTML files starts with `/zotero-plugin-index/`. By hand, a separate fixture build: exit 0, `shasum -c` OK for the 3 data files, 5 HTML files at the raw-id paths, and the 14 internal links (home, 4 encoded plugin links, data file) all under `/zotero-plugin-index/`.
- AC4: same run, "the plugin page" block, 5 tests pass on first-plugin: `data-fact="declared-range"` and `id="zotero-version"` both come before each of the 7 fact markers, the override rows, and the not-vetted sentence; range reads "Zotero 7.0 to 8.*"; repository and releases links, created 2023-03-14, latest release 2026-09-30, 27 releases, 12 open issues, host example.org, and "This index does not vet the plugins it lists." present; override rows read exactly field, upstream value, value, version ("every version" or 0.9.0), applies (yes/no), reason, for one override that applies and one that does not; broken-plugin shows "no-xpi-release" with its message and no declared-range element and no result slot.
- AC5: built-in browser, fixture built at c06eea1 and served by `python3 -m http.server` under `/zotero-plugin-index/`: with `localStorage` cleared, old-plugin's page showed "Zotero 6.999 to 7.0.*" and an empty result with no `data-result`; typing 8.0.1 into the home field stored "8.0.1" and gave broken no-range, first inside, old above, GUID below, equal to Node's `rangeResult("8.0.1", …)` on the same fixture records (no-range, inside, above, below, re-run at c06eea1); the First Plugin link then opened a page with the field prefilled and "Zotero 8.0.1 is inside the declared range." (`data-result="inside"`).
- AC6: ruby YAML read of `build.yml`: `pnpm build` is step 5, `pnpm site` step 6 with no `if:`, `upload-pages-artifact` step 8; README "The site" section (line 7) describes the site and the "Your Zotero version" field and its local storage; the branch adds exactly one top-level entry under CHANGELOG `## Unreleased`, the website entry.
- AC7: `pnpm test` (tsc, then Vitest): 7 files, 639 tests passed; `pnpm check`: 14 entries, 0 problems.
- Gate: `cairn_validate.py` exit 0, all checks passed; no DESIGN.md principle changed, so no `cairn_impact` run; the generic profile's consistency-gate slot names no toolchain checks.

Review pass 1 (2026-10-25, head 0fe7ea2):

- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: pasting the About Zotero text ("Version 7.0.11 (64-bit)", "v7.0.11") parses as 0 and shows "older than the declared minimum" — fix now; floor return (wrong result in the site's main use, with no warning)
- diff-bug #2: the field and results go stale after Back (bfcache) or in a second tab, since storage is read once — fix now
- diff-bug #3: text typed before the module script runs is overwritten by the stored value — fix now
- diff-bug #4: the Applies column says "yes" for an unversioned override that a versioned one beats, and `overrideApplies` repeats the rule of `appliedValue` — fix now
- diff-bug #5: `buildSite` sets process-wide env vars and never restores them — fix now (restore after the build)
- diff-bug #6: Astro writes its prerender bundle to `<cwd>/.astro/`, which `.gitignore` does not cover (an empty root `.astro/` exists) — fix now
- diff-bug #7: `site/*.ts` is outside tsconfig `include`, so `pnpm test` does not type-check it — fix now
- diff-bug #8: `buildSite` deletes then copies, so a failed copy leaves a partial site, and an old top-level entry the build no longer writes survives — reject, edge: a copy failure (disk error) outside documented and common use, effect an error and exit 1, CI starts from a fresh `dist/`; the README claim names only `index.html` and `plugins/`, which holds
- diff-bug #9: comparator differs from Mozilla's C++ for "*" vs 2147483647, int32 overflow, a leading space in a part, and non-ASCII strings — reject, false: the code follows the cited format (MDN calls "*" "an infinitely-large number" and compares strings byte-wise, the same order for ASCII); no Zotero version uses these forms
- diff-bug #10: a `javascript:` `repoUrl` from meta.json renders as a clickable link on a failed record's page; the registry schema puts no rule on `repoUrl` — fix now
- diff-bug #11: DESIGN.md Function Families has no `src/site/` entry — fix now
- diff-bug #12: README.md:195 breaks the 80-column wrap — fix now
- diff-bug #13: `buildSite` and `loadData` read the data file separately — reject, edge: a data file changed during a 1-second build, outside any use; no current path
- diff-bug #14: untested error branches: the CLI usage error, the clash branch, an Astro build failure — fix now
- diff-bug #15: untested branches: `rangeText` "or newer"/"or older"/"No declared range", `displayName` falling back to the id, an applied `name` override, the home "Not read" cell; README's telemetry sentence has no test — fix now (tests; README telemetry sentence removed)
- diff-bug #16: the comparator table runs 390 pairs, many on one code path, reflexive pairs included — fix now (adjacent groups and each member against its group's first)
- diff-bug #17: the equal-to-maximum test uses "8.0.*" as the Zotero version — fix now
- diff-bug #18: the `appliedValue` test sits in `describe("rangeResult")` — fix now
- diff-bug #19: the spawned test build inherits Vitest's env (`BASE_URL`, `MODE`) — reject, false: the reviewer built with and without them and got byte-identical output, and `base.ts` removes the one variable that mattered
- diff-bug #20: test/site.test.ts column comment partly restates the array — reject, false: the array shows values, not which column each is
- blame-history #1: a failed `pnpm site` now also stops the data deploy — reject, planned change (AC6: `pnpm site` before the Pages upload with no `if:`)
- blame-history #2: README says `pnpm site` replaces `index.html` and `plugins/`, while the code replaces every top-level entry — reject, false: the build writes only those two (script inlined, no `_astro/`, seen in AC3's output)
- blame-history #3: DESIGN.md:165-166 build.yml bullet omits `pnpm site` — fix now
- blame-history #4: "inside the declared range" reads close to the out-of-scope combined verdict — reject, planned change (plan idea vet: the declared range and the visitor's place in it, no combined verdict)
- blame-history #5: the more-than-half rule counts steady-state failures — follow-up, already the row "Count only build failures for deploys"
- prior-review #1: non-atomic site write, unlike the build's temp-and-rename — reject, edge (as diff-bug #8)
- prior-review #2: spawned `pnpm site` timeout 110 s inside a 60 s test; other suites use 50 s — fix now
- prior-review #3: the site step adds build-job time against the 30-minute limit — reject, false: `pnpm site` took about 1.3 s on the 14 real records (T8)
- prior-review #4: README replaced-entries wording — reject, false (as blame-history #2)
- ripple #1: DESIGN.md:12-13 says the index answers "does this plugin work on my version of Zotero?", while README says the site does not say whether a plugin works — fix now (README wording)
- ripple #2: DESIGN.md:124 banked line, same wording — reject, false: the banked line states the design goal, which the README fix aligns with
- ripple #3: ROADMAP candidate "Publish the site and data on Pages" describes the site — reject, planned change: step 9 hygiene graduates the row
- ripple #4: DESIGN.md Contract boundary fact list omits the declared range — fix now
- ripple #5: DESIGN.md build.yml bullet — fix now (as blame-history #3)
- ripple #6: DESIGN.md:139 and tsconfig: `site/` not type-checked — fix now (as diff-bug #7)
- ripple #7: combined-verdict wording — reject, planned change (as blame-history #4)
- ripple #8: Function Families entry — fix now (as diff-bug #11)
- ripple #9: PROFILE verify slot does not name `pnpm site` — reject, false: `pnpm test` runs test/site.test.ts, which spawns `pnpm site`
- ripple #10: README "publishes its data file" and "the data from the last good build stays" — reject, false: both still describe the data correctly
- fixed: every fix-now finding of pass 1 landed in b20534b (diff-bug #1-#3) and 632092b (the rest), audited in b30f4f7 and 92dd550

Evidence pass 2 (2026-10-25, head 92dd550, main 772aef2 unmoved, after review return 1):

- AC1: `vitest run test/version.test.ts`: 40 table cases (each member against its group's first, each group against the next) and the three `8.0.1` cases pass; the node comparison again finds the test's `ORDERED` equal to the note's 20 groups, 27 versions, so every quoted example is in the table.
- AC2: same run, `rangeResult` block passes: each result, equality at each bound (max 8.0.1 against 8.0.1), missing bounds, failure, an applying and a non-applying override, both kinds on one field in either order.
- AC3: `vitest run test/site.test.ts`: page set, byte-identical data, link prefix, and the failure tests pass; by hand at 92dd550: exit 0, `shasum -c` OK for the 3 data files, the 5 HTML files at raw-id paths, 0 internal links outside `/zotero-plugin-index/`.
- AC4: same run, the five plugin-page tests pass (order, range "Zotero 7.0 to 8.*", facts, override rows with Used yes/no, failure page with no range).
- AC5: built-in browser on the 92dd550 fixture build under `/zotero-plugin-index/`: storage cleared, the GUID page showed "Zotero 9.0 to 9.*" and no result; 8.0.1 typed on the home page gave no-range, inside, above, below, equal to Node's `rangeResult` at 92dd550; the Old Plugin link opened with the field prefilled and "Zotero 8.0.1 is newer than the declared maximum." (`above`).
- AC6: `build.yml` steps: build 5, site 6 with no `if:`, Pages upload 8; README "The site" section with the field; one CHANGELOG `## Unreleased` entry added.
- AC7: `pnpm test` 8 files, 310 passed; `pnpm check` 14 entries, 0 problems.
- Gate: `cairn_validate.py` all checks passed; advisory WARN sizing: 11 tasks (>10), from the return's T9-T11, not a gate failure; no principle changed; generic profile adds no checks.

Review pass 2 (2026-10-25, head a2d5c77):

- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: the Releases link builds its `href` from `upstream.repoUrl` without `safeHref`, so a `javascript:` URL would run — fix now
- diff-bug #2: an entry id with `%` or a space fails the whole Astro build (NoMatchingStaticPathFound), which also stops the data deploy — follow-up, absorbed into the row "Catch stray and unportable entry files"
- diff-bug #3: two overlapping `buildSite` calls in one process would clobber each other's env — reject, false: no caller makes two calls in one process (the CLI calls once; tests spawn a process per build), and the comment states one build at a time
- diff-bug #4: Astro sets `NODE_ENV` when unset, and `buildSite` does not restore it — fix now
- diff-bug #5: with storage blocked, a Back restore calls `refresh()`, which empties the field typed on that page — fix now
- diff-bug #6: the storage key "zotero-version" is shared with every other project site on jmgirard.github.io — fix now (key "zotero-plugin-index:zotero-version")
- diff-bug #7: no test checks that a home link opens the raw-id directory — fix now
- diff-bug #8: the browser path has no automated test; dropping `version` from `rangeFields` would pass every test — fix now (round-trip test of `rangeFields` against `rangeResult`; the script itself stays checked in the browser per AC5)
- diff-bug #9: untested branches: `ZPI_SITE_DATA` unset, and `--out` with no value — fix now
- diff-bug #10: CHANGELOG.md:49 and DESIGN.md:171 break the 80-column wrap — fix now
- diff-bug #11: DESIGN.md says only the tests and the script import `version.ts`, and lists 3 of its 6 exports — fix now
- diff-bug #12: the Used column can say "yes" for description and homepage overrides the page does not display — reject, false: the sentence above the table, corrected in the claim audit, says "yes" means the override applies to the version the index read and that the range uses only the bound overrides
- diff-bug #13: every page render re-reads and re-parses the data file — fix now (parsed once per path)
- diff-bug #14: `rangeFields` puts every override with its reason into each result slot — fix now (bound overrides only, without reasons)
- diff-bug #15: a `mkdtemp` failure in `buildSite` is outside its `try`, so the CLI ends on an unhandled rejection — fix now
- diff-bug #16: duplicated tests: `displayName`'s name override repeats `appliedValue`'s, and `overrideUsed` repeats `usedOverride` — fix now (the `appliedValue` name test and the `usedOverride` test removed)
- diff-bug #17: `zoteroVersion` inputs and two `rangeResult` tests run paths already covered — fix now (removed "  8.0.1 ", "v7.0.11", "between the bounds", "supply a bound")
- diff-bug #18: each "older" pair also asserts the reverse — reject, false: the reverse assertion is the check of the positive sign AC1 names
- diff-bug #19: two test comments restate the code — fix now (removed)
- diff-bug #20: two `pnpm site` runs at once share `<cwd>/.astro/` — reject, edge: concurrent builds from one checkout fall outside documented and common use, and the effect is a build error
- diff-bug #21: `zoteroVersion` keeps a trailing ";" or "/", and reads "7,0,11" as 7 — fix now for ";" and "/"; the comma-separated form is not a version form Zotero shows, so it stays
- blame-history #1: a failed `pnpm site` now blocks the data deploy — reject, planned change (AC6)
- blame-history #2: the per-visitor result reads close to the out-of-scope combined verdict — reject, planned change (plan idea vet)
- blame-history #3: pnpm-lock.yaml changes vitest's vite peer resolution — reject, false: `pnpm install --frozen-lockfile` passed in T3 and `pnpm test` passes
- blame-history #4: DESIGN.md:171 and CHANGELOG.md wrap — fix now (as diff-bug #10)
- blame-history #5: ROADMAP row "Publish the site and data on Pages" still open — reject, planned change: step 9 hygiene graduates it
- blame-history #6: `astro` under `dependencies` — reject, false: same pattern as `ajv` and `fflate`, logged in T3
- prior-review #1: non-atomic replace of `dist/`, and the `!cancelled()` artifact upload then keeps a partial `dist/` — reject, edge: a copy failure (disk error) outside documented and common use, effect an error and exit 1 with no deploy; CI's `dist/` holds no earlier pages to lose
- prior-review #2: README says the home page lists each plugin with its range, though failed rows show "Not read" — fix now
- prior-review #3: the vitest.config.ts timeout comment omits the site tests — fix now
- prior-review #4: `cli.ts` resolves the default `dist` against the cwd, not `import.meta.dirname` — reject, false: pnpm runs scripts from the package root, the same as `src/build/cli.ts`
- prior-review #5 (outside its lens): a failed row's result reads "There is no declared range to compare with Zotero X" — reject, false: the message is accurate for that row
- ripple #1: DESIGN.md:68 describes Works and Broken links on each page as present — fix now (marked not built, pointing at the candidate)
- ripple #2: DESIGN.md:78-80 says the page shows declared range and user reports side by side — fix now (same)
- ripple #3: README "Using the data" omits the failed-site case from what stops the deploy — fix now
- ripple #4: CHANGELOG `## Unreleased` names only the more-than-half case as stopping the deploy — fix now (the site entry states the `pnpm site` case)
- ripple #5: DESIGN.md:111 "the static site use TypeScript" — reject, false: the `.astro` templates and the script are TypeScript
- ripple #6: ROADMAP row still says "started M007" — reject, planned change (hygiene)
- ripple #7: `src/build/cli.ts` deploy comment — reject, false: still true for `pnpm build`
- ripple #8: README says `pnpm build` writes one file — reject, false: still true for `pnpm build`
