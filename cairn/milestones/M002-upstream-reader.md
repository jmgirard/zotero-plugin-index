# M002: Read upstream plugin facts and draft entries

- **Status:** review
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

- [x] AC1: The reader takes its fetch function as a parameter. For a recorded-response fixture of a plugin that
      meets the bar, it returns the plugin id, name, version, `strict_min_version`, `strict_max_version`,
      `update.json` URL and host, latest release date, release count, repo creation date, and open issue count. A
      Vitest test asserts each value against the fixture, and a second asserts that with `GITHUB_TOKEN` set each
      GitHub API request carries an `Authorization` header.
- [x] AC2: The reader returns a named failure, and does not throw, for each of these causes, one Vitest test per
      cause asserting which failure it returns: a GitHub API request returns an HTTP error (probes 404 and 403);
      the repo is a fork; the repo has no release; no release has a `.xpi` asset; the XPI holds no
      `manifest.json`; the manifest has no `applications.zotero.id`; the manifest's `strict_max_version` has a
      major version below 7 (probes `6.*` and `6.999`); the `update.json` request returns an HTTP error; the
      `update.json` body is not valid JSON; it has no entry for the manifest's id. A further test asserts that
      `strict_max_version` values `7.0` and `*`, and an absent one, pass.
- [x] AC3: The reader returns the manifest `version` unchanged. A Vitest test with a fixture version of
      `v2.0-beta` asserts the returned string equals it.
- [x] AC4: `pnpm add-plugin <url> [--out <dir>]` writes to `<dir>`, `plugins/` by default. On a passing fixture
      it writes a `meta.json` and an `index.json` that pass `pnpm check`, and on a failing fixture it writes no
      file and prints the failure name. One Vitest test for each, writing to a temporary directory.
- [x] AC5: `plugins/` holds at least five entries, each with a `meta.json` `repoUrl` on github.com, and
      `pnpm check` passes on the committed tree.
- [x] AC6: `CHANGELOG.md` has an entry for `pnpm add-plugin`, the README names the command and its one argument,
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
- [x] T5: Run `pnpm add-plugin` on at least five real plugin repos with the `zotero-plugin` topic and commit the
      entries that pass the bar.
- [x] T6: README and `CHANGELOG.md` entries.

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
- 2026-10-25: T5: ran `pnpm add-plugin` on 15 top `zotero-plugin` repos by stars; 14 passed and are committed, argenos/zotero-mdnotes failed `no-manifest` (a Zotero 6 plugin). `pnpm check`: 14 entries, 0 problems.
- 2026-10-25: T5: syt2/zotero-addons drafted with name `__MSG_name__`; decided the reader resolves `__MSG_<key>__` in name and description from the XPI's `_locales/<default_locale>/messages.json` and leaves out a placeholder it cannot resolve; 2 tests; entry redrafted.
- 2026-10-25: T6: README gains "Setup" (install moved out of "Checking entries") and "Adding a plugin"; CHANGELOG gains the `pnpm add-plugin` entry and the 14 entries; DESIGN.md Function Families and Architecture name `src/upstream/` and `src/add-plugin/`. Candidate row "Read stable releases before prereleases" added: 1 of the 14 (zotmoov) has a prerelease as its newest XPI release.
- 2026-10-25: claim audit: 95 claims read, 5 corrected — README.md, test/fixtures/upstream/better-notes.json, src/add-plugin/add-plugin.ts, src/upstream/reader.ts; the re-read found all 5 true. Also added a guard so a release whose `assets` is not a list counts as having no `.xpi` instead of throwing.
- 2026-10-25: all tasks done; `pnpm test` 60 passed, `pnpm check` 14 entries, 0 problems; status review.
- 2026-10-25: review: the AC6 tick landed before its evidence line because the evidence edit missed its anchor; the evidence line was added in the same step and every tick now has its line.
- 2026-10-25: step-7 approval: m002-upstream-reader approved for merge

## Decisions

## Review

Evidence at 5c5e4b9, 2026-10-25. `pnpm test`: tsc clean, 60 passed (4 files); `pnpm check`: 14 entries, 0 problems.

