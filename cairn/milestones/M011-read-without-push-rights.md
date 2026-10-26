# M011: Read untrusted repos without push rights

- **Status:** review
- **Priority:** high
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — issue openers and the bot's pull requests depend on the bot workflows' answers
- **Branch/PR:** m011-read-without-push-rights, https://github.com/jmgirard/zotero-plugin-index/pull/14

## Goal

The two bot workflows read the repos that anyone can name only in jobs that cannot write to the index repo.

## Scope

**In:** Split `.github/workflows/add-plugin-issue.yml` and `.github/workflows/discover.yml` into a read job and a
write job, as `build.yml` already splits build and deploy. The read job has read-only permissions and no stored
token. It runs `pnpm discover --handoff <dir>` or `pnpm discover-issue --handoff <dir>`. Each command writes a
handoff, which is a plan file plus the drafted entry directories, and the job uploads the handoff as an artifact. The
write job downloads it and runs a new `pnpm propose <dir>` command. That command treats the handoff as untrusted. It
checks the handoff, checks the index and the bot pull requests again by repo and id, runs `pnpm check`, pushes the
`discover/<owner>/<repo>` branches, opens the pull requests, and answers the issue. The token reaches `git push` only
through git config that the environment sets. `pnpm discover --handoff` replaces `pnpm discover --propose`. README,
DESIGN.md, and CHANGELOG.md describe the two jobs.

**Out:** The output bound on the unzip → M012. A time budget for discover runs → candidate "Bound the time of a
discover run". Issue answers on a passing read failure, canceled runs, refused branch names, and closing an issue
when its pull request closes → candidates "Keep issues open on a bot read failure", "Answer issues whose run was
canceled", "Stop retrying a failing bot pull request", and "Close the issue when its pull request closes".
`build.yml`, which already reads with `contents: read` and deploys from a separate job, is unchanged.

## Acceptance criteria

- [x] AC1: In `.github/workflows/add-plugin-issue.yml` and `.github/workflows/discover.yml`, parsed with Ruby's YAML,
      each job whose steps run `pnpm discover` or `pnpm discover-issue` sets its own `permissions` map with no value
      other than `read` or `none`, and its `actions/checkout` step sets `persist-credentials: false`. In each job
      whose effective permissions (its own map, else the workflow's, `write-all` counting) include `write`, the
      only `run` steps are `pnpm install --frozen-lockfile` and one `pnpm propose` step.
- [x] AC2: For each case in `test/propose.test.ts` and `test/issue.test.ts` at the plan commit that asserts a GitHub
      request, an issue comment or close, or a pushed commit tree, the read command (`pnpm discover --handoff <dir>`
      or `pnpm discover-issue --handoff <dir>`) followed by `pnpm propose <dir>` gives the same requests (method,
      URL, and body, with the temporary path in the check output replaced), comments, closes (state and reason), and
      trees as the one-step command gives on that commit. A bot failure in the read step reaches `pnpm propose` in
      the handoff, so its comment stays as it is today.
- [x] AC3: `pnpm propose` names a refusal and sends no push and no POST or PATCH request for each of these planted
      handoffs in a test: a plan file that does not match its schema, or that names an issue number (the issue
      number comes only from `ISSUE_NUMBER`); an entry id that is not a Mozilla add-on id (a GUID in braces, or
      `[A-Za-z0-9-._]*@[A-Za-z0-9-._]+`), one with `/` or `..` included; a repo that is not a lowercase
      `owner/repo` pair, or whose `discover/<owner>/<repo>` branch `git check-ref-format` rejects; more entries
      than `--limit`, or more than one for an issue; and an entry directory that holds a subdirectory, a symbolic
      link (one named `meta.json` included), or a file other than `meta.json` and `index.json`. A repo or id that
      an entry or an open bot pull request already has gets no push, and an issue run answers it as it does today.
      A message from the handoff reaches an issue comment only inside a code span (a test with `@someone` in it).
- [x] AC4: In the write job of both workflows, the `actions/checkout` step sets `persist-credentials: false`,
      `actions/setup-node` has no `cache` key, and no step but the `pnpm propose` step names `secrets.GITHUB_TOKEN`
      or `github.token` in its `env` or `with` (Ruby parse). A test runs `propose` with `GITHUB_TOKEN` set against
      a local bare remote, and finds the token in no git config file that `git config --list --show-origin` reads
      in the checkout, in no argument of a `git` command it ran, and not in the environment of the `pnpm check` it
      ran.
- [x] AC5: In the issue workflow, the write job runs when the read job failed and not when it was skipped (its `if:`
      holds `always()` and `needs.<read job>.result != 'skipped'`), and its download step does not fail the job
      when no handoff exists (Ruby parse). `pnpm propose`, given the issue number and no handoff, comments that the
      bot could not finish, leaves the issue open, and exits 1 (test).
- [ ] AC6: After the merge, an issue the user opens from a prefilled "Add a plugin" link gets the bot's answer (a
      pull request or a refusal comment), and a dispatched `Discover plugins` run with `limit` 1 ends with both
      jobs green; each run's job logs show `Contents: read` for the read job and `Contents: write` for the write
      job in the "GITHUB_TOKEN Permissions" group.
