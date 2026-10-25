# M004: Limit what the reader downloads

- **Status:** review
- **Priority:** high
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the reader's new failure names appear in the published `plugins.json`
- **Branch/PR:** m004-download-limits

## Goal

The upstream reader caps the bytes it downloads and unzips, and it refuses hosts in a listed set of loopback, private, and reserved address ranges.

## Scope

**In:** A byte cap on the XPI body and on the `update.json` body. A size cap on each file that the reader unzips, and
unzipping of only `manifest.json` and the default locale's `messages.json`. A host check before each request to the XPI
URL, the `update_url`, and each redirect target of either: the URL host and each address that the reader's own DNS
lookup returns. Redirects followed by hand for those two requests, at most 5. Four new failure names:
`xpi-too-large`, `manifest-too-large`, `update-json-too-large`, and `host-refused`. README, DESIGN.md, and CHANGELOG
text for these limits.

**Out:**
- Responses from `api.github.com` stay uncapped and keep fetch's default redirect handling, because GitHub serves them
  and the 60 s timeout bounds each one. No further work is planned for them.
- A time budget per plugin and a warning on mass failure: candidate "Warn when the daily build degrades".
- An address check at connect time, which closes the DNS rebinding gap: candidate "Check addresses when the reader
  connects".

## Acceptance criteria

- [x] AC1: When a release XPI's body is longer than 52,428,800 bytes (50 MiB), `readUpstream` returns the failure
      `xpi-too-large`. It reads no more than 52,428,800 bytes plus the chunk that crosses the cap. A Vitest case serves
      fixed-size chunks and asserts the failure name and that the bytes enqueued are at most 52,428,800 plus one chunk.
      A second case serves a body of exactly 52,428,800 bytes and gets no `xpi-too-large`.
- [x] AC2: The reader unzips only `manifest.json`, and then only the default locale's `_locales/<locale>/messages.json`.
      When the zip's central directory gives either file an unzipped size over 1 MiB, `readUpstream` returns the
      failure `manifest-too-large`. Vitest cases cover each of the two files. A further case holds an oversized
      `messages.json` for a locale that is not the default, and it returns facts.
- [x] AC3: When the `update.json` body is longer than 1,048,576 bytes (1 MiB), `readUpstream` returns the failure
      `update-json-too-large`. It reads no more than 1,048,576 bytes plus the chunk that crosses the cap. A Vitest case
      serves fixed-size chunks and asserts the failure name and the bytes enqueued.
- [x] AC4: The reader takes the host as Node's URL parser gives it, with IPv6 brackets and one trailing dot removed.
      It refuses the host when the host is `localhost` or ends in `.localhost`, or when the host, or any address that
      the reader's lookup returns for it, is in a listed range. IPv4 ranges: 0.0.0.0/8, 10.0.0.0/8, 100.64.0.0/10,
      127.0.0.0/8, 169.254.0.0/16, 172.16.0.0/12, 192.0.0.0/24, 192.0.2.0/24, 192.168.0.0/16, 198.18.0.0/15,
      198.51.100.0/24, 203.0.113.0/24, 224.0.0.0/4, 240.0.0.0/4. IPv6 ranges: ::/96, fc00::/7, fe80::/10, ff00::/8,
      64:ff9b::/96, 2002::/16, 2001:db8::/32, and ::ffff:0:0/96 when its IPv4 part is in an IPv4 range above. For each
      of the following probes, written as a URL, `readUpstream` returns `host-refused` and sends no request to it: the
      first and last address of each range except ::ffff:0:0/96, `http://[::ffff:127.0.0.1]/`,
      `http://[::ffff:10.0.0.1]/`, `http://localhost/`, `http://foo.localhost./`, `http://LOCALHOST./`, and a name that
      the test's lookup resolves to one public and one blocked address. For each of the following probes, the reader
      sends the request: the address just outside each range edge, where that address exists and lies outside every
      listed range, `http://[::ffff:8.8.8.8]/`, and a name that resolves only to public addresses. A name whose lookup
      fails or returns no address gives `request-failed`, with no request sent.
