# M015: Show version pills and descriptions

**Status:** done (2026-10-26, PR #21 https://github.com/jmgirard/zotero-plugin-index/pull/21)

**Goal:** Each plugin's row and page show what the plugin does and which Zotero major versions it declares, with no version to type.

**Outcome:** `ZOTERO_MAJORS` (7 to 10) and `majorSupport` in `src/site/version.ts`: all, some, or none of Zotero N,
counting N as N.0 to N.9, so `10.99.99` reads as all of 10 and a minimum of `8.999` as none of 8; an inverted range
is none; no bound or a failure gives no pills. `shownDescription` in `src/site/description.ts` hides a blank or
name-only manifest description (NFC words of Unicode letters, marks, and digits, filler words left out, a subset of
the shown name's words); an applying `description` override always shows. `site/src/components/Support.astro` draws
the pills (visible `N ✓|◐|–`, `title`, visually hidden text, `role="list"`) or "Not read" / "No declared range". Home
page is a card list; plugin page shows name ("(archived)" when archived), description, pills, range, repository and
releases links, then a closed `<details>` with the id, facts, and overrides. Version field, page script,
`zoteroVersion`, `rangeResult`, and `rangeFields` removed. Global styles with a dark scheme. README, CHANGELOG,
DESIGN, and the version-format note updated. Data and schemas unchanged.

**Decisions:** D-009 (the pages carry no script, annotating D-004). Milestone-local: none.

**Review:** Two criteria audits at plan (11 and 9 findings, all taken); claim audit 28 read, 3 corrected. One
four-lens pass, 26 findings: 17 fixed (accent normalization, escaped test expectations, archived mark on the page,
touch-screen note, screen-reader list roles, CSS, stale docs), 9 rejected (planned changes, style, false), none
edge, no follow-up rows. No returns, no amendments. CI passed. Lessons: 4 marked used, 1 corrected in place, 1
retired (Astro `outDir`: DESIGN's Architecture owns it), 1 captured.
