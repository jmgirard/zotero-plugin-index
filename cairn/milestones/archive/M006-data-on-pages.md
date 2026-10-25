# M006: Publish the data on Pages

**Status:** done (2026-10-25, PR #6 https://github.com/jmgirard/zotero-plugin-index/pull/6)

**Goal:** The daily build deploys `plugins.json` and its two schemas to GitHub Pages at stable versioned URLs, and deploys nothing when more than half of the plugin reads fail.

**Outcome:** Both schemas' `$id` is `https://jmgirard.github.io/zotero-plugin-index/schemas/<file>`. `writeData`
copies both schemas to `<out>/schemas/` through a temp file each, then writes `v1/plugins.json`; the CLI prints
`<n> of <m> records carry a failure, more than half` and exits 1 after the write when `failed*2 > total`.
`build.yml`: concurrency `pages-${{ github.ref }}`, `plugins-data` upload `if: !cancelled() &&
hashFiles('dist/v1/plugins.json')`, last build step `upload-pages-artifact@v5` on `dist/`, deploy job `needs:
build`, `github-pages` environment, `deploy-pages@v5`, its own `pages: write` and `id-token: write`, 10-minute
timeout. Pages on (build_type workflow); the environment allows branch `main` only. Tests: 2-of-3 tree exits 1,
2-of-4 exits 0, schema bytes after both, three writeData failure branches. README "Using the data", CHANGELOG,
DESIGN.md. Live run 40238599269 on main: build and deploy passed; all three URLs answer 200 JSON, 14 records,
0 failures, valid against v1, each `$id` equal to its URL.

**Decisions:** none (exit 1 from `pnpm build` chosen over a workflow step that counts failures).

**Review:** Plan criteria audit (5 findings taken); claim audit (26 claims, 0 corrected). Four-lens fan-out, one
pass, no return: 27 finding lines, 12 fixed (schema temp-file write, dist backup in the default-tree test,
per-branch concurrency, upload condition, writeData failure tests, deploy timeout, README and DESIGN wording),
6 duplicates, 5 follow-up, 1 rejected as planned, 3 noted. Hygiene: "Publish the site and data on Pages" and
"Warn when the daily build degrades" narrowed; new rows "Count only build failures for deploys" (filed apart
from the finding-absorbing "Warn" row) and "Keep the v1 data when v2 ships". CI passed. Lessons: 4 used, 2 new.
