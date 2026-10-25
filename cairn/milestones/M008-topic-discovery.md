# M008: Find new plugin repos by topic search

- **Status:** review
- **Priority:** high
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** internal — a data-generation command that only the maintainer and the M009 workflow run
- **Branch/PR:** m008-topic-discovery

## Goal

`pnpm discover` searches the `zotero-plugin` and `zotero-addon` topics on GitHub and drafts an entry for each new repo that passes the inclusion bar, up to a set number per run.

## Scope

**In:** `discover()` in `src/discover/discover.ts` and its CLI `src/discover/cli.ts` (`pnpm discover`). It
searches both topics through the GitHub search API with pagination, takes the union, and leaves out each repo
that an entry's `meta.json` `repoUrl` already names (owner and repo compared ignoring case) and each repo in a
skip set the caller passes. It reads the rest with `readUpstream`, newest `pushed_at` first, and writes each
passing repo's entry with `writeEntry`. A state file records each refused read, so a later run reads that
repo again only when its `pushed_at` changed or the record is older than 30 days. A read budget and an entry
limit bound each run. A JSON report on stdout names what the run wrote, refused, and skipped.

**Out:** the daily workflow, the pull requests, the skip set built from the bot's pull requests, and the
README and CHANGELOG text → M009. The one-URL issue form → M010. Reading stable releases before prereleases
→ candidate row "Read stable releases before prereleases". Rate limits of the daily data build as the index
grows → candidate row "Warn when the daily build degrades".

## Acceptance criteria

- [x] AC1: Given recorded search responses with two pages for `topic:zotero-plugin` and one page for
      `topic:zotero-addon`, one repo appearing under both topics, `discover` reads each distinct repo in
      those responses exactly once; `test/discover.test.ts` asserts the list of repo URLs passed to the reader.
- [x] AC2: The fixture repo whose search `html_url` differs from an entry's `repoUrl` only in letter case,
      and the fixture repo that the caller's skip set names, are not read, and the report lists each as
      skipped with its reason (in the index, or in the skip set); a test asserts both cases.
- [x] AC3: After a read that fails with a reader failure other than `github-http-error` or `request-failed`,
      the state file holds that repo's `pushed_at` and failure name. A test runs `discover` three more times
      on that state: with the same `pushed_at` the repo is not read, with a changed `pushed_at` it is read, and
      with the same `pushed_at` but a record older than 30 days it is read. A test also asserts that a read
      failing with `github-http-error` leaves no record for that repo.
- [x] AC4: A run writes at most `limit` entries and reads at most `budget` repos, in newest-`pushed_at`-first
      order. A test with more passing repos than `limit` asserts that the written count equals `limit`, and a
      test with more candidates than `budget` asserts that the read count equals `budget` and that the repos
      read are the `budget` newest by `pushed_at`.
- [x] AC5: Each repo read gets one report item, which names either the written entry's id and repo URL or a
      failure name, which is the reader's failure name or `writeEntry`'s. A test asserts the item for one
      fixture repo of each of four outcomes: written, a reader failure, `entry-exists`, and `unsafe-id`.
- [x] AC6: When a search request returns an HTTP error, the run writes no entry, leaves the state file as it
      was, and exits 1 with a message that names the request URL and the HTTP status; a CLI test asserts the
      exit code, the message, the absent entries, and the unchanged state file.
