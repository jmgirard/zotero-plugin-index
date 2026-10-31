# M072: Wait for GitHub's code search reset

**Status:** done (2026-10-31, PR #793 https://github.com/jmgirard/zotero-plugin-index/pull/793)

**Goal:** A code search request that GitHub's rate limit refuses with a named wait is sent once more after that wait, so a single refusal no longer ends a query.

**Outcome:** `rateLimitOf` (`src/upstream/reader.ts`) reads `x-ratelimit-remaining`, `x-ratelimit-reset`,
`retry-after` (whole seconds only), and `date`; `githubClient().get` returns them as `rateLimit`, and an HTTP
error's `ReadFailure` carries `status` and `rateLimit`. `Clock` gains `wall()` (epoch ms, moved by `sleep`).
`searchCode` keeps one hold time for all queries: an answer naming a wait, a failed one included, holds every
query until 1 s (plus 1 ms) after its latest end; a reset moves forward by how far the runner is ahead of the
answer's `date`, and a past reset waits from now. A 403 or 429 with a named wait warns and is sent once more;
a second failure stops the query. The 10-in-60-s pacing and the 8-minute cutoff stay, the retry counted.
`fixtureFetch` serves `<url> #<n>` for the nth GET. README, DESIGN, and the unreleased CHANGELOG entry.
Cause found by a replay with a personal token: request 11 at 60.001 s got 403 with the same reset, 200 at +5 s.

**Decisions:** none new. Hotfix #505 (before this milestone) gave code search the `CODE_SEARCH_TOKEN` secret.

**Review:** Criteria audit (full) 15 findings, 12 taken. Claim audit 31 claims, 6 corrected. Four-lens fan-out,
28 findings: 12 fixed (retry warning, `date`-based reset and past-reset floor, 1 ms hold margin, failed-answer
hold test, fake-clock start, stale DESIGN and comment lines), 2 to rows (secondary-limit 403 with no wait into
"Harden code search against limits"; headers of redirected answers into "Check each redirect of GitHub API
reads"), 12 rejected, 2 noted. CI passed. After the merge, discover run 41234283459 (`limit` 100, `budget`
300) read all five queries with no warning and wrote 2 entries; merge run 41234777412 merged both (index 671).
Candidate "Harden code search against limits" narrowed and parked. Lessons: 6 used M072, none captured.
