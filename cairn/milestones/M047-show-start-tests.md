# M047: Show whether plugins start in Zotero

- **Status:** in-progress
- **Priority:** normal
- **Depends on:** M046
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing: it adds a field to the public data and a line to each plugin page
- **Branch/PR:** m047-show-start-tests

## Goal

The daily build starts each listed plugin in each tested Zotero release
that its manifest covers, and the data and plugin pages show the result.

## Scope

**In:** The build writes a start plan that names each XPI it read by URL
and SHA-256. A new command downloads each planned XPI, checks its hash,
and runs `pnpm start-test` (M046) for one Zotero binary. A new command
adds the results to the data as untrusted input. `build.yml` gains a
start-test job for each tested Zotero release, with no token permissions,
no secrets, and no cache. The schema v1 gains the optional field
`startTests`, as D-006 and D-007 allow. The plugin page gains a "Starts in
Zotero" line. README, CHANGELOG, and DESIGN text. This is the last part
of the candidate row "Test plugins load in headless Zotero", and it
absorbs the row in full with M046.

**Out:** The home list and its filters stay as they are. A combined
verdict stays out of scope, as DESIGN says. A start test outside the
manifest's range, and any check that a started plugin works, are not
planned (question set, 2026-10-28). Plugin code that runs in a start-test
job can rewrite that job's results, its own included. The DESIGN Known
issues entry records this limit.

## Acceptance criteria

- [ ] AC1: With `--plan <file>`, `pnpm build` writes a start plan with
      one item for each record with `upstream`. The item names the entry
      id, the plugin id, and the version. It also names the manifest's
      `strict_min_version` and `strict_max_version`, and the URL and
      SHA-256 of the XPI that the build read. A test checks the plan against the XPI bytes of a
      fixture read. Without `--plan`, the build writes no plan. The
      artifacts of a `build.yml` dispatch on the branch, each listed by
      `gh api` and downloaded, hold no `.xpi` file.
- [ ] AC2: `pnpm start-tests --plan <file> --zotero <binary> --out <file>`
      runs `pnpm start-test` for each plan entry whose manifest range
      covers the binary's Zotero version, by `compareVersions` in
      `src/site/version.ts`, and for no other entry. It downloads each XPI
      through the reader's host-checked download. It writes no result for
      an entry whose download fails or whose SHA-256 differs from the
      plan. After its total limit of 20 minutes, it starts no new plugin
      and writes the results it has. Tests use a shim binary at 10.0.6.
      They cover an entry below the range, one above it, and one inside
      it. They cover no `strict_min_version`, no `strict_max_version`, a
      max of `10.*`, and a min equal to 10.0.6. They also cover a hash
      mismatch and a cut by the total limit.
- [ ] AC3: In `build.yml`, the start-test job sets `permissions: {}`, and
      no step of it reads `secrets.`. It runs once for each of Zotero
      7.0.32, 8.0.4, 9.0.6, and 10.0.6 for Linux, each Zotero download
      checked against a SHA-256 in the workflow. The build, start-test,
      and site jobs set `cache-mode: none`. The site job's `if:` is
      `${{ !cancelled() && needs.build.result == 'success' }}`, so after a
      build job that succeeded it runs whatever the start-test jobs'
      results, and after a build job that failed it does not run. The
      deploy job needs the site job. A Ruby YAML parse of the file shows
      these keys and expressions. A dispatch on the branch runs each job,
      with the Zotero download check of each start-test job passing,
      before the deploy job, which then fails at the `github-pages`
      environment's rule that takes deploys from `main` only.
- [ ] AC4: `pnpm add-start-results --data <file> --plan <file> --results
      <dir>` adds a `startTests` item to a record only for a result that
      meets three conditions. Its entry id, plugin id, and version match
      a plan entry. Its Zotero version falls in that entry's range. It
      also equals the version in the name of the artifact that holds the
      result, which the workflow's matrix sets. Its `result` is one of the four names
      of M046. The command drops each other result, and it drops both of
      two results for one entry and one Zotero version. It prints how
      many it dropped. A test covers one kept result and each drop case.
      The drop cases are a plugin version mismatch, a plugin id mismatch,
      an unknown entry, and a bad result name. They also include a Zotero
      version that differs from the artifact name and one outside the
      range. The last two are a duplicate and a file that is not JSON.
