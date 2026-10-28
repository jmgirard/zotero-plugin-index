# M039: Cut the check output in bot pull requests

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the bot's pull request bodies and its answers on "Add a plugin" issues reach the maintainer and the people who open those issues
- **Branch/PR:** m039-cut-check-output

## Goal

A bot pull request body stays under GitHub's 65,536-character limit, because `body()` quotes at most the first 10,000 characters of the `pnpm check` output.

## Scope

**In:** cut the check output that `body()` in `src/discover/propose.ts` quotes, after `trimEnd()`, to its first 10,000 characters (Unicode code points), and add a line after the code block that says so. The daily discover run and the issue run both build their bodies with `body()`, so both get the cut. Tests in `test/propose.test.ts`. The `CHANGELOG.md` bot entry and the `README.md` passage on the pull request body.

**Out:** recording push or create refusals under the 30-day rule, for refusals that the cut does not remove, in a discover run or an issue run → the candidate row "Stop retrying a failing bot pull request", narrowed and parked at review. Printing the full check output in the job log → not planned; no one asked for it.

## Acceptance criteria

- [ ] AC1: When the `pnpm check` output, with trailing whitespace removed, is longer than 10,000 characters (Unicode code points), `body()` in `src/discover/propose.ts` quotes only its first 10,000 characters and adds a line after the code block saying that the output was cut to its first 10,000 characters. Tests in `test/propose.test.ts` assert the quoted text and the line for an output of 100,000 ASCII characters and for an output of 10,001 emoji, whose quoted text holds the first 10,000 emoji whole.
- [ ] AC2: When that output is at most 10,000 characters, `body()` quotes it as it does on main and adds no cut line. A test asserts this for an output of 10,000 characters followed by a newline.
- [ ] AC3: `body()` returns at most 65,536 UTF-16 code units for an entry whose `repoUrl` holds 300 characters and whose `version`, `strictMinVersion`, and `strictMaxVersion` each hold 500 backticks, with an issue number and a check output of 100,000 backticks. A test asserts it.
- [ ] AC4: The `CHANGELOG.md` entry on the bot's pull requests and the `README.md` passage on the pull request body each say that a `pnpm check` output over 10,000 characters is cut and that the body says so.
- [ ] AC5: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1, T2
- AC2 → T1, T2
- AC3 → T1, T2
- AC4 → T3
- AC5 → T2, T3

## Tasks

- [x] T1: In the `proposing pull requests` block of `test/propose.test.ts` (the `body(` tests near line 198), add the tests that AC1, AC2, and AC3 name, and see each fail on main for the reason it names. Build emoji with `String.fromCodePoint`, not a `\u` escape typed through the Edit tool.
- [x] T2: In `body()`, measure and cut `checked.output.trimEnd()` by code points to a `CHECK_OUTPUT_MAX` of 10,000, build the fence from the cut text, and add the cut line after the closing fence. Put a code comment beside the constant that gives the longest body the entry schema in `src/discover/handoff.ts` allows. Run `pnpm test` and `pnpm check`.
- [x] T3: Add the cut to the `## Unreleased` bot entry in `CHANGELOG.md` (the sentence on what each pull request body gives, near line 66) and to the `README.md` passage near line 377, wrapped near 76 columns. Run `pnpm test` and `pnpm check`.

## Work log

- 2026-10-28: created by /milestone-plan.
- 2026-10-28: tier check: milestone — it changes the bot's pull request body, which is running code, and the fix needed a choice of how to stop repeat failures.
- 2026-10-28: idea vet: the row's named cause, a body over GitHub's 65,536-character limit, can come only from the quoted check output, since the handoff's entry schema limits each other body value to 500 characters, and none of the last 7 discover runs failed; recording refusals needs a cache save from the write job and must leave 5xx, rate-limit, and network errors unrecorded — the question set chose to cut the check output and record nothing.
- 2026-10-28: question set: fix shape — cut the check output, record nothing; run — build and review in this session.
- 2026-10-28: plan gate chose cutting the check output over also saving 422 create refusals from the write job because the cut removes the only cause the body inputs allow, with no cache save from the job that can push; falsified by a run log that shows a push or create request refused, for a reason other than body length, for a repo that a later run proposes again.
- 2026-10-28: criteria audit (full mode, fresh Opus reader): no D-entry blocks a criterion. AC3 narrowed from a test property to a `body()` property on named inputs, and its "longest values the schema accepts" clause dropped, since Ajv counts code points and the claim had no procedure; AC1 now measures code points, so the cut line stays true and no surrogate pair splits; AC1's tests assert the cut line; AC2 measures after `trimEnd()` and its test ends with a newline; AC4 adds the README passage. The reader's arithmetic puts AC3's body near 35,800 units.
- 2026-10-28: collision: absorbs part of the candidate row "Stop retrying a failing bot pull request"; its rest stays in that row (Scope Out). D-005 and D-020 read; neither bears on the body.
- 2026-10-28: inbox sweep: 0 open issues; 1 open pull request, a discovery bot pull request (#57), with no overlap.
- 2026-10-28: lessons used: 2026-10-25 (M001), 2026-10-26 (M014), 2026-10-28 (M032), 2026-10-28 (M036), 2026-10-26 (M018).
- 2026-10-28: test scope: the three body cases that AC1 to AC3 name; no workflow or CLI test, since `body()` is the one function that builds both runs' bodies.
- 2026-10-28: T1: four body tests added; on main the 100,000-character and emoji tests fail on the missing cut text, the length test fails on its length (305,626 units), and the 10,000-character test passes, since it pins behavior the cut must keep (AC2).
- 2026-10-28: T2: `body()` cuts `checked.output.trimEnd()` by code points to `CHECK_OUTPUT_MAX` (exported), builds the fence from the cut text, and adds the cut line after the closing fence; the code comment names the test instead of stating byte figures. Measured 2026-10-28 with `node` on the branch: the AC3 inputs give 35,683 units, and 100,000 emoji in their place 25,687. `pnpm test` 888 passed, 1 skipped (the case-sensitive volume case); `pnpm check` 42 entries, 0 problems.
- 2026-10-28: T3: CHANGELOG bot entry and README body passage say that an output over 10,000 characters is cut and the body says so; no added line over 80 columns. `cairn/DESIGN.md` line 109 ("the result of `pnpm check` on the entry in its body") stays true and is left as is. The simple-english hook flagged CHANGELOG lines 174 and 269 and README lines 115 and 464, all outside this diff; left as is, since line 269 quotes program output and "validate against a schema" names the act. `pnpm test` 888 passed, 1 skipped; `pnpm check` 0 problems.
- 2026-10-28: claim audit: 16 claims read, 2 corrected — src/discover/propose.ts (the comment said the test builds "the longest such body", but a 300-emoji URL gives about 36,283 units, so now "near the longest"), test/propose.test.ts (two test names: "by code points, so no surrogate pair is split", and "long" in place of "the longest" handoff values); the reader's re-read found both true; "far below" kept, since a figure there would stand free of its procedure.
- 2026-10-28: status review; `pnpm test` 888 passed, 1 skipped; `pnpm check` 42 entries, 0 problems.

## Decisions

## Review
