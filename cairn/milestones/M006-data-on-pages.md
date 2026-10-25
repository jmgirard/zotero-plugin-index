<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M006: Publish the data on Pages

- **Status:** in-progress   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
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

- [ ] AC1: `schemas/plugins.v1.schema.json` and `schemas/index.v1.schema.json` each set `$id` to
      `https://jmgirard.github.io/zotero-plugin-index/schemas/` followed by the file's own name.
- [ ] AC2: Whenever `pnpm build` writes its data file, whatever its exit status, it also writes
      `<out>/schemas/plugins.v1.schema.json` and `<out>/schemas/index.v1.schema.json`, each byte-identical to the
      file of the same name in `schemas/`. Tests in `test/build.test.ts` compare both files' bytes after the
      exit-0 run and after the exit-1 run of AC3.
- [ ] AC3: When more than half of the records carry `failure`, `pnpm build` writes the data file, prints a line
      that names the failed count, the record count, and that more than half failed, and exits 1. When half or
      fewer carry `failure` and the write succeeds, it exits 0. Tests in `test/build.test.ts` run the CLI on a
      fixture tree where 2 of 4 records fail (exit 0) and on one where 2 of 3 fail (exit 1), and each asserts the
      exit status and the data file's presence, and, for the exit-1 tree, the printed line.
- [ ] AC4: In `.github/workflows/build.yml`, the job that runs `pnpm build` ends with an
      `actions/upload-pages-artifact` step for `dist/`, and a deploy job that `needs` that job runs
      `actions/deploy-pages` in the `github-pages` environment. Neither the upload step nor the deploy job carries
      an `if:` condition, and only the deploy job holds `pages: write` and `id-token: write`.
- [ ] AC5: README names the data URL `https://jmgirard.github.io/zotero-plugin-index/v1/plugins.json` and both
      schema URLs, and says that the daily build deploys nothing when more than half of the records carry a
      failure.
      CHANGELOG's `## Unreleased` gains one entry that says the same.
- [ ] AC6: The `verify` slot is clean: `pnpm test` and `pnpm check` pass.

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
- [ ] T2: Tests first in `test/build.test.ts`: the schema copies, and two fixture trees for the half rule (reuse
      `test/fixtures/build/` responses with the preload fixture, and stub DNS as the M004 lesson says). Then
      write the copies in `writeData` or the CLI, and add the exit rule and its line in `src/build/cli.ts`. The
      planted-error test (`test/build.test.ts:130`) fails 2 of 3 records, so it now asserts exit 1 or gains a
      fourth entry; the one-failure tree (1 of 3) keeps exit 0.
- [ ] T3: Add the Pages upload step, the deploy job (`needs`, `environment: github-pages`, its own permissions),
      and a `pages` concurrency group to `build.yml`; keep `plugins-data`. Turn on Pages with
      `gh api -X POST repos/jmgirard/zotero-plugin-index/pages -f build_type=workflow`. Dispatch the workflow
      once on the milestone branch to make sure that the build job passes and uploads the artifact; the deploy
      job stops at the environment's branch rule there.
- [ ] T4: README "Using the data" section, CHANGELOG entry, DESIGN.md Contract boundary and Architecture lines.
- [ ] T5: Run the `verify` slot (`npx -y pnpm@12.15.0 test`, then `check`).

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

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive. -->
