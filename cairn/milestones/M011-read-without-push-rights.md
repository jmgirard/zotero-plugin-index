# M011: Read untrusted repos without push rights

- **Status:** in-progress
- **Priority:** high
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — issue openers and the bot's pull requests depend on the bot workflows' answers
- **Branch/PR:** m011-read-without-push-rights

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

- [ ] AC1: In `.github/workflows/add-plugin-issue.yml` and `.github/workflows/discover.yml`, parsed with Ruby's YAML,
      each job whose steps run `pnpm discover` or `pnpm discover-issue` sets its own `permissions` map with no value
      other than `read` or `none`, and its `actions/checkout` step sets `persist-credentials: false`. In each job
      whose effective permissions (its own map, else the workflow's, `write-all` counting) include `write`, the
      only `run` steps are `pnpm install --frozen-lockfile` and one `pnpm propose` step.
- [ ] AC2: For each case in `test/propose.test.ts` and `test/issue.test.ts` at the plan commit that asserts a GitHub
      request, an issue comment or close, or a pushed commit tree, the read command (`pnpm discover --handoff <dir>`
      or `pnpm discover-issue --handoff <dir>`) followed by `pnpm propose <dir>` gives the same requests (method,
      URL, and body, with the temporary path in the check output replaced), comments, closes (state and reason), and
      trees as the one-step command gives on that commit. A bot failure in the read step reaches `pnpm propose` in
      the handoff, so its comment stays as it is today.
- [ ] AC3: `pnpm propose` names a refusal and sends no push and no POST or PATCH request for each of these planted
      handoffs in a test: a plan file that does not match its schema, or that names an issue number (the issue
      number comes only from `ISSUE_NUMBER`); an entry id that is not a Mozilla add-on id (a GUID in braces, or
      `[A-Za-z0-9-._]*@[A-Za-z0-9-._]+`), one with `/` or `..` included; a repo that is not a lowercase
      `owner/repo` pair, or whose `discover/<owner>/<repo>` branch `git check-ref-format` rejects; more entries
      than `--limit`, or more than one for an issue; and an entry directory that holds a subdirectory, a symbolic
      link (one named `meta.json` included), or a file other than `meta.json` and `index.json`. A repo or id that
      an entry or an open bot pull request already has gets no push, and an issue run answers it as it does today.
      A message from the handoff reaches an issue comment only inside a code span (a test with `@someone` in it).
- [ ] AC4: In the write job of both workflows, the `actions/checkout` step sets `persist-credentials: false`,
      `actions/setup-node` has no `cache` key, and no step but the `pnpm propose` step names `secrets.GITHUB_TOKEN`
      or `github.token` in its `env` or `with` (Ruby parse). A test runs `propose` with `GITHUB_TOKEN` set against
      a local bare remote, and finds the token in no git config file that `git config --list --show-origin` reads
      in the checkout, in no argument of a `git` command it ran, and not in the environment of the `pnpm check` it
      ran.
- [ ] AC5: In the issue workflow, the write job runs when the read job failed and not when it was skipped (its `if:`
      holds `always()` and `needs.<read job>.result != 'skipped'`), and its download step does not fail the job
      when no handoff exists (Ruby parse). `pnpm propose`, given the issue number and no handoff, comments that the
      bot could not finish, leaves the issue open, and exits 1 (test).
- [ ] AC6: After the merge, an issue the user opens from a prefilled "Add a plugin" link gets the bot's answer (a
      pull request or a refusal comment), and a dispatched `Discover plugins` run with `limit` 1 ends with both
      jobs green; each run's job logs show `Contents: read` for the read job and `Contents: write` for the write
      job in the "GITHUB_TOKEN Permissions" group.
- [ ] AC7: `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check` pass.

## Coverage

- AC1 → T1, T5
- AC2 → T1, T2, T3
- AC3 → T2, T3
- AC4 → T2, T4, T5
- AC5 → T2, T5
- AC6 → T5, T7
- AC7 → T1, T2, T3, T4, T5, T6

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

## Decisions

## Review
