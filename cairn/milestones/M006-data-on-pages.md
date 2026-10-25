<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M006: Publish the data on Pages

- **Status:** review   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** high   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** —   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** —   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** user-facing — the data file and schemas become a public API at a stable URL   <!-- owner: plan · create/amend-via-gate; user-facing | internal — <one-clause reason>; skill conduct only — no validate check parses it -->
- **Branch/PR:** m006-data-on-pages   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

## Goal
<!-- owner: plan · create; a wrong goal returns to plan, never edited in place -->

The daily build deploys `plugins.json` and its two schemas to GitHub Pages at stable versioned URLs, and deploys nothing when more than half of the plugin reads fail.

## Scope
<!-- owner: plan · create/amend-via-gate -->

**In:** set both schemas' `$id` to their Pages URLs; `pnpm build` writes copies of the two schemas under
`<out>/schemas/` and exits 1, after it writes the data file, when more than half of the records carry a failure;
`.github/workflows/build.yml` uploads `dist/` as the Pages artifact and deploys it in a job that runs only after
the build job succeeds; turn on Pages for the repo with GitHub Actions as its source (`gh api`, granted at the
question set); README, CHANGELOG, and DESIGN.md name the URLs and the deploy rule.

**Out:** the HTML site with one page per plugin → M007. The failure summary, the rate-limit warning, and the time
budget per plugin → candidate "Warn when the daily build degrades". The first live deploy from the default branch,
which the `github-pages` environment allows only there → `/milestone-review` post-merge hygiene dispatches the
workflow, fetches the data and schema URLs, and logs the result in this file's work log.

## Acceptance criteria
<!-- owner: plan · create/amend-via-gate; review reads, never reinterprets. -->

- [x] AC1: `schemas/plugins.v1.schema.json` and `schemas/index.v1.schema.json` each set `$id` to
      `https://jmgirard.github.io/zotero-plugin-index/schemas/` followed by the file's own name.
- [x] AC2: Whenever `pnpm build` writes its data file, whatever its exit status, it also writes
      `<out>/schemas/plugins.v1.schema.json` and `<out>/schemas/index.v1.schema.json`, each byte-identical to the
      file of the same name in `schemas/`. Tests in `test/build.test.ts` compare both files' bytes after the
      exit-0 run and after the exit-1 run of AC3.
- [x] AC3: When more than half of the records carry `failure`, `pnpm build` writes the data file, prints a line
      that names the failed count, the record count, and that more than half failed, and exits 1. When half or
      fewer carry `failure` and the write succeeds, it exits 0. Tests in `test/build.test.ts` run the CLI on a
      fixture tree where 2 of 4 records fail (exit 0) and on one where 2 of 3 fail (exit 1), and each asserts the
      exit status and the data file's presence, and, for the exit-1 tree, the printed line.
- [x] AC4: In `.github/workflows/build.yml`, the job that runs `pnpm build` ends with an
      `actions/upload-pages-artifact` step for `dist/`, and a deploy job that `needs` that job runs
      `actions/deploy-pages` in the `github-pages` environment. Neither the upload step nor the deploy job carries
      an `if:` condition, and only the deploy job holds `pages: write` and `id-token: write`.
- [x] AC5: README names the data URL `https://jmgirard.github.io/zotero-plugin-index/v1/plugins.json` and both
      schema URLs, and says that the daily build deploys nothing when more than half of the records carry a
      failure.
      CHANGELOG's `## Unreleased` gains one entry that says the same.
- [x] AC6: The `verify` slot is clean: `pnpm test` and `pnpm check` pass.

## Coverage
<!-- owner: plan · create/amend-via-gate -->

- AC1 → T1
- AC2 → T2
- AC3 → T2
- AC4 → T3
- AC5 → T4
- AC6 → T5

## Tasks
<!-- owner: plan (create) / implement (check-off, minor edits) -->

- [x] T1: Set both schemas' `$id` (`schemas/*.v1.schema.json:3`); `src/build/build.ts:36` reads the `$id`, so
      run `pnpm test` to make sure that the record validator still resolves.
- [x] T2: Tests first in `test/build.test.ts`: the schema copies, and two fixture trees for the half rule (reuse
      `test/fixtures/build/` responses with the preload fixture, and stub DNS as the M004 lesson says). Then
      write the copies in `writeData` or the CLI, and add the exit rule and its line in `src/build/cli.ts`. The
      planted-error test (`test/build.test.ts:130`) fails 2 of 3 records, so it now asserts exit 1 or gains a
      fourth entry; the one-failure tree (1 of 3) keeps exit 0.
- [x] T3: Add the Pages upload step, the deploy job (`needs`, `environment: github-pages`, its own permissions),
      and a `pages` concurrency group to `build.yml`; keep `plugins-data`. Turn on Pages with
      `gh api -X POST repos/jmgirard/zotero-plugin-index/pages -f build_type=workflow`. Dispatch the workflow
      once on the milestone branch to make sure that the build job passes and uploads the artifact; the deploy
      job stops at the environment's branch rule there.
