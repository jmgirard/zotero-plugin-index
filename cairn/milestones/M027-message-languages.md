<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M027: Skip locale folders that hold no messages

- **Status:** review   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** normal   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** —   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** —   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** user-facing — it changes what the published `languages` list holds, which the site's language line and menu show   <!-- owner: plan · create/amend-via-gate; user-facing | internal — <one-clause reason>; skill conduct only — no validate check parses it -->
- **Branch/PR:** m027-message-languages   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

## Goal
<!-- owner: plan · create; a wrong goal returns to plan, never edited in place -->

The `languages` list leaves out a locale folder whose files hold no messages, so Zoplicate 5.1.1, which ships 46 comment-only stub folders, lists only `en-US` and `zh-CN`.

## Scope
<!-- owner: plan · create/amend-via-gate -->

**In:** `localeLanguages` in `src/upstream/reader.ts` inflates locale files
and keeps a tag only when one of its files holds a message, judged by file
type (`.ftl`, `.properties`, `.dtd`; any other file counts). Limits on what
the step inflates, so a crafted XPI cannot hold the reader. New cases in the
reader's languages table. The README, CHANGELOG, schema description, DESIGN,
and code comments that state the rule.

**Out:** A folder whose files copy another folder's text still counts. The
user chose at the plan to build only the empty-folder rule; the new parked
row "Drop locale folders that copy another" holds it. `zxx` and `mul`
folders stay with the row "Drop zxx and mul from the languages". `languages`
override values and the schema's tag pattern do not change.

## Acceptance criteria
<!-- owner: plan · create/amend-via-gate; review reads, never reinterprets. -->

- [x] AC1: `localeLanguages` keeps a tag that the rules before this
      milestone keep if and only if a file holds a message among the files
      under the folders whose names canonicalize to that tag
      (`locale/<name>/` or `chrome/locale/<name>/`, at any depth). After a
      UTF-8 byte-order mark at the start of the file is removed, a file
      holds a message when one of these is true. The extension match
      ignores letter case.
      - Its name ends in `.ftl`, and a line matches
        `^-?[A-Za-z][A-Za-z0-9_-]*[ \t]*=` (a Fluent message or term).
      - Its name ends in `.properties`, and a line holds a character other
        than space, tab, or form feed whose first such character is not `#`
        or `!`.
      - Its name ends in `.dtd`, and it holds `<!ENTITY` outside comments.
        A comment runs from `<!--` to the next `-->`, or to the end of the
        file when no `-->` follows.
      - Its name ends in none of these three, a name with no extension
        included.
      Cases in the languages table of `test/upstream.test.ts` show:
      - for each of the three types, a folder whose one file holds only
        comments and blank lines left out, and one whose file holds one
        message kept;
      - an `.ftl` file holding only a term kept, an `.ftl` file whose one
        message follows a byte-order mark kept, and a `.properties` file
        holding a byte-order mark and only comments left out;
      - a folder holding only a `.png` file, and one holding only a file
        with no extension, kept;
      - a `chrome/locale/` folder and a nested `locale/<tag>/sub/x.ftl`
        following the same rule;
      - a folder holding a comment-only file and a file with a message kept;
      - `locale/zh_CN/` with comments only beside `chrome/locale/zh-CN/`
        with a message giving `zh-CN`, and both with comments only giving
        no tag.
- [x] AC2: The languages step counts a locale file as holding a message,
      without inflating it, when its declared unzipped or compressed size
      passes `UNZIPPED_MAX_BYTES`, when its compression method is neither
      stored nor deflate, or when its declared unzipped size would take the
      total that the XPI's locale files inflated past 8 MiB
      (`LOCALE_MAX_BYTES`). It also counts as holding a message a file whose
      inflate fails or whose output passes its declared size. A locale file
      never makes the read fail. A central directory that cannot be walked
      still fails with `xpi-unreadable`. The step reads each file from the
      central-directory header it is on, so it walks the directory once.
      For each of these cases, a test whose file holds only comments shows
      that the read returns `ok` and lists the folder's tag. One case is an
      XPI within `XPI_MAX_BYTES` whose comment-only locale files pass 8 MiB
      in total, and the folders after the total keep their tags. Another
      holds two locale entries with the same name.
- [x] AC3: While the index reads Zoplicate 5.1.1, a run of the Build data
      workflow on the milestone branch lists its `languages` as
      `["en-US", "zh-CN"]`. For each other record with an `upstream` block
      in both that run's data artifact and the published
      `https://jmgirard.github.io/zotero-plugin-index/v1/plugins.json`, with
      the same `upstream.version`, the branch list equals the published
      list, or equals it less tags whose folders' files hold no message by
      AC1's rule.
