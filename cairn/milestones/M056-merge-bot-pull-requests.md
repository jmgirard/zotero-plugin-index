# M056: Merge bot pull requests after a wait unless held

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — it changes which plugins the published index lists and when
- **Branch/PR:** m056-merge-bot-pull-requests

## Goal

The bot merges its own discovery and issue pull requests at its first daily run at least 48 hours after they open, unless it held them at opening, someone labeled them `hold` or closed them, or they fail its checks.

## Scope

**In:** hold reasons computed in the read steps and carried in the handoff; a `Hold:` line in each bot pull
request body and a `hold` label on a held one; a new `pnpm merge-discover` command and a daily
`merge-discover.yml` workflow that squash-merges the pull requests that pass; README, DESIGN.md, CHANGELOG, and
D-033 for the new approval rule.

**Out:** starting each candidate in Zotero before the merge, matching names against the entries of open bot pull
requests, a repo-age hold, and holding a pull request whose check fails at merge time → candidate row "Hold more
risky bot additions". Scanning the XPI's code is not planned (work log). Bot pull requests opened before this
milestone have no `Hold:` line, so the job never merges them; the maintainer merges or closes them by hand.

## Acceptance criteria

- [x] AC1: `pnpm discover --handoff` and `pnpm discover-issue --handoff` write a `holds` list in each planned
      entry. It holds each reason below that the entry meets, in this order, and is `[]` when the entry meets
      none. `readHandoff` refuses a handoff whose entry has no `holds` list or a value outside these five. A
      name key is a text lowercased and split into runs of `a`–`z` and `0`–`9`, with the runs `zotero`,
      `plugin`, `addon`, and `for` dropped, then joined. The repo part is the part after `/` in `owner/repo`.
      - `name-match`: the name key of the manifest name equals the name key of an indexed entry's `meta.json`
        name, or the name key of the new repo part equals that of the repo part of an indexed entry's
        `repoUrl`; the equal key is not empty, and the indexed entry's owner differs, ignoring case.
      - `owner-unread`: the read of `GET /users/<owner>` fails or gives no parseable `created_at`.
      - `new-account`: the owner's `created_at` is less than 30 days before the run's `now`.
      - `update-host`: `UpstreamFacts.updateHost` (the host with any port) is neither `github.com` nor
        `raw.githubusercontent.com`.
      - `issue-no-topic`: the entry comes from an issue run, and the repo's `topics` hold neither
        `zotero-plugin` nor `zotero-addon`.
      Tests, with `now` injected: for each reason, an entry that meets it alone gets exactly that reason, with
      `name-match` planted once by manifest name and once by repo part; an account 29 days old holds and one
      exactly 30 days old does not; `github.com:8443` holds; an entry that meets none gets `[]`; a name match
      with the same owner gets `[]`; an entry without the topics in a discover run gets `[]`; one discover run
      and one issue run each write a held entry's `holds` in `plan.json`; a handoff with a sixth value is
      refused.
- [x] AC2: `pnpm propose` writes the body line `Hold: none` for an entry with no hold reason, followed by "The
      bot can merge this pull request at its first daily run at least 48 hours after it opens, unless it has
      the `hold` label or is closed." For an entry with reasons it writes `Hold: ` and the reasons joined by
      `, `, then the fixed sentence for each reason from one map in `src/discover/propose.ts`, and, after the
      pull request opens, sends `POST /repos/<index>/issues/<number>/labels` with `{"labels":["hold"]}`. A
      failed label request is named, with the pull request URL, as that entry's failure, so the command exits
      1. Tests compare the posted bodies with the map and read the fixture request log for one held entry, one
      unheld entry, and one held entry whose label request gets a 403.
- [x] AC3: `pnpm merge-discover` reads every page of the index repo's open pull requests and sends
      `PUT /repos/<index>/pulls/<n>/merge` with `merge_method` `squash` and `sha` set to the head SHA it read
      only for a pull request that meets all of these conditions, tested in this order: (a) its head branch
      starts with `discover/`, and its head repo is the index repo; (b) its author is `github-actions[bot]`;
      (c) its body, split on `\r?\n`, has a line that is exactly `Hold: none`; (d) it has no `hold` label; (e)
      its `created_at` is at least 48 hours before the run's `now`; (f) `GET /pulls/<n>/files` lists exactly
      two files, `plugins/<id>/meta.json` and `plugins/<id>/index.json` for one `<id>`, both with status
      `added`; (g) the checkout has no `plugins/` directory whose name equals `<id>`, ignoring case. For each
      other open pull request it sends no merge request and prints the number and the first condition it
      fails. A failed files read is printed with the number, and the command exits 1 at the end. Tests, with
      `now` injected: one pull request that fails each part alone (the prefix and the head repo of (a); the
      count, a path, a status, and two different ids in (f)), one at 47 hours, one with a CRLF body that
      passes (c), one failed files read, a second page of results, and one that meets all; the request log
      holds merge requests only for the ones that meet all.
