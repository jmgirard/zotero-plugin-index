# M003: Build the published plugin data

- **Status:** in-progress
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

- [ ] AC1: On a fixture tree of entries with recorded upstream responses, `pnpm build` writes
      `dist/v1/plugins.json`, the file is valid against `schemas/plugins.v1.schema.json`, and its record ids equal
      the set of entry directory names in the fixture tree. A Vitest test asserts all three.
- [ ] AC2: When the fixture tree holds one entry whose upstream read fails, `pnpm build` exits 0, writes a record
      for every entry, and the failing entry's record carries the reader's failure name. A second fixture whose
      fetch throws an unexpected error gives the same result with the failure name `unexpected-error`. A Vitest
      test asserts each case.
- [ ] AC3: For a fixture entry with an override, the record's overrides block holds the override's field, value,
      and reason, and its upstream block holds the upstream value unchanged. A Vitest test asserts both values.
- [ ] AC4: `.github/workflows/build.yml` declares a `schedule` trigger that runs once a day and a
      `workflow_dispatch` trigger, runs `pnpm build` with the workflow's `GITHUB_TOKEN`, and uploads `dist/` with
      `actions/upload-artifact`, checked by reading the file.
- [ ] AC5: `pnpm build` run locally against GitHub over the committed `plugins/` tree, with a token set, exits 0
      and writes a file valid against `schemas/plugins.v1.schema.json` in which at least five records carry
      upstream facts and no failure name.
- [ ] AC6: `CHANGELOG.md` has an entry for `pnpm build` and the data file, the README names the file's path and
      schema version, and `pnpm test` and `pnpm check` pass on the branch.

## Coverage

- AC1 → T1, T2
- AC2 → T1, T2
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

## Decisions

## Review
