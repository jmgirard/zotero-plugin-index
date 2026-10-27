# M031: Refuse unsafe entry names

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — it changes what `pnpm check` and `pnpm add-plugin` refuse, which contributors run, and their docs
- **Branch/PR:** m031-safe-entry-names

## Goal

`pnpm check` and `writeEntry` refuse entry names outside the id pattern, names that Windows reserves, and names that equal another entry's name ignoring case, and `pnpm check` reports stray files under `plugins/`.

## Scope

**In:** one name rule in `src/check/check.ts` that `writeEntry` also uses, three new `pnpm check` rules, a case-insensitive name match in `writeEntry`, a site fixture record with the punctuation the rule accepts, the source note for the Windows names, and the docs.

**Out:** blank override reasons, repeat overrides, and byte-order marks → M032. Windows path length (MAX_PATH) → not covered; the 200-character cap stays as it is. The build and `pnpm discover` keep skipping stray files through `listEntries`, since `pnpm check` runs before both in the workflows.

## Acceptance criteria

- [x] AC1: `entryNameProblem(name)` in `src/check/check.ts` refuses three kinds of name. The first kind does not match `^[A-Za-z0-9_@{}+.-]{1,200}$`, the pattern `writeEntry` uses now. The second kind starts or ends with `.`. The third kind has a part before its first `.` that equals, ignoring case, one of 22 names: CON, PRN, AUX, NUL, COM1 to COM9, and LPT1 to LPT9 (microsoft-naming-a-file). In `test/check.test.ts`, each of the 22 names is refused as written, in lower case, and with an extension such as `nul.tar.gz`. `Con`, `cOm1.txt`, `.x@example.org`, names with `%` or a space, and a name that ends in `.` are refused. `console@example.org`, `com0`, `lpt0`, `com10`, `lpt`, `aux-tools@example.org`, `first-plugin@example.org`, and `{c2a6e4c8-1b7d-4f3a-9e2b-5d8f0a1c3e7b}` are accepted.
- [x] AC2: `pnpm check` reports each name that `listEntries` returns and `entryNameProblem` refuses, under the rule `entry-name`, and exits 1. A `test/check.test.ts` case has entries named `a%b@example.org` and `CON`. Both hold valid files whose `meta.json` id equals the directory name. The output has one problem line for each, with its entry and rule, and no other problem line.
- [x] AC3: `pnpm check` reports each name in the checked directory that does not start with `.` and that `stat` reports as not a directory, under the rule `entry-is-directory`, and exits 1. A name that `stat` cannot read keeps its `files-present` line and gets no `entry-is-directory` line. A `test/check.test.ts` case puts a file `stray.json` beside a valid entry. It shows the line for the file and no line for the entry.
- [x] AC4: `pnpm check` reports each set of two or more names from `listEntries` whose `toLowerCase()` forms are equal, under the rule `unique-ignoring-case`. It prints one line for each set. The line's entry is the set's first name in sort order, and its message names every member. `test/check.test.ts` cases call the exported function that finds such sets. `Foo@example.org` with `foo@example.org` gives one set of both. `A@x.org`, `a@x.org`, and `A@X.ORG` give one set of three. `foo@example.org` with `foo2@example.org` gives none. A CLI case runs only where the temp directory's file system is case-sensitive, such as Linux CI.
- [x] AC5: `writeEntry` returns `unsafe-id` for an id that `entryNameProblem` refuses. It returns `entry-exists` for an id whose `toLowerCase()` equals the `toLowerCase()` of a name in `outDir`, with a message that names that existing name. In both cases it creates no directory. `pnpm add-plugin` and `pnpm discover` write entries only through `writeEntry`. In `test/add-plugin.test.ts`, `CON` and `nul.example` are refused as `unsafe-id`. An id `foo@example.org` beside an existing `Foo@example.org` is refused as `entry-exists`, and the message names `Foo@example.org`.
- [x] AC6: `pnpm site` writes `plugins/_x-y+z.w@{v}/index.html` for a record whose id is `_x-y+z.w@{v}`. That id holds each character other than letters and digits that `entryNameProblem` accepts, with `_` first and `}` last.
- [x] AC7: README "Checking entries" names the rules `entry-name`, `entry-is-directory`, and `unique-ignoring-case`, and it names the reserved Windows names. README "Adding a plugin" says that `unsafe-id` covers the reserved names. It also says that `entry-exists` covers an id that equals an entry's name ignoring case. CHANGELOG's Unreleased section has an entry for the change.
- [x] AC8: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1, T2
- AC2 → T3
- AC3 → T3
- AC4 → T3
- AC5 → T4
- AC6 → T5
- AC7 → T6
- AC8 → T7

