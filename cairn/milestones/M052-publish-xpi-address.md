# M052: Publish each plugin's XPI address

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the published data file is a public API
- **Branch/PR:** m052-publish-xpi-address

## Goal

The published data gives, for each plugin the build read, the address of
the XPI file it read.

## Scope

**In:** an optional `upstream.xpiUrl` string in schema v1; `pnpm build`
writes it from the `.xpi` asset of the release whose manifest it read (the
`url` of the `XpiRead` that `readUpstream` already returns); README "Using
the data", DESIGN, and CHANGELOG name the field.

**Out:** links to the file on the site → M053 (home row icon) and M054
(plugin page button). A v2 schema → candidate row "Keep the v1 data when
v2 ships". Hosting or copying the file: the contract boundary rules it out.

## Acceptance criteria

- [x] AC1: `schemas/plugins.v1.schema.json` defines `xpiUrl` in the
      `upstream` definition as an optional string (absent from `required`).
      A schema test shows a record with `xpiUrl` and one without it pass,
      and a record whose `xpiUrl` is a number fail on that property.
- [x] AC2: `pnpm build` writes `upstream.xpiUrl` on each record with
      `upstream`, equal to the `xpiUrl` of that entry's start plan item,
      which is the `browser_download_url` of the first `.xpi` asset of the
      release whose manifest the reader read. A build test asserts this for
      every record with `upstream` in its fixture build, and that fixture
      covers the three reader paths: the newest stable release, a repo with
      only prereleases, and a stable release that is not a Zotero 7+ build
      followed by a newer prerelease that is. A record with `failure` has
      no `upstream` and so no `xpiUrl`.
- [x] AC3: README "Using the data", DESIGN's data description, and
      CHANGELOG under Unreleased name `xpiUrl` and say which file it
      addresses. DESIGN's out-of-scope line says that a plain link to the
      author's own `.xpi` file is not an install button.
- [x] AC4: The verify slot (`pnpm test`, `pnpm check`) passes.

## Coverage

- AC1 → T1
- AC2 → T2
- AC3 → T3
- AC4 → T1, T2, T3

## Tasks

