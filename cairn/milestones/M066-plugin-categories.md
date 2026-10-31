# M066: Filter plugins by category

- **Status:** in-progress
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** user-facing — the public site's home page, plugin pages, and About page
- **Branch/PR:** m066-plugin-categories

## Goal

Let a visitor narrow the home table to one category of related plugins, such
as AI assistants or translation, and reach a category's plugins from a plugin
page.

## Scope

**In:** a fixed list of 13 categories in `src/site/categories.ts`: AI
assistants; Translation and dictionaries; PDF reading; Notes and annotations;
Citations and writing (Word, LaTeX, BibTeX); Metadata and cleanup (DOIs,
titles, duplicates); Attachments and full text; Journal rankings and citation
counts; Export and sync (Markdown, Obsidian, Notion); Search and discovery;
Library organization (tags, collections, columns, reading status);
Appearance (color themes); Connections for AI tools (MCP servers, local
APIs). Each has a word pattern, in English and Chinese, over a plugin's name
and descriptions, and hand `include` and `exclude` id lists. A plugin can
have several categories. The site build computes them (D-037). The home page
gets a "Category" menu beside the other filters, kept in `?category=`; each
plugin page links its categories to the filtered home page; the About page
explains them. A ledger records a hand read of the categories on the
deployed data.

**Out:**
- Categories in the published data (`v1/plugins.json`) and GitHub topics as
  a rule input → candidate row "Publish plugin categories in the data".
- Choosing more than one category at a time → no row; the request did not
  ask for it.
- Machine clustering and hand tags in each `index.json` → rejected at the
  question set (work log).

## Acceptance criteria

- [ ] AC1: `CATEGORIES` in `src/site/categories.ts` holds the 13 categories
      that Scope In names, each with a unique slug that matches
      `^[a-z0-9-]+$`, a name, a pattern, and `include` and `exclude` id
      lists, and no id is in both lists of one category. `categories(record)`
      returns, in `CATEGORIES` order, the slug of each category whose
      `exclude` list lacks the record's id and whose `include` list holds the
      id or whose pattern matches the record's display name, shown
      description, manifest description, or GitHub description.
      `test/categories.test.ts` checks the slug and list rules over
      `CATEGORIES`; for each category, one record that its pattern matches
      and one that it does not; for one category, four records that each
      match through one of the four texts alone, a name override and a
      description override among them; a record that no pattern matches; and
      an `include` entry, an `exclude` entry, and an `exclude` entry over a
      matching pattern, each changing one record's result.
- [ ] AC2: On the built home page each row carries `data-categories` with
      its record's `categories` joined by spaces, empty for none, and a
      "Category" menu, hidden in the HTML as the language menu is, offers
      "All categories" and then one option for each category that at least
      one row has, with the text "Name (N)" where N is its row count, most
      rows first and ties in `CATEGORIES` order. A site test checks the menu
      against fixture records that give two different counts, a tie, and a
      category with no rows, and checks each fixture row's
      `data-categories` against `categories(record)`.
- [ ] AC3: The home script runs the menu with the other filters. Choosing a
      category shows only the rows whose `data-categories` holds its slug
      that the other filters also pass, writes `?category=<slug>`, goes back
      to page 1, and makes the count read "M of N plugins"; "All categories"
      removes the parameter; `?category=<slug>` selects the category on load
      and on Back; a value that no option has selects "All categories" and
      leaves the address as an unknown `language` value does. A test in
      `test/site.test.ts` runs the built script in `node:vm` for each of
      these, for a category together with the search box, with the language
      menu, and with the version buttons, and for the return to page 1 from
      page 2 with more than 50 passing rows.
- [ ] AC4: `prePaintStyle` reads `category` as it reads `language`, matched
      against `data-categories`. Cases in `test/support/pre-paint.ts`, which
      the classic-script test also runs, check `?category=<slug>`, that value
      with `?language=`, with `?zotero=`, and with `&page=2`, and a value
      that is not letters, digits, and hyphens.
- [ ] AC5: Each built fixture plugin page whose record has a category lists
      the categories' names in `CATEGORIES` order, each a link to
      `${BASE}?category=<slug>`, under a label that names them as the index's
      grouping and links to the About page's categories section; a page
      whose record has none shows no list. A site test checks every fixture
      page against `categories(record)`, with one record whose two
      categories' `CATEGORIES` order differs from the alphabetical order of
      their names.
