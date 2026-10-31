# M071: Find plugins by GitHub code search

- **Status:** review
- **Priority:** normal
- **Depends on:** M070
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the index's plugin list and the bot's pull request text change
- **Branch/PR:** m071-code-search-discovery

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
- After the merge, the first `Discover plugins` run on the default branch
  shows whether the Actions token can run code search: its report has
  code-search items, or a warning with HTTP 401 or 403 for each query. A
  dispatch on the branch skips the read job, whose guard admits only a
  schedule or the default branch. If the token cannot run code search,
  stop and ask the user for a read-only personal token as a repository
  secret. Its wiring is then a gated amendment. The token goes only to the
  `pnpm discover` step.
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

- [x] AC1: `discover()` runs the five queries and writes the entry of a repo that only code search finds. Its report item has `source: "code-search"`, and its `holds` lack `issue-no-topic`. Code-search names join the other candidates by the lowercase name after the lookup, as in M070's AC1. Tests show that a repo that the catalog and code search both name has `source: "catalog"`, and that a repo that a topic search also returns has `source: "topic"`. All tests are in `test/discover.test.ts`.
- [x] AC2: Within one run, no 60-second window holds more than 10 code-search requests, failed requests included. A test with an injected clock shows this for a run that pages through more than 10. The search phase counts toward `runMs`. A test shows that a query that is not finished 8 minutes after the run starts stops with a warning that names the query, and that the run then reads the candidates.
- [x] AC3: A failed code-search request does not end the run. Tests cover a 401, a 403, a 429, a 5xx, a fetch that rejects, a request that passes its time limit, a body that is not JSON, and a page with no list of items. In each test, the report gets a warning that names the query, and the run keeps the repos from that query's earlier pages. It still reads the other queries' repos and the topic and catalog candidates, and M070's state rule holds. Tests also show a warning for an item with no `repository.full_name`, and a warning that names a query whose `total_count` is over 1,000.
- [x] AC4: The run orders, looks up, and skips code-search-only repos as it does catalog-only repos (M070's AC3 and AC4). Tests show the three skips (`in-index`, `in-skip-set`, `refused-before`) and a failed lookup for a code-search-only repo.
- [x] AC5: `entrySchema` accepts `code-search` as a `source`. A `twoStep` test with a code-search-only repo runs `discoverRead`, `planned()`, `readHandoff`, and `proposeHandoff`. It asserts that the body says the bot found the repo by GitHub code search, and that the body's closing line says the bot does not propose the repo again, from discovery or from an issue.
- [x] AC6: A `Discover plugins` run started by hand accepts a `budget` input, which reaches `pnpm discover` as `--budget`. A scheduled run passes none, so the command's default of 100 applies. A test in `test/workflows.test.ts` asserts the input and its wiring.
- [x] AC7: README's "Finding new plugins" and "Pull requests from the bot" sections, `cairn/DESIGN.md`'s "Data sources and contribution" item 1 and its Known issues line, and CHANGELOG.md name code search as a third source. They list its queries, say what a failed query does, and name the `budget` input. The verify slot is clean: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1
- AC2 → T2
- AC3 → T2
- AC4 → T1
- AC5 → T3
- AC6 → T4
- AC7 → T5, T6

## Tasks

- [x] T1: In `src/discover/discover.ts`, add the five queries and send their names through M070's lookup and join. Add tests for AC1 and AC4.
- [x] T2: Add the pacing (an injected clock), the 8-minute search cutoff, and the failure handling. Add tests for AC2 and AC3.
- [x] T3: Add `code-search` to `entrySchema` and to `body()`. Add the `twoStep` test of AC5.
- [x] T4: Add the `budget` input to `.github/workflows/discover.yml` as `${BUDGET:+--budget "$BUDGET"}`. Add the test of AC6, anchored on the run line.
- [x] T5: Write the README, DESIGN, and CHANGELOG text of AC7, and wrap it near 76 columns.
- [x] T6: Run the verify slot. The token check moves to the first run after the merge (Scope).

## Work log

- 2026-10-31: created by /milestone-plan.
- 2026-10-31: tier check: milestone — a new discovery source in running code, with a design decision on holds.
- 2026-10-31: idea vet: gap — GitHub's code index held about 58% of plugin repos, so the reading taken keeps the catalog (M070) beside code search; gap — code-search finds are unvetted, so the question set asked about a hold (none, D-042). No flaw.
- 2026-10-31: lessons used: 2026-10-25 (M001), 2026-10-27 (M030), 2026-10-30 (M062), 2026-10-31 (M069, `job.indexOf` anchors on the first mention).
- 2026-10-31: split: the plan's request became M070 (catalog, lookup, state rule, source field) and M071 (code search, budget input), because one milestone would have held 13 criteria. M071 depends on M070.
- 2026-10-31: question set: if the Actions token cannot run code search — stop and ask the user for a personal token. Backfill after the merge — yes, all rounds, never while `Build data` runs.
- 2026-10-31: criteria audit (full, fresh Opus reader): 10 findings on M071 taken. Join after the lookup, pacing within one run with failed requests counted and the search counted toward `runMs`, a closed failure-probe list, earlier pages kept, the lookup and order rules shared with M070, the closing line, the README section for dispatch inputs, the Known issues line, and the token wiring scoped to the discover step.
- 2026-10-31: on 2026-10-31 the five queries returned 1,053 repos: 158 of the 273 indexed ones, 76 of the 132 that the catalog alone listed, and PMCID Fetcher. A sample of 80 of the 776 repos that neither the index nor the catalog had held 36 that passed `pnpm add-plugin`.
- 2026-10-31: M070's catalog backfill ran after its merge: discover runs 41217007751, 41218104935, 41218886852, and 41219300884 (`limit` 100; the last wrote nothing and left 0 unread, 13 `request-failed` reads not recorded) and merge runs 41217663565, 41218591124, and 41219146743 (`wait_hours` 0) wrote 149 entries (147 from the catalog) and merged 132. The index went from 273 to 405 entries (`pnpm check` 0 problems). 35 bot pull requests stay held (name-match 17, update-host 14, new-account 3, new-account and update-host 1), and #103 has no Hold line. M071's backfill starts from this state.
- 2026-10-31: implement started; branch m071-code-search-discovery cut from main at daafed1.
- 2026-10-31: choice: code search runs only when `discover()` gets a `codeSearch` list (`CODE_SEARCHES`, passed by `pnpm discover`), as the catalog runs only with `catalog`, so older tests send no code search request.
- 2026-10-31: choice: one `Clock` option (`now`, `sleep`) drives the pacing and every `runMs` check, default `performance.now()` and `setTimeout`, so the search time counts toward `runMs`; `githubClient().get` takes an optional time limit for `codeSearchMs` (default 60 s).
- 2026-10-31: choice: a failed code search request warns and ends only its own query; the next query still runs. A name that a lookup gave is also known, so a later source's same name gets no second lookup.
- 2026-10-31: T1 done: five queries, lookup and join, tests for AC1 and AC4 (join order shown red with two planted defects). The commit also carries T2's pacing, cutoff, and failure code and the `code-search` value in `SOURCES`, which the `Source` type needs; T2 and T3 add their tests. `pnpm test` 1713 passed, `pnpm check` 0 problems.
- 2026-10-31: T2 done: tests for AC2 (window of 13 requests with one failed, search time counted toward `runMs`, the 8-minute cutoff) and AC3 (the eight failure kinds, an item with no `repository.full_name`, `total_count` over 1,000). The window test went red with the rate planted at 11 and with failed requests left uncounted. A stop warning now says "1 page", not "1 pages". `pnpm test` 1725 passed, `pnpm check` 0 problems.
- 2026-10-31: T3 done: `body()` says "found <url> by GitHub code search for Zotero plugin files"; `entrySchema` takes `code-search` through `SOURCES` (T1). The `twoStep` test of AC5 went red ("does not match the handoff schema") with `code-search` planted out of the schema enum. `pnpm test` 1726 passed, `pnpm check` 0 problems.
- 2026-10-31: T4 done: `budget` dispatch input (number, default 100) reaches the read job's run line as `${BUDGET:+--budget "$BUDGET"}`; the test anchors on the run line and its indented env lines, and went red with `inputs.budget || 100` planted. `pnpm test` 1727 passed, `pnpm check` 0 problems.
- 2026-10-31: T5 done: README "Finding new plugins" (queries, token, join, pacing, failures, cutoff), "Pull requests from the bot" (`limit` and `budget` inputs, body sentence, hold), DESIGN item 1, Architecture, and Known issues, CHANGELOG entry. "Code search needs `GITHUB_TOKEN`" rests on an unauthenticated `/search/code` request that answered HTTP 401 this session. The simple-english lint hook flags older README and CHANGELOG lines (269, 918, 1403; 200 and later), none of them M071's, left as they are. `pnpm test` 1727 passed, `pnpm check` 0 problems.
- 2026-10-31: T6 stop: the branch dispatch cannot show the token result. The read job's `if` admits only a schedule or the default branch, so a branch dispatch skips it, and the write job has no branch guard of its own. GitHub's REST docs for `GET /search/code` (read this session) say only that it needs authentication and allows 10 requests a minute, and name no token types. Asking the user whether to move the token check to the first run after the merge.
- 2026-10-31: substantive amendment: at the user's choice at the T6 stop ("After the merge"), the Scope bullet on the token check now has the first `Discover plugins` run on the default branch after the merge show whether the Actions token can run code search, and T6 is the verify slot alone. No acceptance criterion changes.
- 2026-10-31: T6 done: `pnpm test` 1727 passed, `pnpm check` 0 problems.
- 2026-10-31: claim audit pass (fresh Opus reader): about 60 claims read, 5 corrected — the item warning now says "no owner/repo repository.full_name" (README too); lookup failure ends only that source's lookups (README, lookUp comment, DESIGN); the cutoff comment no longer says the reads keep most of the time limit; the query comment names a library, build tool, or type package; the pacing wait adds 1 ms against early timers. `pnpm test` 1727 passed, `pnpm check` 0 problems. Checkpoint before the reader's one re-read of the corrections.
- 2026-10-31: claim audit: 60 claims read, 5 corrected — src/discover/discover.ts, README.md, test/discover.test.ts (and cairn/DESIGN.md); the same reader re-read the 5 corrections once and found each correct.
- 2026-10-31: implement done; status review.

## Decisions

## Review

- 2026-10-31 evidence base: branch head 3056ec0, level with origin/main daafed1. `pnpm test` 1727 passed, 6 skipped; `pnpm check` 405 entries, 0 problems; the 29 code-search, budget, and CLI tests named below pass (`vitest --reporter=verbose`).
- AC1: test/discover.test.ts "the code search": "runs the five queries and writes the entry of a repo that only code search finds, with no topic and no hold" requests exactly the five `CODE_SEARCHES` URLs and reports example/coded as `source: "code-search"`, written, `holds: []`; the six "reads a repo once, with the source of the first source in the order" cases show catalog over code search (same name, old/new name both ways), topic over code search (letter case, lookup rename), and one read for a name two queries give, with the lookup counts that the join after the lookup implies. Pass.
- AC2: "sends no more than 10 code search requests in any 60-second window, failed requests included" sends 13 requests on an injected clock (q1 7 pages, q2 one 503, q3 5 pages) and asserts `times[i+10] - times[i] >= 60000` for each i; "counts the time of the code search toward the run's time limit" (runMs 30000, 11 paced pages) reads nothing and warns that the lookups and reads passed 30000 ms; "stops each query not finished 8 minutes after the run starts…" warns for q1 (2 pages) and q2 (0 pages) by name, sends no third page, then writes q1-p1, q1-p2, and alpha. Pass.
- AC3: "a failed code search request" runs eight cases (401, 403, 429, 502, rejected fetch, request past `codeSearchMs` 200, body not JSON, page with no `items`) on q1's second page; each asserts one warning "the code search for q1 read 1 page and stopped, since …" naming the failed URL and its failure, reads listed (catalog), coded (q1 page 1), other (q2), and alpha (topic), and keeps an unrelated refusal under 30 days in the state. "warns about an item with no owner/repo repository.full_name and a query with more than 1,000 results" asserts the `total_count` 1500 warning naming q1 and one warning for each of three items with no usable `repository.full_name`. Pass.
- AC4: "a code-search-only repo": read before the older topic repo (newest pushed first); skipped as `in-index` and as `in-skip-set` with no lookup request and no repo read; skipped as `refused-before` while pushed_at holds and read again after a push; a 502 lookup warns "the run reads none of 1 code-search repos…" and reads only alpha. Pass.
- AC5: test/propose.test.ts "a code-search entry's body says the bot found the repo by GitHub code search, and closes with the no-repeat line" runs `twoStep` (`discoverRead`, `planned()`, `writePlan`, `readHandoff`, which validates `entrySchema`, then `proposeHandoff`); the read reports example/coded with `source: "code-search"`, and the sent body starts "The discovery bot found https://github.com/example/coded by GitHub code search for Zotero plugin files and drafted" and ends with the "does not propose this repo again, from discovery or from an issue" line. Pass.
- AC6: test/workflows.test.ts "takes a budget input on dispatch, which reaches pnpm discover as --budget only through env" asserts the `budget` dispatch input (number, default 100), the read job's run step `${BUDGET:+--budget "$BUDGET"}` with `BUDGET: ${{ inputs.budget }}`, and that this is the input's one expression, with no `||` default; a scheduled run has empty inputs, so no `--budget` is passed and `src/discover/cli.ts` line 28's default of 100 applies. Pass.
- AC7: README "Finding new plugins" names code search after the topic search and catalog, lists the five queries (lines 576-580), and says a failed request warns by query, keeps earlier pages, and runs the next query (617-633); "Pull requests from the bot" names the `budget` input (674-677) and the code-search body sentence (719). DESIGN "Data sources and contribution" item 1 names the five queries, the failed-request rule, and `budget` (205-215); its Known issues line names code search (corrected M071). CHANGELOG's first Unreleased entry names code search, points to the README for the queries, gives the failure rule, and names `budget`. Read with "They" as the set of these texts, as the criterion's mix of a Known issues line and a sections pair implies. Verify slot clean (base line). Pass.
- Consistency gate: `cairn_validate.py` exit 0, every check PASS or OK; no DESIGN principle changed, so no `cairn_impact` run; the generic profile's consistency-gate slot names no toolchain checks.
