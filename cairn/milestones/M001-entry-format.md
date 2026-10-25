# M001: Define the plugin entry format and checker

- **Status:** review
- **Priority:** high
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the entry files are the format contributors and the bot write
- **Branch/PR:** m001-entry-format

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

- [x] AC1: `pnpm check` checks each directory directly under the `plugins/` directory it is given by these rules:
      both `meta.json` and `index.json` exist; `meta.json` is valid against the registry's
      `shared/schemas/meta.schema.json` at the zotero-plugin-registry commit pinned in the code; `index.json` is
      valid against `schemas/index.v1.schema.json`, which requires each override's `reason` with `minLength: 1`
      and limits its `field` to the upstream-fact keys the schema lists; the `id` in `meta.json` equals the
      directory name; each override's `reason` holds a character other than whitespace (a rule in code). A Vitest
      test per rule runs the check on a fixture tree whose one bad entry breaks only that rule, and asserts a
      non-zero exit and output naming that entry's directory and that rule; the whitespace rule has two such
      tests, with reasons `" "` and `" \t\n"`.
- [x] AC2: A Vitest test runs `pnpm check` on a fixture tree of at least two valid entries and asserts exit 0. A
      second test plants in `meta.json` a field the registry schema does not define and asserts the failure names
      the registry-schema rule. A third and fourth run it on an empty directory and on a missing path, and assert
      exit 0 with zero entries checked.
- [ ] AC3: `.github/workflows/ci.yml` runs on `push` and `pull_request`, installs with `pnpm install
      --frozen-lockfile`, and runs `pnpm test` and `pnpm check`. The run for the latest push to the milestone
      branch at review time is green (`gh run list --branch <branch>`).
- [x] AC4: `README.md` describes the two entry files. Each `index.json` field it names is a property of
      `schemas/index.v1.schema.json`, checked by reading both files.
- [x] AC5: `CHANGELOG.md` exists with an entry for the entry format and `pnpm check`, and `pnpm test` and
      `pnpm check` both pass on the branch.

## Coverage

- AC1 → T2, T3, T6
- AC2 → T3, T6
- AC3 → T4
- AC4 → T5
- AC5 → T5

## Tasks

- [x] T1: Scaffold the project: `package.json` with a `packageManager` pnpm pin, a committed `pnpm-lock.yaml`,
      `tsconfig.json`, Vitest config, `.gitignore` entries for `node_modules/` and `dist/`. Done when the `verify`
      slot of `cairn/PROFILE.md` names `pnpm test` and `pnpm check` and the `changelog` slot names `CHANGELOG.md`.
      pnpm is not installed locally, so run it as `npx pnpm@<pin>`.
- [x] T2: Write `schemas/index.v1.schema.json` and the checker in `src/check/`. Pin the schema from
      zotero-plugin-dev/zotero-plugin-registry by commit SHA `a06373e072f01d83f3b5f6e304b20824ee878460`
      (fetched 2026-10-24; the repo is archived), download it once into a gitignored
      cache, and fail with a named error when it cannot be read. The registry repo has no license, so the schema is
      read, not copied into this repo.
