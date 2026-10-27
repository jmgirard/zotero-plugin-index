<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M020: Answer report issues from two forms

- **Status:** review   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** normal   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** —   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** —   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** user-facing — it adds issue forms and a bot that answers people on GitHub   <!-- owner: plan · create/amend-via-gate; user-facing | internal — <one-clause reason>; skill conduct only — no validate check parses it -->
- **Branch/PR:** m020-report-forms   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

## Goal
<!-- owner: plan · create; a wrong goal returns to plan, never edited in place -->

A person can file a "works" or "broken" report on a plugin through an issue
form, and a bot checks the report, answers it, and closes the issue.

## Scope
<!-- owner: plan · create/amend-via-gate -->

**In:** two issue forms, `.github/ISSUE_TEMPLATE/works.yml` and
`.github/ISSUE_TEMPLATE/broken.yml`. Each form has three required inputs:
`plugin` (the plugin id), `version` (the plugin version), and `zotero` (the
Zotero version). Each form adds the label `report` and the label `works` or
`broken`. `parseReport` in `src/reports/report.ts` reads a report, and the
M021 build uses it too. `pnpm report-issue` reads the issue that
`ISSUE_NUMBER` names, checks it, comments, and closes it.
`.github/workflows/report-issue.yml` runs that command. The repo gets the
four labels `report`, `works`, `broken`, and `not-counted`. README,
CHANGELOG, and DESIGN describe the forms and the bot.

**Out:**
- Counting reports into the data, the counts and links on the plugin pages,
  and the `not-counted` rule → M021.
- A check that the plugin version is the one the index read → M021 counts
  only that version, and the bot's comment says so.
- Reports on a Zotero major above the largest of `ZOTERO_MAJORS` → the bot
  refuses them until `ZOTERO_MAJORS` grows. No row, since this milestone
  promises nothing about them.

## Acceptance criteria
<!-- owner: plan · create/amend-via-gate; review reads, never reinterprets. -->

- [x] AC1: `.github/ISSUE_TEMPLATE/works.yml` and
      `.github/ISSUE_TEMPLATE/broken.yml` each have three required inputs
      with the ids `plugin`, `version`, and `zotero`. Each has the label
      `report`, plus `works` in works.yml or `broken` in broken.yml. A test
      in `test/report.test.ts` reads both files and checks the ids, the
      labels, and that each input's label is the heading that `parseReport`
      reads. GitHub's file view of each form on the milestone branch shows
      the form and no template error.
- [x] AC2: `gh label list --repo jmgirard/zotero-plugin-index` lists the
      labels `report`, `works`, `broken`, and `not-counted`.
- [x] AC3: For a valid report from either form, `parseReport(body, labels,
      ids)` in `src/reports/report.ts` returns the plugin id, the plugin
      version, the Zotero major as an integer, and the verdict. For each case
      below, it returns a named problem, and a test in `test/report.test.ts`
      shows the case:
      - a missing heading, for each of the three inputs;
      - the answer `_No response_`, for each of the three inputs;
      - a plugin id that is not in `ids`;
      - a plugin version longer than 100 characters, and one that holds
        whitespace;
      - a Zotero version with no number, one whose first number is below 7,
        and one whose first number is above the largest of `ZOTERO_MAJORS`;
      - a label set with both `works` and `broken`, and one with neither.
- [x] AC4: `pnpm report-issue` with `ISSUE_NUMBER` set reads that issue from
      the GitHub API and the entry ids under `plugins/`. For a valid report,
      it posts one comment that names the plugin, the plugin version, the
      Zotero major, and the verdict. The comment also says that the report
      counts only while the index reads that plugin version. Then it closes
      the issue as completed. For an invalid report, it posts one comment
      that names the problem, then closes the issue as not planned. Each
      value taken from the issue appears in the comment inside a code span
      that `code()` from `src/discover/propose.ts` makes. If the issue read
      or the entry-id read fails, it sends no comment and no close and exits
      1. If the comment request fails, it sends no close and exits 1. If the
      close request fails, it exits 1. Tests with recorded responses show
      each of these paths, and one test uses a plugin version that holds a
      backtick and a Markdown link.