- [x] AC5: For the XPI and `update.json` requests, the reader treats 301, 302, 303, 307, and 308 as redirects. It
      resolves the `Location` header against the current URL, checks each target as AC4 states before it requests it,
      and follows at most 5. Vitest cases cover: a redirect to `http://127.0.0.1/` and one to `//127.0.0.1/x`
      (`host-refused`, no request to the target), a chain of 6 (`request-failed`, message containing
      `more than 5 redirects`), a chain of 5 with a relative `Location` that ends in the recorded file (facts), each of
      the five statuses, a 3xx with no `Location`, and a `Location` with a `file:` scheme (both `request-failed`).
- [x] AC6: A live `pnpm build` over `plugins/` at review gives no record whose failure is `host-refused`,
      `xpi-too-large`, `manifest-too-large`, or `update-json-too-large`, and no `request-failed` record whose message
      contains `more than 5 redirects`.
- [x] AC7: `pnpm test` and `pnpm check` pass. The Unreleased section of `CHANGELOG.md` gains one entry that names the
      four failure names, the three byte caps (50 MiB XPI, 1 MiB for each unzipped file, 1 MiB `update.json`), and the
      5-redirect limit.

## Coverage

- AC1 → T1
- AC2 → T2
- AC3 → T1
- AC4 → T3
- AC5 → T4
- AC6 → T3, T4, T5
- AC7 → T1, T2, T3, T4, T5

## Tasks

- [x] T1: Capped body reads. In `src/upstream/reader.ts`, add a streaming read that stops and cancels the body at a
      byte cap. Use it for the XPI (50 MiB, `xpi-too-large`, replacing `arrayBuffer` at reader.ts:260) and for
      `update.json` (1 MiB, `update-json-too-large`, replacing `readText` at reader.ts:293). Let
      `test/support/fixture-fetch.ts` serve a body of fixed-size chunks and count the bytes enqueued. Tests per AC1
      and AC3.
- [x] T2: Unzip caps. In `readManifest` (reader.ts:251-288), unzip in two passes: `manifest.json`, then the default
      locale's `messages.json`. The fflate filter refuses a file whose `originalSize` is over 1 MiB
      (`manifest-too-large`). Add a code comment that fflate stops inflating at the declared size (observed
      2026-10-25), and one test that pins that output length. Tests per AC2.
- [x] T3: Host check. Add `src/upstream/host-guard.ts`: host from the URL with brackets and one trailing dot removed,
      the localhost names, the range check (unwrap ::ffff:0:0/96 to IPv4, and do not rely on `net.BlockList`'s IPv4
      default family), and a lookup of every address. `readUpstream` gains an optional third argument with a `lookup`,
      whose default is `node:dns/promises` `lookup` with `all: true`. `test/support/preload-fixture.ts` also replaces
      the lookup, so the CLI tests need no network. The table test per AC4.
- [x] T4: Manual redirects. A download helper for the XPI and `update.json` sends `redirect: "manual"`, checks each
      hop with T3's check, handles the five statuses and `Location` forms, and stops after 5 hops. `request()` for
      GitHub API calls keeps the default. `fixture-fetch.ts` records `init.redirect`, and a test asserts `"manual"` on
      both downloads. Tests per AC5.
- [x] T5: Docs and live run. A README paragraph after the `pnpm add-plugin` failure text on the limits and the host
      check. A DESIGN.md Architecture line, and a Known issues entry on the DNS rebinding gap. The CHANGELOG entry per
      AC7. Run a live `pnpm build` once and read its failures (AC6).

## Work log

