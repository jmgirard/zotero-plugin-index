# M055: Show English descriptions where upstream has them

**Status:** done (2026-10-29, PR #109 https://github.com/jmgirard/zotero-plugin-index/pull/109)

**Goal:** Each plugin shows an English description when its XPI, its GitHub repo, or an index override has one.

**Outcome:** `localized` in `src/upstream/reader.ts` resolves `__MSG_` names and descriptions from `_locales/en/`,
`en_US/`, `en_GB/` before the default locale; `englishMessages` skips an English file the reader refuses (size,
duplicate, bad zip) or that is not a JSON object. New optional `upstream.repoDescription` (GitHub About text,
trimmed; schema `pattern: "\\S"`, v1 kept). `shownDescription` in `src/site/description.ts`: applying override,
else the manifest text when its `cjkShare` is below 0.5, else the GitHub text when the manifest one is dropped or
has a higher share, else the manifest text; `cjkShare` is CJK characters over those plus runs of other letters;
both candidates pass the M015 name-only rule. Plugin page Details lists "Manifest description" and "GitHub
description"; About page gains a Descriptions section. Eight `description` overrides with no `version` (AI4Paper,
BibTeX Clean, Jasminum, LitFinch, Papilot, Zotero OCR, Zotero AI Sidebar, Ethereal Style). Doc2X's name now reads
"doc2x-ai-translate". README, CHANGELOG, DESIGN, and both schemas' prose updated. A live build on 2026-10-29 left
none of 58 plugins with a missing or mostly-CJK description.

**Decisions:** D-030, D-031, D-032 (English description overrides and their cases). Milestone-local: none.

**Review:** Plan criteria audit (10 findings) and re-audit (9), all taken; AC6 re-audited twice at implement; claim
audit 110 read, 6 corrected. One defect return (AC5: three docs missed override-first), one AC6 wording
amendment. Pass 2 four-lens fan-out, 26 findings: 16 fixed (README `repoDescription`, duplicate-file and 0.5-boundary
tests, stale DESIGN/schema/README/About text), 4 follow-up (new row "Close gaps in the description pick"; one into
"Let old v1 schemas accept new fields"), 8 rejected (1 edge). CI passed. Lessons: 8 marked used, none captured.
