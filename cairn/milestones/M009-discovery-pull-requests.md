# M009: Open a pull request for each new plugin

- **Status:** review
- **Priority:** high
- **Depends on:** M008
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the bot opens public pull requests that add entries to the published data
- **Branch/PR:** m009-discovery-pull-requests

## Goal

A daily workflow runs discovery and opens one pull request for each drafted entry, at most 5 per run, with the entry check's result in each pull request's body.

## Scope

**In:** a propose step in `src/discover/` that `pnpm discover --propose` runs. Before discovery reads, it lists
the repo's pull requests whose head branch starts with `discover/` and puts each repo whose bot pull request is
open, or closed without a merge, in the skip set. For each entry that discovery writes, it creates the branch
`discover/<owner>/<repo>` (lowercase) from the default branch, commits only that entry's two files, force-pushes, runs
`pnpm check` on the entry, and opens one pull request through the GitHub API. The workflow
`.github/workflows/discover.yml` runs it daily and on dispatch, with a `limit` input. README, CHANGELOG, and
DESIGN.md text for the bot.

**Out:** the one-URL issue form → M010, which also edits this milestone's CHANGELOG entry. CI runs on the bot's
pull requests: the built-in token starts none, and the user chose the check result in the body over a personal
token. Reading stable releases before prereleases → candidate row "Read stable releases before prereleases".

## Acceptance criteria

- [x] AC1: Given a recorded pull-request list that holds one open, one closed-unmerged, and one merged pull
      request with `discover/<owner>/<repo>` head branches, `pnpm discover --propose` puts the first two repos
      in the skip set and does not read them; a test asserts both repos are skipped and absent from the reads.
- [x] AC2: For each entry that discovery writes, the propose step force-pushes the branch
      `discover/<owner>/<repo>`, whose one commit on top of the default branch adds `plugins/<id>/meta.json`
      and `plugins/<id>/index.json` and no other path, so a branch of that name left by an earlier run is
      replaced. It then sends one create-pull-request request with that head and the default branch as base.
      A run sends at most `--limit` such requests, 5 by default. A test in a temporary git repo with a bare
      remote and a fake pull-request API runs 7 passing repos, one of whose branches already exists on the
      remote with another commit, and asserts 5 requests, the 5 branches, and each branch's changed paths.
- [x] AC3: Each pull request body names the repo URL, the plugin version, the declared Zotero range, and the
      exit status and the full output of `pnpm check` run on a directory that holds only that entry; a test
      asserts these five items in the body sent for a fixture entry.
- [x] AC4: When the push or the pull-request request fails for one entry, the run goes on to the next entry
      and then exits 1 with a message naming each failed entry and its error. A test with 3 entries fails the
      push for the first and the request for the second, and asserts the exit code, both names and errors in
      the message, and the request sent for the third.
- [x] AC5: `.github/workflows/discover.yml` runs on a daily schedule and on `workflow_dispatch` with a `limit`
      input that defaults to 5, grants `contents: write` and `pull-requests: write` and no other permission,
      names the concurrency group `discover`, and passes `GITHUB_TOKEN` to the run. An
      `actions/cache/restore` step with `restore-keys` on a fixed prefix comes before the run, and an
      `actions/cache/save` step with `if: always()` and a key that contains `github.run_id` comes after it; a
      parse of the file with Ruby's YAML shows each of these.
- [x] AC6: README describes what the bot proposes, how often, the default limit of 5, and that a closed bot
      pull request means the bot does not propose that owner/repo name again; CHANGELOG has one entry for the
      bot under `## Unreleased`. `pnpm test` and `pnpm check` pass.
- [ ] AC7: After the merge, and after the user turns on the repo setting that lets Actions create pull
      requests, a dispatch of `discover.yml` on the default branch with `limit` 1 that writes an entry opens
      one pull request whose body carries the check output.

## Coverage

- AC1 → T1, T3
- AC2 → T2, T4
- AC3 → T2, T4
- AC4 → T2, T4
- AC5 → T5
- AC6 → T6
- AC7 → T7

## Tasks

- [x] T1: Record a pull-request list fixture with open, closed-unmerged, and merged `discover/` heads, and write
      the failing skip-set test.
