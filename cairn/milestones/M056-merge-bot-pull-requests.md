# M056: Merge bot pull requests after a wait unless held

- **Status:** in-progress
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

- [ ] AC1: `pnpm discover --handoff` and `pnpm discover-issue --handoff` write a `holds` list in each planned
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
- [ ] AC2: `pnpm propose` writes the body line `Hold: none` for an entry with no hold reason, followed by "The
      bot can merge this pull request at its first daily run at least 48 hours after it opens, unless it has
      the `hold` label or is closed." For an entry with reasons it writes `Hold: ` and the reasons joined by
      `, `, then the fixed sentence for each reason from one map in `src/discover/propose.ts`, and, after the
      pull request opens, sends `POST /repos/<index>/issues/<number>/labels` with `{"labels":["hold"]}`. A
      failed label request is named, with the pull request URL, as that entry's failure, so the command exits
      1. Tests compare the posted bodies with the map and read the fixture request log for one held entry, one
      unheld entry, and one held entry whose label request gets a 403.
- [ ] AC3: `pnpm merge-discover` reads every page of the index repo's open pull requests and sends
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
- [ ] AC4: For each pull request that meets AC3's conditions, `pnpm merge-discover` first runs `pnpm check` on a
      temporary copy of the checkout's `plugins/` plus the pull request's two files read at its head SHA. When
      that check exits non-zero or passes its time limit, or the merge request gets an error answer, the
      command sends no further request for that pull request, prints its number and the error, goes on to the
      next one, and exits 1 at the end. Tests: a `meta.json` that fails the registry schema gets no merge
      request and the output names `registry-schema`; a check that passes its time limit, by a shim, gets
      none; a 405 merge answer gives exit 1 and names the pull request; a later passing pull request is still
      merged in each case.
- [ ] AC5: `.github/workflows/merge-discover.yml` runs `pnpm merge-discover` daily and on dispatch, only on the
      default branch, with `GITHUB_TOKEN`, the permissions `contents: write` and `pull-requests: write` and no
      others, in the `discover` concurrency group with `queue: max`. `test/workflows.test.ts` checks each.
- [ ] AC6: README's discovery section and DESIGN.md's "Data sources and contribution" item 1 state that the bot
      can merge an unheld pull request at its first daily run at least 48 hours after it opens, the `hold`
      label, the five hold reasons, and that closing a bot pull request still keeps the bot from proposing
      that repo again. A search of joined copies of both files (LESSONS M018) finds neither "approves each
      pull request" nor "reviews each pull request". `CHANGELOG.md`'s Unreleased section has an entry for the
      change.
- [ ] AC7: `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check` pass.

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
- [ ] T3: Write the `Hold:` line and the reason map in `body()` (`src/discover/propose.ts` 462-489), read the
      new pull request's `number`, and send the label request after it opens (434-439). Tests in
      `test/propose.test.ts`. Create the `hold` label on the repo with `gh label create hold` (granted).
- [ ] T4: Add `src/discover/merge.ts` and `merge-cli.ts`, and the `merge-discover` script in `package.json`:
      read the open pull requests, test AC3's conditions, run `pnpmCheck` on the temporary copy, and merge.
      Tests in a new `test/merge.test.ts` with `fixtureFetch`.
- [ ] T5: Add `.github/workflows/merge-discover.yml` and its checks in `test/workflows.test.ts`.
- [ ] T6: Update README, DESIGN.md (item 1 and the `src/discover/` Architecture bullet), and `CHANGELOG.md`;
      append D-033.
- [ ] T7: Run the verify slot. After the merge, list the open bot pull requests, dispatch `merge-discover.yml`
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
