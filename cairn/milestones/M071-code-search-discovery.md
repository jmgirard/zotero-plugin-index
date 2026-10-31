# M071: Find plugins by GitHub code search

- **Status:** planned
- **Priority:** normal
- **Depends on:** M070
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the index's plugin list and the bot's pull request text change
- **Branch/PR:** —

## Goal

`pnpm discover` also runs five GitHub code searches for Zotero plugin files, so a plugin that no topic and no catalog names can reach the index.

## Scope

**In:**
- Run these five code-search queries and page through each one:
  - `"applications" "zotero" "strict_min_version" filename:manifest.json`
  - `"applications" "zotero" "update_url" filename:manifest.json`
  - `"zotero-plugin-toolkit" filename:package.json`
  - `"zotero-plugin-scaffold" filename:package.json`
  - `"zotero-plugin" "zotero-types" filename:package.json`
- Pace the requests at no more than 10 in a 60-second window. The search
  time counts toward the run's time limit. A query that is not finished 8
  minutes after the run starts stops with a warning.
- Send code-search names through M070's lookup and join. Source order:
  topic, then catalog, then code search.
- Add `code-search` to the handoff's `source` and to the body text.
- Add a `budget` input for `Discover plugins` runs started by hand.
- README, DESIGN, and CHANGELOG text.
- On the branch, dispatch the `Discover plugins` read job once. Its report
  shows whether the Actions token can run code search. The write job runs
  only on the default branch, so this opens no pull request. If the token
  cannot run code search, stop and ask the user for a read-only personal
  token as a repository secret (question set). Its wiring is then a gated
  amendment. The token goes only to the `pnpm discover` step.
- After the merge, backfill the code-search finds in the rounds of M070's
  backfill. Use the `budget` input. Record each run id and the counts.

**Out:**
- The catalog source, the lookup, the state rule, and the `source` field:
  M070.
- Plugins that no topic, catalog, or code index names: DESIGN.md's Known
  issues line, which T5 updates.
- Description overrides and category checks for the new plugins: the
  candidate rows "Close gaps in the description pick" (4) and "Check
  categories on new plugins".

## Acceptance criteria

- [ ] AC1: `discover()` runs the five queries and writes the entry of a repo that only code search finds. Its report item has `source: "code-search"`, and its `holds` lack `issue-no-topic`. Code-search names join the other candidates by the lowercase name after the lookup, as in M070's AC1. Tests show that a repo that the catalog and code search both name has `source: "catalog"`, and that a repo that a topic search also returns has `source: "topic"`. All tests are in `test/discover.test.ts`.
- [ ] AC2: Within one run, no 60-second window holds more than 10 code-search requests, failed requests included. A test with an injected clock shows this for a run that pages through more than 10. The search phase counts toward `runMs`. A test shows that a query that is not finished 8 minutes after the run starts stops with a warning that names the query, and that the run then reads the candidates.
- [ ] AC3: A failed code-search request does not end the run. Tests cover a 401, a 403, a 429, a 5xx, a fetch that rejects, a request that passes its time limit, a body that is not JSON, and a page with no list of items. In each test, the report gets a warning that names the query, and the run keeps the repos from that query's earlier pages. It still reads the other queries' repos and the topic and catalog candidates, and M070's state rule holds. Tests also show a warning for an item with no `repository.full_name`, and a warning that names a query whose `total_count` is over 1,000.
- [ ] AC4: The run orders, looks up, and skips code-search-only repos as it does catalog-only repos (M070's AC3 and AC4). Tests show the three skips (`in-index`, `in-skip-set`, `refused-before`) and a failed lookup for a code-search-only repo.
- [ ] AC5: `entrySchema` accepts `code-search` as a `source`. A `twoStep` test with a code-search-only repo runs `discoverRead`, `planned()`, `readHandoff`, and `proposeHandoff`. It asserts that the body says the bot found the repo by GitHub code search, and that the body's closing line says the bot does not propose the repo again, from discovery or from an issue.
- [ ] AC6: A `Discover plugins` run started by hand accepts a `budget` input, which reaches `pnpm discover` as `--budget`. A scheduled run passes none, so the command's default of 100 applies. A test in `test/workflows.test.ts` asserts the input and its wiring.
- [ ] AC7: README's "Finding new plugins" and "Pull requests from the bot" sections, `cairn/DESIGN.md`'s "Data sources and contribution" item 1 and its Known issues line, and CHANGELOG.md name code search as a third source. They list its queries, say what a failed query does, and name the `budget` input. The verify slot is clean: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1
- AC2 → T2
- AC3 → T2
- AC4 → T1
- AC5 → T3
- AC6 → T4
- AC7 → T5, T6

## Tasks

- [ ] T1: In `src/discover/discover.ts`, add the five queries and send their names through M070's lookup and join. Add tests for AC1 and AC4.
- [ ] T2: Add the pacing (an injected clock), the 8-minute search cutoff, and the failure handling. Add tests for AC2 and AC3.
- [ ] T3: Add `code-search` to `entrySchema` and to `body()`. Add the `twoStep` test of AC5.
- [ ] T4: Add the `budget` input to `.github/workflows/discover.yml` as `${BUDGET:+--budget "$BUDGET"}`. Add the test of AC6, anchored on the run line.
- [ ] T5: Write the README, DESIGN, and CHANGELOG text of AC7, and wrap it near 76 columns.
- [ ] T6: Run the verify slot. Push the branch, then dispatch `Discover plugins` with `--ref` set to the branch. Read the report for code-search items, a 401, or a 403. If the token cannot run code search, stop for the user.

## Work log

- 2026-10-31: created by /milestone-plan.
- 2026-10-31: tier check: milestone — a new discovery source in running code, with a design decision on holds.
- 2026-10-31: idea vet: gap — GitHub's code index held about 58% of plugin repos, so the reading taken keeps the catalog (M070) beside code search; gap — code-search finds are unvetted, so the question set asked about a hold (none, D-042). No flaw.
- 2026-10-31: lessons used: 2026-10-25 (M001), 2026-10-27 (M030), 2026-10-30 (M062), 2026-10-31 (M069, `job.indexOf` anchors on the first mention).
- 2026-10-31: split: the plan's request became M070 (catalog, lookup, state rule, source field) and M071 (code search, budget input), because one milestone would have held 13 criteria. M071 depends on M070.
- 2026-10-31: question set: if the Actions token cannot run code search — stop and ask the user for a personal token. Backfill after the merge — yes, all rounds, never while `Build data` runs.
- 2026-10-31: criteria audit (full, fresh Opus reader): 10 findings on M071 taken. Join after the lookup, pacing within one run with failed requests counted and the search counted toward `runMs`, a closed failure-probe list, earlier pages kept, the lookup and order rules shared with M070, the closing line, the README section for dispatch inputs, the Known issues line, and the token wiring scoped to the discover step.
- 2026-10-31: on 2026-10-31 the five queries returned 1,053 repos: 158 of the 273 indexed ones, 76 of the 132 that the catalog alone listed, and PMCID Fetcher. A sample of 80 of the 776 repos that neither the index nor the catalog had held 36 that passed `pnpm add-plugin`.

## Decisions

## Review