- [x] T1: Add `xpiUrl` to the `upstream` definition in
      `schemas/plugins.v1.schema.json` and to `UpstreamFacts` (or the
      build's record type) as optional; add the schema test cases.
- [x] T2: In `src/build/build.ts` (`readRecord`, around line 278, and the
      record assembly near line 191), copy `xpi.url` into
      `upstream.xpiUrl`; extend `test/build.test.ts` to compare every
      record with its start plan item, with fixtures for the three reader
      paths and a failure.
- [x] T3: Update README "Using the data", DESIGN (Contract boundary and
      the data description: a link to the author's file, not a copy), and
      CHANGELOG; run the verify slot.

## Work log

- 2026-10-29: created by /milestone-plan.
- 2026-10-29: tier check: milestone — the request is a site redesign with design choices over more than one sitting.
- 2026-10-29: idea vet: gap — a prominent download button could read as an endorsement of unvetted code; reading taken: the field only addresses the author's own file, and the site shows it as a plain button (M054), which the user chose at the question set; no flaw.
- 2026-10-29: question set: how to link to the XPI — a direct link, with the address added to the data as an optional field.
- 2026-10-29: plan gate chose an optional field inside `upstream` over linking to `<repo>/releases/latest` because that page can name a newer release than the one the index read; falsified by a record whose `xpiUrl` names a file other than the one the start test downloaded.
- 2026-10-29: lessons used: 2026-10-25 (M001) pnpm through npx; 2026-10-27 (M027) fast single-file vitest runs.
- 2026-10-29: criteria audit (full mode, fresh Opus reader): 18 findings across M052–M054, 2 here, both fixed: AC2 now compares every fixture record with its start plan item and covers the reader's third path (stable not Zotero 7+, then a newer prerelease); AC3 now has DESIGN say that a plain link to the author's .xpi is not an install button, since DESIGN puts install buttons out of scope.
- 2026-10-29: status in-progress on branch m052-publish-xpi-address (set late, in the T1 commit).
- 2026-10-29: T1 done: optional `xpiUrl` string in the schema's `upstream` definition, typed as `UpstreamFacts & { xpiUrl?: string }` on the build's `PluginRecord` so the reader's facts and its tests stay unchanged; the schema test in `test/build.test.ts` fails on main's schema (an extra-property error) and passes with the field; verify slot green (1071 passed), though npx stalled about 30 minutes before Vitest started at a load near 8.
- 2026-10-29: checkpoint: T2 and T3 written, not yet ticked while the verify run is pending. `readRecord` sets `upstream.xpiUrl` from `read.xpi.url`; the new build test covers the three reader paths (stable, prerelease only, Zotero 6 stable then a newer prerelease whose first of two .xpi assets is read) and fails with the old line (planted); `mixed-failures.plugins.json` gains the passing record's `xpiUrl`. README, DESIGN (data source text, out-of-scope line), and CHANGELOG name the field.
- 2026-10-29: T2 and T3 done: verify slot green over a71164e (1072 passed, 6 skipped; `pnpm check` 56 entries, 0 problems).
- 2026-10-29: claim audit: 14 claims read, 1 corrected — README.md and schemas/plugins.v1.schema.json said the index "links to" the file, but no site page links to it until M053, so they now say the data gives its address and the index keeps no copy; also fixed the stale `XpiRead` comment in src/upstream/reader.ts, which said the XPI read stays out of the published data. The xpiUrl tests and `tsc --noEmit` are green after the fix.
- 2026-10-29: status review: all tasks done; the lint hook's README hits on lines 64, 78, 135, and 542 are older text outside this milestone and were left alone.

## Decisions

## Review

Evidence at 89d7d12, 2026-10-29, branch level with main (2d2639a).

- AC1: `schemas/plugins.v1.schema.json:108` defines `upstream.xpiUrl` as `type: string`, not in `required`. The test "the schema takes an upstream with or without a string xpiUrl and refuses one of another type" passed: a string passes, an absent field passes, and a number gives exactly `/plugins/<i>/upstream/xpiUrl must be string`. Against main's schema the same test failed on its first expectation (implement plant, work log T1).
- AC2: The test "writes on each record with upstream the XPI address of its start plan item, on each of the reader's three release paths" passed. Every record with upstream (Better Notes stable, Second prerelease only, Fallback whose Zotero 6 stable sends the reader to a newer prerelease) has `xpiUrl` equal to its start plan item's. Fallback's value is the first of its two `.xpi` assets, its version is 2.0.0-beta.1, and the forked record has no upstream. With `readRecord`'s old line, the test failed on Better Notes (implement plant, work log T2).
- AC3: README.md:138 ("Using the data") and README.md:709, DESIGN.md:145 (data source 2) and DESIGN.md:110-113 (out-of-scope line: a plain link to the author's .xpi is not an install button), and CHANGELOG.md:385 under Unreleased each name `xpiUrl` and the file it addresses.
- AC4: `pnpm test` passed with 1072 passed and 6 skipped across 22 files; `pnpm check` checked 56 entries with 0 problems.
- Consistency gate: `cairn_validate.py` exit 0, with 1 advisory (M053 has 8 criteria, accepted at the plan). The profile `generic` names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: CHANGELOG entry lacks D-007's "fetch any saved copy of the schema again" line — fix now
- diff-bug #2: docs and schema call the address "the GitHub address", but the reader takes any public http(s) URL the API body gives — fix now (reworded to "the download address that GitHub gives"; the href guard is safeHref in M053 AC3 and M054 AC1)
- diff-bug #3: "the file that the start tests download" overstates, since out-of-range and time-cut items are never downloaded — fix now (reworded to "the start plan names the same address")
- diff-bug #4: the AC2 test's final `checkOutput` repeats buildData's own check — fix now (removed)
- diff-bug #5: the schema test's "with xpiUrl" case overwrote a value the build had already written and checked — fix now (it now asserts the built value is a string)
- diff-bug #6: the forked-record check covers unchanged behavior — reject, planned change (AC2 names it)
- diff-bug #7: the plan comparison holds by construction — reject, planned change (AC2 asks for it; the literal URL list is what fails without the change)
- diff-bug #8: the site fixture has no xpiUrl — reject, planned change (M053 T1 adds xpiUrl fixture records)
- diff-bug #9: plan and record hold one value from two places — reject, false (both read the same `XpiRead` object and cannot diverge)
- diff-bug #10: DESIGN's Contract boundary fact list omits xpiUrl — reject, false (the list names page facts; no page shows the link until M054, whose AC7 updates DESIGN)
- diff-bug #11: README.md:141 overlong line — fix now
- blame-history #1: rewrites M047's "stays out of the published data" comment with no D-entry — fix now (D-029)
- blame-history #2: the out-of-scope carve-out works by definition — fix now (D-029 records the user's plan-time choice and the reason: the link installs nothing, and Zotero installs only from its add-ons dialog)
- blame-history #3: the address is a mutable release-asset URL with no published hash, so a later download can differ from the file tested — fix now (README, schema, and D-029 say so) and follow-up (candidate row "Publish each XPI's SHA-256 with its address", written at hygiene)
- blame-history #4: CHANGELOG lacks the fetch-again line — fix now (same as diff-bug #1)
- blame-history #5: the schema field has no pattern — reject, planned change (URL fields stay plain strings, as `repoUrl`; the site guards hrefs with safeHref in M053 and M054)
- prior-review #1: CHANGELOG lacks the fetch-again line — fix now (same as diff-bug #1)
- prior-review #2: one more strict-v1 field for saved schema copies — follow-up, covered by the existing row "Let old v1 schemas accept new fields", unchanged
- prior-review #3: README wrap — fix now (same as diff-bug #11)
- ripple #1: cairn/mockups/README.md:15 says the site links to xpiUrl — fix now (now says M053 and M054 will)
- ripple #2: the mockup's primary Download control — reject, planned change (M054 scope and D-029 make it a plain button)
- ripple #3: README's start plan paragraph reads as if only the plan holds the URL — fix now (adds that `xpiUrl` holds the same URL)
- ripple #4: Contract boundary list omits xpiUrl — reject, false (same as diff-bug #10)
- ripple #5: CHANGELOG entry placement — reject, false (it sits last under the one Unreleased heading)
- ripple #6: build.ts "the plan stay out of the data" — reject, false (still true; the reviewer found no conflict)
- Every fix-now line above: fixed ef75e5a. After the fixes, `pnpm test` gave 1072 passed and 6 skipped, `pnpm check` 0 problems, and `cairn_validate.py` exit 0.
- snapshot: no changed snapshot files (no `_snaps` or `__snapshots__` path in the diff).
- Open-PR cap: 0 open PRs of the operator on this repo, under the feature cap of 1.
