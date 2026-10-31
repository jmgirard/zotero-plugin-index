<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section. -->
# M069: Check the data artifact in the site job

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the check decides whether the daily build deploys the data and the site
- **Branch/PR:** m069-data-artifact-check

## Goal

If the downloaded `plugins-data` tree differs from the build job's digest in an entry's path, its kind, or a file's bytes, the site job deploys nothing.

## Scope

**In:**

- A `pnpm data-digest` command that prints one SHA-256 of a directory tree.
- A `data-sha256` output of the build job in `.github/workflows/build.yml`.
- A site job step that checks the downloaded `dist/` against that output before `pnpm add-start-results`.
- A read of whether a start-test job can replace an artifact of another job.
- README, DESIGN, and CHANGELOG text.

**Out:**

- A download by artifact id, as discover does. The plan rejected it (work log).
- The start result artifacts. The site job already reads them as untrusted (D-023).
- The Pages artifact that the deploy job reads. T1 reads whether a start-test job can stop or change it. A finding becomes a candidate row.

## Acceptance criteria

- [x] AC1: `pnpm data-digest --dir <dir>` prints one line of 64 lowercase hex digits. The value is a SHA-256 over the entries under `<dir>`, sorted by their relative paths in byte order. Each entry adds three facts in a framed form: its path relative to `<dir>`, its kind (file or directory), and the bytes of each file. `test/data-digest.test.ts` shows the same value for a copy of a fixture tree at another path with other file times. It shows a different value after each of eight changes. Three changes are one changed byte, an added file, and a removed file. Three more are a renamed file with the same bytes, a file moved into another directory, and an added empty directory. The last two are an empty file replaced by an empty directory of the same name, and file `a` holding `bc` replaced by file `ab` holding `c`.
- [x] AC2: If the tree holds a symbolic link (to a file or to a directory) or a named pipe, the command prints no digest and exits 1. Its message names the path of that entry in quotes. If the `--expect <sha256>` value matches, the command exits 0. If the value does not match, it exits 1 with a message that names both values. The command exits 1 with its usage line for no `--dir`, an unknown option, or a positional argument. It does the same for an `--expect` value that is not 64 lowercase hex digits and for a `--dir` that is not a directory. `test/data-digest.test.ts` runs each case and asserts its exit status and message.
- [x] AC3: In `build.yml`, the build job gives the job output `data-sha256` from a `pnpm --silent data-digest --dir dist` step. That step runs after `pnpm carry-start-results` and before the `plugins-data` upload. The site job runs `pnpm --silent data-digest --dir dist --expect` with that output, after the `plugins-data` download and before `pnpm add-start-results`. The check step has no `if:` key and no `continue-on-error` key. `test/workflows.test.ts` asserts the output line, both steps, their order, and that the check step has neither key.
- [x] AC4: A `Build data` run on the milestone branch, started by hand, has a site job whose data check step succeeded.
- [x] AC5: README documents `pnpm data-digest`: its options, what it prints, and its exit statuses. The README section "The daily build" says that the site job checks the downloaded data against the value from the build job. It also says that a mismatch deploys nothing. The `build.yml` paragraph of DESIGN says the same. `CHANGELOG.md` has one new entry under `## Unreleased`. The entry says this: if the data that the site job downloads differs from the data that the build job wrote, the daily build deploys nothing.
- [x] AC6: `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check` pass.

## Coverage

- AC1 → T2
- AC2 → T2, T6
- AC3 → T3, T7
- AC4 → T5
- AC5 → T4
- AC6 → T5

## Tasks

- [x] T1: Read the artifact client that `actions/upload-artifact@v7` runs: its `overwrite` path and the credential it uses. Find out whether a job with `permissions: {}` can delete and upload again an artifact that another job of the run uploaded. Find out whether the artifact keeps hidden files and empty directories. Also find out whether a start-test job can upload a `github-pages` artifact that stops or changes the deploy. Record each finding in a work-log line. The reason sentence of T4 states only what this read found. If the Pages artifact can be stopped or changed, add a candidate row. This task is a read, and no criterion checks it.
- [x] T2: Write `test/data-digest.test.ts` for AC1 and AC2 first. Then write `src/build/digest.ts` (the tree walk and the digest), `src/build/digest-cli.ts`, and the `data-digest` script in `package.json`.
- [x] T3: In `build.yml`, add the `data-sha256` output and the digest step to the build job. Add the check step to the site job. Write comments for both. Extend `test/workflows.test.ts`.
- [x] T4: Write the README command section, the README section "The daily build", the `build.yml` paragraph of DESIGN, and the CHANGELOG entry.
- [x] T5: Run `pnpm test` and `pnpm check`. Push the branch and run `gh workflow run build.yml --ref <branch>`. Record the run id and the result of the data check step of the site job.
- [x] T6: Review return 1: run each refused entry kind of AC2 through the command in `test/data-digest.test.ts`, asserting exit status 1, empty stdout, and the message.
- [x] T7: Re-audit finding: make the carry-order checks in `test/workflows.test.ts` search the `pnpm carry-start-results --plan` run line, not the first mention of the command.