- 2026-10-25: created by /milestone-plan.
- 2026-10-25: tier check: milestone — hardening of running code with design choices (caps, host rule), not a fix that restores documented behavior.
- 2026-10-25: idea vet: one concern, that a check of the URL text alone misses names that resolve to private addresses and redirects to them; the question set chose a URL plus DNS check on every hop.
- 2026-10-25: lessons used: 2026-10-25 (M002) the CLI tests' preload replaces fetch, so T3 also replaces the lookup there; 2026-10-25 (M001) run pnpm as `npx -y pnpm@12.15.0`.
- 2026-10-25: question set: how to refuse private hosts — URL host plus Node's built-in DNS lookup before each request and redirect, no new package.
- 2026-10-25: question set: download limits — 50 MiB XPI, 1 MiB for each unzipped file, 1 MiB update.json, 5 redirects.
- 2026-10-25: plan gate chose a reader-side DNS check over adding undici for a check at connect time because it adds no dependency and the reader publishes no response body; falsified by evidence that the build publishes response bodies or that a rebinding answer reaches a service on the runner.
- 2026-10-25: plan gate chose a two-pass unzip over a size cap on every locale file because it unzips only the files the reader uses; falsified by a listed plugin whose name or description resolves only from a locale that is not the default.
- 2026-10-25: criteria audit (full mode, Opus reader): 14 findings, all taken. Byte bounds now count against fixed test chunks and accept a body of exactly the cap. AC2 unzips two files only and drops the claim about understated zip sizes, which held only for the planted case. AC4 strips brackets and a trailing dot, adds ::/96, 64:ff9b::/96, 2002::/16, and the documentation and benchmark ranges, fixes the edge probes, and states the lookup failure. AC5 adds relative and protocol-relative redirects, the five statuses, and a missing or non-http Location. AC6 and AC7 use exact texts.
- 2026-10-25: collision check: absorbs the candidate "Limit what the reader downloads" in full; "Warn when the daily build degrades" stays separate (time budget, mass-failure warning); no D-entry overlaps.
- 2026-10-25: inbox sweep: 0 open issues, 0 open PRs.
- 2026-10-25: decided: an oversized `messages.json` fails the read as `manifest-too-large`, because only a broken or hostile XPI holds a messages file over 1 MiB.
- 2026-10-25: decided: a redirect over the limit, a 3xx with no Location, a non-http Location, and a failed or empty lookup all return `request-failed`, with a message that names the cause.
- 2026-10-25: changelog: one entry under Unreleased (AC7).
- 2026-10-25: started; branch m004-download-limits cut from main at 41e4e81.
- 2026-10-25: T1 done: `readCapped` reads the XPI and update.json bodies with caps exported as `XPI_MAX_BYTES` and `UPDATE_JSON_MAX_BYTES`; fixture `chunks` bodies count bytes enqueued; a planted missing cap turned both cap tests red. A cut-off XPI body is now `request-failed`, not `xpi-unreadable`. pnpm test 90 passed, pnpm check clean.
- 2026-10-25: T2 done: `unzipOne` unzips `manifest.json`, then the default locale's `messages.json`, refusing a declared size over `UNZIPPED_MAX_BYTES`; a test pins fflate's stop at the declared size; a planted missing cap turned both size tests red. pnpm test 94 passed, pnpm check clean.
- 2026-10-25: T3 done: `src/upstream/host-guard.ts` `refusal()` with its own IPv4/IPv6 parse to bits (no `net.BlockList`); `readUpstream(url, fetch, { lookup })` routes the XPI and update.json through a `downloader` that checks first; an unparseable XPI URL is `request-failed`. The preload replaces `dns.promises.lookup` (confirmed: an `.invalid` name resolved to the stub). Plants (no bracket strip, no mapped unwrap, no trailing-dot strip) turned 16, 2, and 2 probes red. pnpm test 183 passed, pnpm check clean.
- 2026-10-25: T4 done: `downloader` sends `redirect: "manual"`, follows 301/302/303/307/308 against the current URL, checks each hop, and stops after 5 (`request-failed`, "more than 5 redirects"); GitHub API requests unchanged. Plants (first hop only checked, limit 6) turned 2 and 1 tests red. A live read of zotero-better-notes returned 3.3.3 through the GitHub release redirect. pnpm test 195 passed, pnpm check clean.
- 2026-10-25: T5 done: README limits paragraph after the add-plugin failure text, CHANGELOG Unreleased entry, DESIGN.md Architecture line and a Known issues entry on DNS rebinding. Live `pnpm build` with a token: 14 records, 0 failed reads. pnpm test 195 passed, pnpm check clean.
- 2026-10-25: claim audit: 66 claims read, 5 corrected — src/upstream/reader.ts, README.md, CHANGELOG.md, test/upstream.test.ts (2 test names). The fflate comment was false: fflate decodes a deflated stream in full and returns a stored file at its compressed size; re-read found all 5 corrections hold.
- 2026-10-25: decided (from the claim audit): `unzipOne` also refuses a compressed size over 1 MiB, so a stored file with an understated size cannot pass the cap and decoding reads at most 1 MiB; new test with a stored, understated `manifest.json`, red without the check; fixture `base64` bodies added. AC2 wording unchanged. pnpm test 196 passed, pnpm check clean.
- 2026-10-25: implement done; status review.

