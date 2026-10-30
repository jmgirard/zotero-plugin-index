# M062: Mark full support against released Zotero versions

- **Status:** in-progress
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — it changes the declared marks on every page and adds a field to the public data file
- **Branch/PR:** m062-full-support-marks

## Goal

If a declared range covers every released version of a Zotero major, up to its newest
release, the mark for that major reads "all".

## Scope

**In:** `pnpm build` reads the current Zotero release from zotero.org and writes it as
the top-level `zoteroRelease` of `v1/plugins.json`. `src/site/version.ts` keeps a list of
the last release of each earlier major. `majorSupport` measures a major from N.0 to its
newest release. The home table, the `?zotero=` filter, the plugin page, the About page,
and the home legend follow the new rule. README, DESIGN, and CHANGELOG describe it.

**Out:** moving the start-test matrix's Zotero pins, which nobody asked for. The owner
and stars line is in M061. The menu arrow and release month are in M063.

## Acceptance criteria

- [x] AC1: `pnpm build` reads `https://www.zotero.org/download/client/version?channel=release`
      with a 30 s limit. It writes the answer's `linux-x86_64` value as the top-level
      `zoteroRelease` of `v1/plugins.json`. `schemas/plugins.v1.schema.json` defines
      `zoteroRelease` as an optional string that matches `^[0-9]+(\.[0-9]+)*$`. The
      request carries no `Authorization` header. A failed read is a non-2xx answer, a
      thrown request, no answer within 30 s, a body that is not JSON, or a
      `linux-x86_64` value that is missing or does not match. On a failed read, the build
      writes no `zoteroRelease` and prints one line that names the cause. That read alone
      does not make the build fail. Tests with fixture responses check a good value, a
      500 answer, a thrown request, a request that passes the limit, a body that is not
      JSON, a missing `linux-x86_64` key, the value `10.0.7-beta`, and the absent header.
- [x] AC2: `majorSupport` measures major N over N.0 to the newest release of N. If the
      first part of `zoteroRelease` is N, the newest release is `zoteroRelease`.
      Otherwise it is the entry for N in a hand-kept list in `src/site/version.ts`. With
      neither, it is N.9 as before. The list holds 7.0.32, 8.0.5, and 9.0.6, the newest
      releases that Zotero's `https://www.zotero.org/support/<N>.0_changelog` pages listed
      on 2026-10-30, and a code comment gives that date. A range whose minimum is above
      its maximum is "none". If the range covers N.0 and the newest release, the mark is
      "all". If the range ends before N.0 or starts after the newest release, the mark is
      "none". Otherwise the mark is "some".
- [x] AC3: Tests in `test/version.test.ts` check the AC2 rule on these cases. With newest
      10.0.7, max `10.0.*` gives all, max `10.0.6` gives some, min `10.1` gives none, and
      min `10.0` with no max gives all. With newest 10.1.0, max `10.0.*` gives some. With
      no newest, max `10.0.*` gives some, and max `10.99.99` gives all. For major 9 with
      the list value, max `9.0.*` gives all. Min `10.0.3` with max `10.0.1` gives none.
- [x] AC4: The home table's marks, the `data-zotero` values that the `?zotero=` filter
      reads, the plugin page's Declared cells, and their hidden text use the AC2 result
      with the data's `zoteroRelease`. A site test builds a fixture with `zoteroRelease`
      `10.0.7`. A record whose maximum is `10.0.*` reads all in its home mark and plugin
      page cell for 10. A record whose minimum is `10.1` has no `10` in its row's
      `data-zotero`. Built with no `zoteroRelease`, the first record reads some and the
      second record's `data-zotero` holds `10`.
- [x] AC5: The About page's "Declared range" section and the home legend say that all
      means every released version of that major up to its newest release. For each
      major of `ZOTERO_MAJORS`, the About page names the newest release that the build
      used, or says that it knew none. README, DESIGN, and one CHANGELOG entry describe
      the rule and `zoteroRelease`. README and the CHANGELOG entry tell consumers that
      validate against a saved copy of the schema to fetch it again. A site test checks
      that the About page names `10.0.7` from the fixture and `7.0.32` from the list. It
      also checks that a build with no `zoteroRelease` says that no release of 10 is
      known.
