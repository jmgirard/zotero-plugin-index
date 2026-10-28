<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M045: Count more GitHub answers as build-level

- **Status:** in-progress   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** normal   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** —   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** —   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** user-facing — it changes when the public site deploys and how an "Add a plugin" issue is answered   <!-- owner: plan · create/amend-via-gate; user-facing | internal — <one-clause reason>; skill conduct only — no validate check parses it -->
- **Branch/PR:** m045-more-build-level-answers   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

## Goal
<!-- owner: plan · create; a wrong goal returns to plan, never edited in place -->

The upstream reader marks two more failures as build-level: a GitHub API
answer whose body is not JSON, and an HTTP 403 answer to a download that
went through a GitHub release download URL.

## Scope
<!-- owner: plan · create/amend-via-gate -->

**In:** The `get` function of `githubClient` and the `downloader` in
`src/upstream/reader.ts`, and the build-level marks of the XPI and
`update.json` reads. Through the existing `buildLevel` paths, a record with
such a failure counts toward `pnpm build`'s more-than-half bar, the discover
bot records no state for the repo, and an "Add a plugin" issue run answers
that it could not finish. README and CHANGELOG text for the two cases. This
absorbs the candidate row "Count more GitHub answers as build-level" in full.

**Out:** A GitHub API body that is JSON of the wrong shape ("not an object",
"not a list") keeps its plugin-level mark: the row named only bodies that
are not JSON, and no row holds this. A 403 from any other host, such as
`raw.githubusercontent.com`, stays plugin-level, as D-011 sorts it. The
`send` path of `githubClient` (POST and PATCH in `pnpm propose`) is not a
plugin read and is not changed.

## Acceptance criteria
<!-- owner: plan · create/amend-via-gate; review reads, never reinterprets. -->

- [ ] AC1: In `githubClient`'s `get` in `src/upstream/reader.ts`, an answer
      with an ok status whose body `JSON.parse` refuses fails as
      `request-failed` marked build-level. In `test/upstream.test.ts`, a
      read whose repo answer is HTTP 200 with the body `<html>`, and a read
      whose first releases page, and a read whose second releases page, is
      HTTP 200 with that body, each return `ok: false`, the failure
      `request-failed`, a message that holds `not JSON`, and
      `buildLevel: true`.
- [ ] AC2: An HTTP 403 answer to the XPI download (`xpi-unreadable`) or the
      `update.json` download (`update-json-http-error`) is marked
      build-level when the download requested, as its first URL or after a
      redirect, a GitHub release URL: a URL whose host is `github.com` and
      whose path's third segment is `releases`, for any owner and repo. In
      `test/upstream.test.ts`, rows assert `buildLevel: true` for a 403 at
      the XPI's `github.com` release URL; at a
      `release-assets.githubusercontent.com` URL that the XPI's release URL
      redirects to; at an `update.json` release URL; at a
      `release-assets.githubusercontent.com` URL that an `update.json`
      release URL redirects to; at a release URL that a URL on another host
      redirects to; and at a `/<owner>/<repo>/releases/latest/download/`
      URL. Rows assert no `buildLevel` for a 403 to an `update.json`
      reached with no redirect at a `raw.githubusercontent.com` URL, at a
      `release-assets.githubusercontent.com` URL, and at a `github.com` URL
      whose path is `/<owner>/<repo>/raw/main/update.json`.
- [ ] AC3: The build-level list under "Building the data" in `README.md`
      gains two items, one holding `body is not JSON` and one holding
      `release download URL`, and keeps its item for a GitHub API 401 or
      403. A new `CHANGELOG.md` entry under `## Unreleased` holds both
      phrases. A search of a joined copy of each file finds each phrase.
- [ ] AC4: `pnpm test` and `pnpm check` pass.

## Coverage
<!-- owner: plan · create/amend-via-gate -->

- AC1 → T1
- AC2 → T2
- AC3 → T3
- AC4 → T4

## Tasks
<!-- owner: plan (create) / implement (check-off, minor edits); substantive
     change is amend-via-gate. -->

- [x] T1: In `test/upstream.test.ts`, move the row "the repo body is not
      JSON" (line 517) from the plugin-level table to the build-level table
      (line 603), and add rows for the first and second releases pages
      (`RELEASES`, `RELEASES_PAGE_2`). Run them to see
      them fail. Then pass `true` to `fail` for the body that is not JSON in
      `get` (`src/upstream/reader.ts:332`), and update the comment at line
      63 if it lists the cases.
- [x] T2: Write AC2's nine rows first, with redirect responses in the form
      of `redirectChain` (`test/upstream.test.ts:1067`) and `update_url`
      edits for the `update.json` URLs, and run them to see the build-level
      rows fail. Then have `downloader` (`src/upstream/reader.ts:447`) note
      whether any URL it requested is a GitHub release URL, and use that
      where the XPI read
      (line 484) and the `update.json` read (line 784) mark a 403. Keep the
      `buildLevelStatus` sweep test (`test/upstream.test.ts:1141`) covering
      every status for each case, and update the comment at line 93.
- [x] T3: Add both cases to the README list (`README.md:672-681`) as two
      items, defining a release download URL as a `github.com` URL whose
      path's third segment is `releases`, and a `CHANGELOG.md` entry under
      `## Unreleased`. Keep prose near 76
      columns, list long added lines with
      `git diff -U0 main | grep '^+' | awk 'length > 80'`, and search joined
      copies for AC3's phrases.
