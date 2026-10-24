# M002: Read upstream plugin facts and draft entries

- **Status:** planned
- **Priority:** high
- **Depends on:** M001
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — contributors draft entries with its command, and its facts feed the public data
- **Branch/PR:** —

## Goal

A reader takes a GitHub repo URL and returns the plugin's upstream facts or a named reason it fails the inclusion bar.

## Scope

**In:** a reader in `src/upstream/` that, for one GitHub repo, reads the repo metadata (fork flag, creation date,
open issue count), the releases (count, latest release date), the `manifest.json` inside the XPI asset of the
latest release (read with fflate; D-001), and the `update.json` at the manifest's `update_url`, and returns either
the facts or one named inclusion-bar failure; the `pnpm add-plugin <github-url>` command, which writes
`plugins/<id>/meta.json` and `plugins/<id>/index.json` from those facts; entries for at least five real plugins
drafted with it. GitHub calls use plain fetch and send `GITHUB_TOKEN` when it is set.

**Out:** the published data file and applying overrides → M003. Finding repos by topic search → the discovery-bot
candidate row. Repos outside GitHub → not in this scope; DESIGN.md says the index runs on GitHub.

## Acceptance criteria

- [ ] AC1: For a recorded-response fixture of a plugin that meets the bar, the reader returns the plugin id, name,
      version, `strict_min_version`, `strict_max_version`, `update.json` URL and host, latest release date,
      release count, repo creation date, and open issue count. A Vitest test asserts each value against the
      fixture. The tests make no network call: fetch is replaced by the fixture.
- [ ] AC2: The reader returns a named failure, and does not throw, for each of these causes, one Vitest test per
      cause asserting which failure it returns: the repo is a fork; the repo has no release; the latest release has
      no `.xpi` asset; the XPI holds no `manifest.json` with `applications.zotero.id`; the manifest's
      `strict_max_version` has a major version below 7; the `update.json` request returns an HTTP error; the
      `update.json` body is not valid JSON or has no entry for the manifest's id.
- [ ] AC3: Version strings that are not semver are returned as the upstream file gives them. A Vitest test with a
      fixture version of `v2.0-beta` asserts the returned string equals it.
- [ ] AC4: `pnpm add-plugin <url>` on a passing fixture writes a `meta.json` and an `index.json` that pass
      `pnpm check`, and on a failing fixture writes no file and prints the failure name. One Vitest test for each.
- [ ] AC5: `plugins/` holds at least five entries, each with a `meta.json` `repoUrl` on github.com, and
      `pnpm check` passes on the committed tree.
- [ ] AC6: `CHANGELOG.md` has an entry for `pnpm add-plugin`, the README names the command and its one argument,
      and `pnpm test` and `pnpm check` pass on the branch.

## Coverage

- AC1 → T1, T2
- AC2 → T1, T3
- AC3 → T2
- AC4 → T4
- AC5 → T5
- AC6 → T6

## Tasks

- [ ] T1: Record response fixtures under `test/fixtures/upstream/`: one passing plugin and one fixture per AC2
      cause; write the tests for AC1 to AC3 first.
- [ ] T2: Write the reader in `src/upstream/`: repo metadata, releases, XPI manifest, `update.json`. Read the
      manifest from the XPI because the source `manifest.json` in plugin-template repos holds placeholders such as
      `__addonID__`.
- [ ] T3: Add the inclusion-bar checks with one named failure per AC2 cause; one plugin's failure never throws
      past the reader.
- [ ] T4: Write `pnpm add-plugin` and its two tests; it fills `meta.json` from upstream facts only.
- [ ] T5: Run `pnpm add-plugin` on at least five real plugin repos with the `zotero-plugin` topic and commit the
      entries that pass the bar.
- [ ] T6: README and `CHANGELOG.md` entries.

## Work log

- 2026-10-24: created by /milestone-plan.
- 2026-10-24: tier check: not run — work named at the question set.
- 2026-10-24: idea vet: one concern, the source `manifest.json` in plugin repos holds template placeholders — decided by the agent: read the manifest from the release XPI (T2).
- 2026-10-24: lessons used: none.
- 2026-10-24: plan gate chose reading the manifest from the latest release XPI over reading it from the repo source because the plugin template's source manifest holds placeholders (observed in windingwind/zotero-plugin-template 2026-10-24); falsified by a sample of real repos whose release XPIs are unreadable more often than their source manifests are placeholder-free.
- 2026-10-24: question set: dependencies granted at the M001 plan include fflate for reading XPI files (D-001).

## Decisions

## Review
