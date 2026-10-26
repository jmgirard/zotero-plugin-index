<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M015: Show version pills and descriptions

- **Status:** review   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** normal   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** —   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** —   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** user-facing — the public site's home page and plugin pages change   <!-- owner: plan · create/amend-via-gate; user-facing | internal — <one-clause reason>; skill conduct only — no validate check parses it -->
- **Branch/PR:** m015-pills-and-descriptions   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

## Goal
<!-- owner: plan · create; a wrong goal returns to plan, never edited in place -->

Each plugin's row and page show what the plugin does and which Zotero major versions it declares, with no version to type.

## Scope
<!-- owner: plan · create/amend-via-gate -->

**In:** `majorSupport` and `ZOTERO_MAJORS` in `src/site/version.ts`; `shownDescription` in a new
`src/site/description.ts`; pills and descriptions on the home page and plugin pages; the plugin page's
minor facts, id line, and overrides table moved into a closed `<details>` section; the version field,
its page script, and the helpers only it used (`zoteroVersion`, `rangeResult`, `rangeFields`) removed
with their tests; new styles for rows and pills, light and dark; site fixture records for the new
cases; README, CHANGELOG, DESIGN.

**Out:** filtering or highlighting by a chosen Zotero version (the plan gate chose pills only; no row
unless asked). Works and broken user reports (candidate "Collect works and broken user reports").
Index-written descriptions (the plan gate kept upstream text; an override still replaces it). Any
change to the published data or its schemas.

## Acceptance criteria
<!-- owner: plan · create/amend-via-gate; review reads, never reinterprets. -->

- [ ] AC1: `ZOTERO_MAJORS` in `src/site/version.ts` is `["7", "8", "9", "10"]`. `majorSupport(record, N)`
      reads the declared range after overrides (`declaredRange`) and returns `undefined` for a record
      with a failure or with neither bound; `"none"` when both bounds exist and the minimum is newer
      than the maximum; otherwise `"all"` when the minimum is absent or at most `N.0` and the maximum
      is absent or at least `N.9`; `"none"` when the maximum is older than `N.0` or the minimum is
      newer than `N.9`; `"some"` otherwise, all by `compareVersions`. These inputs give these results:
      min `8.0-beta.21` max `10.99.99` → `all` for 8, 9, 10 and `none` for 7; min `8.999` max
      `10.0.*` → `none` for 8, `all` for 9, `some` for 10; min `6.999` max `7.0.*` → `some` for 7;
      min `8.0.1` → `some` for 8, `all` for 10; max `10.*` alone → `all` for 7; max `10.9.9` → `all`
      for 10; min `8.5` max `8.2` → `none` for 8; min `6.999` max `7.0.*` → `none` for 8; a failure
      or no bound → `undefined`; upstream min `7.0` max `7.*` with a `strict_max_version` override
      `8.*` → `all` for 8 (`none` without it); upstream min `7.0` max `10.*` with a
      `strict_min_version` override `9.0` → `none` for 8 (`all` without it).
- [ ] AC2: `shownDescription(record)` returns the `description` override's value when one applies.
      Otherwise it returns the upstream description, except `undefined` when that is absent, blank
      after trimming, or name-only. A description is name-only when its words are a subset of the
      displayed name's words, where words are the runs of Unicode letters and digits after lowercasing,
      leaving out `zotero`, `plugin`, `addon`, `add`, `on`, `extension`, `for`, `a`, `an`, and `the`.
      These inputs give these results, name then description: "Zotero OCR", "Zotero Plugin for OCR" →
      `undefined`; "Scite Zotero Plugin (V7+)", same text → `undefined`; "Zotero PDF Preview", "PDF
      Preview for Zotero." → `undefined`; "ZotLit", "Zotero companion plugin for ZotLit" → kept;
      "Jasminum", "一个简单的 Zotero 中文插件" → kept; a blank description → `undefined`; a name-only
      upstream description with a `description` override → the override's value; the same with a
      `description` override for another plugin version → `undefined`; upstream name "Zotero OCR",
      description "OCR for Zotero", and a `name` override "Tesseract" → kept.
- [ ] AC3: On the built home page, each record's row is the element carrying `data-plugin="<id>"`. It
      holds, in this order: the name link; the `<span data-archived>(archived)</span>` mark when
      `upstream.archived` is true; the `shownDescription` text when defined; and one of "Not read:
      <failure name>" for a failure, "No declared range" for no bound, or one pill per entry of
      `ZOTERO_MAJORS`, in that order, each with `data-major="N"` and `data-support` equal to
      `majorSupport` for that record and N. Absent elements are skipped; present ones keep this order.
