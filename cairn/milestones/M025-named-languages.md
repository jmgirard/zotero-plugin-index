<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M025: Drop locale folders naming no language

- **Status:** review   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** low   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** —   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** —   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** user-facing — it changes what the published data file's `languages` list holds and the docs that describe it   <!-- owner: plan · create/amend-via-gate; user-facing | internal — <one-clause reason>; skill conduct only — no validate check parses it -->
- **Branch/PR:** m025-named-languages   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

## Goal
<!-- owner: plan · create; a wrong goal returns to plan, never edited in place -->

The published `languages` list holds only tags whose language has an English name, so a locale folder such as `locale/img/` no longer lists `img` as a language.

## Scope
<!-- owner: plan · create/amend-via-gate -->

**In:** `localeLanguages` in `src/upstream/reader.ts` keeps a canonical tag
only when `new Intl.DisplayNames(["en"], { type: "language", fallback:
"none" })` gives a name for the tag's language subtag
(`new Intl.Locale(tag).language`). The script, region, and variant are not
checked. Two new cases in the reader's languages table. The README,
CHANGELOG, schema description, DESIGN, and code comments that state the
rule.

**Out:** `languages` override values in `index.json` keep only the schema's
tag-shape pattern. The user chose the read list only at the plan, and
README states that overrides are not filtered; no row. The site's display
of an override tag with no name, by its code, stays as it is. Old records
need no rewrite, since the daily build reads each plugin again. The schema
pattern `LANGUAGE_TAG` does not change.

## Acceptance criteria
<!-- owner: plan · create/amend-via-gate; review reads, never reinterprets. -->

- [x] AC1: For an XPI whose locale folders are `locale/en-US/`,
      `locale/img/`, `locale/js/`, `locale/qaa/`, `chrome/locale/IMG/`,
      `locale/js_US/`, and `locale/fil/`, each holding a file,
      `readUpstream` gives `languages` as `["en-US", "fil"]`. A case in the
      languages table of `test/upstream.test.ts` asserts this list.
- [x] AC2: For an XPI whose only locale folders are `chrome/locale/en_XX/`
      and `chrome/locale/en_Qaaa/`, each holding a file, `readUpstream`
      gives `languages` as `["en-Qaaa", "en-XX"]`. A case in that table
      asserts this list.
- [x] AC3: The `languages` text in README.md's "Using the data", the
      languages entry under "Unreleased" in CHANGELOG.md, the `languages`
      description in `schemas/plugins.v1.schema.json`, item 2 of
      cairn/DESIGN.md's data sources and its reader paragraph, and the
      comments on `languages` and `localeLanguages` in
      `src/upstream/reader.ts` state that a tag counts only when its
      language has an English name in the build's Node.js `Intl` data.
      README.md also states that this rule does not apply to `languages`
      override values. README.md, with each line break replaced by a space,
      does not contain "does not check that a tag names".
- [x] AC4: `pnpm test` and `pnpm check` pass.

## Coverage
<!-- owner: plan · create/amend-via-gate -->

- AC1 → T1, T2
- AC2 → T1, T2
- AC3 → T2, T3, T5
- AC4 → T4

## Tasks
<!-- owner: plan (create) / implement (check-off, minor edits); substantive
     change is amend-via-gate. -->

- [x] T1: Add the AC1 and AC2 cases to the languages table in
      `test/upstream.test.ts` (near line 130). Run them on the unchanged
      reader and see the AC1 case fail with `img`, `js`, `qaa`, and `js-US`
      in the list; the AC2 case passes before and after, as a control.
- [x] T2: In `localeLanguages` (`src/upstream/reader.ts` near line 497),
      skip a canonical tag when a module-level `Intl.DisplayNames(["en"],
      { type: "language", fallback: "none" })` gives no name for its
      language subtag. Update the comments on `languages` (near line 31)
      and above `localeLanguages` (near line 492).
- [x] T3: Update README.md "Using the data" (near line 97; drop "It does not
      check that a tag names a known language", state the rule, its Node
      `Intl` source, and that overrides are not filtered), the CHANGELOG
      languages entry under "Unreleased" (edit it, add no new entry), the
      schema `languages` description (near line 110), and cairn/DESIGN.md
      item 2 (near line 100) and the reader paragraph (near line 270).
      Search joined copies for stale wording.
- [x] T4: Run `pnpm test` and `pnpm check`. The PR's CI run, on Node 24,
      is the Node 24 check of AC1 and AC2.