- [x] T4: README "Using the data" section, CHANGELOG entry, DESIGN.md Contract boundary and Architecture lines.
- [x] T5: Run the `verify` slot (`npx -y pnpm@12.15.0 test`, then `check`).

## Work log
<!-- owner: any skill · append-only; one line per entry; absolute dates. -->

- 2026-10-25: created by /milestone-plan.
- 2026-10-25: tier check: not run — work named at the question set.
- 2026-10-25: idea vet: one concern, a mass-failure build would replace good data with failures — question set answer: skip the deploy when more than half of the reads fail; no other concern (the site's version check is M007's).
- 2026-10-25: question set: may the run turn on Pages with gh api and dispatch the workflow — yes.
- 2026-10-25: question set: next work — publish on Pages, from candidate "Publish the site and data on Pages", split into M006 (data and schemas) and M007 (site, depends on M006).
- 2026-10-25: split: two features, not a feature series — the data URL is a public API users reach on its own (DESIGN.md Contract boundary), so each milestone ships its own changelog entry.
- 2026-10-25: plan gate chose exit 1 from `pnpm build` (the deploy job then never runs) over a separate workflow step that counts failures in the JSON, because the CLI already counts them and a test can reach it; falsified by a need to publish a mass-failure build on purpose.
- 2026-10-25: collision: candidate "Warn when the daily build degrades" taken in part (the non-zero exit on mass failure); its row gets the started token, and its failure summary, rate-limit warning, and time budget stay there.
- 2026-10-25: inbox sweep: 0 open issues, 0 open PRs.
- 2026-10-25: criteria audit (full mode, fresh Opus reader): 5 findings on M006, all taken — AC3 broke the planted-error test (T2 names it), AC3's printed line and exit-0 clause narrowed, AC3 trees fixed at 2 of 4 and 2 of 3 for both parities, AC2 also checked on the exit-1 run, AC5 counts records with a failure, not failed reads; no finding on AC1, AC4, AC6.
- 2026-10-25: lessons used: 2026-10-25 (M001) pnpm via npx; 2026-10-25 (M002) CLI fixture preload; 2026-10-25 (M004) DNS stub for reader tests; 2026-10-25 (M003) beforeAll hookTimeout.
- 2026-10-25: implement started on m006-data-on-pages, cut from main at 9f939be.
- 2026-10-25: T1 done — both schemas' `$id` now under https://jmgirard.github.io/zotero-plugin-index/schemas/; no other file named the old URL outside cairn/; `pnpm test` 217 passed. DESIGN.md lines moved to T4.
- 2026-10-25: T2 done — `writeData` copies both schemas to `<out>/schemas/` before it writes the data file (a failed copy is `write-failed`); the CLI prints `<n> of <m> records carry a failure, more than half` to stderr and exits 1 after the write. The planted-error test is the 2-of-3 tree (now exit 1); a new 2-of-4 test adds an entry whose repo has no recorded response. Both failed on main for the named reasons (exit 0 seen; schema copy ENOENT); `pnpm test` 218 passed.
- 2026-10-25: T3 done — `build.yml` uses `actions/upload-pages-artifact@v5` (last build step) and `actions/deploy-pages@v5` (latest releases, read with gh api); `plugins-data` now uploads `if: !cancelled()` so a failed build's data stays readable; workflow concurrency group `pages`. Pages turned on (build_type workflow, https://jmgirard.github.io/zotero-plugin-index/); the `github-pages` environment allows branch `main` only. Branch dispatch run 40237546151: build passed (14 records, 0 failures, artifacts plugins-data and github-pages), deploy rejected by the environment rule as expected.
- 2026-10-25: T4 done — README gains "Using the data" (the three URLs, the deploy rule) and updates "Building the data" (exit 1 over half, schema copies, Pages deploy from main); one CHANGELOG entry; DESIGN.md Contract boundary names the URLs and Architecture the deploy.
- 2026-10-25: T5 done — `pnpm test` 218 passed; `pnpm check` 14 entries, 0 problems.
- 2026-10-25: claim audit: 26 claims read, 0 corrected — build.yml, CHANGELOG.md, README.md, src/build/build.ts, src/build/cli.ts, test/build.test.ts; the reader also flagged the unchanged README "writes no file … cannot write the file" case, made stale by the schema copies, now reworded.

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive. -->

Pass 1, 2026-10-25, on branch head 9d1ea2f (main 9f939be, not moved; no PR yet, route (d); Copilot round off).

