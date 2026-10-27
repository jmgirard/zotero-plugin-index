<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M022: Fix two gaps of the issue bot

- **Status:** review   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** normal   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** —   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** —   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** user-facing — it changes how the bot answers "Add a plugin" issues on GitHub   <!-- owner: plan · create/amend-via-gate; user-facing | internal — <one-clause reason>; skill conduct only — no validate check parses it -->
- **Branch/PR:** m022-issue-bot-fixes   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

## Goal
<!-- owner: plan · create; a wrong goal returns to plan, never edited in place -->

The "Add a plugin" bot keeps an issue open when its own entry check fails,
and closes an issue whose bot pull request a maintainer closes without a
merge.

## Scope
<!-- owner: plan · create/amend-via-gate -->

**In:** in an issue run, an `unexpected-error` from the entry check becomes
the `failed` outcome, so the issue stays open and the run fails. A new
command, `pnpm close-issue`, and a new workflow,
`.github/workflows/close-add-plugin-issue.yml`, close the issue that a bot
pull request names when a maintainer closes that pull request without a
merge. README, CHANGELOG, and DESIGN follow.

**Out:**
- Issue runs that another run cancels in the shared `discover` group →
  candidate "Answer issues whose run was canceled". The plan's audit found
  that leaving the group lets runs race, so that row needs its own design.
- A `write-failed` or `entry-exists` refusal from the output directory →
  new candidate "Keep issues open on entry write errors".
- A bot pull request closed by the bot's own token starts no workflow run,
  so its issue stays open. Today only maintainers close bot pull requests,
  so no row.

## Acceptance criteria
<!-- owner: plan · create/amend-via-gate; review reads, never reinterprets. -->

- [x] AC1: When the entry check throws while an issue run drafts the entry
      (`plannedProblem` in `draftEntry`), `issueRead` returns the outcome
      `failed` with the failure `unexpected-error`. Given that outcome,
      `issueAnswer` posts one comment that begins "The bot could not finish"
      and holds `unexpected-error` in a code span, then the message in a code
      span. It sends no close request and returns status 1. A test in
      `test/issue.test.ts` shows this. The tests in the describe blocks "an
      issue run" and "an issue run's refusals with names the reader gives"
      pass unchanged.
- [x] AC2: `pnpm close-issue` with `PR_NUMBER` set reads that pull request
      from the GitHub API. It acts only when the pull request is closed and
      not merged, its head branch starts with `discover/` in the index repo,
      and its body has exactly one line, outside code fences, that is exactly
      `Closes #<n>`. It then reads item n and its comments. It acts only when
      the item is an issue with no `pull_request` key, it is open, it has the
      label `add-plugin`, a comment by `github-actions[bot]` holds this pull
      request's URL, and no earlier bot comment says this pull request was
      closed without a merge. Then it posts one comment that names the pull
      request and says it was closed without a merge, and closes the issue as
      not planned. In every other case, it sends no write request and exits 0.
      If the pull request read, the issue read, or the comments read fails, it
      sends no write request and exits 1. If the comment request fails, it
      sends no close and exits 1. If the close request fails, it exits 1.
      Tests with recorded responses show the case that acts, each case that
      sends nothing (merged, open again, a head branch outside `discover/`,
      another head repo, no `Closes` line, two `Closes` lines, a `Closes` line
      only inside the check-output fence, an item that is a pull request, a
      closed issue, an issue without the label, no bot comment with the URL,
      and an earlier closing comment), and each of the five failures.
- [x] AC3: `.github/workflows/close-add-plugin-issue.yml` runs on
      `pull_request_target` of type `closed` only. Its one job's `if:` is
      exactly `github.event.pull_request.merged == false &&
      startsWith(github.event.pull_request.head.ref, 'discover/') &&
      github.event.pull_request.head.repo.full_name == github.repository`.
      The job's permissions are `contents: read`, `issues: write`, and
      `pull-requests: read` and no others. The job sets `cache-mode: none`,
      and no line sets a `cache` key or uses `actions/cache`. The checkout
      step sets `persist-credentials: false` and names no `ref`.
      `GITHUB_TOKEN` and `PR_NUMBER` reach the command only through `env:`.
      No `${{ }}` expression in the file names a `github.event.pull_request`
      field other than `number`, `merged`, `head.ref`, and
      `head.repo.full_name`. A test in `test/workflows.test.ts` checks each
      of these facts in the file's text.
