# M059: Reuse start results for unchanged XPIs

- **Status:** in-progress
- **Priority:** high
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the published data gets a field, and the site and README change what they say about start timing
- **Branch/PR:** m059-carry-start-results

## Goal

If a recent `started` result exists for the same XPI file and tested Zotero release, the daily build reuses it and does not start the plugin again.

## Scope

**In:** Publish each read XPI's SHA-256 as `upstream.xpiSha256`. Add a carry step to the build job of `build.yml`. The step reads the deployed data and writes the reused results into the start plan as `carried` lists. `pnpm start-tests` skips carried pairs. `pnpm add-start-results` merges carried results with the jobs' results. Each entry gets a re-test day once every 7 days, and a failure is tested again on the next run. Update the docs, the schema text, the CHANGELOG, and DESIGN.md, and add a D-entry on the carry's trust and forgery cost.

**Out:** A date on each start result. The user declined it at the question set, so no row holds it. The live check that a run after the merge carries results. The first run after the merge deploys the hashes and carries nothing, so only the second scheduled run can show it. That check is a post-merge read of the run log and needs no row. Showing the SHA-256 on the site stays out, as "Publish each XPI's SHA-256 too" asks only for the data.

## Acceptance criteria

- [ ] AC1: `pnpm build` writes `upstream.xpiSha256` on each record that has `upstream` and a start plan item. The value equals that item's `sha256`. `schemas/plugins.v1.schema.json` defines the field as an optional string of 64 lowercase hexadecimal characters. A test in `test/build.test.ts` shows the field equal to the plan item's `sha256`. Schema tests show that the schema refuses an upper-case value, a 63-character value, a 65-character value, and a 64-character value with a `g`. They also show that it accepts one valid value and a record without the field.
- [ ] AC2: A carry step of the build job in `.github/workflows/build.yml` runs after `pnpm build` and before the `start-plan` upload. It reads the deployed data at `https://jmgirard.github.io/zotero-plugin-index/v1/plugins.json`. It writes a non-empty `carried` list only into plan items with at least one match outside their re-test day. Other items get no `carried` field. A match is a `started` item of the earlier record's `startTests`. The earlier record must have the item's entry id. Its `upstream` must have the item's `id` and `version`, and an `xpiSha256` equal to the item's `sha256`. The re-test day is the day where floor(t / 86,400,000) mod 7 equals `retestDay(entry)`. Here t is `generatedAt` of the data file that `pnpm build` wrote, in milliseconds. `retestDay` is a pure function from the entry id to a number from 0 to 6. The job keeps `cache-mode: none` and its permissions. `test/workflows.test.ts` checks the step's command and its place.
- [ ] AC3: Tests over fixture data show a carried result for a match. They show no carried result for each of these changes alone: a different hash, version, or plugin id, no earlier record for the entry, an earlier record with `failure` and no `upstream`, an earlier record with no `startTests`, an earlier record with no `xpiSha256`, and the re-test day. A record that mixes `started` and other results across versions carries only its `started` items. For one entry over 7 consecutive days, the carry is withheld on exactly one day.
- [ ] AC4: On any error, the carry step leaves the plan as `pnpm build` wrote it, prints one line that names the cause, and exits 0. It writes the plan through a temporary file and a rename. The errors include a failed fetch, an answer other than 200, and more than 16 MiB of decoded body, counted as it streams. They also include a body that does not parse as JSON or has no `plugins` list, a read past the time limit, and an unreadable plan or data file. The time limit is a parameter, 60 s by default. A malformed earlier record carries nothing and does not stop the step. Tests plant each listed cause and show the plan file unchanged and the exit status 0.
- [ ] AC5: `pnpm start-tests` does not download or start a plan item whose `carried` list names the binary's Zotero version. It counts such an item as carried in its summary line, never as not started, whatever the time. A test with a stub start-test command and a fixture fetch shows a carried item with no request and no start. It also shows that an item whose `carried` list names only another version is downloaded and started.
- [ ] AC6: `pnpm add-start-results` adds the carried results of each plan item to its record, beside the jobs' results. A carried result must be `started` and name a Zotero version in `--tested` and in the item's manifest range. A job result for an entry and Zotero version that the plan carries drops with the reason `carried`. `parsePlan` refuses a `carried` that is not an array, an item without a string `zotero`, an item whose `result` is not `started`, and two items with the same `zotero`. Tests show each of these rules and each refused shape. A chained fixture test runs the carry step, `pnpm start-tests`, and `pnpm add-start-results` in turn. It shows that the merged data, read by a second carry, carries the same results again.
- [ ] AC7: Some texts state the start rule: README (the `upstream` fields, the `startTests` paragraph, and "Starting plugins in Zotero"), the About page's start-test section, the home page intro and legend, the `startTests` description in `schemas/plugins.v1.schema.json`, and DESIGN.md. The start rule has four parts. A start runs for an XPI file whose SHA-256 differs from the last one tested. It runs for a tested Zotero release with no earlier result. It runs after a result other than `started`. It runs on the entry's re-test day, once every 7 days, in a build that deploys. Each line that `grep -rniE 'daily|each day|every day' README.md site/src schemas cairn/DESIGN.md` lists and that describes start timing agrees with the start rule. README and the CHANGELOG entry name `upstream.xpiSha256` and tell users to fetch `plugins.v1.schema.json` again. `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check` pass.

