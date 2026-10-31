# M065: Drop the repeated owner from the repo line

**Status:** done (2026-10-31, PR #348 https://github.com/jmgirard/zotero-plugin-index/pull/348)

**Goal:** Each plugin page's repo line reads "By <owner> · <repo>", not "By <owner> · <owner>/<repo>".

**Outcome:** The plugin page's `data-repo-name` link text is `github.repo` alone (`site/src/pages/plugins/[id]/index.astro`); the owner link (`data-repo-owner`, to `https://github.com/<owner>`), the repo link's href, and M064's star count are unchanged. `test/site.test.ts`'s head test and the five repo line rows expect the bare repo name. README, DESIGN.md, and the M061 CHANGELOG entry (Unreleased) give "By <owner> · <repo>", for example "By windingwind · zotero-better-notes · ★ 8,400". The question set chose "By owner · repo" over "By owner" alone and "owner/repo" alone, and kept the browser's normal wrapping for long names; at 375 px the Abbreviation Helper line now fits on one row.

**Decisions:** none.

**Review:** Criteria audit (full, run after the question set since the line's form was its open choice) 2 findings, both taken; claim audit 14 claims, 0 corrected. Four-lens fan-out, 10 findings: 1 fixed in 2bc3375 (part (8) of "Close small gaps on the site pages" now says a `.git` URL shows "b.git"), 9 rejected (3 planned change: the bare repo link lacks the owner out of context; 6 false). No return. CI passed. 7 lessons marked used M065; none captured. M062 row pruned for the ROADMAP byte budget.
