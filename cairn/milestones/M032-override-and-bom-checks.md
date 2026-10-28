# M032: Catch blank reasons, repeat overrides, and BOMs

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — it changes what `pnpm check` refuses and prints for contributors' entries, and its docs
- **Branch/PR:** m032-override-and-bom-checks

## Goal

`pnpm check` refuses an override reason of whitespace and format characters only and two overrides for one field and version, and it names a UTF-8 byte-order mark at the start of an entry file.

## Scope

**In:** a wider `reason-not-blank` rule with a new message, the new rule `unique-override`, the byte-order-mark message, and the docs.

**Out:** entry names and stray files → M031. Invisible characters outside `\s` and `\p{Cf}`, such as U+3164 or U+2800 → not covered. Other byte-order marks, such as UTF-16, keep the "is not valid JSON" message.

## Acceptance criteria

- [x] AC1: The rule `reason-not-blank` reports each override reason of length 1 or more whose every character matches `/[\s\p{Cf}]/u`. That class holds whitespace and the Unicode format characters, such as U+200B, U+200D, U+2060, and U+00AD. The message says that the reason holds only whitespace or format characters. In `test/check.test.ts`, a reason of only U+200B is reported, and so is a reason of U+200D and a space. The reason `"ok\u200B"`, written with that escape in the test source, is not reported.
- [x] AC2: The rule `unique-override` reports each override in one `index.json` whose `field` and `version` equal those of an earlier override in the same file. An absent `version` equals only another absent `version`, and versions match exactly. The finding names its own index and the index of the first earlier override with that field and version. In `test/check.test.ts`, two `name` overrides with no `version` give one finding. Three such overrides give two findings, each naming index 0. A `name` override with no `version` beside one at `1.0` gives none. `name` at `1.0` beside `name` at `1.0.0` gives none. `name` at `1.0` beside `description` at `1.0` gives none.
- [x] AC3: When `meta.json` or `index.json` starts with U+FEFF after a UTF-8 read, `pnpm check` reports that the file starts with a UTF-8 byte-order mark. The finding uses that file's schema rule, `registry-schema` or `index-schema`, in place of "is not valid JSON". The check gives no other finding for that file and exits 1. In `test/check.test.ts`, one case puts the mark before valid JSON in `meta.json` and one in `index.json`, and each shows the message as that file's only finding. A third case has U+FEFF inside a JSON string value, not at the start, and gets no byte-order-mark message.
- [x] AC4: README "Checking entries" states the `reason-not-blank` change, the rule `unique-override`, and the byte-order-mark message. CHANGELOG's Unreleased section has an entry for the change.
- [x] AC5: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1, T6
- AC2 → T2
- AC3 → T3
- AC4 → T4
- AC5 → T5

## Tasks

- [x] T1: In `checkEntry` (`src/check/check.ts:103`), replace the `/\S/` test with one for a character outside `[\s\p{Cf}]` (the `u` flag), and change the message. Add the AC1 cases to `test/check.test.ts`. These cases spawn no pnpm, so run them with `./node_modules/.bin/vitest run test/check.test.ts` while working (LESSONS M027).
- [x] T2: Add `unique-override` to `Rule` and check `overrides` pairs in `checkEntry`, keyed by `field` and `version`, with an absent `version` as its own key. Add the AC2 cases.
- [x] T3: In `readJson` (`src/check/check.ts:137`), test for a leading U+FEFF before `JSON.parse` and return a byte-order-mark error that `checkEntry` reports under the file's schema rule. Leave the build's own read (`src/build/build.ts:208`) as it is, since `pnpm check` runs before the build. Add the AC3 cases.
- [x] T4: Update README "Checking entries" and CHANGELOG Unreleased. Search a joined copy of README for each phrase (LESSONS M018).
- [x] T5: Run `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check` (LESSONS M001). Plant each changed rule's defect from a copy of the file and restore from the copy (LESSONS M010).

- [x] T6: Review return 1. Write U+200B, U+200D, and U+FEFF as `\u` escapes in `test/check.test.ts` and `src/check/check.ts`. Quote `field` and `version` in the `unique-override` message with `JSON.stringify`. In "names the version it repeats", compare the whole findings list. Move the mark-inside-a-string case to `checkTree`. Update the first `pnpm check` bullet of CHANGELOG, README's "Two more rules" sentence, and DESIGN "Entry checks".

## Work log

