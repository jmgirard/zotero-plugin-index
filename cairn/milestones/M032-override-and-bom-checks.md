# M032: Catch blank reasons, repeat overrides, and BOMs

- **Status:** planned
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — it changes what `pnpm check` refuses and prints for contributors' entries, and its docs
- **Branch/PR:** —

## Goal

`pnpm check` refuses an override reason of whitespace and format characters only and two overrides for one field and version, and it names a UTF-8 byte-order mark at the start of an entry file.

## Scope

**In:** a wider `reason-not-blank` rule with a new message, the new rule `unique-override`, the byte-order-mark message, and the docs.

**Out:** entry names and stray files → M031. Invisible characters outside `\s` and `\p{Cf}`, such as U+3164 or U+2800 → not covered. Other byte-order marks, such as UTF-16, keep the "is not valid JSON" message.

## Acceptance criteria

- [ ] AC1: The rule `reason-not-blank` reports each override reason of length 1 or more whose every character matches `/[\s\p{Cf}]/u`. That class holds whitespace and the Unicode format characters, such as U+200B, U+200D, U+2060, and U+00AD. The message says that the reason holds only whitespace or format characters. In `test/check.test.ts`, a reason of only U+200B is reported, and so is a reason of U+200D and a space. The reason `"ok​"`, written with that escape in the test source, is not reported.
- [ ] AC2: The rule `unique-override` reports each override in one `index.json` whose `field` and `version` equal those of an earlier override in the same file. An absent `version` equals only another absent `version`, and versions match exactly. The finding names its own index and the index of the first earlier override with that field and version. In `test/check.test.ts`, two `name` overrides with no `version` give one finding. Three such overrides give two findings, each naming index 0. A `name` override with no `version` beside one at `1.0` gives none. `name` at `1.0` beside `name` at `1.0.0` gives none. `name` at `1.0` beside `description` at `1.0` gives none.
- [ ] AC3: When `meta.json` or `index.json` starts with U+FEFF after a UTF-8 read, `pnpm check` reports that the file starts with a UTF-8 byte-order mark. The finding uses that file's schema rule, `registry-schema` or `index-schema`, in place of "is not valid JSON". The check gives no other finding for that file and exits 1. In `test/check.test.ts`, one case puts the mark before valid JSON in `meta.json` and one in `index.json`, and each shows the message as that file's only finding. A third case has U+FEFF inside a JSON string value, not at the start, and gets no byte-order-mark message.
- [ ] AC4: README "Checking entries" states the `reason-not-blank` change, the rule `unique-override`, and the byte-order-mark message. CHANGELOG's Unreleased section has an entry for the change.
- [ ] AC5: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1
- AC2 → T2
- AC3 → T3
- AC4 → T4
- AC5 → T5

## Tasks

- [ ] T1: In `checkEntry` (`src/check/check.ts:103`), replace the `/\S/` test with one for a character outside `[\s\p{Cf}]` (the `u` flag), and change the message. Add the AC1 cases to `test/check.test.ts`. These cases spawn no pnpm, so run them with `./node_modules/.bin/vitest run test/check.test.ts` while working (LESSONS M027).
- [ ] T2: Add `unique-override` to `Rule` and check `overrides` pairs in `checkEntry`, keyed by `field` and `version`, with an absent `version` as its own key. Add the AC2 cases.
- [ ] T3: In `readJson` (`src/check/check.ts:137`), test for a leading U+FEFF before `JSON.parse` and return a byte-order-mark error that `checkEntry` reports under the file's schema rule. Leave the build's own read (`src/build/build.ts:208`) as it is, since `pnpm check` runs before the build. Add the AC3 cases.
- [ ] T4: Update README "Checking entries" and CHANGELOG Unreleased. Search a joined copy of README for each phrase (LESSONS M018).
- [ ] T5: Run `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check` (LESSONS M001). Plant each changed rule's defect from a copy of the file and restore from the copy (LESSONS M010).

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

## Decisions

## Review
