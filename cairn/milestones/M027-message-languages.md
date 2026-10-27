<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M027: Skip locale folders that hold no messages

- **Status:** planned   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** normal   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** —   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** —   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** user-facing — it changes what the published `languages` list holds, which the site's language line and menu show   <!-- owner: plan · create/amend-via-gate; user-facing | internal — <one-clause reason>; skill conduct only — no validate check parses it -->
- **Branch/PR:** —   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

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

- [ ] AC1: `localeLanguages` keeps a tag that the rules before this
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
- [ ] AC2: The languages step counts a locale file as holding a message,
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
- [ ] AC3: While the index reads Zoplicate 5.1.1, a run of the Build data
      workflow on the milestone branch lists its `languages` as
      `["en-US", "zh-CN"]`. For each other record with an `upstream` block
      in both that run's data artifact and the published
      `https://jmgirard.github.io/zotero-plugin-index/v1/plugins.json`, with
      the same `upstream.version`, the branch list equals the published
      list, or equals it less tags whose folders' files hold no message by
      AC1's rule.
- [ ] AC4: These passages state AC1's rule, that a folder counts only when
      one of its files holds a message, judged by file type: the
      `languages` paragraph of README.md's "Using the data"; the languages
      entry under "Unreleased" in CHANGELOG.md; the `languages` description
      in `schemas/plugins.v1.schema.json`; cairn/DESIGN.md's paragraph on
      interface languages, its data sources item 2, and its reader
      paragraph; and the comments on `UpstreamFacts.languages`,
      `readRelease`, and `localeLanguages` in `src/upstream/reader.ts`.
      DESIGN's reader paragraph and the `localeLanguages` comment also state
      that the step inflates locale files within AC2's limits in one walk.
- [ ] AC5: `pnpm test` and `pnpm check` pass.

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

- [ ] T1: In the languages table of `test/upstream.test.ts` (about lines
      131-162), give each file whose tag must stay a message line, and add
      the AC1 cases. See the new left-out cases fail on unchanged code.
- [ ] T2: In `src/upstream/reader.ts`, split the inflate in `unzipOne` into
      a helper that reads one entry from its central-directory header, keep
      `unzipOne`'s failures for `manifest.json` and `messages.json`, and add
      the message check by file type. `localeLanguages` groups files by
      canonical tag and stops reading a tag's files at its first message.
- [ ] T3: Add `LOCALE_MAX_BYTES` and the AC2 limits, then the AC2 tests.
      Build the 8 MiB case from small deflated comment files, per the M012
      lesson on deflate fixtures.
- [ ] T4: Update the AC4 passages. Search joined copies of README.md,
      CHANGELOG.md, and DESIGN.md for the old wording, per the M018 lesson.
      Edit the existing Unreleased languages entry; add no new entry.
- [ ] T5: Run `pnpm test` and `pnpm check`. Update any build fixture XPI or
      golden file whose locale files are empty and whose test expects a tag,
      and name each one in the work log.
- [ ] T6: Push the branch, dispatch `build.yml` on it, download its data
      artifact, and compare it with the published data as AC3 states. Its
      deploy job fails on a branch (M006 lesson); nothing publishes.

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

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive -->
