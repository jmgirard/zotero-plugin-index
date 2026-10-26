# M012: Stop inflating past the declared size

- **Status:** in-progress
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

- [ ] AC1: A test builds an XPI whose `manifest.json` entry declares compressed and unzipped sizes within 1 MiB and
      whose deflate data inflates to at least 512 MiB, and `readUpstream` fails it with `xpi-unreadable` within
      1 s measured in the test; a second XPI does the same with the default locale's `messages.json`. Both tests
      fail on the plan commit.
- [ ] AC2: An entry whose deflate data inflates to one byte more than its declared unzipped size fails with
      `xpi-unreadable`, and entries that inflate to exactly, or to fewer bytes than, their declared size read as
      before (test).
- [ ] AC3: The review runs `pnpm build` on the default branch and on the branch back to back, and no plugin has the
      failure `xpi-unreadable` in the branch's data without having it in the default branch's.
- [ ] AC4: `CHANGELOG.md`'s Unreleased section says that a `manifest.json` or default-locale `messages.json` whose
      deflate data inflates past its declared unzipped size fails with `xpi-unreadable`.
- [ ] AC5: `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check` pass.

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
- [ ] T4: At review, run `pnpm build` with `GITHUB_TOKEN` set on the default branch and on the branch back to back,
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

## Decisions

## Review
