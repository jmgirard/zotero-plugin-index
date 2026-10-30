# M061: Show the repo, owner, and stars on plugin pages

- **Status:** in-progress
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

- [ ] AC1: A plugin page's repo URL is `upstream.repoUrl`, else the entry's `repoUrl`. If
      that URL matches `^https://github\.com/([^/]+)/([^/]+?)/?$`, the page head shows a
      repo line after the `h1` and before the description. The line links the owner to
      `https://github.com/<owner>` and `<owner>/<repo>` to the repo URL. If the URL does
      not match, the page shows no repo line. Site tests check each link's text and
      `href` on a page with an `upstream.repoUrl`. They also check a failure record whose
      entry `repoUrl` matches. They check that a page shows no line for a non-GitHub host,
      an `http:` URL, and a URL with an extra path segment.
- [ ] AC2: `pnpm build` writes GitHub's `stargazers_count` for each repo it reads as
      `upstream.stars`. `schemas/plugins.v1.schema.json` defines `stars` as an optional
      integer of at least 0. If GitHub gives no integer of at least 0, the record has no
      `stars`. Tests check the value read from a fixture repo response and a response
      with no usable count. They also check that the schema refuses `-1` and `1.5` for
      `stars`.
- [ ] AC3: If `upstream.stars` is present, the repo line of AC1 also shows the count as
      "N stars", or "1 star" for 1. N is written by `toLocaleString("en")`. If `stars` is
      absent, the line shows no count. A site test checks 0, 1, 1234 ("1,234 stars"), and
      a record with no `stars`.
- [ ] AC4: README's data field list, DESIGN's list of plugin page facts, and one
      CHANGELOG entry describe the repo line and the `stars` field. README and the
      CHANGELOG entry tell consumers that validate against a saved copy of the schema to
      fetch it again.
- [ ] AC5: `pnpm test` and `pnpm check` pass.

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
- [ ] T3: Update README, DESIGN, and CHANGELOG.
- [ ] T4: Run `pnpm test` and `pnpm check`.

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

## Decisions

## Review
