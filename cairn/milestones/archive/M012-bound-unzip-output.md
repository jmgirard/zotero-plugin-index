# M012: Stop inflating past the declared size

**Status:** done (2026-10-26, PR #18 https://github.com/jmgirard/zotero-plugin-index/pull/18)

**Goal:** The upstream reader stops inflating a `manifest.json` or default-locale `messages.json` once its output passes the size the zip declares, so a crafted XPI within the caps cannot hold the reader.

**Outcome:** `unzipOne` in `src/upstream/reader.ts` no longer calls fflate's `unzipSync`. `zipEntry` walks the
central directory the way `unzipSync` reads it (`centralDirectory`, also behind `zipEntryCount`, and
`zip64Sizes`), keeps the duplicate and 1 MiB size checks, and finds the data after the local header. A
deflated entry is inflated with fflate's streaming `Inflate`, 16 KiB of input per push, and fails with
`xpi-unreadable` ("inflates past the N bytes its zip declares") after the first push whose output passes the
declared size; a stored entry is returned at its compressed size as before. A 512 MiB entry fails in about
60 to 80 ms against about 2 s before. CHANGELOG.md, README.md's unzip limits, and DESIGN.md describe it.

**Decisions:** none. The plan gate chose `Inflate` with a central-directory lookup over fflate's `Unzip` and
over `node:zlib` (D-001).

**Review:** four-lens fan-out; all 5 criteria passed, AC3 by back-to-back builds with identical data for 14
plugins. 14 findings: 3 fixed (README limit, a stale fflate-only test removed, a fixture comment), 11 rejected
(3 edge cases with only a message or speed effect, 5 planned, 3 false), 0 follow-ups. Claim audit corrected
the changelog's "stops at the declared size" to per-16 KiB wording. Hygiene graduated candidate row "Stop
inflating past the declared size", retired lesson 2026-10-25 (M004) on `unzipSync` output (enforced by the
AC1 timing tests and the stored-size test), and captured one lesson on deflate-bomb fixtures.
