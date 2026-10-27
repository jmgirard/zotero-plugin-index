<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M023: Record each plugin's interface languages

- **Status:** review   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** normal   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** —   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** —   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** user-facing — it adds a field to the public data file and an override field to `index.json`   <!-- owner: plan · create/amend-via-gate; user-facing | internal — <one-clause reason>; skill conduct only — no validate check parses it -->
- **Branch/PR:** m023-record-languages   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

## Goal
<!-- owner: plan · create; a wrong goal returns to plan, never edited in place -->

Each record in the data file carries the interface languages that the
plugin's XPI ships locale folders for, and an override can correct them.

## Scope
<!-- owner: plan · create/amend-via-gate -->

**In:** the upstream reader lists the entry names of the XPI it reads and
records the language tags of its locale folders as `languages`. Schema v1
gains the optional `upstream.languages` field. Both schemas accept a
`languages` override whose value is a list of tags. README, CHANGELOG, and
DESIGN follow.

**Out:**
- The plugin page fact and the home list's language menu → M024. M024 also
  edits this milestone's changelog entry to name them, and its README and
  DESIGN parts land there.
- Whether a translation is complete. The index reads folders, not strings,
  so no row.
- Old saved copies of the v1 schema still reject the new field → candidate
  "Let old v1 schemas accept new fields", unchanged.

## Acceptance criteria
<!-- owner: plan · create/amend-via-gate; review reads, never reinterprets. -->

- [x] AC1: `readUpstream` sets `facts.languages` to the language tags of the
      locale folders in the XPI whose manifest it read. A locale folder is
      the `<tag>` part of an entry name that starts with `locale/<tag>/` or
      `chrome/locale/<tag>/` and does not end with `/`. The reader reads `_`
      in `<tag>` as `-`. It keeps a tag only if the tag matches the tag
      pattern of AC3. It writes each
      kept tag in the form that `Intl.getCanonicalLocales` returns. The list
      holds each such form once, sorted in code-unit order. If no entry gives
      a kept tag, the list is `[]`. Tests in `test/upstream.test.ts` check
      seven XPIs against lists written in the test:
      - `locale/zh-CN/a.ftl` and `locale/en-US/a.ftl`, stored in that order,
        give `["en-US", "zh-CN"]`.
      - `chrome/locale/fr-FR/addon/x.dtd` alone gives `["fr-FR"]`.
      - `locale/de/a.ftl` and `chrome/locale/de/b.dtd` give `["de"]`.
      - `locale/zh_CN/a.ftl`, `locale/zh-CN/b.ftl`, and `locale/EN-us/a.ftl`
        give `["en-US", "zh-CN"]`.
      - `locale/iw/a.ftl` gives `["he"]`.
      - `locale/en-x-pirate/a.ftl`, `locale/default/a.ftl`, and
        `locale/und/a.ftl` give `[]`.
      - An XPI whose only locale entries are `_locales/de/messages.json`,
        `content/locale/fr/x.ftl`, `locale/en-US.ftl`, and the directory
        entry `locale/it/` gives `[]`.
- [x] AC2: `schemas/plugins.v1.schema.json` gives the `upstream` block an
      optional `languages` property. It is an array, possibly empty, of
      unique strings that each match the tag pattern of AC3. `schemaVersion`
      stays 1. Tests in `test/build.test.ts` show that `buildData` writes the
      reader's list as `upstream.languages`, once for a list with tags and
      once for `[]`. They show that the output passes `checkOutput` in both.
- [x] AC3: `schemas/index.v1.schema.json` accepts `languages` as an override
      `field`, and so does the override definition in
      `schemas/plugins.v1.schema.json`. For that field, each schema requires
      the `value` to be one or more tags joined by `, `, such as
      `zh-CN, en-US`. The tag pattern is
      `[A-Za-z]{2,3}(-[A-Za-z]{4})?(-([A-Za-z]{2}|[0-9]{3}))?(-([A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3}))?`.
      A tag whose first part is `und`, in any letter case, does not match.
      Tests in `test/check.test.ts` show that `pnpm check` reports an entry
      whose `languages` value is `Chinese (China)`, `zh-CN,,en`, `abcd`,
      `en-u-ca-gregory`, or `UND`. They also show that it passes an entry
      whose value is `zh-CN, en-US`.
