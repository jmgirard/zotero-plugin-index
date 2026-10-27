<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M021: Show report counts on the plugin pages

- **Status:** in-progress   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** normal   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** M020   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** —   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** user-facing — it changes the published data and the plugin pages   <!-- owner: plan · create/amend-via-gate; user-facing | internal — <one-clause reason>; skill conduct only — no validate check parses it -->
- **Branch/PR:** m021-report-counts   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

## Goal
<!-- owner: plan · create; a wrong goal returns to plan, never edited in place -->

Each plugin page shows how many "works" and "broken" reports the version the
index read has on each Zotero major, with links that open the report forms
already filled in.

## Scope
<!-- owner: plan · create/amend-via-gate -->

**In:** `countReports` in `src/reports/`. The build reads the report issues
before any plugin read and writes an optional `reports` field on each record
of schema v1 (D-006, D-007). A failed read of the report issues withholds
the deploy (D-013). The build job of `build.yml` gains `issues: read`. Each
plugin page shows the counts and the "Works" and "Broken" links. README,
the series' CHANGELOG entry, and DESIGN follow, with a Known issues entry on
throwaway accounts.

**Out:**
- Reports on plugin versions the index no longer reads stay in their issues
  and leave the data. The question set chose this, so no row.
- Report counts on the home list. Nobody asked for them, so no row.
- Loading plugins in a headless Zotero → the parked candidate "Test plugins
  load in headless Zotero", whose promotion condition this series meets.

## Acceptance criteria
<!-- owner: plan · create/amend-via-gate; review reads, never reinterprets. -->

- [ ] AC1: `countReports` in `src/reports/` takes the report issues and the
      build's records and returns, for each record, the works and broken
      counts on each Zotero major. It first drops pull requests, issues not
      closed as completed, issues whose `closed_by` is null or absent or has
      a login other than `github-actions[bot]`, issues with the label
      `not-counted`, issues that `parseReport` refuses, and reports whose
      plugin version differs from the record's `upstream.version`. Then, of
      one account's remaining reports on one plugin and Zotero major, with
      the account known by `user.id`, the newest by `created_at` counts, and
      the higher issue number wins a tie. Tests in `test/report.test.ts` show
      each drop, the `closed_by` drop for a person's login and for a null
      `closed_by`, and these cases: one account's reports on two majors both count, one
      account's reports on two plugins both count, two accounts on one plugin
      and major both count, the newest report decides when an older one has
      the other verdict, and an account whose newest report is dropped keeps
      its older remaining report.
- [ ] AC2: `pnpm build` reads the report issues before any plugin read. It
      reads every page of the issue list with `labels=report` and
      `state=closed`, from the repo that `GITHUB_REPOSITORY` names, or from
      `jmgirard/zotero-plugin-index` when that variable is unset. It writes
      `reports` on each record that has `upstream`: one item
      `{ zoteroMajor, works, broken }` for each Zotero major with at least
      one counted report, ordered by major, and an empty array when none
      counts. `schemas/plugins.v1.schema.json` defines `reports` as an
      optional record field. Its items require `zoteroMajor` (an integer, at
      least 7) and `works` and `broken` (integers, at least 0), and allow no
      other fields. A test in `test/build.test.ts` builds a fixture whose
      report issues span two pages linked by `rel="next"`. It checks that
      the first request is the issue list, that the list requests carry
      `labels=report` and `state=closed`, the written `reports`, and that the
      output passes the schema.
- [ ] AC3: If the build's read of the report issues fails, `pnpm build`
      prints a line that names the failure, writes no `v1/plugins.json`, and
      exits 1. Tests in `test/build.test.ts` show this for an HTTP 503
      answer, a rejected fetch, a second page that fails after the first
      succeeds, and an answer whose body is not a list.
- [ ] AC4: The build job of `.github/workflows/build.yml` holds
      `issues: read` beside `contents: read`, and a test in
      `test/workflows.test.ts` checks it.
- [ ] AC5: The page of a record that has `upstream` shows, under the version
      pills, the version the index read and either the works and broken
      counts of each item in `reports` or a line saying that version has no
      reports yet. It also shows a "Works" link and a "Broken" link. Each
      link opens `https://github.com/jmgirard/zotero-plugin-index/issues/new`
      with `template=works.yml` or `template=broken.yml`, and with the query
      fields `plugin` and `version` set to the record's id and
      `upstream.version`, URL-encoded. A record that has `upstream` and no
      `reports` field shows the no-reports line and the links. The page of a
      record with `failure` shows neither the counts nor the links.
      `test/site.test.ts` shows each case with fixture records: one with
      reports, one with an empty `reports`, one with no `reports` field, one
      whose id and version need URL encoding, and one with `failure`.
- [ ] AC6: README's "Using the data" section defines `reports` with the rule
      of AC1, and says the count follows each issue's current text. README's
      "The site" section names the counts and the links. The CHANGELOG entry
      that M020 added also covers the counts, the links, and the new optional
      field, and says that a consumer who validates against a saved copy of
      the schema must fetch it again. DESIGN.md's item 4 under "Data sources
      and contribution" describes reports as built: two forms, a bot that
      answers and closes each report, and a daily build that counts the
      closed issues. DESIGN.md's Contract boundary, Function Families, and
      `build.yml` paragraph name the `reports` field and the build's issue
      read. Its Known issues section gains an entry: throwaway accounts can
      inflate the counts, and the maintainer removes abuse one issue at a
      time with the label `not-counted`.
