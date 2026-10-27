# M019: Keep issues open on a bot read failure

**Status:** done (2026-10-27, PR #30 https://github.com/jmgirard/zotero-plugin-index/pull/30)

**Goal:** An "Add a plugin" issue stays open for a maintainer when the bot's read of the repo fails for a reason that says nothing about the plugin, such as a GitHub rate limit or outage.

**Outcome:** `draftEntry` (`src/discover/discover.ts`) carries the reader's `buildLevel` mark in its refusal, and marks
a thrown `readUpstream`. `readOutcome` (`src/discover/issue.ts`) turns such a refusal into the `failed` outcome, so the
bot comments "could not finish" with the failure name in a code span and the message, sends no close, and the run
exits 1. The handoff's `failed` outcome gains an optional `failure`, checked by the `refused` name pattern. A 404 and
every other refusal still close as not planned; an `unexpected-error` from the entry check and output-directory
refusals are unchanged. Discovery's recording rule is unchanged. Tests: GitHub API 429, 503, 403, update.json 503,
rejected fetch, failed lookup, and a thrown read keep the issue open; GitHub API and update.json 404 close it. README,
CHANGELOG, DESIGN, and comments state the rule. Live: issue #31 naming a missing repo, run 40455581514 at adb1a35,
closed as not planned with `github-http-error` HTTP 404.

**Decisions:** none. The question set chose the reader's build-level mark (D-011) over the row's failure names, since
GitHub's 404 for a missing repo shares the name `github-http-error`.

**Review:** Criteria audit (full) 8 findings taken; claim audit 22 read, 3 corrected. One return (AC4: `issueRead`
comment lacked the open-issue rule; T5 fixed it). No amendments. Four-lens pass, 16 findings: 5 fixed (one README
sentence flagged by 4 lenses, a line wrap), 2 follow-up (new row "Keep issues open on entry-check errors"; one held by
"Retry repos refused by a download error"), 9 rejected (6 planned, 2 false, 1 style), none edge. CI passed. Row "Keep
issues open on a bot read failure" graduated; M016 row pruned; 7 lessons marked used; none captured.