- [ ] AC4: Each pill shows its support level as visible text, not by color alone: the major number and
      a mark (✓ for `all`, ◐ for `some`, – for `none`). A visually hidden span inside the pill and
      the pill's `title` both read "Declares all of Zotero N", "Declares part of Zotero N. Declared
      range: <range text>", or "Does not declare Zotero N", by its `data-support`.
- [ ] AC5: Each built plugin page shows, in this order: the name; the `shownDescription` text when
      defined; the pills, "No declared range" for a record read with no bound, or the failure message;
      the declared range text when the record has a bound; the repository link; the releases link when
      the record has `upstream`; then one `<details>` element with no `open` attribute holding the id
      line, the facts `archived`, `repo-created`, `latest-release`, `release-count`, `open-issues`, and
      `update-host` that the record has, and the overrides table when the record has overrides. Absent
      elements are skipped; present ones keep this order. The footer's not-vetted line stays outside
      `<details>`.
- [ ] AC6: No file under the site build's output directory contains `id="zotero-version"`,
      `for="zotero-version"`, "Your Zotero version", `zotero-plugin-index:zotero-version`, or
      `data-result-for`.
- [ ] AC7: `README.md` and `cairn/DESIGN.md` describe the pills, the description rule, and the
      Details section; DESIGN's site entries name `majorSupport` and `shownDescription` and no page
      script; a search of both files for "Your Zotero version", "local storage", and "one script"
      finds nothing; `CHANGELOG.md` has an Unreleased entry for the change; `pnpm test` and
      `pnpm check` pass.

## Coverage
<!-- owner: plan · create/amend-via-gate -->

- AC1 → T1
- AC2 → T2
- AC3 → T3, T4
- AC4 → T4
- AC5 → T3, T5
- AC6 → T6
- AC7 → T7

## Tasks
<!-- owner: plan (create) / implement (check-off, minor edits); substantive change is amend-via-gate. -->

- [x] T1: Tests first in `test/version.test.ts` for every AC1 case, then `ZOTERO_MAJORS` and
      `majorSupport` in `src/site/version.ts` beside `declaredRange`.
- [x] T2: Tests first in a new `test/description.test.ts` for every AC2 case, then
      `src/site/description.ts` with `shownDescription`, using `appliedValue` and the name rule of
      `displayName` (`site/src/data.ts`).
- [x] T3: Extend `test/fixtures/site/plugins.json`, valid against the v1 schema: a record with no
      bound, one with only a minimum, one with a name-only description, and one with a `description`
      override. Rewrite the page and row tests in `test/site.test.ts` for AC3 and AC5 over every
      fixture record.
- [x] T4: Home page (`site/src/pages/index.astro`): a list of rows with name, description, Archived
      mark, and pills (a shared pill component under `site/src/components/`). Pill test for AC4 on
      each of the three levels.
- [x] T5: Plugin page (`site/src/pages/plugins/[id]/index.astro`): the AC5 order and the `<details>`
      section; keep each `data-fact` attribute.
- [x] T6: `site/src/layouts/Base.astro`: drop the version field, hint, and script; add the row and
      pill styles with a `prefers-color-scheme: dark` block. Remove `zoteroVersion`, `rangeResult`,
      `rangeFields`, and their tests (`test/version.test.ts`, `test/site-data.test.ts`). Test for AC6
      over every file the build writes.
- [x] T7: README "The site", a CHANGELOG Unreleased entry, DESIGN Contract boundary, Function Families,
      and Architecture; run `pnpm test` and `pnpm check`; take a screenshot of the built home and one
      plugin page for the merge question.

## Work log
<!-- owner: any skill · append-only; one line per entry; absolute dates. -->

