<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M020: Answer report issues from two forms

- **Status:** in-progress   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
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

- [ ] AC1: `.github/ISSUE_TEMPLATE/works.yml` and
      `.github/ISSUE_TEMPLATE/broken.yml` each have three required inputs
      with the ids `plugin`, `version`, and `zotero`. Each has the label
      `report`, plus `works` in works.yml or `broken` in broken.yml. A test
      in `test/report.test.ts` reads both files and checks the ids, the
      labels, and that each input's label is the heading that `parseReport`
      reads. GitHub's file view of each form on the milestone branch shows
      the form and no template error.
- [ ] AC2: `gh label list --repo jmgirard/zotero-plugin-index` lists the
      labels `report`, `works`, `broken`, and `not-counted`.
- [ ] AC3: For a valid report from either form, `parseReport(body, labels,
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
- [ ] AC4: `pnpm report-issue` with `ISSUE_NUMBER` set reads that issue from
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
- [ ] AC5: `.github/workflows/report-issue.yml` runs on `issues: opened`,
      and its one job runs only for an issue with the label `report`. The
      job's permissions are `contents: read` and `issues: write` and no
      others. The job sets `cache-mode: none`, and no line sets a `cache` key
      or uses `actions/cache`. The workflow sets no `concurrency` key.
      `ISSUE_NUMBER` reaches the command through `env:`. No `${{ }}`
      expression in the file names a `github.event.issue` field other than
      `number` and `labels`. A test in `test/workflows.test.ts` checks each
      of these facts in the file's text.
- [ ] AC6: README gains a section on reporting whether a plugin works. It
      states the checks of AC3 and the two answers of AC4. The Unreleased
      section of `CHANGELOG.md` gains one entry for the report forms and the
      bot. DESIGN.md's Function Families and Architecture sections name
      `src/reports/`, `pnpm report-issue`, and `report-issue.yml`.
- [ ] AC7: `pnpm test` (type check, then Vitest) and `pnpm check` pass.

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
- [ ] T2: Write `works.yml` and `broken.yml`, and the test of their ids,
      labels, and headings. After the branch is pushed, open each form's
      GitHub file view on the branch in the built-in browser and look for a
      template error.
- [ ] T3: Write the tests of `parseReport`, then `src/reports/report.ts`.
      The Zotero bound reads `ZOTERO_MAJORS` from `src/site/version.ts`.
- [ ] T4: Write the tests of the command against recorded responses, then
      the command and its `package.json` script. Reuse `githubClient` and
      `code()`.
- [ ] T5: Write `report-issue.yml` and its checks in
      `test/workflows.test.ts`, reusing the `cacheLines` and `jobText`
      helpers.
- [ ] T6: Write the README section, the CHANGELOG entry, and the DESIGN
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

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive -->