- 2026-10-28: created by /milestone-plan.
- 2026-10-28: tier check: not run — work named at the question set.
- 2026-10-28: idea vet: none found. `usedOverride` (`src/site/version.ts:68`) takes the first of two overrides with one field and version, so the second one is silently unused, and refusing the repeat matches that.
- 2026-10-28: lessons used: 2026-10-25 (M001), 2026-10-27 (M027), 2026-10-26 (M018), 2026-10-26 (M010).
- 2026-10-28: question set: work — candidate row "Catch stray and unportable entry files". Breadth — all parts, split as needed. M032 takes the reason, repeat-override, and byte-order-mark parts.
- 2026-10-28: collision: candidate row "Catch stray and unportable entry files" absorbed by M031 and M032. Extends done M001 (check). No D-entry covers overrides' uniqueness or file encoding. Inbox: 0 open issues, and 5 open bot discovery PRs with no overlap.
- 2026-10-28: plan gate chose to refuse a byte-order mark with a named message over stripping it, because the build and the registry parse the raw file; falsified by a contributor editor that cannot save JSON without the mark.
- 2026-10-28: plan gate chose the bounded class `\s` and `\p{Cf}` over a hand list of invisible characters, because the class is a stated Unicode category; falsified by a blank reason in a real entry made of characters outside that class.
- 2026-10-28: criteria audit (full): narrowed the goal from invisible characters to whitespace and format characters and from any byte-order mark to UTF-8; stated the new `reason-not-blank` message and wrote the discrimination case as an escape (AC1); named the indexes for three or more repeats and added the `1.0` and `1.0.0` case (AC2); split AC3 into one case per file and added a mark that is not at the start. AC4 and AC5 had no finding.
- 2026-10-28: status in-progress; branch m032-override-and-bom-checks cut from origin/main at d475d29.
- 2026-10-28: chose to test AC1 and AC2 through `checkTree` with an empty registry schema (`compileValidators({})`), so the cases fetch nothing and spawn no pnpm; the task line numbers moved with M031 (the override loop is now near `check.ts:160`, `readJson` near `:198`).
- 2026-10-28: T1 done: `reason-not-blank` now reports a reason with no character outside `[\s\p{Cf}]`; the U+200B and U+200D-plus-space cases failed with no finding before the change. pnpm test 828 passed, 1 skipped; pnpm check 37 entries, 0 problems.
- 2026-10-28: T2 done: `unique-override` keys each override by `field` and `version` (absent as its own key), skips an override whose field is not a string or whose version is neither absent nor a string (left to the schema), and says `overrides[<i>] has the same field "<f>" and <no version | version "<v>"> as overrides[<first>]`; the three reporting cases failed before the rule. pnpm test 834 passed, 1 skipped; pnpm check 0 problems.
- 2026-10-28: T3 done: `readJson` returns `bom` for a file whose UTF-8 text starts with U+FEFF, and `checkEntry` reports `<file> starts with a UTF-8 byte-order mark (U+FEFF): save it as UTF-8 without one` under the file's schema rule; before the change both cases printed "is not valid JSON: Unexpected token". pnpm test 837 passed, 1 skipped; pnpm check 0 problems.
- 2026-10-28: T4 done: README "Checking entries" gains a paragraph on the two schema rules with the byte-order-mark line and a list of `reason-not-blank` and `unique-override`; the README `index.json` field list (the `reason` item, which said "other than whitespace") now names format characters and states the field-and-version rule; one CHANGELOG Unreleased entry. Joined-copy search finds each rule name and "byte-order mark" once in each file. The simple-english hook flags README lines 94 and 423 and CHANGELOG line 170, which this milestone does not touch.
- 2026-10-28: T5 done: five defects planted in a copy of `src/check/check.ts` and restored from the copy (cmp clean): the reason test back to `/\S/` (2 AC1 cases red), no `unique-override` finding (3 red), a key without version (2 pass cases red), a key without field (1 red), no byte-order-mark test (2 AC3 cases red). Then pnpm test 837 passed, 1 skipped, and pnpm check 37 entries, 0 problems.
- 2026-10-28: claim audit: 27 claims read, 5 corrected — README.md, CHANGELOG.md, src/check/check.ts. The reason "must hold a character" (not "contain text") other than whitespace and format characters; "Two more rules" (index-schema also checks overrides); "Most format characters" print nothing (U+0600 and U+00AD show a glyph); the site "never applies the repeat" in place of "applies only the first" (`usedOverride` prefers a versioned override and reads no `homepage`), in README, CHANGELOG, and the check.ts comment. The same Opus reader re-read the five once: all hold. pnpm test 837 passed, 1 skipped; pnpm check 0 problems.
- 2026-10-28: status review; handed to /milestone-review.
- 2026-10-28: review return 1: AC1 fails as written: `test/check.test.ts` holds raw U+200B and U+200D (and raw U+FEFF, as does `src/check/check.ts:225`) where AC1 asks for the escape in the test source. Fix with the return, as review fix-now items: quote `field` and `version` in `unique-override` messages with `JSON.stringify`; `toEqual` the whole list in "names the version it repeats"; move the mark-inside-a-string case to `checkTree`; CHANGELOG first `pnpm check` bullet ("contains text"); name `index-schema` in README's "Two more rules" sentence; add the new rules to DESIGN "Entry checks". Status in-progress.
- 2026-10-28: resumed by /milestone-implement for review return 1; added T6 (minor amendment) and mapped AC1 → T1, T6.
- 2026-10-28: the Edit tool writes a `\u` escape in new text as the raw character, so the escapes went in by a short Python replace, checked by a count (0 raw U+200B, U+200D, U+FEFF left; escapes at `check.ts:226` and `check.test.ts:177,279,286,290`).
- 2026-10-28: T6 done: escapes in place; `unique-override` quotes field and version with `JSON.stringify` (new test: a version "1\nok: forged" stays escaped on one line; planting the old unquoted form turned it red, restored from a copy); "names the version it repeats" compares the whole list; the mark-inside-a-string case calls `checkTree`; CHANGELOG first bullet, README "Besides `index-schema`, two rules", and DESIGN "Entry checks" updated. pnpm test 838 passed, 1 skipped; pnpm check 0 problems; cairn_validate passes.
- 2026-10-28: claim audit: 9 claims read, 1 corrected — CHANGELOG.md, README.md (T6 lines, 623fa44; a fresh Opus reader): "whitespace" now says "as JavaScript's `\s` defines it", since `\s` leaves out U+0085; the same reader re-read it once: holds.
- 2026-10-28: status review; handed to /milestone-review.

