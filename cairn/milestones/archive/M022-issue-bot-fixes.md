# M022: Fix two gaps of the issue bot

**Status:** done (2026-10-27, PR #34 https://github.com/jmgirard/zotero-plugin-index/pull/34)

**Goal:** The "Add a plugin" bot keeps an issue open when its own entry check fails, and closes an issue whose bot pull request a maintainer closes without a merge.

**Outcome:** `readOutcome` (`src/discover/issue.ts`) maps an `unexpected-error` from `plannedProblem` in `draftEntry` to the `failed` outcome, so the issue stays open and the run fails; the discover run is unchanged. New `pnpm close-issue` (`src/discover/close-issue.ts`, `close-issue-cli.ts`) and `.github/workflows/close-add-plugin-issue.yml` (`pull_request_target: closed`, a concurrency group per pull request, `contents: read`, `issues: write`, `pull-requests: read`, `cache-mode: none`, default-branch checkout). For a closed, unmerged `discover/` pull request of the index repo with exactly one `Closes #<n>` line outside code fences, it comments on open issue n (label `add-plugin`, a `github-actions[bot]` comment holding the `html_url` with no digit after it) and closes it as not planned. It skips when the bot's exact closing comment is already there. The issue run's comment on a new pull request now states that close. `PREFIX` is exported from `propose.ts`; `otherEventUses` in `test/workflows.test.ts` takes an exact allow-list. README, CHANGELOG, and DESIGN follow.

**Decisions:** none.

**Review:** Pass 1 returned AC4 (Function Families did not name the workflow; fixed as T5). Pass 2 fan-out (diff-bug, blame-history, prior-review, ripple): 12 finding lines fixed (concurrency group, exact closing-comment match, README conditions, three comments, CLI argument test, exact test pattern); 6 to the new row "Make close-issue safe on retry and races"; 22 rejected, 1 noted. Claim audit: 54 claims, 2 corrected. Graduated rows "Keep issues open on entry-check errors" and "Close the issue when its pull request closes". Lessons: marked 9 used M022, captured 1 (PATH trick), evicted by rank the 2026-10-26 (M009, used M011) `GIT_INDEX_FILE` branch-commit lesson.
