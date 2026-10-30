# M065: Drop the repeated owner from the repo line

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — it changes what the public plugin pages show
- **Branch/PR:** m065-repo-line-owner

## Goal

Each plugin page's repo line reads "By <owner> · <repo>", not "By <owner> · <owner>/<repo>".

## Scope

**In:** the `data-repo-name` link text on the plugin page (`site/src/pages/plugins/[id]/index.astro`).
The head test and the repo line test in `test/site.test.ts`.
README's and DESIGN.md's plugin page paragraphs and the M061 CHANGELOG entry.

**Out:** the line's links, the star count (M064), and how a long name wraps, which the question set kept as is.
Bot branch names and addresses written `<owner>/<repo>` elsewhere in README and DESIGN.md are not the page line.

## Acceptance criteria

- [x] AC1: On every fixture page with a repo line (the head test), and on the five records of the repo line test in
  `test/site.test.ts`, the `data-repo-name` link text is the repo name alone, such as "first-plugin".
  It links to the repo URL, as before.
  The `data-repo-owner` link still reads the owner and links to `https://github.com/<owner>`.
  The line's text with the `.visually-hidden` span removed reads, for example, "By example · first-plugin · 1,234".
  The head test and the repo line test check this.
- [x] AC2: README's plugin page paragraph, DESIGN.md's plugin page paragraph, and the M061 CHANGELOG entry give the
  line's form as "By <owner> · <repo>" and say that the repo name links to the repository.
  In those three passages, a joined-text search finds `<owner>/<repo>` only inside `https://github.com/<owner>/<repo>`.
  It finds no `windingwind/zotero-better-notes`.
- [x] AC3: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T1
- AC2 → T2
- AC3 → T3

## Tasks

- [x] T1: Change the `data-repo-name` link text to `github.repo`, then update the head test's expected line and the
  repo line test's rows (tests first).
- [x] T2: Rewrite README's plugin page paragraph (near line 150), DESIGN.md's (near line 92), and the M061 CHANGELOG
  entry (near line 499).
- [x] T3: Run `pnpm test` and `pnpm check`. Build the site from the deployed data and view a plugin page with a long
  repo name in the browser pane at 375 px.

## Work log

- 2026-10-30: created by /milestone-plan.
- 2026-10-30: tier check: milestone — a change to running code that is not a bug.
- 2026-10-30: idea vet: gap — the request leaves open what replaces the repeated owner; the set chose "By owner · repo" over "By owner" alone and "owner/repo" alone. No flaw: a link that reads only the repo name after "By <owner> ·" is clear in context, and the Source button links the same repo.
- 2026-10-30: collision check: M061 (done) shipped "By <owner> · <owner>/<repo>"; this plans an extension of it. M064 (done) added the star count after it. No candidate row or D-entry covers the repo line. Inbox sweep: 0 open issues; 0 open PRs outside the bot's "Add" PRs.
- 2026-10-30: lessons used: 2026-10-27 (M021) Astro drops line breaks, write `{" "}`; 2026-10-30 (M061) the fixture ids are listed by hand in three tests; 2026-10-26 (M018) search a joined copy of wrapped prose; 2026-10-28 (M036) end an Edit's old text at a line break; 2026-10-26 (M015) serve the built site through launch.json; 2026-10-28 (M035) build from the deployed data; 2026-10-25 (M001) run pnpm through npx.
- 2026-10-30: question set: repo line — "By owner · repo", the owner linking to their GitHub page and the repo name to the repo.
- 2026-10-30: question set: long names — keep the browser's normal wrapping, so a long repo name can break at a hyphen.
- 2026-10-30: plan gate chose "By owner · repo" over "By owner" alone because the repo name often differs from the plugin name and says where the code lives; falsified by users who read the repo name as noise beside the Source button.
- 2026-10-30: criteria audit (full), run after the question set because the line's form was the set's open choice: 2 findings, both taken. AC1 covers every fixture page with a repo line through the head test. AC2 names the link sentences and searches for `<owner>/<repo>` outside an address. No problem in AC3; a repo-name-only link is clear in context (link purpose in context).
- 2026-10-30: T1 done: `data-repo-name` reads `{github.repo}`. The head test expects `escaped(github.repo)` and the five repo line rows expect the bare repo name; they went red first (16 failed: 11 head-test pages, 5 rows) and pass with the change. `pnpm test` 1547 passed, `pnpm check` 0 problems.
- 2026-10-30: T2 done: README, DESIGN.md, and the M061 CHANGELOG entry give "By <owner> · <repo>" and say the repo name links to the repository; the example reads "By windingwind · zotero-better-notes · ★ 8,400". A joined-text search of each passage, with `https://github.com/<owner>/<repo>` removed, finds `<owner>/<repo>` and `windingwind/zotero-better-notes` 0 times. No added line over 80 characters. `pnpm test` 1547 passed, `pnpm check` 0 problems.
- 2026-10-30: T3 done: built the site from the deployed data and served it as `m064-look`. At 375 px in the dark scheme, the Abbreviation Helper page's line reads "By Cydoimos · zotero-abbreviation-helper · 3" (visible text) on one row; the owner links `https://github.com/Cydoimos`, the repo name `https://github.com/Cydoimos/zotero-abbreviation-helper`; page width 375.
- 2026-10-30: status review; all tasks checked, `pnpm test` and `pnpm check` clean.
- 2026-10-30: claim audit: 14 claims read, 0 corrected — README.md, CHANGELOG.md, cairn/DESIGN.md, the plugin page template, test/site.test.ts.

