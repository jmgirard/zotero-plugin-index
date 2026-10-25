# M004: Limit what the reader downloads

**Status:** done (2026-10-25, PR #4 https://github.com/jmgirard/zotero-plugin-index/pull/4)

**Goal:** The upstream reader caps the bytes it downloads and unzips, and it refuses hosts in a listed set of loopback, private, and reserved address ranges.

**Outcome:** `src/upstream/reader.ts`: `readCapped` stops and cancels a body past `XPI_MAX_BYTES` (50 MiB,
`xpi-too-large`) or `UPDATE_JSON_MAX_BYTES` (1 MiB, `update-json-too-large`). `unzipOne` unzips `manifest.json`,
then the default locale's `messages.json`, and refuses a declared or compressed size over `UNZIPPED_MAX_BYTES`
(1 MiB, `manifest-too-large`), because fflate decodes a deflated stream in full and returns a stored file at its
compressed size. A `downloader` sends `redirect: "manual"` for the XPI and update.json, follows 301/302/303/307/308
against the current URL, at most 5 ("more than 5 redirects", `request-failed`), and refuses a non-http first URL.
`src/upstream/host-guard.ts` `refusal()` refuses `localhost`/`.localhost` and 14 IPv4 and 7 IPv6 ranges (mapped
addresses by their IPv4 part), by literal host or by any lookup answer, with its own bit parse; a non-address
answer is refused, the lookup gets the dotted name and times out at 60 s. `readUpstream(url, fetch, { lookup })`;
the CLI preload and test/build.test.ts stub `dns.promises.lookup`. A cut-off XPI body is now `request-failed`.
README, CHANGELOG, DESIGN.md (Known issues: DNS rebinding gap). Live build: 14 of 14 plugins read.

**Decisions:** none promoted. The user chose a reader-side DNS check over undici, and 50 MiB / 1 MiB / 5 redirects.

**Review:** Criteria audit (full, 14 findings taken) and claim audit (66 claims, 5 corrected; it found the stored-file
bypass, fixed with the compressed-size check). Four-lens fan-out, one pass, no return: 16 finding lines fixed on
the branch (lookup timeout and dotted name, non-address answers, XPI scheme, build test DNS stub, docs), 2 to new
rows "Refuse zips that claim too many entries" and "Block more IPv6 ranges in the host check", 6 rejected (1 edge:
`localhost..`). PR #4 CI passed. Row "Limit what the reader downloads" graduated. Lessons: 2 marked used, 3 captured.
