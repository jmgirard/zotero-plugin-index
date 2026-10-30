# zotero-changelogs — the newest release of each Zotero major

**Provenance.** Ingested 2026-10-30 by M062 from four zotero.org addresses:
https://www.zotero.org/support/7.0_changelog, https://www.zotero.org/support/8.0_changelog,
https://www.zotero.org/support/9.0_changelog, and
https://www.zotero.org/download/client/version?channel=release.
The agent downloaded them with curl to `cairn/references/sources/` (gitignored), as
`zotero-changelogs-7.0.html`, `zotero-changelogs-8.0.html`, `zotero-changelogs-9.0.html`, and
`zotero-changelogs-release-version.json`.
Pagination: none. Each changelog page lists its releases newest first under "Changes in" headings.
Extraction: verified 2026-10-30 against the downloaded files, values copied from the first "Changes in" heading of each page and from the JSON answer — observed 2026-10-30.

**Citation.** Zotero. "Zotero 7.0 Changelog", "Zotero 8.0 Changelog", "Zotero 9.0 Changelog".
Zotero Documentation. https://www.zotero.org/support/<N>.0_changelog.
Also Zotero's release version address, https://www.zotero.org/download/client/version?channel=release.

**Role.** Settles the last release of each earlier Zotero major, which `LAST_RELEASES` holds.
It also settles the shape of the release address's answer, which `readZoteroRelease` reads.
If a major gets another release, its changelog page and its value here change.

## Extracted values

- 7.0: "Changes in 7.0.32", the first heading of the 7.0 changelog page.
- 8.0: "Changes in 8.0.5", the first heading of the 8.0 changelog page.
- 9.0: "Changes in 9.0.6", the first heading of the 9.0 changelog page.
- Release address: a JSON object with the keys `mac`, `win-x64`, `win-arm64`, `win32`,
  `linux-x86_64`, `linux-i686`, and `linux-arm64`, each `"10.0.7"`.

## Traces to

- `src/site/version.ts` `LAST_RELEASES`: the three values above.
- `src/build/zotero-release.ts` `ZOTERO_RELEASE_URL` and `readZoteroRelease`: the address and its `linux-x86_64` key.
- `test/build.test.ts` `responses()`: the fixture answer for the release address.
- `test/site.test.ts` "the newest Zotero release": the About page list of 7.0.32, 8.0.5, and 9.0.6.

## Open questions

- None.
