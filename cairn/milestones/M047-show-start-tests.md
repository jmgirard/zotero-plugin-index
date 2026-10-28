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
      7.0.32, 8.0.5, 9.0.6, and 10.0.6 for Linux, each download checked
      against a SHA-256 in the workflow. The build, start-test, and site
      jobs set `cache-mode: none`. If the build job succeeded, the site
      job's `if:` runs it, whatever the start-test jobs' results. If the
      build job failed, the site job does not run. The deploy job needs the site job. A Ruby
      YAML parse of the file shows these keys and expressions. A dispatch
      on the branch runs each job before the deploy, which then fails, as
      the `github-pages` environment takes deploys from `main` only.
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
- [ ] T2: Write `pnpm start-tests` in `src/start-test/`. Read the plan,
      pick the entries by range, download and check each XPI, run each
      start, and apply the total limit. Test with the shim binary of M046.
- [ ] T3: Write `pnpm add-start-results`. Read every results file as
      untrusted, keep only matching results, order them, and write the
      data. Add `startTests` to `schemas/plugins.v1.schema.json`. Test each
      drop case, the order, and the schema check.
- [ ] T4: Split `build.yml` into four jobs. The build job uploads the data
      and the plan. A start-test matrix job runs once for each tested
      Zotero release and uploads its results under a name that holds that
      version. A site job adds the results, runs `pnpm site`, and uploads
      the Pages artifact. The deploy job needs the site job. Parse the
      file with Ruby's YAML.
- [ ] T5: Push the branch and dispatch `build.yml` on it, after making
      sure that `gh run list` shows no waiting run. Read each job's
      result, the start results, and each artifact's file list.
- [ ] T6: Add the "Starts in Zotero" line to the plugin page in
      `site/src/pages/plugins/[id]/index.astro`. Test both cases on the
      built HTML, and check the page in the browser pane.
- [ ] T7: Write README "Using the data" and "Building the data" text, the
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

## Decisions

## Review
