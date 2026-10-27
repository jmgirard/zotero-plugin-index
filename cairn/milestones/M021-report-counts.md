<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M021: Show report counts on the plugin pages

- **Status:** review   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
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

- [x] AC1: `countReports` in `src/reports/` takes the report issues and the
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
- [x] AC2: `pnpm build` reads the report issues before any plugin read. It
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
- [x] AC3: If the build's read of the report issues fails, `pnpm build`
      prints a line that names the failure, writes no `v1/plugins.json`, and
      exits 1. Tests in `test/build.test.ts` show this for an HTTP 503
      answer, a rejected fetch, a second page that fails after the first
      succeeds, and an answer whose body is not a list.
- [x] AC4: The build job of `.github/workflows/build.yml` holds
      `issues: read` beside `contents: read`, and a test in
      `test/workflows.test.ts` checks it.
- [x] AC5: The page of a record that has `upstream` shows, under the version
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
- [x] AC6: README's "Using the data" section defines `reports` with the rule
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
- [x] AC7: `pnpm test` (type check, then Vitest) and `pnpm check` pass.

## Coverage
<!-- owner: plan · create/amend-via-gate -->

- AC1 → T1
- AC2 → T2
- AC3 → T2
- AC4 → T3
- AC5 → T4
- AC6 → T5, T6
- AC7 → T1, T2, T3, T4, T5, T6

## Tasks
<!-- owner: plan (create) / implement (check-off, minor edits) -->

- [x] T1: Write the tests of `countReports`, then the function, reusing
      `parseReport` from M020.
- [x] T2: Read the report issues in `buildData` before the plugin reads,
      add `reports` to the records and the schema, and add the CLI's failure
      line and exit. Add recorded responses for the issue list to the build
      fixtures, since every build now reads it (LESSONS, M002).
- [x] T3: Add `issues: read` to `build.yml` and its check to
      `test/workflows.test.ts`.
- [x] T4: Add the report block to the plugin page template and the site
      fixture records, then the site tests. Match attribute forms such as
      `data-fact="reports"` (LESSONS, M007). View the built site through a
      local server (LESSONS, M015).
- [x] T5: Write the README, CHANGELOG, and DESIGN text. Search joined copies
      of the files for the old and new phrases (LESSONS, M018).
- [x] T6: Name the build's read of the report issues in DESIGN.md's
      Contract boundary (review return 1).

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
- 2026-10-27: T3 done: the build job gets its own `permissions` block (`contents: read`, `issues: read`); the workflow-level `contents: read` stays for the deploy job's base. Removing `issues: read` turned its test red. The report-issue.yml test also checks that `pnpm report-issue` gets `secrets.GITHUB_TOKEN`, since the count takes only reports closed by that token's account (first AC1 audit).
- 2026-10-27: T4 done: the report block (`data-reports`) sits after the declared range and before the repository links, for each record with `upstream`; `reportHref` in `site/src/data.ts` builds the links. The site fixture's GUID record now reads version `3.0.0+r1`, so one record needs both id and version encoding; the prerelease test's text follows. Viewed through a local server: Astro dropped the spaces around the links ("itWorksor"), fixed with `{" "}`. Unencoded versions turned 2 tests red.
- 2026-10-27: T5 done: README "Using the data" (the `reports` rule, the deploy rule), "The site", "Reporting whether a plugin works", and "Building the data"; the M020 CHANGELOG entry; DESIGN Contract boundary, item 4, Function Families, the `src/build/` and workflow-test paragraphs, and a Known issues entry that also names the reopen case and the "ghost" account. The forms, the bot comment, and README now say the index counts reports, in the present tense. A joined-text search finds none of the old future-tense phrases. The simple-english hook flags "validate" in README and CHANGELOG; kept, since it names the schema check, as the earlier README text does.
- 2026-10-27: claim audit: 52 claims read, 1 corrected — CHANGELOG.md (the `reports` items cover only majors with a counted report, and only pages of read plugins show the counts and links).
- 2026-10-27: status review; all 5 tasks done, `pnpm test` (589 tests) and `pnpm check` pass.
- 2026-10-27: review return 1: AC6 — DESIGN.md's Contract boundary names the `reports` field but not the build's read of the report issues; Function Families and the `build.yml` paragraph name both. Status in-progress.
- 2026-10-27: minor amendment: added T6 for review return 1, mapped to AC6 and AC7 in Coverage. T6 done: the Contract boundary now says the daily build counts `reports` from its read of the closed report issues, and a failed read deploys nothing. `pnpm test` (589) and `pnpm check` pass. Status review.

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive -->