- [x] AC5: `.github/workflows/report-issue.yml` runs on `issues: opened`,
      and its one job runs only for an issue with the label `report`. The
      job's permissions are `contents: read` and `issues: write` and no
      others. The job sets `cache-mode: none`, and no line sets a `cache` key
      or uses `actions/cache`. The workflow sets no `concurrency` key.
      `ISSUE_NUMBER` reaches the command through `env:`. No `${{ }}`
      expression in the file names a `github.event.issue` field other than
      `number` and `labels`. A test in `test/workflows.test.ts` checks each
      of these facts in the file's text.
- [x] AC6: README gains a section on reporting whether a plugin works. It
      states the checks of AC3 and the two answers of AC4. The Unreleased
      section of `CHANGELOG.md` gains one entry for the report forms and the
      bot. DESIGN.md's Function Families and Architecture sections name
      `src/reports/`, `pnpm report-issue`, and `report-issue.yml`.
- [x] AC7: `pnpm test` (type check, then Vitest) and `pnpm check` pass.

## Coverage
<!-- owner: plan · create/amend-via-gate -->

- AC1 → T2
- AC2 → T1
- AC3 → T3
- AC4 → T4
- AC5 → T5
- AC6 → T6
- AC7 → T2, T3, T4, T5, T6

## Tasks
<!-- owner: plan (create) / implement (check-off, minor edits) -->

- [x] T1: Create the labels `report`, `works`, `broken`, and `not-counted`
      on the repo with `gh label create`, each with a one-line description.
      The forms add a label only when it exists (LESSONS, M010).
- [x] T2: Write `works.yml` and `broken.yml`, and the test of their ids,
      labels, and headings. After the branch is pushed, open each form's
      GitHub file view on the branch in the built-in browser and look for a
      template error.
- [x] T3: Write the tests of `parseReport`, then `src/reports/report.ts`.
      The Zotero bound reads `ZOTERO_MAJORS` from `src/site/version.ts`.
- [x] T4: Write the tests of the command against recorded responses, then
      the command and its `package.json` script. Reuse `githubClient` and
      `code()`.
- [x] T5: Write `report-issue.yml` and its checks in
      `test/workflows.test.ts`, reusing the `cacheLines` and `jobText`
      helpers.
- [x] T6: Write the README section, the CHANGELOG entry, and the DESIGN
      paragraphs. Search joined copies of the files for the old and new
      phrases (LESSONS, M018).

## Work log
<!-- owner: any skill · append-only; one line per entry; absolute dates. -->

