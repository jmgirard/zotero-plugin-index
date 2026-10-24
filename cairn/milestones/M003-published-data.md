# M003: Build the published plugin data

- **Status:** planned
- **Priority:** high
- **Depends on:** M002
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the output file is the public data API DESIGN.md describes
- **Branch/PR:** —

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

- [ ] T1: Write `schemas/plugins.v1.schema.json` and the fixture tree with recorded responses: passing entries,
      one failing entry, one entry with an override. Write the tests for AC1 to AC3 first.
- [ ] T2: Write `pnpm build` in `src/build/`: read entries, run the reader on each, keep upstream and override
      blocks apart, validate the output against its schema before writing.
- [ ] T3: Add `.github/workflows/build.yml` (daily `schedule`, `workflow_dispatch`, `pnpm build`,
      `actions/upload-artifact` for `dist/`).
- [ ] T4: Run `pnpm build` locally with a token over the committed entries; record the result in the work log.
- [ ] T5: README and `CHANGELOG.md` entries.

## Work log

- 2026-10-24: created by /milestone-plan.
- 2026-10-24: tier check: not run — work named at the question set.
- 2026-10-24: idea vet: found no concern beyond the M001 registry-schema one, which the question set settled (D-002).
- 2026-10-24: lessons used: none.
- 2026-10-24: question set: may the plan add GitHub Actions workflows — yes, including a daily scheduled build kept as a workflow artifact.
- 2026-10-24: criteria audit (full mode, fresh Opus reader): 3 findings, all fixed — AC2 adds an unexpected-throw fixture; AC5 requires at least five records with facts and no failure name; the override `field` limit to upstream-fact keys went into the M001 schema rule, and the M001 Out item now says M003 shows overrides beside upstream facts.
- 2026-10-24: plan gate chose keeping `dist/` as a workflow artifact over publishing it to GitHub Pages now because the question set put publishing at a later site milestone; falsified by a consumer that needs the stable URL before a site exists.

## Decisions

## Review