## Tasks

- [x] T1: Save the Microsoft page "Naming Files, Paths, and Namespaces" (https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file, `ms.date` 2024-08-28) to `cairn/references/sources/`. Write the source note `cairn/references/microsoft-naming-a-file.md` with the reserved names, the extension sentence, the trailing space or period sentence, and the case sentence, and add its `INDEX.md` line.
- [x] T2: Add `entryNameProblem` to `src/check/check.ts`, moving the pattern from `SAFE_ID` (`src/add-plugin/add-plugin.ts:10`). Add the AC1 cases to `test/check.test.ts`. These cases spawn no pnpm, so run them with `./node_modules/.bin/vitest run test/check.test.ts` while working (LESSONS M027).
- [x] T3: In `checkTree` (`src/check/check.ts:36`), add the rules `entry-name`, `entry-is-directory`, and `unique-ignoring-case` to `Rule`. Read the stray names with a separate `readdir` and `stat` pass, and leave `listEntries` as it is, since the build and `pnpm discover` call it. Export the case-set function. Add the AC2, AC3, and AC4 cases. For the AC4 CLI case, test case sensitivity in the temp directory first and skip where it is not.
- [x] T4: In `writeEntry` (`src/add-plugin/add-plugin.ts:27`), call `entryNameProblem`, then read `outDir` and refuse a case-insensitive match before `mkdir`. A missing `outDir` has no names. Add the AC5 cases to `test/add-plugin.test.ts`. On macOS `mkdir` already fails with `entry-exists` for a case match, so the message assertion is what tells the new check apart.
- [x] T5: Add the AC6 record to the site fixture in `test/fixtures/site/`. Update the site tests that list rows or count records by hand, such as "gives each row the language subtags it applies" (`test/site.test.ts:401`), and keep the record out of the archived and language cases.
- [x] T6: Update README "Checking entries" and "Adding a plugin", DESIGN.md's "Entry checks" line, and CHANGELOG Unreleased. Search a joined copy of README for each phrase (LESSONS M018).
- [x] T7: Run `npx -y pnpm@12.15.0 test` and `npx -y pnpm@12.15.0 check` (LESSONS M001). Plant each new rule's defect from a copy of the file and restore from the copy (LESSONS M010).

## Work log