- AC1: `readUpstream(repoUrl, fetch)` takes fetch as its second parameter (src/upstream/reader.ts). "returns the facts of a plugin that meets the bar" passed, asserting id, name, version, strictMinVersion, strictMaxVersion, updateUrl, updateHost, latestReleaseDate, releaseCount, repoCreatedAt, openIssues as literals; "sends GITHUB_TOKEN with each GitHub API request and with no other request" passed (3 API requests carry `Bearer test-token`, the XPI and update.json requests carry none).
- AC2: one passing test per cause, each asserting `{ok: false, failure}` from a resolved promise: repo 404 and releases 403 → github-http-error; fork → fork; no release → no-release; no `.xpi` → no-xpi-release; no manifest.json → no-manifest; no applications.zotero.id → no-zotero-id; `6.*` and `6.999` → max-version-below-7; update.json 404 → update-json-http-error; body `<html>` → update-json-invalid; no entry for the id → update-json-missing-id. "passes a strict_max_version of" `"7.0"`, `"*"`, and undefined passed.
- AC3: "returns the manifest version unchanged" passed with fixture version `v2.0-beta`, asserting the returned string equals it.
- AC4: "writes an entry that passes pnpm check, under a --out relative to where pnpm runs" passed (temp dir; `pnpm check` on it: 1 entry, exit 0); "writes no file and prints the failure name when the repo fails the bar" passed (fork fixture; stderr starts `fork: `, out dir absent). Default dir: `pnpm add-plugin` on the fixture with no `--out` printed `entry-exists: plugins/Knowledge4Zotero@windingwind.com already exists`, so it targets `plugins/`; tree left clean.
- AC5: `plugins/` holds 14 entries; a node read of each `meta.json` found every `repoUrl` host is `github.com`; `pnpm check`: 14 entries, 0 problems.
- AC6: CHANGELOG.md:10 has the `pnpm add-plugin <github-url>` entry under Unreleased; README.md:49 shows `pnpm add-plugin https://github.com/<owner>/<repo>` under "Adding a plugin"; `pnpm test` 60 passed and `pnpm check` 0 problems on the branch.
- Gate: `cairn_validate.py` all checks passed (exit 0); no DESIGN.md principle changed, so no `cairn_impact` run; the generic profile's consistency-gate slot names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: a non-string or non-numeric `strict_max_version` (6, "abc") passed the bar — fix now (manifest-invalid; 2 tests), fixed b5920a2
- diff-bug #2: pagination followed a `rel="next"` on any host and sent the token there — fix now (next page must be on api.github.com; test), fixed b5920a2
- diff-bug #3: a Link header pointing back to a read page looped forever — fix now (seen-page set; test), fixed b5920a2
- diff-bug #4: a null repo body or a null release threw past `readUpstream` — fix now (request-failed for a non-object repo body, non-object releases skipped; 2 tests), fixed b5920a2
- diff-bug #5: the id check blocked a few characters; NUL, newline, and 300-character ids reached mkdir — fix now (allowlist `[A-Za-z0-9_@{}+.-]`, at most 200 characters), fixed b5920a2
- diff-bug #6: no draft fixture and newest-first order, so removing the draft filter or the date sort kept tests green — fix now (one test with a newer draft and an older release first; both plants turn it red), fixed b5920a2
- diff-bug #7: untested branches (assets not a list, unreadable messages.json, off-host and loop pages) — fix now (tests for each); a Link header with rel="next" second is the same regex path, no test, fixed b5920a2
- diff-bug #8: the "public repository" part of the bar was not checked — fix now (named failure `private`; test), fixed b5920a2
- diff-bug #9: a body read cut off was named "not JSON" or update-json-invalid — fix now (body read mapped to request-failed; `bodyError` fixture option; test), fixed b5920a2
- diff-bug #10: a manifest with `//` comment lines fails as manifest-invalid — reject (edge: plugin-template builds emit plain JSON; a commented manifest is outside common use and gets a named failure, not a wrong result)
- diff-bug #11: `--out --help`, `--out=dir`, and running cli.ts with node and a stale INIT_CWD — reject (edge: the documented use is `pnpm add-plugin <url> --out <dir>`; each gives a usage message or a wrong directory name only outside it)
- diff-bug #12: a failed write after mkdir left a half entry that blocked reruns — fix now (remove the directory, return `write-failed`; 2 tests), fixed b5920a2
- diff-bug #13: no size cap on the XPI or unzipped manifest, and `update_url` may name loopback or private hosts — follow-up, new row "Limit what the reader downloads"
- diff-bug (c): two unsafe-id rows ran the same path and two usage rows ran the same branch — fix now (dropped `a\\b` and the two-URL usage row), fixed b5920a2; the usage text, `checked 1 entries`, the not-a-zip row, the no-token control, and the `6.*`/`6.999` pair — reject (false: each asserts which failure or is a control the AC requires)
- prior-review #1: two 50 s pnpm spawns in one test exceed the 60 s test timeout — fix now (that test's timeout 120 s), fixed b5920a2
- prior-review #2: untested branches (body not JSON, releases not a list, manifest not an object, unreadable messages.json) — fix now (a test each), fixed b5920a2
- prior-review #3: raw crash and half-written entry on a write error — fix now (same as diff-bug #12), fixed b5920a2
- prior-review #4: unportable ids reach disk — fix now for characters (diff-bug #5); case collisions and reserved names — follow-up, absorbed into "Catch stray and unportable entry files"
- prior-review #5: the `readUpstream` comment named a batch run that does not exist yet — fix now (reworded to "a caller that reads many plugins"), fixed b5920a2
- blame-history #1: Windows-invalid characters, reserved names, case collisions in ids — same disposition as prior-review #4
- blame-history #2: DESIGN.md said the bot reads "the latest release" — fix now (Data sources item 2 corrected M002), fixed b5920a2
- blame-history #3: half-written entry directory — fix now (same as diff-bug #12), fixed b5920a2
- ripple #1: DESIGN.md Data sources item 2 — fix now (same as blame-history #2), fixed b5920a2
- ripple #2: DESIGN.md inclusion bar said the maintainer removes forks; the reader refuses them — fix now (corrected M002), fixed b5920a2
- ripple #3: the vitest.config.ts timeout comment named only the check tests — fix now, fixed b5920a2
- ripple #4: the LESSONS line on `npm_execpath` named only the check tests — fix now (lesson corrected in place), fixed b5920a2
- ripple #5: DESIGN.md says a bot drafts entries from an issue form — reject (planned change: that sentence states the planned discovery design, which the candidate row "Find new plugins by GitHub topic search" carries; the CLI does not contradict it)
- ripple #6: DESIGN.md Known issues on rate limits omits the token — fix now (one sentence added), fixed b5920a2
- After fixes: `pnpm test` 73 passed, `pnpm check` 14 entries 0 problems, `cairn_validate.py` all passed. Planted defects (no draft filter, no sort, no host check, no seen set, no version-type check, no private check, no cleanup) each turned a test red or kept the run from finishing.
