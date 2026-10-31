# M069: Check the data artifact in the site job

**Status:** done (2026-10-31, PR #352 https://github.com/jmgirard/zotero-plugin-index/pull/352)

**Goal:** If the downloaded `plugins-data` tree differs from the build job's digest in an entry's path, its kind, or a file's bytes, the site job deploys nothing.

**Outcome:** New `pnpm data-digest --dir <dir> [--expect <sha256>]` (`src/build/digest.ts`, `digest-cli.ts`):
SHA-256 over one JSON line `[kind, path, file SHA-256 or null]` per entry, sorted by UTF-8 path bytes; refuses
symbolic links and named pipes; `--expect` exits 0 on a match, 1 naming both values. `build.yml`: build job
output `data-sha256` from `pnpm --silent data-digest --dir dist` after the carry; the site job checks it with
`--expect` right after the `plugins-data` download. T1 read: upload-artifact v7 `overwrite` deletes by name
across the run with `ACTIONS_RUNTIME_TOKEN` alone, and it leaves out hidden files and every directory;
upload-pages-artifact v5 has no `overwrite`, so a pre-uploaded `github-pages` stops a deploy but cannot change
it. README, DESIGN, CHANGELOG updated; carry-order tests anchor on the run line. Branch run 41208668356 passed.

**Decisions:** D-041 (plugin code can withhold a deploy by changing the build's artifacts; annotates D-023,
D-024, D-025). Plan gate: a Node command over `find | sha256sum`; a content digest over download by artifact id.

**Review:** Criteria audit (full) 6 findings, all taken; claim audit 46 claims, 2 corrected. Return 1: AC2's
test checked exit status for 1 of 3 refused kinds (T6); AC3 amended to quote `pnpm --silent`, re-audit found
the carry-order anchor matched a comment (T7). Four-lens fan-out, 30 findings: 14 fixed (README deploy summary
and usage text, empty `--dir`, script order, stray wrap, test link target, D-041, upload selection comment),
12 rejected, 2 noted, 0 follow-ups. T1 filed parked row "Keep plugin code from stopping deploys". CI passed.
"Check the data artifact in the site job" graduated. 6 lessons marked used, 2 captured (upload-artifact file
selection; workflow test anchors); 2026-10-30 (M059) and 2026-10-30 (M060) evicted by rank.