- [x] AC4: These passages state AC1's rule, that a folder counts only when
      one of its files holds a message, judged by file type: the
      `languages` paragraph of README.md's "Using the data"; the languages
      entry under "Unreleased" in CHANGELOG.md; the `languages` description
      in `schemas/plugins.v1.schema.json`; cairn/DESIGN.md's paragraph on
      interface languages, its data sources item 2, and its reader
      paragraph; and the comments on `UpstreamFacts.languages`,
      `readRelease`, and `localeLanguages` in `src/upstream/reader.ts`.
      DESIGN's reader paragraph and the `localeLanguages` comment also state
      that the step inflates locale files within AC2's limits in one walk.
- [x] AC5: `pnpm test` and `pnpm check` pass.

## Coverage
<!-- owner: plan · create/amend-via-gate -->

- AC1 → T1, T2
- AC2 → T2, T3
- AC3 → T6
- AC4 → T4
- AC5 → T5

## Tasks
<!-- owner: plan (create) / implement (check-off, minor edits); substantive
     change is amend-via-gate. -->

- [x] T1: In the languages table of `test/upstream.test.ts` (about lines
      131-162), give each file whose tag must stay a message line, and add
      the AC1 cases. See the new left-out cases fail on unchanged code.
- [x] T2: In `src/upstream/reader.ts`, split the inflate in `unzipOne` into
      a helper that reads one entry from its central-directory header, keep
      `unzipOne`'s failures for `manifest.json` and `messages.json`, and add
      the message check by file type. `localeLanguages` groups files by
      canonical tag and stops reading a tag's files at its first message.
- [x] T3: Add `LOCALE_MAX_BYTES` and the AC2 limits, then the AC2 tests.
      Build the 8 MiB case from small deflated comment files, per the M012
      lesson on deflate fixtures.
- [x] T4: Update the AC4 passages. Search joined copies of README.md,
      CHANGELOG.md, and DESIGN.md for the old wording, per the M018 lesson.
      Edit the existing Unreleased languages entry; add no new entry.
- [x] T5: Run `pnpm test` and `pnpm check`. Update any build fixture XPI or
      golden file whose locale files are empty and whose test expects a tag,
      and name each one in the work log.
- [x] T6: Push the branch, dispatch `build.yml` on it, download its data
      artifact, and compare it with the published data as AC3 states. Its
      deploy job fails on a branch (M006 lesson); nothing publishes.
- [x] T7: Review return 1: count real inflated bytes toward `LOCALE_MAX_BYTES`
      with small input chunks; keep a tag whose file's output length differs
      from its declared size; add a bomb timing test and the two short-read
      cases; drop the second duplicate-name case; fix ripple #1-#5.

## Work log
<!-- owner: any skill · append-only; one line per entry; absolute dates. -->

- 2026-10-27: created by /milestone-plan.
- 2026-10-27: tier check: not run — work named at the question set (the user asked for this plan after a question about Zoplicate's 48 languages; the run's first set was canceled).
- 2026-10-27: idea vet: one concern, a folder whose files copy another folder's text still counts — question set: build the empty-folder rule only, copies go to a parked candidate row. No concern on correctness: a folder with no messages gives that language no text.
- 2026-10-27: live scan: 23 of the 24 listed plugins with two or more languages read from their newest stable XPI; only Zoplicate has comment-only folders (46 of 48); locale files are `.ftl`, `.properties`, or `.dtd` only; the largest locale total is 562,599 bytes (Better BibTeX). Zotlit's XPI was not downloaded.
- 2026-10-27: collision check: extends M023 and M025 (done); no D-entry covers locale reading or unzip limits; row "Drop zxx and mul from the languages" stays separate; inbox: 0 open issues, 0 open PRs.
- 2026-10-27: lessons used: 2026-10-25 (M001), 2026-10-25 (M002, fixture preload), 2026-10-25 (M006, Pages deploy from main only), 2026-10-26 (M010, plant from a copy), 2026-10-26 (M012), 2026-10-26 (M014, per-test names), 2026-10-26 (M018).
- 2026-10-27: criteria audit (full mode, fresh Opus reader): 14 findings, all fixed — if-and-only-if wording, canonical-tag grouping, probes over root, depth, and mixed folders, Fluent terms count, BOM probes for `.properties`, unclosed DTD comments and no-extension files, every per-file failure listed, one directory walk, comment-only probe files, AC3 tied to 5.1.1 and to stub drops in other plugins, Node 24 by branch build, named passages in place of a grep; the two recording clauses left the criteria.
- 2026-10-27: question set: may the review run the Build data workflow on the branch for AC3 — yes.
- 2026-10-27: question set: dispatch the Build data workflow on main after the merge and check Zoplicate's published list — yes.
- 2026-10-27: plan gate chose a per-type message rule over a size threshold on locale files, because a short real translation can be smaller than a stub; falsified by a listed plugin whose translated folder the rule drops, or a locale file type other than the three.
- 2026-10-27: plan gate chose to count a file the step does not inflate as holding a message over failing the read, because no locale file failed a read before this milestone; falsified by a listed plugin whose false languages come from files over these limits.