- AC1: both schema files read with json: `$id` equals `https://jmgirard.github.io/zotero-plugin-index/schemas/` + own name for plugins.v1 and index.v1 — pass.
- AC2: `vitest run test/build.test.ts` 15 passed; `expectSchemaCopies` compares both copies' bytes with `schemas/` after the exit-0 2-of-4 run ("exits 0 when exactly half…") and the exit-1 2-of-3 run ("names an error … unexpected-error"); before the fix the 2-of-4 test failed with ENOENT on `<out>/schemas/plugins.v1.schema.json` (implement log) — pass.
- AC3: same run: 2-of-3 tree asserts status 1, the data file, and stderr "2 of 3 records carry a failure, more than half" (the line names both counts and the rule); 2-of-4 tree asserts status 0, empty stderr, the data file, and the failed ids [fork, missing]; `src/build/cli.ts` exits 1 only when `failed*2 > total`, after a successful write — pass.
- AC4: `build.yml` parsed with Ruby YAML: jobs build, deploy; the build job runs `pnpm build` and its last step is `actions/upload-pages-artifact@v5` with path `dist/` and no `if`; deploy `needs: build`, environment `github-pages`, one step `actions/deploy-pages@v5`, no `if` on job or step; permissions workflow {contents: read}, build none of its own, deploy {pages: write, id-token: write}. Branch run 40237546151: build passed, deploy refused by the branch rule — pass.
- AC5: grep: README.md:11, :13, :15 name the data URL and both schema URLs; README.md:17-19 "If more than half of the records carry a failure, the build deploys nothing"; CHANGELOG.md `## Unreleased` one new entry (lines 38-44) naming the URLs and "The daily build then deploys nothing" — pass.
- AC6: `pnpm test` (tsc, then Vitest) 5 files, 218 passed; `pnpm check` "checked 14 entries in plugins, 0 problems" — pass.
- gate: `cairn_validate.py` all checks passed (exit 0); no principle changed, `cairn_impact` skipped; generic profile, no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: the rule counts steady per-plugin states (fork, no-release, facts-invalid) toward the threshold, and the cli.ts comment says such failures "point at the build" — rule: reject (planned change, AC3 counts every `failure`); comment: fix now ("usually point"); counting only build-level failure names → follow-up, absorbed into candidate "Warn when the daily build degrades".
- diff-bug #2: workflow-level concurrency group `pages` lets a branch dispatch replace a pending main run — fix now (group `pages-${{ github.ref }}`, comment states the replace rule).
- diff-bug #3: the default-tree test backs up only `dist/v1/plugins.json` and leaves `dist/schemas/` behind — fix now (backs up and restores all three files, removes the dirs it made).
- diff-bug #4: the `!cancelled()` upload runs after a failed `pnpm check` and adds a no-files error — fix now (also requires `hashFiles('dist/v1/plugins.json')`).
- diff-bug #5: schema copies are not atomic, so a failed copy leaves a truncated schema — fix now (temp file and rename per schema, temp removed on failure).
- diff-bug #6: no test covers the schema-copy failure branch, and the "cannot make" test now fails at `schemas/` — fix now (that test names the schema path; new tests for a failed `v1/` after the copies and for a schema that cannot be replaced).
- diff-bug #7: the planted-error test carries the exit-1 rule under a name that omits it — fix now (renamed).
- diff-bug #8: `expect(result.stderr).toBe("")` in the 2-of-4 test breaks on any unrelated warning — fix now (`not.toContain("more than half")`).
- diff-bug #9: the deploy job has no `timeout-minutes` — fix now (10).
- diff-bug #10: await question, nothing found — noted.
- diff-bug #11: nothing keeps `v1/` published once a v2 ships, as DESIGN.md promises — follow-up, new candidate "Keep the v1 data when v2 ships".
- blame-history #1: README states "only main can deploy" as a repo guarantee, but it rests on the environment setting — fix now (README names the `github-pages` environment setting).
- blame-history #2: same as diff-bug #4 — fixed there.
- blame-history #3: same as diff-bug #5 — fixed there.
- blame-history #4: README "writes no file" lead-in is false for the schema-copy case — fix now ("writes no data file").
- blame-history #5: a lasting upstream change freezes deploys with only a red run as signal — reject (planned change: the red run and GitHub's failure email are the signal the plan chose); counting rule as diff-bug #1.
- blame-history #6: the daily run goes red on mass failure — noted (the planned signal).
- ripple #1: candidate "Warn when the daily build degrades" says the build exits 0 when every read fails — follow-up, narrowed at post-merge hygiene.
- ripple #2: same as blame-history #4 — fixed there.
- ripple #3: DESIGN.md Function Families "Data build" omits the schema copies and the exit rule — fix now.
- ripple #4: candidate "Publish the site and data on Pages" still lists the data and `$id` work — follow-up, narrowed to the site at post-merge hygiene (M007 holds it).
- ripple #5: same as blame-history #1 — fixed there.
- ripple #6: DESIGN.md "deploys from the default branch" agrees — noted.
- prior-review #1: same as diff-bug #3 (regresses M003's dist backup fix) — fixed there.
- prior-review #2: same as diff-bug #5 (regresses M003's atomic write) — fixed there.
- prior-review #3: a partial degradation at half or fewer still deploys with no warning — follow-up, already in candidate "Warn when the daily build degrades".
- prior-review #4: no per-plugin time budget; a hung host still ends the run — follow-up, already in candidate "Warn when the daily build degrades".
