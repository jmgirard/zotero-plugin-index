<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     The one size check that can fail is cairn_validate's <150 over the plan-owned body. -->
# M005: Refuse zips that claim too many entries

- **Status:** in-progress
- **Priority:** high
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the reader's failures appear in the published `plugins.json` and in `pnpm add-plugin` output
- **Branch/PR:** m005-zip-entry-limits

## Goal

The upstream reader refuses a zip that claims more entries than its length can hold, or that repeats a file it unzips, before fflate loops over the entries.

## Scope

**In:** A count check in `src/upstream/reader.ts`. Before the first unzip of an XPI, the reader reads the entry count
that fflate 0.8.3's `unzipSync` will loop over, from the same records that `unzipSync` finds. If that count times 46
is more than the XPI's length, the reader refuses the XPI. The smallest central-directory header is 46 bytes. A
duplicate check in `unzipOne`: the filter refuses a second entry that matches the file being read. Both refusals use
the failure `xpi-unreadable`. Vitest cases for each refusal, for count agreement with fflate, and for counts at the
bound. README, CHANGELOG, and DESIGN.md text for both rules.

**Out:**
- A time budget per plugin and a warning on mass failure: candidate "Warn when the daily build degrades".
- Replacing fflate's `unzipSync`, or upgrading fflate: no work planned. An upgrade must re-run the AC2 table, since
  the count reader copies 0.8.3's record search.

## Acceptance criteria

- [ ] AC1: The count check refuses a zip that claims too many entries. If the entry count times 46 is more than the
      XPI's length in bytes, `readUpstream` returns the failure `xpi-unreadable`. Its message contains
      `claims <count> entries`, with the count in plain digits. The count is the one `unzipSync` loops over. It starts
      as the 2-byte count in the end record that `unzipSync` finds, and a 2-byte count of 0 gives 0. Otherwise, if the
      4 bytes 20 before the end record are the zip64 locator signature, and the 4 bytes at the offset that the low 32
      bits of the locator's record-offset field give are the zip64 end record signature, the count is the low 32 bits
      of that record's total-entry field. Vitest cases cover two XPIs. One is a 98-byte zip64 XPI that claims
      4,294,967,295 entries. The other is a 22-byte XPI whose end record claims 65,535 entries. Each case asserts the
      failure name and the count in the message.
- [ ] AC2: The reader's count agrees with fflate on a named Vitest table. For each zip in the table, the reader's count
      equals the number of `filter` calls of `unzipSync` on that zip, counted with a filter that returns false. Each
      table zip is one that `unzipSync` reads without throwing. The table holds at least these zips: a two-file zip
      from fflate's `zipSync`; an end record with a comment; a comment that holds a decoy end record with a larger
      count; a signature in the last 21 bytes, which `unzipSync` does not scan; a zip64 end record whose count is
      within the bound; a zip64 locator whose record offset points outside the file; a locator offset with its high 32
      bits set; a 2-byte count of 0 with a zip64 record that claims 4,294,967,295 entries; and a zip64 record whose
      count field runs past the end of the file.
- [ ] AC3: A zip whose count times 46 equals its length is not refused by the count check. A Vitest case reads a
      138-byte zip64 XPI that claims 3 entries, and a second case reads a plain end record at the bound. In each, the
      directory offset points at zero bytes, and the read gets `no-manifest`. A zip with no end record keeps its
      current failure, `xpi-unreadable` with fflate's message. The review records one live `pnpm build` over the 14
      entries in `plugins/`. It shows no failure whose message contains `claims` or `more than one`.
- [ ] AC4: The reader refuses a zip that repeats a file it unzips. Among the entries that `unzipSync` passes to the
      filter, the filter returns true at most once in each unzip. At a second entry whose decoded name equals the file
      being read, `readUpstream` returns `xpi-unreadable`, and its message contains `more than one <name>`. This holds
      for `manifest.json` and for the default locale's `_locales/<locale>/messages.json`. Vitest cases cover three
      zips. One holds two entries named `manifest.json`, with another entry between them. One holds a valid
      `manifest.json` and two entries named `_locales/en/messages.json`, and asserts
      `more than one _locales/en/messages.json`. One holds 2,000 entries named `manifest.json`, each pointing at a
      1,033-byte deflate stream that inflates to 1 MiB. It gets the same failure in under 1 s.
- [ ] AC5: Three files state both rules. They are README's list of reader limits, the CHANGELOG's Unreleased section,
      and DESIGN.md's `src/upstream/` bullet. Each says this: if an XPI's zip claims more entries than its length can
      hold, at 46 bytes for each entry, the read fails with `xpi-unreadable`. Each also says that a zip with more than
      one entry named `manifest.json`, or named the default locale's `messages.json`, fails with `xpi-unreadable`.
- [ ] AC6: The profile's `verify` slot is clean: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1, T2
- AC2 → T3
- AC3 → T1, T2
- AC4 → T4
- AC5 → T5
- AC6 → T6

## Tasks