- [x] T3: Write the fixture trees under `test/fixtures/` and the Vitest tests for AC1 and AC2, tests first.
- [x] T4: Add `.github/workflows/ci.yml` (pnpm/action-setup, Node LTS, frozen lockfile, test, check).
- [x] T5: Write the README entry-format section and the `CHANGELOG.md` entry.
- [x] T6: Review return 1: make `pnpm check [dir]` take a directory and have the tests run `pnpm check`; pin a
      SHA-256 of the registry schema; report per-entry read errors as findings; set `process.exitCode`; add
      tests for schema-unavailable, invalid JSON, and a missing `meta.json`; `minLength: 1` on override
      `value`; CI `timeout-minutes` and a fetch timeout.

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
- 2026-10-24: started implement on branch m001-entry-format; status in-progress.
- 2026-10-24: question set (implement stop): may the plan add @types/node, which the plan's set did not name — yes (D-003).
- 2026-10-24: T1 done: pnpm 12.15.0, TypeScript 7.0.2, Vitest 5.0.5, @types/node 24.19.2, Ajv 8.20.0; `pnpm test` runs `tsc --noEmit` then Vitest; scripts run TypeScript through Node's built-in type stripping, so no tsx; no `license` field, since the repo has no license yet.
- 2026-10-24: T2 done: rules `files-present`, `registry-schema`, `index-schema`, `id-matches-directory`, `reason-not-blank`; override `field` limited to name, description, homepage, strict_min_version, strict_max_version, plus an optional `version` the override applies to; registry schema cached in gitignored `.cache/`; Ajv given the registry's `markdownDescription` keyword.
- 2026-10-24: T3 done: committed valid tree `test/fixtures/check/valid` (2 entries); each bad case is a temp copy of it with one change, built in the test, in place of one committed tree per case; 10 tests pass; a planted defect (the whitespace rule matching only spaces) turned the `" \t\n"` test red, then was reverted.
- 2026-10-24: T4 done: `.github/workflows/ci.yml` with checkout v7, pnpm/action-setup v6 (reads `packageManager`), setup-node v7 on Node 24, frozen install, `pnpm test`, `pnpm check`; no local YAML or actionlint tool, so the first run is the check; the branch is not pushed at implement, because the rulebook pushes it at review, and AC3's evidence comes from that run.
- 2026-10-24: T5 done: `README.md` (entry files, every `index.json` field, `pnpm check` and `pnpm test`) and `CHANGELOG.md` with an `## Unreleased` entry; claims written against `src/check/` and `schemas/index.v1.schema.json` read this session.
- 2026-10-24: claim audit: 41 claims read, 1 corrected — test/check.test.ts (the `describe` label named `pnpm check`, but the tests run `node src/check/cli.ts <root>`); also reworded the cache comment in src/check/registry-schema.ts ("download it again" on a first run).
- 2026-10-24: all tasks done, `pnpm test` (10 passed) and `pnpm check` clean; status review.
- 2026-10-24: review return 1: AC2 fails as written, because the tests spawn `node src/check/cli.ts` and never run `pnpm check`, and the `check` script hard-codes `plugins`; fix: make `pnpm check [dir]` take a directory and have the tests run it. Same return carries the fix-now findings: diff-bug #1 and #3 (hash-pin the registry schema), #2 (per-entry read errors as findings), #4 (`process.exitCode`), #7 (tests for schema-unavailable, invalid JSON, missing meta.json), #9 (`value` minLength 1), #14 (CI `timeout-minutes`, fetch timeout).
- 2026-10-24: implement resumed for review return 1; added T6 (minor amendment) and mapped AC1 and AC2 to it in Coverage.
- 2026-10-25: T6 done: `check` script is `node src/check/cli.ts` (root defaults to `plugins`), and the tests spawn `pnpm --silent check <root>` through `npm_execpath`, which pnpm sets; registry schema SHA-256 `6decb4ca…d551` pinned and checked on cache and download; stat and read errors become `files-present` findings; CLI sets `process.exitCode`; override `value` has `minLength: 1`; CI `timeout-minutes: 10`; fetch times out after 30 s; new tests for missing meta.json, unreadable meta.json, invalid JSON, download failure, and hash mismatch (15 pass); a planted defect (cache returned without the hash check) turned the hash test red, then was reverted.
- 2026-10-25: Vitest `testTimeout` set to 20 s, because one run with a slow `npx` start failed a test that the next four runs passed; the check tests start a pnpm process each.
- 2026-10-25: claim audit: 57 claims read, 2 corrected — README.md (the output also ends with a summary line, and exit 1 also covers an unloadable schema), src/check/registry-schema.ts (the cache comment also covers an unreadable cache).
- 2026-10-25: all tasks done, `pnpm test` (15 passed) and `pnpm check` clean; status review.

