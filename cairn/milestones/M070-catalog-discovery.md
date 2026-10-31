# M070: Find plugins in the zotero-chinese catalog

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the index's plugin list and the bot's pull request text change
- **Branch/PR:** m070-catalog-discovery

## Goal

`pnpm discover` also reads the repos that the zotero-chinese plugin catalog lists, so a Zotero 7+ plugin whose repo has neither topic can reach the index.

## Scope

**In:**
- Read the catalog's `plugins.json` from the `gh-pages` branch of
  zotero-chinese/zotero-plugins through GitHub's contents API. The read
  stops at 60 s and at 8 MiB.
- Check each catalog item's `repo` against
  `^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$`.
- Look up each candidate that no topic search returned with one GitHub
  GraphQL request for each 100 names. The names go in as variables. The
  answer gives the current name and `pushedAt`. Join all candidates by the
  lowercase current name. Source order: topic, then catalog.
- Change the state rule. The new state keeps each input record whose repo
  the index lacks and whose refusal is under 30 days old, whether or not
  this run found the repo.
- Carry `source` from the report item through `planned()` and the
  handoff to the pull request body. Give the closing line of the body one
  form for all sources.
- README, DESIGN, and CHANGELOG text.
- D-042, written with this plan: topic-less catalog and code-search finds
  get no new hold.
- After the merge, backfill the catalog finds. Dispatch `Discover plugins`
  with `limit` 100, then `Merge bot pull requests` with `wait_hours` 0.
  Repeat until a discover run writes no entry. Never dispatch while a
  `Build data` run is in progress. Record each run id and the counts in
  the work log.

**Out:**
- GitHub code search as a third source, and the `budget` input for runs
  started by hand: M071.
- Description overrides and category checks for the new plugins: the
  candidate rows "Close gaps in the description pick" (4) and "Check
  categories on new plugins".
- Bot pull requests that a hold keeps open: they wait for the maintainer
  (D-033).

## Acceptance criteria

- [x] AC1: `discover()` writes the entry of a repo that only the catalog lists, that has neither topic, and that passes the inclusion bar. Its report item has `source: "catalog"`, and its `holds` lack `issue-no-topic`. A catalog-only repo is keyed by the lowercase `nameWithOwner` that the lookup returns. Tests show one read in each of these cases: the topic search returns `Example/Alpha` and the catalog lists `example/ALPHA` (`source: "topic"`); the topic search returns the looked-up new name; the catalog lists the old and new names; the catalog lists one repo twice in different case. A test shows that the run skips a renamed catalog repo as `in-index` when an entry names the new name. All tests are in `test/discover.test.ts`.
- [x] AC2: A failed catalog read does not end the run. Tests cover an HTTP 5xx answer, a fetch that rejects, a fetch that passes 60 s, a body over 8 MiB, a body that is not JSON, and a JSON body that is not an array. In each test, the report gets a warning that names the catalog, the run still reads the topic candidates, and the state rule of AC4 holds. Tests also cover bad items: an item that is not an object, an item with no `repo`, a `repo` that is not a string, and a `repo` that fails the pattern (no slash, three parts, an empty part, a `"`). In each test, the report gets a warning that names the item, and the run still reads the other catalog items.
- [x] AC3: A lookup alias that is null with a `NOT_FOUND` error adds a warning that names the repo, and the run does not read that repo. An answer with no valid `pushedAt` for a repo has the same result. The other cases fail the lookup request for its repos: a 401, 403, 429, or 5xx answer, a fetch that rejects, a body that is not JSON, a body with no `data` object, and a null alias with any other error type. In each of these, the report gets a warning, the run still reads the other candidates, and the state rule of AC4 holds. A test shows each case.
- [x] AC4: The run reads catalog-only repos newest pushed first among all candidates. It skips a catalog-only repo as `in-index` when an entry names it, as `in-skip-set` when the skip set names it, and as `refused-before` on a later run while its `pushedAt` is unchanged and its refusal is under 30 days old. After any run, the new state keeps each input record whose repo the index lacks and whose refusal is under 30 days old. A test shows each of these five rules for a catalog-only repo.
- [x] AC5: `planned()` keeps `source`, and `entrySchema` in `src/discover/handoff.ts` accepts an optional `source` of `topic` or `catalog`. The issue read step writes no `source`. A `twoStep` test with a catalog-only repo runs `discoverRead`, `planned()`, `readHandoff`, and `proposeHandoff`. It asserts that the body says the bot found the repo in the zotero-chinese plugin catalog. Tests of `body()` assert that a topic body keeps "by its GitHub topic" and that an issue-run body keeps "from issue #N". They also assert that the closing line of all three bodies says that the bot does not propose the repo again, from discovery or from an issue.
- [x] AC6: README's "Finding new plugins" and "Pull requests from the bot" sections, `cairn/DESIGN.md`'s "Data sources and contribution" item 1 and its Known issues line on topic search, and CHANGELOG.md name the catalog as a second source. They say what a failed catalog read and a failed lookup do. README also says that the lookup needs `GITHUB_TOKEN`, and that without it the run skips the catalog-only repos with a warning.
- [x] AC7: The verify slot is clean: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1, T2
- AC2 → T1
- AC3 → T2
- AC4 → T3
- AC5 → T4
- AC6 → T5
- AC7 → T6

