# M010: Take one repo URL from an issue form

- **Status:** review
- **Priority:** normal
- **Depends on:** M009
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — a public issue form that anyone can use to propose a plugin
- **Branch/PR:** m010-add-plugin-issue-form, https://github.com/jmgirard/zotero-plugin-index/pull/11

## Goal

An issue form takes one GitHub repo URL, and a workflow drafts that repo's entry and opens a pull request, or replies on the issue with the reason it cannot.

## Scope

**In:** `.github/ISSUE_TEMPLATE/add-plugin.yml`, a form with one required URL field that adds the label
`add-plugin`. `.github/workflows/add-plugin-issue.yml`, which runs on `issues: opened` when that label is set and
passes the issue body to the script through an environment variable only. A script in `src/discover/` that
reads the URL from the form body, applies M009's skip rules and the index check, reads the repo, and opens one
pull request through M009's propose step with `Closes #<issue>` in its body. It comments on the issue with the
pull request URL, or with the reason it opened none, and closes the issue when it opened none. README text and
an edit to M009's CHANGELOG entry.

**Out:** Works and Broken user reports → candidate row "Collect works and broken user reports".

## Acceptance criteria

- [x] AC1: The form-body parser returns the first non-empty line, trimmed, under the URL field's heading in
      a body GitHub renders from `add-plugin.yml`, and it returns a named problem when that line is
      `_No response_` or the heading is absent. A test covers a rendered body, the same body with CRLF line
      endings, a `_No response_` body, and a body with no such heading. The reader's `not-github-repo` failure
      judges whether the value is a GitHub repo URL.
- [x] AC2: For a repo that passes the inclusion bar, the run opens one pull request whose body contains
      `Closes #<issue>` and comments the pull request URL on the issue; a test with a fake GitHub API asserts
      both requests.
- [x] AC3: For a body the parser rejects, a read that fails, or an entry `writeEntry` refuses, the run
      comments the problem or failure name and its message, and closes the issue as not planned. When the
      push or the pull-request request fails, the run comments the error, leaves the issue open, and exits 1.
      A test with a fake GitHub API asserts the requests for a parser problem, a `not-github-repo` read, an
      `entry-exists` write, and a failed push.
- [x] AC4: For a repo that an entry's `repoUrl` names, or whose bot pull request is open or closed without a
      merge, the run reads nothing, comments naming the entry or the pull request, and closes the issue; a
      test asserts this for each of the three cases.
- [x] AC5: A parse of `add-plugin-issue.yml` with Ruby's YAML shows that no `run:` value contains `${{`, that
      the issue body reaches the script through an `env:` value, the `issues: opened` trigger, a job condition
      on the `add-plugin` label, the concurrency group `discover` that `discover.yml` names, and the
      permissions `contents: write`, `pull-requests: write`, and `issues: write` and no other.
- [x] AC6: README describes the form, and M009's CHANGELOG entry names it; `pnpm test` and `pnpm check` pass.
- [x] AC7: After the merge, one issue opened from the form for a repo that has no entry and no bot pull
      request gets the comment that AC2 or AC3 names from the workflow.

## Coverage

- AC1 → T1, T2
- AC2 → T1, T3
- AC3 → T1, T3
- AC4 → T1, T3
- AC5 → T4
- AC6 → T5
- AC7 → T6

## Tasks

- [x] T1: Write `add-plugin.yml` and failing tests for AC1–AC4, with form bodies in the shape GitHub renders.
- [x] T2: Implement the form-body parser.
- [x] T3: Implement the issue run on top of M009's propose step: the index and skip checks, the read, the pull
      request with `Closes #<issue>`, the comment, and the close.
- [x] T4: Write `add-plugin-issue.yml` with the body in `env:` only and the `discover` concurrency group;
      check it with `ruby -ryaml`.
- [x] T5: Write the README text and edit M009's CHANGELOG entry; run the verify slot.
- [x] T6: After the merge, ask the user to open one issue from the form (or open it at their yes), and record
      the issue and run URLs in the Review section.

## Work log

