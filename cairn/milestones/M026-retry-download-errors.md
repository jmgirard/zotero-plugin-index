<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M026: Retry repos refused by a download error

- **Status:** in-progress   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** normal   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** —   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** —   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** user-facing — it changes which repos the daily discovery reads again, and the README rule that describes it   <!-- owner: plan · create/amend-via-gate; user-facing | internal — <one-clause reason>; skill conduct only — no validate check parses it -->
- **Branch/PR:** m026-retry-download-errors   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

## Goal
<!-- owner: plan · create; a wrong goal returns to plan, never edited in place -->

A repo whose read fails because a download host answered with a rate limit or a server error is read again on the next discovery run, instead of being skipped for 30 days or until its next push.

## Scope
<!-- owner: plan · create/amend-via-gate -->

**In:** `draftEntry` in `src/discover/discover.ts` returns `recorded: false`
for a reader refusal that the reader marks build-level. For a download host
the reader marks only an HTTP 429 or 5xx answer so (`buildLevelStatus`,
D-011). New cases in "the discovery state" tests of
`test/discover.test.ts`. The code comments, README.md, and the DESIGN.md
Architecture text that state which refusals the state file keeps.

**Out:** A 404, 403, or other download answer stays recorded under the
30-day rule, as the user chose at the plan; no row. GitHub API errors,
failed requests, and unexpected errors are already not recorded. The
"Add a plugin" issue run keeps no state and does not change. The time
budget of a discover run stays in the candidate row "Bound the time of a
discover run". CHANGELOG.md's discovery entry under "Unreleased" does not
describe the state file, so it does not change.

## Acceptance criteria
<!-- owner: plan · create/amend-via-gate; review reads, never reinterprets. -->

- [ ] AC1: `discover()`, run from an empty state, returns a state with no
      record for a repo whose read fails with `update-json-http-error` on
      an HTTP 429 answer for its `update.json`, and none for a repo whose
      read fails with `xpi-unreadable` on an HTTP 503 answer for its XPI.
      Its report lists each such repo as refused with that failure name.
- [ ] AC2: `discover()`, run from an empty state, returns a state that
      records a repo whose read fails with `update-json-http-error` on an
      HTTP 404 answer for its `update.json`, and one whose read fails with
      `xpi-unreadable` on an HTTP 404 answer for its XPI, each record
      carrying that failure name.
- [ ] AC3: The comment above `NOT_RECORDED` in `src/discover/discover.ts`,
      the discovery state paragraph in README.md's `pnpm discover`
      section, and the discovery paragraph in cairn/DESIGN.md's
      Architecture state that a refusal caused by an HTTP 429 or 5xx
      answer from a download host is not recorded.
- [ ] AC4: `pnpm test` and `pnpm check` pass.

## Coverage
<!-- owner: plan · create/amend-via-gate -->

- AC1 → T1, T2
- AC2 → T1
- AC3 → T2, T3
- AC4 → T4

## Tasks
<!-- owner: plan (create) / implement (check-off, minor edits); substantive
     change is amend-via-gate. -->

- [x] T1: In "the discovery state" describe of `test/discover.test.ts`
      (near line 196), add a table of four cases built from `pluginRepo`
      with one answer replaced: the `update.json` URL answering 429 or
      404, and the XPI URL answering 503 or 404, each run from an empty
      state. Assert the report's failure name and the state. The status
      range rests on the `buildLevelStatus` test in
      `test/upstream.test.ts` (near line 901), since `draftEntry` only
      forwards the reader's mark. Run them on the unchanged code: the 429
      and 503 cases fail with a record present; the 404 cases pass, as
      controls.
- [x] T2: In `draftEntry` (`src/discover/discover.ts` near line 186),
      pass `recorded` as false when `read.buildLevel` is set. Update the
      comment above `NOT_RECORDED` (near line 18) and on `Drafted` (near
      line 152).
- [x] T3: Update README.md's discovery state paragraph (near line 266)
      and cairn/DESIGN.md's discovery paragraph (near line 291). README
      names the host as "the host of the XPI or the `update.json`". Search
      joined copies of both files for stale wording (lesson M018).
- [x] T4: Run `pnpm test` and `pnpm check`.

## Work log
<!-- owner: any skill · append-only; one line per entry; absolute dates. -->

- 2026-10-27: created by /milestone-plan.
- 2026-10-27: tier check: not run — work named at the question set.
- 2026-10-27: idea vet: one concern. The candidate row retries every download HTTP error, so a repo with a broken `update.json` link (404) would take a read slot every day — answered at the question set: retry only 429 and 5xx answers.
- 2026-10-27: question set: work — "Retry repos refused by a download error"; run on to implement — yes, tested with recorded responses only, no live workflow run.
- 2026-10-27: lessons used: 2026-10-25 (M001) pnpm through npx; 2026-10-26 (M018) search joined copies of wrapped docs.
- 2026-10-27: plan gate chose the reader's build-level mark over a status list kept in discover because the build already treats the same answers as its own fault (D-011); falsified by a download host that answers 429 or 5xx for good, so its repo takes a read slot every run.
- 2026-10-27: collision check: absorbs candidate row "Retry repos refused by a download error" (M008 review); D-011 defines build-level answers and is reused, not changed; M008 shipped the 30-day rule this narrows.
- 2026-10-27: inbox sweep: 0 open issues; 3 open bot PRs (#15, #25, #28) each add a plugin, no overlap.
- 2026-10-27: changelog: none, since the "Unreleased" discovery entry does not describe the state file.
- 2026-10-27: criteria audit (full, fresh Opus reader): 3 findings, all fixed. AC1 claimed no record even where an earlier run's record survives an unrecorded refusal (the code keeps it, and the repo is still read again since its `pushedAt` or age no longer matches), so AC1 and AC2 narrowed to a run from an empty state, with no code change. AC1 and AC2 dropped their test-file clauses, which bound an instrument; T1 holds the cases. One status per URL stands for the 429/5xx family, so T1 cites the existing `buildLevelStatus` range test. README wording note taken into T3.
- 2026-10-27: started on branch m026-retry-download-errors, cut from main at 236a45c.
- 2026-10-27: T1 done: a four-row table in "the discovery state" tests. On the unchanged code the 429 and 503 rows failed with the repo's record present in the state, and the two 404 rows passed.
- 2026-10-27: T2 done: `draftEntry` passes `recorded` false for a reader failure marked build-level; comments on `NOT_RECORDED` and `Drafted` updated. `pnpm test` 685 passed, `pnpm check` 23 entries, 0 problems.
- 2026-10-27: T3 done: README's discovery state paragraph and DESIGN's discovery paragraph name the 429/5xx download answers; joined-copy search of README, DESIGN, and CHANGELOG found no other sentence on which refusals the state keeps. The simple-english hook flagged README lines 94, 357, and 371, which this branch does not touch; left as they are.
- 2026-10-27: T4 done: `pnpm test` 17 files, 685 passed; `pnpm check` 23 entries, 0 problems.

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive. -->
