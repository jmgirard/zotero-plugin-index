# M005: Refuse zips that claim too many entries

**Status:** done (2026-10-25, PR #5 https://github.com/jmgirard/zotero-plugin-index/pull/5)

**Goal:** The upstream reader refuses a zip that claims more entries than its length can hold, or that repeats a file it unzips, before fflate loops over the entries.

**Outcome:** `src/upstream/reader.ts`: `zipEntryCount` copies how fflate 0.8.3's `unzipSync` finds the entry count
(backward end-record scan from length - 22 within 65,558 bytes, a 2-byte count of 0 gives 0, the zip64 locator's low
32-bit offset, the low 32 bits of the zip64 total-entry field, bytes past the end read as 0). `readManifest` refuses
an XPI as `xpi-unreadable` ("claims <count> entries, more than its <length> bytes can hold") when count × 46
(`CENTRAL_HEADER_MIN_BYTES`) exceeds its length, before the first unzip. The `unzipOne` filter fails at a second
entry matching `manifest.json` or the default locale's `messages.json` ("holds more than one <name>"). A 9-zip table
in `test/upstream.test.ts` checks the count against fflate's filter calls. Before the fix, a 98-byte zip64 XPI ran
past 180 s and 2,000 duplicate entries took 4,510 ms. README, CHANGELOG, DESIGN.md. Live build: 14 of 14 plugins read.

**Decisions:** none promoted. The user chose to fix the duplicate-entry hold here by refusing duplicates, and to keep
the failure name `xpi-unreadable`.

**Review:** Criteria audit (full, 6 findings taken; the duplicate-entry hold it found was added at the question set,
then re-audited, 4 findings taken) and claim audit (39 claims, 2 corrected). Four-lens fan-out, one pass, no return:
2 fixed on the branch (the `unzipOne` comment, a test name), 1 to the new row "Stop inflating past the declared
size" (a deflate bomb within the 1 MiB caps holds an unzip for about 4 s), 14 rejected. PR #5 CI passed. Row
"Refuse zips that claim too many entries" graduated. Lessons: 2 marked used, 2 captured.
