# M034: Skip translations under half done

- **Status:** in-progress
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — it changes the `languages` list in the published data file and the languages the site shows
- **Branch/PR:** m034-half-done-translations

## Goal

The `languages` list leaves out a tag whose locale folders hold fewer than half as many messages as the plugin's fullest tag, so ZotMoov 1.2.34, whose `zh-CN` folder holds 8 messages beside 82 in `en-US`, no longer lists `zh-CN`.

## Scope

**In:** a message count for each tag in `localeLanguages` (`src/upstream/reader.ts`), the half rule, its tests, and the docs and schema description that state it.

**Out:** the page and menu labels → M033. Folders that copy another folder's text → candidate row "Drop locale folders that copy another" (parked). The extra inflate work of reading every file of a tag → candidate row "Bound per-entry work in the locale walk". `languages` override values → not filtered, as now.

## Acceptance criteria

- [ ] AC1: `localeLanguages` counts the messages of each tag left after the `LANGUAGE_TAG` and English-name checks. A tag's count sums its files under `locale/<tag>/` and `chrome/locale/<tag>/`. The count adds one for each Fluent message or term line in an `.ftl` file. It adds one for each `.properties` line that is not blank and not a `#` or `!` comment. It adds one for each `<!ENTITY` outside comments in a `.dtd` file. Except as AC2 states, the list keeps a tag when its count is at least 1 and 2 × its count is at least the largest count among the XPI's tags. The reader's languages table in `test/upstream.test.ts` has these cases. `en-US` with 10 messages and `zh-CN` with 4 give `["en-US"]`. `zh-CN` with 5 gives `["en-US", "zh-CN"]`. `en-US` with 9 and `zh-CN` with 4 give `["en-US"]`. A `.properties` folder with comment lines mixed in is counted without them. A `.dtd` folder with several entities, one of them inside a comment, is counted without that one. A tag split over `locale/` and `chrome/locale/` is kept only by its summed count. A tag with an `.ftl` and a `.dtd` file is counted over both.
- [ ] AC2: A tag that has a file of another type, a file that the reader does not inflate, or a file whose inflate fails or whose output length differs from its declared size is kept whatever its count, as before M034. Such a file adds nothing to any count. The tag's other files still add to its count and to the largest count. In `test/upstream.test.ts`, a table keeps such a tag for a file of another type, a file over 1 MiB, and a file whose inflate fails, each beside `en-US` with 10 messages, and each with 0 counted messages and with 1. A case where `en-US` has a 100-line `.json` file and 1 `.ftl` message, `fr` has 4 messages, and `de` has 1 gives `["en-US", "fr"]`.
- [ ] AC3: Six texts state the half rule and that a listed language can still be incomplete: README's "Using the data" languages text, the CHANGELOG Unreleased languages entry, the `languages` description in `schemas/plugins.v1.schema.json`, and in DESIGN.md the facts paragraph, data-sources item 2, and the reader paragraph.
- [ ] AC4: The branch's reader gives ZotMoov's release 1.2.34 XPI the `languages` `["en-US", "sr-Latn-RS"]`.
- [ ] AC5: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1, T2
- AC2 → T3
- AC3 → T4
- AC4 → T5
- AC5 → T6

## Tasks

- [x] T1: Add the AC1 cases to the languages table (`test/upstream.test.ts:193`) and see them fail. This file spawns no pnpm, so run it with `./node_modules/.bin/vitest run test/upstream.test.ts` while working (LESSONS M027).
- [x] T2: In `localeLanguages` (`src/upstream/reader.ts:553`), replace `holdsMessage` with a function that counts messages by the same file-type rules. Read every locale file of a tag, not only up to its first message, inside the same 8 MiB budget and 1 KiB pushes (LESSONS M027). Keep the AC2 tags apart, then apply the half rule. Update the function comments. Where the rule changes an existing case's expected list, update the case and name it in the work log.
- [x] T3: Add the AC2 table with `editHeader` (`test/upstream.test.ts:199`) and the `.json` case. See each fail on a planted defect.
- [x] T4: Update the six AC3 texts. Search joined copies for each phrase (LESSONS M018).
- [x] T5: Download ZotMoov's 1.2.34 XPI from its GitHub release into its own empty directory and run the branch's reader on it. Then run `pnpm build` on the branch with a GitHub token (`gh auth token`), compare every record's `languages` with the published data of 2026-10-28, and log each difference in the work log.
- [ ] T6: Run `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check` (LESSONS M001). Plant each counting rule's defect from a copy of the file and restore from the copy (LESSONS M010).