- [x] AC4: For each pull request that meets AC3's conditions, `pnpm merge-discover` first runs `pnpm check` on a
      temporary copy of the checkout's `plugins/` plus the pull request's two files read at its head SHA. When
      that check exits non-zero or passes its time limit, or the merge request gets an error answer, the
      command sends no further request for that pull request, prints its number and the error, goes on to the
      next one, and exits 1 at the end. Tests: a `meta.json` that fails the registry schema gets no merge
      request and the output names `registry-schema`; a check that passes its time limit, by a shim, gets
      none; a 405 merge answer gives exit 1 and names the pull request; a later passing pull request is still
      merged in each case.
- [x] AC5: `.github/workflows/merge-discover.yml` runs `pnpm merge-discover` daily and on dispatch, only on the
      default branch, with `GITHUB_TOKEN`, the permissions `contents: write` and `pull-requests: write` and no
      others, in the `discover` concurrency group with `queue: max`. `test/workflows.test.ts` checks each.
- [x] AC6: README's discovery section and DESIGN.md's "Data sources and contribution" item 1 state that the bot
      can merge an unheld pull request at its first daily run at least 48 hours after it opens, the `hold`
      label, the five hold reasons, and that closing a bot pull request still keeps the bot from proposing
      that repo again. A search of joined copies of both files (LESSONS M018) finds neither "approves each
      pull request" nor "reviews each pull request". `CHANGELOG.md`'s Unreleased section has an entry for the
      change.
- [x] AC7: `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check` pass.

## Coverage

- AC1 → T1, T2
- AC2 → T3
- AC3 → T4
- AC4 → T4
- AC5 → T5
- AC6 → T6
- AC7 → T7

## Tasks

- [x] T1: Add `holds` to `PlannedEntry` and the entry schema in `src/discover/handoff.ts` (25-67), with the
      `readHandoff` refusal and its test in `test/handoff.test.ts`.
- [x] T2: Compute the hold reasons in one shared function: carry `topics` from the repo read in
      `src/upstream/reader.ts` (174-218), read `GET /users/<owner>`, build the name keys from the indexed
      entries in `src/discover/discover.ts` near `draftEntry` (198), and fill `holds` for discover and issue
      runs (`discover.ts`, `issue.ts`). Tests in `test/discover.test.ts` and `test/issue.test.ts`.
- [x] T3: Write the `Hold:` line and the reason map in `body()` (`src/discover/propose.ts` 462-489), read the
      new pull request's `number`, and send the label request after it opens (434-439). Tests in
      `test/propose.test.ts`. Create the `hold` label on the repo with `gh label create hold` (granted).
- [x] T4: Add `src/discover/merge.ts` and `merge-cli.ts`, and the `merge-discover` script in `package.json`:
      read the open pull requests, test AC3's conditions, run `pnpmCheck` on the temporary copy, and merge.
      Tests in a new `test/merge.test.ts` with `fixtureFetch`.
- [x] T5: Add `.github/workflows/merge-discover.yml` and its checks in `test/workflows.test.ts`.
- [x] T6: Update README, DESIGN.md (item 1 and the `src/discover/` Architecture bullet), and `CHANGELOG.md`;
      append D-033.
- [x] T7: Run the verify slot. After the merge, list the open bot pull requests, dispatch `merge-discover.yml`
      on the default branch (granted), and check that its log gives each one with its skip reason or merge.

## Work log