## Coverage

- AC1 → T1
- AC2 → T2, T3, T4
- AC3 → T2
- AC4 → T3
- AC5 → T5
- AC6 → T5, T6
- AC7 → T7, T8

## Tasks

- [x] T1: Publish `upstream.xpiSha256`. Change the record type and writer in `src/build/build.ts` (near lines 23 and 283), add the v1 schema field, and add the build and schema tests.
- [x] T2: Write `src/start-test/carry.ts`, with the pure carry selection and `retestDay`. Add the AC3 tests.
- [x] T3: Write the carry command, `pnpm carry-start-results --plan <file> --data <file> --previous <url>`. It fetches with a time limit and a 16 MiB cap, keeps the AC4 fallbacks, and rewrites the plan through a temporary file. Add tests with a fixture fetch.
- [x] T4: Add the carry step to `build.yml` after `pnpm build` and before the `start-plan` upload. Add its check to `test/workflows.test.ts`.
- [x] T5: Make `parsePlan` read and check `carried`. Make `startTests` skip carried pairs and count them in its summary. Add tests.
- [x] T6: Make `addResults` merge carried results and drop job results for carried pairs as `carried`. Add the AC6 tests and the chained test.
- [x] T7: Update README, `site/src/pages/about.astro`, `site/src/pages/index.astro`, the schema's `startTests` text, DESIGN.md, and CHANGELOG.md. Write a D-entry on reading the deployed data for the carry. It annotates D-023 and D-024, and states that a forged `started` on an unchanged XPI can last until the entry's next re-test day.
- [ ] T8: Run the verify commands. Dispatch `Build data` on the branch once, to check that the changed workflow runs. The deployed data has no hashes yet, so that run carries nothing.

## Work log