- [x] T2: Write failing propose tests against a temporary git repo with a bare remote and a fake GitHub API
      fetch, for AC2–AC4.
- [x] T3: Implement the pull-request list read (paginated, `state=all`) and the skip set.
- [x] T4: Implement the propose step: branch, commit as `github-actions[bot]`, push, `pnpm check` on the entry,
      the body, the limit, and per-entry failures.
- [x] T5: Write `.github/workflows/discover.yml`: a schedule at another hour than `build.yml`, dispatch with
      `limit`, the two permissions, the `discover` concurrency group, a 30-minute limit, and the cache restore
      and save steps; check it with `ruby -ryaml` (Psych reads the `on:` key as `true`).
- [x] T6: Write the README section, the CHANGELOG entry, and DESIGN.md's Data sources and Architecture text;
      run the verify slot.
- [ ] T7: After the merge, ask the user to turn on the setting, dispatch with `limit` 1 (again with a larger
      budget if the run writes no entry), and record the run and pull request URLs in the Review section.

## Work log

- 2026-10-25: created by /milestone-plan.
- 2026-10-25: tier check: not run — work named at the question set.
- 2026-10-25: idea vet: three concerns posed at the question set — a first run could open hundreds of pull requests (answer: at most 5 per run); pull requests from the built-in Actions token start no CI run and need a repo setting turned on (answer: built-in token, check result in each body); a closed repo would come back each day (answer: skip it for good).
- 2026-10-25: question set: may the bot open pull requests with the built-in Actions token — yes; the user turns on "Allow GitHub Actions to create and approve pull requests" (off on 2026-10-25) before AC7's dispatch.
- 2026-10-25: question set: how many pull requests per run — at most 5.
- 2026-10-25: question set: what a closed, unmerged bot pull request means — the bot skips that repo for good.
- 2026-10-25: question set: permission for AC7's dispatch, which opens one real pull request — covered by the bot-token answer.
- 2026-10-25: feature series: M008 -> M009 -> M010.
- 2026-10-25: plan gate chose the built-in token with the check result in the body over a personal access token secret, at the user's answer; falsified by bot pull requests that need CI results the body cannot carry.
- 2026-10-25: plan gate chose the propose logic in TypeScript with git through child_process over a shell script in the workflow or a third-party pull-request action, because it can be tested and adds no dependency; falsified by git behavior on the runner that the temporary-repo test cannot reproduce.
- 2026-10-25: this milestone changes what users see (new entries arrive as pull requests), so its CHANGELOG entry is the series' one entry and M010 edits it.
- 2026-10-25: criteria audit (full mode, fresh Opus reader) returned 8 findings, all fixed: AC2's limit reads "`--limit`, 5 by default"; AC2 force-pushes the bot branch, because a branch left after a failed request would be rejected as a non-fast-forward on every later run; AC4 plants both failure points; AC3 counts five items and runs the check on a directory with only that entry, since `pnpm check` reads every entry under its root; AC5 names separate restore and save steps with `if: always()` and a run-id key, since cache keys cannot be overwritten; AC6 says "owner/repo name", since a renamed repo comes back; AC7 conditions on a run that writes an entry, and its recording act moved to T7.
- 2026-10-25: plan gate chose force-pushing `discover/` branches over deleting the branch after a failed request, because a force-push also repairs a branch left by a run that was cut off; falsified by a person pushing their own commits to a `discover/` branch.
- 2026-10-25: lessons used: 2026-10-25 (M006) Ruby YAML to parse a workflow; 2026-10-25 (M002) the fixture preload; 2026-10-25 (M002) `--dir` for pnpm from a temp dir; 2026-10-25 (M003) Vitest `hookTimeout`.
- 2026-10-26: implement started; branch m009-discovery-pull-requests cut from main at e61a5f7.
- 2026-10-26: implementation choice: the propose step builds each commit with git plumbing (a temporary index file, `commit-tree`, push of the commit to the branch ref), so it never checks out a branch or changes the working tree; the git directory is the caller's directory (`INIT_CWD`), as for other relative paths.
- 2026-10-26: implementation choice: a pull request counts toward the skip set only when its head repo is the index repo itself, so a fork's pull request with a `discover/` branch cannot block a plugin.
- 2026-10-26: implementation choice: with `--propose`, discovery writes entries to a temporary directory unless `--out` is given, the index repo comes from `GITHUB_REPOSITORY`, and the default branch from the repo's API record; `githubClient` gains a `post` method for the create request.
- 2026-10-26: minor amendment: each failing-test task is checked off in the same commit as the task that makes it pass (T1 with T3, T2 with T4), so no checkpoint carries a red suite.
- 2026-10-26: T1, T3: `test/fixtures/discover/pulls.json` (two pages) and the `pnpm discover --propose` skip test, red first on the unknown flag; `skipSet` and `proposeRun` in `src/discover/propose.ts`, `--propose` in the CLI; a planted defect (closed-unmerged not skipped) turned the test red; verify green (335 tests, 14 entries).
- 2026-10-26: T2, T4: the propose code landed with T3, so T2's tests were not red first; instead planted defects (push without `--force`; stop at the first failed entry) each turned one test red. Tests in `test/propose.test.ts` for AC2 (in-process, 7 repos, pre-existing branch), AC3 (real `pnpm check` plus a `body` case with a failed check), AC4 (`pnpm discover --propose` with a pre-receive hook and a 422); the fixture fetch answers `<METHOD> <url> #<n>` keys and the preload logs requests to `ZPI_REQUESTS`; verify green (339 tests, 14 entries).
- 2026-10-26: implementation choice: the propose step runs the check before it pushes, so a check that cannot run leaves no branch; `pnpmCheck` lives in `propose.ts` so tests run the real one.
- 2026-10-26: T5: `.github/workflows/discover.yml` at 14:43 UTC (build.yml runs at 06:17), `actions/cache/restore@v6` and `save@v6` (v6.1.0 is the newest release, read with `gh api`), cache key carries `run_id` and `run_attempt` so a re-run does not collide; the limit reaches the command through an env var, `inputs.limit || 5`; a `ruby -ryaml` parse shows the schedule, the `limit` input (default 5), the two permissions, the `discover` group, the 30-minute limit, and the restore and save steps.
- 2026-10-26: T6: README "Finding new plugins" (with `pnpm discover` itself, which M008 left to this milestone) and "Pull requests from the bot"; one CHANGELOG entry; DESIGN Data sources, Function Families, and an Architecture bullet. The AC2 test moved to `pnpm discover --propose` with no `--limit`, because the in-process run passed the limit and so did not test the default of 5; a planted default of 6 turned it red; verify green (339 tests, 14 entries).
- 2026-10-26: claim audit: 65 claims read, 5 corrected — CHANGELOG.md, README.md, src/discover/cli.ts, src/discover/propose.ts (2); the false one was a defect: a manifest value with a blank line ended its code span in the pull request body, so `code()` now collapses whitespace, with a test that fails without it; the same reader re-read the five and found all true.
- 2026-10-26: T7 is the post-merge live dispatch, left for /milestone-review; status set to review; verify green (340 tests, 14 entries).