- [x] AC6: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1, T6
- AC2 → T2
- AC3 → T2
- AC4 → T3
- AC5 → T4
- AC6 → T5

## Tasks

- [x] T1: Add the zotero.org read to `buildData` in `src/build/build.ts` with its own
      30 s limit and no token, add `zoteroRelease` to the data type and the schema, and
      add the fixture-response tests.
- [x] T2: Add the hand-kept list and a newest-release argument to `majorSupport` and
      `rowMajors` in `src/site/version.ts`, and add the `test/version.test.ts` cases.
- [x] T3: Pass `zoteroRelease` from `loadData` in `site/src/data.ts` to every caller of
      `majorSupport` and `rowMajors` (home table, plugin page, `supportText`), and add
      the fixture records and site tests.
- [x] T4: Rewrite the About page's "Declared range" text and the home legend, then
      update README, DESIGN, and CHANGELOG. Record the new zotero.org read as a D-entry,
      since it adds a source to the build.
- [x] T5: Run `pnpm test` and `pnpm check`, and look at the home table and one plugin
      page in the browser pane with the deployed data.
- [x] T6: (review return 1) Read the zotero.org body outside the JSON parse's `try`, so a
      failed body read names its own cause, and add a body-reset regression case.
- [x] T7: (review return 1) Apply review pass 1's fix-now findings, as the Review section
      lists them.

## Work log