- 2026-10-26: created by /milestone-plan.
- 2026-10-26: tier check: milestone — a redesign of both site pages with design choices about version display and descriptions.
- 2026-10-26: idea vet: (1) exact version math marks ranges such as `10.99.99` as part of Zotero 10, answered by the N.0–N.9 rule; (2) vague manifest descriptions, answered by a name-only rule that hides them; (3) removing facts would break DESIGN's checkable-facts promise, answered by a closed Details section.
- 2026-10-26: collision check: no ROADMAP row, archive, or D-entry rejects this; it replaces M007's version field and keeps M013's archived mark; DESIGN's "no combined verdict" holds, as pills show only the declared range.
- 2026-10-26: inbox sweep: 0 open issues; 1 open bot pull request (#15, add a plugin), no overlap.
- 2026-10-26: lessons used: 2026-10-25 (M007) on Astro's inlined script matching attribute greps; 2026-10-25 (M001) on running pnpm through npx; 2026-10-26 (M014) on per-test names.
- 2026-10-26: question set: pills only, no picker — chosen.
- 2026-10-26: question set: a pill counts N.0 through N.9 as all of Zotero N — chosen over exact math.
- 2026-10-26: question set: plugin's own description, treated as missing when it breaks rules — the user's answer; the agent set the rules in AC2 (blank or name-only).
- 2026-10-26: question set: minor facts fold into a closed Details section — chosen.
- 2026-10-26: plan gate chose the N.0–N.9 pill rule over exact Mozilla-order coverage because authors write `10.99.99` and `8.999` to mean all of 10 and 9-and-later; falsified by a Zotero release numbered N.10 or later.
- 2026-10-26: plan gate chose a closed Details section over removing the minor facts because DESIGN promises checkable facts on each page; falsified by visitors who never open it and a decision to drop the promise.
- 2026-10-26: agent decision: no language rule for descriptions, so a Chinese description stays; detecting language would hide useful text from that plugin's users.
- 2026-10-26: agent decision: a `description` override skips the name-only rule, since the index wrote it on purpose.
- 2026-10-26: criteria audit (full, Opus): 11 findings on the first draft, all taken: empty range and failure give no pills; real-data forms pinned as AC1 cases; inverted range is `none`; `ZOTERO_MAJORS` named; fixture gains the missing cases (T3); pill level visible, not hover-only; Details holds a named closed set and keeps the not-vetted line outside; AC6 covers every built file; the override-rewrite criterion dropped at the gate; DESIGN's stale script lines named; test-naming clauses moved to tasks.
- 2026-10-26: plan committed while the second criteria audit (full, Opus) of the revised wording runs; its findings land in a follow-up docs commit before implement starts.
- 2026-10-26: criteria audit 2 (full, Opus) of the revised wording: every AC1 and AC2 case checked against `compareVersions` and the word rule, all correct; 9 findings, all taken: AC1 gains a max-side `none` case and pinned min and max override cases; AC2 gains a non-applying override case and a `name` override case; AC3 keeps the "(archived)" text and `data-archived`, names the row element, and orders all items; AC5 covers the no-bound record and the releases link on a failure record, and skips absent items; AC6 adds the label's `for=` and text; AC4 names a visually hidden span.
- 2026-10-26: implement started on branch m015-pills-and-descriptions, cut from main at a238ab9.
- 2026-10-26: T1 done: `ZOTERO_MAJORS` and `majorSupport` in `src/site/version.ts`; 19 new tests in `test/version.test.ts` failed first, then passed.
- 2026-10-26: T2 done: `shownDescription` in `src/site/description.ts` computes the shown name itself (override, upstream name, or id) so `src/site/` does not import `site/src/data.ts`; 10 tests in `test/description.test.ts` failed first on the missing module, then passed.
- 2026-10-26: T3 done: fixture gains `no-range-plugin` (no bound, name-only description) and `min-only-plugin` (min only, name-only description with a `description` override); a fixture test asserts each row and page shape exists; row and page tests run over every fixture id.
- 2026-10-26: T4 done: home page is a `<ul class="plugins">` of `<li data-plugin>` rows; pills are `<span>`s in `<div class="pills">` so a row holds no nested `<li>`; shared `site/src/components/Support.astro` renders pills or the status line; all styles stay global in Base so Astro adds no scoped attributes to the exact markup the tests match.
- 2026-10-26: T5 done: plugin page in the AC5 order; repository and releases are `<li data-fact>` links; the id becomes a `data-fact="id"` row inside `<details>`; the overrides table sits in a scrolling wrapper for narrow screens.
- 2026-10-26: T6 done: version field, hint, and script removed from Base; `zoteroVersion`, `rangeResult`, `RangeResult`, `rangeFields` and their tests removed; the override-precedence cases that went through `rangeResult` now test `declaredRange` directly; AC6 test reads every file the build writes. Planted defects (`<details open>`, ◐ shown as ✓) turned 8 of 37 site tests red, then the files were restored from copies.
- 2026-10-26: T7 done: README "The site", one new CHANGELOG bullet plus a pointer in the earlier site bullet (no release tag exists, so its typed-field sentences would be false), DESIGN Contract boundary, Function Families, and Architecture; the doc search for the three phrases finds nothing; `pnpm test` 466 passed, `pnpm check` 0 problems. Screenshots of the home page and the Zoplicate page, built from the live data of 2026-10-26, were taken in the built-in browser (dark scheme; the light-scheme emulation did not apply in the pane). The README's older "validate" wording in "Using the data" was left as it was.
- 2026-10-26: claim audit: 28 claims read, 3 corrected — README.md (description override applies only to the version read; full filler-word list), CHANGELOG.md (no-description, no-range, and failure cases).
- 2026-10-26: implement done; status review.

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive. -->
