# M070: Find plugins in the zotero-chinese catalog

**Status:** done (2026-10-31, PR #354 https://github.com/jmgirard/zotero-plugin-index/pull/354)

**Goal:** `pnpm discover` also reads the repos that the zotero-chinese plugin catalog lists, so a Zotero 7+ plugin whose repo has neither topic can reach the index.

**Outcome:** `discover()` takes a `catalog` option, which `pnpm discover` sets to `CATALOG_URL` (the catalog's
`plugins.json` on `gh-pages`, read through the contents API by the new `githubClient().raw(url, max, ms)`, 60 s,
8 MiB). Each item's `repo` must match owner/repo (at most 10 bad items named). Names that a topic search
returned, an entry names (`in-index`), or the skip set names (`in-skip-set`) are not looked up; the rest go
to `lookUp`, one GraphQL request per 100 names sent as variables, for the current name, URL, and `pushedAt`.
A NOT_FOUND or null-`pushedAt` alias warns per repo; a failed request or `runMs` ends the lookups with one
warning. Candidates join by lowercase name, topic before catalog (`SOURCES`, `holds.ts`). The state keeps a
lowercase owner/repo record while the index lacks the repo and the run found it or it is under 30 days old,
in `Object.create(null)`. `source` rides on report items, `planned()`, and `entrySchema`; `body()` names the
catalog and closes "from discovery or from an issue". README, DESIGN, CHANGELOG. PMCID Fetcher landed in #353.

**Decisions:** D-042 (catalog and code-search finds with neither topic get no hold, annotating D-033). Milestone-local: none.

**Review:** Criteria audit (full, two rounds) 35 findings taken; claim audit 80 claims, 5 corrected. Four-lens
fan-out, 30 findings: 19 fixed (lookups bounded by `runMs` and stopped after a failed request, a `__proto__` state
key refused, pre-lookup skips, README list, warning cap, test gaps), 5 to rows (a note in "Check the restored
discovery state"; new parked "Check each redirect of GitHub API reads", "Skip closed bot pull requests in local
discover runs"), 6 rejected. Stopped once at the feature PR cap until #353 merged. CI passed. Candidate "Find
plugins whose repos carry no topic" narrowed to M071. Lessons: 5 used M070, 1 captured, 2026-10-30 (M064) evicted.
