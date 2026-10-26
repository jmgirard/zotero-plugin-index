# M016: Restore no cache in the deploy build

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the build job writes the site and data that Pages publishes
- **Branch/PR:** m016-no-build-cache

## Goal

The daily build that deploys the site and data restores no Actions cache. So a cache entry that another job saved cannot change what it publishes.

## Scope

**In:** Remove `cache: pnpm` from the `actions/setup-node` step of `build.yml`, with a comment that says why. Add a
test under `pnpm test`. If `build.yml` uses an `actions/cache` action or sets a `cache` input, the test fails. Add a
`CHANGELOG.md` entry and update the `build.yml` text in `cairn/DESIGN.md` Architecture. Run `build.yml` once on the
milestone branch to show that its build job passes with no cache.

**Out:** `ci.yml` keeps `cache: pnpm`. Its job holds only `contents: read` and deploys nothing, so a planted store
there can change only a CI result. No row holds it. The read jobs of `discover.yml` and `add-plugin-issue.yml` stay
as M011 left them, with no dependency cache. The discovery state cache stays, because only the read job restores it.

## Acceptance criteria

- [x] AC1: In `.github/workflows/build.yml`, no step of any job has a `uses:` that names `actions/cache`,
      `actions/cache/restore`, or `actions/cache/save`. No step's `with:` block has a `cache` key.
- [x] AC2: `test/workflows.test.ts` fails on each of these forms in `build.yml`: a block `cache:` key, a flow
      `{cache: …}` key, and a `uses:` of `actions/cache@`, `actions/cache/restore@`, or `actions/cache/save@` in any
      letter case. It passes on the milestone's `build.yml`.
- [x] AC3: A `workflow_dispatch` run of `build.yml` on the milestone branch finishes its `build` job with success.
      That job restores no cache: its log, searched case-sensitively, has no line containing `Cache restored`. The
      `deploy` job is outside this criterion, because the `github-pages` environment takes deploys from `main` only.
- [x] AC4: `CHANGELOG.md`'s `## Unreleased` section and `cairn/DESIGN.md`'s Architecture text on `build.yml` each
      state that the build job of `build.yml` restores no Actions cache.
- [x] AC5: The `verify` slot is clean: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T2
- AC2 → T1
- AC3 → T4
- AC4 → T3
- AC5 → T5

## Tasks

- [x] T1: Add `test/workflows.test.ts`: read `.github/workflows/build.yml`, drop comments, and fail on each AC2 form
      (not on `package-manager-cache` or `cache-dependency-path`). See it fail on the current file, naming the
      `cache: pnpm` line. Then plant each other AC2 form in turn in a copy of the fixed file and see each fail.
      Restore from a copy, never `git checkout` (lesson M010).
- [x] T2: Remove `cache: pnpm` from the build job's `actions/setup-node` step (`build.yml:27-30`). Add a comment on
      why, written from a same-session read of GitHub's cache docs. Parse the file with `ruby -ryaml` (lesson M006)
      and list each job's steps, their `uses:`, and their `with:` keys.
- [x] T3: Add the `CHANGELOG.md` entry under `## Unreleased` and update the `build.yml` text in `cairn/DESIGN.md`
      Architecture, both in the AC4 wording.
- [x] T4: Push the branch and dispatch `build.yml` on it (`gh workflow run build.yml --ref <branch>`). Read the build
      job's result and its log only (`gh run view <id> --log --job <build-job-id>`). First run the same search over
      the newest `main` run's build log and see it find `Cache restored from key: node-cache-…`, so the search is not
      blind. If the build job fails on upstream reads outside this change, dispatch it again.
- [x] T5: Run the `verify` slot: `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check`.

## Work log

