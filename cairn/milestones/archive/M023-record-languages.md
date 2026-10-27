# M023: Record each plugin's interface languages

**Status:** done (2026-10-27, PR #35 https://github.com/jmgirard/zotero-plugin-index/pull/35)

**Goal:** Each record in the data file carries the interface languages that the plugin's XPI ships locale folders for, and an override can correct them.

feature series: M023 -> M024

**Outcome:** `readManifest` (`src/upstream/reader.ts`) sets `languages` from the read XPI's entry names: the `<tag>` of `locale/<tag>/<file>` or `chrome/locale/<tag>/<file>` (not a name ending in `/`), `_` read as `-`, kept when it matches the exported `LANGUAGE_TAG` (2-3 letter language other than `und`, optional script, region, one variant), in `Intl.getCanonicalLocales` form, once, code-unit sorted; errors map to `xpi-unreadable`. The central-directory walk moved into the generator `centralEntries`, which `zipEntry` and `localeLanguages` share; the name walk streams. Schema v1 gained optional `upstream.languages` (unique, pattern-checked items). Both schemas accept a `languages` override whose value is tags joined by `, `, through an `if`/`then` pattern; a test pins the three pattern copies to `LANGUAGE_TAG`. `upstreamValue` (`site/src/data.ts`) shows the upstream list in the Overrides table. The golden `mixed-failures.plugins.json` gained `"languages": []`. README, CHANGELOG (one entry, M024 edits it), and DESIGN follow.

**Decisions:** none. D-014 (the home page's language-filter script) was recorded at the plan for M024.

**Review:** Claim audit at implement: 32 claims, 4 corrected. Fan-out (diff-bug, blame-history, prior-review, ripple): 22 findings; 16 fixed in `81cfc66` (streamed name walk inside the `xpi-unreadable` try, the Overrides-table value, a `locale/it/sub/` case, both `if` blocks tested, DESIGN and README wording); 2 follow-ups (repeated or other-case override tags to M024's work log; new row "Shorten the languages override error"), plus new row "Drop locale folders naming no language"; 4 rejected. Live build: 17 of 18 read plugins list `zh-CN`; zoplicate lists 48 tags, some near-copies of English. Lessons: 6 marked used M023; none captured.