## Decisions

## Review

- 2026-10-30, branch head 0e03afa, default branch not moved since the cut.
- AC1: the plugin page tests pass (96, including 19 "opens the main content" pages and the 5 "shows the owner" rows); the head test matches each fixture's line exactly with `data-repo-name>` + `github.repo`, and the rows pin the link text ("first-plugin"), the repo URL, the owner link `https://github.com/example`, and the visible text ("By example · first-plugin · 1,234"). Built Abbreviation Helper page: "By Cydoimos · zotero-abbreviation-helper · 3", the repo name linking the repo URL.
- AC2: README (lines 150-151), DESIGN.md (lines 92-94), and the CHANGELOG entry (lines 499-505) give "By <owner> · <repo>" and say the repo name links to the repository; a joined-text search of each passage, with `https://github.com/<owner>/<repo>` removed, finds `<owner>/<repo>` and `windingwind/zotero-better-notes` 0 times.
- AC3: `pnpm test` 25 files, 1547 passed, 6 skipped; `pnpm check` 272 entries, 0 problems.
- Consistency gate: `cairn_validate.py` all checks passed; no principle changed; the generic profile names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- blame-history #1: part (8) of the candidate row "Close small gaps on the site pages" says `https://github.com/a/b.git` shows "a/b.git"; it now shows "b.git" — fix now (the row says "b.git")
- blame-history #2: the repo link no longer names the owner, so a links list or copied text reads only the repo name — reject, planned change: the question set chose "By owner · repo", and the link is clear in context
- diff-bug #1: the five repo line rows run one rendering path, and the two no-stars rows repeat each other — reject, false: the rows exist for the star cases (1,234, 1, 0, none) and predate this change, which only updates their expected text
- diff-bug #2: no fixture repo name needs escaping or differs from its slug — reject, false: GitHub repo names hold only letters, digits, `.`, `-`, and `_`, and Astro escapes text expressions
- diff-bug #3: a repo-name-only link lacks the owner out of context — reject, planned change (as blame-history #2)
- diff-bug #4: T3's work-log line names the preview `m064-look` — reject, false: that is the `.claude/launch.json` entry reused on purpose
- diff-bug #5: the M061 CHANGELOG entry was edited in place — reject, false: both sit under Unreleased, so the entry states the final form
- prior-review #1: the bare repo link may repeat M048's link-purpose finding — reject, planned change (as blame-history #2)
- prior-review #2: the CHANGELOG entry was edited in place — reject, false (as diff-bug #5)
- prior-review #3: DESIGN.md cites milestone ids inline — reject, false: the same paragraph already cites M054 and M061
- ripple: no ripple evidence