- [x] AC7: `pnpm discover [--out <dir>] [--state <file>] [--limit <n>] [--budget <n>]` runs `discover` from
      the command line, with relative paths resolved against the caller's directory; a CLI test with the
      fixture preload asserts the written files and the report. `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1, T2, T3
- AC2 → T2, T3
- AC3 → T2, T4
- AC4 → T2, T4
- AC5 → T2, T4
- AC6 → T5
- AC7 → T5, T6

## Tasks

- [x] T1: Record search fixtures under `test/fixtures/discover/`: two pages for `topic:zotero-plugin` (Link
      header), one for `topic:zotero-addon`, one repo in both, and repos that reach each outcome of AC5,
      reusing the recorded upstream responses where they fit.
- [x] T2: Write failing tests in `test/discover.test.ts` for AC1–AC5, passing `{ lookup }` stubs and a fixture
      fetch, and a fixed `now` for the 30-day rule.
- [x] T3: Implement the search, the union, and the index and skip-set filters in `src/discover/discover.ts`.
      Share the request and token handling of `src/upstream/reader.ts` (token to the API host only), but read
      search pages as `{ total_count, incomplete_results, items }`, which its `pages()` rejects as not a list;
      a page with `incomplete_results: true` adds a warning to the report and the run goes on.
- [x] T4: Implement the state file, the read order, the budget, the limit, the entry writes, and the report.
- [x] T5: Implement `src/discover/cli.ts` and the `discover` script in `package.json`, with a CLI test for AC6
      and AC7 that runs pnpm with `--dir` and the fixture preload; the state file defaults to
      `.cache/discovery-state.json`.
- [x] T6: Add `src/discover/` to DESIGN.md's Function Families and Architecture; run one live, read-only
      `pnpm discover --out <tmp> --state <tmp> --limit 3 --budget 20` and log its counts; run the verify slot.

## Work log

- 2026-10-25: created by /milestone-plan.
- 2026-10-25: tier check: not run — work named at the question set.
- 2026-10-25: question set: which work to plan — the discovery bot (candidate "Find new plugins by GitHub topic search"), all four recommendations taken.
- 2026-10-25: idea vet: three concerns posed at the question set — a first run could open hundreds of pull requests (answer: at most 5 per run, M009); pull requests from the built-in Actions token start no CI run and need a repo setting turned on (answer: built-in token, check result in each body, the user turns the setting on, M009); a closed repo would come back each day (answer: skip it for good, M009).
- 2026-10-25: feature series: M008 -> M009 -> M010.
- 2026-10-25: collision check: candidate "Find new plugins by GitHub topic search" absorbed in full across M008–M010; no D-entry, archive, or open milestone overlaps; inbox sweep found 0 open issues and 0 open PRs.
- 2026-10-25: plan gate chose a state file kept in the Actions cache over a state file committed to the repo, because a committed file needs a push to main on every run; falsified by runs that spend their budget re-reading refused repos after cache evictions.
- 2026-10-25: plan gate chose a read budget per run (default 100, about 200 API requests) over reading every candidate each run, because the built-in token allows 1,000 API requests an hour and the topics hold about 500 repos; falsified by a run at the default budget that hits the rate limit, or a backlog that the budget leaves unread for months.
- 2026-10-25: plan gate kept the CLI in this milestone, with no README or CHANGELOG text until M009, so review can run it live and read-only.
- 2026-10-25: criteria audit (reduced mode, fresh Opus reader, run after the question set because the set chose the work) returned 4 findings, all fixed: AC2 narrowed to the planted case-only and skip-set repos; AC5 names `writeEntry`'s failure names in general, with four planted outcomes; AC3 records no transient failure (`github-http-error`, `request-failed`), so one rate-limited run cannot hide repos for 30 days; T3 notes that search pages are objects, not lists, and how `incomplete_results` is handled.
- 2026-10-25: lessons used: 2026-10-25 (M001) pnpm through npx and `pnpm test`; 2026-10-25 (M001) INIT_CWD for relative paths; 2026-10-25 (M002) `--dir` for pnpm from a temp dir; 2026-10-25 (M002) the fixture preload; 2026-10-25 (M004) the `lookup` stub; 2026-10-25 (M003) Vitest `hookTimeout`.

- 2026-10-25: implement started on m008-topic-discovery, cut from main at 7234459.
- 2026-10-25: T1 done: `test/fixtures/discover/search.json` holds the search pages (two for `topic:zotero-plugin`, one for `topic:zotero-addon`, example/both under both), and `test/support/plugin-repo.ts` builds each repo's reader responses, since writing the XPI and update.json responses by hand for every test repo would repeat them.
- 2026-10-25: T2 done: `test/discover.test.ts` covers AC1–AC5 and fails until `src/discover/discover.ts` exists. API chosen: `discover({ root, outDir, fetch, lookup, state, skip, limit, budget, now })` returns the new state and a report of `read` items (written or refused), `skipped` items (`in-index`, `in-skip-set`, `refused-before`), and warnings; repos are keyed by lowercase `owner/repo`.
- 2026-10-25: T3 and T4 done in one commit, since both live in `src/discover/discover.ts`: `reader.ts` now exports `githubClient` (with its `get`) and `ReadFailure`; discovery checks a new id against the index's entry names itself (`entry-exists`), because `--out` can point away from `plugins/` where `writeEntry` would see the clash; `write-failed` joins the unrecorded failures, since it is a local problem; the 7 discover tests pass.
- 2026-10-25: planted-defect probes, each restored after: recording transient failures, dropping the topic dedupe, dropping the budget, and a case-sensitive search-side key each turned the matching test red; a case-sensitive index-side key stayed green, since the fixture's index URL is already lowercase and the search side carries the case difference.
- 2026-10-25: T5 done: `pnpm discover` (`src/discover/cli.ts`) defaults to `--limit 5`, `--budget 100`, `plugins/` as both index and output, and `.cache/discovery-state.json`; it writes the state through a temporary file and treats a state file that is not a JSON object as empty with a warning. The CLI tests cover AC6 and AC7; replacing INIT_CWD with the package root turned the AC7 test red. `pnpm test` passed 319 tests.
- 2026-10-25: T6 done: DESIGN.md's Function Families and Architecture describe `src/discover/`. Live read-only run (`--limit 3 --budget 20`, gh token, output in the session scratchpad) exited 0: 4 repos read, 3 entries written (aidenlx/zotlit, irism6/alphapulse, justanotherjurastudent/zotero_flexannotate), 1 refused with `no-release` and kept in the state file, no warnings. `pnpm test` and `pnpm check` pass.
- 2026-10-25: claim audit: not owed — internal tier.
- 2026-10-25: all tasks done, verify clean; status set to review.

## Decisions

## Review

Evidence at 9d9beb2, 2026-10-25: `pnpm test` 319 passed (9 files); `vitest run test/discover.test.ts --reporter=verbose` 9 passed; `pnpm check` 14 entries, 0 problems.

- AC1: "reads each repo of both topics' search pages once" passed on `test/fixtures/discover/search.json` (two `topic:zotero-plugin` pages joined by a Link header, one `topic:zotero-addon` page, example/both on both). The test collects one metadata request per reader call, which the reader makes for the owner/repo of the URL passed to it, and asserts that list equals the 7 distinct repos with no repeat.
- AC2: "does not read a repo the index lists, by a URL that differs in case, or one in the skip set" passed: Example/Second-Plugin (index URL example/second-plugin) and example/skipped are absent from the reads and reported as `in-index` and `in-skip-set`.
- AC3: "records a refused read and reads that repo again only when it was pushed or its record is old" passed (record holds pushedAt, failure `no-release`, checkedAt; same pushed_at not read, changed pushed_at read, 31 days later read); "records no read that failed with an HTTP error" passed (403 → `github-http-error`, state `{}`).
- AC4: "writes at most limit entries" passed (7 passing repos, limit 5, 5 written); "reads at most budget repos, newest pushed first" passed (7 candidates, budget 3, reads p7, p6, p5).
- AC5: "reports each repo it reads as written or with its failure name" passed: alpha written with id and repo URL, no-release `no-release`, clash `entry-exists`, unsafe `unsafe-id`, 6 read items.
- AC6: "writes nothing and keeps the state when a search request fails" passed: HTTP 503 on the addon search, exit 1, stderr names the URL and `HTTP 503`, no `out/` directory, state file byte-equal to before.
- AC7: "writes entries and the state under the caller's directory and prints the report" passed: relative `--out out --state state.json --limit 2` from a temp cwd wrote two entries and the state there, report lists both as written; `pnpm test` and `pnpm check` pass as above.
- Gate: `cairn_validate.py` exit 0, all checks passed; no principle changed, so no `cairn_impact` run; the generic profile's consistency-gate slot names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: the CLI writes the state before printing the report and does not catch a failed write, so a failure loses the report of entries on disk — fix now, fixed 14646ac: report printed first, a failed state write prints `cannot write <path>` and exits 1; an unreadable state file now exits 1 before any write.
- diff-bug #2: a `listEntries` error or a non-ReadFailure throw from the reader is not a named failure and loses the report mid-loop — fix now, fixed 14646ac: an unreadable index ends the run with `cannot read <root>`, and a reader throw becomes `unexpected-error`, not recorded.
- diff-bug #3: the written item lacks the version and declared range that M009's pull request body needs — fix now, fixed 14646ac: written items carry `version`, `strictMinVersion`, `strictMaxVersion`.
- diff-bug #4: `failure: string` drops the typed union — fix now, fixed 14646ac: `DiscoveryFailure` types it.
- diff-bug #5: with `--out` away from `plugins/` and a shared state file, a directory left in the output dir is recorded as `entry-exists` and hides the repo for 30 days — fix now, fixed 14646ac: `writeEntry`'s `entry-exists` and `write-failed` are not recorded; the index clash and `unsafe-id` still are.
- diff-bug #6: the search sends no sort, so best-match order can shift between pages, and nothing warns past the search's 1,000-result cap — fix now, fixed 14646ac: `sort=updated&order=desc`, and a warning when `total_count` passes 1,000.
- diff-bug #7: an unparseable `pushed_at` breaks newest-first order — fix now, fixed 14646ac: such an item is left out with a warning.
- diff-bug #8: a `checkedAt` in the future skips the repo until its next push — fix now, fixed 14646ac: a negative age reads the repo.
- diff-bug #9: the report does not say how many candidates the limit or budget left unread — fix now, fixed 14646ac: `unread` count.
- diff-bug #10: an option value is not checked, so `--out --state` takes `--state` as the directory — fix now, fixed 14646ac: a value that is empty or starts with `--` prints the usage.
- diff-bug #11: `plugins/` resolves against the process directory, so a run from outside the package root sees an empty index — fix now, fixed 14646ac: the index and default output resolve from the source file, as the state path does.
- diff-bug #12: concurrent runs share one `.tmp` name and the last writer wins — reject (edge): two local runs at once are outside the command's use, and the cost is re-reads; M009's concurrency group covers the workflow.
- diff-bug #13: state records are never pruned — fix now, fixed 14646ac: the new state keeps records only for repos the search found and the index lacks.
- diff-bug (c): the AC7 test's `meta.json`/`index.json` existence check repeats `writeEntry` coverage — reject (planned change): AC7 names the written files as its evidence.
- diff-bug (c): `toHaveLength(6)` repeats the in-index skip check — reject (false): it checks AC5's one item per read, a different property.
- diff-bug (c): untested branches (incomplete results, malformed items, next-page origin and repeat, missing items, unrecorded failures, CLI usage and limit errors, bad state file, index-side case) — fix now, fixed 14646ac: one test each, with the new fixes' branches.
- blame-history #1: download failures that an HTTP 429 or 503 can cause (`update-json-http-error` and others) are recorded for 30 days — follow-up: new row "Retry repos refused by a download error", since AC3 as written records every other reader failure.
- blame-history #2: `githubClient().get` is exported and sends the token to any URL — fix now, fixed 14646ac: `get` refuses a URL off the API host before any request, with a test.
- blame-history #3: `pnpm discover` writes into `plugins/` with no pull request, past the maintainer's approval — reject (planned change): the plan's scope writes entries with `writeEntry` like `pnpm add-plugin`, which the maintainer commits by hand; pull requests are M009.
- blame-history #4: the index is read from `plugins/` while entries go to `--out`, so a repo written there is re-read and refused — fix now, fixed 14646ac with diff-bug #5: that refusal is no longer recorded.
- blame-history #5: search pages have no byte cap — reject (false): the reader applies no cap to GitHub API pages by design, and the finding names no cap bypassed.
- prior-review #1: discovery feeds up to 100 untrusted repos a run into the unzip that holds about 4 s per crafted manifest — follow-up: absorbed into "Stop inflating past the declared size".
- prior-review #2: the run has no time budget — follow-up: absorbed into "Warn when the daily build degrades".
- prior-review #3: discovery writes reserved Windows names and case variants through `writeEntry` — follow-up: absorbed into "Catch stray and unportable entry files".
- prior-review #4: discovery drafts entries from prerelease manifests — follow-up: absorbed into "Read stable releases before prereleases".
- prior-review #5: the CLI uses system DNS, so rebinding stays open — follow-up: the parked row "Check addresses when the reader connects" already covers every reader call, unchanged.
- ripple #1: `test/support/preload-fixture.ts` names only the add-plugin and build tests — fix now, fixed 14646ac.
- ripple #2: `vitest.config.ts` omits the discover tests from those that start pnpm — fix now, fixed 14646ac.
- ripple #3: DESIGN.md Data sources and the ROADMAP row say the bot opens pull requests, which `pnpm discover` does not — follow-up: M009 T6 rewrites Data sources when the pull requests ship, and the row is that series' record.
- ripple #4: DESIGN.md's fixture sentence omits the discover fixtures — fix now, fixed 14646ac.
- ripple #5: DESIGN.md's reader family omits the `githubClient` export — fix now, fixed 14646ac.
- After the fixes: `pnpm test` 334 passed (the 9 tests the AC lines name among them, unchanged in what they assert); `pnpm check` 14 entries, 0 problems.
