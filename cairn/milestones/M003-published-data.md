# M003: Build the published plugin data

- **Status:** review
- **Priority:** high
- **Depends on:** M002
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the output file is the public data API DESIGN.md describes
- **Branch/PR:** m003-published-data

## Goal

`pnpm build` turns every entry and its upstream facts into one versioned JSON file, rebuilt daily by a workflow.

## Scope

**In:** the `pnpm build` command, which reads every entry under `plugins/`, runs the M002 reader on each, and
writes `dist/v1/plugins.json`; a JSON Schema for that file at `schemas/plugins.v1.schema.json`, with a
`schemaVersion` of 1, a `generatedAt` time, and one record per entry; each record keeps its upstream facts and its
overrides (with their reasons) in separate blocks, and carries the failure name when the reader fails; the
`.github/workflows/build.yml` workflow, on a daily schedule and on manual dispatch, which runs the build and keeps
`dist/` as a workflow artifact.

**Out:** publishing the file at a stable URL on GitHub Pages → the site candidate row. User reports in the
records → the user-reports candidate row. Keeping the last good facts when a read fails → not in this scope; the
record carries the failure.

## Acceptance criteria

- [x] AC1: On a fixture tree of entries with recorded upstream responses, `pnpm build` writes
      `dist/v1/plugins.json`, the file is valid against `schemas/plugins.v1.schema.json`, and its record ids equal
      the set of entry directory names in the fixture tree. A Vitest test asserts all three.
- [x] AC2: When the fixture tree holds one entry whose upstream read fails, `pnpm build` exits 0, writes a record
      for every entry, and the failing entry's record carries the reader's failure name. A second fixture, in which
      the reader throws an `Error` instead of returning a failure name for one entry, gives the same result with
      the failure name `unexpected-error` for that entry. A Vitest test asserts each case.
- [x] AC3: For a fixture entry with an override, the record's overrides block holds the override's field, value,
      and reason, and its upstream block holds the upstream value unchanged. A Vitest test asserts both values.
- [x] AC4: `.github/workflows/build.yml` declares a `schedule` trigger that runs once a day and a
      `workflow_dispatch` trigger, runs `pnpm build` with the workflow's `GITHUB_TOKEN`, and uploads `dist/` with
      `actions/upload-artifact`, checked by reading the file.
- [x] AC5: `pnpm build` run locally against GitHub over the committed `plugins/` tree, with a token set, exits 0
      and writes a file valid against `schemas/plugins.v1.schema.json` in which at least five records carry
      upstream facts and no failure name.
- [x] AC6: `CHANGELOG.md` has an entry for `pnpm build` and the data file, the README names the file's path and
      schema version, and `pnpm test` and `pnpm check` pass on the branch.

## Coverage

- AC1 → T1, T2, T6
- AC2 → T1, T2, T6
- AC3 → T1, T2
- AC4 → T3
- AC5 → T4
- AC6 → T5

## Tasks

- [x] T1: Write `schemas/plugins.v1.schema.json` and the fixture tree with recorded responses: passing entries,
      one failing entry, one entry with an override. Write the tests for AC1 to AC3 first.
- [x] T2: Write `pnpm build` in `src/build/`: read entries, run the reader on each, keep upstream and override
      blocks apart, validate the output against its schema before writing.
- [x] T3: Add `.github/workflows/build.yml` (daily `schedule`, `workflow_dispatch`, `pnpm build`,
      `actions/upload-artifact` for `dist/`).
- [x] T4: Run `pnpm build` locally with a token over the committed entries; record the result in the work log.
- [x] T5: README and `CHANGELOG.md` entries.
- [x] T6: (review return 1) Make the fixture build test write the default `dist/v1/plugins.json`, putting back a file
      already there, and make the failing-entry test assert a record for every entry.

## Work log

