<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M028: Keep issues open on entry write errors

- **Status:** review   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** normal   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** —   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** —   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** user-facing — it changes how the "Add a plugin" bot answers and closes issues that people open   <!-- owner: plan · create/amend-via-gate; user-facing | internal — <one-clause reason>; skill conduct only — no validate check parses it -->
- **Branch/PR:** m028-entry-write-errors   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

## Goal
<!-- owner: plan · create; a wrong goal returns to plan, never edited in place -->

The "Add a plugin" bot leaves an issue open, and its run fails, when the bot cannot write the entry it drafted for the plugin.

## Scope
<!-- owner: plan · create/amend-via-gate -->

**In:** `draftEntry` in `src/discover/discover.ts` marks a `writeEntry`
refusal other than `unsafe-id` (an `entry-exists` from the output directory,
or `write-failed`) as `buildLevel`, so `readOutcome` in
`src/discover/issue.ts` turns it into the `failed` outcome. Tests in
`test/issue.test.ts`. The README, CHANGELOG, DESIGN, and code comments that
state the rule.

**Out:** The discover run's recording rule does not change. The refusals
that say the plugin's id is taken (by an entry in the index or by an open
bot pull request, in the read step or the write step) stay refusals that
close the issue. Other issue-run gaps stay with the rows "Answer issues whose
run was canceled", "Make close-issue safe on retry and races", and "Answer
report issues left open".

## Acceptance criteria
<!-- owner: plan · create/amend-via-gate; review reads, never reinterprets. -->

- [x] AC1: In an issue run where the read step's `writeEntry` finds the
      plugin's entry directory already in the output directory
      (`entry-exists`), the read step's outcome is `failed` with the failure
      `entry-exists`, the bot posts one comment, which starts "The bot could
      not finish" and holds `` `entry-exists` ``, sends no close request, and
      `issueAnswer` returns status 1. A test in `test/issue.test.ts` shows
      each of these.
- [x] AC2: AC1 holds with `write-failed` in place of `entry-exists` for an
      issue run whose output directory lies under a regular file, so it
      cannot be made (`ENOTDIR`). A test in `test/issue.test.ts` shows it.
- [x] AC3: An issue run still comments the failure name and closes the issue
      as not planned, with status 0, for an `entry-exists` refusal from the
      read step because the index already has an entry with the plugin's id,
      and for an `unsafe-id` refusal. A test in `test/issue.test.ts` shows
      each case.
- [x] AC4: A discover run still keeps no state record for a repo refused with
      `entry-exists` because its entry directory is already in the output
      directory, and still keeps one for a repo refused because the index
      already has its plugin id, as the tests "does not record a repo whose
      entry directory already exists in the output directory" and "reports
      each repo it reads as written or with its failure name" in
      `test/discover.test.ts` show.
- [x] AC5: `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check` exit 0.
- [x] AC6: Each sentence on how the issue run answers, or on what
      `buildLevel` marks, that this search finds agrees with AC1 to AC3. For
      each of `README.md`, `CHANGELOG.md`, `cairn/DESIGN.md`, and
      `src/discover/*.ts`, join the file's lines with spaces, split the text
      into sentences at each `. `, and `grep -n` the sentences for
      `write the entry`, `entry-exists`, `write-failed`, `not planned`,
      `could not finish`, `stays open`, `leaves the issue open`,
      `buildLevel`, `build-level`, and `draftEntry refuses`.

## Coverage
<!-- owner: plan · create/amend-via-gate; each acceptance criterion → the task(s) satisfying it, by positional number. -->

- AC1 → T1, T2
- AC2 → T1, T2
- AC3 → T1
- AC4 → T2, T4
- AC5 → T4
- AC6 → T2, T3

## Tasks
<!-- owner: plan (create) / implement (check-off, minor edits); substantive change is amend-via-gate. -->