- 2026-10-30: created by /milestone-plan.
- 2026-10-30: tier check: milestone — the request adds a data field and changes page and table behavior across several parts.
- 2026-10-30: idea vet: gap, a hand-kept newest release goes stale and then shows all after a newer release ships; posed at the question set, which chose a daily read of zotero.org. Gap, a range that starts after the newest release can read none or part; posed at the question set, which chose none.
- 2026-10-30: question set: newest Zotero release — read zotero.org daily, with the last releases of 7, 8, and 9 kept in the code; range past the newest release — none.
- 2026-10-30: plan gate chose a daily read of zotero.org over a hand-kept list only because the list lags each Zotero release and shows all too early meanwhile; falsified by the endpoint changing shape or failing on most days.
- 2026-10-30: plan chose to write the read value into the data over a read at site build time, so that `pnpm site` builds the same pages from the same data file; falsified by a need to rebuild the site without rebuilding the data.
- 2026-10-30: plan chose that a failed read leaves the field out and does not fail the build, since a one-day fallback to the N.9 rule shows part, never a false all (D-011 withholds a deploy only for build-level failures).
- 2026-10-30: criteria audit (full mode, fresh Opus reader): here AC1 adds the 30 s limit, a non-JSON body, and tests for each failure; AC2 names the list values and keeps min above max as none; AC3 adds a Zotero 9 case and a minimum-only case; AC4 tests `data-zotero` with a min `10.1` record, since the old check passed under both rules; AC5 tests the list value and the "none known" text.
- 2026-10-30: collision check: M037 and M053 shipped the marks and the N.9 rule, and this changes their upper end; no D-entry rejects it. Inbox sweep: 0 open issues, 18 bot pull requests, none overlapping.
- 2026-10-30: lessons used: 2026-10-27 (M030, test a time limit with a stubbed `performance.now()` so the cut needs no real wait), 2026-10-28 (M035, build the site from the deployed data for a hand check), 2026-10-29 (M053, the built script is minified, so test it in `node:vm`).
- 2026-10-30: implement started on m062-full-support-marks, cut from main at 0170d1e.
- 2026-10-30: T1 done: `src/build/zotero-release.ts` holds the read; `buildData` runs it after the plugin reads (so it takes no time from `buildMs`) with a `releaseMs` limit and returns `releaseProblem`, which the CLI prints to stdout as one `cannot read the Zotero release:` line; the read of a timed-out body rethrows the abort reason so a cut body reads as the limit, not as non-JSON. Tests: 7 in-process `buildData` cases and 1 spawned CLI case; the token case also checks that the GitHub reads carry the planted token.
- 2026-10-30: T1 follow-up: added a stalled-body case, which backs the code comment on the rethrow.
- 2026-10-30: T2 done: `LAST_RELEASES` and `newestRelease(major, zoteroRelease?)` in `src/site/version.ts`; `majorSupport` and `rowMajors` take an optional `zoteroRelease`. The list values were re-read from the three changelog pages today and match. One old case changed from some to all (`6.999`–`7.0.*` for 7, since 7.0.32 is the last 7 release), and a `7.0.31` case now holds the some reading; 9 AC3 cases added.
- 2026-10-30: T3 done: the home page and plugin page read `zoteroRelease` from `loadData` and pass it to `majorSupport`; `rowMajorsAttribute` takes it as a second argument. `supportText` takes the support already computed, so it needed no change. The site tests build a two-record data set twice (10.0.7 and none) in a new describe and leave the shared fixture as it was; with the `site/` changes stashed, the 10.0.7 test fails.
- 2026-10-30: T4 done: `newestRelease` split into `knownRelease` (undefined with no known release) and the N.9 fallback, so the About page can say "no release known"; the About page lists one `data-newest-releases` item per `ZOTERO_MAJORS` entry; the legend and About mark lines now say "every release of that Zotero version, up to its newest release". README (The site, Using the data, Building the data), DESIGN (marks rule, data sources, function family, architecture), one CHANGELOG entry, and D-036 updated. The README's two old lint hits (lines 233 and 810) and CHANGELOG's eight are in earlier text and were left.
- 2026-10-30: T5 done: `pnpm test` (1541 passed, 6 skipped) and `pnpm check` (272 entries, 0 problems) pass. Hand check in the browser pane: the site built from the deployed data (272 records, no `zoteroRelease`) with `zoteroRelease` set to 10.0.7, the value the zotero.org address gave today. Zotero 10 reads all for 206 plugins, against 135 under the old rule; AIdea (6.999 to 10.0.*) shows ✓ for 7 to 10 on its home row and "Declares all of Zotero 10" on its page; the About page lists 7.0.32, 8.0.5, 9.0.6, and 10.0.7; `?zotero=10` shows 211 of 272; no console errors.
- 2026-10-30: claim audit: 61 claims read, 4 corrected — src/build/cli.ts (the N.9 fallback covers only the current major), src/build/zotero-release.ts (the answer's shape, dated), src/site/version.ts (cites the new source note), test/site.test.ts (describe comment); the same Opus reader re-read the 4 and found them true. Its own spawned-CLI test runs failed in its sandbox, including old tests; in this session all 1541 pass.
- 2026-10-30: added source note `cairn/references/zotero-changelogs.md` and its INDEX line, since the repo now relies on the three changelog pages and the release address; shelf copies saved under `cairn/references/sources/`.
- 2026-10-30: status set to review; `pnpm test` (1541 passed, 6 skipped) and `pnpm check` (0 problems) pass.
- 2026-10-30: review started, route (d): no PR, main unmoved. AC1–AC6 evidence recorded and ticked; `cairn_validate` passes; generic profile has no toolchain checks. Four-lens review spawned; checkpoint while it runs.
- 2026-10-30: review return 1: AC1 fails inside its domain: `readZoteroRelease` reads the body and parses it in one `try`, so a body read that fails mid-transfer prints "returned a body that is not JSON" instead of its cause (diff-bug #1). The fix-now findings of pass 1 (diff-bug #4, #6, #7, #10, #11, #14, #17; blame-history #3; prior-review #1–#3; ripple #1–#3) ride with the return. Follow-up row "Flag a new Zotero major in the build" added at normal. Status back to in-progress.
- 2026-10-30: implement resumed for review return 1; minor amendment: added T6 (the AC1 fix, Coverage AC1 → T1, T6) and T7 (the pass 1 fix-now findings).
- 2026-10-30: T6 done: `readZoteroRelease` awaits `response.text()` before the parse's `try`, so a failed or cut body read reaches the outer catch with its own cause, and the `signal.aborted` check is gone. The new "a body read that fails" case (`bodyError: "read ECONNRESET"`) failed on the old code with "returned a body that is not JSON" and passes now; the stalled-body case still names the limit.
- 2026-10-30: T7 done: the CLI prints the release line before the writes; build.yml and README name the 30 s read beside the other limits, and README's release paragraph moved after the plugin time-limit paragraph; README's field list names `zoteroRelease`; README and the About page restore the 8.999 note (it covers none of 8); `checkOutput` has a pass case and a `10.0.7-beta` reject case for `zoteroRelease`; the release error cases use `releaseMs: 1000`, drop the repeated `checkOutput` and `buildLevel` expects, and the CLI test checks "build-level failures: 0 of 3 records" once; the site test drops the weaker list expect and the restating comment; DESIGN and README added lines rewrapped to 80 columns. `pnpm test` 1544 passed, 6 skipped; `pnpm check` 0 problems.

## Decisions

## Review

Evidence gathered 2026-10-30 on m062-full-support-marks at 60d3bbc, main unmoved (0170d1e).

- AC1: `ZOTERO_RELEASE_URL` is the named address and `ZOTERO_RELEASE_LIMIT_MS` is 30 000 (`src/build/zotero-release.ts:6,9`); the schema's `zoteroRelease` is an optional string with pattern `^[0-9]+(\.[0-9]+)*$` (required list still schemaVersion, generatedAt, plugins). `test/build.test.ts` "and the current Zotero release" passes 8 cases: the good value 10.0.7 with no `authorization` header while the GitHub reads carry the planted token, a 500, a thrown request, a request and a body past the limit, a non-JSON body, no `linux-x86_64` key, and `10.0.7-beta`; each failure case writes no field and names the cause. The spawned "prints one line that names a failed read of the Zotero release, writes the data, and exits 0" test passes.
- AC2: `LAST_RELEASES` holds 7.0.32, 8.0.5, 9.0.6 with the 2026-10-30 date in its comment (`src/site/version.ts`); `newestRelease` takes `zoteroRelease` for its own major, else the list, else N.9; `majorSupport` returns none for min above max, all for covering N.0 and the newest release, none for ending before N.0 or starting after it, else some. The values match the first "Changes in" heading of each shelf page (`cairn/references/zotero-changelogs.md`).
- AC3: `test/version.test.ts` passes all 9 named cases with their named results (verbose run).
- AC4: `test/site.test.ts` "the newest Zotero release" passes: with 10.0.7 the 10.0.* record's home mark and plugin-page `data-declared` for 10 read all, and its hidden text reads "Declares all of Zotero 10"; the 10.1 record's `data-zotero` is empty. With no release the first reads some on both, and the second's `data-zotero` is `10`. Hand check on the deployed data: `?zotero=10` showed 211 of 272 (T5).
- AC5: About and legend tests pass with the new "every release of that Zotero version, up to its newest release" text; the About list names 7.0.32, 8.0.5, 9.0.6, 10.0.7 from the 10.0.7 build and "Zotero 10: no release known, so the index counts 10.0 to 10.9" from the build with none. README (The site, Using the data at lines 236-242, Building the data), DESIGN, and one CHANGELOG entry describe the rule and `zoteroRelease`; the README paragraph and the CHANGELOG entry both tell schema consumers to fetch a saved copy again.
- AC6: `pnpm test` 1541 passed, 6 skipped, 0 failed; `pnpm check` 272 entries, 0 problems.

Review pass 1 findings.

- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: one `try` in `readZoteroRelease` covers `response.text()` and `JSON.parse`, so a body read that fails mid-transfer (fixture `bodyError: "read ECONNRESET"`) prints "returned a body that is not JSON", and a timer that fires after the body arrives reports a non-JSON body as the limit — fix now, return-floor: AC1's "names the cause" fails inside its domain (review return 1)
- diff-bug #2: `knownRelease` takes `zoteroRelease` for its major even when it is older than that major's `LAST_RELEASES` entry — reject, planned change: AC2 states that `zoteroRelease` wins for its own major, and the list holds only earlier majors, so this needs zotero.org to serve an older major than the list holds
- diff-bug #3: when zotero.org serves 11.x, 10 has no list entry and falls back to N.9, the About page's "keeps the last release of each earlier Zotero version" turns false, and 11 is not in `ZOTERO_MAJORS` — follow-up, candidate row "Flag a new Zotero major in the build", normal rung, since every new major meets it and the fallback shows part, never a false all
- diff-bug #4: `.github/workflows/build.yml:21-24` and README's "These limits leave time" sentence list the limits without the new 30 s read — fix now
- diff-bug #5: a timeout prints "time limit of 30000 ms" while README says 30 seconds — reject, style: the number is exact, and `duration` formats every other non-minute limit in ms the same way
- diff-bug #6: `cli.ts` prints the release line only after the data and plan writes succeed — fix now: print it before the writes
- diff-bug #7: no test that `checkOutput` rejects a bad `zoteroRelease` — fix now: one `checkOutput` case, since the pattern is a documented schema claim
- diff-bug #8: the "all" mark's hover and hidden text still say "Declares all of Zotero N" — reject, false: that text stays true under the new rule, and AC5 names the legend and the About page for the longer wording
- diff-bug #9: `(error as Error).message` gives "failed: undefined" for a rejection that is not an Error — reject, edge: fetch rejects with an Error or the limit's Error reason in every documented use, and the effect is a less clear printed line
- diff-bug #10 (tests): the `checkOutput` expect repeats in all 7 failure cases though `buildData` already checks its output — fix now: remove
- diff-bug #11 (tests): `buildLevel` expect repeats across 7 cases on one path — fix now: state it once, in the CLI test's summary line
- diff-bug #12 (tests): the CLI test's `not.toHaveProperty("zoteroRelease")` repeats the in-process 500 case — reject, false: it checks the file the command writes, a path the in-process case does not reach
- diff-bug #13 (tests): the site describe's schema-validity test checks a fixture the test wrote — reject, false: it guards the fixture as the shared fixture's validity test does, so a bad fixture cannot pass the mark tests
- diff-bug #14 (tests): the second expect of the "no release of 10 is known" test is weaker than the exact list in the test before it — fix now: remove
- diff-bug #15 (tests): the hidden-text check repeats the `data-declared` check — reject, planned change: AC4 names the hidden text
- diff-bug #16 (tests): the `9.0.*`-for-9 case runs the same path as the `7.0.*`-for-7 case — reject, planned change: AC3 names it
- diff-bug #17 (tests): the site describe comment restates the code — fix now: drop the restating part
- blame-history #1: Zotero 10 marks revert to N.9 once Zotero 11 ships unless someone adds 10 to `LAST_RELEASES` — follow-up, same candidate row as diff-bug #3
- blame-history #2: D-036 does not name D-015 or D-027, which make a time-limited read build-level or a build failure — reject, false: D-016 narrows D-015's limits to the plugin reads, and D-027 covers only the report read, so the release read falls under neither
- blame-history #3: README and the About page dropped M015's note that a minimum such as 8.999 means Zotero 9 and newer, which still holds — fix now: restore the sentence in both
- prior-review #1: every release error case runs with `releaseMs: 100`, so a non-stall case can flake under load, against M050's 1000 ms fix and the "Steady the time-limit tests under load" row — fix now: 1000 ms
- prior-review #2: four added DESIGN lines run past 80 columns, against the M036 and M018 lessons — fix now: rewrap
- prior-review #3: the README release-read paragraph sits between the plugin-failure paragraph and the plugin time-limit paragraph, with two hand-broken short lines — fix now: move it after the time-limit paragraph and rewrap
- ripple #1: README's "The file has a `schemaVersion` of `1`, a `generatedAt` time, and one record" omits `zoteroRelease` — fix now
- ripple #2: the build.yml limit comment omits the 30 s read — fix now, with diff-bug #4
- ripple #3: README's "These limits leave time" omits the 30 s read — fix now, with diff-bug #4
- ripple #4: DESIGN's "runs on GitHub only" now that the build reads zotero.org — reject, false: the sentence says where the index runs, and the start test already downloads from download.zotero.org
- ripple #5: the mark tooltip keeps "Declares all of Zotero N" — reject, false, as diff-bug #8
- ripple #6: README's "A check mark (✓) means all of it" leaves "all" undefined — reject, false: the next two sentences define it
