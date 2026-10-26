# M011: Read untrusted repos without push rights

**Status:** done (2026-10-26, PR #14 https://github.com/jmgirard/zotero-plugin-index/pull/14)

**Goal:** The two bot workflows read the repos that anyone can name only in jobs that cannot write to the index repo.

**Outcome:** `discover.yml` and `add-plugin-issue.yml` run a `read` job (`contents: read`, `pull-requests: read`,
`persist-credentials: false`, no `cache: pnpm`) and a `write` job that runs only `pnpm install` and `pnpm propose`.
`pnpm discover --handoff <dir>` (replaces `--propose`) and `pnpm discover-issue --handoff <dir>` write `plan.json` and
`entries/<id>/`, uploaded with `overwrite: true`; the job output `artifact-id` gates the write side. `pnpm propose <dir>`
(`src/discover/propose-cli.ts`) checks the handoff in `readHandoff` (`src/discover/handoff.ts`: Ajv schema, Mozilla add-on
ids, lowercase owner/repo, `git check-ref-format`, limit, exactly two regular files of at most 64 KiB) and refuses it
before any request; the issue number comes only from `ISSUE_NUMBER`. `discoverRead`/`proposeHandoff` and
`issueRead`/`issueAnswer` split each run; both steps read the bot pull requests and default branch. `draftEntry` runs
`plannedProblem` and refuses a failing entry as the recorded failure `not-proposable`. The token reaches `git fetch`/`push`
only as `GIT_CONFIG_*` extraheader; `pnpmCheck` drops `GITHUB_TOKEN`. Live: run 40313601247 opened PR #15; issue #16,
run 40313876526, opened PR #17; read jobs logged `Contents: read`, write jobs `Contents: write`.

**Decisions:** D-005 (`actions/download-artifact`). Milestone-local: none.

**Review:** Criteria audit 5 taken; claim audit 105 read, 5 corrected. Three four-lens passes, 36 findings: 27 fixed,
7 rejected (2 edge), 2 into rows "Keep read jobs from writing the cache" and "Check the index at the push base". Two
returns: a missing default branch now ends the read step (AC2); the failure-name pattern and write-step refusals that
stopped whole runs. CI passed. "Limit what an issue run can reach" graduated; "Stop retrying a failing bot pull request"
narrowed; "Keep issues open on a bot read failure" reworded; M008 row pruned; 8 lessons marked used, 1 captured.