- [x] AC4: README "Using the data" describes `upstream.languages`. It names
      the two folder paths that the reader reads. It says that the list does
      not say whether a translation is complete. It says that a plugin whose
      text sits in its code gets `[]`. README "Plugin entries" lists
      `languages` among the override fields, with its value format.
      `CHANGELOG.md` `## Unreleased` has one entry for the language list and
      its override. The entry says that the v1 schema changed, so a saved
      copy of it must be fetched again.
- [x] AC5: `pnpm test` and `pnpm check` pass.

## Coverage
<!-- owner: plan · create/amend-via-gate; each acceptance criterion → the
     task(s) satisfying it, by positional number (AC/Task counted
     top-to-bottom). Review reads to fence evidence — tracking-rules "AC fencing". -->

- AC1 → T1
- AC2 → T2
- AC3 → T3
- AC4 → T4
- AC5 → T5

## Tasks
<!-- owner: plan (create) / implement (check-off, minor edits); substantive
     change is amend-via-gate. -->

- [x] T1: Write AC1's seven reader tests first and see them fail. The
      fixtures add entries to the `r[XPI].xpi!` map in
      `test/upstream.test.ts`. Then add a helper that lists the entry names
      from the central-directory walk in `zipEntry`
      (`src/upstream/reader.ts:528`), and set `languages` in `readManifest`'s
      result and `UpstreamFacts`. Export the tag pattern from the reader.
- [x] T2: Add `languages` to the `upstream` definition of
      `schemas/plugins.v1.schema.json`, and AC2's two build tests.
- [x] T3: Add `languages` to the override `field` enum of both schemas, with
      an `if`/`then` that sets the `value` pattern. Add AC3's check tests.
      Add a test that the pattern in each schema equals the reader's pattern
      joined by `, `, so the three copies cannot drift.
- [x] T4: README "Using the data" and "Plugin entries", the CHANGELOG entry,
      and DESIGN "Contract boundary" and "Data sources" item 2. Search a
      joined copy of each file for the phrases you change.
- [x] T5: Run `pnpm test` and `pnpm check`. Then run `pnpm build` on the
      real entries and compare a few records' `languages` with an
      `unzip -Z1` listing of the same XPIs.

## Work log
<!-- owner: any skill · append-only; one line per entry; absolute dates. -->

