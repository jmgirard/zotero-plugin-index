# M009: Open a pull request for each new plugin

- **Status:** in-progress
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

- [ ] AC1: Given a recorded pull-request list that holds one open, one closed-unmerged, and one merged pull
      request with `discover/<owner>/<repo>` head branches, `pnpm discover --propose` puts the first two repos
      in the skip set and does not read them; a test asserts both repos are skipped and absent from the reads.
- [ ] AC2: For each entry that discovery writes, the propose step force-pushes the branch
      `discover/<owner>/<repo>`, whose one commit on top of the default branch adds `plugins/<id>/meta.json`
      and `plugins/<id>/index.json` and no other path, so a branch of that name left by an earlier run is
      replaced. It then sends one create-pull-request request with that head and the default branch as base.
      A run sends at most `--limit` such requests, 5 by default. A test in a temporary git repo with a bare
      remote and a fake pull-request API runs 7 passing repos, one of whose branches already exists on the
      remote with another commit, and asserts 5 requests, the 5 branches, and each branch's changed paths.
- [ ] AC3: Each pull request body names the repo URL, the plugin version, the declared Zotero range, and the
      exit status and the full output of `pnpm check` run on a directory that holds only that entry; a test
      asserts these five items in the body sent for a fixture entry.
- [ ] AC4: When the push or the pull-request request fails for one entry, the run goes on to the next entry
      and then exits 1 with a message naming each failed entry and its error. A test with 3 entries fails the
      push for the first and the request for the second, and asserts the exit code, both names and errors in
      the message, and the request sent for the third.
- [ ] AC5: `.github/workflows/discover.yml` runs on a daily schedule and on `workflow_dispatch` with a `limit`
      input that defaults to 5, grants `contents: write` and `pull-requests: write` and no other permission,
      names the concurrency group `discover`, and passes `GITHUB_TOKEN` to the run. An
      `actions/cache/restore` step with `restore-keys` on a fixed prefix comes before the run, and an
      `actions/cache/save` step with `if: always()` and a key that contains `github.run_id` comes after it; a
      parse of the file with Ruby's YAML shows each of these.
- [ ] AC6: README describes what the bot proposes, how often, the default limit of 5, and that a closed bot
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
- [ ] T5: Write `.github/workflows/discover.yml`: a schedule at another hour than `build.yml`, dispatch with
      `limit`, the two permissions, the `discover` concurrency group, a 30-minute limit, and the cache restore
      and save steps; check it with `ruby -ryaml` (Psych reads the `on:` key as `true`).
- [ ] T6: Write the README section, the CHANGELOG entry, and DESIGN.md's Data sources and Architecture text;
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

## Decisions

## Review
