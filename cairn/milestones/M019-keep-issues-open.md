<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M019: Keep issues open on a bot read failure

- **Status:** review   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** normal   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** —   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** —   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** user-facing — it changes how the bot answers "Add a plugin" issues on GitHub   <!-- owner: plan · create/amend-via-gate; user-facing | internal — <one-clause reason>; skill conduct only — no validate check parses it -->
- **Branch/PR:** m019-keep-issues-open   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

## Goal
<!-- owner: plan · create; a wrong goal returns to plan, never edited in place -->

An "Add a plugin" issue stays open for a maintainer when the bot's read of the
repo fails for a reason that says nothing about the plugin, such as a GitHub
rate limit or outage.

## Scope
<!-- owner: plan · create/amend-via-gate -->

**In:** in an issue run's read step, a `draftEntry` refusal whose reader
failure the reader marks build-level (`buildLevelStatus` and the host check's
failed lookup), or an `unexpected-error` from a thrown `readUpstream`, becomes
the `failed` outcome: the bot comments that it could not finish, the issue
stays open, and the run fails. `draftEntry` carries the reader's build-level
mark in its refusal. Every other refusal still closes the issue as not
planned. README, CHANGELOG, DESIGN, and the code comments follow.

**Out:**
- GitHub answers the reader does not mark build-level today (an HTML body with
  HTTP 200, a 403 from the release-asset host) → candidate "Count more GitHub
  answers as build-level"; issue runs follow the mark once that ships.
- Discovery's 30-day record of download errors → candidate "Retry repos
  refused by a download error".
- A failed push or create request in an issue run → candidate "Stop retrying
  a failing bot pull request".
- An `unexpected-error` from the entry check (`plannedProblem` throwing) and
  output-directory refusals (`write-failed`, `entry-exists` in the output
  directory) keep their M010 behavior; no row, since this milestone promises
  nothing about them.

## Acceptance criteria
<!-- owner: plan · create/amend-via-gate; review reads, never reinterprets. -->

- [ ] AC1: In an issue run, when the reader's read of the named repo fails
      with a failure that the reader marks build-level, the bot comments that
      it could not finish, with the failure name in a code span followed by
      the message, sends no close request, and the run's status is 1, so
      `pnpm propose` exits 1. Tests in `test/issue.test.ts` show this for a
      GitHub API HTTP 429, a GitHub API HTTP 503, a GitHub API HTTP 403, an
      `update.json` HTTP 503, a rejected fetch, and a failed host lookup.
- [ ] AC2: In an issue run, when `readUpstream` throws while reading the
      repo (`unexpected-error`), the bot answers as in AC1: the comment, no
      close request, and status 1. A test in `test/issue.test.ts` shows this.
- [ ] AC3: In an issue run, a reader failure that is not build-level still
      gets its failure name in the comment and closes the issue as not
      planned. New tests show this for a GitHub API HTTP 404 and an
      `update.json` HTTP 404, and the refusal tests that `test/issue.test.ts`
      holds today pass unchanged.
- [ ] AC4: README's "Proposing a plugin with an issue" section, the
      `CHANGELOG.md` Unreleased entry for the issue form, and the comments on
      `issueRead` and `issueAnswer` in `src/discover/issue.ts` each say that
      a reader failure marked build-level, or an error thrown while reading
      the repo, leaves the issue open and fails the run. The README sentence
      "A failed read includes a GitHub API error, such as a rate limit, while
      the bot reads the repository." and the `issueRead` comment's "that
      includes a GitHub request error while the reader reads the repo" are
      gone.
- [ ] AC5: `pnpm test` (type check, then Vitest) and `pnpm check` pass.

## Coverage
<!-- owner: plan · create/amend-via-gate -->

- AC1 → T1, T2
- AC2 → T1, T2
- AC3 → T1, T2
- AC4 → T3
- AC5 → T4

## Tasks
<!-- owner: plan (create) / implement (check-off, minor edits) -->

- [x] T1: Write the failing tests first in `test/issue.test.ts`: the six
      build-level cases of AC1, the thrown read of AC2, and the two 404 cases
      of AC3. `runIssue` (line ~52) gains a `lookup` option for the failed
      lookup case. Each test asserts the requests sent and the status.
