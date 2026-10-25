# M008: Find new plugin repos by topic search

- **Status:** in-progress
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

- [ ] AC1: Given recorded search responses with two pages for `topic:zotero-plugin` and one page for
      `topic:zotero-addon`, one repo appearing under both topics, `discover` reads each distinct repo in
      those responses exactly once; `test/discover.test.ts` asserts the list of repo URLs passed to the reader.
- [ ] AC2: The fixture repo whose search `html_url` differs from an entry's `repoUrl` only in letter case,
      and the fixture repo that the caller's skip set names, are not read, and the report lists each as
      skipped with its reason (in the index, or in the skip set); a test asserts both cases.
- [ ] AC3: After a read that fails with a reader failure other than `github-http-error` or `request-failed`,
      the state file holds that repo's `pushed_at` and failure name. A test runs `discover` three more times
      on that state: with the same `pushed_at` the repo is not read, with a changed `pushed_at` it is read, and
      with the same `pushed_at` but a record older than 30 days it is read. A test also asserts that a read
      failing with `github-http-error` leaves no record for that repo.
- [ ] AC4: A run writes at most `limit` entries and reads at most `budget` repos, in newest-`pushed_at`-first
      order. A test with more passing repos than `limit` asserts that the written count equals `limit`, and a
      test with more candidates than `budget` asserts that the read count equals `budget` and that the repos
      read are the `budget` newest by `pushed_at`.
- [ ] AC5: Each repo read gets one report item, which names either the written entry's id and repo URL or a
      failure name, which is the reader's failure name or `writeEntry`'s. A test asserts the item for one
      fixture repo of each of four outcomes: written, a reader failure, `entry-exists`, and `unsafe-id`.
- [ ] AC6: When a search request returns an HTTP error, the run writes no entry, leaves the state file as it
      was, and exits 1 with a message that names the request URL and the HTTP status; a CLI test asserts the
      exit code, the message, the absent entries, and the unchanged state file.
- [ ] AC7: `pnpm discover [--out <dir>] [--state <file>] [--limit <n>] [--budget <n>]` runs `discover` from
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
- [ ] T6: Add `src/discover/` to DESIGN.md's Function Families and Architecture; run one live, read-only
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

## Decisions

## Review