- 2026-10-30: created by /milestone-plan.
- 2026-10-30: tier check: milestone — it changes the daily workflow and the published data, and it needs design choices.
- 2026-10-30: idea vet: gap, re-test policy, since a reused result could hide a forged, flaky, or outdated start (reading taken: weekly re-test with failures tested daily, sent to the set as a choice the request leaves open, answered so). Gap, a date per result (sent to the set, answered no). No flaw.
- 2026-10-30: lessons used: 2026-10-25 (M001), 2026-10-28 (M035), 2026-10-28 (M043), 2026-10-29 (M047), 2026-10-30 (M057).
- 2026-10-30: collision: candidate "Reuse start results for unchanged XPIs" absorbed in full. Candidate "Publish each XPI's SHA-256 too" absorbed in full, since the carry keys on the published hash.
- 2026-10-30: collision: D-010 and D-024 hold, since the carry reads the deployed data over HTTPS and uses no cache. D-015's "restores no earlier data" is about plugin facts and stays true. D-023's forgery cost changes, and T7's D-entry records it.
- 2026-10-30: collision: the new field is another case for candidate "Let old v1 schemas accept new fields". Review hygiene extends that row.
- 2026-10-30: inbox sweep: 0 open issues. 18 open bot pull requests (discover/*), none overlaps.
- 2026-10-30: priority high: in run 40976358530 the Zotero 10.0.6 start-test job ran 212 starts in about 19.5 of its 20 minutes, and 18 bot pull requests wait to add plugins.
- 2026-10-30: criteria audit (full): 18 findings. 17 taken: hash field bound to plan items, wider pattern probes, D-007 schema notice, `carried` only when non-empty, `retestDay` rule with t from `generatedAt`, more carry probes, exit 0 on any error, decoded-byte cap and a time-limit parameter, carried items never counted as not started, `parsePlan` refusals, only `started` merged, the schema text added to AC7, recording clause dropped, start rule keyed on the hash, chained test added, weekly promise narrowed to builds that deploy. 1 needed no change (the plan's extra field already reaches the later jobs).
- 2026-10-30: question set: re-test policy — weekly re-test, failures tested daily. Date per result — none.
- 2026-10-30: question set: dispatch `Build data` on the milestone branch — yes, up to 2 runs, deploy skipped off main.
- 2026-10-30: plan gate chose the deployed Pages data as the source of earlier results over a previous run's artifact, because an artifact read needs `actions: read`, expires, and can come from a run that did not deploy. The Actions cache was out under D-010 and D-024. Falsified by evidence that the deployed data can change by a path other than the site job.
- 2026-10-30: plan gate chose a fixed weekly re-test day per entry over re-testing by result age, because age needs a date field, which the user declined, and a fixed day spreads the starts. Falsified by a run log in which carried results hide a start-test harness change for more than 7 days.
- 2026-10-30: plan gate chose to write carried results into the start plan in the build job over a carry inside the start-test jobs, because those jobs run plugin code and the site job must merge carried results from a source plugin code cannot write. Falsified by evidence that plugin code can replace the `start-plan` artifact.
- 2026-10-30: implement started on branch m059-carry-start-results.
- 2026-10-30: T1 done: `readRecord` writes `xpiSha256` beside `xpiUrl`, the schema adds it with pattern `^[0-9a-f]{64}$`. The fixture zips XPIs with the current time, so `mixed-failures.plugins.json` holds `PLAN_SHA256`, which the test fills from the plan. The `StartPlanItem.carried` type rides in this commit for T2. pnpm test 1332 passed, pnpm check 0 problems.
- 2026-10-30: T2 and T3 done in one commit, since both live in `src/start-test/carry.ts`: `retestDay` is the first 4 bytes of the entry id's SHA-256 mod 7; a record or test item of another shape, a Zotero version named twice, and an entry id named twice carry nothing; `carryPlan` returns code 0 with one line on every error; `--previous` defaults to `PREVIOUS_URL`; the CLI exits 1 only for a usage error. Planted defects (hash check removed, re-test day removed) each turned 2 tests red. A two-run build test then failed, since fixture zips took the current time: `fixture-fetch.ts` now zips with a fixed time, which fflate writes in local time, so the build fixture keeps `PLAN_SHA256`. pnpm test 1364 passed.
- 2026-10-30: T4 done: the build job runs `pnpm carry-start-results` right after `pnpm build`, with no `if:`, so a failed build skips it; the workflow test reads the step's text and order against `PREVIOUS_URL`. Ruby's YAML parse lists the step between `pnpm build` and the uploads. workflows.test.ts 55 passed.
- 2026-10-30: T5 done: `parsePlan` refuses a `carried` that is not a list, an item without a string `zotero` or not `started`, and a Zotero version named twice; `startTests` checks `carried` after the range and before the total limit, lists the entry in `carried`, and the summary line names the count. Planted defect (carry check after the limit) turned the limit test red. pnpm test 1374 passed.
- 2026-10-30: T5 note: its `start-tests.ts` edit went through a python script, not the Edit tool, against tracking-rules' file-edit rule; the commit holds the same diff, and later edits use Edit.
- 2026-10-30: T6 done: `addResults` adds a plan item's carried `started` results for a `--tested` version in its range, only for a record with upstream, and drops a job result for a carried pair as `carried`; the outcome and the CLI line count carried results. The chained test sits in `test/start-tests.test.ts`, which holds the Zotero stand-in, and runs `carryPlan`, `startTests`, and `addResults` as functions. Planted defect (drop rule removed) turned its test red. pnpm test 1377 passed.
- 2026-10-30: T6 fix: AC6 names the commands, so the chained test now spawns `pnpm carry-start-results`, `pnpm start-tests`, and `pnpm add-start-results` under the fetch preload, with schema-valid records, in place of calling their functions.
- 2026-10-30: T7 done: README (version cells, `xpiSha256` paragraph with the fetch-again notice, the start rule and the forged-carry cost, `pnpm carry-start-results`, start-tests and add-start-results rules, daily build job 1), About page `data-fact="start-when"` paragraph, home intro and legend ("Started in the start test", with its site test), the schema's `startTests` text, DESIGN.md (contract item 5, start-test family, workflow), CHANGELOG entry, and D-035. D-035 went in through a shell append, not the Edit tool. One README line that an Edit joined was rewrapped. Browser pane on a site built from the deployed data shows the new About paragraph, intro, and legend. pnpm test 1377 passed, pnpm check 0 problems.

## Decisions

## Review
