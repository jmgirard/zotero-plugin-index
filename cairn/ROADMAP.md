# Roadmap

_The only authority on milestone status. Grouped by status, not ID._
_Last hygiene check: 2026-10-25 (M004 done and archived; 1 row graduated, 2 rows added, 1 parked row added at plan; 3 lessons captured, 2 marked used; M001 row pruned)_

## Milestones

| ID | Title | Status | Depends on | Priority | File/Archive |
|---|---|---|---|---|---|
| M005 | Refuse zips that claim too many entries | review | — | high | milestones/M005-zip-entry-limits.md |
| M004 | Limit what the reader downloads | done | — | high | milestones/archive/M004-download-limits.md |
| M003 | Build the published plugin data | done | M002 | high | milestones/archive/M003-published-data.md |
| M002 | Read upstream plugin facts and draft entries | done | M001 | high | milestones/archive/M002-upstream-reader.md |
<!-- rows grouped by status, not sorted by ID; keep only the 3 most recent
     terminal (done or dropped) rows — older ones live in milestones/archive/ + git -->

## Candidates
- [high] Refuse zips that claim too many entries: fflate's `unzipSync` loops over the entry count that the zip's end record or zip64 end record gives, up to 2^32−1, reading past the buffer and calling the filter each time, so a 98-byte XPI can hold the build's CPU for minutes and no timeout fires; read the count first and refuse it as `xpi-unreadable` when count × 46 exceeds the zip's length (M004 review; fflate did this before M004) — added 2026-10-25 — M004 — started M005
- Publish the site and data on Pages: a static TypeScript site on GitHub Pages, one page per plugin answering "does it work on my Zotero?" first, with the M003 data file at a stable versioned URL, and the schemas' `$id` set to their published URLs (M001 review) — added 2026-10-24 — cairn/DESIGN.md Contract boundary, M003
- Find new plugins by GitHub topic search: a scheduled bot searches the `zotero-plugin` and `zotero-addon` topics and opens one pull request per new candidate, plus an issue form that takes one repo URL — added 2026-10-24 — cairn/DESIGN.md Data sources, M002
- Catch stray and unportable entry files: `pnpm check` skips a stray file under `plugins/` with exit 0, accepts directory names that break on Windows or collide by case, passes an override reason of only zero-width characters, passes two overrides for the same field and version, and reports a UTF-8 BOM as "not valid JSON" (M001 review); `pnpm add-plugin` also writes an id that differs only by case from an existing entry or is a reserved Windows name such as CON (M002 review) — added 2026-10-24 — M001, M002
- Collect works and broken user reports: "Works" and "Broken" links open a prefilled issue form, and a bot adds the report to the data and closes the issue — added 2026-10-24 — cairn/DESIGN.md Data sources
- Read stable releases before prereleases: the reader takes the manifest from the newest release with an `.xpi`, prereleases included, so wileyyugioh/zotmoov reads as prerelease 1.2.34 (observed 2026-10-25); prefer the newest stable release with an `.xpi` when one exists — added 2026-10-25 — M002
- Warn when the daily build degrades: `pnpm build` exits 0 when every read fails (a bad token, a GitHub outage) or when rate limits turn later reads into `github-http-error`, and a few hung hosts can push the job past its 30-minute limit so no artifact is kept; add a failure summary, a warning or non-zero exit on mass failure, and a time budget per plugin (M003 review) — added 2026-10-25 — M003
- Stop inflating past the declared size: fflate 0.8.3 `unzipSync` decodes a deflate stream in full and only drops output past the declared `originalSize`, so a `manifest.json` within the 1 MiB caps whose stream inflates to about 1 GB holds an unzip for about 4 s, about 8 s with a second one in `messages.json` (102 KB inflating to 100 MB took 414 ms); bound the inflate by output, for example with fflate's streaming `Inflate`, and fix the `unzipOne` comment's input-bound claim; the time budget in "Warn when the daily build degrades" would also bound it (M005 review) — added 2026-10-25 — M004, M005
- [low] Block more IPv6 ranges in the host check: the M004 host check lets through ::ffff:0:0:0/96 (SIIT), 64:ff9b:1::/48 (local NAT64), 100::/64, 2001::/23 (Teredo included), fec0::/10, 3fff::/20, 5f00::/16, and 192.88.99.0/24; the translated ones reach a private address only on a NAT64 or SIIT network (M004 review) — added 2026-10-25 — M004
- [parked] Check addresses when the reader connects: M004 checks the reader's own DNS answer before each download, and DNS can answer differently when fetch connects (rebinding); check the address at connect time, which needs the undici package and a decision entry; promote on evidence that the build publishes response bodies or that a rebinding answer reaches a service on the runner — added 2026-10-25 — M004
- [parked] Test plugins load in headless Zotero: a CI job installs each listed plugin into a headless Zotero and records whether it loads, shown as its own source beside declared ranges and reports; promote when the data pipeline and user reports ship — added 2026-10-24 — cairn/DESIGN.md Data sources
<!-- unnumbered ideas; one line each, ordered high → normal → low → parked:
     - [high] short title: detail — added YYYY-MM-DD — links
     - short title: detail — added YYYY-MM-DD — links
     - [parked] short title: detail; promote when <condition> — added YYYY-MM-DD — links
     the opening token is `[high]`/`[low]`/`[parked]` or absent (`normal`); `[parked]` marks a row whose
     promotion condition has not held — tracking-rules "Candidate priority token";
     open each row with its short title, the words the cairn pane shows, then `: `;
     the title is one sentence with no ending period, at least 5 words and at most 40 characters,
     ending with `(#N)` for a row written for GitHub issue N, such as
     `Fix SE of skewness calculation (#100)`; `/cairn-triage` offers a new title for one
     with fewer than 5 words or more than 40 characters; tracking-rules "Candidate short title" has the whole rule -->
