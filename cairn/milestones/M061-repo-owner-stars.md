# M061: Show the repo, owner, and stars on plugin pages

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — it changes the plugin pages and adds a field to the public data file
- **Branch/PR:** m061-repo-owner-stars

## Goal

Each plugin page names the GitHub repo and its owner under the plugin's name, with the
repo's star count.

## Scope

**In:** a repo line in the page head of `site/src/pages/plugins/[id]/index.astro`, after
the `h1` and before the description. The line links the owner and `<owner>/<repo>` and
shows the star count. The owner and repo come from the repo URL. The count comes from a
new optional `upstream.stars` field that `src/upstream/reader.ts` reads from GitHub's
`stargazers_count`, defined in `schemas/plugins.v1.schema.json`. README, DESIGN, and
CHANGELOG describe both.

**Out:** a stars column, sort, or filter on the home table, which the plan question set
left out. The manifest's `author` field, which the question set also left out. The home
table fixes (the language menu arrow and the release month) are in M063. The full-support
rule for declared marks is in M062.

## Acceptance criteria

- [x] AC1: A plugin page's repo URL is `upstream.repoUrl`, else the entry's `repoUrl`. If
      that URL matches `^https://github\.com/([^/?#]+)/([^/?#]+?)/?$`, the page head shows a
      repo line after the `h1` and before the description. The line links the owner to
      `https://github.com/<owner>` and `<owner>/<repo>` to the repo URL. If the URL does
      not match, the page shows no repo line. Site tests check each link's text and
      `href` on a page with an `upstream.repoUrl`. They also check a failure record whose
      entry `repoUrl` matches. They check that a page shows no line for a non-GitHub host,
      an `http:` URL, a URL with an extra path segment, a URL with a query, and a URL with
      a fragment.
- [x] AC2: `pnpm build` writes GitHub's `stargazers_count` for each repo it reads as
      `upstream.stars`. `schemas/plugins.v1.schema.json` defines `stars` as an optional
      integer of at least 0. If GitHub gives no integer of at least 0, the record has no
      `stars`. Tests check the value read from a fixture repo response and a response
      with no usable count. They also check that the schema refuses `-1` and `1.5` for
      `stars`.
- [x] AC3: If `upstream.stars` is present, the repo line of AC1 also shows the count as
      "N stars", or "1 star" for 1. N is written by `toLocaleString("en")`. If `stars` is
      absent, the line shows no count. A site test checks 0, 1, 1234 ("1,234 stars"), and
      a record with no `stars`.
- [x] AC4: README's data field list, DESIGN's list of plugin page facts, and one
      CHANGELOG entry describe the repo line and the `stars` field. README and the
      CHANGELOG entry tell consumers that validate against a saved copy of the schema to
      fetch it again.
- [x] AC5: `pnpm test` and `pnpm check` pass.

## Coverage

- AC1 → T2
- AC2 → T1
- AC3 → T2
- AC4 → T3
- AC5 → T4

## Tasks

- [x] T1: Read `stargazers_count` into `upstream.stars` in `src/upstream/reader.ts` (near
      `repoDescription`, line 213), add `stars` to the record type and to
      `schemas/plugins.v1.schema.json`, and add the reader and schema tests.
- [x] T2: Add a repo-line helper in `site/src/data.ts` that returns the owner and repo for
      a matching URL, render the line and the star count in the page head, style it in
      `site/src/layouts/Base.astro`, and add fixture records and site tests. Look at the
      page at 375 px and 1280 px in the browser pane with the deployed data.
- [x] T3: Update README, DESIGN, and CHANGELOG.
- [x] T4: Run `pnpm test` and `pnpm check`.

## Work log