- 2026-10-26: created by /milestone-plan.
- 2026-10-26: tier check: not run — work named at the question set.
- 2026-10-26: idea vet: no concern. The row's other fix, keeping caches out of the read jobs, cannot hold: those jobs declare no dependency cache since M011, and a job that a crafted file took over can save a cache entry whatever its steps declare. So the fix goes in the job that restores.
- 2026-10-26: question set: next work — the user chose "Stop cache planting", the row "Keep read jobs from writing the cache"; the user-reports questions did not apply.
- 2026-10-26: collision check: absorbs the candidate row "Keep read jobs from writing the cache"; extends M011 (done); no D-entry overlaps. Inbox: 0 open issues, 1 open bot PR (#15), no overlap.
- 2026-10-26: plan gate chose dropping the cache from `build.yml` over keeping caches out of the read jobs, because a taken-over job can save cache entries with its runtime token whatever its steps declare; falsified by evidence that GitHub keeps that token from a job's steps or scopes cache writes to the job that declared them.
- 2026-10-26: plan chose keeping `cache: pnpm` in `ci.yml` over removing it, because `ci.yml` deploys nothing and holds only `contents: read`; falsified by evidence that a CI result gates a deploy or a write.
- 2026-10-26: criteria audit (full mode, Opus reader): 8 findings, 6 taken. AC1 split into the file property (AC1) and the test's listed forms (AC2), the Ruby parse moved to T2, AC3 narrowed to a case-sensitive search of the build job's log for `Cache restored`, AC4 given one wording, T4 allows a re-dispatch. No finding on verify, coverage, or false hits from the tool-cache line.
- 2026-10-26: plan decided one `CHANGELOG.md` entry, as M011 had for its workflow change; tests limited to the AC2 forms.
- 2026-10-26: lessons used: 2026-10-25 (M001) pnpm through npx; 2026-10-25 (M006) Pages deploys from main only; 2026-10-25 (M006) parse workflows with Ruby's YAML; 2026-10-26 (M010) plant a defect from a copy.
- 2026-10-26: implement started on branch `m016-no-build-cache`, cut from main at 83c17ec.
- 2026-10-26: T1: `test/workflows.test.ts` failed on main's `build.yml`, naming `cache: pnpm`. With the fix in place, planted flow `{cache: pnpm}`, `actions/cache@v6`, `ACTIONS/CACHE/RESTORE@v6`, and `Actions/Cache/Save@v6` each failed it on its own line; restored from a copy. The test also holds one case per form and a case for `package-manager-cache`, `cache-dependency-path`, and a comment.
- 2026-10-26: T2: GitHub's cache docs (cache-mode added to the docs 2026-09-10) say `schedule` and `workflow_dispatch` runs can save caches in the default branch's scope, `issues` runs get read-only cache access, and a `cache-mode` key, enforced by the job's cache token, limits a job's access. So the discover read job can still plant a cache, and the issue read job cannot. The plan's falsifier (GitHub scoping cache writes per job) half holds, but the discover read job must save its state cache, so the chosen fix stands.
- 2026-10-26: T2: implementation choice: besides removing `cache: pnpm`, `build.yml` sets top-level `cache-mode: none`, so the token itself refuses a restore if a cache step comes back. ACs unchanged. Ruby parse: workflow `cache-mode: "none"`, no step `uses` actions/cache, and the only `with:` keys are `node-version`, `name`, `path`, `if-no-files-found`.
- 2026-10-26: T1, T2: verify clean, 475 tests passed, `pnpm check` 17 entries, 0 problems.
- 2026-10-26: T3: `CHANGELOG.md` entry at the end of `## Unreleased` and the `build.yml` paragraph of DESIGN.md Architecture, both opening "The build job of `build.yml` restores no Actions cache".
- 2026-10-26: T4: control: main run 40338224850, build job 121625450584, has 2 `Cache restored` lines. Branch dispatch run 40340509817 at a9e7ac1: build job 121633624337 success, 383 log lines, 0 `Cache restored` lines, "Cache mode: none" in Set up job; deploy job failed with "Branch "m016-no-build-cache" is not allowed to deploy to github-pages due to environment protection rules", as expected.
- 2026-10-26: T5: verify clean at the branch head: 14 test files, 475 tests passed; `pnpm check` 17 entries, 0 problems.
- 2026-10-26: claim audit: 17 claims read, 3 corrected — `.github/workflows/build.yml` (a planted store "would be restored into this build before `pnpm install`"), `test/workflows.test.ts` (case comment limited to the `INPUT_<NAME>` rule for JavaScript and Docker actions, the `uses` case match called a precaution; first test renamed "has no cache step and no cache key"). Re-read once: two held, the case comment took the reader's wording. Noted, not acted on: no test checks that `cache-mode: none` is present, which no criterion promises.
- 2026-10-26: verify clean after the claim fixes (475 tests, 17 entries, 0 problems); status set to review.

## Decisions

## Review

- AC1: `ruby -ryaml` parse of `build.yml` at ffe348b lists 10 steps in 2 jobs (build, deploy); no `uses` starts with `actions/cache` in any case, and no step's `with:` keys include `cache` (keys seen: `node-version`, `name`, `path`, `if-no-files-found`). Workflow `cache-mode` is `none`.
- AC2: at ffe348b, `test/workflows.test.ts` passes (8 tests). Each form planted in a copy of `build.yml` (block `cache: pnpm`, flow `{ node-version: 24, cache: pnpm }`, `actions/cache@v6`, `ACTIONS/CACHE/RESTORE@v6`, `Actions/Cache/Save@v6`) gave "1 failed, 7 passed", the failing test being the `build.yml` one; restored from a copy, `git status` clean.
- AC3: dispatch run 40340509817 on the branch at a9e7ac1: build job 121633624337 conclusion success; its log (383 lines) has 0 lines with `Cache restored`, against 2 in main run 40338224850's build job. `build.yml` changed after a9e7ac1 only in comment lines (`git diff a9e7ac1 HEAD`). The deploy job's failure is the `github-pages` environment rule, outside the criterion.
- AC4: `CHANGELOG.md:122`, under `## Unreleased`, and `cairn/DESIGN.md:318` each read "The build job of `build.yml` restores no Actions cache".
- AC5: `pnpm test` 14 files, 475 tests passed; `pnpm check` 17 entries, 0 problems, at ffe348b.
- consistency gate: `cairn_validate.py` all checks passed; no principle changed, so no `cairn_impact` run; the generic profile names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: the flow-key test case passed through the same `\s` branch as the block case, so the `{` and `,` branches of the key regex had no test — fix now, fixed f008ea8 (cases `with: {node-version: 24,cache: pnpm}` and `with: {"cache": pnpm}`).
- diff-bug #2: the deploy job has never run under workflow-level `cache-mode: none` (branch runs stop at the environment rule) — fix now, fixed f008ea8 (`cache-mode: none` moved to the build job; the deploy job keeps its old setup).
- diff-bug #3: the comment said a planted store "would be restored", but setup-node restores an exact lockfile-hash key — fix now, fixed f008ea8 ("could be restored").
- diff-bug #4: the key regex also matches a job id `cache:`, an env `CACHE:`, or `cache:` inside a run line — reject, false: each such match only fails the test, so no cache key can pass unseen.
- diff-bug #5: stripping ` #` comments cut quoted values, so `{ path: "a #b", cache: pnpm }` passed — fix now, fixed f008ea8 (only full-line comments are dropped; planted, the test failed).
- diff-bug #6: no test notices removal of `cache-mode: none` or a cache path with no `cache` key — fix now for the first, fixed f008ea8 (test "sets cache-mode none on the build job"; planted removal failed it); the rest reject, false: `cache-mode: none` refuses any cache path at run time.
- diff-bug #7: the restore and save `uses` cases run one regex group — reject, planned change: each is a form AC2 names, and the save case checks letter case.
- blame-history #1: the choice of fix is recorded only in the work log, where M011's comparable choice got D-005 — fix now, fixed f008ea8 (D-010).
- blame-history #2: enforcement of `cache-mode` rests on docs and the "Cache mode: none" log line, and no test guards the key — fix now, fixed f008ea8 (presence test, as diff-bug #6).
- blame-history #3: the discover read job restores `discovery-state-` by prefix in the job that reads untrusted repos, so planted state could hide repos — follow-up, row "Check the restored discovery state".
- blame-history #4: `ci.yml` keeping `cache: pnpm` is safe only if no check gates a merge — reject, false: `gh api` shows main unprotected with no required checks.
- blame-history #5: the daily build now reinstalls dependencies each run — reject, planned change.
- prior-review #1: the changelog's "cannot change the site and data" claims more than DESIGN's mechanism — fix now, fixed f008ea8 ("the build job cannot restore a cache that such a job saved").
- prior-review #2: the absorbed row "Keep read jobs from writing the cache" is still listed — reject, planned change: hygiene graduates it at merge.
- ripple #1: the row "Keep read jobs from writing the cache" still describes `cache: pnpm` in `build.yml` — reject, planned change: hygiene graduates it.
- ripple #2: that row says the issue read job can save caches, against DESIGN's read-only `issues` access — reject, planned change: the row leaves at hygiene.
- ripple #3: the `build.yml` comment names only the discover read job as a cache source — reject, false: `issues` runs cannot save caches.
- ripple #4: `add-plugin-issue.yml:38` "a cache this job saved would reach later jobs" reads as if the job could save — reject, false: it states a conditional reason and stays true.
- ripple #5: DESIGN.md:249 "Neither job uses the dependency cache" — reject, false: still true of the bot jobs.
- ripple #6: `cache-mode` may not be a GitHub key — reject, false: workflow-syntax docs define it, and runs 40340509817 and 40342164629 log "Cache mode: none".
- re-verified at f008ea8: AC1 Ruby parse: build job `cache-mode` "none", no `actions/cache` step, no `cache` key. AC2: 9 tests pass; each of the 5 forms planted again gave "1 failed, 8 passed" on "has no cache step and no cache key". AC3: run 40342164629, build job 121639476323 success, 382 log lines, 0 `Cache restored`, "Cache mode: none"; deploy refused by the environment rule. AC4: CHANGELOG.md and DESIGN.md keep the sentence. AC5: 476 tests passed, 17 entries, 0 problems.
- return floor: no finding shows a criterion failing or a load-bearing defect after the fixes; no return.