- 2026-10-27: created by /milestone-plan.
- 2026-10-27: tier check: milestone — a new data field, a new override field, and a design choice about the language fact.
- 2026-10-27: idea vet: three concerns, each answered at the question set. (1) The fact reads only locale folders, so a plugin whose text sits in its code (zotero-except, bot PR #28) shows none: the user chose folders plus a `languages` override. (2) A filter needs a script, against D-009: the user chose a filter menu with a script, in M024 under D-014. (3) zh-CN and zh-TW grouping: the user chose one group per language subtag, in M024.
- 2026-10-27: lessons used: 2026-10-25 (M002, used M014) on reading real XPIs; 2026-10-25 (M004, used M021) on DNS stubs in reader tests; 2026-10-25 (M001, used M022) on running pnpm through npx; 2026-10-26 (M018, used M022, corrected M020) on searching a joined copy of the docs.
- 2026-10-27: feature series: M023 -> M024
- 2026-10-27: question set: may the run act on GitHub to test — "n/a"; M023 needs no GitHub action.
- 2026-10-27: investigation: 18 of the 20 listed plugins ship a `zh-CN` folder in their source repos; 10 release XPIs read with `unzip -Z1` keep their folders at `locale/<tag>/`, zotero-ocr also at `chrome/locale/<tag>/`, and zotero-except ships none.
- 2026-10-27: collision check: D-006 and D-007 let an optional field join v1, and AC4 carries their "fetch the schema again" note; D-002 keeps the override in `index.json`; candidate "Let old v1 schemas accept new fields" stays a row; no archived milestone reads locale folders.
- 2026-10-27: inbox sweep: 0 open issues; 3 open bot pull requests (#15, #25, #28) with no overlap.
- 2026-10-27: criteria audit (full mode) returned 12 findings, all fixed: one tag pattern with a 2-3 letter language and at most one variant, shared by the reader and both schemas, so no tag can make the site's `Intl` calls throw; `und` dropped; the pattern enforced in both schemas, not in `pnpm check` alone; the refetch note in AC4; nested paths, directory entries, the read XPI, de-duplication after canonical form, and alias, order, and duplicate cases in AC1; `[]` allowed and tested in AC2. Findings on the site went to M024. The M024 re-audit found that the override pattern let `und` through, which displays as "root"; AC3 now rejects it, and AC1 relies on the same pattern.
- 2026-10-27: plan gate chose locale folders of the read XPI over guessing a language from the script of the name and description, because a folder is a fact a reader can check; falsified by listed plugins whose folders name languages their interface lacks.
- 2026-10-27: plan gate chose `locale/` and `chrome/locale/` over also reading `_locales/`, because `_locales/` holds the manifest's name and description strings; falsified by a listed plugin whose interface text lives only in `_locales/`.
- 2026-10-27: plan gate chose the value pattern in both schemas over a rule in `pnpm check`, because `buildData` checks entries only against the schema; falsified by a value the schemas pass that makes the site's `Intl` calls throw.
- 2026-10-27: changelog: this milestone adds the series' one `## Unreleased` entry, since the data change is user-visible; M024 edits it.
- 2026-10-27: T1+T2 in one checkpoint: the seven reader tests failed first (`languages` undefined); the build tests then failed as `facts-invalid` until the schema gained the field, so T2 landed with T1. `centralEntries` now holds the central-directory walk that `zipEntry` and the name list share; `LANGUAGE_TAG` (exported from the reader) drops `und` with a lookahead. The golden file `test/fixtures/build/mixed-failures.plugins.json` gained one line, `"languages": []`, in its one read record, checked by diffing the new output against it. `pnpm test` 635 passed; `pnpm check` 0 problems.
- 2026-10-27: T3: both schemas' override definitions gained `languages` and an `if`/`then` value pattern (with `"type": "string"`, which Ajv's strict mode needs beside `pattern`); a test in `test/upstream.test.ts` pins all three pattern copies to `LANGUAGE_TAG`. Planted check: with the `if`/`then` removed from `index.v1`, exactly the five rejection tests failed; restored from a copy. `pnpm test` 642 passed; `pnpm check` 0 problems.
- 2026-10-27: T4: README "Using the data" (the `languages` paragraph), "Building the data" (a pointer to it), and "Plugin entries" (the field and value format); one CHANGELOG entry with the refetch note; DESIGN "Contract boundary", "Data sources" item 2, and the reader's Architecture note. A joined-copy search found no other list of override fields. The writing-style hook flags three older README sentences (lines 77, 332, 346) this milestone does not touch; left as they are.
- 2026-10-27: T5: `pnpm build` on the 20 real entries with no token read 18; better-bibtex (HTTP 422 on releases page 11) and zotmoov (HTTP 403) failed on GitHub API limits, as an unauthenticated run does. 17 of the 18 list `zh-CN`; scite lists only `en-US`. The lists for zoplicate (48 tags), Jasminum, zotero-ocr, and Zotero Addons equal an `unzip -Z1` listing of the same XPIs. Zoplicate's `locale/af-ZA/zoplicate-addon.ftl` differs from `en-US` in 3 of 90 lines (zh-CN: 66), so a folder can be an untranslated copy, as README says the list cannot tell; a `languages` override can narrow such a plugin.
- 2026-10-27: claim audit: 32 claims read, 4 corrected — README.md, CHANGELOG.md, schemas/plugins.v1.schema.json, src/upstream/reader.ts. Three said the override corrects or names languages, though nothing applies it before M024, now "records" in the `overrides` block; the reader comment said the schemas build their pattern from `LANGUAGE_TAG`, now that they copy it and a test checks the copies. The re-read found all four true and two wrap slips, fixed.
- 2026-10-27: implement done; status review. `pnpm test` 642 passed; `pnpm check` 0 problems.
- 2026-10-27: step-7 approval: m023-record-languages approved for merge

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive. -->

Pass 1, 2026-10-27, branch `m023-record-languages` at `2724844`, `main` at `6a354ca` (not moved since the cut).

- AC1 evidence: `pnpm exec vitest run --reporter=verbose` passes the seven `lists … as the languages` cases in `test/upstream.test.ts`, each against the list AC1 names (two `locale/` folders stored zh-CN then en-US give `["en-US","zh-CN"]`; `chrome/locale/fr-FR/addon/x.dtd` gives `["fr-FR"]`; `de` under both paths once; `zh_CN`+`zh-CN`+`EN-us` give `["en-US","zh-CN"]`; `iw` gives `["he"]`; `en-x-pirate`, `default`, `und` give `[]`; `_locales/`, `content/locale/`, `locale/en-US.ftl`, and the directory entry `locale/it/` give `[]`). Code read: `readRelease` takes `languages` from `readManifest` on the same XPI whose manifest it parses, also on the newer-release fallback; `localeLanguages` keeps a folder only when it matches `LANGUAGE_TAG`, writes `Intl.getCanonicalLocales` form, de-duplicates in a `Set`, and sorts by code unit.
- AC2 evidence: `schemas/plugins.v1.schema.json` `definitions.upstream.properties.languages` is an array with `uniqueItems` and items of `type: string` matching `^LANGUAGE_TAG$`, no `minItems`, and `languages` is not in `required`; `schemaVersion` is still `const: 1`. The test `writes the reader's language list, with tags or empty, and the output passes the schema` passes: the second plugin's record carries `["en-US","zh-CN"]`, Better Notes carries `[]`, and `checkOutput` returns no problem.
- AC3 evidence: both schemas list `languages` in the override `field` enum, with an `if` (`field` is `languages`) / `then` (`value` is a string matching `^T(, T)*$`, T the AC3 pattern plus the `und` lookahead). The test `shares its language tag pattern with both schemas` passes, pinning all three copies to `LANGUAGE_TAG`. `test/check.test.ts` passes the five `index-schema: a languages override with the value …` cases (`Chinese (China)`, `zh-CN,,en`, `abcd`, `en-u-ca-gregory`, `UND`), each reporting `/overrides/0/value`, and `passes a languages override with the value zh-CN, en-US`. The implement work log records the planted check: without the `if`/`then`, exactly those five failed.
- AC4 evidence: a joined-copy search of README.md finds in "Using the data" "A locale folder is `locale/<tag>/` or `chrome/locale/<tag>/` with at least one file in it.", "It does not say whether a translation is complete.", and "ships no locale folders, so its list is empty."; in "Plugin entries" the field list ends "`strict_max_version`, or `languages`." and the value text "For `languages`, the value is one or more language tags joined by a comma and a space". CHANGELOG.md has one `## ` heading (`## Unreleased`) and one entry naming "interface languages", which ends "so fetch any saved copy of it again."
- AC5 evidence: `pnpm test` exit 0, type check clean, 16 files, 642 tests passed; `pnpm check` exit 0, "checked 20 entries in plugins, 0 problems".
- Consistency gate: `cairn_validate.py` all checks passed; no principle changed, so `cairn_impact` skipped; the generic profile's consistency-gate slot names no toolchain check.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: DESIGN "Contract boundary" says each plugin page shows the languages and an override names them, which holds only after M024 — fix now, fixed 81cfc66.
- diff-bug #2: DESIGN's reader note says both schemas build their pattern from `LANGUAGE_TAG`; they copy it — fix now, fixed 81cfc66.
- diff-bug #3: the Overrides table shows "none" as the upstream value of a `languages` override, since `upstreamValue` in `site/src/data.ts` has no `languages` key — fix now, fixed 81cfc66.
- diff-bug #4: no test fails without the `name.endsWith("/")` check, since `locale/it/` already misses `LOCALE_FOLDER`; `locale/it/sub/` would yield `it` — fix now, fixed 81cfc66 (fixture case).
- diff-bug #5: any 2-3 letter folder such as `locale/img/` or `locale/js/` counts as a tag, so README's "not a language tag" overstates the check — fix now, fixed 81cfc66 (README says "not shaped like a language tag"); dropping folders that name no language goes to new candidate "Drop locale folders that name no language".
- diff-bug #6: canonical forms come from Node's bundled locale data, so a Node upgrade can change `plugins.json` — reject (planned change: AC1 names `Intl.getCanonicalLocales` form; the reviewer found every kept tag on Node 26.12.1 still matches the pattern).
- diff-bug #7: the override pattern accepts repeated tags and other letter case, such as `zh-CN, zh-CN` or `ZH-cn` — follow-up: M024's applied list must canonicalize and de-duplicate, written as a line in M024's work log.
- diff-bug #8: a bad `languages` override prints two `pnpm check` lines, one holding the 420-character pattern — follow-up: new candidate "Shorten the languages override error".
- diff-bug #9: the language walk runs outside the try that maps zip errors to `xpi-unreadable`, safe only because `zipEntry` walked the same bytes first — fix now, fixed 81cfc66 (with blame-history #1).
- diff-bug #10: the central directory is walked three times — fix now, fixed 81cfc66 (DESIGN note, with blame-history #4).
- diff-bug #11: no test checks the `if` of the `plugins.v1` override, so a wrong `const` there would pass — fix now, fixed 81cfc66 (the shared-pattern test also checks both `if` blocks).
- diff-bug (c): the no-locale `[]` is checked by the full-facts reader test and the golden file besides AC2's build test — reject (planned change: both are existing exact-equality checks that gain the field).
- blame-history #1: `[...centralEntries(zip)]` keeps every header of a zip that can claim about 1.1M entries in memory (about 100 MB in the reviewer's scratch model), undoing the walk's streaming shape — fix now, fixed 81cfc66.
- blame-history #2: the language walk sits outside `unzipOne`'s try — fix now, fixed 81cfc66 (same fix as diff-bug #9).
- blame-history #3: the golden test's name "writes the same file as before the build-level rule" no longer holds output from before M017 — reject (planned change: the golden pins the build output's shape, and M021 added `"reports": []` the same way).
- blame-history #4: DESIGN says the reader loops over the claimed count without naming the third walk — fix now, fixed 81cfc66 (same as diff-bug #10).
- prior-review #1: the Overrides table shows "none" for a `languages` override — fix now, fixed 81cfc66 (same as diff-bug #3).
- prior-review #2: DESIGN says the override is for "a plugin whose text sits in its code", README and CHANGELOG say "wrong or empty", and DESIGN says "translations" where README says "interface text" — fix now, fixed 81cfc66.
- prior-review #3: a new full pass over the central directory — fix now, fixed 81cfc66 (same as blame-history #1).
- ripple #1: the Overrides table and DESIGN's "beside the upstream value it corrects" disagree for `languages` — fix now, fixed 81cfc66 (same as diff-bug #3).
- ripple #2: README's `pnpm add-plugin` text names only `manifest.json` and `update.json` — reject (false: the command writes no `languages`, so its text stays true).
- ripple #3: `readRelease`'s comment does not name the languages it now returns — fix now, fixed 81cfc66.
- Fix-now re-verify at `81cfc66`: `pnpm test` 645 passed (3 new `upstreamValue` cases in `test/site-data.test.ts`); `pnpm check` 0 problems; `cairn_validate.py` all checks passed. Planted check: without `name.endsWith("/")`, only "lists no tag from other paths or a directory entry as the languages" failed; restored from a copy. AC1-AC5 evidence above still holds: the seventh AC1 case gained `locale/it/sub/` and still gives `[]`.