## Decisions

## Review

Pass 1, 2026-10-25, branch m004-download-limits at 00b70a7, main 41e4e81 (not moved).

- AC1: `vitest run test/upstream.test.ts` passes "fails with xpi-too-large and stops reading an XPI past 50 MiB" (60 × 1 MiB chunks; asserts the failure and bytesEnqueued ≤ 52,428,800 + 1,048,576) and "reads the whole of an XPI of exactly 50 MiB" (50 × 1 MiB; `xpi-unreadable`, bytesEnqueued = 52,428,800). Both cap tests went red with the cap disabled (T1).
- AC2: passes "fails with manifest-too-large when manifest.json unzips to more than 1 MiB", "… when the default locale's messages.json unzips to more than 1 MiB", and "does not fail on an over-1 MiB messages.json of a locale that is not the default" (facts returned). `unzipOne` (src/upstream/reader.ts) filters on the exact name, called for `manifest.json` and then `_locales/<default_locale>/messages.json` only.
- AC3: passes "fails with update-json-too-large and stops reading an update.json past 1 MiB" (20 × 64 KiB chunks; asserts the failure and bytesEnqueued ≤ 1,048,576 + 65,536); red with the cap disabled (T1).
- AC4: 47 "refuses an update_url on …" cases pass (first and last of the 14 IPv4 and 7 IPv6 ranges, `[::ffff:127.0.0.1]`, `[::ffff:10.0.0.1]`, `localhost`, `foo.localhost.`, `LOCALHOST.`), each `host-refused` with the XPI as the last request. 37 "requests an update_url on …" cases pass (every outside edge that exists and lies outside all ranges, checked against the AC's list by hand, and `[::ffff:8.8.8.8]`), each with the probe as the last request. Named-host cases pass: mixed public and `fd00::1` refused; public-only requested; failed and empty lookups `request-failed` with no request.
- AC5: passes the redirect cases: to `http://127.0.0.1/update.json` and to `//127.0.0.1/x` (`host-refused`, last request the redirecting hop); a chain of 6 (`request-failed`, "more than 5 redirects", last request hop 5); 5 relative hops to the file (facts); each of 301, 302, 303, 307, 308 (facts); no Location and a `file:` Location (`request-failed`). "asks fetch not to follow redirects …" asserts `redirect: "manual"` on the XPI and update.json only.
- AC6: live `pnpm build --out <scratch>` with `GITHUB_TOKEN`, 2026-10-25: "wrote 14 records … 0 with a failed upstream read"; the file's records hold no `failure`, so none of the four names and no redirect-limit message.
- AC7: `pnpm test` 196 passed (tsc clean); `pnpm check` "checked 14 entries in plugins, 0 problems". `git diff main...HEAD -- CHANGELOG.md` adds one Unreleased entry naming `xpi-too-large`, `update-json-too-large`, `manifest-too-large`, `host-refused`, 50 MiB XPI, 1 MiB update.json, 1 MiB for manifest.json or messages.json, and at most 5 redirects.
- Gate: `cairn_validate.py` all checks passed (exit 0); no principle changed, so no `cairn_impact`; the generic profile's consistency-gate names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: a zip whose end record or zip64 end record claims up to 2^32−1 entries makes fflate's `unzipSync` loop for minutes with no timeout — follow-up, row "Refuse zips that claim too many entries" (fflate did this on main; the diff did not add it)
- diff-bug #2: the DNS lookup had no timeout — fix now, fixed 4537947: 60 s `withTimeout` in host-guard.ts, fake-timer test
- diff-bug #3: a lookup answer that is not an address counted as public — fix now, fixed 4537947: refused as `host-refused`, test with `"127.0.0.1 "`
- diff-bug #4: the lookup got the name with its trailing dot removed, which a resolver with search domains can answer differently from fetch's dotted name — fix now, fixed 4537947: the lookup gets the dotted name; test
- diff-bug #5: a cut-off XPI body changed from `xpi-unreadable` to `request-failed` with no test or changelog line — fix now, fixed 4537947: test row and a CHANGELOG sentence
- diff-bug #6: the first XPI URL's scheme was not checked; a `file:` URL passed with an injected lookup — fix now, fixed 4537947: `request-failed` before any request; test
- diff-bug #7: SIIT, local NAT64, discard, Teredo, and 192.88.99.0/24 ranges are not blocked — follow-up, row "Block more IPv6 ranges in the host check"
- diff-bug #8: `localhost..` passes the name rule — reject, edge: a doubled trailing dot is outside documented and common use, and the system resolver gives ENOTFOUND, so production returns `request-failed` with no request
- diff-bug #9: DESIGN.md's `readUpstream` signature was stale — fix now, fixed 4537947 (same as ripple #2)
- diff-bug #10: DESIGN.md's Known issues entry said the reader publishes no response body, but manifest fields are published — fix now, fixed 4537947: reworded to name the update.json host and what is published from it
- diff-bug #11: a non-Error lookup rejection gave "failed: undefined" — fix now, fixed 4537947: `String(error)` fallback
- diff-bug (c): rows that share a code path (two mapped addresses, `LOCALHOST.`, five redirect statuses, protocol-relative redirect) — reject, planned change: AC4 and AC5 name each probe. Comments that restate code — reject, false: they state how the literal lists were chosen and what the magic number and offset mean, which the code does not show
- blame-history #1: the comment "Unreadable messages leave the placeholders unresolved" reads as covering an oversized file — fix now, fixed 4537947: reworded to "a messages.json that is not JSON"
- blame-history #2: milestone choices sit in the work log, not DECISIONS.md — reject, false: the rulebook puts milestone-local decisions in the milestone file; none is cross-cutting
- blame-history #3: cut-off XPI body and 3xx-without-Location name changes undocumented — fix now, fixed 4537947 (with diff-bug #5)
- blame-history #4: no CLI-level failing fixture for `host-refused` — reject, false: the preload stubs both fetch and the lookup, so a CLI test cannot pass on the live network, and a CLI `host-refused` case would repeat the reader-level path
- blame-history #5: `updateHost` is the declared host, not the one that served the file after redirects — reject, false: the contract names the `update_url` host, and the diff did not change it
- prior-review #1: the DNS lookup is not bounded by the 60 s request timeout — fix now, fixed 4537947 (with diff-bug #2)
- prior-review #2: cut-off XPI body name change untested and undocumented — fix now, fixed 4537947 (with diff-bug #5)
- prior-review #3: DESIGN.md signature stale — fix now, fixed 4537947 (with ripple #2)
- ripple #1: test/build.test.ts calls `buildData` in-process, so its host check did real DNS and the test needed the network — fix now, fixed 4537947: the file stubs `dns.promises.lookup`; a planted rejecting stub turned the facts-invalid test red
- ripple #2: DESIGN.md Function Families gave `readUpstream(repoUrl, fetch)` — fix now, fixed 4537947: names the optional `{ lookup }`
- ripple #3: the ROADMAP candidate "Limit what the reader downloads" is still listed — reject, planned change: post-merge hygiene graduates the row
- ripple #4: the CLI test comments said the preload answers only requests — fix now, fixed 4537947: they name host lookups too
- Fix-now verify: `pnpm test` 201 passed, `pnpm check` clean.
