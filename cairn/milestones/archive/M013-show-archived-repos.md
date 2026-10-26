# M013: Show whether a plugin repo is archived

**Status:** done (2026-10-26, PR #19 https://github.com/jmgirard/zotero-plugin-index/pull/19)

**Goal:** Each plugin's published record, plugin page, and home-list row state whether GitHub marks its repo archived.

**Outcome:** Archived repos pass the inclusion bar. `readUpstream` copies the repo response's `archived` into
`UpstreamFacts` only when it is a boolean (`src/upstream/reader.ts`). `schemas/plugins.v1.schema.json` gains an
optional boolean `archived` in the `upstream` block; `schemaVersion` stays 1. The plugin page shows
`<dt>Archived on GitHub</dt><dd data-fact="archived">Yes|No</dd>` when the value is a boolean, and the home list
adds `<span data-archived>(archived)</span>` after the name link for `archived: true`. README.md, CHANGELOG.md, and
DESIGN.md state the policy and tell consumers who validate against a saved v1 schema to fetch it again. Live: run
40326984284 deployed 16 records, each with a boolean `archived`.

**Decisions:** D-006 (list archived repos with an archived fact; an optional field stays in v1), D-007 (D-006
replaces M003's milestone-local rule that adding a field means `plugins.v2`). Milestone-local: none.

**Review:** Criteria audit (full) 7 taken; claim audit 25 read, 3 corrected. One four-lens pass, 14 findings: 8 fixed,
6 rejected, none edge. The main fix: the plan's collision sweep missed M003's schema rule, now superseded by D-007.
New row "Let old v1 schemas accept new fields". No returns. CI passed. Lessons: 4 marked used, none captured.