- [x] T4: Run `pnpm test` and `pnpm check` (through
      `npx -y pnpm@12.15.0`).

## Work log
<!-- owner: any skill · append-only; one line per entry; absolute dates. -->

- 2026-10-28: created by /milestone-plan.
- 2026-10-28: tier check: not run — work named at the question set.
- 2026-10-28: question set: work — the candidate row "Count more GitHub answers as build-level".
- 2026-10-28: question set: workflow dispatch on the milestone branch before the merge question — granted; this milestone changes no workflow, so it is not expected to be used.
- 2026-10-28: idea vet: no concern. A plugin cannot shape a GitHub API body, so a body that is not JSON points at GitHub or the network. A 403 in a GitHub release download comes from GitHub's file service, which serves a public repo's release files to anyone. Such a record counts only toward the more-than-half bar, so one plugin cannot stop a deploy.
- 2026-10-28: plan gate chose to mark a 403 by a `github.com` release download URL in the redirect chain over a list of GitHub file host names (`release-assets.githubusercontent.com`, `objects.githubusercontent.com`), because GitHub moved release files from the second host to the first, and a new host name would make these 403s plugin-level again with no failing test; falsified by a 403 in such a chain that a plugin's own release causes and that repeats each day.
- 2026-10-28: collision check: row "Count more GitHub answers as build-level" absorbed in full. D-011 sorts build-level answers by cause and status; D-022 annotates it with the two new cases. D-012 and D-015 hold. M017 and M018 shipped the current bars. The discover and issue-run paths that read `buildLevel` are unchanged.
- 2026-10-28: inbox sweep: 0 open issues; 1 open pull request (#57, a discovery bot pull request), no overlap.
- 2026-10-28: lessons used: 2026-10-25 (M001), 2026-10-26 (M018), 2026-10-27 (M027), 2026-10-28 (M036).
- 2026-10-28: checkpoint: plan written; the criteria audit (fresh Opus reader) is running, and D-022 lands with its result in the plan commit.
- 2026-10-28: criteria audit (full mode, fresh Opus reader): 9 findings, AC4 and proportionality pass. Fixed 7: a second releases page row (AC1); "any owner and repo" and the path rule widened to a third segment of `releases`, so a `/releases/latest/download/` hop counts (AC2); rows for a release URL reached after a redirect from another host, a direct `update.json` release URL, and a direct `release-assets` URL that stays plugin-level, which tells the chain rule from the rejected host list (AC2); AC3 binds the phrases to the README list items and the new entry and keeps the API 401/403 item. D-022 is written in the plan commit, as a record, not a criterion. Answered 1: "when, and only when" not adopted, since no named procedure enumerates every 403; the three negative rows are the bounded claim.
- 2026-10-28: ROADMAP line cap: the M045 row made 60 lines, so the row "Bound the build's report issue read" merged into "Close gaps in the build time limits", which already named it (D-017).
- 2026-10-28: plan gate widened the URL rule from a path starting `/releases/download/` to any `github.com` path whose third segment is `releases`, because `update_url`s often name `/releases/latest/download/`, and a 403 at that hop is GitHub's too; falsified by a `github.com` `/releases/` path whose 403 a plugin causes.
- 2026-10-28: implement started on branch m045-more-build-level-answers, cut from main at ae2d888.
- 2026-10-28: T1 done: `get` marks a body that is not JSON build-level; the three rows (repo, first and second releases pages) failed before the fix and pass; `pnpm test` 946 passed, 1 skipped; `pnpm check` 0 problems.
- 2026-10-28: T2 choice: `Download` returns `{ response, from }`, with `from` "github-release" once any requested URL passes `isReleaseUrl` (host `github.com`, third path segment `releases`), and `buildLevelStatus` gains that case (403, plus the any-host 429 and 5xx).
- 2026-10-28: T2 done: the nine AC2 rows; the six build-level rows failed before the fix only on the missing mark. Planted defects: a first-URL-only check turned the redirect-from-another-host row red, and the rejected host-name list turned 5 rows red, the direct asset URL row among them; file restored from a copy. `pnpm test` 955 passed, 1 skipped; `pnpm check` 0 problems.
- 2026-10-28: T3 done: README build-level list gains two items, CHANGELOG gains one entry; joined-copy search finds `body is not JSON` and `release download URL` once in each file. Minor amendment: the entry says an issue run leaves the issue open for both cases, so two rows join the build-level table in `test/issue.test.ts`; both failed with main's reader and pass. `pnpm test` 957 passed, 1 skipped; `pnpm check` 0 problems.
- 2026-10-28: T4 done: the T3 run covers the final code (07d56d4): `pnpm test` 957 passed, 1 skipped; `pnpm check` 42 entries, 0 problems. Claim audit (fresh Opus reader) running.
- 2026-10-28: claim audit corrections: the `isReleaseUrl` comment no longer says GitHub's file service answers every such URL; README and CHANGELOG state that the rule counts any `github.com` URL whose third path part is `releases`; the CHANGELOG's 403 sentence no longer reads as if GitHub always sends one. Re-read by the same reader pending.

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive. -->