- 2026-10-28: created by /milestone-plan.
- 2026-10-28: tier check: not run — work named at the question set.
- 2026-10-28: idea vet: none found. The 22 names, the extension rule, and the trailing-period rule match microsoft-naming-a-file. The superscript COM and LPT names fall outside the id pattern. All 28 current entries pass the new rules (criteria audit read).
- 2026-10-28: lessons used: 2026-10-25 (M001), 2026-10-27 (M027), 2026-10-26 (M018), 2026-10-26 (M010).
- 2026-10-28: question set: work — candidate row "Catch stray and unportable entry files". Breadth — all parts, split as needed. M031 takes the name and stray-file parts, M032 takes the rest.
- 2026-10-28: collision: candidate row "Catch stray and unportable entry files" absorbed by M031 and M032. Extends done M001 (check), M002 (`writeEntry`), M007 (site), and M008 (discover). No D-entry covers entry names. Inbox: 0 open issues, and 5 open bot discovery PRs with no overlap.
- 2026-10-28: plan gate chose refusing unsafe ids in `pnpm check` over encoding them in the site, because `writeEntry` already refuses them and the registry names entries by directory; falsified by a listed plugin whose manifest id needs a character outside the pattern.
- 2026-10-28: plan gate chose a stray-file pass in `checkTree` over changing `listEntries`, because the build and `pnpm discover` share `listEntries` and would then stop on a stray file; falsified by a stray file that reaches a deploy past `pnpm check`.
- 2026-10-28: criteria audit (full): narrowed the goal to the named rules (Windows path length is not covered); added mixed-case, `com0`, `lpt0`, and dot-name cases (AC1); tied AC2 to `listEntries` names with valid files; tied AC3 to `stat` and kept `files-present` for unreadable names; made AC4 name the output line, add a three-member set, and add a CLI case on case-sensitive file systems; made AC5 lowercase both sides; restated AC6 as `pnpm site` output with `_` first and `}` last and moved the fixture edits to T5. AC7 and AC8 had no finding.
- 2026-10-28: sizing: 8 criteria, one over the advisory 7; kept as one milestone, since AC8 is the verify criterion and the 7 tasks fit one PR. M032 holds the rest of the row.
- 2026-10-28: started /milestone-implement on branch m031-safe-entry-names, cut from main at 83d422a.
- 2026-10-28: T1 done: saved the page to the shelf and wrote `cairn/references/microsoft-naming-a-file.md` with its INDEX line. The page lists no COM0 or LPT0.
- 2026-10-28: T2 done: `entryNameProblem` returns a message for each kind of name and undefined for a safe one. `SAFE_ID` stays in `writeEntry` until T4 moves it. `pnpm test` 814 passed, `pnpm check` 33 entries clean.
- 2026-10-28: T3 done: `checkTree` reports `entry-name` per entry, `entry-is-directory` from a separate `strayFiles` pass, and `unique-ignoring-case` from the exported `caseClashes`; `listEntries` is unchanged. Added a broken-symlink case for AC3. `pnpm test` 820 passed, 1 skipped: the CLI case-clash test skips on this macOS volume.
- 2026-10-28: T4 done: `writeEntry` calls `entryNameProblem` (the `unsafe-id` message keeps "cannot name a directory" and adds the problem) and refuses a name in `outDir` that differs from the id only by case, before any `mkdir`. An exact match still reaches `mkdir`'s `entry-exists`, as before. `SAFE_ID` is gone. `pnpm test` 823 passed, 1 skipped.
- 2026-10-28: T5 done: the site fixture's last record is the not-read record `_x-y+z.w@{v}`, so it adds no language or archived fact; the row-list test gained its row and the fixture test asserts the id. `pnpm test` 825 passed, 1 skipped.
- 2026-10-28: T6 done: README "Checking entries" lists the three rules and the 22 Windows names; "Adding a plugin" states the `unsafe-id` and `entry-exists` cases; DESIGN.md's "Entry checks" line and CHANGELOG Unreleased have the change. The CHANGELOG claim that a `%` or space id fails `pnpm site` is checked by a T7 plant.
- 2026-10-28: T7: a site build of the fixture with its last id set to `a%b@example.org` logged "Invalid URL encoding" and exited 0, and one with `a b@example.org` exited 0; both wrote every page, so the M007-review NoMatchingStaticPathFound failure does not reproduce on Astro 7.4.2. The CHANGELOG clause saying such ids made `pnpm site` fail is removed.
- 2026-10-28: T7: planted from copies, each restored: no Windows names (69 red), no trailing dot, no `entry-name` push, no stray files, sets of 3 only, no `writeEntry` case match, and `writeEntry` skipping Windows names each turned their tests red. On a case-sensitive APFS disk image as TMPDIR, the CLI case-clash test ran and passed, and turned red with the clash loop removed.
- 2026-10-28: T7 done: `pnpm test` 825 passed, 1 skipped (the case-sensitive CLI test on this volume); `pnpm check` 33 entries, 0 problems; `cairn_validate` passes with the known 8-criteria warning.
- 2026-10-28: claim audit: 31 claims read, 4 corrected — CHANGELOG.md, README.md, src/check/check.ts, src/add-plugin/add-plugin.ts. `pnpm check` skips names that start with ".", so the docs now say only "ends with"; `namesIn` now throws on a read error other than ENOENT or ENOTDIR, which `writeEntry` returns as `write-failed`, with a new test. The re-read found all four hold. The reader's note that an `--out` that is a file reports `entry-exists` (as on main) became candidate row "Name the failure when --out is a file".
- 2026-10-28: implement done: `pnpm test` 826 passed, 1 skipped; `pnpm check` 33 entries, 0 problems. Status set to review.
- 2026-10-28: step-7 approval: m031-safe-entry-names approved for merge

