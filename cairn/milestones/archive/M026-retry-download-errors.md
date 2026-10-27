# M026: Retry repos refused by a download error

**Status:** done (2026-10-27, PR #43 https://github.com/jmgirard/zotero-plugin-index/pull/43)

**Goal:** A repo whose read fails because a download host answered with a rate limit or a server error is read again on the next discovery run, instead of being skipped for 30 days or until its next push.

**Outcome:** `draftEntry` (`src/discover/discover.ts`) returns `recorded: false` for a reader refusal marked build-level, so `discover()` keeps no state record for `update-json-http-error` or `xpi-unreadable` caused by an HTTP 429 or 5xx answer (`buildLevelStatus`, D-011), after any redirects. A 404, 403, or other download answer stays recorded under the 30-day rule. The `NOT_RECORDED` and `Drafted` comments, README's discovery state paragraph, and DESIGN's discovery paragraph state the rule. Four cases in "the discovery state" tests: update.json 429 and XPI 503 leave no record, and a 404 for each is recorded. CHANGELOG unchanged, since its Unreleased discovery entry does not describe the state file.

**Decisions:** none. The question set narrowed the candidate row from every download HTTP error to 429 and 5xx answers, so a broken `update.json` link does not take a read every day.

**Review:** Plan audit 3 findings, all fixed (AC1 and AC2 narrowed to a run from an empty state; test-file clauses moved to T1). Claim audit: 6 claims, 2 corrected. Fan-out (diff-bug, blame-history, prior-review, ripple): 12 findings; 2 fixed in `8e0379b` (README rewrap); 4 follow-up, new rows "Stop rereading hosts that keep failing" (parked) and "Drop stale state records on a reread" (low); 6 rejected. CI green. Hygiene: row "Retry repos refused by a download error" graduated; M023 row pruned; 2 lessons marked used M026; none captured.