- [ ] AC7: `pnpm test` (type check, then Vitest) and `pnpm check` pass.

## Coverage
<!-- owner: plan · create/amend-via-gate -->

- AC1 → T1
- AC2 → T2
- AC3 → T2
- AC4 → T3
- AC5 → T4
- AC6 → T5
- AC7 → T1, T2, T3, T4, T5

## Tasks
<!-- owner: plan (create) / implement (check-off, minor edits) -->

- [x] T1: Write the tests of `countReports`, then the function, reusing
      `parseReport` from M020.
- [x] T2: Read the report issues in `buildData` before the plugin reads,
      add `reports` to the records and the schema, and add the CLI's failure
      line and exit. Add recorded responses for the issue list to the build
      fixtures, since every build now reads it (LESSONS, M002).
- [ ] T3: Add `issues: read` to `build.yml` and its check to
      `test/workflows.test.ts`.
- [ ] T4: Add the report block to the plugin page template and the site
      fixture records, then the site tests. Match attribute forms such as
      `data-fact="reports"` (LESSONS, M007). View the built site through a
      local server (LESSONS, M015).
- [ ] T5: Write the README, CHANGELOG, and DESIGN text. Search joined copies
      of the files for the old and new phrases (LESSONS, M018).

## Work log
<!-- owner: any skill · append-only; one line per entry; absolute dates. -->

- 2026-10-27: created by /milestone-plan.
- 2026-10-27: feature series: M020 -> M021. This milestone edits the CHANGELOG entry that M020 adds.
- 2026-10-27: criteria audit (full, run over M020 and M021 together): 19 findings, all taken. For M021: the drop and pick order of the count, `user.id` over the login, cases on each axis of the count, closed-as-completed issues only, a full item schema, the source of the repo name, page and state probes, a page-2 failure, the deploy rule as a new decision (D-013), a record with no `reports` field, wider DESIGN text, and a Known issues entry. Deleted GitHub accounts all appear as one "ghost" account, so their reports count once per plugin and major.
- 2026-10-27: plan gate chose the build reading closed report issues over a bot commit per report and a pull request per report (D-013); falsified by evidence that the issue read fails often enough to withhold deploys, or that reporters edit closed reports to move counts.
- 2026-10-27: plan gate chose withholding the deploy on any failed issue read over deploying without counts, because a deploy without counts would empty every page's reports for a day; falsified by evidence that the read fails for reasons the maintainer cannot fix, such as a long GitHub outage.
- 2026-10-27: note from M020's claim audit: the report forms' markdown, the bot comment in `src/reports/issue.ts`, and README "Reporting whether a plugin works" say the index "will count" reports; when counting ships here, T5 puts them in the present tense.
- 2026-10-27: note from M020's review: the candidate "Count only reports the bot closed" shows that AC1's "closed as completed" also takes issues their authors closed; implement weighs it as an amendment before T1.
- 2026-10-27: lessons used: 2026-10-25 (M002) recorded responses, 2026-10-25 (M004) DNS stubs in build tests, 2026-10-25 (M007) attribute matching, 2026-10-26 (M015) local preview of the site, 2026-10-25 (M006) Pages deploys only from main, 2026-10-26 (M018) search joined text.
- 2026-10-27: status in-progress; branch m021-report-counts cut from main at 83abe0a.
- 2026-10-27: substantive amendment: AC1 also drops issues whose `closed_by` is null or absent or names a login other than `github-actions[bot]`, and names the probes of that drop. D-013 already says the build counts "the ones the bot closed as completed", so the amendment brings AC1 to the user's decision and takes no stop. GitHub's issue list answer carries `closed_by` (observed 2026-10-27 on this repo), so the check costs no request. It absorbs the candidate "Count only reports the bot closed".
- 2026-10-27: re-audit: AC1 (full) — null `closed_by` unnamed (named); a gloss saying which workflow closes reports, unchecked (cut); one probe per drop family (the `closed_by` probes named, the other families tested); a report that a person reopens and closes again stops counting (T5 adds it to the DESIGN Known issues entry); DESIGN item 4 should say the bot closed the issues (T5).
- 2026-10-27: re-audit: AC1 (full) — the record a report goes to and "each Zotero major" (answered: AC2 states the output, no change); an absent `closed_by` drops every report if GitHub stops sending it (new candidate row); probes for one `user.id` under two logins, the dropped-newest case for each drop, and the near-miss login `github-actions` (tests added); the tie probe exists; AC2's fixture needs counted reports (T2). No wording change.
- 2026-10-27: T1 done: `countReports` in `src/reports/count.ts`; an item without a numeric `user.id`, a parseable `created_at`, or a numeric `number` does not count. Planted defects (no `closed_by` check, no tie rule) turned 3 tests red.
- 2026-10-27: T2 done: `buildData` takes `indexRepo` (default `INDEX_REPO`, the CLI passes `GITHUB_REPOSITORY`) and reads the issue list after the local entry reads and before any upstream read, so the entry-error tests still make no request; the failure line is `cannot read the report issues: <failure name>: <message>`. `reportCount` is a schema definition. The mixed-failures golden file gains one `"reports": []` line, regenerated from the new code. A planted defect (a failed read goes on with no issues) turned the 4 AC3 tests red.

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive -->
