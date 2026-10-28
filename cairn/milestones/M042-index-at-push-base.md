<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M042: Check the index at the push base

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — people who file "Add a plugin" issues read the bot's answer, and the maintainer reviews the bot's pull requests
- **Branch/PR:** m042-index-at-push-base

## Goal

The write step of `pnpm propose` skips an entry that the default branch already holds at the commit it builds on, not only one that its checkout holds.

## Scope

**In:** In both write paths, `proposeHandoff` (discover run) and `issueAnswer`
(issue run), fetch the default branch before the skip checks, read `plugins/`
at the fetched commit with git, run the index checks against it, and build
each commit on that same commit. The write paths stop reading `plugins/` from
the checkout. A fetched commit with no `plugins` path fails the write step.
README, DESIGN.md, the code comments in `src/discover/`, and CHANGELOG.md say
so.

**Out:** The read steps (`indexed` at `src/discover/discover.ts:118` and
`src/discover/issue.ts:80`) keep reading the checkout, since the write step
now catches what they miss; a missing `plugins/` there stays in row "Fail
issue runs with no plugins folder". Runs that a newer run cancels stay in row
"Answer issues whose run was canceled". The time of the whole discover
workflow stays in row "Bound the whole discover workflow's time".

## Acceptance criteria

- [ ] AC1: In a discover run, `proposeHandoff` skips as `in-index`, with no
      push and no create request, an entry that the default-branch commit it
      fetched holds under `plugins/` and the working tree of its checkout
      (`gitDir`) does not: by repo, when that commit's
      `plugins/<dir>/meta.json` has a `repoUrl` whose lowercase owner/repo
      (`repoName`) is the entry's repo, and by id, when that commit has a
      `plugins/<dir>` whose name equals the entry's id in any letter case; a
      `meta.json` that is not JSON counts by its directory name alone. Each
      pushed commit's parent is the commit whose `plugins/` the skip check
      read. A failed fetch or read of that commit fails every entry of the
      handoff, `in-bot-pull` ones included. Tests in `test/propose.test.ts`
      show the repo case, the id case with a directory whose letter case
      differs from the entry's id, the non-JSON case, and the parent.
- [ ] AC2: In an issue run, `issueAnswer` checks the same fetched commit by
      the rules of AC1: when only that commit holds an entry whose
      `meta.json` names the issue's repo, the bot comments "The index
      already lists this repo in the entry `plugins/<dir>/`." and closes the
      issue as completed; when only that commit holds the id, the bot
      refuses with `entry-exists`. Neither case pushes a branch or opens a
      pull request. Tests in `test/issue.test.ts` show both cases, the id
      case with a directory whose letter case differs from the entry's id.
- [ ] AC3: When the fetched commit has no `plugins` path, the write step
      pushes nothing and opens no pull request: a discover run fails every
      entry of the handoff, `in-bot-pull` ones included, with an error that
      names the missing `plugins/` folder, and an issue run posts its "could
      not finish" comment with that error and no failure name, as for a
      failed push, and leaves the issue open. One test for each run kind
      asserts the error.
