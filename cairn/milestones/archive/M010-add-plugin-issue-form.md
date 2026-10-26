# M010: Take one repo URL from an issue form

**Status:** done (2026-10-26, PR #11 https://github.com/jmgirard/zotero-plugin-index/pull/11)

**Goal:** An issue form takes one GitHub repo URL, and a workflow drafts that repo's entry and opens a pull request, or replies on the issue with the reason it cannot.

feature series: M008 -> M009 -> M010.

**Outcome:** `.github/ISSUE_TEMPLATE/add-plugin.yml` (one required input `Repository URL`, label `add-plugin`);
`add-plugin-issue.yml` runs `pnpm discover-issue` on `issues: opened` with that label, body only in `env:`, three write
permissions, group `discover`. `src/discover/issue.ts`: `parseIssueBody` (first non-empty line under the heading;
`no-url-heading`, `no-response`) and `issueRun`, which checks entries and bot PRs by name before and after the read,
drafts through `draftEntry` (now shared with `discover`), opens the PR through `propose` with `Closes #<issue>`, and
comments. Refusals close as `not_planned` (`completed` for an indexed repo); bot failures comment, stay open, exit 1;
quoted messages cut at 2,000 characters. `githubClient` gains `patch`; `botPulls` returns each PR's URL, open first.
Live: issue #12 (windingwind/zotero-pdf-preview) from the form, run 40306878224, PR #13 with `Closes #12`.

**Decisions:** none.

**Review:** Claim audit 63 claims, 7 corrected. Four-lens fan-out: 34 findings, 14 fix now (incl. a missing
`add-plugin` label, fixed at the live check; an unanswered issue on a non-`ReadFailure`; an older closed PR hiding an
open one; over-long comments), 8 follow-up into rows "Keep issues open on a bot read failure", "Answer issues whose run
was canceled", "Limit what an issue run can reach", "Close the issue when its pull request closes", and "Stop retrying a
failing bot pull request", 11 rejected, 1 noted. No return. CI passed. Hygiene: candidate "Take one repo URL from an
issue form" graduated; M007 row pruned. Lessons: 5 used, 3 new.