- [ ] AC5: `add-start-results` writes `startTests` as an array of
      `{ zotero, result }`, ordered by `compareVersions` of `zotero`, and
      writes no empty array. The schema `plugins.v1.schema.json` defines
      the optional field. A test gives results out of order, asserts the
      output order, and checks the output against the schema. README
      "Using the data" describes the field and tells consumers to fetch
      the schema again, as D-007 asks.
- [ ] AC6: When a record has `startTests`, its plugin page shows a "Starts
      in Zotero" line outside the Details section. The line names each
      tested Zotero version and its result in words. A sentence beside it
      says that a start test does not show that the plugin works. When a
      record has no `startTests`, the page has no such line. A site test
      fixture holds all four results, and the test asserts the words for
      each one and the absent line, on the built HTML.
- [ ] AC7: CHANGELOG has one entry under `## Unreleased` that tells
      consumers to fetch the schema again. DESIGN's Data sources, Contract
      boundary, and Known issues sections describe the start tests. The
      `verify` slot is clean.

## Coverage

- AC1 → T1, T5
- AC2 → T2
- AC3 → T4, T5
- AC4 → T3
- AC5 → T3, T7
- AC6 → T6
- AC7 → T7, T8

## Tasks

- [x] T1: Add `--plan` to `pnpm build` in `src/build/`. Keep the XPI URL
      that the reader read and the SHA-256 of its bytes. If the option is
      set, write the plan. Test both cases.
- [x] T2: Write `pnpm start-tests` in `src/start-test/`. Read the plan,
      pick the entries by range, download and check each XPI, run each
      start, and apply the total limit. Test with the shim binary of M046.
- [x] T3: Write `pnpm add-start-results`. Read every results file as
      untrusted, keep only matching results, order them, and write the
      data. Add `startTests` to `schemas/plugins.v1.schema.json`. Test each
      drop case, the order, and the schema check.
- [x] T4: Split `build.yml` into four jobs. The build job uploads the data
      and the plan. A start-test matrix job runs once for each tested
      Zotero release and uploads its results under a name that holds that
      version. A site job adds the results, runs `pnpm site`, and uploads
      the Pages artifact. The deploy job needs the site job. Parse the
      file with Ruby's YAML.
- [ ] T5: Push the branch and dispatch `build.yml` on it, after making
      sure that `gh run list` shows no waiting run. Read each job's
      result, the start results, and each artifact's file list.
- [x] T6: Add the "Starts in Zotero" line to the plugin page in
      `site/src/pages/plugins/[id]/index.astro`. Test both cases on the
      built HTML, and check the page in the browser pane.
- [x] T7: Write README "Using the data" and "Building the data" text, the
      CHANGELOG entry, and the DESIGN text.
- [ ] T8: Run the `verify` slot, and fix what fails.

## Work log