- [ ] AC6: The built About page has a section with `id="categories"` that
      names every category of `CATEGORIES` and says that the index assigns
      categories from words in a plugin's name and descriptions and adds or
      removes some by hand, that a category can be wrong or missing, and that
      plugin authors do not choose them. A site test checks the section and
      each name; review reads the three statements.
- [ ] AC7: On the deployed `v1/plugins.json` of the date that
      `cairn/references/category-ledger.md` names, by the agent's hand read
      that the ledger records, at most 1 in 10 of the assignments that
      `categories` makes are wrong, at most 1 in 10 records get no category,
      and at most 1 in 20 assignments come from an `include` list alone. The
      read does not measure a category missing from a record that has
      another.

## Coverage

- AC1 → T1
- AC2 → T3
- AC3 → T4
- AC4 → T5
- AC5 → T6
- AC6 → T6
- AC7 → T2

## Tasks

- [x] T1: Write `src/site/categories.ts` with `CATEGORIES` and `categories`,
      reading the texts through `displayName`, `shownDescription`, and the
      upstream fields, and `test/categories.test.ts`.
- [x] T2: Download the deployed data (lessons M035), tune the patterns and
      the `include`/`exclude` lists, and write
      `cairn/references/category-ledger.md` as a synthesis note with its
      Provenance block and `INDEX.md` line: date, record count, each record's
      id and categories with a right/wrong mark, and the three rates.
- [x] T3: Add `data-categories` (through `attributeValue`, so an empty value
      still prints) and the hidden "Category" menu with a `categoryOptions`
      helper to `site/src/pages/index.astro`; add fixture records for the
      counts, the tie, and the empty category, also to the three hand-kept
      id lists in `test/site.test.ts` (lessons M061); HTML tests.
- [x] T4: Add the category filter to `rowShows`, the count's `filtering`,
      the address, and `popstate` in the home script; extend the `homeScript`
      harness (row attribute regex, options per select, selector stand-ins,
      a menu-missing case, categories on `generatedRow`); `node:vm` tests.
- [x] T5: Add `category` to `prePaintStyle`, update its comment's sentence
      on which menus offer each row value, and add the cases to
      `test/support/pre-paint.ts`.
- [x] T6: Add the plugin page's category list and the About page's
      categories section; site tests.
- [ ] T7: Update DESIGN.md (Contract boundary, Site build family), README
      where it lists the filters, and CHANGELOG's Unreleased section; check
      the home, a plugin, and the About page in the browser pane at 1280 and
      375 px on the deployed data (lessons M015, M048, M054); `pnpm test` and
      `pnpm check` clean.

## Work log

