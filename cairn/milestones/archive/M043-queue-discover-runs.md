# M043: Queue runs in the discover group

**Status:** done (2026-10-28, PR #76 https://github.com/jmgirard/zotero-plugin-index/pull/76)

**Goal:** A new run in the `discover` concurrency group waits its turn, so an opened issue or a sweep no longer cancels a pending `Discover plugins` run or issue run.

**Outcome:** `discover.yml` and `add-plugin-issue.yml` set `queue: max` on the `discover` group (GitHub, May 2026): up to 100 runs wait and run one at a time, order not promised, and GitHub cancels runs past that; the M040 sweep stays as the fallback. An `issues` run of `add-plugin-issue.yml` without the `add-plugin` label takes `add-plugin-skipped-<run id>`, using the pick job's `contains(...)` text. `test/workflows.test.ts` asserts both blocks and the shared label text. README, CHANGELOG, DESIGN, the workflow comments, and the `MIN_AGE_MS` comment describe the queue. Branch dispatches of both files concluded `skipped`. Dispatches of `discover.yml` from other refs, and from branches cut before M043, stay in row "Close the gaps in the issue sweeps".

**Decisions:** none.

**Review:** Criteria audit (full) 9 findings taken; claim audit 21 claims, 2 corrected. No returns, no amendments. Four-lens pass, 22 findings: 10 fixed in 083c15d (group wording in README and DESIGN, order caveat, tighter test key match, label text taken from the pick job, `MIN_AGE_MS` and CHANGELOG wording), 5 follow-up (two absorbed by "Close the gaps in the issue sweeps", three hygiene edits), 7 rejected (2 planned, 5 false). CI passed. Hygiene: row "Answer issues whose run was canceled" graduated and its pointer in "Answer report issues left open" removed; 5 lessons marked used M043; 1 captured (a branch dispatch checks a workflow file); 2026-10-25 (M004, used M029) on DNS stubs in reader tests evicted by rank.