- [ ] AC4: README's write-step paragraph ("Before it pushes, …"), its
      paragraph on failed entries ("If the push or the pull request fails
      for one entry, …"), its list of bot failures in "Proposing a plugin
      with an issue", and DESIGN.md's write-step sentence say that the write
      step reads the index at the default-branch commit it fetched, and the
      two failure passages name the fetched commit with no `plugins/`. The
      search `tr '\n' ' ' < <file> | sed 's/  */ /g' | grep -o 'index in its
      [a-z ]*checkout'` over README.md, cairn/DESIGN.md, and each file in
      `src/discover/` prints nothing. CHANGELOG.md's Unreleased section has
      an entry stating the behavior of AC1 to AC3.
- [ ] AC5: `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check` exit 0.

## Coverage

- AC1 → T1, T2
- AC2 → T1, T3
- AC3 → T1, T2, T3
- AC4 → T4
- AC5 → T2, T3, T5

## Tasks

- [x] T1: In `src/discover/propose.ts`, move the git runner out of `propose`
      so the write paths share it, with its `gitMs` limit and token
      environment. Add a step that fetches the base and returns the commit
      (`FETCH_HEAD^{commit}`), and a reader of `plugins/` at a commit
      (`git ls-tree` for the directories, skipping names that start with
      `.` as `listEntries` does, and `git cat-file --batch` for each
      `meta.json`) that returns the `repos` and `ids` shape of `indexed`
      and fails when the commit has no `plugins` tree. `propose` takes the
      base commit instead of fetching.
- [x] T2: `proposeHandoff` fetches first, reads the index at the fetched
      commit, then runs the `in-index` and `in-bot-pull` checks; a failed
      fetch or read fails every entry. Drop its `root` option and the CLI's
      `root` for it. Give the remote's `main` in `test/support/git-checkout.ts`
      a `plugins/` tree, make `twoStep`'s default `gitDir` a checkout, and
      update the tests that relied on the fixture root. Add the AC1 and AC3
      discover tests, the AC1 ones with the entry pushed to the remote after
      the checkout was made.
- [x] T3: `issueAnswer` does the same after `botPulls` and `defaultBranch`,
      before `known`; a failed fetch or read posts the "could not finish"
      comment. Drop its `root` option. Add the AC2 and AC3 issue tests.
- [x] T4: Update README (the three passages of AC4), DESIGN.md's write-step
      sentence and its `propose` bullet, the comments at
      `src/discover/propose.ts:141` and `src/discover/issue.ts:143`, and add
      the CHANGELOG entry; run the AC4 search.
- [x] T5: Run `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check`.

## Work log

- 2026-10-28: created by /milestone-plan.
- 2026-10-28: tier check: not run — work named at the question set.
- 2026-10-28: idea vet: no concern for this work. The prior vet of "Bound the build's report issue read" found three (a page cap drops the newest reports or lets a flood stop deploys; 1 report issue and 2–3 minute builds today; a total limit changes only the failure message); at this set the user picked this row instead and left that row as it is.
- 2026-10-28: lessons used: 2026-10-25 (M001, used M041), 2026-10-27 (M022, used M040), 2026-10-26 (M018, used M041, corrected M020), 2026-10-28 (M036, used M041).
- 2026-10-28: question set: go on to implementation after the plan — yes (answered at the first run of this plan, same session).
- 2026-10-28: collision check: row "Check the index at the push base" absorbed in full (from M011 review); M011 (done) built the read/write split this changes; no D-entry conflicts (D-001 to D-021 read by heading, D-020 whole).
- 2026-10-28: inbox sweep: 0 open issues; 1 open PR (#57, a bot discovery PR) with no overlap.
- 2026-10-28: plan gate chose reading `plugins/` at the fetched commit with `git ls-tree` and `git cat-file` over the GitHub contents API at that commit, because git already holds the fetched objects and the API costs one request per entry from the shared budget; also over checking out the base in the working tree, which `propose` must leave unchanged; falsified by a run log where the git read of 42-plus entries passes the 2-minute git limit.
- 2026-10-28: criteria audit (full mode, fresh Opus reader): 10 findings. Taken: AC1 names `gitDir` and `repoName`; id tests use a different letter case (AC1, AC2); AC1 binds each pushed commit's parent to the read commit; AC1 states that a failed fetch fails `in-bot-pull` entries too; AC2 takes AC1's rules; AC3 names no failure name for the issue comment and every entry failing; AC3 narrowed to "no `plugins` path" (a `plugins` file is not promised); AC4 adds `src/discover/` to the search and the two README failure passages. No finding on AC5 or on proportionality. T2 records the fixture changes the audit found (`test/support/git-checkout.ts` has no `plugins/`; `twoStep`'s default `gitDir` is no checkout).
- 2026-10-28: ROADMAP reached its 60-line cap with the M042 row, so the plan pruned the archived M041 row, as M041's plan pruned M040's.
- 2026-10-28: implement started on branch m042-index-at-push-base, cut from main at d51ad72.
- 2026-10-28: T1–T3 done in one checkpoint, since T1 alone leaves the suite red. `fetchBase` (exported from `src/discover/propose.ts`) fetches, takes `FETCH_HEAD^{commit}`, and reads `plugins/` with one `git ls-tree -r -t -z` and one `git cat-file blob` per `meta.json`; `PushBase` carries branch, commit, and index into `propose`, so the pushed parent is the read commit. `proposeHandoff` returns before any fetch when the handoff has no entries, as `propose` did before. Choices: the missing-folder error reads "the default branch <name> at <sha> has no plugins/ folder"; a `cat-file` error is not caught (only a `meta.json` that is not JSON counts by id alone), so a git failure there fails the run rather than dropping a repo; `issueAnswer` keeps its order (pull requests, default branch, then the fetch).
- 2026-10-28: minor amendment to T2: `twoStep`'s default `gitDir` stays a plain directory, because the test "names every entry as failed when the default branch cannot be fetched" depends on it; every other `twoStep` call already passes a checkout. `checkout()` in `test/support/git-checkout.ts` now commits `plugins/` (a copy of a given folder, or `.gitkeep`), and gains `pushFromClone` and `pushAll`; issue tests that read `TREE` get a checkout holding `TREE`.
- 2026-10-28: the 5 new tests (3 issue, 2 discover) fail on main's code with `root` set to the checkout's `plugins/`: the discover case proposes alpha, beta, and gamma again, and the issue cases go on to the push instead of answering. Full `pnpm test` 934 passed, 1 skipped; `pnpm check` 42 entries, 0 problems.
- 2026-10-28: T4 done: README's write-step paragraph, failed-entry paragraph, and issue-run failure list; DESIGN.md's write-step sentence and `propose` bullet; CHANGELOG entry. The two code comments were rewritten in T1–T3. The AC4 search over README.md, cairn/DESIGN.md, and `src/discover/*.ts` prints nothing. The simple-english hook's other README and CHANGELOG hits are in older text and were left alone.
- 2026-10-28: T5 done: `pnpm test` exit 0 (934 passed, 1 skipped), `pnpm check` exit 0 (42 entries, 0 problems).
- 2026-10-28: claim audit: 47 claims read, 3 corrected — src/discover/propose.ts (the `fetchBase` comment said an empty index is never read; an empty `plugins/` still reads as empty), README.md (an entry merged during the run counts; only one merged before the one fetch does), test/issue.test.ts (the `answer` comment said the checkout's main gets the change; the remote's does). The reader re-read the three and found them true; README line rewrapped and a lost space in test/propose.test.ts restored. `pnpm test` 934 passed, 1 skipped; `pnpm check` 0 problems.

## Decisions

## Review