Pass 2, at bfe95d3 (main 83abe0a unmoved). Pass 1 returned AC6 (review return 1).

- AC1: `pnpm exec vitest run --reporter=verbose`: 27 `countReports` tests pass in `test/report.test.ts`: the control that counts, each drop (pull request, not planned, no reason, a person's login, `github-actions` without `[bot]`, null `closed_by`, absent `closed_by`, `not-counted`, a `parseReport` refusal, another version), the dropped-newest case for each drop, two majors, two plugins, two accounts, newest-decides in both list orders, the tie by issue number, and one `user.id` under two logins. Pass 1 planted defects (no `closed_by` check, no tie rule) turned 3 of them red.
- AC2: `test/build.test.ts` "reads every page of the closed report issues first and writes the counted reports" passes: the fixture's two pages are linked by `rel="next"`; the first two requests are page 1 and page 2 of the issue list, both lists carry `labels=report` and `state=closed`; Better Notes gets `[{7,1,0},{8,1,0}]`, second-plugin `[{7,0,1}]`, the forked record no `reports`; the output passes the schema. "writes an empty reports list…" and "reads the report issues of the repo that GITHUB_REPOSITORY names" pass, and the spawn strips `GITHUB_REPOSITORY` otherwise, so the default repo is the one read. The schema's `reportCount` (read in `schemas/plugins.v1.schema.json`) requires `zoteroMajor` (integer, minimum 7), `works` and `broken` (integers, minimum 0), with `additionalProperties: false`; 7 `checkOutput` tests pass on it.
- AC3: the four "names the failure, writes no data file, and exits 1" tests pass: an HTTP 503 answer, a rejected fetch, a page-2 HTTP 502 after page 1 succeeds, and a body that is not a list. Each asserts exit 1, stderr `cannot read the report issues: <failure name>: <message>`, no `v1/plugins.json`, and only issue-list requests. Pass 1's planted defect (the build goes on with no issues) turned all four red.
- AC4: Ruby's YAML reads the build job's permissions as `{"contents"=>"read", "issues"=>"read"}`. `test/workflows.test.ts` "gives the build job contents read and issues read, and no other permission" passes; with `issues: read` removed in pass 1 it failed.
- AC5: `test/site.test.ts` passes 10 "the report block" tests and 6 "shows the parts of … in order" tests over fixture records: first-plugin with reports (Zotero 7: 3 works, 1 broken; Zotero 8: 0 works, 2 broken), old-plugin with an empty `reports`, the GUID record with no `reports` field (both show "No reports on this version yet."), every read record's two links to `https://github.com/jmgirard/zotero-plugin-index/issues/new` with `template`, `plugin`, and `version`, the GUID record's exact query `template=works.yml&plugin=%7B…%7D&version=3.0.0%2Br1`, and broken-plugin (failure) with no block or links. The order test puts the block after the pills and declared range. Pass 1 viewed the built pages through a local server; unencoded versions turned 2 tests red.
- AC6: joined-text searches (each count 1, none 0). README "Using the data": `reports`, each drop (pull request, not closed as completed, `github-actions[bot]`, `not-counted`, the bot's checks, `upstream.version`), "only the newest counts", "user id", "higher issue number", "current text". README "The site": the "works"/"broken" counts and the "Works"/"Broken" links. CHANGELOG Unreleased (M020's entry): "optional `reports` field", "Works" link, "fetch it again". DESIGN: item 4 ("Two issue forms take", the bot closes, "The daily build reads the closed report issues"); Contract boundary names `reports` and "its read of the index repo['s closed report issues]" (fixed by T6); Function Families' data build names the issue read and `reports`; the `src/build/` paragraph names both; Known issues has the throwaway-accounts entry with `not-counted`.
- AC7: at bfe95d3, `pnpm test` ran the type check and Vitest: 15 files, 589 tests passed. `pnpm check`: "checked 20 entries in plugins, 0 problems".
- Consistency gate: `cairn_validate.py` exit 0, all checks pass; profile `generic` names no toolchain checks; no DESIGN principle changed, so no `cairn_impact` run.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: the paged issue read follows newest-first pages, so a report that leaves the list mid-read moves the next report past a page boundary and it goes unread — fix now: the read asks `sort=created&direction=asc`, so new closes join the last page; a removal mid-read can still skip one report until the next build.
- diff-bug #2: no test covers dropping an item without a numeric `user.id`, a parseable `created_at`, or a numeric `number` — fix now: three DROPS rows.
- diff-bug #3: a renamed or deleted `report` label gives an empty list, so every count reads zero and the site deploys — follow-up: row "Fail builds when closed_by goes missing" extended.
- diff-bug #4: an empty `GITHUB_REPOSITORY` requests `repos//issues` and exits 1, against README's "not set" — fix now: an empty value reads as unset, with a regression test.
- diff-bug #5: the schema does not enforce one item per major in order, or `reports` only beside `upstream` — reject (planned change): AC2 fixes the schema's item constraints, and the build tests pin the order.
- diff-bug #6: the report-version line has no full stop, and "Works"/"Broken" are capitalized mid-sentence — reject (style): AC5 names the link text "Works" and "Broken".
- diff-bug #7: the label/state loop repeats what the exact URL comparison already checks — fix now: loop removed.
- diff-bug #8: DROPS rows for a null `state_reason`, the near-miss login, and an absent `closed_by` run the same branches as other rows — reject (planned change): AC1 names "absent", and the AC1 re-audit asked for the near-miss probes.
- diff-bug #9: the dropped-newest test runs over every drop, one code path — reject (planned change): the AC1 re-audit asked for that case for each drop.
- diff-bug #10: the link test runs over every read record through one `reportHref` path — fix now: two records, one with reports and one with no `reports` field.
- diff-bug #11: the `GITHUB_TOKEN` assertion sits in a test whose name does not cover it — fix now: its own test.
- diff-bug #12: two test comments restate the code — fix now: deleted.
- blame-history #1: the build falls back to `jmgirard/zotero-plugin-index` where the other commands refuse to run without `GITHUB_REPOSITORY`, and a fork counts its own issues — reject (planned change): AC2 states that rule and the default.
- blame-history #2: the mixed-failures golden file gained `"reports": []` by hand — reject (false): T2 regenerated it by running `buildData` on the new code, and its diff is that one line.
- blame-history #3: the GUID fixture version moved from 3.0.0 to 3.0.0+r1 — reject (planned change): AC5 needs a record whose id and version both need encoding.
- blame-history #4: a failed issue read prints its message raw, and a JSON parse message quotes the body with its newlines, so an answer could start a workflow command line — fix now: each problem line goes through `oneLine`, with a regression test.
- blame-history #5: a switch of the report bot to an app token would zero every count silently — reject (false): "runs pnpm report-issue with the built-in GITHUB_TOKEN" fails on that switch.
- blame-history #6: the build lists every closed report issue with no page cap, bounded only by the 30-minute job limit — follow-up: new row "Bound the build's report issue read".
- blame-history #7: the link prefills a version that `parseReport` refuses — reject (edge): only a manifest version with whitespace or over 100 characters reaches it, outside common plugin versions, and the bot then answers with a refusal comment.
- prior-review: no regression of a past review point; its open point on floods is blame-history #6.
- ripple #1: DESIGN's Contract boundary list of page facts leaves out the user reports — fix now: added.
- ripple #2: the CLI comment on exit-1 cases leaves out the failed issue read — fix now: a comment on the no-file branch names it.
- Return floor: no finding shows a criterion failing or a load-bearing defect; no return.
