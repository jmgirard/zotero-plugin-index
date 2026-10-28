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

- [x] AC1: In a discover run, `proposeHandoff` skips as `in-index`, with no
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
- [x] AC2: In an issue run, `issueAnswer` checks the same fetched commit by
      the rules of AC1: when only that commit holds an entry whose
      `meta.json` names the issue's repo, the bot comments "The index
      already lists this repo in the entry `plugins/<dir>/`." and closes the
      issue as completed; when only that commit holds the id, the bot
      refuses with `entry-exists`. Neither case pushes a branch or opens a
      pull request. Tests in `test/issue.test.ts` show both cases, the id
      case with a directory whose letter case differs from the entry's id.
- [x] AC3: When the fetched commit has no `plugins` path, the write step
      pushes nothing and opens no pull request: a discover run fails every
      entry of the handoff, `in-bot-pull` ones included, with an error that
      names the missing `plugins/` folder, and an issue run posts its "could
      not finish" comment with that error and no failure name, as for a
      failed push, and leaves the issue open. One test for each run kind
      asserts the error.
- [x] AC4: README's write-step paragraph ("Before it pushes, …"), its
      paragraph on failed entries ("If the push or the pull request fails
      for one entry, …"), its list of bot failures in "Proposing a plugin
      with an issue", and DESIGN.md's write-step sentence say that the write
      step reads the index at the default-branch commit it fetched, and the
      two failure passages name the fetched commit with no `plugins/`. The
      search `tr '\n' ' ' < <file> | sed 's/  */ /g' | grep -o 'index in its
      [a-z ]*checkout'` over README.md, cairn/DESIGN.md, and each file in
      `src/discover/` prints nothing. CHANGELOG.md's Unreleased section has
      an entry stating the behavior of AC1 to AC3.
- [x] AC5: `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check` exit 0.

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
- 2026-10-28: review fix-now work in 56aea11 after the four-lens pass (14 fixed, 3 follow-up, 9 rejected; Review section).
- 2026-10-28: step-7 approval: m042-index-at-push-base approved for merge

## Decisions

## Review

Review pass 1, 2026-10-28, branch head 01a8cb2, main at d51ad72 (not moved). No PR yet; Copilot round off.

- AC1 evidence: `pnpm exec vitest run --reporter=verbose` passes "skips an entry that main gained after the checkout, by repo, by id in another letter case, or by a folder whose meta.json is not JSON" (test/propose.test.ts): alpha (repoUrl `Example/Alpha` under another dir), beta (dir `Beta@Example.org`), gamma (meta.json not JSON) skipped as `in-index`, delta proposed, one POST, `discover/example/delta^` equals remote `main`, and the checkout has no `Beta@Example.org`. The failure rule for in-bot-pull entries: `fetchBase` runs at src/discover/propose.ts:158 before the skip sort at :163, and its catch at :160 fails every handoff entry; the missing-folder test exercises that path with an in-bot-pull entry. The renamed "skips, with no push or request, …" case (checkout holding the fixture plugins) also passes.
- AC2 evidence: test/issue.test.ts passes "names the entry and closes the issue as completed when only main, after the checkout, holds an entry for the repo" (exact comment "The index already lists this repo in the entry `plugins/other@example.org/`.", PATCH completed, no other write) and "refuses with entry-exists when only main, after the checkout, has the id in another letter case" (dir `Beta@Example.org`, `entry-exists` comment, PATCH not_planned); the sent list in both holds no pull request POST.
- AC3 evidence: "fails every entry, one an open bot pull request adds included, when main has no plugins folder" (test/propose.test.ts) passes: both entries, `open-pr@example.org` included, fail with "the default branch main at <40-hex> has no plugins/ folder", skipped is empty, no non-GET request, no discover/ branch. "comments that the bot could not finish, with no failure name, and leaves the issue open when main has no plugins folder" (test/issue.test.ts) passes: status 1, one comment matching "The bot could not finish, … ` the default branch main at <sha> has no plugins/ folder `" with no failure name, and no PATCH.
- AC4 evidence: README.md:373-377 (write step reads the index at the fetched commit), :396-400 (failed fetch or no `plugins/` fails every entry, a bot pull request's entry included), :465-467 (issue-run failure list names the fetch and the missing folder); cairn/DESIGN.md:423-428 (`fetchBase` and the fetched commit) and :439 (`propose` builds on it); CHANGELOG.md:310 Unreleased entry. The AC4 search over README.md, cairn/DESIGN.md, and each `src/discover/*.ts` printed nothing.
- AC5 evidence: `npx -y pnpm@12.15.0 test` exit 0 (19 files, 934 passed, 1 skipped); `npx -y pnpm@12.15.0 check` exit 0 ("checked 42 entries in plugins, 0 problems").
- Consistency gate: `cairn_validate.py` all checks passed; no DESIGN principle changed, so `cairn_impact` skipped; the generic profile names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: `indexAt` ran one `git cat-file blob` per `meta.json`, so the add-plugin-issue.yml budget comment ("10 git processes") was stale and the worst case grew with the index — fix now: one `git cat-file --batch`, workflow comment now 12 processes and about 30 minutes per issue (3 × 29.5 = 88.5 of 90), fixed 56aea11
- diff-bug #2: no test asserts the fetch gets the token — fix now: "the token" test asserts the `fetch --quiet origin main` extraheader line, seen red with the token dropped from the fetch, fixed 56aea11
- diff-bug #3: `.trim()` stripped a BOM, so a BOM `meta.json` parsed where `indexed` would not — fix now: the batch read parses the raw bytes, so a BOM file counts by id only, fixed 56aea11
- diff-bug #4: a symlinked `meta.json` reads as its link text and counts by id only, where `indexed` follows the link — follow-up: new row "Count linked folders at the push base", written at hygiene with the row graduation (ROADMAP is at its 60-line cap until then)
- diff-bug #5: a symlinked or submodule entry folder is an id under `indexed` and not under `indexAt` — follow-up: same row as #4
- diff-bug #6: `ls-tree <commit> -- plugins` resolves against the current folder — fix now: one `ls-tree -r -t -z --full-tree`, fixed 56aea11
- diff-bug #7: a `known` issue now needs a fetch, so a failed fetch turns "already lists" into "could not finish" — reject, planned change: AC3 asks for the "could not finish" answer when the fetched commit cannot be read, and the issue stays open for a rerun
- diff-bug #8: `IssueAnswerOptions` has no `gitMs` — fix now: added and passed through to `fetchBase` and `propose`, fixed 56aea11
- diff-bug #9: execFile's 1 MiB `maxBuffer` overflow reads as a time limit — fix now: `maxBuffer` 64 MiB and its own message, fixed 56aea11
- diff-bug #10: two folders naming one repo can name a different folder than `indexed` — reject, false: either folder is an entry that lists the repo, so the comment stays true
- diff-bug #11: the `ids.has` check in the meta loop is redundant — fix now: the meta pattern excludes dot names, fixed 56aea11
- diff-bug #12: the older "answers as today … at the fetched commit names the repo" issue test runs the same path as the new one — fix now: dropped, fixed 56aea11
- diff-bug #13: two new helper comments restate the code — reject, style: they match the files' helper comments such as `passing()`
- diff-bug #14: `pushAll` is exported but used only in its file — fix now: unexported, fixed 56aea11
- diff-bug #15: README line left short by the rewrap — fix now: rewrapped, fixed 56aea11
- diff-bug (a): `FETCH_HEAD` could move between `fetch` and `rev-parse` — reject, false: `gitDir` is the job's own checkout, and no other git process runs there during `pnpm propose`
- blame-history #1: a failed fetch now reports `in-index` and `in-bot-pull` entries as failed — reject, planned change: AC1 states it
- blame-history #2: a failed fetch loses the issue run's "already lists" or "already proposed" answer — reject, planned change: AC3 (as diff-bug #7)
- blame-history #3: a checkout entry that main dropped during the run makes a `known` issue fail with "the write step does not" — reject, edge: only an entry deleted from main while a run goes reaches it, and its effect is the "could not finish" comment with the issue left open
- blame-history #4: per-`meta.json` processes and the 1 MiB output cap — fix now: as diff-bug #1 and #9, fixed 56aea11
- prior-review: no prior-review evidence; the probe found no PR review comments
- ripple #1: add-plugin-issue.yml budget comment stale — fix now: as diff-bug #1, fixed 56aea11
- ripple #2: DESIGN.md said `propose` gives `git fetch` the token — fix now: "`fetchBase` and `propose` give", fixed 56aea11
- ripple #3: ROADMAP row "Check the index at the push base" states the old behavior — reject, planned change: post-merge hygiene graduates it
- ripple #4: ROADMAP row "Fail issue runs with no plugins folder" is now true only of the read step — follow-up: narrowed at hygiene to the read step
- ripple #5: README's issue-run failure list "fail to read `plugins/`" was ambiguous — fix now: "in its checkout", fixed 56aea11
- ripple #6: `twoStep`'s `root` parameter is unused — reject, false: it goes to `discoverRead` at test/propose.test.ts:78
- After the fixes: `pnpm test` exit 0 (933 passed, 1 skipped; one duplicate test dropped), `pnpm check` exit 0 (42 entries, 0 problems). AC1 to AC5 tests still pass.
