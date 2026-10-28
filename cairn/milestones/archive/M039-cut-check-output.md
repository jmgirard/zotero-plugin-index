# M039: Cut the check output in bot pull requests

**Status:** done (2026-10-28, PR #72 https://github.com/jmgirard/zotero-plugin-index/pull/72)

**Goal:** A bot pull request body stays under GitHub's 65,536-character limit, because `body()` quotes at most the first 10,000 characters of the `pnpm check` output.

**Outcome:** `body()` in `src/discover/propose.ts` takes `checked.output.trimEnd()`, cuts it by code points to `CHECK_OUTPUT_MAX` (10,000, not exported), trims the cut text again, builds the fence from the cut text, and adds "The output above is cut to its first 10,000 characters." after the closing fence. The discover run and the issue run both build bodies there. A body from the handoff's longest field values and 100,000 backticks of output measured 35,683 UTF-16 units (305,626 on main). Tests in `test/propose.test.ts`: a 100,000-character cut, a 10,001-emoji cut, an uncut 10,000-character output with a newline, and the length bound. CHANGELOG, README ("Pull requests from the bot"), and DESIGN name the cut.

**Decisions:** none promoted. Plan choice at the question set: cut the check output and record nothing, over also saving 422 create refusals into the discovery state from the write job; none of the 7 discover runs before the plan had failed, and the handoff schema already caps every other body value.

**Review:** Plan audit (full): 6 findings, all taken (code points, `trimEnd()` before measuring, AC3 narrowed to named inputs, README added). Claim audit: 16 claims, 2 corrected. Four-lens pass, 20 findings: 5 fixed in bd64aa7 (export dropped, cut text trimmed, 3 overlapping assertions removed, DESIGN line 415); 2 to rows; 12 rejected; 1 noted. CI green; merged as 19045e6. Hygiene: row "Stop retrying a failing bot pull request" narrowed and parked; row "Keep the check summary in a cut body" added; M037 row pruned; 5 lessons marked used M039; none captured.
