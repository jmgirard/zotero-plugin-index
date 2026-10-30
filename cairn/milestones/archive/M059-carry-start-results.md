# M059: Reuse start results for unchanged XPIs

**Status:** done (2026-10-30, PR #341 https://github.com/jmgirard/zotero-plugin-index/pull/341)

**Goal:** If a recent `started` result exists for the same XPI file and tested Zotero release, the daily build reuses it and does not start the plugin again.

**Outcome:** `pnpm build` writes `upstream.xpiSha256` (schema pattern `^[0-9a-f]{64}$`). `pnpm carry-start-results
--plan --data [--previous]` (`src/start-test/carry.ts`) reads the deployed `v1/plugins.json` within 60 s and 16 MiB
and writes a `carried` list of `started` results into each plan item whose earlier record has the same entry id,
plugin id, version, and `xpiSha256`, except on the entry's re-test day (`retestDay`: first 4 bytes of the entry id's
SHA-256 mod 7, against whole UTC days to the data's `generatedAt` mod 7); any error leaves the plan and exits 0.
`parsePlan` refuses a `carried` that is not distinct `started` results; `pnpm start-tests` skips carried pairs before
its limit; `addResults` merges carried results (also with no results directory) and drops a job result for a carried
pair as `carried`. `build.yml` runs the carry after `pnpm build` and outputs `plan-sha256`, which the site job checks
with `sha256sum --check`. Test zips use `mtime: new Date(2026, 0, 1)`. README, About, home text, schema, DESIGN, and
CHANGELOG state the start rule. Branch run 41018926508 carried 0 (no hashes deployed yet).

**Decisions:** D-035 (reuse deployed start results for an unchanged XPI; weekly re-test; forgery cost).

**Review:** Criteria audit (full) 18 findings, 17 taken; claim audit 66 claims, 5 corrected. Four-lens fan-out, 39
findings: 26 fixed (plan SHA-256 check, time-zone-proof zips, carried results with no results directory, forgery
wording, stale text, redundant tests), 1 follow-up, 9 rejected (2 edge), 3 noted. Rows filed: "Check the data artifact
in the site job" (normal), "Let a run by hand start every plugin" (low). No return. CI passed. "Reuse start results for
unchanged XPIs" and "Publish each XPI's SHA-256 too" graduated. 11 lessons marked used, 1 captured (fflate zip time);
2026-10-25 (M006, used M047, corrected M047) on Pages deploys evicted by rank.
