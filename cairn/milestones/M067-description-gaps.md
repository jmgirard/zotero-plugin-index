<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M067: Fill the description gaps

- **Status:** review   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** normal   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** —   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** —   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** user-facing — it changes the description that the site shows for each plugin
- **Branch/PR:** m067-description-gaps   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

## Goal
<!-- owner: plan · create; a wrong goal returns to plan, never edited in place -->

Each plugin in the deployed data of 2026-10-31 shows an English description of at least six words, from the author's text where it has one and from an index override where it has none.

## Scope
<!-- owner: plan · create/amend-via-gate -->

**In:** the Latin-script part rule in `shownDescription` (D-038). The `pnpm description-gaps` command. A ledger of
the gaps in the pinned data file. A `description` override for each plugin that the ledger marks. The docs for the
short case and the new rule.

**Out:** writing a description for every plugin (the user rejected it on 2026-10-31). Machine translation (D-030).
Mixed texts whose CJK share is below 0.5, which no rule covers (D-038). Plugins added after the pinned file →
candidate "Close gaps in the description pick", item (4). The `cjkShare` and Details gaps in that row stay there.

## Acceptance criteria
<!-- owner: plan · create/amend-via-gate; review reads, never reinterprets.
     Every item opens with its positional label — `ACn:` — the item's
     position counted top-to-bottom, the number Coverage cites; an
     insertion, removal, or reorder renumbers the labels and the Coverage
     lines together. -->

A word in these criteria is a run of letters, marks, and digits. Repeats and filler words count.

- [x] AC1: `shownDescription` in `src/site/description.ts` uses the Latin-script part of a manifest or GitHub
      description whose CJK share is 0.5 or more. The rule cuts the text at each ` / ` and after each `。`. The
      Latin-script part is the pieces whose letters are all Latin script and that hold at least three words. Each
      piece is trimmed, and the pieces are joined with one space. When the part exists and does not only repeat the
      name, it takes the place of the whole text in the pick. Otherwise the site uses the whole text as before.
      `test/description.test.ts` covers each of these inputs:
      a piece after ` / ` in a manifest text; a piece before ` / ` in a GitHub text; a piece after `。`;
      two pieces joined; the list text `期刊分区 / 中科院 / JCR / 影响因子`, which keeps its whole text;
      a piece that only repeats the name, which keeps the whole text; and a text whose CJK share is just below 0.5,
      which is unchanged.
- [x] AC2: `pnpm description-gaps <data file>` reads a `plugins.json` that the v1 schema accepts. It replaces each
      record's `overrides` with those of the checkout's `plugins/<id>/index.json`. A record with no checkout entry
      gets no overrides. The command checks each record that has an `upstream` block. It prints one line with the id,
      the case, and the shown text when the shown description is missing, has a CJK share of 0.5 or more, or has
      fewer than six words. The line names the first of these cases that applies, in that order. The command exits 0.
      It exits 1 with a message that names the cause for a file it cannot read, a file that is not JSON, and a file
      that the v1 schema refuses. `test/description-gaps.test.ts` covers each case line and each error. It also covers
      a record that a checkout override takes out of the list, a record with no checkout entry, and a CJK text of
      fewer than six words, which prints as CJK.
- [x] AC3: DESIGN's Data sources item 3, README's override section, the About page's Overrides section, and the
      `overrides` and `reason` prose of `schemas/index.v1.schema.json` each name the short case of D-038. README,
      DESIGN, and the About page's Descriptions section state AC1's rule. README names `pnpm description-gaps`.
      CHANGELOG.md's Unreleased section names AC1's rule and the short case.
- [ ] AC4: `cairn/references/description-ledger.md` names its data file: the deployed `v1/plugins.json` with
      `generatedAt` 2026-10-31T07:51:22.433Z and SHA-256 `d1c883cc6f945563ba133033491e8f9c21c69a088f527f18574287bff4e77287`,
      on the shelf as `cairn/references/sources/plugins-data-2026-10-31.json`. The ledger lists each line that
      `pnpm description-gaps` prints over that file on the branch, with AC1's rule and before any new override. It
      also lists `assistente-ia@sbhg.pt`, `colecoes-coloridas-zotero@joao-fisio`, and `ufc-zotero-plugin@saviotp`,
      whose shown descriptions the plan's scan found in Portuguese. Each row gives the case and a disposition. The
      disposition is override, unless no upstream file says what the plugin does. Then it is kept with that reason.
