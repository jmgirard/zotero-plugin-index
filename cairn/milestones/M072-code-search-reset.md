# M072: Wait for GitHub's code search reset

- **Status:** review
- **Priority:** high
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the index's plugin list and the discover report change
- **Branch/PR:** m072-code-search-reset

## Goal

A code search request that GitHub's rate limit refuses with a named wait is sent once more after that wait, so a single refusal no longer ends a query.

## Scope

**In:**
- `githubClient().get` passes each answer's `x-ratelimit-remaining`,
  `x-ratelimit-reset`, and `retry-after` values to the caller, also on a
  failed answer.
- `Clock` gains `wall()`, epoch milliseconds, which moves with `sleep` as
  `now()` does, since `x-ratelimit-reset` is in epoch seconds.
- `searchCode` holds every query back until a named wait ends, and sends a
  refused page once more. The pacing of 10 requests in any 60 seconds and
  the 8-minute cutoff stay.
- README, DESIGN, and CHANGELOG text. The CHANGELOG edits the unreleased
  code-search entry.
- After the merge, run `Discover plugins` once (limit 100, budget 300) and,
  if it writes entries, `Merge bot pull requests` with `wait_hours` 0.
  Never while `Build data` runs. Record each run id, any code search 403
  or 429, and the counts (question set).

**Out:**
- Rotating the query order, best-match page shifts, and repos made to
  flood a query: the candidate row "Harden code search against limits".
- More than one retry of a page: a second refusal stops the query
  (question set).

## Acceptance criteria

- [x] AC1: After a code search answer that names a wait, the run sends no code search request, for any query, before that wait ends plus 1 second. An answer names a wait when it has `x-ratelimit-remaining: 0` and an `x-ratelimit-reset` in epoch seconds, or a `retry-after` that is a non-negative whole number of seconds; when both are present, the later end counts. The wait is read on `Clock.wall()`. Tests in `test/discover.test.ts` show this for `x-ratelimit-remaining: 0` on the third answer of a run, and on the last page of the first query, where the next request is the second query's first page.
- [x] AC2: A code search request answered with HTTP 403 or 429 that names a wait is sent once more after the wait of AC1. A 403 or 429 that names no wait, and an answer with any other status, is not sent again. Tests in `test/discover.test.ts` show: (a) a 403 naming `retry-after` on a later page of the first query, and a 429 naming `x-ratelimit-remaining: 0` with a reset on the first page of the second query, each followed by a read of that page's repos and of the query's later pages; (b) a page whose second request fails in any way stops its query with the warning "the code search for <query> read <n> pages and stopped, since its request failed: …"; (c) a 403 with `retry-after: abc`, a 401 with `retry-after: 1`, and a 502 with `retry-after: 1` are each sent once.
- [x] AC3: A wait of AC1 that would end 8 minutes or more after the run starts sends no request: each query not finished stops with the cutoff warning, and the run then reads the candidates. A test in `test/discover.test.ts` shows this for a reset 10 minutes after the run starts.
- [x] AC4: The retry of AC2 counts toward the limit of 10 code search requests in any 60-second window. A test in `test/discover.test.ts` in which the tenth request in under 60 seconds gets a 403 with `retry-after: 1` shows the retry sent no sooner than 60 seconds after the first request.
- [x] AC5: README's "Finding new plugins", `cairn/DESIGN.md`'s "Data sources and contribution" item 1 and its discovery Architecture item, and CHANGELOG.md's unreleased code-search entry say that the run waits for the time that `retry-after` or `x-ratelimit-reset` names before its next code search request, and sends a refused page once more. The verify slot is clean: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1, T2
- AC2 → T1, T2
- AC3 → T2
- AC4 → T2
- AC5 → T3

## Tasks

- [x] T1: In `src/upstream/reader.ts`, return each answer's rate-limit values from `githubClient().get` and carry them on its `ReadFailure`. Add `wall()` to `Clock` and the tests' fake clock. Let `fixtureFetch` answer the nth GET of one URL from `<url> #<n>`.
- [x] T2: In `searchCode`, keep one hold time for all queries and retry a refused page once. The read-before check of a next page must let that retry through. Add the tests of AC1 to AC4.
- [x] T3: Write the README, DESIGN, and CHANGELOG text of AC5, wrapped near 76 columns, and run the verify slot.

## Work log

