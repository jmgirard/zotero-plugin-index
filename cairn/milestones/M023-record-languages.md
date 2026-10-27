<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M023: Record each plugin's interface languages

- **Status:** in-progress   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
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

- [ ] AC1: `readUpstream` sets `facts.languages` to the language tags of the
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
- [ ] AC2: `schemas/plugins.v1.schema.json` gives the `upstream` block an
      optional `languages` property. It is an array, possibly empty, of
      unique strings that each match the tag pattern of AC3. `schemaVersion`
      stays 1. Tests in `test/build.test.ts` show that `buildData` writes the
      reader's list as `upstream.languages`, once for a list with tags and
      once for `[]`. They show that the output passes `checkOutput` in both.
- [ ] AC3: `schemas/index.v1.schema.json` accepts `languages` as an override
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
- [ ] AC4: README "Using the data" describes `upstream.languages`. It names
      the two folder paths that the reader reads. It says that the list does
      not say whether a translation is complete. It says that a plugin whose
      text sits in its code gets `[]`. README "Plugin entries" lists
      `languages` among the override fields, with its value format.
      `CHANGELOG.md` `## Unreleased` has one entry for the language list and
      its override. The entry says that the v1 schema changed, so a saved
      copy of it must be fetched again.
- [ ] AC5: `pnpm test` and `pnpm check` pass.

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
- [ ] T5: Run `pnpm test` and `pnpm check`. Then run `pnpm build` on the
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

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive. -->