- [x] AC5: Each plugin that the ledger marks override has a `description` override with no `version` in
      `plugins/<id>/index.json`. Its `value` is English text of at least six words. The text is drawn from an upstream
      file, and translated by hand where that file is not in English, as the M055 overrides were. Its `reason` names
      that file. For each upstream description, the reason says which case it is, or that it is in English and not
      shown. `pnpm check` passes.
- [x] AC6: Over the ledger's data file, `pnpm description-gaps` on the branch prints only plugins that the ledger
      marks kept. `pnpm test` and `pnpm check` pass.

## Coverage
<!-- owner: plan · create/amend-via-gate; each acceptance criterion → the
     task(s) satisfying it, by positional number (AC/Task counted
     top-to-bottom). Review reads to fence evidence — tracking-rules "AC fencing". -->

- AC1 → T1, T8
- AC2 → T2, T8
- AC3 → T6, T8
- AC4 → T3, T8
- AC5 → T4, T5
- AC6 → T7

## Tasks
<!-- owner: plan (create) / implement (check-off, minor edits); substantive
     change is amend-via-gate. Every item opens with its positional label —
     `Tn:` — the item's position counted top-to-bottom, the number Coverage
     cites; an insertion, removal, or reorder renumbers the labels and the
     Coverage lines together. -->

- [x] T1: Tests first in `test/description.test.ts` for AC1's inputs, then the Latin-script part in
      `src/site/description.ts`, applied to the manifest and GitHub texts before `informative` and the pick.
- [x] T2: Tests first in `test/description-gaps.test.ts`, then the command in `src/site/` with a
      `description-gaps` script in `package.json`. Reuse `shownDescription`, `cjkShare`, and the checker's entry and
      schema reads in `src/check/`.
- [x] T3: Run `pnpm description-gaps` over the shelf copy. Write `cairn/references/description-ledger.md` from the
      synthesis template, with an `INDEX.md` line, and read each listed plugin's README to set its disposition.
- [x] T4: Overrides for the missing, CJK, and Portuguese rows, in the reason form of the M055 overrides.
- [x] T5: Overrides for the short rows. Zotgit and ZotMoov share one text, and each gets its own override.
- [x] T6: Docs: DESIGN item 3 and the description paragraph, README, the About page, both schema prose spots, and
      CHANGELOG. Find split phrases with a joined copy, and keep added lines within 80 columns.
- [x] T7: Run `pnpm description-gaps` over the shelf copy again and check its output against the ledger's kept
      rows. Then run `pnpm test` and `pnpm check`.
- [x] T8: Review return 1: add each line's shown text to the ledger rows (AC4), and fix the pass-1 fix-now findings
      in the Review section: the CLI's plugins root and line format, the 9 wrong category assignments, the docs
      order and wording, the line widths, and the three test changes.

## Work log
<!-- owner: any skill · append-only; one line per entry; absolute dates. -->

