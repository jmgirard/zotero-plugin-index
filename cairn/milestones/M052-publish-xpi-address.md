# M052: Publish each plugin's XPI address

- **Status:** in-progress
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

- [ ] AC1: `schemas/plugins.v1.schema.json` defines `xpiUrl` in the
      `upstream` definition as an optional string (absent from `required`).
      A schema test shows a record with `xpiUrl` and one without it pass,
      and a record whose `xpiUrl` is a number fail on that property.
- [ ] AC2: `pnpm build` writes `upstream.xpiUrl` on each record with
      `upstream`, equal to the `xpiUrl` of that entry's start plan item,
      which is the `browser_download_url` of the first `.xpi` asset of the
      release whose manifest the reader read. A build test asserts this for
      every record with `upstream` in its fixture build, and that fixture
      covers the three reader paths: the newest stable release, a repo with
      only prereleases, and a stable release that is not a Zotero 7+ build
      followed by a newer prerelease that is. A record with `failure` has
      no `upstream` and so no `xpiUrl`.
- [ ] AC3: README "Using the data", DESIGN's data description, and
      CHANGELOG under Unreleased name `xpiUrl` and say which file it
      addresses. DESIGN's out-of-scope line says that a plain link to the
      author's own `.xpi` file is not an install button.
- [ ] AC4: The verify slot (`pnpm test`, `pnpm check`) passes.

## Coverage

- AC1 → T1
- AC2 → T2
- AC3 → T3
- AC4 → T1, T2, T3

## Tasks

- [x] T1: Add `xpiUrl` to the `upstream` definition in
      `schemas/plugins.v1.schema.json` and to `UpstreamFacts` (or the
      build's record type) as optional; add the schema test cases.
- [ ] T2: In `src/build/build.ts` (`readRecord`, around line 278, and the
      record assembly near line 191), copy `xpi.url` into
      `upstream.xpiUrl`; extend `test/build.test.ts` to compare every
      record with its start plan item, with fixtures for the three reader
      paths and a failure.
- [ ] T3: Update README "Using the data", DESIGN (Contract boundary and
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

## Decisions

## Review
