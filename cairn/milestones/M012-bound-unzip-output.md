# M012: Stop inflating past the declared size

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the failure name lands in the published data
- **Branch/PR:** m012-bound-unzip-output

## Goal

The upstream reader stops inflating a `manifest.json` or default-locale `messages.json` once its output passes the size the zip declares, so a crafted XPI within the caps cannot hold the reader.

## Scope

**In:** In `src/upstream/reader.ts`, unzip the one wanted entry with fflate's streaming `Inflate`, fed in small
chunks. Count the output, and fail with `xpi-unreadable` once it passes the entry's declared unzipped size. Find the
entry the way the M005 checks do, from the central directory. Correct the `unzipOne` comment, which says that the
size check bounds the compressed input that fflate decodes. Add a CHANGELOG.md entry and a DESIGN.md Architecture
note.

**Out:** A time budget for each plugin in the build and in discover → candidates "Warn when the daily build degrades"
and "Bound the time of a discover run". The read-only read job → M011.

## Acceptance criteria

- [x] AC1: A test builds an XPI whose `manifest.json` entry declares compressed and unzipped sizes within 1 MiB and
      whose deflate data inflates to at least 512 MiB, and `readUpstream` fails it with `xpi-unreadable` within
      1 s measured in the test; a second XPI does the same with the default locale's `messages.json`. Both tests
      fail on the plan commit.
- [x] AC2: An entry whose deflate data inflates to one byte more than its declared unzipped size fails with
      `xpi-unreadable`, and entries that inflate to exactly, or to fewer bytes than, their declared size read as
      before (test).
- [x] AC3: The review runs `pnpm build` on the default branch and on the branch back to back, and no plugin has the
      failure `xpi-unreadable` in the branch's data without having it in the default branch's.
- [x] AC4: `CHANGELOG.md`'s Unreleased section says that a `manifest.json` or default-locale `messages.json` whose
      deflate data inflates past its declared unzipped size fails with `xpi-unreadable`.
- [x] AC5: `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check` pass.

## Coverage

- AC1 → T1, T2
- AC2 → T1, T2
- AC3 → T4
- AC4 → T3
- AC5 → T1, T2, T3

## Tasks

- [x] T1: Write the failing tests in `test/upstream.test.ts` (AC1, AC2). Build the 512 MiB deflate data once in a
      `beforeAll` with its own timeout, or write the deflate stream directly. Run the failing-first test in the
      background, because a hold inside fflate's synchronous unzip cannot be stopped by a Vitest timeout.
- [x] T2: Replace `unzipSync` in `unzipOne` (`src/upstream/reader.ts:434`). Find the entry's local header from the
      central directory, keep the duplicate and size checks, inflate with `Inflate` in chunks of at most 64 KiB,
      and stop at the first output byte past the declared size. A stored entry keeps its current size check.
      Correct the comment above `unzipOne`.
- [x] T3: Add the CHANGELOG.md entry under Unreleased, and the DESIGN.md Architecture note beside the M005 text.
- [x] T4: At review, run `pnpm build` with `GITHUB_TOKEN` set on the default branch and on the branch back to back,
      and compare the `xpi-unreadable` records (AC3).

## Work log