- 2026-10-27: created by /milestone-plan.
- 2026-10-27: tier check: milestone — a new feature with design choices: two issue forms, a bot, and a new data field.
- 2026-10-27: idea vet: three concerns, each answered at the question set. Which plugin version a report counts for: only the version the index read. Repeated reports from one account: one per account per plugin and Zotero major, the newest. Where reports live: the build reads the issues the bot closed as completed, and no file is written per report (D-013).
- 2026-10-27: feature series: M020 -> M021. M020 writes the series' one CHANGELOG entry, since the forms are visible in GitHub's issue chooser once merged, and M021 edits it.
- 2026-10-27: question set: live steps — the user allowed creating the labels `report`, `works`, `broken`, and `not-counted`. After the merge, the user files one test report from a prefilled link, and the agent checks the bot's comment and close.
- 2026-10-27: question set: nearby rows — the user added the three "Add a plugin" bot rows as M022, which has no dependency on this series.
- 2026-10-27: criteria audit (full, run over M020 and M021 together): 19 findings, all taken. For M020: labels as a criterion, GitHub's form preview, each input tested missing and `_No response_`, an upper Zotero bound, six command paths, code spans for issue text, a comment that names the version rule, the D-010 cache rule, and a wider ban on event fields.
- 2026-10-27: plan gate chose two forms, one per verdict, over one form with a verdict dropdown, because the verdict then comes from a label that only the form or a maintainer sets, and each page link is one click; falsified by evidence that reporters often pick the wrong form.
- 2026-10-27: plan gate chose one job with `contents: read` and `issues: write` over the read and write jobs of the "Add a plugin" workflow, because this job reads no plugin repo, only the issue and the entry ids; falsified by evidence that the job must read content from outside the index repo.
- 2026-10-27: collision check: the candidate row "Collect works and broken user reports" is absorbed by M020 and M021. No D-entry or archived milestone covers reports. Inbox: 0 open issues, 6 open bot pull requests, none overlapping.
- 2026-10-27: lessons used: 2026-10-26 (M010) labels must exist, 2026-10-25 (M002) recorded responses, 2026-10-25 (M001) pnpm through npx, 2026-10-26 (M018) search joined text.
- 2026-10-27: implement started on branch m020-report-forms, cut from main at 972649c.
- 2026-10-27: T1 done: created the labels `report`, `works`, `broken`, and `not-counted` with `gh label create`; `gh label list` shows all four.
- 2026-10-27: T2 done: `works.yml` and `broken.yml`, with the input labels "Plugin id", "Plugin version", and "Zotero version", titles "Report: works" and "Report: broken". GitHub's file view of both on the branch at d4a2e5d shows the form preview and no template error.
- 2026-10-27: T3 done: `parseReport` returns the first problem it finds, in input order and then plugin id, version, Zotero version, verdict; problem names `missing-heading`, `no-response`, `unknown-plugin`, `bad-plugin-version`, `bad-zotero-version`, `bad-verdict`. A planted removal of the upper Zotero bound failed exactly the "above the newest major" test. 514 tests pass, `pnpm check` 0 problems.
- 2026-10-27: T4 done: `answerReport` in `src/reports/issue.ts` and `pnpm report-issue` (`src/reports/issue-cli.ts`). It reads the entry ids with its own `readdir`, because `listEntries` returns an empty list for a missing directory, which would refuse every report as an unknown plugin. Seven in-process tests and two spawned-command tests; 523 tests pass.
- 2026-10-27: T5 done: `.github/workflows/report-issue.yml` ("Answer a report", job `answer`) and six checks in `test/workflows.test.ts`, with a new `otherEventUses` matcher tested on the body, the title, an index form, and the whole event. A planted `pull-requests: write` and a planted `concurrency` key each failed their test.
- 2026-10-27: T6 done: README section "Reporting whether a plugin works", one CHANGELOG Unreleased bullet, and DESIGN's Function Families and Architecture entries. The form text and the bot's comment now state the counting rule without saying that the daily build counts reports, since nothing counts them until M021; M021's docs task adds that claim.
- 2026-10-27: claim audit: 45 claims read, 6 corrected — .github/ISSUE_TEMPLATE/works.yml, broken.yml, src/reports/issue.ts, README.md (counting rule now in future tense), test/report.test.ts (test name), .github/workflows/report-issue.yml (two comments), src/reports/report.ts (an unknown id is quoted to 100 characters, with a test). The re-read found all six true.
- 2026-10-27: implement done; status review. 531 tests pass, `pnpm check` 0 problems. M021's docs and forms text must change "will count" to the present tense once counting ships.
- 2026-10-27: step-7 approval: m020-report-forms approved for merge

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive -->

Evidence gathered 2026-10-27 on branch m020-report-forms; main had not moved since the cut.