- 2026-10-25: created by /milestone-plan.
- 2026-10-25: tier check: not run — work named at the question set.
- 2026-10-25: idea vet: no concern beyond the three posed at the question set for the series; the form honors the user's "skip for good" answer for closed bot pull requests, and the maintainer can still add such a repo with `pnpm add-plugin`.
- 2026-10-25: feature series: M008 -> M009 -> M010.
- 2026-10-25: plan gate chose passing the issue body through `env:` and parsing it in TypeScript over reading it in a run script with `${{ }}`, because an expression in a run script lets an issue author inject shell commands; falsified by a GitHub change that renders `env:` values into scripts.
- 2026-10-25: plan gate chose `Closes #<issue>` in the pull request body over closing the issue when the pull request opens, so the issue stays open until the entry merges; falsified by the user closing such issues by hand.
- 2026-10-25: criteria audit (full mode, fresh Opus reader) returned 5 findings, all fixed: AC1 takes the first line under the heading, plants `_No response_`, CRLF, and a missing heading, and leaves URL judgment to the reader's `not-github-repo`; AC3 now covers `writeEntry` refusals and push or request failures, so every issue gets a reason, as the Goal promises; AC5 checks parsed `run:` values for `${{` in place of a one-spelling grep, which the label condition would also have broken, and adds the `discover` concurrency group so two runs never push one branch at once; AC7 names a repo with no entry and no bot pull request, and its recording act moved to T6.
- 2026-10-25: plan gate chose to leave the issue open on a push or request failure over closing it as not planned, because that failure is the bot's and not the proposer's; falsified by such issues piling up unanswered.
- 2026-10-25: lessons used: 2026-10-25 (M006) Ruby YAML to parse a workflow; 2026-10-25 (M002) the fixture preload.
- 2026-10-26: branch m010-add-plugin-issue-form cut from main at e2b10ad; status in-progress.
- 2026-10-26: T1 done: `add-plugin.yml` (one required input, label `Repository URL`, id `repo-url`) and `test/issue.test.ts`, red only because `src/discover/issue.ts` does not exist yet; the propose tests' `git` and `checkout` helpers moved to `test/support/git-checkout.ts` (propose tests green).
- 2026-10-26: decided the API: `parseIssueBody` with problems `no-url-heading` and `no-response`, `issueRun` returning an exit status, and a `pnpm discover-issue` CLI reading `ISSUE_NUMBER`, `ISSUE_BODY`, and `GITHUB_REPOSITORY` from the environment.
- 2026-10-26: decided the close reasons: `completed` when an entry already names the repo, `not_planned` for every other close.
- 2026-10-26: the repo has no `add-plugin` label, and GitHub applies a form's label only when it exists; creating it is an outward action left for T6, at the user's yes.
- 2026-10-26: T2 done: `parseIssueBody` in `src/discover/issue.ts`; its 6 tests pass; `issueRun` is a stub until T3.
- 2026-10-26: T3 done: `issueRun` and `pnpm discover-issue` (`src/discover/issue-cli.ts`); `discover.ts` gains `draftEntry` (the one-repo read and write that `discover` now calls) and exports `indexed` and `repoName`; `propose.ts` exports `botPulls` (now with each skipped pull request's URL), `defaultBranch`, `propose`, and `code`, and `body` takes the issue number; `githubClient` gains `patch`. `pnpm test` 361 passed, `pnpm check` 0 problems; removing the pre-read index and pull-request check turns the three AC4 tests red.
- 2026-10-26: decided that the run also checks the name GitHub gives after the read, so a renamed repo whose new name an entry or bot pull request has is answered the same way; and that a failed index, pull-request, or default-branch read counts as the bot's failure (comment, issue left open, exit 1).
- 2026-10-26: AC3 as written closes the issue on any failed read, `github-http-error` and `request-failed` included, which a rate limit or outage can cause; followed as written, with a candidate row for leaving such issues open.
- 2026-10-26: T4 done: `add-plugin-issue.yml`; `ruby -ryaml` reads 2 `run:` values, none with `${{` (a planted `echo "${{ github.event.issue.body }}"` reads as 1), `ISSUE_BODY` in `env:`, the trigger under key `true` (YAML 1.1 reads `on` as a boolean) as `issues: types: [opened]`, the label condition, group `discover` as in `discover.yml`, and the three permissions at the top level only.
- 2026-10-26: two candidate rows added: "Keep issues open on a bot read failure" and "Answer issues whose run was canceled" (the shared concurrency group lets a newer pending run cancel an older one).
- 2026-10-26: T5 done: README section "Proposing a plugin with an issue" under "Finding new plugins", and the issue form added to the end of M009's CHANGELOG entry; `pnpm test` 361 passed, `pnpm check` 0 problems.
- 2026-10-26: claim audit: 63 claims read, 7 corrected — src/discover/issue.ts (status and header comments: transient read errors close the issue; which bot failures leave it open), README.md and CHANGELOG.md and add-plugin.yml (bot failures beyond the push leave the issue open; refusals, not every case, close it; the pending-run cancellation), add-plugin-issue.yml (label comment, now "write access" after the re-read; concurrency comment), test/issue.test.ts (runIssue comment); the re-read cleared 5 and sent back 1, fixed with the REST docs' push-access rule.
- 2026-10-26: T6 is the post-merge live check, which `/milestone-review` runs after the merge, as M009's was; it needs the `add-plugin` label created first.
- 2026-10-26: T1–T5 done, verify clean (`pnpm test` 361 passed, `pnpm check` 0 problems); status review.
- 2026-10-26: review: four-lens fan-out, 34 findings (14 fix now, 8 follow-up, 11 reject, 1 noted), no return; Review section lists each.
- 2026-10-26: step-7 approval: m010-add-plugin-issue-form approved for merge, with the `add-plugin` label and one test issue for AC7 after it.
- 2026-10-26: PR #11 merged 2026-10-26T10:19:40Z as de15750 after CI passed (2 checks); label `add-plugin` created; the browser pane had no GitHub sign-in, so the user chose to submit the form for AC7 (windingwind/zotero-pdf-preview, prefilled link) themselves.

## Decisions

## Review

Evidence on the branch at 5a30199 plus the CRLF test fix below, 2026-10-26; main had not moved (`git rev-list HEAD..origin/main` 0).

- AC1: `vitest run test/issue.test.ts -t parseIssueBody` 6 passed: `rendered(...)` (GitHub's `### Repository URL` heading, blank line, value) and the same body with every `\n` replaced by `\r\n` both return the URL; `_No response_` returns `no-response`, a body with no heading `no-url-heading`; "not a url" is returned as is, and the `not-github-repo` judgment test is AC3's. The label test reads `label: Repository URL` from `add-plugin.yml`. Review fixed the CRLF test, which had used a different body from the rendered one.
- AC2: test "opens one pull request that closes the issue, and comments its URL" passed: with a fake API and a bare-repo remote, the non-GET requests are exactly `POST .../pulls` (head `discover/example/alpha`, base `main`, body containing `Closes #7`) then `POST .../issues/7/comments` with the pull request URL; no PATCH.
- AC3: tests passed for a parser problem (`no-response`), a `not-github-repo` read (gitlab.com URL), and an `entry-exists` write (outDir already holds `alpha@example.org`): each sends exactly a comment with the backticked name and its message, then `PATCH .../issues/7` with `state: closed, state_reason: not_planned`. `pnpm discover-issue` with a pre-receive hook refusing the push: exit 1, stderr names `git push failed: … refused by the test hook`, the only non-GET request is the comment carrying that error, no PATCH.
- AC4: the three "reads nothing, names the record" tests passed: for `Example/Second-Plugin` (entry `second-plugin@example.org` in the build fixture tree), `example/open-pr` (open bot PR #11), and `example/closed-pr` (closed unmerged #12), no GET under `/repos/<that repo>`, a comment naming `plugins/second-plugin@example.org/`, `pull/11`, or `pull/12`, then a PATCH closing the issue (`completed`, `not_planned`, `not_planned`). In implement, removing the pre-read check turned all three red.
- AC5: `ruby -ryaml` on `add-plugin-issue.yml`: 2 `run:` values, 0 containing `${{` (a planted `echo "${{ github.event.issue.body }}"` read as 1 in implement); an `env:` value is `${{ github.event.issue.body }}`; trigger `{"issues"=>{"types"=>["opened"]}}`; job `if: contains(github.event.issue.labels.*.name, 'add-plugin')`; concurrency group `discover`, equal to `discover.yml`'s; permissions `contents: write, pull-requests: write, issues: write` at the top level and none on the job.
- AC6: README section "Proposing a plugin with an issue" (README.md:184) describes the "Add a plugin" form, its label, the workflow, and each outcome; M009's CHANGELOG entry (CHANGELOG.md:62-68) names the form. `pnpm test`: type check clean, 11 files, 361 tests passed; `pnpm check`: 14 entries, 0 problems.
- AC7: owed after the merge (T6); not verified yet.
- AC7 (after the merge): the user opened issue #12 from the form for https://github.com/windingwind/zotero-pdf-preview (no entry, no bot PR); it carried the `add-plugin` label, and run 40306878224 (`issues` event) succeeded. The workflow commented "The bot opened https://github.com/jmgirard/zotero-plugin-index/pull/13. This issue closes when that pull request merges." (AC2's comment). PR #13, head `discover/windingwind/zotero-pdf-preview`, base main, adds `plugins/pdfpreview@windingwind.com/`, its body has `Closes #12`, and GitHub lists #12 as a closing issue; #12 stays open.
- Gate: `cairn_validate.py` exit 0, all checks passed; no DESIGN principle changed, so no `cairn_impact`; the generic profile's consistency-gate names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: the `add-plugin` label does not exist, so the job condition fails for every issue and AC7 fails — fix now at T6: create the label after the merge, before the live issue, under the merge approval
- diff-bug #2: the shared group lets an issue run cancel a pending scheduled discover run — follow-up, absorbed into "Answer issues whose run was canceled"
- diff-bug #3: a transient read error closes the issue as not planned while the same error in `botPulls` leaves it open — follow-up, absorbed into "Keep issues open on a bot read failure" (AC3 requires the close as written)
- diff-bug #4: an error other than `ReadFailure` from `botPulls` or `defaultBranch` left the issue with no comment — fix now, any error there now goes to `failed`, fixed 5ab92a2
- diff-bug #5: a closed bot PR under a renamed repo's old name is missed — reject, planned change: README (M009) says a renamed repo can be proposed again
- diff-bug #6: an open bot PR closes the issue as not planned — reject, planned change: AC4 requires the close, and the reason was decided in implement
- diff-bug #7: an issue whose PR is closed unmerged stays open — follow-up, new row "Close the issue when its pull request closes"
- diff-bug #8: the success comment named no URL when the create answer lacked `html_url` — fix now, it names the branch then, fixed 5ab92a2
- diff-bug #9: the `entry-exists` write test covers a state the CLI's fresh draft directory cannot reach — reject, planned change: AC3 names that test
- diff-bug #10: the checkout token sits in `.git/config` during `pnpm install` in a job anyone can start — follow-up, new row "Limit what an issue run can reach"
- diff-bug #11: `BotPulls.skip` repeats the keys of `pulls` — reject, style
- diff-bug #12: `known` reads `let` bindings declared after it — reject, style: it runs only after they are set
- diff-bug (c): parser test "leaves judging the URL" repeats the success path — reject, false: it alone pins that the parser does not judge URLs (AC1)
- diff-bug (c): the `/is not a GitHub repo URL/` assertion tests the reader — reject, false: it asserts which failure reached the comment (failure identity)
- diff-bug (c): the label test's regex depends on 6-space indentation — reject, style
- diff-bug (c): untested branches (pull-list failure, refused create request, failed comment, renamed repo, CLI `GITHUB_REPOSITORY` error) — fix now, tests added, fixed 5ab92a2; the `pendingIds` refusal is `draftEntry`'s, tested in the propose tests, and the `html_url` fallback builds the same URL — reject, style
- blame-history #1: an older closed bot PR overwrote a newer open one for the same repo in `pulls` — fix now, an open one wins, with a test, fixed 5ab92a2
- blame-history #2: README says "the concurrency group of `Discover plugins`" but the group is `discover` — reject, false: that is the group of the `Discover plugins` workflow
- blame-history #3: transient read errors close the issue — follow-up, same row as diff-bug #3
- blame-history #4: the bot PR body's last sentence changed for topic PRs — noted, requests nothing
- ripple #1: vitest.config.ts's list of tests that start pnpm — fix now, adds propose and issue, fixed 5ab92a2
- ripple #2: preload-fixture.ts's list of commands — fix now, adds `pnpm discover-issue`, fixed 5ab92a2
- ripple #3: DESIGN.md names only `post` on `githubClient` — fix now, names `patch`, fixed 5ab92a2
- ripple #4: DESIGN.md says `post` creates PRs only — fix now, adds issue comments and closes, fixed 5ab92a2
- ripple #5: DESIGN.md's discovery bullet omits `pnpm discover-issue` — fix now, fixed 5ab92a2
- ripple #6: discover.yml's comments do not name the issue workflow in its group — fix now, fixed 5ab92a2
- prior-review #1: transient read errors close the issue, against M008's rule that a 429 or 503 is not a final answer — follow-up, same row as diff-bug #3
- prior-review #2: anyone can now start the unzip and the install with write permissions — follow-up, new row "Limit what an issue run can reach"
- prior-review #3: DESIGN.md Architecture omits the new form, workflow, and command — fix now, bullet added, fixed 5ab92a2
- prior-review #4: same as ripple #1 and #2 — fix now, fixed 5ab92a2
- prior-review #5: a body line near 65,536 characters made the comment too long, so the issue got no answer — fix now, comments quote at most 2,000 characters of a message, with a test, fixed 5ab92a2
- prior-review #6: no `git check-ref-format` check before the push — follow-up, absorbed into "Stop retrying a failing bot pull request"
- prior-review #7: failure messages put runner paths in public comments — reject, style: the paths are in the public Actions log already and hold no secret
- No finding meets the return floor. After the fixes: `pnpm test` 11 files, 369 tests passed; `pnpm check` 0 problems.