- [x] AC7: `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check` pass.

## Coverage

- AC1 → T1, T5
- AC2 → T1, T2, T3, T8, T9
- AC3 → T2, T3, T9
- AC4 → T2, T4, T5
- AC5 → T2, T5
- AC6 → T5, T7
- AC7 → T1, T2, T3, T4, T5, T6, T8, T9

## Tasks

- [x] T1: Define the handoff in a new `src/discover/handoff.ts`: a plan file with a JSON schema (kind `discover` or
      `issue`, the drafted entries' structured fields, and for an issue a refusal or failure name and message) and
      `entries/<id>/` directories. Add `--handoff <dir>` to `pnpm discover` (`src/discover/cli.ts`) in place of
      `--propose`. The read step still reads the bot pull requests for the skip set, and it writes the state file.
      Add `--handoff <dir>` to `pnpm discover-issue` (`src/discover/issue-cli.ts`, `issue.ts`), which then makes no
      GitHub write. Test the read side against the fixtures.
- [x] T2: Add `pnpm propose <dir> [--limit <n>]` (`src/discover/propose-cli.ts`). It takes `ISSUE_NUMBER` for
      an issue run and checks the handoff (AC3's list), then checks the index and the bot pull requests again. It
      runs `pnpmCheck` with `GITHUB_TOKEN` removed from the child's environment, and pushes and opens pull requests
      through `propose` (`src/discover/propose.ts:174`). It builds each issue comment from structured fields, with
      messages in code spans. With an issue number and no handoff, it posts the "could not finish" comment.
- [x] T3: Move the cases of `test/propose.test.ts` and `test/issue.test.ts` that assert requests, comments, closes,
      or trees onto the two-step path (AC2), with the check output's temporary path replaced in body comparisons.
      Add the planted-handoff tests (AC3). Build each fixture from a copy of a good handoff.
- [x] T4: In `propose`, pass `GITHUB_TOKEN` to `git push` only through `GIT_CONFIG_COUNT`, `GIT_CONFIG_KEY_0`, and
      `GIT_CONFIG_VALUE_0` (an `http.https://github.com/.extraheader`), never through argv or a config file. Test
      it against a local bare remote with a `git` shim on `PATH` that logs argv (AC4).
- [x] T5: Split both workflows. Read job: its own read-only `permissions`, `persist-credentials: false`, the
      discover state cache (restore and save) for `discover.yml`, and `actions/upload-artifact@v7` of the handoff.
      Write job: `needs` the read job, the write permissions, `persist-credentials: false`, `actions/setup-node`
      with no `cache`, `actions/download-artifact` (D-005), and `pnpm propose` with `GITHUB_TOKEN`, `ISSUE_NUMBER`,
      and `LIMIT` in its `env`. The issue write job's `if:` and its download step follow AC5. The concurrency group
      `discover` stays at workflow level. Check AC1, AC4, and AC5 with `ruby -ryaml`, reading the trigger as
      `w[true]`.
- [x] T6: Update README (the discovery and "Proposing a plugin with an issue" sections), DESIGN.md (Function
      Families, Architecture), and one CHANGELOG.md entry under Unreleased.
- [ ] T7: Live check after the merge (review): give the user a link with `?template=add-plugin.yml&` and the URL
      input prefilled, run `gh workflow run discover.yml -f limit=1`, and read both runs' job logs (AC6).
- [x] T8: Review return 1: read the default branch in `discoverRead` and `issueRead` too, so a missing default branch ends the read step before any repo read, as the one-step command did; restore the plan-commit test for it.
- [x] T9: Review return 2: allow digits in the plan's failure names; have `draftEntry` refuse, as the recorded failure `not-proposable`, a drafted entry that `readHandoff` would refuse; cut read-step messages to what a comment quotes; refuse an `entries` that is not a directory; upload the handoff whenever `plan.json` exists, with `overwrite: true`, and run the discover write job whenever the read job ran; add the tests and reword the three candidate rows the review named.

## Work log

- 2026-10-26: created by /milestone-plan.
- 2026-10-26: tier check: milestone — splits two workflows and adds a command, a design change to running code.
- 2026-10-26: idea vet: one concern, that the scheduled discover job unzips XPIs of repos anyone can tag while it holds a write token, so a split of the issue job alone leaves the same exposure; the user chose to split both workflows.
- 2026-10-26: lessons used: 2026-10-25 (M001) pnpm through npx; 2026-10-25 (M002) preload fixture for CLIs; 2026-10-25 (M006) Ruby for workflow YAML; 2026-10-26 (M010) Ruby reads `on:` as `true`; 2026-10-26 (M010) prefilled form link for the live test; 2026-10-26 (M009) built-in token PRs start no CI; 2026-10-26 (M009) commits built with a temporary index file.
- 2026-10-26: question set: split the issue workflow alone or both — both.
- 2026-10-26: question set: live check after the merge — the user opens one issue from a prefilled link, and review dispatches one `Discover plugins` run with limit 1.
- 2026-10-26: question set: add `actions/download-artifact` — yes (D-005).
- 2026-10-26: plan gate chose two jobs in one workflow with an artifact handoff over a `workflow_run` second workflow, because the same run's artifact needs no cross-run trust lookup; falsified by a GitHub change that lets one job's step drop its token permissions.
- 2026-10-26: plan gate chose a separate read job over one job with the token only in the push step's env, because the process that parses an XPI would still hold a write token in its environment; falsified by evidence that the reader runs in a process separate from the token.
- 2026-10-26: plan gate chose to replace `pnpm discover --propose` over keeping it beside `--handoff`, because two paths to the same push double the tests; falsified by a need to propose from a local machine in one step.
- 2026-10-26: criteria audit (full): 5 findings on these criteria, all taken: AC1 names the only commands a write job may run; AC2 covers only cases that assert requests, comments, or trees, with the check output's path replaced; AC3 uses Mozilla's add-on id format (the registry schema has no id pattern) and adds hostile-value plants; AC4 names `secrets.GITHUB_TOKEN`/`github.token` in `env`/`with`, every git config file, and the check child's environment; AC5 skips unlabeled issues and tolerates a missing handoff. AC6 and AC7: no finding.
- 2026-10-26: inbox sweep: 1 open issue (#12) and 2 bot pull requests (#10, #13), no overlap.
- 2026-10-26: collision check: absorbs candidate "Limit what an issue run can reach"; extends M009 and M010 (archived); D-001 to D-004 do not conflict.
- 2026-10-26: implement started on branch m011-read-without-push-rights; paused before T1 code at the user's request to discuss whether the split is worth its cost.
- 2026-10-26: resumed at the user's request ("Continue M011 as planned.").
- 2026-10-26: T1-T4 landed in one commit, because the old propose and issue tests reference `proposeRun` and `issueRun` and fail the type check until the write step and the moved tests exist.
- 2026-10-26: implement chose `discoverRead`/`proposeHandoff` in `propose.ts` and `issueRead`/`issueAnswer` in `issue.ts`, a `pnpm propose` script in `src/discover/propose-cli.ts`, and `pnpm discover-issue --handoff <dir>` as that command's only form; the read step writes a `known` outcome for a repo the index or a bot pull request has, and the write step answers it from its own read.
- 2026-10-26: implement chose to validate `plan.json` with Ajv (D-001) against a schema in `handoff.ts`; the failure name must match `^[a-z][a-z-]{0,59}$`, string fields have length caps, and each entry file is capped at 64 KiB.
- 2026-10-26: a handoff that `readHandoff` refuses gets no answer on its issue, as AC3 requires; the write job fails, which shows on the run.
- 2026-10-26: T4 check discrimination: passing the full environment to `pnpm check`, and dropping the environment config from the push, each turned the token test red; restored from a copy.

- 2026-10-26: T5: both workflows set `permissions: {}` and per-job maps; the read jobs also drop `cache: pnpm`, since a dependency cache a read job saves on the default branch would reach later jobs; `actions/download-artifact@v8` (the latest major, 2026-10-07) beside `upload-artifact@v7`; handoff artifacts kept 1 day.
- 2026-10-26: T5 Ruby check (AC1, AC4, AC5 shapes) passes on the branch and reports 15 failures on main's two workflows.
- 2026-10-26: T6: README ("Pull requests from the bot", "Proposing a plugin with an issue"), DESIGN.md (Function Families, Architecture), one CHANGELOG.md entry, and the preload comment updated; T7 is the live check after the merge, run by review.
- 2026-10-26: claim audit pass found 5 false or misleading claims of about 105 (the write step's index re-check reads its own checkout, not a fresher index; "reads no repo" in both workflows; the README refusal list read as complete; the issue CLI's exit-1 comment; the issue run's limit of 1); all 5 corrected in comments, README, DESIGN.md, and two test names; the same reader's re-read is pending.
- 2026-10-26: claim audit: 105 claims read, 5 corrected — src/discover/propose.ts, src/discover/issue.ts, src/discover/issue-cli.ts, .github/workflows/add-plugin-issue.yml, .github/workflows/discover.yml, README.md, cairn/DESIGN.md, test/propose.test.ts, test/issue.test.ts; the reader's re-read found all 5 hold, and one comment rewrapped.
- 2026-10-26: implement done; T1-T6 checked, `pnpm test` (393 tests) and `pnpm check` (14 entries, 0 problems) pass; T7 is the post-merge live check; status review.
- 2026-10-26: review return 1: AC2 — the plan-commit case "ends the run before discovery reads when the repo record has no default branch" sent no search request; on the branch the read step searches and drafts and only the write step fails, so the requests differ; the read steps (`discoverRead`, `issueRead`) must also read the default branch and end before any repo read when it fails.
- 2026-10-26: minor amendment: T8 added for review return 1; Coverage AC2 and AC7 gain T8.
- 2026-10-26: T8: `discoverRead` and `issueRead` read the default branch after the pull requests; the plan-commit case is back as "the read step ends before discovery reads when the repo record has no default branch", the write-step test now runs `proposeHandoff` on a planted handoff, and the issue table gains the case with a check that the repo is not read; removing the two reads turned both new cases red; `pnpm test` 395 passed, `pnpm check` 0 problems.
- 2026-10-26: claim audit: not rerun for T8, whose 3 changed comment lines go to the review's diff-bug lens; deviation from step 7 logged.
- 2026-10-26: implement done again; status review.
- 2026-10-26: review return 2: AC2 — the handoff schema's failure-name pattern refuses `max-version-below-7`, so that issue gets no answer; and a load-bearing defect — a drafted entry that `readHandoff` refuses (an id outside the Mozilla format, a repo whose branch name git refuses, a field over its length cap) refuses the whole discover handoff on every run. Fix-now list with them: message cut in the read step, `entries` symlink check, upload on `plan.json` and write job on a ran read job, `overwrite: true`, a non-`ReadFailure` test row, and three candidate rows reworded (Review section).
- 2026-10-26: minor amendment: T9 added for review return 2; Coverage AC2, AC3, and AC7 gain T9.
- 2026-10-26: T9: failure-name pattern `^[a-z0-9][a-z0-9-]{0,59}$`; `plannedProblem` in `handoff.ts` (the entry schema and checks) runs in `draftEntry` after `writeEntry`, which removes the entry and refuses `not-proposable` (recorded), so `unsafe-id` keeps its name; `issueRead` cuts messages to 2,001 characters; `readHandoff` refuses an `entries` that is not a directory; both uploads run on `plan.json` with `overwrite: true`, and the discover write job runs unless the read job was skipped or the run canceled; tests for a digit in a failure name, two `not-proposable` issue cases, a mixed discover run, a non-`ReadFailure` read, and a symlinked `entries`; three rows reworded and two follow-up rows added; README, CHANGELOG, DESIGN. Planting the old pattern, skipping the new check, and skipping the `entries` check turned the 5 new tests red. `pnpm test` 401 passed.
- 2026-10-26: implement done again; status review.
- 2026-10-26: step-7 approval: m011-read-without-push-rights approved for merge
- 2026-10-26: PR #14 merged 2026-10-26T11:14:07Z as 682d6d1 after CI passed (2 checks); AC6 waits on the live check: one `Discover plugins` dispatch with limit 1, and one issue the user submits from a prefilled "Add a plugin" link.
- 2026-10-26: AC6 discover half: `gh workflow run discover.yml -f limit=1` run 40313601247 succeeded; job `read` logs "GITHUB_TOKEN Permissions" `Contents: read`, `PullRequests: read`, job `write` `Contents: write`, `PullRequests: write`; the write job opened PR #15 (noedgeai/doc2xzoteroplugin) from `discover/noedgeai/doc2xzoteroplugin`. The issue half waits on the user's issue for retorquere/zotero-better-bibtex.

## Decisions

## Review

Evidence on the branch at 3fa8346, 2026-10-26; main had not moved (`git rev-list HEAD..origin/main` 0).
- AC1: `ruby -ryaml` check over both workflows: top-level `permissions: {}` in each; the jobs that run `pnpm discover --handoff` and `pnpm discover-issue --handoff` (`read` in each file) set `contents: read, pull-requests: read` and their checkout sets `persist-credentials: false`; the jobs with a `write` value (`write` in each) have exactly the `run` steps `pnpm install --frozen-lockfile` and one `pnpm propose handoff …`. The same check reports 15 failures on main's two workflows.
- AC2: every plan-commit (8f5feaf) case in `test/propose.test.ts` and `test/issue.test.ts` that asserts a request, comment, close, or pushed tree has a two-step counterpart that passes (61 tests in those files and `test/handoff.test.ts`): the push-5-of-7 run (`pnpm discover --handoff` then `pnpm propose`: same POST heads and base, same 5 refs, each one commit on main adding the two files, checkout untouched); the body contents; the open-PR id refusal with no POST; the two read-step ends before any search (pull list 503, no default_branch, restored by T8); every-entry `git fetch failed`; the non-JSON create answer; the refused push plus 422 run (same stderr lines, POST heads q2 then q1, `proposed` q1); every issue case through `issueRead`, a handoff on disk, `readHandoff`, and `issueAnswer` with the same comments, PATCH bodies, and exit codes; the CLI push failure with its one comment. Bodies are compared by content (`toContain`), so the check output's temporary path is not compared.
- AC3: `test/handoff.test.ts` runs `pnpm propose` in a checkout with a pushable remote on 17 planted handoffs: an undefined field, a JSON string, an `issue` field, a failure name with a backtick, the ids `alpha`, `a/b@example.org`, and `..`, the repos `Example/Alpha` and `example/alpha/x`, the branch `discover/example/.alpha`, a repo URL for another repo, 2 entries with `--limit 1`, a second entry directory for an issue, a subdirectory, an extra file, a symbolic-link `meta.json`, and a symbolic-link entry directory. Each exits 1 with `refused the handoff: <reason>`, logs no non-GET request, and leaves no `refs/heads/discover` ref; the trusted control pushes `discover/example/alpha` and sends one POST. `proposeHandoff` skips with no request or ref an entry whose repo the index names (`in-index`) or whose id an open bot PR adds (`in-bot-pull`); `issueAnswer` answers an entry whose repo the checkout's index names with the M010 comment and a `completed` close and no push; a handoff message `see @someone\n\n@other` reaches the comment as `` ` see @someone @other ` `` and no `@` stays outside code spans.
- AC4: `ruby -ryaml`: each write job's checkout sets `persist-credentials: false`, its `actions/setup-node` has `node-version` only, and only its `pnpm propose` step names `secrets.GITHUB_TOKEN` (no `github.token` anywhere). Test "the token" runs the two steps with `GITHUB_TOKEN` set, a logging `git` shim, and a logging `pnpm`, against a local bare remote: the push succeeds, its line carries `key=http.https://github.com/.extraheader`, and neither the token nor its base64 header appears in any logged git argument or in `git config --list --show-origin`; the check's environment holds no token. Passing the full environment to the check, and dropping the push's environment config, each turned it red (implement).
- AC5: `ruby -ryaml`: the issue write job has `needs: read` and `if: always() && needs.read.result != 'skipped'`, and its `actions/download-artifact@v8` step has `continue-on-error: true`. Test "comments that the bot could not finish …": `pnpm propose` on a missing directory with `ISSUE_NUMBER=7` exits 1, and its only non-GET request is the comment "The bot could not finish, so this issue stays open …` the read step left no handoff `"; no PATCH.
- AC6: owed after the merge (T7); not verified yet.
- AC7: `npx -y pnpm@12.15.0 test`: type check clean, Test Files 12 passed (12); Tests 395 passed (395); `npx -y pnpm@12.15.0 check`: checked 14 entries in plugins, 0 problems.
- Gate: `cairn_validate.py` exit 0, all checks passed; no DESIGN principle changed, so no `cairn_impact`; the generic profile's consistency-gate names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: the plan's failure-name pattern `^[a-z][a-z-]{0,59}$` refuses the reader's `max-version-below-7`, so such an issue gets no answer where main commented and closed it (AC2) — fix now, floor return 2
- diff-bug #2: the read step drafts entries the write step refuses (an id `SAFE_ID` accepts and `ADDON_ID` refuses, a repo like `owner/.x` or `owner/x.lock`), and one such entry refuses the whole handoff on every scheduled run — fix now, floor return 2 (load-bearing: it stops all discovery)
- diff-bug #3: with `always()`, the issue write job runs after a canceled read job and posts "could not finish" — reject, planned change: AC5 names `always()`, and the comment is true
- diff-bug #4: a `not-github-repo` message holding a long URL line of control characters can push `plan.json` past its size bound for an issue run — fix now: the read step cuts each message to the 2,000 characters a comment quotes
- diff-bug #5: the discover read job keeps cache-save rights after the XPI reader, so a process that took it over could save a cache entry that `build.yml`'s `cache: pnpm` restores — follow-up, new row "Keep read jobs from writing the cache" (main's one job had the same reach)
- diff-bug #6: the `entries` directory itself is followed if it is a symbolic link — fix now: `readHandoff` refuses an `entries` that is not a directory
- diff-bug #7: the write step checks the index at the run's commit but builds on the newest default branch, so an id merged during the run can be proposed again — follow-up, new row "Check the index at the push base" (on main the window was shorter, not absent)
- diff-bug #8: a failed state write now skips the handoff upload and drops the run's pull requests, where main opened them first — fix now: the upload runs whenever `plan.json` exists and the write job whenever the read job ran
- diff-bug #9: a re-run's second upload of the name `handoff` may conflict with the first attempt's — fix now: `overwrite: true` on both uploads
- diff-bug #10: `if (read.plan.kind !== "discover") return 1` cannot run — reject, style: it narrows the type
- diff-bug (c): "capital letters" and "three parts", and the extra-field and JSON-string plans, run the same check — reject, planned change: AC3 names both forms of each
- blame-history #1: `ADDON_ID` is stricter than `SAFE_ID` — fix now, as diff-bug #2
- blame-history #2: a refused issue handoff leaves the issue unanswered — reject, planned change: AC3 requires no POST for a refused handoff; with diff-bug #2 fixed, a read step that is not taken over writes no refused handoff
- blame-history #3: a failed state write drops the pull requests — fix now, as diff-bug #8
- blame-history #4: no test covers an error other than `ReadFailure` from the read step's pull-request read — fix now: a test row with an unexpected response
- blame-history #5: version and range strings over 500 characters refuse the whole handoff — fix now, as diff-bug #2
- prior-review #1: one bad branch name refuses the whole run, against M009's "a failure for one entry is reported, and the run goes on" — fix now, as diff-bug #2
- prior-review #2: a refused issue handoff gets no comment, against M010's answered-issue fix — reject, planned change, as blame-history #2
- ripple #1: row "Limit what an issue run can reach" describes the pre-M011 job — fix now: the row graduates at hygiene
- ripple #2: row "Stop retrying a failing bot pull request" names `pnpm discover --propose` and a push by `pnpm discover-issue` — fix now: the row is reworded to the new commands, and its branch-name part narrows once diff-bug #2's fix records such repos
- ripple #3: row "Keep issues open on a bot read failure" names `pnpm discover-issue` as the command that closes — fix now: reworded to `pnpm propose`

Pass 3 evidence on the branch at d7b0873, 2026-10-26, after review returns 1 and 2; main had not moved.
- AC1, AC4, AC5: the `ruby -ryaml` check passes again (the T9 upload `if:` and the discover write job's `if:` add no `run` step and name no token); the issue write job's `if:` and `continue-on-error` are unchanged.
- AC2, AC3: the three test files pass again; AC3's plants are now 18 with the symbolic-link `entries`, and the new tests for a digit in a failure name, `not-proposable` in an issue run and in a mixed discover run, and a non-`ReadFailure` read pass.
- AC7: `npx -y pnpm@12.15.0 test`: type check clean, Test Files 12 passed (12); Tests 401 passed (401); `npx -y pnpm@12.15.0 check`: checked 14 entries in plugins, 0 problems.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: a discover plan carried the search result's repo name and URL while `draftEntry` checked the reader's, so a renamed repo's old name could refuse the handoff — fix now: the written item carries the checked name and URL, fixed c48b43a
- diff-bug #2: the discover write job ran, and failed at the download, after a read failure that left no plan — fix now: the read job outputs its upload's `artifact-id`, and the write job runs only when it is set, fixed c48b43a
- diff-bug #3: on a re-run whose read attempt uploads nothing, the write side could download the earlier attempt's handoff — fix now: the issue download runs only when this attempt's `artifact-id` is set, fixed c48b43a
- diff-bug #4: `entryProblem` named any `git check-ref-format` failure, a spawn failure included, an invalid branch, which the read step recorded — fix now: only exit status 1 is a refused name, and a thrown check is `unexpected-error`, not recorded, fixed c48b43a
- diff-bug #5: an issue repo name that a bot branch or entry has but the handoff's repo shape refuses gave a `known` plan that `readHandoff` refuses — fix now: such a name is never `known`, and the read goes on to `not-proposable`, fixed c48b43a
- diff-bug #6: `plannedProblem` called every schema failure "longer", and the length route had no test — fix now: the message names empty or longer, and a 600-character version test, fixed c48b43a
- diff-bug #7: the message cut can split a surrogate pair — reject, edge: only a message whose 2,001st code unit starts a pair reaches it, and the effect is one replacement character; the comment cut on main does the same
- blame-history #1: the discover write job turns red after a read failure without a plan — fix now, as diff-bug #2
- blame-history #2: a git spawn failure is recorded as `not-proposable` for 30 days — fix now, as diff-bug #4
- blame-history #3: the read-step cut splits by UTF-16 code units — reject, edge, as diff-bug #7
- prior-review #1: a drafted `meta.json` over 64 KiB, from a long manifest description, passed the read-step check and refused the whole handoff — fix now: `plannedProblem` also checks the drafted directory's files, with a 70,000-character description test, fixed c48b43a (not floor-qualifying: no criterion fails, and the plugins it blocks need a manifest built to do it, so the agent judged it a fix on the branch)
- prior-review #2: no test for the length cap or the "names no owner/repo" branch — fix now for the length cap, as diff-bug #6; reject for the other, false: the reader returns only GitHub repo URLs, so `repoName` always gives a name there
- prior-review #3: the discover download has no `continue-on-error` — fix now, as diff-bug #2
- ripple #1: row "Limit what an issue run can reach" still describes the pre-M011 job — fix now: it graduates at hygiene (pass 2)
- ripple #2: DESIGN.md placed the open bot pull requests' file read in the write step alone — fix now: both steps named, fixed c48b43a
- Pass-3 fixes: planting each back (no file check, no exit-code test, `known` without the shape test, the search name in the plan) turned 4 of the 5 new tests red; restored; `pnpm test` 406 passed, `pnpm check` 0 problems, the `ruby -ryaml` workflow check passes.