## Decisions

## Review

- 2026-10-28: synced: merged origin/main (4 bot entries, 1d6b57c) into the branch at 90caeb2; `pnpm test` 826 passed, 1 skipped; `pnpm check` 37 entries, 0 problems.
- AC1: `vitest run test/check.test.ts --reporter=verbose` at 90caeb2: "refuses the Windows name" passed 68 times (22 names as written, lower case, `.tar.gz`, plus `Con` and `cOm1.txt`); "holds the 22 reserved names" passed; `%`, space, `a/b`, empty, `.x@example.org`, and a trailing `.` refused; the 8 accepted names, `com0` and `lpt0` among them, passed.
- AC2: "entry-name: entries whose names are unsafe" passed at 90caeb2: entries `a%b@example.org` and `CON` with valid files and matching ids give exactly two problem lines, each `entry-name`, and exit 1.
- AC3: "entry-is-directory: a file beside the entries" passed at 90caeb2 (only `stray.json` `entry-is-directory`, exit 1, still "checked 2 entries"); "a broken symlink keeps files-present and gets no entry-is-directory" passed.
- AC4: the three `caseClashes` cases (pair, set of three, none) passed at 90caeb2. The CLI case skips on this macOS volume; with TMPDIR on a case-sensitive APFS disk image it ran and passed (112 of 112 in `test/check.test.ts`): one line, entry `Foo@example.org`, message naming both.
- AC5: `test/add-plugin.test.ts` at 90caeb2: "refuses the Windows name" passed for `CON` and `nul.example` (`unsafe-id`, no directory made); "refuses an id equal to an existing entry's name ignoring case" passed (`entry-exists`, message names `Foo@example.org`, only that directory). `git grep` shows entries created only at `src/add-plugin/cli.ts:27` and `src/discover/discover.ts:221`, both `writeEntry`; `pnpm propose` commits the handoff files that `writeEntry` wrote after `pnpm check` passes on them.
- AC6: `test/site.test.ts` at 90caeb2: "writes the home page and one page for each record under its raw id" passed with the fixture record `_x-y+z.w@{v}`, so `pnpm site` wrote `plugins/_x-y+z.w@{v}/index.html`; the fixture test asserts that id.
- AC7: README "Checking entries" holds `entry-name`, `entry-is-directory`, and `unique-ignoring-case` (3 matching lines in the section) and "CON, PRN, AUX, NUL, COM1 to COM9, and LPT1 to LPT9" (joined-copy grep, 1 match); "Adding a plugin" names `unsafe-id` for the Windows name `CON` and the case-only `entry-exists` match (1 match each); CHANGELOG Unreleased's last entry adds the three rules.
- gate: `cairn_validate.py` exit 0 (WARN: 8 criteria over the advisory 7); no DESIGN principle changed, so `cairn_impact` skipped; the generic profile's consistency-gate names no toolchain checks.
- AC8: at 90caeb2 `npx -y pnpm@12.15.0 test` 17 files, 826 passed, 1 skipped (the AC4 CLI case, run separately above); `pnpm check` 37 entries, 0 problems.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: the `chmod 0o300` test fails when tests run as root — fix now, fixed 4d07a88 (skips as root)
- diff-bug #2: `readHandoff`'s `ADDON_ID` accepts `a@b.` and `nul.x@y.org` — reject, false: `pnpm propose` runs `pnpm check`, now with `entry-name`, on each entry before any push (`src/discover/propose.ts:296`), and discover writes no such id
- diff-bug #3: an empty name gets "holds a character" — fix now, fixed 4d07a88 ("is empty", own test)
- diff-bug #4: messages quote the name twice — fix now, fixed 4d07a88 (messages now have no subject)
- diff-bug #5: `entry-is-directory` says "is a file" for a FIFO or socket — fix now, fixed 4d07a88 ("is not a directory")
- diff-bug #6: findings are no longer grouped by entry — reject, style: no criterion or doc states an order, and every finding prints
- diff-bug #7: another process can create a case variant between `readdir` and `mkdir` — reject, edge: two processes writing one `--out` at once is outside documented and common use, and `pnpm check` then reports the pair
- diff-bug #8: a CHANGELOG line of about 110 characters — fix now, fixed 4d07a88 (rewrapped)
- diff-bug #9: the site test's `toContain("_x-y+z.w@{v}")` is weaker than the row-list test — fix now, fixed 4d07a88 (removed)
- diff-bug #10: "holds the 22 reserved names" tests the test's own list — fix now, fixed 4d07a88 (removed; the 68 cases still name each reserved name)
- diff-bug #11: 68 cases, two `writeEntry` Windows cases, and the set of three run one code path — reject, planned change: AC1, AC4, and AC5 name these cases
- diff-bug #12: two accepted names were already accepted by `SAFE_ID` — reject, planned change: AC1 names them as cases the new reserved-name rule must leave alone
- blame-history #1: a trailing-dot id is now refused — reject, planned change (AC1)
- blame-history #2: a case-only `entry-exists` in `outDir` is build-level in discover — reject, false: `draftEntry` refuses an index case match first (`discover.ts:217`), and M028's rule marks `entry-exists` from `outDir` build-level
- blame-history #3: an unreadable `outDir` now fails with `write-failed` — reject, false: the case check cannot run on a directory it cannot read, which the claim audit chose and a test pins
- blame-history #4: the `unsafe-id` message gained text — reject, false: `test/issue.test.ts:159` still matches
- blame-history #5: add-plugin now imports check.ts — reject, false: no cycle, and discover already loaded it
- prior-review #1: long CHANGELOG line and long `check.ts` comment — fix now for CHANGELOG, fixed 4d07a88; reject, style, for the code comment, since src lines run past 120 characters elsewhere
- prior-review #2: case-only `entry-exists` in `outDir` — reject, false (as blame-history #2)
- prior-review #3: M020 rejected a case-sensitive id edge — reject, planned change (AC4, AC5)
- prior-review #4: a root that is a file rethrows ENOTDIR — reject, false: unchanged from main
- ripple #1: `readHandoff`'s `ADDON_ID` differs from the rule — reject, false (as diff-bug #2)
- ripple #2: README says each line names "the entry directory", but a stray file is not one — fix now, fixed 4d07a88
- ripple #3: README:407 and DESIGN.md say `entry-exists` is for a directory already in the output directory — reject, false: still true, and README "Adding a plugin" states the case-only match
- ripple #4: the first CHANGELOG `pnpm check` bullet omits the new rules — reject, false: the new entry in the same Unreleased section states them
- ripple #5: CHANGELOG:77 `entry-exists` wording — reject, false (as ripple #3)
- ripple #6: the ROADMAP comment lost the "Candidate priority token" pointer — fix now, fixed 4d07a88
- post-fix: at 4d07a88 `pnpm test` 825 passed, 1 skipped; `pnpm check` 37 entries, 0 problems. AC1's evidence stands without the removed self-test; the empty name now has its own case.
