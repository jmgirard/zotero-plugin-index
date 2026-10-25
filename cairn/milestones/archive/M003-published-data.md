# M003: Build the published plugin data

**Status:** done (2026-10-25, PR #3 https://github.com/jmgirard/zotero-plugin-index/pull/3)

**Goal:** `pnpm build` turns every entry and its upstream facts into one versioned JSON file, rebuilt daily by a workflow.

**Outcome:** `pnpm build [<dir>] [--out <dir>]` (`src/build/`) lists entries with `listEntries` (now exported from
src/check/check.ts), runs `readUpstream` on each in turn, and writes `<out>/v1/plugins.json` (default `dist/`) via a
temp file and rename. `schemas/plugins.v1.schema.json`: `schemaVersion` 1, `generatedAt` (build start), records by
id with `id`, `repoUrl`, `upstream` or `failure` {name, message}, and index.json `overrides` unchanged. A reader
throw is `unexpected-error`, facts failing the record schema are `facts-invalid`, both exit 0; an invalid entry, an
empty tree, a failed file check, or a failed write exits 1 with no file. `.github/workflows/build.yml`: cron
`17 6 * * *` and dispatch, `pnpm check` then `pnpm build` with `GITHUB_TOKEN`, `upload-artifact@v7` keeps `dist/`
as `plugins-data`. Fixture tree test/fixtures/build/; fixture-fetch `unexpected` is a Proxy that throws on read.
Live run: 14 records with facts. README "Building the data", CHANGELOG entry.

**Decisions:** the v1 schema stays strict (`additionalProperties: false`); adding a field means `plugins.v2`.

**Review:** Pass 1 returned AC1 (test wrote under `--out`) and AC2 (case 1 lacked the id set) and routed an AC2
amendment: a throwing fetch gives `request-failed`, so the trigger became "the reader throws an `Error`" (two
re-audits; the first caught a widening). Pass 2 four-lens fan-out, 50 findings: 25 fixed (per-record
`facts-invalid`, `pnpm check` in the daily job, atomic write, readdir error, on-disk dist backup, hook timeout,
docs), 12 follow-up, 13 rejected (3 edge). New row "Warn when the daily build degrades"; "Limit what the reader
downloads" raised to high. Claim audits: 89 claims, 5 corrected. CI passed. Lessons: 4 used M003, 2 captured.