## Decisions

## Review

- 2026-10-24: route (d), no PR for the branch; branch level with origin/main at 392cf9c; Copilot round off (no header line).
- AC1: fresh run after `rm -rf .cache` (schema downloaded at pinned commit a06373e, `REGISTRY_COMMIT` in src/check/registry-schema.ts): `pnpm test` 10/10 passed, one test per rule — files-present, registry-schema, index-schema, id-matches-directory, reason-not-blank (two, `" "` and `" \t\n"`); each asserts exit 1 and only `first-plugin@example.org: <rule>` lines; schema has `reason.minLength` 1 and `field` enum name, description, homepage, strict_min_version, strict_max_version.
- AC2: same run — valid tree (2 entries) exit 0; planted `downloads` field fails with `registry-schema` and the "does not define" message; empty directory and missing path exit 0 with "checked 0 entries".
- AC4: node script over README.md's `index.json` section: fields named schemaVersion, overrides, field, version, value, reason; none missing from `schemas/index.v1.schema.json` properties.
- AC5: CHANGELOG.md has an `## Unreleased` entry for the entry format and `pnpm check`; `tsc --noEmit` clean, `pnpm test` 10 passed, `pnpm check` exit 0 (0 entries).
- AC3: pending — the branch is first pushed at step 8, and that push's CI run is the evidence; ticked only after it reads green, before the merge.
- spawned: diff-bug, blame-history, prior-review, ripple
- prior-review: no prior-review evidence (archive empty, PR comment probe returned none).
- blame-history #1: D-001 names fflate but package.json lacks it — reject (planned change: M002 adds fflate with the XPI reader, and D-001 names the toolchain, not a timing).
- blame-history #2: PROFILE.md title still reads "generic" with repo-specific slots — reject (false: the repo is still on the generic profile, whose template says to fill the `verify` slot).
- ripple #1: PROFILE.md release-walk still offers the "none" changelog branches and an undefined "dev heading" — fix now (names `CHANGELOG.md` and its `## Unreleased` heading).
- ripple #2: PROFILE.md intro says a repo replaces the `verify` placeholder, which the diff already did — fix now (states the repo's filled slots).
- ripple #3: PROFILE.md title and generic defaults read as stale with a package.json present — reject (false: package.json is not a profile marker in cairn's inference list, so generic is the active profile).
- diff-bug #1: the cached registry schema is trusted with no content check, so a cache holding `{}` passes any meta.json with exit 0 — fix now (pin a SHA-256 of the schema file in code; check both the cached and the downloaded copy; mismatch gives the named error).
- diff-bug #2: a broken symlink or a `meta.json` directory under `plugins/` crashes the run with a stack trace and names no entry — fix now (report the read error as a finding on that entry).
- diff-bug #3: a cached file that is not a usable schema throws a raw Ajv error in place of the named error — fix now (covered by the #1 hash check).
- diff-bug #4: `exit()` right after `console.log` can cut piped output on macOS, losing lines and the summary — fix now (set `process.exitCode`).
- diff-bug #5: a stray file such as `plugins/foo@x.json` is skipped and the run exits 0 — follow-up (candidate row "Catch stray and unportable entry files").
- diff-bug #6: directory names are not checked for portability (`:`, case collisions, `/` in an id) — follow-up (same row).
- diff-bug #7: the schema-unavailable path, the invalid-JSON branch, and a missing `meta.json` have no tests — fix now (one test each).
- diff-bug #8: `engines` allows early Node 24 releases that may print a type-stripping warning and fail the clean-stderr test — reject (edge: a Node 24 release before the current 24.x, outside CI's and common use; the effect is a test failure, an error).
- diff-bug #9: an override `value` can be `""`, which would blank a fact in M003 — fix now (`minLength: 1` on `value`).
- diff-bug #10: the blank-reason rule passes a zero-width space, and a UTF-8 BOM gives a confusing "not valid JSON" message — follow-up (same row; the AC1 rule is whitespace, so a stricter rule is new scope).
- diff-bug #11: AC1 and AC2 say the tests run `pnpm check`, but they spawn `node src/check/cli.ts`, and the `check` script hard-codes `plugins` — floor return (AC2 fails as written; see the review return line).
- diff-bug #12: the schema `$id` is not a resolvable URL for the public API — follow-up (absorbed into the candidate row "Publish the site and data on Pages").
- diff-bug #13: `vitest.config.ts` is outside the type check — reject (style: a config file with one call, no behavior).
- diff-bug #14: CI runs twice for same-repo PRs, has no `timeout-minutes`, and the schema fetch has no timeout — the double run is rejected (planned change: AC3 needs the push trigger, and the PR needs `pull_request`); the timeouts are fix now (`timeout-minutes: 10`, a 30-second fetch timeout).
- diff-bug (c): `test.each` over two whitespace reasons and the `updateUrl`-required test — reject (planned change: AC1 requires both probes and one test per rule).
- 2026-10-25, pass 2 (after review return 1): route (d); branch level with origin/main at 392cf9c; no PR.
- AC1 (pass 2): fresh run after `rm -rf .cache` at f601708: `pnpm test` 15/15; the check tests now spawn `pnpm --silent check <root>`; one test per rule still passes (files-present for missing meta.json, missing index.json, and unreadable meta.json; registry-schema; index-schema; id-matches-directory; reason-not-blank `" "` and `" \t\n"`), each asserting exit 1 and only that rule on `first-plugin@example.org`.
- AC2 (pass 2): same run — `pnpm check` on the valid tree exits 0 with 2 entries; the planted `downloads` field fails with `registry-schema`; an empty directory and a missing path exit 0 with 0 entries.
- AC4 (pass 2): README `index.json` fields schemaVersion, overrides, field, version, value, reason; none missing from the schema's properties.
- AC5 (pass 2): CHANGELOG.md entry present; `tsc --noEmit` clean, `pnpm test` 15 passed, `pnpm check` exit 0; `cairn_validate` all checks passed.
- AC3 (pass 2): still pending the step-8 push's CI run.
- spawned: diff-bug, blame-history, prior-review, ripple
- prior-review (pass 2): no prior-review evidence.
- ripple #1: DESIGN.md Function Families says "None yet: the repo has no source" — fix now (names the entry checks).
- ripple #2: DESIGN.md Architecture says the same — fix now (describes the project, entry layout, checker, and CI).
- ripple #3: DESIGN.md says the data schema uses TypeScript, but `schemas/index.v1.schema.json` is JSON Schema — reject (planned change: M001 Scope chose a JSON Schema file checked with Ajv, D-001; the convention covers the code).
- blame-history #1: a cached schema with a wrong hash is replaced by a new download, but the comment says a changed cache "is refused" and the test name says the same — fix now (comment and test name now say a changed cache is downloaded again and a changed download is refused; the earlier planted defect showed the test fails when the cache is used unchecked).
- blame-history #2: the cache comment omits the hash-mismatch case — fix now (now "Not cached, unreadable, or changed").
- blame-history #3: a non-ENOENT `readdir` error on the root, such as a root that is a file, crashes with a stack trace — reject (edge: a root path that is a file, outside documented use; the effect is an error).
- blame-history #4: stray non-directory files are skipped — reject (already settled as follow-up, candidate row "Catch stray and unportable entry files").
- blame-history #5: `runCheck` needs `npm_execpath`, so running Vitest directly throws — reject (planned change: review return 1 had the tests run `pnpm check`, and the error says to use `pnpm test`).
- blame-history #6: D-001 names fflate, which package.json lacks — reject (planned change, as in pass 1: M002 adds it).
- blame-history #7: CI runs twice for same-repo PRs — reject (planned change, as in pass 1).