- 2026-10-29: created by /milestone-plan.
- 2026-10-29: tier check: milestone — new bot behavior and a change to who approves additions.
- 2026-10-29: idea vet: gap — "high risk" can only mean the listed shapes, since a careful attacker passes any cheap rule; reading taken: a hold for review on fixed rules, not a risk score. No flaw.
- 2026-10-29: lessons used: 2026-10-25 (M001), 2026-10-26 (M018), 2026-10-27 (M030), 2026-10-28 (M043).
- 2026-10-29: collision check: M009 (done) made a closed unmerged bot pull request block the repo; this milestone keeps that rule. No D-entry rejects auto-merge. DESIGN.md item 1 says the maintainer approves each pull request; D-033 replaces that.
- 2026-10-29: inbox sweep: no open issues; the 5 open pull requests (#103–#107) are bot pull requests this milestone does not merge (no `Hold:` line); no disposition.
- 2026-10-29: calibration: on the 44 merged bot pull requests, the chosen rules would have held 8 (#17, #41, #50, #52, #53, #57, #89, #94); a 30-day repo-age rule would have held 16. Script in the session scratchpad, not committed.
- 2026-10-29: criteria audit (full, fresh Opus reader): 16 findings. Taken: repo part named; `updateHost` with port; injected `now` with a 30-day edge; probes for both name paths, both run kinds, each part of AC3 (a) and (f); a fixed sentence map; the label failure probe and `number` read; every page; CRLF; a failed files read; AC4 probes that reach the check (the case-only id probe could not); AC5's live dispatch moved to T7 as review procedure; the wait wording made exact. Declined: holding a pull request whose check fails (narrower promise; candidate row). No change: closing keywords and report counts.
- 2026-10-29: question set: hold rules — four rules (name match, new account, update host off GitHub, issue without topic); wait — 48 hours; live actions — create the `hold` label, and dispatch `merge-discover.yml` once after the merge.
- 2026-10-29: plan gate chose a delayed merge of the bot's pull request over a direct commit to the default branch because a closed pull request is the only record that blocks a repo; falsified by a merged bot pull request whose repo the bot proposes again.
- 2026-10-29: plan gate chose the `Hold: none` body line as the merge gate over the `hold` label alone because a failed label request must not let a held pull request merge; falsified by a held pull request that the job merges.
- 2026-10-29: plan gate chose fixed hold rules over scanning the XPI's code because most plugins make network calls and run scripts, so a scan would hold nearly every candidate; falsified by a scan whose hold count on the 44 merged pull requests is below the chosen rules' 8.
- 2026-10-29: user chose four rules over adding a 30-day repo-age rule, which would have held 16 of 44; falsified by a listed plugin found harmful whose repo was under 30 days old and passed the four rules.
- 2026-10-29: implement started on branch m056-merge-bot-pull-requests.
- 2026-10-29: implementation choice: the rules live in `src/discover/holds.ts` (`holdReasons`, `nameKey`, `ownerCreatedAt`), and `TOPICS` moved there from `discover.ts` so `handoff.ts` can import `HOLD_REASONS` with no import cycle; `readUpstream` returns `topics` beside `facts` so the build does not publish them; the owner read uses the client's own per-request time limit.
- 2026-10-29: T1, T2 done: `holds` in the handoff schema and `PlannedEntry`; `draftEntry` fills it for discover and issue runs; `indexed` also returns each entry's owner, repo part, and name; `pluginRepo` fixtures carry a topic and an old owner account. New `test/holds.test.ts` (13 tests), plan.json tests in `test/propose.test.ts` and `test/issue.test.ts`, 3 refusal cases in `test/handoff.test.ts`. Planted `<=` for the 30-day rule and a dropped owner check each turned one test red. `pnpm test` 1247 passed, `pnpm check` clean.
- 2026-10-29: T3 done: `body()` writes `Hold: none` and `UNHELD_TEXT`, or `Hold: <reasons>` and a `HOLD_TEXT` sentence for each; `proposeHandoff` posts the `hold` label to the new pull request's `number` and fails the entry, naming the pull request URL, when that request fails. 3 tests in `test/propose.test.ts`; a planted skip of the label request turned 2 red. The body-end test now expects the Hold line after the fence. Created the `hold` label on jmgirard/zotero-plugin-index with `gh label create` (granted at the question set). `pnpm test` 1250 passed.
- 2026-10-29: implementation choice: `pnpm merge-discover` reads the pull request's two files through the contents API at the head SHA, not with git, so its workflow needs no fetch; an entry that this run merged is checked beside later entries and blocks a later pull request for its id, which AC3 (g) leaves open; `githubClient` gains `put`.
- 2026-10-29: T4 done: `src/discover/merge.ts` (`mergeDiscover`), `merge-cli.ts`, and the `merge-discover` script. 7 tests in `test/merge.test.ts`: one pull request failing each part of AC3 alone, a second page, CRLF, a failed files read, the 48-hour edge, a registry-schema failure with the real check, a check time limit by a pnpm shim, a 405 merge answer, and the command's output and exit 1. Planted `split("\n")`, a skipped check, and `> WAIT_MS` turned 4 tests red. `pnpm test` 1257 passed.
- 2026-10-29: T5 done: `.github/workflows/merge-discover.yml` runs at 05:13 UTC, before the 06:17 build, and on dispatch; its job runs only for a schedule or a dispatch whose `github.ref` is the default branch's `refs/heads/` name, the form `report-issue.yml` uses, so a tag does not pass; `cache-mode: none` and no cache step, as in `close-add-plugin-issue.yml`. 4 tests in `test/workflows.test.ts`; a planted `issues: write` turned the permissions test red. `discover.yml`'s group comment names the new workflow. GitHub can check the file only once it is on the default branch (T7).
- 2026-10-29: T6 done: README "Pull requests from the bot" gains the Hold line and the five reasons, and a new "Merging bot pull requests" section; DESIGN.md item 1 and a `src/discover/holds.ts` Architecture bullet; one CHANGELOG entry. D-033 landed with the plan commit. Joined-copy searches of README and DESIGN find 0 of "approves each pull request" and "reviews each pull request"; no added line over 80 columns. `pnpm test` 1261 passed, `pnpm check` clean.
- 2026-10-29: claim audit: 58 claims read, 10 corrected — README.md, CHANGELOG.md, src/discover/propose.ts. Fixed: name-match wording (like with like; ASCII runs; separate words), default port, "keep open" to "stop the bot from merging", every failure case and the `merged nothing` exit, output order, "new" bot pull requests, "read job", and a duplicated README paragraph with the merge section split from the `pnpm propose` text (section moved before "Proposing a plugin with an issue"). Declined for `UNHELD_TEXT` only: "first daily run" is AC2's fixed wording, and a by-hand run is the maintainer's act; the README says "daily or by hand". The re-read found one more gap (a missing head SHA as a failure), now listed.
- 2026-10-29: T7: verify slot clean (`pnpm test` 1261 passed, `pnpm check` 58 entries, 0 problems). The post-merge dispatch of `merge-discover.yml` is left to `/milestone-review` after the merge, as AC5's audit disposition says. Implement complete; status review.
- 2026-10-29: review started; main unmoved since the branch cut (origin/main 83947af is an ancestor), Copilot round off. Fixed on the branch before evidence: README and DESIGN item 1 now say "first daily run at least 48 hours after it opens", the words AC6 names (fbd1250).
- 2026-10-29: step-7 approval: m056-merge-bot-pull-requests approved for merge

## Decisions

## Review

- AC1: `pnpm test` 2026-10-29, 1261 passed. `test/holds.test.ts` (13): each reason alone, `name-match` by manifest name and by repo part, 29 days holds and exactly 30 does not, `github.com:8443` holds, none gives `[]`, same owner gives `[]`, a discover run without the topics gives `[]`, several reasons in order. `test/propose.test.ts` "writes each entry's hold reasons in the plan" (discover, `["update-host"]` in plan.json) and `test/issue.test.ts` "the read step writes the entry's hold reasons in the plan" (issue, `["issue-no-topic"]`). `test/handoff.test.ts`: no holds list, a sixth value, and an issue entry with a sixth value are refused. Implement planted `<=` and a dropped owner check; each turned a test red.
- AC2: `UNHELD_TEXT` in `src/discover/propose.ts` is the criterion's sentence word for word; `HOLD_TEXT` is the one map. `test/propose.test.ts` "the Hold line and the hold label" (3, passed 2026-10-29): an unheld entry's body holds `\nHold: none\n\n<UNHELD_TEXT>\n` and the request log holds only the create request; a held entry's body holds `Hold: new-account, update-host` and each `HOLD_TEXT` sentence, and the log holds the create request then `POST .../issues/12/labels` with `{"labels":["hold"]}`; a 403 label answer puts the entry in `failed` with a message that opens with the pull request URL. `propose-cli.ts` exits 1 when `failed` is not empty (lines 86-90). A planted skip of the label request turned 2 tests red.
- AC3: `test/merge.test.ts` "merges only the pull requests that meet every condition…" (passed 2026-10-29): 15 pull requests over two pages; #1 fails (a) by prefix, #2 by head repo, #3 (b), #4 (c), #5 (d), #6 (e) at 47 hours, #7 to #10 (f) by count, path, status, and two ids, #11 (g) with `Second-Plugin@example.org`; each is skipped with its condition's reason in order; #12 with a CRLF body, #14, and #15 on page 2 merge; #13's files read (HTTP 500) is in `failed`; the PUT requests are exactly #12, #14, #15, each with `merge_method` `squash` and its head `sha`. "a pull request exactly 48 hours old can merge" passed. The CLI test prints `skipped #1: it has the hold label`, `failed #2: cannot read its files: …HTTP 500`, and exits 1. Planted `split("\n")` and `> WAIT_MS` turned tests red. Condition (g) reads every name in `plugins/`, files included, which also blocks a file of that name.
- AC4: `mergeDiscover` reads both files from the contents API at `?ref=<head sha>`, copies `root` to a temp `plugins/`, adds them, and runs `check` there before the PUT (`src/discover/merge.ts`). `test/merge.test.ts` (passed 2026-10-29): a `meta.json` with an extra field, under the real `pnpmCheck`, gets no PUT and a `failed` message holding `p1@example.org: registry-schema`, and #2 merges; a pnpm shim that sleeps while p1's entry is present, with a 1000 ms limit, fails #1 with "pnpm check passed its time limit of 1000 ms" and #2 merges; a 405 merge answer fails #1 naming "HTTP 405: Pull Request is not mergeable", and #2 merges. The CLI exits 1 when `failed` is not empty (CLI test). A planted skipped check turned 2 tests red.
- AC5: `test/workflows.test.ts` "merge-discover.yml" (4, passed 2026-10-29): triggers are the `13 5 * * *` schedule and `workflow_dispatch`; one job, `merge`, whose `if:` admits a schedule or a dispatch whose `github.ref` is the default branch's `refs/heads/` name; top-level `permissions: {}` and job permissions exactly `contents: write` and `pull-requests: write`; the step `run: pnpm merge-discover` with `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` and no other secret; the `discover` group with `cancel-in-progress: false` and `queue: max`; `cache-mode: none` and no cache step. Ruby's YAML parse gives the same permissions, group, and triggers. A planted `issues: write` turned the permissions test red.
- AC6: joined copies (LESSONS M018) on 2026-10-29 after fbd1250: README and DESIGN.md each hold "first daily run at least 48 hours after it opens" once, "`hold` label" (README 2, DESIGN 3), and the closing rule (README "close a bot pull request without a merge"; DESIGN "Closing a bot pull request still keeps the bot from proposing that repo again"); README names each of the five reasons once in backticks, and DESIGN item 1 names them in words (name match, account under 30 days or unreadable, update.json off the two hosts, issue repo with neither topic); "approves each pull request" and "reviews each pull request" each count 0 in both. `CHANGELOG.md`'s Unreleased section holds the entry "The bot now merges its own pull requests" once.
- AC7: 2026-10-29 on the branch with the review's propose-cli fix: `npx -y pnpm@12.15.0 test` (tsc, then Vitest) 24 files passed, 1 skipped, 1261 tests passed, 6 skipped; `npx -y pnpm@12.15.0 check` "checked 58 entries in plugins, 0 problems".
- consistency gate: `cairn_validate.py` all checks passed (2026-10-29); no principle changed, so no `cairn_impact`; the `generic` profile's consistency-gate slot names no toolchain checks.
- review (own read, before the fan-out): `pnpm propose` printed "opened no pull request for N entries" above each failed entry, which is false for a held entry whose label request failed after its pull request opened — fix now: the line reads "N entries failed", and the CLI failure test asserts it, fixed 8504a2c.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: `name-match` sees only indexed entries, not open bot pull requests or entries drafted earlier in the run — follow-up, row "Close gaps in bot holds and merges" (2); Scope Out named open pull requests.
- diff-bug #2: `nameKey` keeps only a-z and 0-9, so a name wholly in another script never matches and a homoglyph passes — follow-up, same row (2).
- diff-bug #3: conditions come from the list read, so a `hold` label, a body edit, or a push made during the run is missed, and the files read is not pinned to the head — fix now: the pull request is read again before the PUT and skipped if it closed, fails a record condition, became a draft, changed base, or moved its head; 3 tests, fixed f8058a5.
- diff-bug #4: the `Hold: none` test matches a line inside the fenced check output — fix now: `unfencedLines` (split from `closesLines`) and exactly one `Hold:` line outside fences; 2 tests, fixed f8058a5.
- diff-bug #5: the label match is case-sensitive though GitHub label names are unique ignoring case — fix now, 1 test, fixed f8058a5.
- diff-bug #6: no check of `draft` or of the base branch — fix now: both skipped, tested after AC3's (g) so AC3's first-condition order holds; 2 tests, fixed f8058a5.
- diff-bug #7: the contents API follows a symlink, so a symlinked `meta.json` passes the check — reject (false): only an account with write access can push a `discover/` branch to the index repo, and it can commit the same symlink to the default branch directly.
- diff-bug #8: a failed label request in an issue run answers "could not finish", not the opened comment that `pnpm close-issue` needs — fix now: the failure carries the URL and `issueAnswer` posts the opened comment, status 1; 1 test, fixed f8058a5.
- diff-bug #9: a rate limit or 5xx on the owner read holds for good — follow-up, row (5).
- diff-bug #10: `update-host` checks only the update.json host, not its `update_link` — reject (planned change): D-033's rule as the plan set it.
- diff-bug #11: a merge with `GITHUB_TOKEN` starts no `ci.yml` run — reject (planned change): the plan chose this, the merge job's combined check stands in, and the README says so.
- diff-bug #12: the `2 entries failed` assertion tests behavior outside the change — reject (false): this branch changed that message (8504a2c).
- diff-bug #13: no test shows a later check seeing an entry the run merged, and no test drives `name-match` through `indexed()` — fix now: 2 tests, fixed f8058a5.
- prior-review #1: an issue run answers "could not finish" after the label fails (M040) — same as diff-bug #8, fixed f8058a5.
- prior-review #2: the merge loop has no whole-run limit and prints only at the end (M030) — follow-up, row (6).
- prior-review #3: the merge checks against the checkout, not the commit the squash lands on (M042) — follow-up, row (7).
- prior-review #4: the owner read sits outside the per-repo read limit (M030) — reject (edge): only a GitHub API request that hangs reaches it, outside common use, and the client's per-request timeout bounds the delay.
- prior-review #5: a dispatch from another ref joins the `discover` group (M040) — reject (edge): the README says to start it on the default branch; such a run only waits in the queue and runs no job.
- prior-review #6: the Hold test reads lines inside the check output (M032) — same as diff-bug #4, fixed f8058a5.
- prior-review #7: a cut body still drops the check summary (M039) — follow-up, existing row "Keep the check summary in a cut body"; this diff does not touch it.
- ripple #1: the follow-up row said "four fixed rules" and named a repo-age rule as new — fix now: the row reads "five fixed reasons" and keeps the repo-age rule as an alternative, retitled "Close gaps in bot holds and merges", fixed f8058a5.
- ripple #2: README says the issue workflow and `Discover plugins` are "the two workflows" in the group — fix now, fixed f8058a5.
- ripple #3: DESIGN says "Both workflows set `queue: max`" — fix now, fixed f8058a5.
- ripple #4: the CHANGELOG group entry names two workflows — fix now, fixed f8058a5.
- ripple #5: `add-plugin-issue.yml`'s group comment names only `Discover plugins` — reject (false): what it says remains true.
- ripple #6: DESIGN lists `post` and `patch` but not `put` — fix now, fixed f8058a5.
- ripple #7: DESIGN's `readUpstream` line omits `topics` — fix now, fixed f8058a5.
- ripple #8: an older CHANGELOG entry lists the body without the Hold line — reject (false): it is not contradicted, and the new entry describes the Hold line.
- blame-history #1: the Hold test is not fence-aware (M022) — same as diff-bug #4, fixed f8058a5.
- blame-history #2: a failed label leaves the issue without the opened comment (M022) — same as diff-bug #8, fixed f8058a5.
- blame-history #3: D-033's last sentence reads as if the user rejected the 48-hour wait — reject (false): the entry adopts the wait earlier, and the sentence lists the user's two choices; D-entries are not edited.
- blame-history #4: README's label-failure sentence says "the command" under the propose section — fix now: names `pnpm propose`, fixed f8058a5.
- after the fixes: `pnpm test` 1272 passed, 6 skipped; `pnpm check` 0 problems; `cairn_validate.py` all checks passed. AC1 to AC7 evidence still holds; AC3's test now also feeds the default branch and a fresh read. Planted `changed && false`, a plain `split("\n")`, a case-sensitive label, a skipped issue answer, and a wrong owner in `indexed()` each turned tests red. No finding met the return floor.