- [x] T1: In `test/issue.test.ts`, rewrite the test at about line 157 to
      expect AC1's answer, and add tests for AC2 and AC3 (for AC3, a plugin
      id that `test/fixtures/build/plugins` already has with `root: TREE`,
      and an id such as `../unsafe`). Run them and see the AC1 and AC2 tests
      fail on the current code.
- [x] T2: In `draftEntry` (`src/discover/discover.ts:197`), pass
      `buildLevel` for a `writeEntry` refusal other than `unsafe-id`, and keep
      `recorded` as it is. Update the comments on `Drafted`, on `draftEntry`,
      on `issueRead` and `issueAnswer` in `src/discover/issue.ts`, and on the
      handoff's `failed` outcome (`src/discover/handoff.ts:37`).
- [x] T3: Update README.md's issue-run paragraphs (about lines 369 and 375),
      the CHANGELOG's Unreleased "Add a plugin" entry (about line 69), and
      DESIGN.md's discover text (about line 165). Run AC6's search and fix
      each sentence it finds that disagrees.
- [x] T4: Run `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check`.

## Work log
<!-- owner: any skill · append-only; one line per entry; absolute dates. -->

- 2026-10-27: created by /milestone-plan.
- 2026-10-27: tier check: not run — work named at the question set.
- 2026-10-27: question set: what to work on — the candidate row "Keep issues open on entry write errors"; how far to run — plan and implement, stopping at the merge question.
- 2026-10-27: idea vet: no concerns; a leftover output directory or a failed write is the bot's fault, the submitter gains an open issue for a maintainer, and the row's title names the change.
- 2026-10-27: collision check: candidate row "Keep issues open on entry write errors" absorbed (from the M022 plan audit); M019 left output-directory refusals unchanged as a deferral, not a rejection; no D-entry bears on it. Inbox sweep: 0 open issues, 0 open PRs.
- 2026-10-27: plan gate chose the `buildLevel` mark in `draftEntry` over matching failure names in `readOutcome`, because the index-id refusal shares the name `entry-exists`, and over a new field, because `buildLevel` already marks a refusal that points at the bot; falsified by a reader of `buildLevel` other than `readOutcome` and the recording rule.
- 2026-10-27: criteria audit (full, fresh Opus reader): AC1, AC4, AC5 no finding. AC2 named one `write-failed` source with no setup; narrowed to an output directory under a regular file. AC3 omits the open-PR id refusal; kept narrow, that path is untouched, and Scope Out states it. AC6's joined-file grep printed whole files and missed `buildLevel` comments; it now splits sentences, joins the `.ts` files, and adds three terms. The write step's id refusals stay refusals; Scope Out states it.
- 2026-10-27: lessons used: 2026-10-25 (M001) pnpm through npx, 2026-10-26 (M018) search a joined copy, 2026-10-26 (M010) copy before planting a defect, 2026-10-27 (M027) run vitest directly for non-spawn files.
- 2026-10-27: changelog: edit the Unreleased "Add a plugin" entry, which lists the bot failures that leave the issue open, rather than add an entry.
- 2026-10-27: implement: branch m028-entry-write-errors cut from main at a26f530; status in-progress.
- 2026-10-27: T1 done: the test that pinned the close became a two-case table (output-directory `entry-exists`, `write-failed` under a regular file), red on main because the outcome was `refused`, not `failed`; a new two-case table (index id clash, `../unsafe`) passes on main and after. T1 and T2 share one checkpoint, since T1's tests are red until T2.
- 2026-10-27: T2 done: `draftEntry` passes `buildLevel` for a `writeEntry` refusal other than `unsafe-id`, `recorded` unchanged; comments on `Drafted`, `issueRead`, `readOutcome`, `issueAnswer`, and the handoff's `failed` outcome updated. `pnpm test` 711 passed, `pnpm check` 28 entries, 0 problems.
- 2026-10-27: T3 done: README's refusal paragraph names the id refusals in place of "fail to write the entry", and its bot-failure paragraph names `entry-exists` and `write-failed`; the CHANGELOG "Add a plugin" entry and DESIGN's discover text gain the write failure. AC6 search (scratchpad script, 58 sentences): every hit on the issue run agrees with AC1 to AC3. The simple-english hook flags README lines 94 and 389 and CHANGELOG line 170, all older text this change does not touch; left as they are.
- 2026-10-27: T4 done: `npx -y pnpm@12.15.0 test` 17 files, 711 passed; `npx -y pnpm@12.15.0 check` 28 entries, 0 problems.
- 2026-10-27: claim audit: 18 claims read, 7 corrected — README.md, cairn/DESIGN.md, src/discover/handoff.ts, src/discover/issue.ts, test/issue.test.ts. Four comments said "cannot be written", which also reads as `unsafe-id`, and now name `entry-exists` and `write-failed`; README names the check among failures whose name the comment gives; DESIGN "as do"; the AC1/AC2 test checks the message in the comment body. The same reader re-read the 7 once and found them true. After the fixes `pnpm test` 711 passed and `pnpm check` 0 problems (commit bbd5707).
- 2026-10-27: implement complete; status review.

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive. -->