- 2026-10-31: created by /milestone-plan.
- 2026-10-31: tier check: milestone — it widens the description override rule and changes the site's description rule, both design decisions.
- 2026-10-31: idea vet: gap — "too short" needs a bar; the set chose every English description under six words. Gap — the English half of a mixed text by rule or by override; the set chose the rule. No flaw.
- 2026-10-31: collision check: D-030, D-031, D-032 extended by D-038 (no rejection; D-030's machine-translation rejection stands). M015 and M055 done, and this extends them. Candidate "Close gaps in the description pick" is distinct and gains item (4) for new plugins. No planned or in-progress milestone.
- 2026-10-31: inbox sweep: 0 open issues; 19 open bot pull requests add plugins and do not overlap; their gaps fall under the candidate's item (4).
- 2026-10-31: lessons used: 2026-10-25 (M001, pnpm via npx), 2026-10-26 (M018, joined-copy grep), 2026-10-28 (M035, deployed data for hand checks), 2026-10-28 (M036, long added lines), 2026-10-31 (M066, a merge deploys nothing until Build data runs).
- 2026-10-31: question set: short case — every English description under six words gets an override.
- 2026-10-31: question set: mixed CJK and English texts — a rule in the site code.
- 2026-10-31: question set: gap command — in scope.
- 2026-10-31: question set: after the merge, start `Build data` on main with `gh workflow run build.yml --ref main` — yes.
- 2026-10-31: criteria audit (full mode, fresh Opus reader): 11 findings, all taken. They covered list fragments ("JCR") from the ` / ` cut, the Latin-only and three-word piece rule, the name-only fallback, probes on the GitHub text, case order and word counting, the no-entry record, the case defined without the override, the second schema spot, the ledger's undefined hand read and data file, and the six-word floor on override values.
- 2026-10-31: criteria re-audit (full mode, same reader, after the set changed AC3 to AC5): 5 findings. Mixed texts below 0.5 dropped from the ledger toward the narrower promise, since no rule covers them. The data file pinned by `generatedAt` and SHA-256 on the shelf. "Word" defined once. The rule named the Latin-script part. Noted that AC1 makes zotero-keep-window short, which the ledger run catches.
- 2026-10-31: plan gate chose the Latin-script part rule over an override for each mixed text because new ones arrive often and an override hides author edits; falsified by a shown part that is a fragment and does not describe the plugin.
- 2026-10-31: plan chose a plain count of six words over a count that leaves out the name and filler words, because it is simpler to state and the set replaces every short text; falsified by short overrides that keep replacing clear author text that readers prefer.

- 2026-10-31: implement started on branch m067-description-gaps.
- 2026-10-31: T1 done: `latinPart` in `src/site/description.ts` runs on each upstream text before `informative`, falling back to the whole text; 7 new cases in `test/description.test.ts`. Over the shelf copy it changes 5 shown descriptions (focus-note-column, papercompare, popfish, structured-tags, zotero-keep-window). pnpm test and pnpm check pass.
- 2026-10-31: T2 done: `findGaps` and `gapOf` in `src/site/description-gaps.ts`, CLI `src/site/description-gaps-cli.ts`, script `description-gaps`. It reads `plugins/` in the package root and refuses an index.json that is unreadable, not JSON, or fails its schema (entry-* messages), beside the three data-* errors. Lines are `<id>\t<case>\t<shown>` plus a count line. A planted wrong case order turned 2 of 12 tests red. Over the shelf copy: 28 gaps (1 missing, 10 cjk, 17 short). pnpm test and pnpm check pass.
- 2026-10-31: T6 done ahead of T3 to T5, while two Opus subagents drafted overrides from the READMEs: DESIGN item 3, the description paragraph, and the site-build bullet; README's description rule, override bullet and reason, and a new "Finding description gaps" section; About Descriptions and Overrides; both schema prose spots; one CHANGELOG entry. A joined-copy grep finds the short case and the rule in each named doc. pnpm test and pnpm check pass.
- 2026-10-31: delegation: two Opus subagents read the READMEs of the 31 ledger rows (28 gap lines plus 3 Portuguese) and drafted value, source, and reason for each; all 31 override, none kept. Checked here: each quoted upstream text against the shelf copy, each case, and each value's word count (27 to 37). Reworded 3 values (zoterotag's "Automates your workflow", two semicolon joins).
- 2026-10-31: T4 done: 14 `description` overrides with no `version` (1 missing, 10 cjk, 3 Portuguese), each file byte-equal to the checked draft.
- 2026-10-31: T5 done: 17 short-case overrides, each byte-equal to the checked draft; zotgit and zotmoov each have their own text. `pnpm description-gaps` over the shelf copy now prints 0 gaps, and pnpm check passes. T3's ledger comes next, written from the T2 run and these dispositions.
- 2026-10-31: T3 done after T4 and T5 (a minor reorder): `cairn/references/description-ledger.md` and its INDEX line, 31 rows (28 from the T2 run, 3 Portuguese from the plan's scan), all override.
- 2026-10-31: T7 done: `pnpm description-gaps` over the shelf copy prints "0 plugins with a description gap", matching the ledger's 0 kept rows; pnpm test (1619 passed, 6 skipped) and pnpm check (272 entries, 0 problems) pass.
- 2026-10-31: claim audit: 150 claims read, 5 corrected — plugins/register02@cn.nutstore.net/index.json, plugins/zoterogpt@polygon.org/index.json, plugins/zoterotag@euclpts.com/index.json (plus bionicReader, same note), test/description.test.ts, CHANGELOG.md
- 2026-10-31: claim audit re-read of the corrected claims by the same reader: all hold. pnpm test and pnpm check pass. Status set to review.
- 2026-10-31: review return 1: AC4 — the ledger rows give no shown text, so the ledger does not list each line `pnpm description-gaps` prints (diff-bug #13). The same return carries the pass-1 fix-now findings listed in the Review section: the CLI's plugins root, the 9 wrong category assignments, the docs order and wording, the line widths, the CLI line format, and three test changes.
- 2026-10-31: T8 added for review return 1 (minor amendment; Coverage AC1 to AC4 gain T8).
- 2026-10-31: T8 done: the ledger gains a Shown text column (AC4) and a Category changes section; 9 category excludes in `src/site/categories.ts` leave 7 plugins with 17 new assignments the read marked right; the CLI reads `plugins/` from its own folder, prints whitespace as one space, prints no trailing tab for `missing`, and ends "description gaps: N"; README, About, and DESIGN state override first, then the Latin-script part, then the drop and the pick; README says a short other-language text lists as `short`; both schema prose fixes; CHANGELOG and README within 80 columns; tests: exactly-0.5, mixed-piece, CLI from another directory, CLI line format, redundant `ok` check dropped, About test lines for the new rules. Planted defects (`<=` at 0.5, no Latin filter, cwd root) each failed their test. pnpm test (1622 passed, 6 skipped) and pnpm check pass.
- 2026-10-31: claim audit: 81 claims read, 2 corrected — cairn/references/description-ledger.md (the category read is 13 of 22 right and 9 wrong, not 17 of 26, which also corrects the T8 line above and the diff-bug #2 Review line's count), README.md and src/site/description-gaps-cli.ts (the CLI also trims the shown text's ends)
- 2026-10-31: status set to review after return 1.
- 2026-10-31: claim audit re-read of the 2 corrected claims by the same reader: all hold; one README line rewrapped.

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive. -->

Pass 1, 2026-10-31, on branch m067-description-gaps at 9a5d42a, main at c6f6954 (not moved since the cut).

- AC1 evidence: `vitest run test/description.test.ts --reporter=verbose` passes the 7 "shows the Latin-script part or the whole text of a …" cases: a piece after ` / ` (manifest), before ` / ` (GitHub), after `。`, two pieces joined, the `期刊分区 / 中科院 / JCR / 影响因子` list (whole text), a name-only piece (whole text), and a text at share 0.474 (unchanged).
- AC2 evidence: `test/description-gaps.test.ts` passes 12 tests: the missing, cjk, and short lines in order with a failure record skipped; a CJK text of 3 characters printed as cjk; repeats and filler counted; checkout overrides replacing the data file's, including a record with stale data-file overrides and no checkout entry; the data-unreadable, data-not-json, and data-invalid messages; three entry-* messages; and the CLI printing a gap with exit 0 and exiting 1 with data-unreadable.
- AC3 evidence: joined-copy greps find "fewer than six words" in DESIGN item 3, README's override bullet, the About Overrides section, and both schema prose spots (`overrides` and `reason` descriptions, read by key); "Latin-script part" in README, DESIGN, and the About Descriptions section; `description-gaps` in README's new "Finding description gaps" section; and CHANGELOG's Unreleased entry names both.
- AC4 evidence: the shelf file's SHA-256 is d1c883cc…77287, and the ledger states it and `generatedAt` 2026-10-31T07:51:22.433Z once each. `findGaps` over that file with `plugins/` from the T2 commit 5020a72 (via `git archive`) gives 28 lines, equal as id:case pairs to the ledger's 28 non-Portuguese rows. The 3 Portuguese ids are rows G29 to G31. Every row has a case and a disposition.
- AC5 evidence: for all 31 override rows, a script reads `plugins/<id>/index.json` and finds one `description` override with no `version`, a value of 27 to 37 words, and a reason that opens "Condensed from" or "Translated from" a named `.md` file. The claim audit checked each case claim and each quoted upstream text against the shelf file, and 4 corrected reasons passed its re-read. `pnpm check`: 272 entries, 0 problems.
- AC6 evidence: `pnpm description-gaps` over the shelf file prints "0 plugins with a description gap", and the ledger marks no row kept. `pnpm test`: 27 files passed, 1 skipped; 1619 tests passed, 6 skipped. `pnpm check`: 0 problems.
- Consistency gate: `cairn_validate.py` all checks passed. No principle changed, so no `cairn_impact`. The generic profile's consistency-gate slot names no toolchain checks.
- Hand look: a site built from the shelf file with the branch's overrides merged in shows Pop-Fish's English part, the KeepZotero and Zotero Keep Window overrides on the home page, and both new rules on the About page.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: the CLI resolves `plugins` against the current directory, so `node src/site/description-gaps-cli.ts` run elsewhere drops every override and lists 36 gaps with exit 0 — fix now (resolve the root from the script's own folder)
- diff-bug #2: the new override texts change the categories of 15 plugins (D-037), unread; some look wrong — fix now (hand read of the 26 new assignments: 9 wrong, excluded, and a section in the description ledger)
- diff-bug #3: home search matches the shown text, so a Chinese search no longer finds the 5 plugins whose shown text is now the Latin-script part — reject, planned change: AC1 replaces the shown text, and the search contract (name or shown description) is unchanged
- diff-bug #4: `latinPart` would show a 3-word piece that is not a description, such as "JCR SCI SSCI", a URL, or "v1.2.3 beta" — follow-up, new row "Refine the Latin part and short picks" ([parked]); AC1 fixes the rule's wording, and no record in the shelf file has such a piece
- diff-bug #5: a short Latin-script part now beats a longer English GitHub text — reject, planned change: AC1 puts the part in place of the whole text in the pick
- diff-bug #6: no test input reaches the Latin-only letter filter, since every CJK piece has fewer than three words — fix now (a test with a mixed piece of four Latin words)
- diff-bug #7: 8 short-case overrides hide a longer English GitHub text already upstream — reject, planned change: the set chose an override for every short text (D-038); the pick-rule idea goes to the new row
- diff-bug #8: the command adds its own index.json read and schema compile, though T2 said to reuse src/check — reject, false premise: `compileValidators` needs the registry schema download, and build's `readEntry` also reads meta.json and stops on a missing entry, which this command must treat as no overrides
- diff-bug #9: CHANGELOG.md:463 and README.md:102 pass 80 columns — fix now
- diff-bug #10: the About Descriptions paragraph leaves out "joined with one space" — fix now
- diff-bug #11: the schema `reason` prose ends in a clause that does not fit its "whether each" sentence — fix now
- diff-bug #12: the CLI prints the shown text raw, so a tab or newline breaks the line format; a missing case leaves a trailing tab; the count line says "1 plugins" — fix now
- diff-bug #13: the ledger rows give no shown text, so the ledger does not list each line the command prints, as AC4 says — fix now; AC4 fails as written, so this is a floor return (review return 1)
- diff-bug #14: "short" fires for a short text in any language, while D-038 speaks of English text — reject for the code, which matches AC2's wording; the README claim that it finds no other-language text is fixed under blame-history #3
- diff-bug (c): test/description-gaps.test.ts:102 checks `result.ok` before an exact message match that covers it — fix now (drop it); the exact stdout line and the CLI exit-1 test stay, since the line format and the exit code are the contract
- blame-history #1: a mostly-CJK manifest with a Latin-script part now beats an English GitHub text, which reverses M055's pick for that input — reject, planned change (AC1)
- blame-history #2: D-038 widens DESIGN's source-of-truth rule and hides later author edits — reject, planned change recorded in D-038
- blame-history #3: README says the command does not find other-language Latin text, but it lists one under six words as short — fix now
- blame-history #4: "If that part is left" is unclear in README and DESIGN; the schema's last clause names no checked case — fix now (wording, with diff-bug #11)
- prior-review #1: README and About state the Latin-script step after the override sentence and call it "first", so they read as if it came before the override, which repeats M055's override-first defect — fix now (reorder: override first, then the Latin-script part, then the drop and the pick)
- prior-review #2: no test reaches the Latin-script part at a share of exactly 0.5 — fix now
- prior-review #3: ragged wrapping in the new README text — fix now
- ripple #1: README, DESIGN, About, and the schema still list "half or more CJK" as an override case — reject, false: D-038 keeps D-032's case ("The rest of D-030, D-031, and D-032 stands")
- ripple #2: same finding as prior-review #1 — fix now with it
- ripple #3: `schemas/plugins.v1.schema.json:195` says an override "fills in" an English description, which leaves out the short case's replacement — fix now
- AC4 unticked: diff-bug #13 shows it failing as written.