## Decisions

## Review

- 2026-10-26: sync: origin/main at e61a5f7, the branch's merge base, so no merge was needed. Copilot round off (no header line in `cairn/PROFILE.md`).
- AC1 evidence (2026-10-26): `test/propose.test.ts` "does not read a repo whose bot pull request is open or was closed without a merge" passed. It runs `pnpm discover --propose` against `test/fixtures/discover/pulls.json` (open, closed-unmerged on page 2, merged, fork, and non-discover heads) and asserts `example/open-pr` and `example/closed-pr` are `in-skip-set` and absent from `read`, while `example/merged-pr` and `example/fork-pr` are read. A planted defect (closed-unmerged not skipped) turned it red at implement.
- AC2 evidence (2026-10-26): "pnpm discover --propose pushes one branch with one entry and sends one request for each entry, at most 5 by default" passed. A temp checkout with a bare remote and 7 passing repos, run with no `--limit`; `discover/example/p7` was pre-pushed with a stray commit. Asserted: 5 POSTs to `/repos/example/index/pulls` with heads p7..p3 and base `main`; exactly those 5 `refs/heads/discover/*` on the remote; each branch's parent is `main` and its diff is the entry's `index.json` and `meta.json` only; the checkout stays on `main` with a clean status. Planted defects (no `--force`; default limit 6) each turned it red.
- AC3 evidence (2026-10-26): "puts the repo URL, version, declared range, and the check's status and output in the body" passed: the real `pnpm check` ran once, on a directory whose output reads "checked 1 entries in …, 0 problems", and the sent body holds `- Repo: https://github.com/example/alpha`, the version ` 1.0.0 `, `strict_min_version ` 7.0 `, strict_max_version ` 8.* ``, "exited with status 0", and that output verbatim in a fence. Two `body` tests also passed: a failed check (status 1, output with a backtick run, a fence of 4) with a missing max bound ("not declared"), and a version with a blank line kept in one code span.
- AC4 evidence (2026-10-26): "goes on past a failed push and a refused request, then exits 1 naming both" passed: `pnpm discover --propose` with 3 entries, a pre-receive hook refusing `discover/example/q3`, and a 422 for the first request. Exit 1; stderr names `example/q3 (q3@example.org): git push failed: … refused by the test hook` and `example/q2 (q2@example.org): POST …/pulls returned HTTP 422: Validation Failed; A pull request already exists`; the request log shows POSTs for q2 then q1, and `proposed` lists q1. A planted stop at the first failure turned it red.
- AC5 evidence (2026-10-26): `ruby -ryaml` parse of `.github/workflows/discover.yml`: `on` (read as `true`) has `schedule` cron `43 14 * * *` and `workflow_dispatch` input `limit` with default 5; `permissions` is exactly `contents: write`, `pull-requests: write`; concurrency group `discover`; the run step's env has `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}`; `actions/cache/restore@v6` with `restore-keys: discovery-state-` comes before the run, and `actions/cache/save@v6` with `if: always()` and key `discovery-state-${{ github.run_id }}-${{ github.run_attempt }}` after it.
- AC6 evidence (2026-10-26): README "Pull requests from the bot" (README.md:151) says what the bot proposes, "once a day", "A run opens at most 5 pull requests, or the number that `--limit` gives" (:158-159), and "If you close a bot pull request without a merge, the bot does not propose that owner/repo name again" (:168-169). CHANGELOG has one bot entry, CHANGELOG.md:53, under its only heading `## Unreleased`. `pnpm test` 340 passed; `pnpm check` 14 entries, 0 problems.
- consistency gate (2026-10-26): `cairn_validate.py` exit 0, all checks passed; no DESIGN principle changed, so no `cairn_impact` run; the generic profile names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: two open bot pull requests can add the same plugin id, since the id check sees only `plugins/` — fix now (the open bot pull requests' files are read, and discovery refuses those ids without recording them)
- diff-bug #2: a failure that recurs each run (a branch name git refuses, such as one with a part starting with `.` or ending in `.lock`; a body over GitHub's limit) uses a slot and fails the workflow daily — follow-up, new row "Stop retrying a failing bot pull request"
- diff-bug #3: a dispatch on another branch reads that branch's `plugins/` but bases pull requests on the default branch — fix now (job `if:` runs only on schedule or the default branch)
- diff-bug #4: the index and the base commit go stale during a run, so an entry merged to main mid-run is proposed again — reject, edge: only a merge to the default branch during the minutes of a run reaches it, and the pull request it gives shows as conflicting or empty on GitHub
- diff-bug #5: `inputs.limit || 5` turns a dispatched 0 into 5 — fix now (the input reaches `--limit` as given, and an empty input leaves the CLI default)
- diff-bug #6: creating a pull request right after a push can briefly 422 — reject, edge: only GitHub's own lag after a push reaches it (not observed), and the effect is one failed entry, exit 1, and a retry next run
- diff-bug #7: persisted checkout credentials expose a write token to `pnpm install` and the XPI parser — reject, false: the run step already holds `GITHUB_TOKEN` in its env, the parser runs no plugin code, and pnpm runs no dependency build scripts that `package.json` does not allow (it allows none)
- diff-bug #8: the body shows the runner's temp path in the check output — reject, style
- diff-bug #9: `.slice(0, limit)` changes nothing — reject, style
- diff-bug #10: an empty `strict_max_version` prints an empty code span — reject, false: the reader refuses it as `manifest-invalid`, and `stringOrUndefined` drops an empty version or min version
- diff-bug #11: the CLI tests' real check runs under the fixture preload and can fail unseen — reject, false: no assertion in those tests reads the check result, and the AC3 test, which does, runs the check without the preload
- diff-bug #12 (test floor): the status-1 body assertion repeats a path — reject, false: with only 0 tested, a constant "0" would pass
- diff-bug #13 (test floor): `arrayContaining` on `skipped` is weaker than exact — fix now
- diff-bug #14 (test floor): the AC3 regex re-tests the checker's summary — reject, false: "checked 1 entries" is how the test shows the directory holds only that entry, which AC3 names
- diff-bug #15 (test floor): the per-branch loop repeats one path — reject, planned change (AC2 names each branch's changed paths)
- diff-bug #16 (test floor): no tests for the pull-list failure, a missing default branch, a failed fetch, a bad `GITHUB_REPOSITORY`, or a non-JSON create body — fix now (5 tests)
- diff-bug #17: README has an unwrapped long line — fix now
- blame-history #1: `post` follows redirects, so a 307 from the API would resend the body elsewhere — fix now (`redirect: "error"`)
- blame-history #2: the state is written after pull requests open, so a failed write leaves them with no state — reject, false: a lost state costs only extra reads, and the skip set, not the state, keeps pull requests from repeating
- prior-review #1: README says a rate-limit or network refusal is read again next run, but a download host's HTTP error (`update-json-http-error`) is recorded; the line is also unwrapped — fix now (the sentence names GitHub API errors and failed requests only)
- prior-review #2: a 30-minute kill loses the run's state, so the same first repos are read again daily — follow-up, new row "Bound the time of a discover run"
- prior-review #3: the body does not flag a draft from a prerelease — reject, planned change: Scope Out sends prereleases to "Read stable releases before prereleases"
- prior-review #4: child processes get `GITHUB_TOKEN`, and the workflow grants write for the whole job — reject, false: git and `pnpm check` send no request with that variable, and the workflow has one job
- prior-review #5: `mkdtemp` outside a `try` gives an unhandled rejection — fix now (both calls now report a message)
- prior-review #6: no timeout on the git and `pnpm check` spawns — follow-up, absorbed into the new row "Bound the time of a discover run"
- prior-review #7: `actions/cache/save` with `if: always()` may fail on a missing file — reject, false: v6.1.0's `saveImpl` catches errors and logs them as warnings
- ripple #1: DESIGN says `ci.yml` runs on every push and pull request — fix now
- ripple #2: DESIGN's discover usage lacks `[--propose]` — fix now
- ripple #3: README "The daily workflow" reads as the only daily workflow — fix now (heading "The daily build")
- ripple #4: DESIGN says `src/upstream/` only reads the API — fix now
- ripple #5: the `.cache/` lines do not name the state file — reject, false: neither line claims to list everything in `.cache/`
- ripple #6: the ROADMAP topic-search candidate row still describes the pull-request bot — fix now at step 9 hygiene, which narrows the row to the issue form
- ripple #7: `src/build/cli.ts` says "the daily job" — fix now
- 2026-10-26: one planted-defect run (pending-id check removed) also failed the AC4 test after more than 5 minutes; unplanted runs then passed 12 of 12 in 7.5 s and the full suite 346 of 346 twice, so it did not recur.
- re-check after the fix-now work (2026-10-26): AC1's test now asserts `skipped` exactly (closed-pr, open-pr) and passed with the fixture's new files page for #11; a fresh `ruby -ryaml` parse shows AC5's items unchanged plus the job `if:`; `pnpm test` 346 passed; `pnpm check` 14 entries, 0 problems; `cairn_validate.py` all checks passed.
- AC7: not yet run; it follows the merge, the user's setting change, and a `limit` 1 dispatch (T7).