- 2026-10-24: created by /milestone-plan.
- 2026-10-24: tier check: not run — work named at the question set.
- 2026-10-24: idea vet: found no concern beyond the M001 registry-schema one, which the question set settled (D-002).
- 2026-10-24: lessons used: none.
- 2026-10-24: question set: may the plan add GitHub Actions workflows — yes, including a daily scheduled build kept as a workflow artifact.
- 2026-10-24: criteria audit (full mode, fresh Opus reader): 3 findings, all fixed — AC2 adds an unexpected-throw fixture; AC5 requires at least five records with facts and no failure name; the override `field` limit to upstream-fact keys went into the M001 schema rule, and the M001 Out item now says M003 shows overrides beside upstream facts.
- 2026-10-24: plan gate chose keeping `dist/` as a workflow artifact over publishing it to GitHub Pages now because the question set put publishing at a later site milestone; falsified by a consumer that needs the stable URL before a site exists.
- 2026-10-25: status in-progress; branch m003-published-data cut from origin/main at 32bef16.
- 2026-10-25: choice: a record is `id`, `repoUrl` (from meta.json), then `upstream` (the reader's facts, its own key names) or `failure` (`name`, `message`), then `overrides` (index.json items unchanged); the schema says `strict_*_version` overrides correct `strictMinVersion`/`strictMaxVersion`.
- 2026-10-25: choice: the output schema is self-contained (no `$ref` to the index schema), so a consumer needs one file; a drift fails the build's own output check.
- 2026-10-25: choice: an entry the build cannot read (bad JSON, no repoUrl, index.json off its schema) or an empty entry tree stops `pnpm build` with exit 1 and no file, before any upstream read; reads run one plugin at a time.
- 2026-10-25: choice: CLI is `pnpm build [<dir>] [--out <dir>]` (defaults `plugins`, `dist`), the `pnpm check` and `pnpm add-plugin` argument style; `listEntries` is now exported from src/check/check.ts and shared.
- 2026-10-25: choice: the unexpected-error fixture answers with an object that throws on any read (`unexpected` in test/support/fixture-fetch.ts), since the reader turns every fetch rejection into `request-failed`.
- 2026-10-25: T1, T2 done: schemas/plugins.v1.schema.json, fixture tree test/fixtures/build/, test/build.test.ts (11 tests), src/build/; a planted no-catch defect turned 4 build tests red; pnpm test 84 passed, pnpm check 14 entries clean.
- 2026-10-25: T3 done: .github/workflows/build.yml runs daily at 06:17 UTC and on workflow_dispatch, `pnpm build` with `secrets.GITHUB_TOKEN`, then actions/upload-artifact@v7 (newest release, read 2026-10-25) uploads `dist/` as `plugins-data`; YAML parsed with Ruby.
- 2026-10-25: T4 done: `pnpm build` live with the gh token over plugins/ exited 0, "wrote 14 records to dist/v1/plugins.json, 0 with a failed upstream read"; Ajv found the file valid; 14 records carry upstream facts and no failure (generatedAt 2026-10-25T19:03:51.410Z).
- 2026-10-25: T5 done: README "Building the data" section (path, schemaVersion 1, failure block, exit codes, workflow artifact) and a CHANGELOG Unreleased entry; DESIGN.md Function Families and Architecture name src/build/ and build.yml; pnpm test 84 passed, pnpm check clean.
- 2026-10-25: claim audit: 80 claims read, 5 corrected — schemas/plugins.v1.schema.json (3), src/build/build.ts, test/build.test.ts; also a stale comment in test/support/preload-fixture.ts; the same reader re-read all 6 as true.
- 2026-10-25: status review; pnpm test 84 passed, pnpm check 14 entries clean.
- 2026-10-25: review return 1: AC1 — the fixture test runs `pnpm build --out <temp>`, so no Vitest test asserts the file at `dist/v1/plugins.json` (the README's default path is untested too); AC2 first case — the exit-0 and failure-name test does not itself assert a record for every entry.
- 2026-10-25: amendment routed: AC2 — a fetch that throws gives `request-failed`, because the reader catches every fetch rejection, so "a fixture whose fetch throws" cannot give `unexpected-error`; the case needs an error the reader does not name.
- 2026-10-25: status in-progress for review return 1 and the AC2 amendment.
- 2026-10-25: T6 added (minor amendment) and done: the fixture run writes the default dist/ and puts back an existing dist/v1/plugins.json (same SHA-1 before and after); the failing-entry test asserts the record id set; pnpm test 84 passed, pnpm check clean.
- 2026-10-25: re-audit: AC2 (full) — 8 findings: proposed wording widened to every unnamed error and was false for some (fixed: one fixture whose reader throws an `Error`); misplaced modifier (fixed); injected entry read last (test now plants it on the first entry read; a planted stop-after-error defect turned it red); non-Error branch untested (declined, outside AC2); instrument-only reachability (already logged); schema-invalid facts stop the build (candidate row "Keep bad facts from failing the build"); README lacked unexpected-error (fixed).
- 2026-10-25: re-audit: AC2 (full) — second reader on the fixed wording: it holds the old promise, no widening; 4 low findings answered without a wording change (throwing-entry position, since requiring it would widen; "the reader throws" where readUpstream passes the error on; "a second fixture" for one changed response; README covers non-Error throws, untested).
- 2026-10-25: amendment return: AC2 — "A second fixture, in which the reader throws an `Error` instead of returning a failure name for one entry, gives the same result with the failure name `unexpected-error` for that entry."
- 2026-10-25: claim audit: 9 claims read, 0 corrected — README.md, test/build.test.ts (lines added since 667a5ab, return 1).
- 2026-10-25: status review; pnpm test 84 passed, pnpm check 14 entries clean.

## Decisions

- 2026-10-25 (review): the v1 schema keeps `additionalProperties: false` on the file, each record, and the
  upstream block. A v1 file never changes shape, so adding a field to the published data means `plugins.v2`.
  The strict schema also lets the build's own output check catch drift between the reader's facts and the
  schema. Falsified by a consumer that needs a field added within v1.

## Review

Pass 2, 2026-10-25, head c302885 (origin/main 32bef16 is an ancestor; no sync needed).

- AC1: `vitest run test/build.test.ts` — "writes dist/v1/plugins.json by default, valid against its schema, with one record per entry" passed; it runs `pnpm build <tree>` with no `--out`, reads `dist/v1/plugins.json`, validates it with Ajv against the schema, and compares the record ids to `readdirSync` of the 3-entry tree.
- AC2: same run — "exits 0, writes every record, and gives the failing entry the reader's failure name" passed (status 0, all 3 ids, `forked-plugin` failure `fork`); "names an error the reader does not expect unexpected-error and goes on" passed (status 0, all 3 ids, Knowledge4Zotero failure `{unexpected-error, planted reader error}`, the two entries read after it carry upstream facts and `fork`).
- AC3: same run — "keeps an override apart from the upstream value it corrects" passed: overrides equal `[{strict_max_version, 9.*, reason}]` and `upstream.strictMaxVersion` is the recorded `10.99.99`.
- AC4: read .github/workflows/build.yml — `schedule` cron `17 6 * * *` (once a day), `workflow_dispatch`, step `run: pnpm build` with `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}`, then `actions/upload-artifact@v7` with `path: dist/`.
- AC5: live `pnpm build --out <scratch>` with the gh token over plugins/ exited 0 ("wrote 14 records … 0 with a failed upstream read"); Ajv: valid; 14 records carry upstream facts and no failure (at least 5 required).
- AC6: CHANGELOG.md:16 Unreleased entry for `pnpm build` and `dist/v1/plugins.json`; README.md:97 names `dist/v1/plugins.json` and `schemaVersion` `1`; `pnpm test` 84 passed (5 files); `pnpm check` 14 entries, 0 problems.
- Consistency gate: `cairn_validate.py` all checks passed; no principle changed (cairn_impact skipped); the generic profile names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: facts that fail the schema after a successful read stop the whole build — fix now (per-record check, failure `facts-invalid`; test planted red), fixed e79cdb2
- diff-bug #2: the fixture test's dist/ backup lives in memory and is taken at load time — fix now (on-disk copy in beforeAll, a created dist/ or dist/v1 removed), fixed e79cdb2
- diff-bug #3: the daily job exits 0 when every read fails or rate limits bite — follow-up, row "Warn when the daily build degrades"
- diff-bug #4: hung hosts can push the job past 30 minutes and lose the artifact — follow-up, row "Warn when the daily build degrades"
- diff-bug #5: the build skips `pnpm check`'s blank-reason rule — fix now (build.yml runs `pnpm check` first), fixed e79cdb2
- diff-bug #6: the whole-file check names an array index, not a plugin — reject (edge: after diff-bug #1 only a bug in the build's own code reaches it; effect is an error message)
- diff-bug #7: the README's exit-1 sentence names only an unreadable entry — fix now (README lists each case), fixed e79cdb2
- diff-bug #8: `additionalProperties: false` makes any added fact a breaking change — fix now (choice recorded in Decisions: a v1 file never changes shape), fixed e79cdb2
- diff-bug #9: a non-ENOENT readdir error escapes as a stack trace — fix now (caught as a problem; test added), fixed e79cdb2
- diff-bug #10: the write is not atomic — fix now (temporary file and rename; test added), fixed e79cdb2
- diff-bug #11: `generatedAt` is the start time — fix now (schema says "when the build started"), fixed e79cdb2
- diff-bug #12: a stale file survives a failed build — fix now (README says the earlier file stays), fixed e79cdb2
- diff-bug #13: two tests pin Ajv's English wording — fix now (assert the path prefix only), fixed e79cdb2
- diff-bug #14: the id-set check repeats across two tests on one run — reject (planned change: AC2 asks its own test to assert a record for every entry, added at review return 1)
- diff-bug #15: a weaker `fork` check after an exact one — reject (false: it runs on a different build, where it is the only check of that record)
- diff-bug #16: "read after the error" rests on an unasserted sort order — fix now (asserts the first record is Knowledge4Zotero), fixed e79cdb2
- diff-bug #17: `stderr` must be exactly empty — reject (edge: only an environment that prints warnings under `pnpm --silent` reaches it; effect is a test error; add-plugin tests assert the same)
- diff-bug #18: beforeAll runs a blocking build under the 10 s hook timeout — fix now (60 s hook timeout), fixed e79cdb2
- diff-bug #19: test paths resolve against cwd — fix now (resolved against ROOT), fixed e79cdb2
- diff-bug #20: readJson and describe copy check.ts helpers — reject (style: the shapes differ and nothing is wrong)
- diff-bug #21: the schema `$id` is not a fetchable URL — follow-up, row "Publish the site and data on Pages" (sets `$id` to published URLs)
- blame-history #1: one bad facts read stops the build, against the Known issues line — fix now (as diff-bug #1), fixed e79cdb2
- blame-history #2: `unexpected-error` changes M002's let-bugs-surface contract — reject (planned change: AC2 calls for it)
- blame-history #3: the build publishes entries `pnpm check` rejects — fix now (build.yml runs `pnpm check` first), fixed e79cdb2
- blame-history #4: DESIGN.md's "public API at a stable URL" has no URL yet — follow-up, row "Publish the site and data on Pages"
- blame-history #5: an empty tree exits 1 where `pnpm check` exits 0 — reject (planned change: recorded implementation choice; an empty build has no data to publish)
- blame-history #6: the 50 s spawn timeout is below a cold pnpm start — reject (edge: only a cold `npx` start over 50 s reaches it, which CI's installed pnpm does not; effect is a test error)
- prior-review #1: the daily job now runs the reader that M002 said to cap before a scheduled bot — follow-up, row "Limit what the reader downloads" raised to high, noting the daily build
- prior-review #2: facts that fail the schema stop the build — fix now (as diff-bug #1), fixed e79cdb2
- prior-review #3: the build skips stray files under plugins/ like `pnpm check` — follow-up, row "Catch stray and unportable entry files" (unchanged)
- prior-review #4: a UTF-8 BOM reads as "not valid JSON" in the build too — follow-up, row "Catch stray and unportable entry files" (unchanged)
- prior-review #5: zero-width-only reasons pass into the data — follow-up, row "Catch stray and unportable entry files" (unchanged; the daily job now runs `pnpm check`)
- prior-review #6: the new `$id` is not the Pages URL — follow-up, row "Publish the site and data on Pages"
- prior-review #7: the daily data carries zotmoov's prerelease facts — follow-up, row "Read stable releases before prereleases"
- prior-review #8: writeData leaves a half-written file on failure — fix now (as diff-bug #10), fixed e79cdb2
- prior-review #9: test paths resolve against cwd — fix now (as diff-bug #19), fixed e79cdb2
- prior-review #10: the build takes ids from directory names with no portability check — follow-up, row "Catch stray and unportable entry files" (unchanged)
- ripple #1: DESIGN.md Known issues says one bad plugin must not stop the run — fix now (diff-bug #1 fix and a note on what still stops the build), fixed e79cdb2
- ripple #2: DESIGN.md says the data is at a stable URL — follow-up, row "Publish the site and data on Pages"
- ripple #3: README says the `Failure` type lists each failure name — fix now (Building the data names `unexpected-error` and `facts-invalid`), fixed e79cdb2
- ripple #4: README exit-1 cases incomplete — fix now (as diff-bug #7), fixed e79cdb2
- ripple #5: LESSONS.md names only the check and add-plugin tests as spawning pnpm — fix now (names the build tests), fixed e79cdb2
- ripple #6: the vitest.config.ts timeout comment names only check and add-plugin tests — fix now, fixed e79cdb2
- ripple #7: DESIGN.md names only test/fixtures/upstream/ — fix now (adds test/fixtures/build/), fixed e79cdb2
- ripple #8: DESIGN.md's rate-limit line says hundreds of repos — reject (false: it states the expected scale, not today's count)
- ripple #9: README's id rule is not enforced by the daily job — fix now (build.yml runs `pnpm check` first), fixed e79cdb2
- ripple #10: DESIGN.md says the data schema uses TypeScript — reject (false: the schema is JSON Schema checked with Ajv, as D-001 chose; the sentence is about the code)
- ripple #11: reader.ts's Failure comment omits `unexpected-error` — reject (false: the comment covers the reader's own failures; the build's names live in build.ts and the schema)
- ripple #12: the milestone title says "published" — reject (planned change: the plan's title)
- ripple #13: PROFILE.md's verify slot omits `pnpm build` — reject (false: the build tests run inside `pnpm test`)
- After the fixes: `pnpm test` 87 passed (5 files), `pnpm check` 14 entries clean, the live dist/v1/plugins.json SHA-1 unchanged by the test run, `cairn_validate.py` all checks passed.
