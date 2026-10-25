# Roadmap

_The only authority on milestone status. Grouped by status, not ID._
_Last hygiene check: 2026-10-25 (M003 done and archived; 2 lessons captured, 4 marked used; 1 row added, 1 raised to high)_

## Milestones

| ID | Title | Status | Depends on | Priority | File/Archive |
|---|---|---|---|---|---|
| M003 | Build the published plugin data | done | M002 | high | milestones/archive/M003-published-data.md |
| M002 | Read upstream plugin facts and draft entries | done | M001 | high | milestones/archive/M002-upstream-reader.md |
| M001 | Define the plugin entry format and checker | done | — | high | milestones/archive/M001-entry-format.md |
<!-- rows grouped by status, not sorted by ID; keep only the 3 most recent
     terminal (done or dropped) rows — older ones live in milestones/archive/ + git -->

## Candidates
- [high] Limit what the reader downloads: the reader reads a release XPI and unzips its manifest with no size cap, and fetches an `update_url` on any host, loopback and private addresses included; cap both sizes and refuse such hosts before a scheduled bot runs the reader (M002 review); the M003 daily build now runs the reader over the listed entries, so this lands before the topic-search bot reads unlisted repos (M003 review) — added 2026-10-25 — M002, M003
- Publish the site and data on Pages: a static TypeScript site on GitHub Pages, one page per plugin answering "does it work on my Zotero?" first, with the M003 data file at a stable versioned URL, and the schemas' `$id` set to their published URLs (M001 review) — added 2026-10-24 — cairn/DESIGN.md Contract boundary, M003
- Find new plugins by GitHub topic search: a scheduled bot searches the `zotero-plugin` and `zotero-addon` topics and opens one pull request per new candidate, plus an issue form that takes one repo URL — added 2026-10-24 — cairn/DESIGN.md Data sources, M002
- Catch stray and unportable entry files: `pnpm check` skips a stray file under `plugins/` with exit 0, accepts directory names that break on Windows or collide by case, passes an override reason of only zero-width characters, passes two overrides for the same field and version, and reports a UTF-8 BOM as "not valid JSON" (M001 review); `pnpm add-plugin` also writes an id that differs only by case from an existing entry or is a reserved Windows name such as CON (M002 review) — added 2026-10-24 — M001, M002
- Collect works and broken user reports: "Works" and "Broken" links open a prefilled issue form, and a bot adds the report to the data and closes the issue — added 2026-10-24 — cairn/DESIGN.md Data sources
- Read stable releases before prereleases: the reader takes the manifest from the newest release with an `.xpi`, prereleases included, so wileyyugioh/zotmoov reads as prerelease 1.2.34 (observed 2026-10-25); prefer the newest stable release with an `.xpi` when one exists — added 2026-10-25 — M002
- Warn when the daily build degrades: `pnpm build` exits 0 when every read fails (a bad token, a GitHub outage) or when rate limits turn later reads into `github-http-error`, and a few hung hosts can push the job past its 30-minute limit so no artifact is kept; add a failure summary, a warning or non-zero exit on mass failure, and a time budget per plugin (M003 review) — added 2026-10-25 — M003
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