## Work log

- 2026-10-31: created by /milestone-plan.
- 2026-10-31: tier check: not run — work named at the question set.
- 2026-10-31: question set: work to plan — the candidate row "Check the data artifact in the site job".
- 2026-10-31: question set: may implement or review start `Build data` by hand on a branch or on main — yes.
- 2026-10-31: idea vet: gap — the row asks to confirm first whether a job can replace another job's artifact; reading taken: T1 makes that read and the check ships either way, as the start plan's check does, since honest runs behave the same under both readings.
- 2026-10-31: collision check: absorbs candidate row "Check the data artifact in the site job" (M059 review); extends M059's start plan check; D-023 and D-035 read, no rejection; no planned or active milestone overlaps.
- 2026-10-31: inbox sweep: 0 open issues; 19 open pull requests, all bot discover pull requests (17 with `hold`), none overlap.
- 2026-10-31: plan gate chose a Node command (`pnpm data-digest`) over a `find | sha256sum` pipeline because macOS `find` and `sha256sum` differ from the runner's, so the local tests could not run the pipeline, and `sha256sum` writes no line for a symlink to a directory; falsified by a site check that fails on an honest run.
- 2026-10-31: plan gate chose a content digest over downloading `plugins-data` by artifact id, as discover does, because the id rests on GitHub never changing an artifact's bytes under its id, which no local test can show; falsified by a replaced artifact whose tree passes the digest.
- 2026-10-31: criteria audit (full): 6 findings, all taken. AC1 now fixes the entry order and framing and adds two probes (file versus directory, `a`/`bc` versus `ab`/`c`). AC2 is narrowed to symbolic links and named pipes, each probed. AC4 drops its recording clause. T1 leaves AC5's coverage. T1 also reads whether the artifact keeps hidden files and empty directories. The goal names the three facts the digest covers.
- 2026-10-31: lessons used: 2026-10-25 (M001), 2026-10-27 (M027), 2026-10-28 (M036), 2026-10-26 (M018), 2026-10-31 (M066, used M068).
- 2026-10-31: branch m069-data-artifact-check cut from main at d2f7ec1; status in-progress.
- 2026-10-31: T1 read: upload-artifact v7.0.2 with `overwrite: true` calls `deleteArtifactIfExists`, and `@actions/artifact`'s `deleteArtifactInternal` finds the artifact by name across the whole run with `ACTIONS_RUNTIME_TOKEN` alone (no repo permission), so a job that holds that token can delete `plugins-data` and upload a new one under the same name.
- 2026-10-31: T1 read: upload-artifact v7 leaves out hidden files (`include-hidden-files` defaults to false) and its zip spec keeps directory entries; `pnpm build` writes no hidden file and no empty directory into `dist/`, so the honest tree uploads whole.
- 2026-10-31: T1 read: upload-pages-artifact v5 tars with `--dereference` and uploads `github-pages` without `overwrite`, so a `github-pages` artifact that a start-test job uploads first fails the site job's upload and stops the deploy, but cannot become the deployed site; filed parked row "Keep plugin code from stopping deploys".
- 2026-10-31: T2: `src/build/digest.ts` hashes one JSON line per entry, `[kind, path, file SHA-256 or null]`, sorted by UTF-8 path bytes; `readdir` dirents refuse links and pipes without following them; the CLI prints `data digest matches: <sha>` on a match. `test/data-digest.test.ts` 22 tests pass. Plants: unframed `path + bytes` failed the two framing probes; dropping `kind` failed none, since a directory's null SHA-256 already tells it from a file.
- 2026-10-31: T3: build job output `data-sha256` from `pnpm --silent data-digest --dir dist` (`--silent` drops pnpm's script banner from the captured line, as `add-plugin-issue.yml` does), after the plan hash and before the uploads; site check step right after the `plugins-data` download. `test/workflows.test.ts` 57 pass; a planted `continue-on-error: true` and a planted `if:` each failed the new test.
- 2026-10-31: T4: README "The daily build" (items 1 and 3, the deploy-nothing paragraph, and a `pnpm data-digest` section after it), DESIGN's `build.yml` paragraph, and one CHANGELOG entry; the replacement sentence states T1's read; no added line passes 80 columns.
- 2026-10-31: T5: `pnpm test` 1661 passed, 6 skipped; `pnpm check` 272 entries, 0 problems. Branch pushed; `Build data` run 41208668356 started on it.
- 2026-10-31: claim audit: 46 claims read, 2 corrected — README.md (the command prints one value only without `--expect`), src/build/digest.ts (JSON framing keeps a path from running into the next field, not "no two trees"; a non-UTF-8 name decodes with replacement characters).
- 2026-10-31: T5: run 41208668356 on the branch succeeded; the site job's step 7 (`pnpm --silent data-digest --dir dist --expect "$DATA_SHA256"`) printed `data digest matches: d3f6a0fd…57cf`; deploy skipped, as on any branch. Status review.
- 2026-10-31: review return 1: AC2 — `test/data-digest.test.ts` asserts exit status 1 through the command only for a symbolic link to a file; the symbolic link to a directory and the named pipe assert `treeDigest`'s message but no exit status.
- 2026-10-31: amendment routed: AC3 — both steps run `pnpm --silent data-digest …` (`--silent` keeps pnpm's banner out of the captured value), while the criterion quotes `pnpm data-digest --dir dist` and `pnpm data-digest --dir dist --expect`; the work is right and the quoted command text is wrong.
- 2026-10-31: status in-progress for review return 1 and the AC3 amendment.
- 2026-10-31: T6 added (minor amendment) and done: the three refusal cases now run through the command; 21 tests pass; a planted `return 0` on a refused tree failed all three.
- 2026-10-31: re-audit: AC3 (full) — wording cleared on questions 2 to 6; question 1 found that the test's `indexOf("carry-start-results")` matched a timeout comment above every step, so the carry order went unchecked; fixed in the test, wording kept.
- 2026-10-31: amendment return: AC3 — "the build job gives the job output `data-sha256` from a `pnpm --silent data-digest --dir dist` step ... The site job runs `pnpm --silent data-digest --dir dist --expect` with that output"
- 2026-10-31: T7 added (minor amendment) and done: both carry-order checks in `test/workflows.test.ts` (the data digest's and the start plan's) now search the `pnpm carry-start-results --plan` run line; a digest step planted before `pnpm build` failed the data test; 57 pass.
- 2026-10-31: correction of the T1 read: upload-artifact v7's `findFilesToUpload` drops every directory from the file list (`src/shared/search.ts`), so empty directories are not uploaded; the earlier line's "zip spec keeps directory entries" was wrong. `dist/` holds no empty directory, so honest runs are unaffected.
- 2026-10-31: step-7 approval: m069-data-artifact-check approved for merge
- 2026-10-31: verify after return 1: `pnpm test` 1660 passed, 6 skipped; `pnpm check` 272 entries, 0 problems. Status review.

## Decisions

## Review

Pass 1 (2026-10-31): AC1's 9 probes pass in `test/data-digest.test.ts`; AC2 fails as written (exit status asserted for 1 of 3 refused kinds); AC3's quoted commands differ from the steps by `--silent`. Returned before any tick.

Pass 2 (2026-10-31, branch head b17848f, main d2f7ec1 unchanged):

- AC1: `vitest run test/data-digest.test.ts` — "prints one SHA-256 line and exits 0" (stdout `^[0-9a-f]{64}\n$`), the copy-at-another-path-with-other-times test, and the 8 change tests (byte, added, removed, renamed, moved, empty directory, file to directory, `a`/`bc` versus `ab`/`c`) pass; `src/build/digest.ts` sorts by `Buffer.compare` of paths and hashes one JSON line `[kind, path, sha256]` per entry.
- AC2: same run — the command with a symbolic link to a file, a symbolic link to a directory, and a named pipe each rejects with code 1, empty stdout, and `not a file or directory: "<path>"`; `--expect` match exits 0, mismatch exits 1 naming both values; no `--dir`, unknown option, positional, bad `--expect`, a file as `--dir`, and a missing `--dir` each exit 1 with the usage line. 21 tests pass.
- AC3: `vitest run test/workflows.test.ts` — "checks the downloaded data in the site job against the digest that the build job gives after the carry" passes: the `data-sha256` output line, the `pnpm --silent data-digest --dir dist` step after the `pnpm carry-start-results --plan` run line and before `name: plugins-data`, and the site step `pnpm --silent data-digest --dir dist --expect "$DATA_SHA256"` after the download and before `pnpm add-start-results`, followed directly by another step (no `if:`, no `continue-on-error`). 57 tests pass.
- AC4: `gh run view 41208668356` — `Build data` dispatched on the branch at 5f5d48c succeeded; site job step 7 `pnpm --silent data-digest --dir dist --expect "$DATA_SHA256"` succeeded and logged `data digest matches: d3f6a0fd…57cf`; deploy skipped. Since 5f5d48c, `git diff --stat` over `.github src package.json` shows only a 2-line comment change in `src/build/digest.ts`.
- AC5: joined-text greps — README has the `pnpm data-digest --dir <dir> [--expect <sha256>]` block with its output, options, and exit statuses, "The daily build" item 3 ("site job checks the downloaded data with `pnpm data-digest --dir dist --expect`" against the build job's output) and "If the downloaded data or the start plan fails its check, the workflow also deploys nothing"; DESIGN's `build.yml` paragraph ends the check sentence "so a mismatch deploys nothing"; `CHANGELOG.md` `## Unreleased` opens with the one new entry.
- AC6: `npx -y pnpm@12.15.0 test` — 28 files passed, 1 skipped; 1660 tests passed, 6 skipped. `npx -y pnpm@12.15.0 check` — 272 entries, 0 problems.
- Gate: `cairn_validate.py` all checks passed; `generic` profile names no toolchain checks; no principle changed.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: upload-artifact leaves out hidden files and (source read) empty directories, so a future one in `dist/` fails every honest site check — fix now: build.yml comment states it; T1's record corrected in the work log, fixed ed63e65.
- diff-bug #2: no D-entry records that plugin code can replace another job's artifact — fix now: D-041, fixed ed63e65.
- diff-bug #3: a symbolic link as the `--dir` root is followed — reject (false): the root is not an entry, and README refuses entries under `--dir`.
- diff-bug #4: `--dir ""` hashes the caller's folder — fix now: usage error and a test case, fixed ed63e65.
- diff-bug #5: README "Any other argument does the same" overstates, and omits the cannot-read exit — fix now: wording, fixed ed63e65.
- diff-bug #6: an entry's kind can change between `readdir` and `readFile` — reject (false): no process writes under `dist/` while either job runs the digest.
- diff-bug #7: `data-digest` out of order in `package.json` scripts — fix now, fixed ed63e65.
- diff-bug #8: stray "exit status" line in README — fix now, fixed ed63e65.
- diff-bug #9: test notes — regex before `toBe` reject (false: the regex is the fact stated apart from `treeDigest`); same-path cases reject (planned change: AC2 names each); prefix-only usage regexes reject (style); link to `/` fix now (links to `v1/` now), fixed ed63e65; T7's tightening noted.
- blame-history #1: D-025 says plugin code cannot cause the site job's faults, now untrue for the checks — fix now: D-041 narrows it, fixed ed63e65.
- blame-history #2: D-023 and D-035 record only forgery as the cost — fix now: D-041 adds the stopped deploy, fixed ed63e65.
- blame-history #3: the carry-order anchor change strengthens M059's test — noted.
- blame-history #4: README reflow fragment — fix now (same as diff-bug #8), fixed ed63e65.
- blame-history #5: a CHANGELOG entry for a CI-only check — reject (planned change: AC5).
- prior-review #1: README's data summary (line 255) omits the new deploy-nothing case — fix now, fixed ed63e65.
- prior-review #2: "plugin code that reaches the run's artifact token" understates — reject (false): the runner hands `ACTIONS_RUNTIME_TOKEN` to JavaScript action steps, not to `run` steps, so plugin code must reach it.
- prior-review #3: README stray wrap — fix now (same as diff-bug #8), fixed ed63e65.
- prior-review #4: hidden files or empty directories make a false mismatch — fix now (same as diff-bug #1), fixed ed63e65.
- ripple #1: README line 259 list lacks the data check — fix now (same as prior-review #1), fixed ed63e65.
- ripple #2: the candidate row still says the site job deploys the artifact as downloaded — reject (planned change): hygiene graduates the row.
- ripple #3: "no token permission" beside the artifact-token finding — reject (false): the text is about the GITHUB_TOKEN's permissions, which stay none.
- ripple #4: DESIGN's later site-job sentence omits the checks — reject (false): the sentence before it states both checks.
- ripple #5: docs quote `pnpm data-digest` where the steps run `pnpm --silent data-digest` — reject (style): `--silent` only drops pnpm's banner.
- ripple #6: DESIGN line 890 says "the build job's output" for the plan — reject (false): the plan has one output.
- Fix-now verify: `pnpm test` 1661 passed, 6 skipped; `pnpm check` 0 problems; the empty `--dir` case failed with the fix stashed.
