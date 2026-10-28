# M042: Check the index at the push base

**Status:** done (2026-10-28, PR #75 https://github.com/jmgirard/zotero-plugin-index/pull/75)

**Goal:** The write step of `pnpm propose` skips an entry that the default branch already holds at the commit it builds on, not only one that its checkout holds.

**Outcome:** `fetchBase` (`src/discover/propose.ts`) fetches the default branch, takes `FETCH_HEAD^{commit}`, and reads
`plugins/` there with one `git ls-tree -r -t -z --full-tree` and one `git cat-file --batch` (raw bytes, so a BOM or
non-JSON `meta.json` counts by folder name alone); a commit with no `plugins` tree fails. `PushBase` (branch, commit,
index) goes into `propose`, which builds each commit on that commit. `proposeHandoff` and `issueAnswer` drop `root`, read
the pull requests and default branch, then fetch (an empty handoff fetches nothing); a failed fetch or read fails every
entry, `in-bot-pull` ones included, or posts the issue's "could not finish" comment. `gitRunner` and `tokenEnv` are shared;
`maxBuffer` 64 MiB with its own message; `IssueAnswerOptions` gains `gitMs`. Test checkouts commit `plugins/`
(`pushFromClone` adds main commits after the checkout). README, DESIGN, CHANGELOG, and the add-plugin-issue.yml budget
comment (12 git processes, about 30 minutes per issue) state it. The read steps still read the checkout.

**Decisions:** none.

**Review:** Plan criteria audit (full) 10 findings taken; claim audit 47 read, 3 corrected. Four lenses, 26 items: 14
fixed in 56aea11 (one cat-file batch, root-relative ls-tree, output cap, fetch token test, BOM, `gitMs`, stale DESIGN,
README, and workflow text, a duplicate test), 3 follow-up, 9 rejected (4 planned, 3 false, 1 style, 1 edge: an entry
deleted from main mid-run fails a `known` issue). CI passed. Row "Check the index at the push base" graduated; "Fail
issue runs with no plugins folder" narrowed to the read step; new row "Count linked folders at the push base". Lessons:
8 used, 1 captured, 2026-10-25 (M003, used M029) evicted by rank. M041 row pruned at plan for the line cap.
