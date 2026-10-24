# M001: Define the plugin entry format and checker

- **Status:** planned
- **Priority:** high
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the entry files are the format contributors and the bot write
- **Branch/PR:** —

## Goal

Each plugin entry is a registry-valid `meta.json` beside an index-only `index.json`, and one command checks every entry.

## Scope

**In:** the TypeScript project scaffold (pnpm, TypeScript, Ajv, Vitest; D-001); the entry layout
`plugins/<id>/meta.json` plus `plugins/<id>/index.json` (D-002); a JSON Schema for `index.json` at
`schemas/index.v1.schema.json`, schema version 1, holding a `schemaVersion` field and an `overrides` list whose
items name the field, the new value, and a reason; the `pnpm check` command; a CI workflow that runs the tests and
the check on every push and pull request; `CHANGELOG.md`; a README section on the entry format; the `verify` and
`changelog` slots of `cairn/PROFILE.md`.

**Out:** reading upstream facts and drafting entries → M002. The published data file, which shows overrides beside
the upstream facts → M003.
The site, the discovery bot, and user reports → candidate rows in `cairn/ROADMAP.md`.

## Acceptance criteria

- [ ] AC1: `pnpm check` checks each directory directly under the `plugins/` directory it is given by these rules:
      both `meta.json` and `index.json` exist; `meta.json` is valid against the registry's
      `shared/schemas/meta.schema.json` at the zotero-plugin-registry commit pinned in the code; `index.json` is
      valid against `schemas/index.v1.schema.json`, which requires each override's `reason` with `minLength: 1`
      and limits its `field` to the upstream-fact keys the schema lists; the `id` in `meta.json` equals the
      directory name; each override's `reason` holds a character other than whitespace (a rule in code). A Vitest
      test per rule runs the check on a fixture tree whose one bad entry breaks only that rule, and asserts a
      non-zero exit and output naming that entry's directory and that rule; the whitespace rule has two such
      tests, with reasons `" "` and `" \t\n"`.
- [ ] AC2: A Vitest test runs `pnpm check` on a fixture tree of at least two valid entries and asserts exit 0. A
      second test plants in `meta.json` a field the registry schema does not define and asserts the failure names
      the registry-schema rule. A third and fourth run it on an empty directory and on a missing path, and assert
      exit 0 with zero entries checked.
- [ ] AC3: `.github/workflows/ci.yml` runs on `push` and `pull_request`, installs with `pnpm install
      --frozen-lockfile`, and runs `pnpm test` and `pnpm check`. The run for the latest push to the milestone
      branch at review time is green (`gh run list --branch <branch>`).
- [ ] AC4: `README.md` describes the two entry files. Each `index.json` field it names is a property of
      `schemas/index.v1.schema.json`, checked by reading both files.
- [ ] AC5: `CHANGELOG.md` exists with an entry for the entry format and `pnpm check`, and `pnpm test` and
      `pnpm check` both pass on the branch.

## Coverage

- AC1 → T2, T3
- AC2 → T3
- AC3 → T4
- AC4 → T5
- AC5 → T5

## Tasks

- [ ] T1: Scaffold the project: `package.json` with a `packageManager` pnpm pin, a committed `pnpm-lock.yaml`,
      `tsconfig.json`, Vitest config, `.gitignore` entries for `node_modules/` and `dist/`. Done when the `verify`
      slot of `cairn/PROFILE.md` names `pnpm test` and `pnpm check` and the `changelog` slot names `CHANGELOG.md`.
      pnpm is not installed locally, so run it as `npx pnpm@<pin>`.
- [ ] T2: Write `schemas/index.v1.schema.json` and the checker in `src/check/`. Pin the schema from
      zotero-plugin-dev/zotero-plugin-registry by commit SHA `a06373e072f01d83f3b5f6e304b20824ee878460`
      (fetched 2026-10-24; the repo is archived), download it once into a gitignored
      cache, and fail with a named error when it cannot be read. The registry repo has no license, so the schema is
      read, not copied into this repo.
- [ ] T3: Write the fixture trees under `test/fixtures/` and the Vitest tests for AC1 and AC2, tests first.
- [ ] T4: Add `.github/workflows/ci.yml` (pnpm/action-setup, Node LTS, frozen lockfile, test, check).
- [ ] T5: Write the README entry-format section and the `CHANGELOG.md` entry.

## Work log

- 2026-10-24: created by /milestone-plan.
- 2026-10-24: tier check: not run — work named at the question set.
- 2026-10-24: idea vet: one concern, the registry schema rejects unknown fields so index fields cannot go in meta.json — question set chose a sibling `index.json` (D-002); the source `manifest.json` in plugin repos holds template placeholders, decided by the agent for M002 (read it from the XPI).
- 2026-10-24: lessons used: none.
- 2026-10-24: question set: which dependencies may the plan add — pnpm, TypeScript, Ajv, Vitest, fflate; GitHub calls by plain fetch (D-001).
- 2026-10-24: question set: may the plan add GitHub Actions workflows — yes, a CI check on push and pull request, and a daily build kept as a workflow artifact (M003).
- 2026-10-24: collision check: ROADMAP, archive, and DECISIONS.md hold no overlap; the parked headless-load candidate stays distinct. Inbox sweep: 0 open issues, 0 open PRs.
- 2026-10-24: plan gate chose reading the registry schema at a pinned commit over copying it into the repo because the registry repo has no license; falsified by the registry adding a license that permits copying, or by the pinned file becoming unreachable.
- 2026-10-24: split: the data pipeline is three milestones, M001 (format and checker), M002 (upstream reader, depends on M001), M003 (published data, depends on M002); site, discovery bot, and user reports become candidate rows.
- 2026-10-24: plan checkpoint: M001 to M003 committed before the criteria audit returned; the audit's dispositions land in the next plan commit, and implement does not start before it.
- 2026-10-24: criteria audit (full mode, fresh Opus reader): 7 findings, all fixed — AC1 adds a both-files rule, puts `minLength: 1` in the schema and the whitespace rule in code with two probes, limits override `field` to upstream-fact keys; AC2 adds empty and missing `plugins/` cases; AC3 names the latest push at review time; the PROFILE `verify` clause moved from AC5 to T1 (instrument); T1 adds the lockfile; the Out item says M003 shows overrides beside upstream facts.

## Decisions

## Review
