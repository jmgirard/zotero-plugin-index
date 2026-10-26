# M013: Show whether a plugin repo is archived

- **Status:** planned
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the published v1 data, the plugin pages, and the home list change.
- **Branch/PR:** —

## Goal

Each plugin's published record, plugin page, and home-list row state whether GitHub marks its repo archived.

## Scope

**In:** The reader copies GitHub's `archived` boolean into its facts. Schema v1 gains `archived` as an optional
boolean in the `upstream` block (D-006). The plugin page shows an "Archived on GitHub" fact. The home list marks an
archived plugin. README.md, cairn/DESIGN.md, and CHANGELOG.md say that archived repos pass the inclusion bar and that
the index shows the archived state.

**Out:** Refusing archived repos at the inclusion bar. D-006 rejects it. A schema v2 is out too: D-006 keeps v1, and
the parked row "Keep the v1 data when v2 ships" holds v2. The bot pull request body does not change, because the repo
link it carries shows GitHub's archived banner. Merging PR #13 is the user's act and needs no change here.

## Acceptance criteria

- [ ] AC1: `readUpstream` copies GitHub's `archived` value into its facts only when it is `true` or `false`. For a
      recorded repo response with `"archived": true`, it returns `ok: true` and `facts.archived` is `true`. With
      `"archived": false`, `facts.archived` is `false`. With no `archived` key, with `null`, or with the string
      `"true"`, it returns `ok: true` and `facts.archived` is `undefined`. `test/upstream.test.ts` runs these five
      cases against recorded responses.
- [ ] AC2: `schemas/plugins.v1.schema.json` admits an optional boolean `archived` in the `upstream` block, as D-006
      allows, and its `schemaVersion` const stays 1. `test/build.test.ts` shows that `pnpm build` writes
      `archived: true` into the record of a plugin whose repo response has `"archived": true`. It also shows that
      `checkOutput` reports a record whose `archived` is the string `"true"`.
- [ ] AC3: A plugin page whose record's upstream block has `archived: true` has a `<dt>` "Archived on GitHub"
      followed by `<dd data-fact="archived">` whose text is "Yes". With `archived: false` the text is "No". A page
      whose record's upstream block has no `archived` value has no `data-fact="archived"` element.
      `test/site.test.ts` checks the three cases against the site fixture.
- [ ] AC4: On the home page, each plugin whose record has `archived: true` shows "(archived)" in a `data-archived`
      element after its name link, in the same table cell. No other record has a `data-archived` element.
      `test/site.test.ts` checks every record of the site fixture. The fixture holds records with `archived: true`,
      `archived: false`, no `archived` value, and a failure.
- [ ] AC5: The reviewer reads each line that `grep -n -i archived README.md cairn/DESIGN.md CHANGELOG.md` returns and
      finds three statements. (a) README.md and the inclusion bar in DESIGN.md's Data sources section admit archived
      repos. (b) README.md and DESIGN.md's Contract boundary fact list say that the v1 data, the plugin page, and the
      home list show the archived state. (c) CHANGELOG.md's Unreleased section has an entry for the change.
- [ ] AC6: After the merge, one `build.yml` run dispatched on the default branch deploys the site. The deployed
      `v1/plugins.json` has at least one record with a boolean `archived`. The deployed page of that plugin has a
      `data-fact="archived"` element. The deployed `schemas/plugins.v1.schema.json` defines `archived` in its
      `upstream` block.
- [ ] AC7: The `verify` slot is clean: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1
- AC2 → T2
- AC3 → T3
- AC4 → T3
- AC5 → T4
- AC6 → T6
- AC7 → T5

## Tasks

- [ ] T1: Tests first in `test/upstream.test.ts` for the five cases of AC1, with the recorded responses changed per
      case. Then add `archived?: boolean` to `UpstreamFacts` and `RepoJson`, and set it in `read`
      (`src/upstream/reader.ts:129-144`) only when `meta.archived` is a boolean.
- [ ] T2: Add the optional boolean `archived` to the `upstream` definition of `schemas/plugins.v1.schema.json`
      (lines 81-96). Give one repo in `test/fixtures/build/responses.json` `"archived": true`. Add the build test
      and the `checkOutput` test of AC2 to `test/build.test.ts`.
- [ ] T3: Add the "Archived on GitHub" `<dt>` and `<dd data-fact="archived">` to
      `site/src/pages/plugins/[id]/index.astro` (facts list, lines 49-65), shown only when `upstream.archived` is a
      boolean. Add the `data-archived` marker after the name link in `site/src/pages/index.astro:22`. Give
      `test/fixtures/site/plugins.json` records of the four kinds, and add the AC3 and AC4 tests to
      `test/site.test.ts`.
- [ ] T4: Edit README.md's inclusion bar and fact list. Edit DESIGN.md's Contract boundary fact list (lines 29-31),
      its Data sources inclusion bar (lines 78-80), and its upstream reader and site architecture lines. Add a
      CHANGELOG.md Unreleased entry.
- [ ] T5: Run `pnpm test` and `pnpm check` through `npx -y pnpm@12.15.0`.
- [ ] T6: After the merge, dispatch `build.yml` on the default branch once. Read the deployed data, one archived-fact
      page, and the deployed schema.

## Work log

- 2026-10-26: created by /milestone-plan.
- 2026-10-26: tier check: milestone — a design decision on the inclusion bar and a change to the public data.
- 2026-10-26: idea vet: three concerns, each answered at the set. Refusing archived repos is a quality judgment the design rules out: the user chose list and mark. The added field changes schema v1 in place, which a consumer that validates against an old copy rejects: the user chose an optional v1 field (D-006). A non-boolean `archived` would turn a plugin into a `facts-invalid` failure: the reader copies only `true` or `false` (AC1).
- 2026-10-26: lessons used: 2026-10-25 (M001) run pnpm through npx; 2026-10-25 (M007) match the attribute form in page tests; 2026-10-25 (M006) Pages deploys from main only.
- 2026-10-26: question set: live check — the user allowed one `build.yml` dispatch on main after the merge.
- 2026-10-26: question set: the user asked for the case for listing archived plugins, then chose list and mark, the plugin page and home list, and an optional v1 field.
- 2026-10-26: criteria audit (full mode): 7 findings, all taken toward the narrower promise. AC1 asserts `undefined` and adds `null` and `"true"` cases. AC2 cites D-006 and probes a string. AC3 names the `<dt>`/`<dd>` pair. AC5 reads each grep line for three statements and names the home list. AC6 checks one record, its deployed page, and the schema instead of every record. T4 names the DESIGN.md lines.
- 2026-10-26: plan gate chose list and mark over refusing archived repos (like forks, or new ones only) because the index states facts and a user with the plugin installed needs its declared range; falsified by reports that users installed an archived plugin from the index expecting support.
- 2026-10-26: plan gate chose an optional field in schema v1 over a v2 schema because readers that ignore unknown fields keep working; falsified by a consumer report of a validation failure on the new field.
- 2026-10-26: collision check: no D-entry, archive summary, or candidate row covers archived repos. M002 set the fork refusal, which this keeps. About 9 of the roughly 510 topic-search repos are archived, and none of the listed plugins (observed 2026-10-26).
- 2026-10-26: inbox sweep: issue #12 overlaps, since its PR #13 proposes an archived repo. It closes when the user merges PR #13, so it takes no Resolves slot. Bot PR #15 does not overlap and takes no disposition here.

## Decisions

## Review
