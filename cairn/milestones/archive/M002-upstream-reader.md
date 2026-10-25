# M002: Read upstream plugin facts and draft entries

**Status:** done (2026-10-25, PR #2 https://github.com/jmgirard/zotero-plugin-index/pull/2)

**Goal:** A reader takes a GitHub repo URL and returns the plugin's upstream facts or a named reason it fails the inclusion bar.

**Outcome:** `readUpstream(repoUrl, fetch)` (`src/upstream/reader.ts`) reads the repo metadata, all release pages
(Link header, api.github.com only, no repeat page), the `manifest.json` in the newest non-draft release with an
`.xpi` (prereleases included; unzipped with fflate 0.8.3), and the `update.json` the manifest names. It returns
facts (id, name, description, homepage, version, strict min/max, update URL and host, repo URL, creation date,
open issues, count of releases with an `.xpi`, latest release date) or one named `Failure`, such as `private`,
`fork`, `no-xpi-release`, `max-version-below-7`, or `update-json-missing-id`. `__MSG_` names resolve from the
default locale's `messages.json`. `GITHUB_TOKEN` goes only to API requests. `pnpm add-plugin <url> [--out <dir>]`
(`src/add-plugin/`) writes `meta.json` and `index.json`; it refuses an existing entry, an id outside
`[A-Za-z0-9_@{}+.-]{1,200}` or with a leading dot, and removes a half-written entry (`write-failed`). Tests use a
recording of windingwind/zotero-better-notes (CLI tests preload it via NODE_OPTIONS). 14 entries; README, CHANGELOG.

**Decisions:** none milestone-local; fflate used under D-001.

**Review:** Full four-lens fan-out, one pass, 28 findings: 21 fixed on the branch (reader input hardening,
private-repo failure, off-host and looping pages, id allowlist, write cleanup, test gaps, stale DESIGN.md text),
3 rejected (2 edge: commented manifests, odd `--out` spellings; 1 planned design text), 1 to the new row "Limit
what the reader downloads", 2 split with "Catch stray and unportable entry files". New row "Read stable releases
before prereleases" (zotmoov reads as prerelease 1.2.34). Claim audit read 95 claims, corrected 5. PR #2 CI
passed on both runs. Lessons: 2 marked used M002, 3 captured.
