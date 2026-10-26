# M009: Open a pull request for each new plugin

**Status:** done (2026-10-26, PR #9 https://github.com/jmgirard/zotero-plugin-index/pull/9)

**Goal:** A daily workflow runs discovery and opens one pull request for each drafted entry, at most 5 per run, with the entry check's result in each pull request's body.

feature series: M008 -> M009 -> M010.

**Outcome:** `pnpm discover --propose` (`src/discover/propose.ts`, `proposeRun`) reads the repo's pull requests
(`state=all`), skips each repo whose `discover/<owner>/<repo>` head from the repo itself is open or closed unmerged,
and refuses unrecorded a plugin id that an open bot pull request adds. Per entry: `pnpmCheck` on a temp dir with only
that entry, one `github-actions[bot]` commit on the default branch built with a temp `GIT_INDEX_FILE` and
`commit-tree`, a force-push, and a POST whose `body` gives repo URL, version, range, check status and output. Failures
are named, then exit 1. `githubClient.post` fails on a redirect. `discover.yml`: 14:43 UTC and dispatch on the default
branch only, `limit` input, two write permissions, group `discover`, state in the Actions cache. Fixture fetch answers
`<METHOD> <url> #<n>`; the preload logs to `ZPI_REQUESTS`. Live run 40303090895 opened PR #10 (aidenlx/zotlit) with
the check output in its body, and no CI ran on it.

**Decisions:** none.

**Review:** Claim audit 65 claims, 5 corrected (one a defect: a blank line in a manifest value ended its code span).
Four-lens fan-out: 33 findings, 15 fix now (14 on the branch, 1 at hygiene), 15 rejected (2 edge), 3 follow-up into
new rows "Stop retrying a failing bot pull request" and "Bound the time of a discover run". No return. CI passed.
Hygiene: candidate "Find new plugins by GitHub topic search" narrowed to the issue form; M006 row pruned. Lessons: 8
used, 2 new.