- 2026-10-30: created by /milestone-plan.
- 2026-10-30: tier check: milestone — the request adds a data field and changes page and table behavior across several parts.
- 2026-10-30: idea vet: gap, a star count can read as a ranking against the index's no-endorsement stance; reading taken: a plain count on the plugin page, with no sort or rank. Gap, "maintainer" can mean the GitHub owner or the manifest author; posed at the question set, which chose the owner.
- 2026-10-30: question set: maintainer name — GitHub owner from the repo URL; stars — plugin page only, not the home table; newest Zotero release — read zotero.org daily (M062); range past the newest release — none (M062).
- 2026-10-30: plan gate chose the GitHub owner over the manifest `author` field because it needs no new data and readers can check it; falsified by users asking for a person's name where an organization owns the repo.
- 2026-10-30: criteria audit (full mode, fresh Opus reader): 9 findings across M061 to M063, all fixed. Here: AC1 now names the URL pattern and tests the entry fallback and three refused forms, AC2 leaves `stars` out on an unusable count, and AC4 tells data consumers to fetch the schema again.
- 2026-10-30: collision check: no ROADMAP row, archived milestone, or D-entry covers the owner line or stars; D-006 and D-007 allow a new optional v1 field. Inbox sweep: 0 open issues, 18 bot pull requests, none overlapping.
- 2026-10-30: plan split the request into M061 (owner and stars), M062 (full-support marks), and M063 (menu arrow and release month); each ships alone, with no dependency.
- 2026-10-30: ROADMAP line cap: rows "Shorten the languages override error" and "Quote entry text in check messages" merged into "Fix two pnpm check message problems" to make room for three milestone rows.
- 2026-10-30: lessons used: 2026-10-27 (M021, Astro drops the space before an element on the next line), 2026-10-28 (M035, build the site from the deployed data for a hand check), 2026-10-26 (M015, serve the built site for the browser pane), 2026-10-28 (M036, end an Edit's old text at a line break when rewrapping docs).
- 2026-10-30: implement started on m061-repo-owner-stars, cut from main at 3bf8979; tree clean.
- 2026-10-30: T1 done: `src/upstream/reader.ts` writes `stars` from `stargazers_count` only for an integer of at least 0; the better-notes fixture gained its 2026-10-30 count, 8400; reader tests cover 0, absent, -1, 1.5, and "12", and a build test covers the schema; a planted `>= -5` failed the -1 case. `pnpm test` 1453 passed, `pnpm check` 0 problems.
- 2026-10-30: T2 choice: the repo line reads "By <owner> · <owner>/<repo> · N stars", muted text with bold links in the text color, chosen over an icon row to keep the head one line at 800 px.
- 2026-10-30: T2 done: `githubRepo` and `starsText` in `site/src/data.ts`, the line in the plugin page head, `.repo-line` CSS; site fixture gained stars 1234, 1, and 0, an extra-segment URL (min-only), an `http:` URL (zotero6), and a gitlab entry URL (punctuation failure record); planting `https?` and dropping the space after the owner link each failed the new tests. Browser pane, deployed data plus hand-set stars: no sideways scroll at 375 and 1280 px.
- 2026-10-30: T3 done: README's plugin page paragraph and data section, DESIGN's facts list and plugin page paragraph, and one CHANGELOG entry describe the repo line and `stars`, with the fetch-the-schema-again line; no added line passes 80 columns.
- 2026-10-30: T4 done: `pnpm test` 1462 passed and 6 skipped, `pnpm check` 272 entries and 0 problems.
- 2026-10-30: claim audit: 23 claims read, 5 corrected — site/src/data.ts, README.md, CHANGELOG.md, test/site.test.ts (four claims rested on the pattern letting `?` and `#` into the repo name, which a failure record's `meta.json` URL can reach; one test name said "the stars" for cases with none).
- 2026-10-30: substantive amendment: AC1's pattern is now `^https://github\.com/([^/?#]+)/([^/?#]+?)/?$`, and its no-line cases add a URL with a query and a URL with a fragment; the deliverable's look is unchanged.
- 2026-10-30: re-audit: AC1 (full) — 3 findings, none changing the wording: query and fragment cases sit on upstream records (answered: one `githubRepo` call serves both paths, and failure records are tested both ways); the owner group had no case of its own (fixed in tests: `https://github.com/example?x=/cafe-tools`, which a planted `[^/]+` owner group failed); a `.git` suffix still matches (answered: GitHub's `html_url` never has one, and the line still links the repo).
- 2026-10-30: implement complete; status review.
- 2026-10-30: step-7 approval: m061-repo-owner-stars approved for merge

## Decisions

## Review

- AC1 evidence (2026-10-30, branch head aea6794): verbose Vitest run of `test/site.test.ts` passes "opens the main content of %s …" for all 13 fixture records (the expected head holds the repo line after the `h1` and before the description), "shows the owner, the repo, and any stars of %s under the name" for first, old, guid, no-range, and the broken failure record (entry `repoUrl` fallback), and "shows no repo line for …" for an extra path segment, an `http:` URL, a non-GitHub host on a failure record, a URL with no scheme, a query after the repo, a query after the owner, and a fragment; `githubRepo` in `site/src/data.ts:194` uses the AC1 pattern.
- AC2 evidence (2026-10-30): `test/upstream.test.ts` passes "returns the facts of a plugin that meets the bar" (`stars: 8400` from the fixture's `stargazers_count`) and "reads a repo whose star count is %s" for 0 → 0 and absent, -1, 1.5, "12" → no `stars`; `test/build.test.ts` passes "writes the star count, and the schema takes an upstream with or without one and refuses -1 and 1.5" (`must be >= 0`, `must be integer`); `schemas/plugins.v1.schema.json` defines `stars` as optional integer, minimum 0.
- AC3 evidence (2026-10-30): the "shows the owner, the repo, and any stars" cases pass with literal text "By example · example/first-plugin · 1,234 stars" (1234), "… · 1 star" (old, 1), "… · 0 stars" (guid, 0), and "By example · example/no-range-plugin" (no `stars`); `starsText` uses `toLocaleString("en")`.
- AC4 evidence (2026-10-30): README.md:139-147 (plugin page paragraph: the repo line, its URL form, the star count) and README.md:252-256 (`stars` field, "fetch the schema again"); cairn/DESIGN.md:31-32 (facts list) and :89-93 (plugin page paragraph); CHANGELOG.md:499-507 (one Unreleased entry, with "fetch any saved copy of `schemas/plugins.v1.schema.json` again").
- AC5 evidence (2026-10-30): `pnpm test` 25 files passed, 1 skipped; 1465 tests passed, 6 skipped. `pnpm check`: 272 entries, 0 problems.
- Consistency gate (2026-10-30): `cairn_validate.py` all checks passed; no DESIGN principle changed, so no `cairn_impact` run; the generic profile names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: the star count renders only inside the repo line, so an upstream record whose URL fails the pattern shows no count while DESIGN listed the count unconditionally — fix now: DESIGN's facts list now names the URL form, fixed ee264bf
- diff-bug #2: `githubRepo` matches the host case-sensitively, so a failure record's `https://GitHub.com/a/b` gets no line — follow-up: part (8) of "Close small gaps on the site pages" (low, parked by its promote-when-reported condition; GitHub's `html_url` never takes this form)
- diff-bug #3: `.git`, `..`, and percent-encoded segments pass the pattern — follow-up: same part (8)
- diff-bug #4: the repo line's links use `--text`, not `--link` — reject (style): underlined links in the text color, recorded as the T2 choice
- diff-bug #5: five fixture records carried `upstream.repoUrl` forms GitHub never returns, giving malformed Releases links — fix now: refused forms moved to six new failure records, originals restored, fixed ee264bf
- diff-bug #6: the per-id head test derives its expectation from `githubRepo` and its name omitted the repo line — fix now: renamed; the derivation stays as a markup-and-order check, since the dedicated cases carry literal expectations, fixed ee264bf
- diff-bug #7: the build test set `stargazers_count` to the fixture's own 8400 — fix now: 8401, fixed ee264bf
- diff-bug (c): the "12" star case repeats the `Number.isInteger` path and tests dependency behavior, and the no-scheme no-line case repeats the `http:` prefix path — fix now: both dropped, fixed ee264bf
- blame-history #1: fixture upstream URLs GitHub never returns — fix now, as diff-bug #5, fixed ee264bf
- blame-history #2: punctuation-plugin moved to GitLab, though M031 added it for its id — fix now: restored, fixed ee264bf
- blame-history #3: zotero6-plugin moved to `http:`, though M037 added it for its all-none marks — fix now: restored, fixed ee264bf
- blame-history #4: no decision records showing star counts against the no-endorsement stance — reject (planned change): the plan question set chose a plain count with no sort or rank, and the plan's idea-vet line records the concern
- blame-history #5: the pattern accepts odd owner and repo names — follow-up: part (8), as diff-bug #3
- prior-review #1: the head assertion strips whitespace between tags — reject (false): the literal-text cases catch a dropped space, and a planted missing space failed them in T2
- prior-review #2: a stray short line in README's plugin page paragraph — fix now: rewrapped, fixed ee264bf
- prior-review #3: the repo-name link used `repoUrl` where the page's other links use the `safeHref` value — fix now: the line now needs `repoHref` and links it, fixed ee264bf
- ripple #1: About's intro says a plugin page shows facts for one release — reject (false): the page already showed repo-level facts (archived, open issues, repository created) before this diff
- ripple #2: README's "Building the data" field sentence omits `stars` — reject (false): that sentence is not a full list; `repoDescription` and `xpiSha256` are absent too, and "Using the data" describes `stars`
- ripple #3: the M054 CHANGELOG entry says the header shows the name and the description — reject (false): it records M054's change, and the new entry records this one
- ripple #4: the head test's name omits the repo line — fix now, as diff-bug #6, fixed ee264bf
- ripple #5: the 2026-10-29 mockup shows no repo line — reject (false): a dated design record
- ripple #6: the GitLab fixture URL disagreed with its failure message — fix now: the punctuation record is back on GitHub and the new GitLab record's message names its own URL, fixed ee264bf
- Post-fix verify (2026-10-30, ee264bf): `pnpm test` 1517 passed, 6 skipped; planting `https?` and a `[^/]+` owner group failed the `http:` and owner-query no-line cases on the new failure records.
