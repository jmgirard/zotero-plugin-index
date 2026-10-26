# M016: Restore no cache in the deploy build

- **Status:** in-progress
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

- [ ] AC1: In `.github/workflows/build.yml`, no step of any job has a `uses:` that names `actions/cache`,
      `actions/cache/restore`, or `actions/cache/save`. No step's `with:` block has a `cache` key.
- [ ] AC2: `test/workflows.test.ts` fails on each of these forms in `build.yml`: a block `cache:` key, a flow
      `{cache: …}` key, and a `uses:` of `actions/cache@`, `actions/cache/restore@`, or `actions/cache/save@` in any
      letter case. It passes on the milestone's `build.yml`.
- [ ] AC3: A `workflow_dispatch` run of `build.yml` on the milestone branch finishes its `build` job with success.
      That job restores no cache: its log, searched case-sensitively, has no line containing `Cache restored`. The
      `deploy` job is outside this criterion, because the `github-pages` environment takes deploys from `main` only.
- [ ] AC4: `CHANGELOG.md`'s `## Unreleased` section and `cairn/DESIGN.md`'s Architecture text on `build.yml` each
      state that the build job of `build.yml` restores no Actions cache.
- [ ] AC5: The `verify` slot is clean: `pnpm test` and `pnpm check` pass.

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
- [ ] T3: Add the `CHANGELOG.md` entry under `## Unreleased` and update the `build.yml` text in `cairn/DESIGN.md`
      Architecture, both in the AC4 wording.
- [ ] T4: Push the branch and dispatch `build.yml` on it (`gh workflow run build.yml --ref <branch>`). Read the build
      job's result and its log only (`gh run view <id> --log --job <build-job-id>`). First run the same search over
      the newest `main` run's build log and see it find `Cache restored from key: node-cache-…`, so the search is not
      blind. If the build job fails on upstream reads outside this change, dispatch it again.
- [ ] T5: Run the `verify` slot: `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check`.

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

## Decisions

## Review