- [x] T2: In `src/discover/discover.ts` `draftEntry` (~line 167), carry the
      reader's `buildLevel` mark in the refusal, and mark the thrown-read
      `unexpected-error`. In `src/discover/issue.ts` `readOutcome` (~line 96),
      return `{ outcome: "failed" }` for such a refusal, its message opening
      with the failure name. Discovery's recording rule does not change.
- [x] T3: Update README "Proposing a plugin with an issue" (~lines 279-289),
      the CHANGELOG Unreleased issue-form entry (~line 70), the `issueRead`
      and `issueAnswer` comments, and DESIGN.md's Discovery function family
      line on issue answers (~line 143). Check each sentence in a joined copy
      (LESSONS M018). The issue form's "If the plugin does not pass" stays,
      since a failed read is not a refusal of the plugin.
- [x] T4: Run `pnpm test` and `pnpm check` through `npx -y pnpm@12.15.0`.

## Work log
<!-- owner: any skill · append-only; one line per entry; absolute dates. -->

- 2026-10-26: created by /milestone-plan.
- 2026-10-26: tier check: milestone — README documents that a GitHub API error such as a rate limit closes the issue, so this changes documented behavior.
- 2026-10-26: idea vet: the row's rule by failure name would also keep open issues for a misspelled, missing, or private repo, since GitHub's 404 is a `github-http-error`; the question set chose the reader's build-level mark instead.
- 2026-10-26: plan gate chose the reader's build-level mark over the row's failure names because a 404 for a missing repo is a refusal of the request, not a bot failure; falsified by a build-level failure that a plugin's own repo or host causes on every read.
- 2026-10-26: question set: one live test issue after the merge — allowed; the review may open one "Add a plugin" issue naming a repo that does not exist and report the bot's comment and close.
- 2026-10-26: lessons used: 2026-10-25 (M001) pnpm via npx; 2026-10-25 (M003) a Proxy that throws to make the reader throw; 2026-10-25 (M004) the lookup stub; 2026-10-26 (M010) live issue-form test; 2026-10-26 (M018) joined-copy search.
- 2026-10-26: collision check: absorbs candidate "Keep issues open on a bot read failure" in full; extends M010's issue answers and follows M017/M018's build-level mark (D-011, D-012), which no D-entry blocks; inbox has 0 open issues and 6 discovery-bot PRs, none overlapping.
- 2026-10-26: criteria audit (full mode, fresh Opus reader): 8 findings, all taken — failure name form stated; reader's mark replaces a hand list of statuses; 403, failed-lookup, and update.json 404 cases added; status-1 wording tied to the tests; AC2 narrowed to a thrown `readUpstream`; AC4's phrase search replaced by the exact sentences; DESIGN line and issue form handled in T3.

- 2026-10-26: T1: 9 issue-run tests and 1 handoff test added; the 7 open-issue cases fail on `result.status` 0 before the fix, the 2 404 cases and the handoff case pass (they pin behavior the fix keeps).
- 2026-10-26: T2: `draftEntry` refusals carry `buildLevel` from the reader and on a thrown read; `readOutcome` turns those into `failed`, which gains an optional `failure` in the handoff schema (same name pattern as `refused`), so the comment shows the name in a code span then the message. Chose a schema field over folding the name into the message so the name keeps its own pattern check. `pnpm test` 496 passed, `pnpm check` 0 problems.
- 2026-10-26: T3: README issue section, CHANGELOG issue-form entry, `issueRead`/`issueAnswer` comments, and DESIGN's Discovery line updated; README points at "Building the data" for the build-level list instead of repeating it. Joined-copy search finds 0 of both removed sentences. The simple-english lint flags README line 68 ("validate"), text this branch does not touch; left as is.
- 2026-10-26: T4: `pnpm test` 496 passed (14 files), `pnpm check` 17 entries, 0 problems.
- 2026-10-26: claim audit: 22 claims read, 3 corrected — src/discover/discover.ts, src/discover/handoff.ts, README.md (re-read once: all true; README sentence moved to the paragraph on issues that close).

## Decisions
<!-- owner: implement / review · append-only; milestone-local -->

## Review
<!-- owner: review · exclusive -->