- [x] T5: Review return 1: name the build's Node.js `Intl` data in the
      comment on `languages` in `src/upstream/reader.ts` (near line 31).

## Work log
<!-- owner: any skill · append-only; one line per entry; absolute dates. -->

- 2026-10-27: created by /milestone-plan.
- 2026-10-27: tier check: milestone — it changes what the published `languages` list holds, against README's stated rule that the reader does not check for a known language, and the filter is a design choice.
- 2026-10-27: idea vet: two concerns. Live data (20 records, 50 tags, read 2026-10-27) holds no unnamed tag, so the change guards later plugins only — answered build it. The kept set follows the build's Node `Intl` data, so a rare language with no English name is dropped and a Node upgrade can change the set — answered build it, with the docs naming that source.
- 2026-10-27: question set: apply the rule to `languages` override values too — no, read list only; README says so.
- 2026-10-27: lessons used: 2026-10-25 (M001) pnpm through npx; 2026-10-26 (M018) search joined copies of wrapped docs.
- 2026-10-27: plan gate chose checking the language subtag over checking the whole tag because the whole-tag call gives no name for `en-XX` (known language, unknown region); falsified by a kept tag whose language has a name but which users report as no real interface language.
- 2026-10-27: changelog: edit the languages entry under "Unreleased", since that feature is not released yet, rather than add an entry.
- 2026-10-27: collision check: absorbs candidate row "Drop locale folders naming no language" (M023, M024 reviews); M023 and M024 shipped the reader and the site; no D-entry covers the filter.
- 2026-10-27: inbox sweep: 0 open issues; 3 open bot PRs (#15, #25, #28) each add a plugin, no overlap.
- 2026-10-27: criteria audit (full): 8 findings, all fixed. AC1 dropped its "because" clause and added probes for `chrome/locale/`, upper case, `_`, and `js_US`; AC2 narrowed to exact inputs and list; AC3 added the schema description, DESIGN item 2, the Node `Intl` source, and a line-break-safe search; the override check was not built (question set), so README states overrides are not filtered.
- 2026-10-27: criteria re-audit (full, after the question set): 3 findings, all fixed. `locale/css/` (an ISO 639-3 code that later data could name) became `locale/qaa/` (private use); AC1 added the kept 3-letter `fil`; AC2 added the unknown script `en_Qaaa`; T4 reads the PR's Node 24 CI run.
- 2026-10-27: implement started on branch m025-named-languages.
- 2026-10-27: T1 done: two table cases; on the unchanged reader the AC1 case failed with extra `img`, `js`, `js-US`, `qaa`, and the AC2 case passed (control).
- 2026-10-27: T2 done: module-level `LANGUAGE_NAMES` (`Intl.DisplayNames`, `fallback: "none"`) checked on `new Intl.Locale(tag).language` inside the existing try; both comments updated. `pnpm test` 681 passed, `pnpm check` 0 problems.
- 2026-10-27: T3 done: README (rule, Node `Intl` source, region and script not checked, overrides not checked), CHANGELOG Unreleased entry edited, schema `languages` description, DESIGN item 2 and reader paragraph. Joined-copy search: "does not check that a tag names" 0 in README. The simple-english hook's hits on untouched README and CHANGELOG lines are left alone.
- 2026-10-27: claim audit: 14 claims read, 0 corrected — README.md, CHANGELOG.md, schemas/plugins.v1.schema.json, src/upstream/reader.ts, test/upstream.test.ts, cairn/DESIGN.md. Its optional note taken: schema "Empty when the XPI has none" now reads "no such folder".
- 2026-10-27: T4 done: `pnpm test` 681 passed, `pnpm check` 0 problems on Node 26.12.1; the Node 24 check of AC1 and AC2 is the PR's CI run at review.
- 2026-10-27: status review; handed to /milestone-review.
- 2026-10-27: review return 1: AC3 fails as written; the comment on `languages` in `src/upstream/reader.ts` (near line 31) does not name the build's Node.js `Intl` data.
- 2026-10-27: T5 added for review return 1 (minor amendment; Coverage AC3 → T2, T3, T5) and done: the comment now names the build's Node.js `Intl` data. `pnpm test` 681 passed, `pnpm check` 0 problems. The claim audit's one pass stands; the new words repeat the `localeLanguages` comment it read as OK.
- 2026-10-27: status review; handed to /milestone-review.

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive. -->

Pass 1 (2026-10-27, branch at 2e1c9a4, main not moved):

- AC1: `vitest run test/upstream.test.ts --reporter=verbose` passes "lists only tags whose language has an English name as the languages" (expects `["en-US", "fil"]` from the seven folders as written).
- AC2: the same run passes "lists tags whose region or script has no name as the languages" (expects `["en-Qaaa", "en-XX"]`).
- AC3: FAIL. README, CHANGELOG, schema, DESIGN (both sites), and the `localeLanguages` comment name the Node.js `Intl` data; README states overrides are not checked; the joined README holds 0 matches of "does not check that a tag names". The comment on `languages` in `src/upstream/reader.ts` (near line 31) says only "has an English name (see localeLanguages)" and does not name the Node.js `Intl` data. Returned to implement.
- AC4: `pnpm test` 17 files, 681 tests passed; `pnpm check` 20 entries, 0 problems.
- Gate: `cairn_validate` all checks passed; no principle changed (cairn_impact skipped); generic profile names no toolchain checks.

Pass 2 (2026-10-27, branch at 0eb06fc, main not moved):

- AC3: the comments on `languages` (lines 31-33) and `localeLanguages`, README, CHANGELOG, the schema description, and DESIGN item 2 and the reader paragraph each name an English name in the Node.js `Intl` data; README states overrides are not checked; the joined README holds 0 matches of "does not check that a tag names".
- AC1, AC2, AC4 at 0eb06fc: `pnpm test` 17 files, 681 tests passed (both new table cases among them); `pnpm check` 20 entries, 0 problems.
- Gate: `cairn_validate` all checks passed.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: `locale/zxx/` and `locale/mul/` are kept, since `DisplayNames` names them "No linguistic content" and "Multiple languages" — follow-up, new row "Drop zxx and mul from the languages".
- diff-bug #2: the check reads `Intl.Locale`'s alias-mapped language (`tw` → `ak`) while the docs say "its language subtag" — reject (false): that is the subtag reading the site's `subtags` also uses, and no tag was found whose outcome differs.
- diff-bug #3: Node 24 is not checked locally — reject (planned change): T4 routes it to the PR's Node 24 CI run at merge.
- diff-bug #4: the AC1 case repeats the drop path (`img`, `js`, `qaa`, `IMG`) — reject (planned change): AC1 names these inputs, which the plan audit asked for to vary form.
- diff-bug #5: the AC2 case's two inputs repeat one keep path — reject (planned change): AC2 names both inputs.
- diff-bug #6: "the build" is ambiguous, since the filter runs in the reader — reject (false): `pnpm build` runs the reader that writes the published list.
- blame-history #1: real languages with no English name, such as `cdo` and `mnw`, are dropped — reject (planned change): the user accepted this at the plan's question set; recorded as a Known issue at hygiene.
- blame-history #2: an override tag such as `js` still shows as "js (1)" — reject (planned change): the user chose the read list only; Scope Out and README say so.
- blame-history #3: output depends on the runtime's Intl data, Node 24 unverified — reject (planned change): DESIGN records the risk; T4 reads the Node 24 CI run.
- blame-history #4: the v1 `languages` meaning narrows with no schema version change — reject (planned change): the feature is under "Unreleased", and D-006/D-007 let v1 content change.
- blame-history #5: an overlong CHANGELOG line, and no comment on `LANGUAGE_NAMES` — reject (style).
- prior-review #1: comment and code lines of 85-93 columns in `reader.ts` — reject (style): no formatter, and main has 71 lines over 90 columns.
- prior-review #2: an 82-column CHANGELOG line — reject (style).
- prior-review #3: "no such folder" in CHANGELOG and the schema can read as only absent folders — fix now: CHANGELOG now says "If no tag is left, the list is empty"; the schema's "such folder" refers back to the folders the same sentence filters, fixed 703df79.
- prior-review #4: the site shows override tags with no name by code — reject (planned change): Scope Out.
- ripple #1: DESIGN's reader paragraph first says it records the folder tags, then qualifies it — reject (false): the next sentence of the same paragraph states the filter.
- ripple #2: the docs name "the build" as the Node source, but discover and add-plugin also run the reader — reject (false): only the build publishes the list.
- ripple #3: DESIGN line 36 says the locale folders "name" the languages — reject (false): a folder whose language has no name names no language.
- ripple #4: README's first sentence about the list is qualified two sentences later — reject (false): the same paragraph states the rule.
- ripple #5: ROADMAP row "Drop locale folders naming no language" describes the old behavior — reject (planned change): post-merge hygiene graduates it.
- ripple #6: README line 110 still holds — noted, requests nothing.
- snapshot: the changed-path list holds no `_snaps` or `__snapshots__` path.