## Tasks

- [x] T1: In `src/discover/discover.ts`, add the catalog read (contents API, raw media type, 60 s, 8 MiB) and the item check. Add tests for AC2 and for the catalog part of AC1.
- [x] T2: Add the GraphQL lookup (batches of 100, names as variables, POST to the API host only) and the join by the looked-up name. Add tests for AC3 and for the join cases of AC1.
- [x] T3: Change the state rule in `discover()` and the ordering of the joined candidates. Add tests for AC4.
- [x] T4: Add `source` to `ReadItem`, `PlannedEntry`, `planned()`, and `entrySchema`. Change `body()` in `src/discover/propose.ts` and its closing line. Add the `twoStep` test and the `body()` tests of AC5.
- [x] T5: Write the README, DESIGN, and CHANGELOG text of AC6, and wrap it near 76 columns.
- [x] T6: Run `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check`.

## Work log

- 2026-10-31: created by /milestone-plan.
- 2026-10-31: tier check: milestone — new discovery sources in running code, with a design decision on holds.
- 2026-10-31: idea vet: gap — the source of topic-less repos was open, so it was asked at the question set (catalog and code search); gap — daily or backfill only was open, so it was asked (daily); gap — the catalog is third-party data, so the reading taken checks each item's name and sends names as GraphQL variables; gap — the 132-plugin count was measured against the catalog itself, so code search (M071) covers plugins the catalog lacks. No flaw.
- 2026-10-31: lessons used: 2026-10-25 (M001), 2026-10-26 (M018), 2026-10-28 (M036), 2026-10-30 (M062).
- 2026-10-31: collision check: candidate row "Find plugins whose repos carry no topic" absorbed by M070 and M071; M008 (done) is the topic search this extends; M057 (done) and D-034 give the backfill procedure; D-033 annotated by D-042; rows "Close gaps in bot holds and merges", "Stop rereading hosts that keep failing", and "Check the restored discovery state" are distinct.
- 2026-10-31: inbox sweep: 0 open issues; 19 open bot pull requests with no overlap; PR #353 (PMCID Fetcher entry, by the operator) is open and counts toward the feature cap of 1, so it must merge or close before this milestone's review opens its PR.
- 2026-10-31: question set: may the agent backfill after the merge with dispatched discover rounds (limit 100) and merge runs (wait_hours 0)? — yes, all rounds, never while `Build data` runs.
- 2026-10-31: criteria audit (full, two rounds of a fresh Opus reader): 35 findings, all taken. Name case and renames, a closed failure-probe list, the catalog host and limits, the name pattern and GraphQL variables, NOT_FOUND versus other errors, a null `pushedAt`, one state rule for all runs, the skip set in place of a closed-PR stand-in, the `planned()` path, docs on the token and the Known issue, and the move of code search to M071.
- 2026-10-31: plan gate chose the catalog plus code search over code search alone because GitHub's code index held about 58% of plugin repos (158 of 273 indexed ones) on 2026-10-31; falsified by a later measurement where code search finds nearly every catalog plugin.
- 2026-10-31: plan chose one GraphQL request for each 100 names over a REST `GET /repos` for each name because the Actions token allows 1,000 REST requests an hour and M071 adds about 1,000 names; falsified by a run where batched lookups cost more requests or fail more often than single ones.
- 2026-10-31: plan chose the contents API over the catalog's GitHub Pages URL because `githubClient` sends requests only to the API host; falsified by the contents API refusing or truncating the file.
- 2026-10-31: plan chose to keep refusal records of repos a run did not find, for 30 days, over dropping them because code-search results shift between runs; falsified by a state file that grows past the size the cache step can save.
- 2026-10-31: started on branch m070-catalog-discovery.
- 2026-10-31: T1-T4 landed in one commit, since a catalog repo needs the lookup's pushed_at before the run can read it (minor amendment).
- 2026-10-31: implementation choices: `discover()` reads the catalog only when its new `catalog` option is set, and `pnpm discover` sets it to `CATALOG_URL`, so tests without a catalog need no catalog fixture; `githubClient` gains `raw(url, max, ms)`; `SOURCES` lives in `holds.ts` beside `TOPICS`, since `handoff.ts` cannot import `discover.ts` without a cycle; a catalog name that a topic search returned is not looked up.
- 2026-10-31: the state rule also keeps a record of a repo the run found whatever its age, as before, since an old record never causes a skip; two time-limit tests rely on it.
- 2026-10-31: check discrimination: a planted `planned()` that drops `source` turned the catalog `twoStep` test red; restored from a copy.
- 2026-10-31: verify: `pnpm test` 1691 passed, 6 skipped; `pnpm check` 272 entries, 0 problems.
- 2026-10-31: T5: README "Finding new plugins" (catalog, lookup, token, failures, state), "Pull requests from the bot" (first sentence, catalog repos get no `issue-no-topic` hold); DESIGN Data sources item 1, architecture bullet, and Known issues line (corrected M070); CHANGELOG entry. The simple-english hook still flags 3 README and 8 CHANGELOG sentences that this milestone does not touch.
- 2026-10-31: T6: `pnpm test` 1691 passed, 6 skipped; `pnpm check` 272 entries, 0 problems.
- 2026-10-31: claim audit: 80 claims read, 5 corrected — README.md (hold wording, 30-day state wording, at most 100 per request, failed connection), CHANGELOG.md (hold and state wording), src/discover/discover.ts (`lookUp` warning comment). Not changed: `raw()` checks only the first URL's origin, as `get` does, so after a redirect the token relies on fetch dropping it across origins.
- 2026-10-31: implement done; status review.