- 2026-10-31: created by /milestone-plan.
- 2026-10-31: tier check: milestone — a new user-facing filter that needs a design decision on how plugins get categories.
- 2026-10-31: idea vet: gap — "discover clusters or themes" can mean machine clustering or a fixed list; the question set chose a fixed list with word rules; gap — "theme" also names Zotero color themes, one of the categories, so the menu and pages say "Category"; no flaw found.
- 2026-10-31: lessons used: 2026-10-25 (M001) pnpm through npx; 2026-10-25 (M007) match attribute forms in page tests; 2026-10-26 (M015) browser pane over http.server; 2026-10-27 (M021) `{" "}` at line ends; 2026-10-28 (M035) hand check on the deployed data; 2026-10-28 (M036) long lines after edits; 2026-10-29 (M048) iframe width check; 2026-10-29 (M053) built script in `node:vm`; 2026-10-29 (M054) words broken at 375 px; 2026-10-30 (M060) `prePaintStyle` reads nothing outside its body; 2026-10-30 (M061) three hand-kept fixture id lists.
- 2026-10-31: investigation: on the deployed data of 2026-10-31 (272 records) a first keyword draft of the 13 categories gave 253 records a category, 81 AI and 37 translation; GitHub topics of the 272 repos are scattered (ai, llm, codex, claude-code, deepseek apart) and 35 repos have none beyond zotero/plugin words.
- 2026-10-31: collision check: no ROADMAP row, archive summary, or D-entry covers categories (M008, M009, M056 name GitHub topics for discovery only); D-026 allows the script change; inbox: 0 open issues, 19 open bot pull requests, none overlapping.
- 2026-10-31: criteria audit (full mode, fresh Opus reader) returned 21 findings, all fixed by narrowing: per-text probes, exclude over a matching pattern, slug form, menu order and counts in an HTML test, the count while a category is on, page 1 with over 50 rows, one probe per filter pair, removal of an unknown value and Back, pre-paint cases with zotero and page, every fixture plugin page, CATEGORIES order against name order, About's hand-fix sentence and section id, the ledger as evidence rather than a promise, an include-share cap, the read's date and the missing-category limit stated; the Contract boundary point became D-037.
- 2026-10-31: plan gate chose a fixed list with word rules over machine clustering and over hand tags in each `index.json`, because clusters shift as plugins are added and fit one group each, and hand tags need work on every bot merge; falsified by a ledger read over 1 in 10 wrong after tuning, or by reports that a category misses most of its plugins.
- 2026-10-31: plan chose site-only categories over a `v1/plugins.json` field, because a field becomes part of the public data under D-006; falsified by a data user asking for categories (candidate row).
- 2026-10-31: question set: who reads the accuracy ledger — the agent reads it, and the user spot-checks it at the merge question.
- 2026-10-31: the plan foresees no dependency change and no outward action beyond the milestone pull request.
- 2026-10-31: ROADMAP hit its line and byte caps with the new rows, so the plan merged "Fail issue runs with no plugins folder" and "Count linked folders at the push base" into "Read plugins folders alike in both steps" and compressed "Test the home page script in a browser" (59 lines, 23,919 bytes).
- 2026-10-31: implement started on branch m066-plugin-categories, cut from main at f16d449.
- 2026-10-31: T1 done: `src/site/categories.ts` holds `CATEGORIES` (slug, name, an `about` phrase for the About page, pattern, include, exclude) and `categories`; the texts are read through `appliedValue` and `shownDescription`, since `displayName` lives in `site/src/data.ts`, which `src/site/` does not import; `test/categories.test.ts` has 25 tests; planting a dropped GitHub text and an ignored exclude list each failed its one test; `pnpm test` (1572 passed) and `pnpm check` clean.
- 2026-10-31: implementation choice: the translation pattern leaves out "translators" (Zotero's import translators, as Tara's text says) but keeps "Translator", so a plugin named "Paper Translator" still matches.
- 2026-10-31: T2 done: the tuning, committed with T1, used the deployed data of `generatedAt` 2026-10-30T21:13:54.875Z (272 records); `cairn/references/category-ledger.md` records 363 assignments, 0 wrong by the agent's read, 20 of 272 records with none, 8 of 363 from an include alone, and 66 exclude entries; on the 19 open bot pull requests, which the tuning never read, 2 of 27 assignments are wrong and 3 of 19 records get none.
- 2026-10-31: T3, T4, T5 done in one checkpoint, since the menu, the script, and `prePaintStyle` share the harness changes: `categoryOptions` in `categories.ts`, `rowCategoriesAttribute` in `data.ts`, a hidden "Category" menu after the search box, `rowShows` takes the category filter as its fifth argument, and `prePaintStyle` reads `category`; the site fixture's locale-plugin description now also names a single-page reading mode, so the fixture gives counts of 2 and 1, a three-way tie at 1, and categories with no row; planting a count that ignores the category, an address that drops it, and a `prePaintStyle` without it failed 1, 3, and 8 tests; `pnpm test` (1608 passed) and `pnpm check` clean.
- 2026-10-31: implementation choices: the menu sits after the search box, since it is the broadest filter; the address writes `category` after `q` and before `language`; the script needs the category menu as it needs the language menu, and the harness's menu-missing cases cover both.
- 2026-10-31: T6 done: a plugin page with categories shows "Index categories" (a link to `about/#categories`) and each category's name as a link to `?category=<slug>`, after the description; the About page's "Categories" section, before "What the index does not do", says where categories come from and lists each one with its `about` text; the page-head test now checks every fixture page's line against `categories(record)`; planting a name sort failed 2 tests; `pnpm test` (1610 passed) and `pnpm check` clean.
- 2026-10-31: the simple-english hook flags the ledger's `— observed` stamps and `Pagination: —.`; they stay, since the synthesis-note template and the references check read them.

## Decisions

## Review