- 2026-10-26: created by /milestone-plan.
- 2026-10-26: idea vet: no concern; bounding inflate output as it is produced is the standard defense against a zip bomb, and the existing name `xpi-unreadable` fits a zip whose data disagrees with its directory.
- 2026-10-26: lessons used: 2026-10-25 (M001) pnpm through npx; 2026-10-25 (M004) fflate inflates the whole stream; 2026-10-25 (M004) the reader's DNS lookup stub; 2026-10-25 (M005) a hold in fflate's synchronous unzip ignores Vitest timeouts; 2026-10-25 (M005) crafted zip64 test files; 2026-10-25 (M003) `beforeAll` uses `hookTimeout`.
- 2026-10-26: plan gate chose fflate's streaming `Inflate` with a central-directory lookup over fflate's streaming `Unzip`, because `Unzip` reads local headers, which can disagree with the central directory that Zotero and the M005 checks read; falsified by a test that finds the two lookups pick different entries in no zip that Zotero accepts.
- 2026-10-26: plan gate chose fflate over `node:zlib` with `maxOutputLength`, because D-001 names fflate for the zip; a switch to `node:zlib` takes a decision entry.
- 2026-10-26: plan split the request: M011 covers the read-only read job and M012 the unzip bound, because the two ship apart and touch different files.
- 2026-10-26: criteria audit (full): 4 findings on these criteria. AC1 kept as is: decoding 512 MiB in one push takes about 1.7 s on the plan commit, so the 1 s bound already excludes an unbounded push. AC2 adds an entry shorter than its declared size. AC3 compares a default-branch build with a branch build, run back to back, for `xpi-unreadable` only. A fixture-cost note moved to T1. AC4 and AC5: no finding.
- 2026-10-26: collision check: absorbs candidate "Stop inflating past the declared size"; extends M004 and M005 (archived).
- 2026-10-26: started by /milestone-implement on branch m012-bound-unzip-output, cut from main at 184fca4.
- 2026-10-26: T1 fixture: a first fixture of 64 sync-flushed 8 MiB blocks failed fast on the old reader with "offset is out of bounds" (fflate throws on an empty stored block past a fixed output buffer), not by holding; replaced with one `deflateRawSync` stream of 512 MiB zeros (521,826 bytes, built in a `beforeAll` with a 30 s timeout) on which old `unzipSync` held 1.67 s in a scratch run.
- 2026-10-26: T1 failing-first on the old reader: both AC1 tests failed on time (1,976 ms and 1,877 ms against the 1 s bound), the AC2 one-byte-over test failed as `manifest-invalid`; the two AC2 read-as-before cases passed.
- 2026-10-26: T2 choices: chunks of 16 KiB input (at most about 16 MB of output past the bound per push, given deflate's ratio limit near 1032:1); a central-directory walk that mirrors fflate's end-record, zip64, and header reads, shared with `zipEntryCount`; failure message "<name> in the XPI of <tag> inflates past the <n> bytes its zip declares"; the size check stays at the first match and the duplicate check at the second, as before.
- 2026-10-26: T1+T2 in one checkpoint, because the T1 tests are red without T2. `pnpm test` 412 passed, `pnpm check` exit 0; the two 512 MiB reads take 67 ms and 50 ms.
- 2026-10-26: T3: CHANGELOG.md Unreleased entry added after the M005 entry; DESIGN.md reader paragraph gains the M012 note, and its M005 sentence is corrected in place to name `unzipSync` in the past tense. `pnpm test` and `pnpm check` exit 0.
- 2026-10-26: paused at the user's request after T3; next: claim audit (step 7), then hand off to review. T4 runs at review.
- 2026-10-26: resumed by /milestone-implement; main has not moved since the cut, tree clean.
- 2026-10-26: claim audit: 22 claims read, 1 corrected — CHANGELOG.md (the entry said the reader stops at the declared size; it checks after each 16 KiB of input, so it can inflate about 16 MiB first; reworded and re-read by the same reader).
- 2026-10-26: all implement tasks done; T4 is the review-time build comparison for AC3, left for /milestone-review as the plan states. `pnpm test` and `pnpm check` exit 0. Status set to review.

## Decisions

## Review

- 2026-10-26 sync: no PR for the branch; `origin/main` has not moved since the cut at 184fca4; Copilot round off.
- AC1: `vitest run test/upstream.test.ts -t "inflate|declared size"` on the branch: the 512 MiB tests for `manifest.json` and `_locales/en/messages.json` pass with `xpi-unreadable` in 79 ms and 61 ms; the fixture check passes (under 1 MiB, inflates to 536,870,912 bytes); the entry declares a compressed size of 521,826 bytes and an unzipped size of 1000. The same two tests run against the plan commit's reader (8f5feaf; `reader.ts` is unchanged from there to main) fail on the 1 s bound at 2,100 ms and 1,934 ms.
- AC2: same run: "inflates to one byte more than its declared size" passes with `xpi-unreadable` (message names `manifest.json` and "inflates past the"); "declared size is its unzipped size plus 0" and "plus 1" both read the plugin with version 3.3.3. The one-byte-over test failed on the old reader as `manifest-invalid` (work log, T1).
- AC3 (T4): `pnpm build --out <scratch>` with `GITHUB_TOKEN` from `gh auth token`, on main at 12:17:52 UTC, then on the branch at 12:18:26 UTC; both exit 0 and write 14 records with 0 failed reads. No record has `xpi-unreadable` on either side, and every field of all 14 records is equal between the two files.
- AC4: `CHANGELOG.md` `## Unreleased` holds the entry "A `manifest.json` or default-locale `messages.json` whose deflate data inflates past the unzipped size that the zip declares fails with `xpi-unreadable`." (lines 36–40).
- AC5: `npx -y pnpm@12.15.0 test` exit 0 (type check, then 12 files, 412 tests passed); `npx -y pnpm@12.15.0 check` exit 0 ("checked 14 entries in plugins, 0 problems").
- gate: `cairn_validate.py` exit 0, all checks passed; no DESIGN.md principle changed, so `cairn_impact` skipped; the generic profile's consistency-gate slot names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: a deflated entry with compressed size 0 and declared size N now reads as 0 bytes, not N zero bytes; both give `manifest-invalid` (only the JSON.parse message differs) or `{}` for messages.json — reject (edge: a zero-length deflate entry is outside both documented and common use; effect is a different error message under the same failure name).
- diff-bug #2: with two entries of the same name, the duplicate check now fires before the first copy's inflate or compression-method error; the failure name stays `xpi-unreadable`, only the message changes — reject (edge: a zip that repeats the name and corrupts the first copy is outside documented and common use; effect is a different message under the same name).
- diff-bug #3: the bound is checked once per 16 KiB push, so up to about 16 MiB of output (about 72 MiB of buffers) can be made before the failure, and an inflate error in the overflowing push wins over "inflates past" — reject (planned change: T2 sets chunks of up to 64 KiB, so one chunk's output past the bound is part of the plan; the work log and CHANGELOG state it; the message case is edge: a truncated stream that also overflows).
- diff-bug #4: pushes after the final deflate block re-copy the pending input, so trailing data costs quadratic copying (6.3 ms for about 1 MiB of filler) — reject (edge: data after the final block is outside documented and common use; effect is slow running bounded by the 1 MiB cap).
- diff-bug #5: the fixture check test and the `beforeAll` allocate 512 MiB twice, and the check tests only zlib — reject (false: the check pins the fixture that the AC1 tests rely on, a fact stated apart from the reader, per check discrimination; it is not a dependency test).
- diff-bug #6: the "plus 0" case repeats coverage that every deflated fixture read gives — reject (planned change: AC2 names entries that inflate to exactly their declared size).
- diff-bug #7: the existing test "fflate returns no more bytes of a deflated file than the size the central directory declares" now checks only fflate, because the reader no longer calls `unzipSync` — fix now, fixed c56df91.
- diff-bug #8: comments point at history: the `unzipOne` comment explains the design through `unzipSync`, and the fixture comment's "with no stored blocks" does not say why it matters — fix now for the fixture comment, fixed c56df91; reject for the `unzipOne` comment (false: it states why the reader does not call `unzipSync`, which the code cannot show).
- blame-history #1: the hand-written directory walk departs from D-001, which chose fflate to read the zip, and no decision entry records it — reject (planned change: the plan gate chose fflate's `Inflate` with a central-directory lookup and recorded the alternative; the reader still uses fflate, and the decision entry the work log names is owed only for a switch to `node:zlib`).
- blame-history #2: output past the declared size now fails instead of being dropped, as M004 relied on — reject (planned change: the Goal and AC2).
- blame-history #3: T2 says chunks of at most 64 KiB, and the code uses 16 KiB — reject (false: 16 KiB is within "at most 64 KiB").
- prior-review: archive Review paragraphs of M002, M004, M005 checked, no PR comments; no finding.
- ripple #1: ROADMAP candidate row "Stop inflating past the declared size" still reads as open work — reject (planned change: step 9 hygiene graduates the row this milestone absorbs).
- ripple #2: README.md's list of unzip limits (lines 102–114) has no rule for data that inflates past its declared size — fix now, fixed c56df91.
- after fixes: `pnpm test` exit 0 (411 passed, one fflate-only test removed); `pnpm check` exit 0. Snapshot files changed: none. Amendments recorded: none.