## Decisions

## Review

- AC1 (2026-10-28, branch at 86fa682): `check.ts` tests `!/[^\s\p{Cf}]/u` on a reason of length 1 or more; in `test/check.test.ts` "checkTree overrides", reasons U+200B and U+200D plus a space each give exactly one finding, `reason-not-blank` with message "overrides[0].reason holds only whitespace or format characters"; `"ok\u200B"` gives none. All pass; T5's plant of `/\S/` turned the two reporting cases red.
- AC2 (2026-10-28): `unique-override` keys by `JSON.stringify([field, version ?? null])`. Tests pass: two no-version `name` overrides give one finding, "overrides[1] has the same field "name" and no version as overrides[0]"; three give two, for indexes 1 and 2, each naming overrides[0]; a no-version `name` beside one at `1.0`, `1.0` beside `1.0.0`, and `name` beside `description` at `1.0` give none. T5's plants (no finding; key without version; key without field) each turned the matching cases red.
- AC3 (2026-10-28): the spawned `pnpm check` cases pass: a U+FEFF before valid JSON in `meta.json` gives exit 1 and one finding, `registry-schema`, whose line contains "meta.json starts with a UTF-8 byte-order mark"; the same for `index.json` under `index-schema`; a U+FEFF inside a reason string ("a\uFEFFb") exits 0 with no "byte-order mark" in the output. Before T3 both mark cases printed "is not valid JSON: Unexpected token"; T5's plant of the test turned them red.
- AC4 (2026-10-28): a joined copy of README's "Checking entries" section (up to "Building the data") holds `reason-not-blank`, "whitespace and Unicode format characters", `unique-override`, and "byte-order mark", each once; CHANGELOG `## Unreleased` holds one entry naming all three ("`reason-not-blank` refuses a reason that holds only whitespace and Unicode format characters", "`unique-override` refuses two overrides with the same `field` and `version`", the byte-order-mark line).
- AC5 (2026-10-28, 86fa682): `npx -y pnpm@12.15.0 test` (type check, then Vitest): 17 files, 837 passed, 1 skipped (the case-sensitivity test, skipped on this macOS volume); `npx -y pnpm@12.15.0 check`: 37 entries, 0 problems, exit 0.
- Gate (2026-10-28): `cairn_validate.py` exit 0, all checks passed (coverage complete PASS); no DESIGN principle changed, so `cairn_impact` skipped; generic profile names no toolchain checks. Default branch unmoved since the cut (origin/main d475d29).
- spawned: diff-bug, blame-history, prior-review, ripple
- AC1 evidence correction (2026-10-28): the AC1 line above is wrong on one clause. `test/check.test.ts:288,295` hold raw U+200B and U+200D, not escapes (the edit tool wrote the characters), so "written with that escape in the test source" fails; AC1 unticked. Raw U+FEFF also sits at `test/check.test.ts:177,185` and `src/check/check.ts:225`.
- diff-bug #1: test and check.ts write raw invisible characters, not escapes, against AC1; a dropped U+FEFF would make `startsWith("")` refuse every file — fix now (review return 1)
- diff-bug #2: `unique-override` also reports repeats of schema-refused strings (`version: ""` twice, `field: "Name"` twice) beside the schema lines — reject, edge: a schema-invalid override is outside documented use, and the effect is one extra true finding line
- diff-bug #3: `unique-override` messages insert `field` and `version` raw, so a repeated version holding a newline prints a forged finding line in CI and in a bot pull request body — fix now (quote with `JSON.stringify`); the same pattern in the older `id-matches-directory` message goes to follow-up row "Quote entry text in check messages"
- diff-bug #4: reasons of U+0000, U+3164, U+2800, or combining marks still pass — reject, planned change: Scope Out names characters outside `\s` and `\p{Cf}`
- diff-bug #5: a byte-order mark hides the file's other problems — reject, planned change: AC3 asks for the mark as the file's only finding
- diff-bug #6: `pnpm build` still says "is not valid JSON" and `indexed` in `src/discover/discover.ts` drops a marked meta.json's repo — reject, planned change: T3 leaves other readers alone, and `pnpm check` gates the default branch in CI
- diff-bug #7: "names the version it repeats" asserts only `findings[0].message` — fix now (`toEqual` on the whole list)
- diff-bug #8: the mark-inside-a-string test spawns pnpm where `checkTree` reaches the same `readJson` — fix now (move it to "checkTree overrides")
- blame-history #1: raw invisible characters against AC1 — fix now, same as diff-bug #1
- blame-history #2: CHANGELOG Unreleased's first `pnpm check` bullet still says "each override reason contains text" — fix now
- blame-history #3: visible format characters such as U+0600 are refused — reject, planned change: the plan gate chose the `\p{Cf}` class
- blame-history #4: a no-version override beside one at `1.0` is not flagged — reject, planned change: AC2 passes that case
- blame-history #5: DESIGN "Entry checks" omits the new rules — fix now
- blame-history #6: schema-refused fields also get a repeat line — reject, edge, same as diff-bug #2
- blame-history #7: refuse-over-strip and the `\p{Cf}` class have no D-entry — reject, planned change: both are milestone-local plan-gate choices recorded in the work log, not cross-cutting
- prior-review #1: README and check.ts keep "Most format characters print nothing" — reject, false: that is the claim audit's corrected wording
- prior-review #2: raw invisible characters against AC1 — fix now, same as diff-bug #1
- prior-review #3: "Two more rules" kept — reject, false: that is the corrected wording (ripple #3 fixes its placement)
- prior-review #4: ragged wrap in the new README and CHANGELOG lines — reject, style
- ripple #1: the "Catch stray and unportable entry files" candidate row still states the three gaps — reject, planned change: post-merge hygiene graduates the row
- ripple #2: CHANGELOG first `pnpm check` bullet says "contains text" — fix now, same as blame-history #2
- ripple #3: "Two more rules" can read as more name rules — fix now (name `index-schema` in the sentence)
- ripple #4: `pnpm build` prints the old message for a mark — reject, planned change, same as diff-bug #6
- ripple #5: the schemas' `reason` descriptions omit the blank rule — reject, false: the schema states no rule this diff changed
- ripple #6: DESIGN "Entry checks" omits the new rules — fix now, same as blame-history #5
- Fix-now items above, fixed 623fa44 (T6); the whitespace gloss from T6's claim audit, 318c86e.
- Pass 2 (2026-10-28, branch at 318c86e, origin/main unmoved at d475d29):
- AC1 (pass 2): `test/check.test.ts:279` is `test.each(["\u200B", "\u200D "])` and `:286` is `reason: "ok\u200B"`, escapes in the source (a Python count finds 0 raw U+200B, U+200D, or U+FEFF in the test file and `check.ts`); both reporting cases give exactly the one `reason-not-blank` finding with the stated message, and "ok\u200B" gives none. All pass.
- AC2 (pass 2): the five AC2 cases pass with whole-list `toEqual`: one finding for two no-version `name` overrides, two naming overrides[0] for three, none for each of the three passing pairs; the messages are unchanged for `"name"` and `"1.0"` under `JSON.stringify`.
- AC3 (pass 2): the two spawned mark cases pass (exit 1, one finding under `registry-schema` and `index-schema`, line names the mark); the mark-inside-a-string case now calls `checkTree` and gets no finding.
- AC4 (pass 2): README "Checking entries" still names `reason-not-blank`, `unique-override`, and the byte-order mark (now "Besides `index-schema`, two rules" and the `\s` gloss); the CHANGELOG Unreleased entry is unchanged in substance.
- AC5 (pass 2): pnpm test 17 files, 838 passed, 1 skipped; pnpm check 37 entries, 0 problems, exit 0.
- Gate (pass 2): `cairn_validate.py` all checks passed; no principle changed; generic profile adds no checks.
