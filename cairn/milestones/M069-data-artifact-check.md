<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section. -->
# M069: Check the data artifact in the site job

- **Status:** in-progress
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

- [ ] AC1: `pnpm data-digest --dir <dir>` prints one line of 64 lowercase hex digits. The value is a SHA-256 over the entries under `<dir>`, sorted by their relative paths in byte order. Each entry adds three facts in a framed form: its path relative to `<dir>`, its kind (file or directory), and the bytes of each file. `test/data-digest.test.ts` shows the same value for a copy of a fixture tree at another path with other file times. It shows a different value after each of eight changes. Three changes are one changed byte, an added file, and a removed file. Three more are a renamed file with the same bytes, a file moved into another directory, and an added empty directory. The last two are an empty file replaced by an empty directory of the same name, and file `a` holding `bc` replaced by file `ab` holding `c`.
- [ ] AC2: If the tree holds a symbolic link (to a file or to a directory) or a named pipe, the command prints no digest and exits 1. Its message names the path of that entry in quotes. If the `--expect <sha256>` value matches, the command exits 0. If the value does not match, it exits 1 with a message that names both values. The command exits 1 with its usage line for no `--dir`, an unknown option, or a positional argument. It does the same for an `--expect` value that is not 64 lowercase hex digits and for a `--dir` that is not a directory. `test/data-digest.test.ts` runs each case and asserts its exit status and message.
- [ ] AC3: In `build.yml`, the build job gives the job output `data-sha256` from a `pnpm data-digest --dir dist` step. That step runs after `pnpm carry-start-results` and before the `plugins-data` upload. The site job runs `pnpm data-digest --dir dist --expect` with that output, after the `plugins-data` download and before `pnpm add-start-results`. The check step has no `if:` key and no `continue-on-error` key. `test/workflows.test.ts` asserts the output line, both steps, their order, and that the check step has neither key.
- [ ] AC4: A `Build data` run on the milestone branch, started by hand, has a site job whose data check step succeeded.
- [ ] AC5: README documents `pnpm data-digest`: its options, what it prints, and its exit statuses. The README section "The daily build" says that the site job checks the downloaded data against the value from the build job. It also says that a mismatch deploys nothing. The `build.yml` paragraph of DESIGN says the same. `CHANGELOG.md` has one new entry under `## Unreleased`. The entry says this: if the data that the site job downloads differs from the data that the build job wrote, the daily build deploys nothing.
- [ ] AC6: `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check` pass.

## Coverage

- AC1 → T2
- AC2 → T2
- AC3 → T3
- AC4 → T5
- AC5 → T4
- AC6 → T5

## Tasks

- [x] T1: Read the artifact client that `actions/upload-artifact@v7` runs: its `overwrite` path and the credential it uses. Find out whether a job with `permissions: {}` can delete and upload again an artifact that another job of the run uploaded. Find out whether the artifact keeps hidden files and empty directories. Also find out whether a start-test job can upload a `github-pages` artifact that stops or changes the deploy. Record each finding in a work-log line. The reason sentence of T4 states only what this read found. If the Pages artifact can be stopped or changed, add a candidate row. This task is a read, and no criterion checks it.
- [x] T2: Write `test/data-digest.test.ts` for AC1 and AC2 first. Then write `src/build/digest.ts` (the tree walk and the digest), `src/build/digest-cli.ts`, and the `data-digest` script in `package.json`.
- [x] T3: In `build.yml`, add the `data-sha256` output and the digest step to the build job. Add the check step to the site job. Write comments for both. Extend `test/workflows.test.ts`.
- [ ] T4: Write the README command section, the README section "The daily build", the `build.yml` paragraph of DESIGN, and the CHANGELOG entry.
- [ ] T5: Run `pnpm test` and `pnpm check`. Push the branch and run `gh workflow run build.yml --ref <branch>`. Record the run id and the result of the data check step of the site job.

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

## Decisions

## Review