Pass 1, 2026-10-27, at 45e7efa. Sync: main at a26f530, not moved; no PR; Copilot round off.

- AC1: `vitest run test/issue.test.ts` "…leaves the issue open, and returns 1 when writeEntry finds the entry directory" passes: outcome `failed` with `entry-exists` and the "already exists" message, one POST whose body starts "The bot could not finish" and holds `` `entry-exists`: ` `` with the message, no PATCH, status 1. Red on main at T1 (outcome `refused`).
- AC2: the same table's case "…when the output directory cannot be made" (outDir under a regular file) passes: outcome `failed` with `write-failed` and "cannot create … ENOTDIR", one "could not finish" comment with `` `write-failed`: ` `` and ENOTDIR, no PATCH, status 1. Red on main at T1.
- AC3: "…closes the issue as not planned when an entry has the plugin's id" (`example/clash` with `second-plugin@example.org`, `root: TREE`) and "…when the plugin's id cannot name a directory" (`../unsafe`) pass: outcome `refused` with `entry-exists` / `unsafe-id`, a "no pull request" comment naming the failure, PATCH `not_planned`, status 0. Planted defect (pass `buildLevel` true for `unsafe-id` too, from a copy, restored) turned the `unsafe-id` case red and left the id-clash case green, as its path is untouched.
- AC4: `test/discover.test.ts` "does not record a repo whose entry directory already exists in the output directory" (state for `example/alpha` undefined) and "reports each repo it reads as written or with its failure name" (state keys `example/clash`, `example/no-release`, `example/unsafe`) pass unchanged.
- AC5: at 45e7efa, `npx -y pnpm@12.15.0 test` exit 0, 17 files, 711 passed; `npx -y pnpm@12.15.0 check` exit 0, 28 entries, 0 problems.
- AC6: the AC6 search (join, split at `. `, `grep -n` the ten terms over README, CHANGELOG, DESIGN, `src/discover/*.ts`) at 45e7efa returns 58 sentences. Each on how the issue run answers or what `buildLevel` marks agrees with AC1 to AC3: README's id refusals and not-build-level reads close; the bot-failure paragraph names `entry-exists` and `write-failed` and leaves the issue open; CHANGELOG's entry gains the write failure; DESIGN "as do … (M028)"; the `Drafted`, `draftEntry`, `readOutcome`, `issueRead`, `issueAnswer`, and handoff comments name `entry-exists` in outDir and `write-failed`. The rest are about the data build, reports, close-issue, or the add-plugin CLI.
- Gate: `cairn_validate.py` exit 0, all checks passed; no DESIGN principle changed, so `cairn_impact` skipped; generic profile names no toolchain checks.