## Decisions

## Review

- AC1 evidence (2026-10-31, branch at 9676146): `test/discover.test.ts` "the catalog" passed: "writes the entry of a repo that only the catalog lists, with no topic and no hold" (`source: "catalog"`, `holds: []`, names sent as GraphQL variables), the four "reads a repo once when …" cases (topic in other case gives `source: "topic"`; topic returns the looked-up name; catalog lists old and new names; catalog lists one repo twice in other case), and "skips a renamed catalog repo as in-index when an entry names its new name".
- AC2 evidence: six "warns and reads the topic repos when the catalog read fails with …" cases passed (HTTP 5xx, a fetch that rejects, a fetch that passes its time limit, a body over its size limit, a body that is not JSON, a JSON body that is not a list); each asserts one warning naming the catalog, a read of the topic repo, and the input state kept. The limit cases inject 50 ms and 100 bytes; the defaults are `CATALOG_MS` 60 s and `CATALOG_MAX_BYTES` 8 MiB (`src/discover/discover.ts:24-25`), taken at `:139` when `catalogMs` and `catalogMaxBytes` are unset, as `pnpm discover` leaves them (`src/discover/cli.ts:57`). "warns about each catalog item with no usable owner/repo name and reads the others" passed for all eight bad items (not an object twice, no `repo`, non-string, no slash, three parts, empty part, a `"`).
- AC3 evidence: "warns about and does not read a repo that GitHub does not have or that has no pushed_at" passed (NOT_FOUND alias and a null `pushedAt`); seven "warns, reads the other repos, and keeps the state when the lookup fails with …" cases passed (401, 403, 429, 5xx, a fetch that rejects, a body that is not JSON, an answer with no data); "warns about a repo whose lookup failed with another error type, and reads the others" passed (a FORBIDDEN alias, state kept).
- AC4 evidence: "a catalog-only repo" passed all five: "is read before an older topic repo", "is skipped as in-index when an entry names it", "is skipped as in-skip-set when the skip set names it", "is skipped as refused-before while its pushed_at is unchanged and its refusal is under 30 days old" (a new push is read again), and "keeps its record under 30 days old when a run does not find it" (dropped at 30 days). "the discovery state > keeps records under 30 days old of repos the run did not find, and drops old ones and those the index now has" passed.
- AC5 evidence: `test/propose.test.ts` "a catalog entry's body says the bot found the repo in the catalog" passed, a `twoStep` run through `discoverRead`, `planned()`, `readHandoff`, and `proposeHandoff`; with `planned()` planted to drop `source` it failed (work log). "the body names how the bot found the repo, and every body closes with the same line" passed for topic, catalog, and issue bodies. `test/issue.test.ts` "the read step writes the entry's hold reasons in the plan, and no source" passed. `entrySchema` takes `source: { enum: [...SOURCES] }` (`src/discover/handoff.ts`).
- AC6 evidence (read at 9676146): README "Finding new plugins" names the catalog (line 570), the lookup and its need for `GITHUB_TOKEN` (576), a failed catalog read (586-592), a bad item and a failed lookup (593-596), and that without `GITHUB_TOKEN` no catalog-only repo is read (596-597). "Pull requests from the bot" names the catalog in the body's first sentence (683) and under `issue-no-topic`. DESIGN item 1 (204-207) names the catalog and both failures; the architecture bullet (593) and the Known issues line (868) are marked `corrected M070`. CHANGELOG "Unreleased" opens with the catalog entry (line 5), which says a failed read or lookup warns.
- AC7 evidence: `npx -y pnpm@12.15.0 test` (type check, then Vitest): 28 files passed, 1 skipped; 1691 tests passed, 6 skipped. `npx -y pnpm@12.15.0 check`: 272 entries, 0 problems.
- Consistency gate: `cairn_validate.py` all checks passed; the `generic` profile names no toolchain checks; no principle changed, so no `cairn_impact` run.
- spawned: diff-bug, blame-history, prior-review, ripple
