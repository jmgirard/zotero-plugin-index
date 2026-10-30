# M061: Show the repo, owner, and stars on plugin pages

**Status:** done (2026-10-30, PR #343 https://github.com/jmgirard/zotero-plugin-index/pull/343)

**Goal:** Each plugin page names the GitHub repo and its owner under the plugin's name, with the repo's star count.

**Outcome:** `src/upstream/reader.ts` writes GitHub's `stargazers_count` as `upstream.stars` when it is an integer of at least 0; `schemas/plugins.v1.schema.json` defines `stars` as an optional integer, minimum 0. `site/src/data.ts` gains `githubRepo` (`^https://github\.com/([^/?#]+)/([^/?#]+?)/?$`) and `starsText` ("1 star", "1,234 stars" by `toLocaleString("en")`). The plugin page head (`site/src/pages/plugins/[id]/index.astro`) shows a `.repo-line` after the `h1` and before the description, "By <owner> · <owner>/<repo> · N stars", when the repo URL (`upstream.repoUrl`, else the entry's) matches and passes `safeHref`; owner links `https://github.com/<owner>`, the name links the repo. Site fixture: stars 1234, 1, 0; six failure records (`repo-path`, `repo-http`, `repo-gitlab`, `repo-query`, `repo-owner-query`, `repo-fragment`) each break one part of the URL form. README (plugin page paragraph, data section), DESIGN (facts list, plugin page paragraph), and one CHANGELOG entry, with the fetch-the-schema-again line. The question set chose the GitHub owner over the manifest `author` field and the plugin page only, with no home table column.

**Decisions:** none; works under D-006 and D-007.

**Review:** Criteria audit (full) 9 findings across M061 to M063, all taken. Claim audit 23 claims, 5 corrected; one substantive amendment narrowed AC1's pattern to refuse a query or fragment, re-audited (3 findings, wording unchanged). Four-lens fan-out, 22 findings: 12 fixed in ee264bf (fixture URLs moved to failure records, `repoHref` link, DESIGN wording, test cleanups, README wrap), 3 follow-ups as part (8) of "Close small gaps on the site pages", 7 rejected. No return. CI passed. 8 lessons marked used M061; 1 captured; evicted by rank 2026-10-28 (M038, used M053) on time-limit tests failing under load.