- 2026-10-27: implement started on branch m027-message-languages, cut from main at 2068a97.
- 2026-10-27: T1: 12 AC1 cases added to the languages table, and each existing file whose tag stays now holds a message; on unchanged code the 7 left-out cases failed and the 5 kept cases passed.
- 2026-10-27: T2: `entryAt` and `inflateEntry` split out of `zipEntry` and `unzipOne`, whose failures and messages are unchanged; `holdsMessage` judges by extension; `localeLanguages` skips a tag already kept, so it reads a tag's files only until one holds a message. The `LOCALE_MAX_BYTES` budget and the per-file limits landed with T2, since the inflate path needs them; their tests are T3. `test/build.test.ts`'s language case gave its two `.ftl` files a message line (T5's fixture update). `pnpm test` 697 passed, `pnpm check` 0 problems.
- 2026-10-27: T3: AC2 tests added: a comment-only control and five per-file limit cases through a new `editHeader` helper, the 8 MiB case (ten 1,000,000-byte comment files, the last two kept), and two duplicate-name cases. The 8 MiB case builds its files from repeated comment lines, not the M012 deflate stream, since each file must stay under 1 MiB. Plants on a copy of `reader.ts`, restored after: no size cap failed the two size cases, a catch that drops failed the inflate-fails and past-size cases, no budget failed the 8 MiB case; no overflow stop failed nothing, since writing past the buffer then throws a RangeError that the same catch keeps.
- 2026-10-27: T4: the AC4 passages now state the message rule: README "Using the data", the Unreleased CHANGELOG languages entry (edited, no new entry), the schema `languages` description, DESIGN's languages paragraph, data sources item 2, and reader paragraph (one walk, the limits, still up to three walks per XPI), and the reader comments on `languages`, `readRelease`, and `localeLanguages`. A joined-copy search of README, CHANGELOG, and DESIGN finds none of the old phrases. The simple-english hook flagged older README and CHANGELOG lines outside this change; left as they are.
- 2026-10-27: T5: `pnpm test` 706 passed, `pnpm check` 0 problems, `cairn_validate` all passed. The only fixture changed is the language case in `test/build.test.ts` (T2); the golden `mixed-failures.plugins.json` is unchanged.
- 2026-10-27: T6: branch pushed at 82f544b; Build data run 40516293620 on the branch: build job success (Node 24), deploy job did not run (run conclusion failure, deploy left waiting on the environment rule), nothing published. Its `plugins-data` artifact lists Zoplicate 5.1.1 as `["en-US", "zh-CN"]`; 27 other records have an `upstream` block and the same version in both files, and all 27 language lists equal the published ones.
- 2026-10-27: claim audit: 65 claims read, 7 corrected — CHANGELOG.md, README.md, schemas/plugins.v1.schema.json, src/upstream/reader.ts, test/upstream.test.ts (`.properties` rule now names blank lines in CHANGELOG and schema; the budget counts the larger of declared and compressed size; the `readRelease` comment; the Fluent pattern described as coded, tab before `=` included, which AC1 names; the 8 MiB test name; README and CHANGELOG name files the reader cannot inflate). Code unchanged; `pnpm test` 706 passed, `pnpm check` 0 problems.
- 2026-10-27: implement done; status review.
- 2026-10-27: review return 1: the locale budget charges declared sizes, so headers sharing one deflate bomb hold the reader 16.5 s (diff-bug #1); a deflate entry that inflates short with no error, or a stored entry past the zip's end, drops its folder (diff-bug #2, #3). Fix: count real inflated bytes toward the budget with small input chunks, keep the tag when the output length differs from the declared size, add a bomb timing test, drop the second duplicate-name case, and fix ripple #1-#5 (UNZIPPED_MAX_BYTES comment, DESIGN caps and inflate sentences, README and CHANGELOG limit lists).
- 2026-10-27: T7 added for review return 1.
- 2026-10-27: T7: tests first: the bomb case (512 headers of a 16 MiB deflate stream declaring 1 byte each) took 17.8 s and failed, and the two short-read cases (no deflate data for a declared 10 bytes; stored data declared 1000 bytes running past the zip's end) dropped `de`. Fix: `inflateEntry` takes an input chunk size and an `onOutput` count; `localeLanguages` pushes 1 KiB at a time (`LOCALE_INFLATE_CHUNK_BYTES`), charges each file the largest of its declared size, compressed size, and output, and keeps a tag whose output length differs from its declared size. The bomb case now reads in about 120 ms; its expected list is the canonical form of its 512 tags, since retired regions such as `en-AN` canonicalize to another tag. The second duplicate-name case dropped. Ripple #1-#5 fixed, and README, CHANGELOG, and DESIGN now say "about 8 MiB". `pnpm test` 708 passed, `pnpm check` 0 problems. One `npx` start hung for 7 minutes before Vitest ran; the stuck process was stopped and the run repeated with `./node_modules/.bin/vitest`.
- 2026-10-27: claim audit: 37 claims read, 5 corrected — README.md, CHANGELOG.md, cairn/DESIGN.md, src/upstream/reader.ts (the budget can run about 1 MiB past 8 MiB, so "at most about 9 MiB"; README's stop rule names the count it uses; the `LOCALE_MAX_BYTES` comment; DESIGN's 1 MiB sentence names declared or compressed size and the overflow stop; CHANGELOG's limits entry names locale folders, not the default `messages.json`). Read over the T7 lines only; the first pass covered the rest. Reader tests 230 passed.
- 2026-10-27: implement done after review return 1; status review.

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive -->

Pass 1, 2026-10-27, branch head f22232c; main at 2068a97, not moved since the cut.

- AC1: `vitest run test/upstream.test.ts --reporter=verbose` passes all 21 "as the languages" cases: per type, a comment-only folder left out beside a kept message folder (`.ftl`; `.properties` with `#`, `!`, indented, and space/tab/form-feed lines; `.dtd` with a commented entity and an unclosed comment); a terms-only `.ftl` kept; a BOM `.ftl` message kept; a BOM comment-only `.properties` left out; `icon.png` and `LICENSE` folders kept; upper-case `.FTL` by content; `chrome/locale/` and nested `sub/` folders by content; a mixed folder kept; `locale/zh_CN/` beside `chrome/locale/zh-CN/` giving `zh-CN` with one message and no tag with none. The 9 cases kept from M023 and M025 still pass with message files.
- AC2: the same run passes the 6 limit cases (a comment-only control left out; declared size over 1 MiB, compressed size over 1 MiB, compression 12, a broken deflate stream, and output past a declared 3 bytes each keep `de` with the read `ok`), the 8 MiB case (ten 1,000,000-byte comment files, `["fr", "he"]` kept), and both duplicate-name cases (`ok`, `["de"]` and `[]`). Code read of `localeLanguages`: one `for…of centralEntries(zip)` loop, each file read through `entryAt(zip, header, zip64)` with no inner walk; every per-file step sits in a `try` that keeps the tag; `centralEntries` throws outside that `try`, and `readManifest` still maps it to `xpi-unreadable`. Implement's plants (work log) showed the cap, catch, and budget tests failing without their guard.
- AC3: Build data run 40516293620 at 82f544b (Node 24); `git diff 82f544b HEAD -- src` changes only comment lines. Its artifact lists Zoplicate 5.1.1 as `["en-US", "zh-CN"]`; the published data fetched again at review still lists it with 48 tags; 27 other records share a version in both files, and all 27 lists are equal.
- AC4: read at f22232c: README "Using the data" (folder needs a file that holds a message, rule per type), CHANGELOG Unreleased languages entry (same, per type), schema `languages` description (same, per type), DESIGN languages paragraph, data sources item 2, and reader paragraph (rule by type, one walk from each header, the 1 MiB and 8 MiB limits, still up to three walks), and the comments on `UpstreamFacts.languages`, `readRelease`, and `localeLanguages` (rule, one walk, limits). Each states the message rule.
- AC5: `pnpm test`: 17 files, 706 tests passed. `pnpm check`: 28 entries, 0 problems.
- Gate: `cairn_validate.py` all checks passed; no DESIGN principle changed, so `cairn_impact` skipped; the generic profile's consistency-gate slot names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: a 49 KB XPI of 512 headers sharing one deflate bomb declared 1 byte each takes 16.5 s (main 18 ms) and lists 494 false tags, since the budget charges declared sizes and `Inflate.push` decodes a whole 16 KiB input chunk before the overflow check — fix now, review return 1, fixed 448f337 (load-bearing: the Scope's "a crafted XPI cannot hold the reader").
- diff-bug #2: a deflate entry with compressed size 0 and declared size 10 inflates to nothing without an error, so its folder is dropped though AC2 counts a failed inflate as a message — fix now, review return 1, fixed 448f337.
- diff-bug #3: a stored entry whose data runs past the zip's end is read truncated and its folder dropped — fix now, review return 1, fixed 448f337 (same check as #2: output length differing from the declared size keeps the tag).
- diff-bug #4: 800,000 empty locale entries in a 48.8 MB XPI take 3.0 s stored and 5.4 s deflated, against 2.6 s on main — reject, edge: a crafted XPI near the 50 MiB cap, outside documented and common use; the effect is slow running, bounded by M005's entry-count check.
- diff-bug #5: `holdsMessage` decodes as UTF-8, so a UTF-16 `.ftl` or `.dtd` with messages is dropped; none of the 457 locale files in the 24 saved XPIs is UTF-16 — follow-up, new row "Read UTF-16 locale files as text".
- diff-bug #6: the compression precheck duplicates `inflateEntry`'s throw, and its test passes without it — reject, planned change: AC2 names the compression case as "without inflating", and the precheck keeps such a file off the budget.
- diff-bug #7: no test pins the overflow stop for locale files — fix now, review return 1, fixed 448f337: the bomb test for #1 pins the real-output budget, which bounds the same work.
- diff-bug #8: the control case, the second duplicate-name case, and the `icon.png`/`LICENSE` pair repeat code paths — the second duplicate-name case dropped, fix now, review return 1, fixed 448f337; the control is rejected, false (check discrimination asks for a case that stays silent); the pair is rejected, planned change (AC1 names both).
- diff-bug #9: AC2 says the budget counts declared unzipped size, the code counts the larger of declared and compressed — reject, false: the larger size is at least the declared size, so every AC2 case holds; comments and DESIGN state the code.
- blame-history #1: locale-file errors no longer map to `xpi-unreadable`, reversing M023's outcome with no D-entry — reject, planned change: AC2 and the plan gate's work-log line chose it; M023's rule was milestone-local, not a D-entry.
- blame-history #2: the 8 MiB budget fails open, so later comment-only folders count — reject, planned change (AC2, plan gate line).
- blame-history #3: AC2's budget unit differs from the code — reject, false (as diff-bug #9).
- blame-history #4: a lone-CR `.ftl` is misjudged since `m` breaks only on `\n` — reject, false: node shows `/^…=/m` matching after a lone `\r`.
- blame-history #5: the 562,599-byte comment drifts — reject, false: it is a dated observation, as the derived-figures rule asks.
- prior-review #1: the M023 error contract reversed — reject, planned change (as blame-history #1).
- prior-review #2: no bomb timing test for locale files — fix now, review return 1, fixed 448f337 (with diff-bug #1).
- ripple #1: reader.ts `UNZIPPED_MAX_BYTES` comment names only manifest.json and messages.json — fix now, review return 1, fixed 448f337.
- ripple #2: DESIGN's caps sentence says each unzipped file is capped at 1 MiB with no word on locale files — fix now, review return 1, fixed 448f337.
- ripple #3: DESIGN's inflate paragraph reads as failing every file past its declared size — fix now, review return 1, fixed 448f337 (name manifest.json and messages.json).
- ripple #4: README's reader limits list has no locale entry — fix now, review return 1, fixed 448f337.
- ripple #5: CHANGELOG's reader limits entry has no locale sentence — fix now, review return 1, fixed 448f337.
- ripple #6: the "Drop zxx and mul from the languages" row says `localeLanguages` keeps those folders — reject, false: it still keeps one that holds a message.
- Return floor: diff-bug #1 is a load-bearing defect, and #2 and #3 show AC2's failed-inflate case failing; status back to in-progress.

Pass 2, 2026-10-27, branch head 3280947 after review return 1; main at 2068a97, not moved.

- AC1: `vitest run test/upstream.test.ts --reporter=verbose`: the 21 "as the languages" cases pass, the same cases as pass 1.
- AC2: the same run passes the 8 per-file cases (the control, the five pass-1 cases, no deflate data for a declared size, stored data past the zip's end, each keeping `de` with the read `ok`), the 8 MiB case (`["fr", "he"]`), the duplicate-name case (`["de"]`), and the 512-header bomb case in 116 ms (17.8 s before T7). Code read: still one `centralEntries` loop with `entryAt` per header; the per-file `try` now wraps the inflate in a `finally` that charges the largest of declared size, compressed size, and output.
- AC3: Build data run 40521422892 at 3280947 (Node 24): build job success, deploy job failure on the branch, so nothing published (the live data still lists Zoplicate with 48 tags). Its artifact lists Zoplicate 5.1.1 as `["en-US", "zh-CN"]`; 27 other records share a version with the live data, and all 27 lists are equal.
- AC4: read at 3280947: the passages named in pass 1 still state the rule; DESIGN's reader paragraph and the `localeLanguages` comment now also state 1 KiB pushes, the real-output charge, and the about 1 MiB overshoot.
- AC5: `pnpm test`: 17 files, 708 tests passed. `pnpm check`: 28 entries, 0 problems.
- Gate: `cairn_validate.py` all checks passed; no principle changed; no toolchain checks in the generic profile.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: locale entries declaring size 0 charge nothing to the budget but each builds an fflate `Inflate`, so cost per entry exceeds main's (not measured by the reviewer) — reject, edge: the same crafted near-50 MiB XPI as pass-1 diff-bug #4 (5.4 s against 2.6 s on main), slow running only; recorded in new row "Bound per-entry work in the locale walk".
- diff-bug #2: the 512-header bomb test's 1 s bound may flake on CI — noted: 116 ms locally, and the build job runs it on Node 24 at review; raise to 2 s only if CI flakes.
- diff-bug #3: `zipEntry` now calls `entryAt` for every entry — reject, false: `u16` reads past the end as 0 and never throws, `zip64Sizes` already ran for every entry, and failure names and messages are unchanged.
- diff-bug #4: a stored entry whose compressed and declared sizes differ keeps its tag — reject, false: real zip tools write true sizes in the central directory, and the error only keeps a tag.
- diff-bug #5: `.properties` continuation after a comment, `<!ENTITY` in a quoted DTD value, and Fluent attribute-like lines — reject, false: each only keeps a tag, and no real translation is dropped.
- diff-bug #6: one push can decode more than 1 KiB of pending stored-block input — noted: stored output equals its input, so the about 1 MiB overshoot holds (the T7 claim audit measured 1,103,987 bytes at most).
- blame-history #1: per-file `Inflate` work is not charged to the budget, about 2 s for half a million entries — follow-up, row "Bound per-entry work in the locale walk".
- blame-history #2: `Intl` calls run for every locale entry before the kept-tag skip, 2.8 s per million entries, from M023 and M025 — follow-up, same row.
- blame-history #3: broken CHANGELOG reflow ("fails" alone) and ragged README and DESIGN lines — fix now, fixed c18aacd.
- prior-review #1: DESIGN never says the budget charges compressed size, though pass-1 diff-bug #9's reject says comments and DESIGN state the code — fix now, fixed c18aacd (DESIGN names the three charges).
- prior-review #2: added DESIGN lines over 80 columns and the lone "fails" CHANGELOG line, against the M018 wrap lesson — fix now, fixed c18aacd (DESIGN lines 40 and 257 rewrapped).
- ripple #1: DESIGN's inflate sentence gives 16 KiB for every file — fix now, fixed c18aacd (it now names `manifest.json` and `messages.json`).
- ripple #2: DESIGN's "each unzipped file at 1 MiB" reads as a failure rule for locale files — reject, false: the next sentence says a locale file over 1 MiB is not unzipped and counts.
- ripple #3: README's "inflates it 1 KiB at a time to find a message" implies an early stop inside a file — fix now, fixed c18aacd ("inflates the whole file, 1 KiB of input at a time, and then looks for a message").
- ripple #4: README's "a plugin that writes its text straight into its code ... its list is empty" is now one cause of two — reject, false: the sentence stays true, and the paragraph names comment-only folders above it.
- ripple #5: the schema's "Empty when the XPI has no such folder" — reject, false: "such folder" is a folder with a named language and a file that holds a message, so it covers both causes.
- Return floor: no finding shows a criterion failing or a load-bearing defect; no return.
