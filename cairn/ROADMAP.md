# Roadmap

_The only authority on milestone status. Grouped by status, not ID._
_Last hygiene check: 2026-10-26 (M009 done and archived; 2 rows added, 1 row narrowed; 2 lessons captured, 8 marked used; M006 row pruned)_

## Milestones

| ID | Title | Status | Depends on | Priority | File/Archive |
|---|---|---|---|---|---|
| M008 | Find new plugin repos by topic search | done | — | high | milestones/archive/M008-topic-discovery.md |
| M009 | Open a pull request for each new plugin | done | M008 | high | milestones/archive/M009-discovery-pull-requests.md |
| M010 | Take one repo URL from an issue form | in-progress | M009 | normal | milestones/M010-add-plugin-issue-form.md |
| M007 | Build the plugin site | done | M006 | high | milestones/archive/M007-plugin-site.md |
<!-- rows grouped by status, not sorted by ID; keep only the 3 most recent
     terminal (done or dropped) rows — older ones live in milestones/archive/ + git -->

## Candidates
- Take one repo URL from an issue form: an issue form takes one repo URL, and the bot drafts its entry as a pull request; narrowed 2026-10-26, since M008 and M009 shipped the topic search and its pull requests — added 2026-10-24 — cairn/DESIGN.md Data sources, M002 — started M010
- Catch stray and unportable entry files: `pnpm check` skips a stray file under `plugins/` with exit 0, accepts directory names that break on Windows or collide by case, passes an override reason of only zero-width characters, passes two overrides for the same field and version, and reports a UTF-8 BOM as "not valid JSON" (M001 review); `pnpm add-plugin` also writes an id that differs only by case from an existing entry or is a reserved Windows name such as CON (M002 review); an entry id with `%` or a space fails the whole `pnpm site` build with NoMatchingStaticPathFound, which also stops the data deploy (M007 review); `pnpm discover` writes ids through the same `writeEntry` (M008 review) — added 2026-10-24 — M001, M002, M007, M008
- Collect works and broken user reports: "Works" and "Broken" links open a prefilled issue form, and a bot adds the report to the data and closes the issue — added 2026-10-24 — cairn/DESIGN.md Data sources
- Read stable releases before prereleases: the reader takes the manifest from the newest release with an `.xpi`, prereleases included, so wileyyugioh/zotmoov reads as prerelease 1.2.34 (observed 2026-10-25); prefer the newest stable release with an `.xpi` when one exists; `pnpm discover` drafts entries from the same read (M008 review) — added 2026-10-25 — M002, M008
- Warn when the daily build degrades: `pnpm build` prints no failure summary, still exits 0 and deploys when rate limits turn up to half of the reads into `github-http-error`, and a few hung hosts can push the job past its 30-minute limit so no artifact is kept; add a failure summary, a warning on partial failure, and a time budget per plugin (M003 review); narrowed 2026-10-25 by M006, which exits 1 when more than half of the records fail; `pnpm discover` has no time budget either (M008 review) — added 2026-10-25 — M003, M006, M008
- Count only build failures for deploys: M006's rule counts every record with a `failure` toward its more-than-half exit, steady states such as `fork`, `no-release`, and `facts-invalid` included, so an index where most entries sit in such states never deploys; count build-level names such as `request-failed`, `github-http-error`, and `unexpected-error` only; see "Warn when the daily build degrades" (M006 review) — added 2026-10-25 — M006
- Stop inflating past the declared size: fflate 0.8.3 `unzipSync` decodes a deflate stream in full and only drops output past the declared `originalSize`, so a `manifest.json` within the 1 MiB caps whose stream inflates to about 1 GB holds an unzip for about 4 s, about 8 s with a second one in `messages.json` (102 KB inflating to 100 MB took 414 ms); bound the inflate by output, for example with fflate's streaming `Inflate`, and fix the `unzipOne` comment's input-bound claim; the time budget in "Warn when the daily build degrades" would also bound it (M005 review); `pnpm discover` reads up to 100 repos a run that anyone can tag (M008 review) — added 2026-10-25 — M004, M005, M008
- Retry repos refused by a download error: `pnpm discover` keeps a refused repo's record for 30 days or until its next push, and that includes `update-json-http-error` and other failures that an HTTP 429 or 503 from a download host can cause, so one bad response hides a repo; treat download HTTP errors as not recorded, which changes the state rule M008 shipped (M008 review) — added 2026-10-25 — M008
- Stop retrying a failing bot pull request: `pnpm discover --propose` records no failure of its push or create request, so a repo whose branch name git refuses (a part that starts with `.` or ends in `.lock`, such as `discover/owner/.zotero-tool`) or whose body passes GitHub's size limit fails again each run, takes one of its slots, and fails the workflow daily; check the name with `git check-ref-format` before the read, or record such failures under the 30-day rule (M009 review) — added 2026-10-26 — M009
- Bound the time of a discover run: `discover.yml` stops at 30 minutes, and `pnpm discover` writes its state only at the end, so a run the limit kills saves the old state again and the next run reads the same first repos; its `git` and `pnpm check` spawns have no timeout; add a time budget that ends the reads early and writes the state; see "Warn when the daily build degrades" (M009 review) — added 2026-10-26 — M008, M009
- Keep issues open on a bot read failure: `pnpm discover-issue` closes the issue as not planned on any failed read, `github-http-error` and `request-failed` included, which a rate limit or a GitHub outage can cause; leave such an issue open with its comment, as for a failed push (M010) — added 2026-10-26 — M010
- Answer issues whose run was canceled: `add-plugin-issue.yml` shares the `discover` concurrency group, and GitHub's docs say a new pending run in a group cancels the one already pending, so an issue opened while another run waits can get no comment; rerun such issues, for example from a scheduled sweep of unanswered `add-plugin` issues (M010) — added 2026-10-26 — M010
- [low] Block more IPv6 ranges in the host check: the M004 host check lets through ::ffff:0:0:0/96 (SIIT), 64:ff9b:1::/48 (local NAT64), 100::/64, 2001::/23 (Teredo included), fec0::/10, 3fff::/20, 5f00::/16, and 192.88.99.0/24; the translated ones reach a private address only on a NAT64 or SIIT network (M004 review) — added 2026-10-25 — M004
- [parked] Check addresses when the reader connects: M004 checks the reader's own DNS answer before each download, and DNS can answer differently when fetch connects (rebinding); check the address at connect time, which needs the undici package and a decision entry; promote on evidence that the build publishes response bodies or that a rebinding answer reaches a service on the runner — added 2026-10-25 — M004
- [parked] Test plugins load in headless Zotero: a CI job installs each listed plugin into a headless Zotero and records whether it loads, shown as its own source beside declared ranges and reports; promote when the data pipeline and user reports ship — added 2026-10-24 — cairn/DESIGN.md Data sources
- [parked] Keep the v1 data when v2 ships: each Pages deploy replaces the whole site, so a build that moves to `plugins.v2` must keep writing `v1/plugins.json` and its schema for the transition period DESIGN.md promises; promote when a v2 schema is planned (M006 review) — added 2026-10-25 — M006, cairn/DESIGN.md Contract boundary
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
