# M067: Fill the description gaps

**Status:** done (2026-10-31, PR #350 https://github.com/jmgirard/zotero-plugin-index/pull/350)

**Goal:** Each plugin in the deployed data of 2026-10-31 shows an English description of at least six words, from the author's text where it has one and from an index override where it has none.

**Outcome:** `latinPart` in `src/site/description.ts` gives a manifest or GitHub text with a CJK share of
0.5 or more its Latin-script part (pieces cut at ` / ` and after `。`, all-Latin letters, at least three
words, joined with one space) before the name-only drop and the pick; 5 plugins changed. `pnpm
description-gaps <data file>` (`src/site/description-gaps.ts`, `gapOf`, `findGaps`, `gapLine`; CLI reads
`plugins/` from its own folder) lists missing, cjk, and short (under six words) gaps after the checkout's
overrides. 31 `description` overrides with no `version` (1 missing, 10 cjk, 17 short, 3 Portuguese), drawn
from READMEs; the gap list over the 2026-10-31 data is now empty. 9 category excludes in
`src/site/categories.ts` for wrong assignments the new texts caused. Ledger
`cairn/references/description-ledger.md`; shelf copy `plugins-data-2026-10-31.json`. README (new "Finding
description gaps"), About, DESIGN, both schemas, plugin page wording, CHANGELOG.

**Decisions:** D-038 (short-case overrides and the Latin-script part). Milestone-local: none.

**Review:** Plan criteria audit 11 findings and re-audit 5, all taken. Claim audits: 150 read, 5 corrected;
81 read, 2 corrected. Pass 1 four-lens fan-out, 30 findings: 16 fixed, 13 rejected, 1 follow-up (new parked
row "Refine the Latin part and short picks"); one floor return (AC4: ledger lacked shown text). Pass 2, 26
findings: 11 fixed, 14 rejected (1 edge: stale INIT_CWD under plain node), 1 noted. CI passed. Build data
started after merge. Lessons: 9 marked used, 1 captured (categories follow overrides), 1 evicted by rank
(2026-10-30 M057, hand-run workflow checks out the dispatch commit). M064 done row pruned at review.
