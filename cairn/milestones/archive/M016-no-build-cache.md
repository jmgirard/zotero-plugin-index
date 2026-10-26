# M016: Restore no cache in the deploy build

**Status:** done (2026-10-26, PR #22 https://github.com/jmgirard/zotero-plugin-index/pull/22)

**Goal:** The daily build that deploys the site and data restores no Actions cache. So a cache entry that another job saved cannot change what it publishes.

**Outcome:** The `build` job of `build.yml` sets job-level `cache-mode: none`, which GitHub enforces with the job's
cache token, and its `actions/setup-node` step drops `cache: pnpm`; the deploy job is unchanged. GitHub's docs (cache-mode
added 2026-09-10) say `schedule` and `workflow_dispatch` runs can save caches in the default branch's scope and `issues`
runs get read-only access, so the discover read job could plant a cache and the issue read job cannot.
`test/workflows.test.ts` fails on a `cache` key (block, flow, or quoted, any case) or an `actions/cache`,
`/restore`, or `/save` step in `build.yml`, or on a build job without `cache-mode: none`; it drops only full-line
comments. `ci.yml` keeps `cache: pnpm`. CHANGELOG and DESIGN updated. Live: branch runs 40340509817 and 40342164629
finished the build job with "Cache mode: none" and no `Cache restored` line.

**Decisions:** D-010 (the deploy build restores no Actions cache). Milestone-local: none.

**Review:** Criteria audit 6 of 8 findings taken; claim audit 17 read, 3 corrected. One four-lens pass, 20 findings:
8 fixed (job-level cache-mode, flow-form test branches, full-line comment strip, cache-mode presence test, "could be
restored", changelog narrowed, D-010), 1 into row "Check the restored discovery state", 11 rejected (6 false, 5
planned), none edge. No returns, no amendments. CI passed. "Keep read jobs from writing the cache" graduated; M013 row
pruned; 4 lessons marked used; none captured.
