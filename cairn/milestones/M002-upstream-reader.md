# M002: Read upstream plugin facts and draft entries

- **Status:** in-progress
- **Priority:** high
- **Depends on:** M001
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — contributors draft entries with its command, and its facts feed the public data
- **Branch/PR:** m002-upstream-reader

## Goal

A reader takes a GitHub repo URL and returns the plugin's upstream facts or a named reason it fails the inclusion bar.

## Scope

**In:** a reader in `src/upstream/` that, for one GitHub repo, reads the repo metadata (fork flag, creation date,
open issue count), the releases (count, latest release date), the `manifest.json` inside the XPI asset of the
newest release that has one (read with fflate; D-001), and the `update.json` at the manifest's `update_url`, and returns either
the facts or one named inclusion-bar failure; the `pnpm add-plugin <github-url>` command, which writes
`plugins/<id>/meta.json` and `plugins/<id>/index.json` from those facts; entries for at least five real plugins
drafted with it. GitHub calls use plain fetch and send `GITHUB_TOKEN` when it is set.

**Out:** the published data file and applying overrides → M003. Finding repos by topic search → the discovery-bot
candidate row. Repos outside GitHub → not in this scope; DESIGN.md says the index runs on GitHub.

## Acceptance criteria

- [ ] AC1: The reader takes its fetch function as a parameter. For a recorded-response fixture of a plugin that
      meets the bar, it returns the plugin id, name, version, `strict_min_version`, `strict_max_version`,
      `update.json` URL and host, latest release date, release count, repo creation date, and open issue count. A
      Vitest test asserts each value against the fixture, and a second asserts that with `GITHUB_TOKEN` set each
      GitHub API request carries an `Authorization` header.
- [ ] AC2: The reader returns a named failure, and does not throw, for each of these causes, one Vitest test per
      cause asserting which failure it returns: a GitHub API request returns an HTTP error (probes 404 and 403);
      the repo is a fork; the repo has no release; no release has a `.xpi` asset; the XPI holds no
      `manifest.json`; the manifest has no `applications.zotero.id`; the manifest's `strict_max_version` has a
      major version below 7 (probes `6.*` and `6.999`); the `update.json` request returns an HTTP error; the
      `update.json` body is not valid JSON; it has no entry for the manifest's id. A further test asserts that
      `strict_max_version` values `7.0` and `*`, and an absent one, pass.
- [ ] AC3: The reader returns the manifest `version` unchanged. A Vitest test with a fixture version of
      `v2.0-beta` asserts the returned string equals it.
- [ ] AC4: `pnpm add-plugin <url> [--out <dir>]` writes to `<dir>`, `plugins/` by default. On a passing fixture
      it writes a `meta.json` and an `index.json` that pass `pnpm check`, and on a failing fixture it writes no
      file and prints the failure name. One Vitest test for each, writing to a temporary directory.
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

- [x] T1: Record a passing plugin's responses under `test/fixtures/upstream/`, and derive one fixture per AC2 cause
      by editing that recording in the test; write the tests for AC1 to AC3 first.
- [x] T2: Write the reader in `src/upstream/`: repo metadata, releases, XPI manifest, `update.json`. Read the
      manifest from the newest release that has an `.xpi` asset, because the source `manifest.json` in plugin-template repos holds placeholders such as
      `__addonID__`.
- [x] T3: Add the inclusion-bar checks with one named failure per AC2 cause; one plugin's failure never throws
      past the reader.
- [x] T4: Write `pnpm add-plugin` and its two tests; it fills `meta.json` from upstream facts only.
- [ ] T5: Run `pnpm add-plugin` on at least five real plugin repos with the `zotero-plugin` topic and commit the
      entries that pass the bar.
- [ ] T6: README and `CHANGELOG.md` entries.

## Work log

- 2026-10-24: created by /milestone-plan.
- 2026-10-24: tier check: not run — work named at the question set.
- 2026-10-24: idea vet: one concern, the source `manifest.json` in plugin repos holds template placeholders — decided by the agent: read the manifest from the release XPI (T2).
- 2026-10-24: lessons used: none.
- 2026-10-24: plan gate chose reading the manifest from the latest release XPI over reading it from the repo source because the plugin template's source manifest holds placeholders (observed in windingwind/zotero-plugin-template 2026-10-24); falsified by a sample of real repos whose release XPIs are unreadable more often than their source manifests are placeholder-free.
- 2026-10-24: criteria audit (full mode, fresh Opus reader): 7 findings, all fixed — AC1 states an injected fetch in place of a no-network claim about the tests (instrument) and adds the `GITHUB_TOKEN` header test; AC2 splits two bundled causes, adds a GitHub API HTTP-error cause, names the `strict_max_version` probes and the passing values, and reads the newest release with an `.xpi` to match the DESIGN.md bar; AC3 narrows to the manifest `version`; AC4 adds `--out <dir>`.
- 2026-10-24: question set: dependencies granted at the M001 plan include fflate for reading XPI files (D-001).
- 2026-10-25: started; branch m002-upstream-reader cut from main at 240c651.
- 2026-10-25: dependency: fflate 0.8.3 added (exact pin), granted by D-001 at the M001 plan.
- 2026-10-25: minor amendment: T1 reworded — the per-cause fixtures are edits of one recording (windingwind/zotero-better-notes) made in the test, not separate files.
- 2026-10-25: T1: fixture `test/fixtures/upstream/better-notes.json` with a `source` field; `test/support/fixture-fetch.ts` answers by URL and builds the XPI with fflate; 27 reader tests in `test/upstream.test.ts`.
- 2026-10-25: T2: decided `readUpstream(repoUrl, fetch)` returns `{ok, facts}` or `{ok: false, failure, message}`; the newest non-draft release with an `.xpi` (prereleases included, as Scope says) gives the manifest and `latestReleaseDate`; `releaseCount` counts non-draft releases with an `.xpi`; release pages follow the Link header.
- 2026-10-25: T2: decided `GITHUB_TOKEN` goes only to api.github.com requests, never to the XPI or update.json hosts; the token test asserts both sides.
- 2026-10-25: T3: one named failure per AC2 cause, plus five the code needed: not-github-repo, request-failed, xpi-unreadable, manifest-invalid (not JSON, no version), no-update-url (absent, not http); each has a test. Errors that are bugs in the reader still throw. Planted defects (no fork check, max below 8, token on every request) turned 4 tests red.
- 2026-10-25: T4: `src/add-plugin/` writes `meta.json` (id, name, description, homepage, repoUrl, updateUrl, all from the manifest and repo) and `index.json` (`schemaVersion: 1`); decided it refuses an existing entry (entry-exists) and an id with a slash, backslash, or leading dot (unsafe-id); failures print `<name>: <message>` to stderr, exit 1. The CLI tests load `test/support/preload-fixture.ts` through NODE_OPTIONS and run pnpm with `--dir`; 9 tests.

## Decisions

## Review