## Work log

- 2026-10-28: created by /milestone-plan.
- 2026-10-28: tier check: milestone — it changes what the reader records in the published data, a change to running code that is not a bug.
- 2026-10-28: idea vet: one concern, shared with M033. The lists are mostly true translations. Of the 22 multi-language XPIs read on 2026-10-28, only ZotMoov's `zh-CN` (8 of 82 messages) falls under half. Answer: build the half rule, with the relabel in M033.
- 2026-10-28: lessons used: 2026-10-27 (M027) fflate push bound, 2026-10-27 (M027) direct Vitest run, 2026-10-26 (M018), 2026-10-25 (M001), 2026-10-26 (M010).
- 2026-10-28: question set: scope — relabel and drop thin translations, as two milestones. Cut — at least half, which in the 22 XPIs read drops ZotMoov's `zh-CN` only; three quarters would also drop Hermes' `zh-CN` and Zotero OCR's `fr-FR`.
- 2026-10-28: collision: extends done M023, M025, and M027 (the locale walk). Parked row "Drop locale folders that copy another" stays parked, since a count does not detect copied text. Row "Bound per-entry work in the locale walk" stays; this milestone reads more files of each tag inside the same budget. No D-entry covers the languages rule; D-006 and D-007 cover the v1 shape, which stays the same.
- 2026-10-28: plan gate chose a message count against the fullest tag over a match of message keys against `en-US`, because some plugins have no `en-US` folder and key names differ across file types; falsified by a listed plugin whose folder has many messages that translate none of the fullest tag's keys.
- 2026-10-28: criteria audit (full): goal compares tags, not folders; AC1 states the rule as 2 × count ≥ largest, names which tags count, adds an odd case, and adds `.properties`, `.dtd`, split-folder, and mixed-type cases; AC2 covers three triggers with 0 and 1 counted messages and a `.json` case showing such files add nothing; AC3 adds DESIGN's facts paragraph and keeps "can still be incomplete" in place of removing it; AC4 pins release 1.2.34 and states the rule for another release. AC5 had no finding.
- 2026-10-28: criteria re-audit (full) on the final wording: all fixes landed; AC4 depended on the release a build reads, so it now binds the reader's result on the 1.2.34 XPI, and T5 keeps the whole-build comparison as a task.
- 2026-10-28: implement started on branch m034-half-done-translations, cut from main at d0a4e52.
- 2026-10-28: T1: added 7 AC1 cases to the languages table; on main the two drop cases (10 and 4, 9 and 4) failed and the five keep cases passed.
- 2026-10-28: T2: `holdsMessage` became `MESSAGE_COUNTERS`, a map from extension to a counting function, and `localeLanguages` sums counts per tag and applies the half rule; all 245 reader tests pass, and no existing case's expected list changed.
- 2026-10-28: T2 choice: a file of another type is no longer inflated, since nothing reads its text, so it charges nothing to the 8 MiB budget; before, it was inflated and charged.
- 2026-10-28: T3: added the AC2 table (6 cases) and the `.json` case; dropping the keep for another type, for an uninflated file, or for a failed inflate, or adding 100 to the count for another type, each failed its cases; 252 reader tests pass.
- 2026-10-28: T4: updated the six AC3 texts. A joined-copy search for "holding a message" and "holds a message" found four more stale texts, also updated: README's limits list, the CHANGELOG limits entry, DESIGN's size-limits paragraph, and two reader.ts comments. The simple-english hook's remaining hits (README lines 98 and 434, CHANGELOG line 172) are older text this milestone does not touch. `pnpm test` 853 passed, 1 skipped; `pnpm check` 37 entries, 0 problems.
- 2026-10-28: T5: downloaded `zotmoov-1.2.34-fx.xpi` (58,914 bytes, the size GitHub lists) from the 1.2.34 release; `readUpstream` on the branch, served that file for the XPI request, gave version 1.2.34 and `languages` `["en-US", "sr-Latn-RS"]`. Its folders: `en-US/zotmoov.ftl` 5,461 bytes, `sr-Latn-RS` 5,854, `zh-CN` 569.
- 2026-10-28: T5: `pnpm build` on the branch with a GitHub token wrote 37 records, 0 failed reads. Against the published `v1/plugins.json` (generatedAt 2026-10-27T23:27:21Z), one record differs: ZotMoov 1.2.34, `["en-US", "sr-Latn-RS", "zh-CN"]` → `["en-US", "sr-Latn-RS"]`. The other 36 records have the same version and `languages`.

## Decisions

## Review
