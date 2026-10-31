<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M067: Fill the description gaps

- **Status:** in-progress   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
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

- [ ] AC1: `shownDescription` in `src/site/description.ts` uses the Latin-script part of a manifest or GitHub
      description whose CJK share is 0.5 or more. The rule cuts the text at each ` / ` and after each `。`. The
      Latin-script part is the pieces whose letters are all Latin script and that hold at least three words. Each
      piece is trimmed, and the pieces are joined with one space. When the part exists and does not only repeat the
      name, it takes the place of the whole text in the pick. Otherwise the site uses the whole text as before.
      `test/description.test.ts` covers each of these inputs:
      a piece after ` / ` in a manifest text; a piece before ` / ` in a GitHub text; a piece after `。`;
      two pieces joined; the list text `期刊分区 / 中科院 / JCR / 影响因子`, which keeps its whole text;
      a piece that only repeats the name, which keeps the whole text; and a text whose CJK share is just below 0.5,
      which is unchanged.
- [ ] AC2: `pnpm description-gaps <data file>` reads a `plugins.json` that the v1 schema accepts. It replaces each
      record's `overrides` with those of the checkout's `plugins/<id>/index.json`. A record with no checkout entry
      gets no overrides. The command checks each record that has an `upstream` block. It prints one line with the id,
      the case, and the shown text when the shown description is missing, has a CJK share of 0.5 or more, or has
      fewer than six words. The line names the first of these cases that applies, in that order. The command exits 0.
      It exits 1 with a message that names the cause for a file it cannot read, a file that is not JSON, and a file
      that the v1 schema refuses. `test/description-gaps.test.ts` covers each case line and each error. It also covers
      a record that a checkout override takes out of the list, a record with no checkout entry, and a CJK text of
      fewer than six words, which prints as CJK.
- [ ] AC3: DESIGN's Data sources item 3, README's override section, the About page's Overrides section, and the
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
- [ ] AC5: Each plugin that the ledger marks override has a `description` override with no `version` in
      `plugins/<id>/index.json`. Its `value` is English text of at least six words. The text is drawn from an upstream
      file, and translated by hand where that file is not in English, as the M055 overrides were. Its `reason` names
      that file. For each upstream description, the reason says which case it is, or that it is in English and not
      shown. `pnpm check` passes.
- [ ] AC6: Over the ledger's data file, `pnpm description-gaps` on the branch prints only plugins that the ledger
      marks kept. `pnpm test` and `pnpm check` pass.

## Coverage
<!-- owner: plan · create/amend-via-gate; each acceptance criterion → the
     task(s) satisfying it, by positional number (AC/Task counted
     top-to-bottom). Review reads to fence evidence — tracking-rules "AC fencing". -->

- AC1 → T1
- AC2 → T2
- AC3 → T6
- AC4 → T3
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
- [ ] T3: Run `pnpm description-gaps` over the shelf copy. Write `cairn/references/description-ledger.md` from the
      synthesis template, with an `INDEX.md` line, and read each listed plugin's README to set its disposition.
- [ ] T4: Overrides for the missing, CJK, and Portuguese rows, in the reason form of the M055 overrides.
- [ ] T5: Overrides for the short rows. Zotgit and ZotMoov share one text, and each gets its own override.
- [x] T6: Docs: DESIGN item 3 and the description paragraph, README, the About page, both schema prose spots, and
      CHANGELOG. Find split phrases with a joined copy, and keep added lines within 80 columns.
- [ ] T7: Run `pnpm description-gaps` over the shelf copy again and check its output against the ledger's kept
      rows. Then run `pnpm test` and `pnpm check`.

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

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive. -->