- [x] T1: In `test/upstream.test.ts`, write the AC1 and AC3 cases. Serve crafted bytes with the `{ base64 }`
      response. A small helper builds the end record, the zip64 locator, and the zip64 end record. On the default
      branch, the AC1 zip64 case times out, because fflate loops about 4.3e9 times at about 62 ns for each entry.
- [x] T2: In `src/upstream/reader.ts`, add an exported count reader that copies the backward search of `unzipSync`
      (node_modules/fflate/esm/index.mjs:2670) and its zip64 checks. It reads bytes past the buffer as 0, as fflate's
      `b4` does, and never throws. If it finds no end record, the check passes, and fflate reports the error as now.
      `readManifest` calls it once, before the first `unzipOne`. The message reads
      `the XPI of <tag> claims <count> entries, more than its <length> bytes can hold`.
- [x] T3: Write the AC2 table in `test/upstream.test.ts`. Each row builds its zip, then compares the count reader's
      result with the `filter` call count of `unzipSync`.
- [ ] T4: Write the AC4 cases first. A helper copies a central-directory entry N times and raises the counts. Then
      change the `unzipOne` filter (src/upstream/reader.ts:366) to fail at the second entry that matches `name`.
- [ ] T5: Add both rules to README's limit list (README.md:66), the CHANGELOG's Unreleased section, and DESIGN.md's
      `src/upstream/` bullet.
- [ ] T6: Run `pnpm test` and `pnpm check` (run pnpm as `npx -y pnpm@12.15.0`).

## Work log

- 2026-10-25: created by /milestone-plan.
- 2026-10-25: tier check: milestone — the fix adds a new refusal rule to the reader, and no documented behavior promises a bounded build time, so a hotfix has nothing to restore.
- 2026-10-25: idea vet: no concern. The count rule refuses no valid zip, since each central-directory entry takes at least 46 bytes, and `xpi-unreadable` fits a malformed zip.
- 2026-10-25: collision check: absorbed candidate "Refuse zips that claim too many entries" (M004 review). It extends M004's size caps. "Warn when the daily build degrades" keeps the time budget per plugin. No D-entry overlaps. Inbox sweep: 0 open issues, 0 open PRs.
- 2026-10-25: measured with fflate 0.8.3: a 98-byte zip with 10,000,000 claimed entries took 620 ms; 1,139,756 entries, the bound for a 50 MiB XPI, took 71 ms.
- 2026-10-25: lessons used: 2026-10-25 (M004) fflate size check in the filter; 2026-10-25 (M001) run pnpm through npx.
- 2026-10-25: criteria audit (full mode, Opus reader): 6 findings, all taken. Count 0 gives 0; only the locator offset's low 32 bits count; AC2 names the decoy-comment, high-bits, and last-21-bytes forms and a count field past the end; filter calls count only on zips that do not throw; AC3 narrowed to one case per record form at the bound; the live build is review's record. It also found a CPU hold through duplicate `manifest.json` entries, about 1,528 s for a 50 MiB XPI.
- 2026-10-25: re-audit of AC4 and AC5 after the question set (full mode): 4 findings, all taken. Only entries that `unzipSync` passes to the filter count; both messages are named; the 2,000-entry case uses 1 MiB streams and a 1 s bound; "more than one" replaces "two"; the live build also shows no `more than one` failure.
- 2026-10-25: question set: duplicate entries — refuse them in this milestone, as `xpi-unreadable`.
- 2026-10-25: question set: failure name — `xpi-unreadable` for both refusals.
- 2026-10-25: question set: live build at review — granted, one `pnpm build` against the live network.
- 2026-10-25: plan gate chose a count read before the unzip over running the unzip in a worker with a timeout, because a worker adds a thread and a time limit that the candidate "Warn when the daily build degrades" owns; falsified by a zip within the bound that still holds the CPU.
- 2026-10-25: plan gate chose copying fflate's record search over an own central-directory reader that replaces `unzipSync`, because it keeps the tested unzip path; falsified by an AC2 case whose count the copy cannot match.
- 2026-10-25: plan gate chose refusing duplicates over reading the first copy, the user's choice; falsified by a listed plugin's XPI that repeats `manifest.json`.
- 2026-10-25: T1 done. The AC1 and AC3 cases are in `test/upstream.test.ts`. Before the fix, the zip64 case ran past 180 s and past its 10 s timeout, because fflate's loop is synchronous, and the 65,535-entry case got `no-manifest`. A first helper also set the zip64 entries-on-this-disk field, which made fflate stop with "invalid zip data"; the helper now sets only the total-entry field that fflate reads.
- 2026-10-25: T2 done. `zipEntryCount` in `src/upstream/reader.ts` copies fflate's record search; `readManifest` refuses before the first unzip. Name chosen: `zipEntryCount`, beside `CENTRAL_HEADER_MIN_BYTES = 46`. `pnpm test` 205 passed, `pnpm check` 0 problems.
- 2026-10-25: T3 done. The AC2 table has 9 zips and states each count apart from both readers. Planted defects, each run then reverted: a scan from the last 4 bytes, no count-0 rule, and an 8-byte locator offset turned the last-21-bytes, count-0, and high-bits rows red, 3 of 9.

## Decisions

## Review