- 2026-10-28: created by /milestone-plan.
- 2026-10-28: lessons used: 2026-10-25 (M006) Pages deploys from main only; 2026-10-28 (M043) dispatch check of a workflow file; 2026-10-25 (M006) Ruby YAML parse; 2026-10-27 (M021) Astro line breaks; 2026-10-26 (M015) built site in the browser pane.
- 2026-10-28: feature series: M046 -> M047
- 2026-10-28: question set: may implement push the milestone branch and dispatch workflows on it? Yes (asked at the first run of this plan, same day).
- 2026-10-28: question set: may CI run listed plugins' code, download Zotero from download.zotero.org, and apt-install xvfb, libasound2t64, and libdbus-glib-1-2? Yes (D-023).
- 2026-10-28: criteria audit (full mode, fresh Opus reader): 10 findings, all fixed. No artifact holds an XPI (Contract boundary). AC2 gained range edge cases. AC3 gained cache-mode on the build and site jobs (D-010), no site job after a failed build (D-011), and the `if:` as evidence. AC4 takes the Zotero version from the artifact name and gained drop cases. AC5 moved order to the command and gained the D-007 sentence. AC6 tests all four results. Scope states the forged-result limit for any entry in a job.
- 2026-10-28: plan gate chose having each start-test job download the XPI by URL and SHA-256 over passing the build's XPI bytes as an artifact, because a downloadable artifact would re-serve plugin files against the Contract boundary; falsified by hash mismatches in run logs from upstreams that change a release file within a day.
- 2026-10-28: plan gate chose start-test jobs inside `build.yml` over a separate workflow whose results a later build reads, because the results then match the release read that day and need no cross-run read; falsified by the start tests pushing the daily run past its time limits.
- 2026-10-28: plan gate chose the manifest's own range over the range with overrides applied, because Zotero installs by the manifest; falsified by Zotero installing a plugin outside its manifest range.
- 2026-10-28: follow-ups from the M046 review: (1) give the `build.yml` start-test job's checkout `persist-credentials: false` beside `permissions: {}`; (2) the page and README text name the reporter's 3 s wait after install, since an async startup that rejects later counts as started; (3) README needs a `pnpm start-test` section and a note in "Running the tests" that the real-Zotero test runs only with `ZOTERO_BIN` set; (4) DESIGN's ci.yml sentence (line 511 at 2026-10-28) and Function Families need the start-test job and command; (5) `pnpm start-test` now fails, never times out, when the reporter never starts or fails (`reporter-not-started`, `reporter-failed`), so `start-tests` must record no result for those.
- 2026-10-28: implement started on branch m047-show-start-tests.
- 2026-10-28: T1 done: `readUpstream` returns `xpi: { url, sha256 }` beside the facts (the asset URL before redirects, the hash of the bytes read); `buildData` returns `plan`, one item per record with upstream; `pnpm build --plan <file>` writes it. Tests: plan against hashes of the served bytes, plan file, no plan without the option; a planted wrong hash failed the plan test. Verify clean (984 passed, 42 entries checked).
- 2026-10-28: T2 choice: `startTests` runs each start as its own `node src/start-test/cli.ts` process, the script `pnpm start-test` names, with no pnpm in between; any nonzero exit, follow-up (5)'s failures included, records no result. The reader exports `downloadXpi` (host check, redirects, 50 MiB cap), called under the 3-minute read limit.
- 2026-10-28: T2 done: `pnpm start-tests --plan --zotero --out` in `src/start-test/start-tests.ts` and `start-tests-cli.ts` writes a JSON array of `{ entry, id, version, zotero, result }`. 8 tests with a 10.0.6 shim: 7 ranges (below, above, inside, no min, no max, max 10.*, min 10.0.6), hash mismatch, 404 and a refused host, reporter-not-started, the total-limit cut, and the CLI. Planted defects (min compared with `<`, no hash check) each failed their test. Verify clean (992 passed).
- 2026-10-28: T3 choices: the results directory holds one subdirectory per artifact, as download-artifact writes them, and each file in `start-results-<zotero>/` is a results file whose items must carry that version; duplicates count among results that pass the other checks; a missing results directory adds nothing and exits 0; existing `startTests` in the data are replaced.
- 2026-10-28: T3 done: `pnpm add-start-results` (`src/start-test/add-results.ts`, `add-results-cli.ts`) and the optional `startTests` field (`minItems: 1`, `startTest` definition) in the v1 schema. 8 tests: one kept result and each drop case, a directory with no version, order by `compareVersions` with no empty list, the schema's three refusals, and the CLI writing in place. Planted string sort and no duplicate check each failed their test. Verify clean (1000 passed).
- 2026-10-28: T4 found Zotero 8.0.5 has no Linux build (HTTP 403 for .tar.xz and .tar.bz2; a macOS .dmg exists); 8.0.4 is the newest Zotero 8 for Linux, and 7.0.32 for Linux is .tar.bz2 only. AC3 needs 8.0.4 in place of 8.0.5.
- 2026-10-28: re-audit: AC3 (full) — 5 findings on the 8.0.4 wording: the site `if:` misses a cancelled run (fixed: the criterion names the expression); no `cache` input (answered: the workflows test refuses any `cache` key in the file); other token spellings (answered: `permissions: {}` and `persist-credentials: false`); the dispatch must show each download check passing (fixed); the deploy failure rests on the environment rule (fixed).
- 2026-10-28: re-audit: AC3 (full) — 2 findings on the fixed wording: the `if:` value is `${{ }}`-wrapped, so "is" the bare expression fails a literal check; "each download" also covers XPI and artifact downloads, so it should say "each Zotero download". Second re-audit on AC3, so the next wording goes to the user.
- 2026-10-28: checkpoint: T4 `build.yml` drafted with PENDING hashes for 7.0.32, 8.0.4, 9.0.6 (downloads running); T6 page line and fixture drafted, untested.
- 2026-10-28: substantive amendment: AC3 names Zotero 8.0.4 for 8.0.5, which has no Linux build; the site `if:` is named with its `${{ }}` wrapper; "each Zotero download"; the dispatch shows each Zotero download check passing. The user chose this text at the stop after the second re-audit.
- 2026-10-28: T6 done: the plugin page shows "Starts in Zotero:" with `startTestsText` (started, failed at startup, did not install, gave no answer in time) and a note naming the 3 s wait and that a start is not a working plugin, after the languages line and outside Details; the site fixture's no-range record holds all four results. Tests: the words, the note, the place, and no line on the 6 other read records; a planted always-shown line failed 6 tests. Browser pane showed the line in place. Verify clean (1009 passed).
- 2026-10-28: T4 done: `build.yml` has build, start-test (matrix of 7.0.32 .tar.bz2, 8.0.4, 9.0.6, 10.0.6, each with its SHA-256; the three new hashes read from local downloads whose `app/application.ini` Version lines equal the matrix values), site, and deploy jobs; the site results download has `continue-on-error`, so a run with no results still deploys. Ruby YAML parse shows the job keys, `needs`, the site `if:`, `cache-mode: none` on three jobs, `permissions: {}`, and no `secrets` in start-test. `test/workflows.test.ts` gained 4 checks; the hash check failed while one hash read PENDING. Verify clean (1014 passed).
- 2026-10-28: T7 done: README "Using the data" (`startTests`, the four results, fetch the schema again), "Building the data" (`--plan`), a new "Starting plugins in Zotero" section for the three commands, the plugin page paragraph, "The daily build" as four jobs, and the `ZOTERO_BIN` note in "Running the tests"; one CHANGELOG entry; DESIGN Contract boundary, a fifth data source, a Start tests function family, the ci.yml and build.yml architecture, and a Known issues entry on forged results. M046 follow-ups (1) to (5) covered.
- 2026-10-28: T5 started: branch pushed; `build.yml` dispatched on it as run 40772271599 after `gh run list` showed no waiting run.
- 2026-10-28: claim audit: 120 claims read, 4 corrected — .github/workflows/build.yml, README.md (the start-test job's time comment, where the plan goes, the `upstream` check in add-start-results, and add-start-results failing the deploy); the one re-read confirmed 3 and refined the time comment, applied.
- 2026-10-28: T5 run 40772271599: build and site succeeded; each start-test job's Zotero download check passed and its plugins started (37 "started" lines in the 10.0.6 log), then `pnpm start-tests` failed with ENOENT writing `--out` into a missing directory; deploy was skipped, not failed, since a job with a failed earlier job is skipped by default. Fixed: the CLI makes the `--out` parent (the CLI test now names a missing directory; without the fix it failed), and deploy gets `if: ${{ !cancelled() && needs.site.result == 'success' }}`, with a workflows test; README and DESIGN say so. Verify clean (1014 passed).

## Decisions

## Review
