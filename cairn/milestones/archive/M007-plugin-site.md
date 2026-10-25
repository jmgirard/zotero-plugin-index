# M007: Build the plugin site

**Status:** done (2026-10-25, PR #7 https://github.com/jmgirard/zotero-plugin-index/pull/7)

**Goal:** The Pages deploy carries a static Astro site with one page per plugin that first tells the visitor whether their Zotero version is inside the plugin's declared range.

**Outcome:** `astro` 7.4.2 (D-004). `pnpm site [--out <dir>]` (`src/site/site.ts`) builds `site/` in a temp dir
(Astro empties its `outDir`), replaces `index.html` and `plugins/` in `<out>` beside `v1/` and `schemas/`, refuses
a build that writes either, restores its env vars, and links under `/zotero-plugin-index/` from `site/src/base.ts`
(Vitest's `BASE_URL` env replaced `import.meta.env`). `src/site/version.ts`: `compareVersions` by MDN's legacy
(Toolkit) format (`cairn/references/mozilla-toolkit-version.md`), `usedOverride`, `appliedValue`, `declaredRange`,
`rangeResult`, `zoteroVersion` (reads pasted About Zotero text). Home table and plugin page: range first,
`data-fact` facts, "Used" override column, failure in place of the range. The inlined script keeps the field text
under `zotero-plugin-index:zotero-version` and refreshes on Back and `storage` events. `build.yml` runs `pnpm site`
after `pnpm build`, no `if:`; tsconfig includes `site/`. README, CHANGELOG, DESIGN.md. Live run 40244171547 on
main: home 200 with 14 rows, Better Notes page 200 with its range, data 14 records, 0 failures.

**Decisions:** none.

**Review:** Claim audits 66 then 78 claims (7, 3 corrected). One review return: pasted About Zotero text read as
version 0 ("older than the minimum"), fixed with `zoteroVersion`. Four-lens fan-out, two passes: 79 findings,
45 fixed, 2 follow-up (absorbed into "Count only build failures for deploys" and "Catch stray and unportable
entry files"), 32 rejected (5 edge). Hygiene: candidate "Publish the site and data on Pages" graduated; M004 row
pruned. CI passed. Lessons: 6 used, 3 new.
