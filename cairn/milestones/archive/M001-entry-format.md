# M001: Define the plugin entry format and checker

**Status:** done (2026-10-25, PR #1 https://github.com/jmgirard/zotero-plugin-index/pull/1)

**Goal:** Each plugin entry is a registry-valid `meta.json` beside an index-only `index.json`, and one command checks every entry.

**Outcome:** Entries are `plugins/<id>/meta.json` plus `plugins/<id>/index.json` (D-002). `schemas/index.v1.schema.json`
(schema version 1) holds `schemaVersion` and `overrides` items with `field` (name, description, homepage,
strict_min_version, strict_max_version), optional `version`, `value`, and `reason`. `pnpm check [dir]` (`src/check/`)
applies five rules: files-present, registry-schema, index-schema, id-matches-directory, reason-not-blank. It reads the
zotero-plugin-registry schema at commit a06373e, checks it against a pinned SHA-256, and caches it in `.cache/`. A
relative `dir` resolves against `INIT_CWD`, and dot-directories are skipped. CI (`.github/workflows/ci.yml`) runs
`pnpm test` (tsc, then Vitest, 20 tests) and `pnpm check` on push and pull request. README, CHANGELOG, and the PROFILE
`verify`, `changelog`, and release-walk slots were written. Toolchain: D-001, plus @types/node (D-003).

**Decisions:** none milestone-local; D-003 promoted.

**Review:** Full four-lens fan-out, two passes. Pass 1 sent the milestone back once: AC2 said the tests run
`pnpm check`, and they ran `node src/check/cli.ts` (fixed in T6). Across both passes: 21 findings fixed on the branch,
16 rejected (3 edge: early Node 24, a root that is a file, twice), 5 sent to candidate rows. The rows are "Catch stray
and unportable entry files" (stray files, unportable names, zero-width reasons, BOM, duplicate overrides) and the
schema `$id` URLs, added to "Publish the site and data on Pages". Claim audits read 41 and 57 claims and corrected
1 and 2. AC3: push run 40180312462 on 154b496 succeeded. Lessons captured: 2.