- [x] AC4: README's "Proposing a plugin with an issue" section says that an
      error in the entry check leaves the issue open, and that when a
      maintainer closes a bot pull request without a merge, the bot comments
      on its issue and closes it as not planned. The README sentence "An
      `unexpected-error` from the check of the written entry also closes the
      issue, as a failed write does." is gone. The `CHANGELOG.md` Unreleased
      bullet that holds "Anyone can also propose a plugin" says the same two
      things. DESIGN.md's Function Families and its paragraph on
      `add-plugin-issue.yml` name `pnpm close-issue` and the new workflow.
- [x] AC5: `pnpm test` (type check, then Vitest) and `pnpm check` pass.

## Coverage
<!-- owner: plan · create/amend-via-gate -->

- AC1 → T1
- AC2 → T2
- AC3 → T3
- AC4 → T4, T5
- AC5 → T1, T2, T3, T4, T5

## Tasks
<!-- owner: plan (create) / implement (check-off, minor edits) -->

- [x] T1: Write the test that makes the entry check throw in an issue run,
      then the change in `readOutcome` (`src/discover/issue.ts`).
- [x] T2: Write the tests of `pnpm close-issue` against recorded responses,
      then the command and its `package.json` script, reusing `githubClient`
      and `code()`.
- [x] T3: Write `close-add-plugin-issue.yml` and its checks in
      `test/workflows.test.ts`, reusing the `cacheLines` and `jobText`
      helpers.
- [x] T4: Write the README, CHANGELOG, and DESIGN text. Search joined copies
      of the files for the old and new phrases (LESSONS, M018).
- [x] T5: Name `close-add-plugin-issue.yml` in DESIGN.md's Function
      Families (review return 1).

## Work log
<!-- owner: any skill · append-only; one line per entry; absolute dates. -->

- 2026-10-27: created by /milestone-plan.
- 2026-10-27: question set: the user added the "Add a plugin" bot rows to the M020 and M021 plan as one more milestone. The rows are "Keep issues open on entry-check errors", "Answer issues whose run was canceled", and "Close the issue when its pull request closes".
- 2026-10-27: criteria audit (full): 12 findings, all taken. A `pull_request_target` trigger, since `pull_request` skips a conflicting pull request and reads the workflow from the merge ref. The exact `if:` text, a strict `Closes` line rule and probes for it, idempotent comments, named failure paths, named test blocks, and the stale README sentence. Two findings narrowed the plan: see the next two lines.
- 2026-10-27: plan cut "Answer issues whose run was canceled" from M022 and left it a candidate row, because the planned fix, a concurrency group per issue, lets two runs push one branch, open two pull requests for one plugin id, leave an issue that no pull request names, or recreate a merged branch. The row's detail now names these races.
- 2026-10-27: plan kept AC1 to the entry check's `unexpected-error`, as the row states, and filed the output-directory refusals as the new candidate "Keep issues open on entry write errors".
- 2026-10-27: plan gate chose `pull_request_target` over `pull_request` for the close workflow, because it runs the default branch's file even when the pull request conflicts and runs no pull request code; falsified by evidence that the job checks out or runs code from the pull request.
- 2026-10-27: lessons used: 2026-10-25 (M002) recorded responses, 2026-10-26 (M009) the built-in token starts no workflow run, 2026-10-26 (M018) search joined text.
- 2026-10-27: branch m022-issue-bot-fixes cut from main at 02c2a78; status in-progress.
- 2026-10-27: T1 done. `readOutcome` maps an `unexpected-error` refusal to `failed`, rather than marking it build-level in `draftEntry`, so the discover run keeps its handling. The test hides git from PATH so `git check-ref-format` cannot start; it failed before the change with outcome `refused`. `runIssue` now also returns the read outcome.
- 2026-10-27: T2 done. `closeIssue` lives in `src/discover/close-issue.ts` with its CLI in `close-issue-cli.ts`; `PREFIX` is now exported from `propose.ts`. Choices: the bot login is `github-actions[bot]`; the URL is the pull request's `html_url`, matched with no digit after it; a bot comment holding that URL and "closed without a merge" counts as the earlier closing comment; a fence closes on a line of the same character at least as long. Planting no fence tracking and no digit boundary each failed its own test.
- 2026-10-27: T3 done. `otherEventUses` in `test/workflows.test.ts` now takes the allowed event uses as exact chains, so the report and close workflows share it. Ruby's YAML reads the trigger, `if:`, permissions, and checkout step as written. Planting a head checkout, an extra permission, an extra trigger type, and a `cache: pnpm` key each failed its matching test.
- 2026-10-27: T4 done. README drops the stale `unexpected-error` sentence, adds the entry-check error to the bot-failure paragraph, and adds a paragraph on `pnpm close-issue`; the CHANGELOG bullet and DESIGN's Discovery family and `add-plugin-issue.yml` paragraph follow. Joined-copy searches found the old sentence 0 times and each new phrase once per file.
- 2026-10-27: claim audit: 54 claims read, 2 corrected — test/close-issue.test.ts (the outside-the-fence test now plants a decoy `Closes #7` inside the fence), src/discover/close-issue.ts (skip message "is not an issue"); the reader re-read both and found them true. It could not confirm the existing premise that GitHub enforces `cache-mode: none`, which report-issue.yml and DESIGN already state.
- 2026-10-27: all tasks done; `pnpm test` (625 tests) and `pnpm check` pass; status review.
- 2026-10-27: review return 1: AC4 fails as written — DESIGN.md's Function Families does not name `.github/workflows/close-add-plugin-issue.yml`.
- 2026-10-27: resumed implement for review return 1; added T5 (minor amendment); main has not moved.
- 2026-10-27: T5 done. DESIGN's Discovery family now names `.github/workflows/close-add-plugin-issue.yml` beside `pnpm close-issue`; a joined-copy search of the Function Families section finds each once.
- 2026-10-27: all tasks done; `pnpm test` and `pnpm check` pass; status review.

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive -->