- AC1: `test/report.test.ts` "the report forms" passes for works.yml and broken.yml (ids `plugin`, `version`, `zotero`, each `required: true`, labels `["report", "works"]` / `["report", "broken"]`, each label the heading `parseReport` reads). GitHub's file view of both forms on the branch at d4a2e5d showed the form preview (name, about, labels `report,works` / `report,broken`, three required inputs) and no template error. `git diff d4a2e5d HEAD -- .github/ISSUE_TEMPLATE` changes only the markdown block's text, no key.
- AC2: `gh label list --repo jmgirard/zotero-plugin-index` lists `broken`, `not-counted`, `report`, and `works`.
- AC3: `test/report.test.ts` "parseReport" passes 16 tests: a valid report from each form (verdict `works` and `broken`, major 7 and 10); `missing-heading` and `no-response` for each of `plugin`, `version`, `zotero`; `unknown-plugin`; `bad-plugin-version` for 101 characters and for "1.2 beta" (100 characters taken); `bad-zotero-version` for "latest", "6.0.30", "11.0"; `bad-verdict` for both labels and for neither. Each asserts the problem name.
- AC4: `test/report.test.ts` "answering a report issue" passes 7 tests and "pnpm report-issue" 2 spawned tests: a valid report gets one comment holding `code()` spans of the id, version, and major, the verdict, and "only while it reads that plugin version", then PATCH `completed`; an unknown plugin gets `` `unknown-plugin` `` and the coded message, then PATCH `not_planned`; a version with a backtick and a Markdown link appears only inside its code span; a 503 issue read and a missing `plugins/` send nothing with status 1; a failed comment sends no PATCH with status 1; a failed close gives status 1 in-process and exit 1 from `pnpm report-issue`, whose valid run exits 0.
- AC5: `test/workflows.test.ts` "report-issue.yml" passes 8 tests: trigger `issues: types: [opened]` only, one job `answer` with `if: contains(github.event.issue.labels.*.name, 'report')`; top-level `permissions: {}` and job permissions exactly `contents: read`, `issues: write`; `cache-mode: none`, no cache line, no `concurrency` line; `ISSUE_NUMBER` under `env:`; `otherEventUses` finds no other `github.event` use, and finds the body, the title, an index form, and the whole event in planted lines. Implement's plants of `pull-requests: write` and a `concurrency` key each failed their test.
- AC6: README's new section "Reporting whether a plugin works" lists the five checks of AC3 (fields, entry id, version length and spaces, Zotero major range from `ZOTERO_MAJORS`, one verdict label) and both answers of AC4 (comment and close as completed; problem comment and close as not planned). `CHANGELOG.md` Unreleased gains one bullet, "Two issue forms take reports …". DESIGN.md's Function Families gains "Reports (`src/reports/`)" and its Architecture list a paragraph naming `report-issue.yml` and `pnpm report-issue`.
- AC7: `pnpm test` passes, type check then Vitest, 15 files and 531 tests; `pnpm check` reports 20 entries, 0 problems.
- Consistency gate: `cairn_validate.py` all checks passed, exit 0. No DESIGN principle changed, so no impact report. The generic profile names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- prior-review #1: a failed issue or `plugins/` read sends nothing, unlike the "Add a plugin" bot's "could not finish" comment — follow-up "Answer report issues left open"
- prior-review #2: the workflow has not run live — reject, planned change: the question set put the live test after the merge
- prior-review #3: forms and comment promise counts that M021 builds — reject, planned change: M021's work log holds the tense change
- prior-review #4: a 10-minute timeout leaves a report unanswered — follow-up "Answer report issues left open"
- prior-review #5: a rerun after a failed close comments twice — follow-up "Answer report issues left open"
- prior-review #6: two lines over 120 characters — reject, style
- ripple #1: DESIGN item 4 said reports were not built — fix now, fixed 23b8cd3
- ripple #2: DESIGN said a bot adds each report to the data, against D-013 — fix now, fixed 23b8cd3
- ripple #3: DESIGN said each bot workflow runs in two jobs — fix now, fixed 23b8cd3
- ripple #4: the banked "one click and one typed field" principle needs the prefilled links — reject, planned change: M021's links fill two of the three fields
- ripple #5: no link prefills the forms yet — reject, planned change: M021 AC5
- ripple #6: `vitest.config.ts` comment omitted the report tests — fix now, fixed 23b8cd3
- ripple #7: DESIGN's sentence on `test/workflows.test.ts` named only `build.yml` — fix now, fixed 23b8cd3
- ripple #8: README lacked the missing-label caveat for the report forms — fix now, fixed 23b8cd3
- ripple #9: the CHANGELOG bullet omits the failure cases README states — reject, false: the bullet states the normal path and contradicts nothing
- ripple #10: the candidate row still describes the old plan — reject, planned change: the row graduates at M021's hygiene, and its token names M020
- diff-bug #1: "closed as completed" does not show the bot closed the issue, since an author can close their own — follow-up "Count only reports the bot closed"
- diff-bug #2: a failed close leaves an open issue with a "took this report" comment, and a rerun comments twice — follow-up "Answer report issues left open"
- diff-bug #3: a `report` label added after opening never gets an answer — follow-up "Answer report issues left open"
- diff-bug #4: the bot's close can overwrite an author's close — follow-up "Count only reports the bot closed"
- diff-bug #5: `otherEventUses` stopped at the first `}`, missed `github['event']` and `toJSON(github)` — fix now, fixed 23b8cd3
- diff-bug #6: the trigger test let a second trigger pass — fix now, fixed 23b8cd3
- diff-bug #7: report floods spend the shared API budget and can make the issue read fail — follow-up "Limit floods of report issues"
- diff-bug #8: the refusal repeated up to 100 characters of reporter text under the bot's name — fix now, fixed 23b8cd3: the message quotes no issue text
- diff-bug #9: the Zotero message said "start with a major" but the code reads the first number — fix now, fixed 23b8cd3
- diff-bug #10: the id match is case-sensitive — reject, edge: a hand-typed id in another case, outside common use once M021's links fill the id; the effect is a refusal that names the problem
- diff-bug #11: the id cut could split a character — fix now, fixed 23b8cd3: no cut remains
- diff-bug #12: a broken report read "version `x` broken" — fix now, fixed 23b8cd3: "is broken"
- diff-bug #13: a label with no name put `undefined` in `labels` — fix now, fixed 23b8cd3
- diff-bug #14: actions pinned by tag — reject, style: every workflow in the repo does the same
- diff-bug #15: printing the comment relies on `code()` — reject, false: each value sits mid-line in a code span and `code()` folds newlines
- diff-bug #16: the spawned test took the first name in `plugins/`, file or not — fix now, fixed 23b8cd3
- diff-bug #17: a test name mentions a pill — reject, style
- diff-bug (c): three same-path heading tests, a spawned test that repeats an in-process one, matcher rows, a loose `toContain` — reject, planned change: AC3 names each input, the spawned test shows the exit code, and the rows show the matcher can fail
- blame-history #1: silent failure departs from the "Add a plugin" bot's comment-on-failure rule — follow-up "Answer report issues left open"
- blame-history #2: DESIGN item 4 contradicted D-013 — fix now, fixed 23b8cd3
- blame-history #3: three typed fields with no prefill — reject, planned change: M021 AC5
- blame-history #4: the issue body reaches a job holding `issues: write`, unlike the M011 split — reject, planned change: the plan gate chose one job, and its work-log line names the alternative
- blame-history #5: the id match is case-sensitive — reject, edge: as diff-bug #10
- blame-history #6: an `if:` value without braces was not scanned — fix now, fixed 23b8cd3
- blame-history #7: `indexed` treats a missing `plugins/` as empty for the "Add a plugin" bot, a gap from before this diff — follow-up "Fail issue runs with no plugins folder"
- blame-history #8: a rerun comments twice and nothing retries a failed close — follow-up "Answer report issues left open"
- Settled: 42 lines; 16 fixed on the branch at 23b8cd3, 11 follow-up into four new rows, 15 rejected (2 edge). None shows a criterion failing, so no return. After the fixes: 537 tests pass, `pnpm check` 0 problems; a planted second trigger failed the trigger test.