- 2026-10-31: created by /milestone-plan.
- 2026-10-31: tier check: milestone — a change to running code that needs a choice of approach.
- 2026-10-31: idea vet: gap — how many retries a page gets; another reading (until the cutoff) fits, so the question set asked: once. No flaw.
- 2026-10-31: lessons used: 2026-10-25 (M001), 2026-10-26 (M010), 2026-10-27 (M030), 2026-10-31 (M070).
- 2026-10-31: cause: a replay with a personal token sent 10 code search requests in 11 s (`x-ratelimit-remaining` 0, `x-ratelimit-reset` 1793473105); the 11th, 60.001 s after the first as the pacing sends it, got 403 "API rate limit exceeded" with the same reset; 5 s later the same request got 200. The backfill runs 41226328819 to 41230388429 each got two or three such 403s.
- 2026-10-31: collision: absorbs item (1) of the candidate row "Harden code search against limits"; items (2) to (4) stay on it. No D-entry collides (D-042 read). Inbox sweep: 0 open issues, 0 outside pull requests.
- 2026-10-31: plan gate chose waiting for the time the rate-limit headers name over even spacing of one request every 6.5 s, because GitHub's window ends at the reset it names and an even spacing still depends on where that window starts; falsified by a code search 403 or 429 whose wait the run honored.
- 2026-10-31: criteria audit (full, fresh Opus reader): 15 findings; 12 taken (a wait holds every query, headers from every answer, `wall()` moving with `sleep`, varied header, status, page, and query, odd `retry-after` values, the failed-retry warning, the pacing test placing the retry where it can break the limit, AC5's wording), 3 answered (the post-merge run stays in Scope, as it cannot be shown before the merge; no criterion binds an instrument; proportionality fine), and the read-before check of a retried page put in T2.
- 2026-10-31: question set: retries — once per page. Scope — waits only, no query rotation. After the merge, one `Discover plugins` run (limit 100, budget 300) and a merge run if it writes entries — yes.
- 2026-10-31: implement started; branch m072-code-search-reset cut from main at c68c78c.
- 2026-10-31: choice: `rateLimitOf` in `src/upstream/reader.ts` reads the three headers as non-negative whole numbers (others left out); `get` returns them as `rateLimit`, and an HTTP error answer's `ReadFailure` carries `status` and `rateLimit`. The tests' fake clock starts `wall()` at 2026-10-31T18:00:00Z.
- 2026-10-31: T1 done: rate-limit values, `Clock.wall()`, and `fixtureFetch`'s `<url> #<n>` GET key; tested through T2. `pnpm test` 1733 passed, `pnpm check` 669 entries, 0 problems.
- 2026-10-31: choice: a named wait from any answer, a failed one included, moves the one hold time; only a 403 or 429 with a named wait retries, and a retry skips the next-page checks, which its page already passed.
- 2026-10-31: T2 done: hold and retry in `searchCode`, 11 tests in "a rate-limit wait" (8 failed before the code, the 3 no-retry cases passed before and after). Plants turned them red: no extra second (4 failed), a retry for any status (2), `retry-after` ignored (5). `pnpm test` 1744 passed, `pnpm check` 0 problems.
- 2026-10-31: T3 done: README "Finding new plugins", DESIGN item 1 and the discovery Architecture item, and the unreleased CHANGELOG code-search entry name the wait and the one retry. `pnpm test` 1744 passed, `pnpm check` 0 problems.
- 2026-10-31: claim audit: 31 claims read, 6 corrected — CHANGELOG.md, src/discover/discover.ts, test/discover.test.ts; the same reader re-read them once and found five correct and the `searchCode` header comment ambiguous, which took its suggested wording; a 200 answer whose body fails loses its headers, left as is (the reader comment names only parsed bodies and HTTP errors).
- 2026-10-31: implement done; status review. `pnpm test` 1744 passed, `pnpm check` 669 entries, 0 problems.

## Decisions

## Review

- 2026-10-31 evidence base: branch head e748c7a, containing origin/main c68c78c. `pnpm test` 1744 passed, 6 skipped; `pnpm check` 669 entries, 0 problems; the 13 rate-limit, pacing, and token tests named below pass (`vitest --reporter=verbose`).
- AC1: test/discover.test.ts "a rate-limit wait": "holds the next request until the reset that x-ratelimit-remaining 0 names, plus 1 second" sends pages 1 to 3 at wall +0 and page 4 at +31,000 ms after a third answer naming a reset 30 s on; "holds the next query's first request after x-ratelimit-remaining 0 on the last page of a query" sends q2's first page at +21,000 ms after q1's last page names a reset 20 s on; the "both headers, the later end counting" case (reset +10 s, `retry-after: 40`) sends it at +41,000 ms. Times are read on the fake clock's `wall()`. Pass.
- AC2: (a) "sends a page refused with a named wait once more…": q1 page 2 gets a 403 with `retry-after: 5` and is sent again at +6,000 ms; q2 page 1 gets a 429 with `x-ratelimit-remaining: 0` and a reset 70 s on and is sent again at +71,000 ms; the lookup asks about q1-p1 to p3 and q2-p1 and p2, and no code search warning is given. (b) "stops a query whose page fails again" with a 502 and with a second 403 naming a wait: three requests, the warning "the code search for q1 read 1 page and stopped, since its request failed: GET … returned HTTP 502" (or 403), and q1-p1 kept. (c) "sends a page answered with … only once" for a 403 with `retry-after: abc`, a 401 with `retry-after: 1`, and a 502 with `retry-after: 1`: one request each, with the stop warning. Pass.
- AC3: "sends no request for a wait that holds the next request to 8 minutes or more after the run starts, then reads the candidates": q1 page 1 names a reset 600 s on; no second code search request is sent; q1 (1 page) and q2 (0 pages) each get the warning "…stopped, since the run sends no code search request 8 minutes after it starts"; the run then writes example/q1-p1 and example/alpha. Pass.
- AC4: "counts a retry toward the limit of 10 code search requests in any 60 seconds": the first 10 requests go out at clock 0, the tenth (page 10) gets a 403 with `retry-after: 1`, and its retry (the 11th request) is sent at 60,001 ms or later; 13 requests, and no 10-request span under 60,000 ms. Pass.
- AC5: README "Finding new plugins" (lines 620-627) names `retry-after` and `x-ratelimit-remaining: 0` with `x-ratelimit-reset`, the hold until 1 second after the wait, and the one retry of a 403 or 429 page; DESIGN item 1 (210-212) and the discovery Architecture item (622-627) say the same; CHANGELOG's first Unreleased entry (11-17) says the same. Verify clean (base line). Pass.
- Consistency gate: `cairn_validate.py` passed every check; no DESIGN principle changed, so no `cairn_impact` run; the generic profile's consistency-gate slot names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: a retried 403 or 429 that then succeeds leaves no trace in the report, so the post-merge run cannot record it — fix now: a warning "the code search for <q> got HTTP <status> on page <n>, so it sends that page once more…", fixed 44b2718
- diff-bug #2: a reset already past on the runner's clock (clock ahead of GitHub's) sends the retry at once — fix now: the reset moves forward by how far the runner is ahead of the answer's `date`, and a past reset waits from now, with two tests, fixed 44b2718
- diff-bug #3: the hold wait has no extra millisecond against early timers, unlike the pacing — fix now, fixed 44b2718
- diff-bug #4: `retry-after` as an HTTP date names no wait — reject (planned change: AC1 defines a whole number of seconds)
- diff-bug #5: a secondary-limit 403 with no `retry-after` and `remaining` above 0 gets no retry — follow-up: item (5) of "Harden code search against limits"
- diff-bug #6: every `ReadFailure` now has `status` and `rateLimit` as own properties, undefined — reject (style: no strict-equality or serialization use of it)
- diff-bug #7: a 200's `retry-after` end is measured after the body read — noted (it errs long)
- diff-bug #8: a 401 or 502 naming a wait moves the shared hold, untested and undocumented — fix now: a test that the next query waits and a DESIGN sentence, fixed 44b2718
- diff-bug #9: README "Finding new plugins" has lines past 76 columns — fix now: rewrapped, fixed 44b2718
- diff-bug (a): no value changes across the awaits; clock readings are consistent — noted
- diff-bug (c) #1: AC4's test repeats `times[10] >= 60_000` inside its loop — reject (planned change: AC4 names that check)
- diff-bug (c) #2: the 401 and 502 cases, and the two fail-again cases, share paths — reject (planned change: AC2 names each)
- blame-history #1: the hold depends on the runner's clock against GitHub's reset — fix now: same as diff-bug #2, fixed 44b2718
- blame-history #2: a hold from any answer is wider than the retry, untested — fix now: same as diff-bug #8, fixed 44b2718
- blame-history #3: a 200 with `remaining: 0` now holds the next request — reject (planned change: AC1)
- blame-history #4: a far reset keeps the search waiting to the cutoff — reject (planned change: AC3 bounds it)
- blame-history #5: long lines in the `searchCode` header and the `ReadFailure` constructor — reject (style)
- prior-review #1: a redirected answer's headers can hold every query — follow-up: noted in "Check each redirect of GitHub API reads"
- prior-review #2: one long reset sleeps the search to the cutoff — reject (planned change: AC3)
- prior-review #3: fake-clock tests without `startedAt` mix two time origins — fix now: `runResult` starts the run at the test clock's `now()`, fixed 44b2718
- prior-review #4: a later change could skip the off-origin check on a retry — reject (false: no current defect; a retry reuses a checked URL)
- ripple #1: ROADMAP item (1) of "Harden code search against limits" still reads as open — reject (planned change: step 9 narrows the row)
- ripple #2: the `searchCode` header's first sentence says a failed request stops its query — reject (false: the next sentence of the same comment states the retry)
- ripple #3: DESIGN item 1 says a failed code search request warns, with no retry qualifier — fix now, fixed 44b2718
- ripple #4: README's list of request failures has no retry note — reject (false: the retry is stated just above the list)
- ripple #5: the `Clock` comment says it is in performance.now() time — fix now, fixed 44b2718
- ripple #6: the `clock` option comment omits Date.now() — fix now, fixed 44b2718
- ripple (added lines): DESIGN item 1 said any `x-ratelimit-reset` and any refusal — fix now: `x-ratelimit-remaining` 0 and a 403 or 429, fixed 44b2718
- After the fixes: `pnpm test` 1747 passed, `pnpm check` 0 problems; the skew and past-reset tests went red with each fix planted out.