- AC1: verified 2026-10-27. `test/issue.test.ts` "comments the failure name and message, leaves the issue open, and returns 1 when the entry check throws" passes: outcome `failed`/`unexpected-error`, one comment starting "The bot could not finish" with both code spans, no PATCH, status 1. The "an issue run" and "an issue run's refusals with names the reader gives" blocks pass with no lines changed (`git diff main...HEAD -- test/issue.test.ts` touches only `runIssue`'s return and the other block).
- AC2: verified 2026-10-27. `test/close-issue.test.ts`: the acting case, 12 send-nothing cases (each named in AC2), the outside-fence read, and the five failures pass; `pnpm close-issue` exits 0 on the acting case and 1 on a failed close.
- AC3: verified 2026-10-27. The six `close-add-plugin-issue.yml` tests in `test/workflows.test.ts` pass; Ruby's YAML reads the trigger, `if:`, permissions, and checkout as written.
- AC4: FAILED 2026-10-27. README, CHANGELOG, and DESIGN's `add-plugin-issue.yml` paragraph hold the required text, but DESIGN's Function Families names `pnpm close-issue` and not `close-add-plugin-issue.yml`.
- AC5: verified 2026-10-27. `pnpm test` 16 files, 625 tests pass; `pnpm check` 20 entries, 0 problems.
- pass 2 (after review return 1), 2026-10-27, at 4724a77: `pnpm test` 16 files, 625 tests pass and `pnpm check` 20 entries, 0 problems, so AC1, AC2, AC3, and AC5 hold as recorded above.
- AC4: verified 2026-10-27 (pass 2). Joined copies: README's section holds the entry-check error, "leaves the issue open", the closed-without-a-merge paragraph, and "closes that issue as not planned", and the old `unexpected-error` sentence 0 times; the CHANGELOG Unreleased bullet holds both changes; DESIGN's Function Families and its `add-plugin-issue.yml` paragraph each name `pnpm close-issue` and `close-add-plugin-issue.yml` once.
- gate: `cairn_validate.py` exit 0, all checks passed; generic profile names no toolchain checks; no principle changed, so no `cairn_impact`.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: a close that fails after the comment posts cannot be retried, since a rerun sees its own closing comment and skips; AC2 asks for that skip — follow-up to the new candidate row "Make close-issue safe on retry and races"
- diff-bug #2: two runs for one pull request (close, reopen, close) can both pass the closing-comment check and post twice; the workflow has no concurrency group — fix now
- diff-bug #3: a pull request reopened between the read and the close still gets its issue closed as not planned — follow-up to the new candidate row "Make close-issue safe on retry and races"
- diff-bug #4: a maintainer's close of the issue as completed between the read and the PATCH is overwritten as not planned — follow-up to the new candidate row "Make close-issue safe on retry and races"
- diff-bug #5: a pull request closed before the issue run's comment lands, or whose comment failed, leaves the issue open — follow-up to the new candidate row "Make close-issue safe on retry and races"
- diff-bug #6: the issue comment that names only the branch (no `html_url` in the create answer), or a renamed repo, never matches the URL, so the issue stays open — follow-up to the new candidate row "Make close-issue safe on retry and races"
- diff-bug #7: the "closed without a merge" phrase is shared with the issue run's "known" answer — reject (false): that answer is posted only on another issue, which it closes, so no current comment reaches the check
- diff-bug #8: an unreadable item (404, 410, a transferred issue) fails the run on every rerun — reject (planned change): AC2 sets exit 1 for a failed issue read
- diff-bug #9: the fence parser opens a fence on a backtick info string that holds a backtick, and counts a `Closes` line inside an HTML comment — follow-up to the new candidate row "Make close-issue safe on retry and races"
- diff-bug #10: the `cache-mode: none` premise is unverified — reject (planned change): AC3 requires the key, and D-010 and report-issue.yml already rest on it
- diff-bug #11: README leaves out the one-Closes-line and earlier-closing-comment conditions — fix now
- diff-bug #12a: the made-up line in the workflows test repeats the helper's checks — reject (false): it shows the new pull_request allow-list can fail, which the report cases do not
- diff-bug #12b: the CLI's extra-argument usage branch has no test — fix now
- diff-bug #12c: the merged case sets `merged` and `merged_at` together — reject (style): GitHub's answer for a merged pull request carries both
- diff-bug #12d: one case covers a non-bot author and the digit boundary together — reject (style): each fails the case on its own, as the planted-defect run showed for the boundary
- diff-bug #12e: the entry-check test's comment pattern allows an optional space that `code()` always writes; ENOENT is platform-dependent — fix now (exact space); the ENOENT part rejected (false): Node reports ENOENT for a missing executable on Linux and macOS
- diff-bug #13: (b) no skill procedure changed — noted
- blame-history #1: the `unexpected-error` mapping sits in `readOutcome` rather than as a build-level mark in `draftEntry` — reject (planned change): T1 names `readOutcome`, and that keeps the discover run's handling unchanged
- blame-history #2: the reversal of M019's scope has no D-entry — reject (false): M019 left the case out of scope with a candidate row; no decision recorded it
- blame-history #3: the `IssueOutcome` `failed` comment in `handoff.ts` covers only the repo read — fix now
- blame-history #4: `otherEventUses` now matches exact chains, which is stricter — reject (false): no defect; no current use breaks
- blame-history #5: `discover/` stays hardcoded in `handoff.ts` beside the exported `PREFIX` — reject (style): pre-existing lines the diff does not touch
- blame-history #6: the `issueRead` comment has a stranded "If" at a line end — fix now
- blame-history #7: the preload comment line is long — reject (style)
- prior-review #1: overlapping runs can comment twice, as M020's review found for reports — fix now (same fix as diff-bug #2)
- prior-review #2: the `cache-mode: none` premise repeats in a new file — reject (planned change): as diff-bug #10
- prior-review #3: the entry-check change reverses M019's stated scope — reject (planned change): the row "Keep issues open on entry-check errors" asked for it
- prior-review #4: the stranded "If" — fix now (same fix as blame-history #6)
- ripple #1: the candidate row "Close the issue when its pull request closes" is still listed — reject (planned change): step 9 graduates the rows this milestone started
- ripple #2: the candidate row "Keep issues open on entry-check errors" is still listed — reject (planned change): as ripple #1
- ripple #3: CHANGELOG "The issue closes when that pull request merges." reads as the only closing path — reject (false): it is still true, and the same bullet now adds the no-merge close
- ripple #4: the issue run's comment "This issue closes when that pull request merges." says nothing of the no-merge close — fix now, adding the sentence only when the comment holds the URL that `pnpm close-issue` matches
- ripple #5: the `IssueOutcome` comment in `handoff.ts` — fix now (same fix as blame-history #3)
- ripple #6: the `issueAnswer` header comment names only a read of the repo — fix now
- ripple #7: README's discovery text on a closed bot pull request does not name the issue — reject (false): still true, and the issue section states the close
- ripple #8: DESIGN Data sources line on a closed bot pull request — reject (false): as ripple #7
- ripple #9: CHANGELOG line on a closed bot pull request — reject (false): as ripple #7
- ripple #10: the pull request body's closing sentence does not name the issue — reject (false): still true; the issue's own comment now states the close (ripple #4)
- ripple #11: the add-plugin form text lists the closing cases — reject (false): still true; it never listed the bot's own failures
- ripple #12: README "Both commands read ... `GITHUB_REPOSITORY`" — reject (false): still true of the two commands it names
- ripple #13: DESIGN's one-job note names only the report workflow — reject (false): incomplete, not wrong
