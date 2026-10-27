# M025: Drop locale folders naming no language

**Status:** done (2026-10-27, PR #37 https://github.com/jmgirard/zotero-plugin-index/pull/37)

**Goal:** The published `languages` list holds only tags whose language has an English name, so a locale folder such as `locale/img/` no longer lists `img` as a language.

**Outcome:** `localeLanguages` (`src/upstream/reader.ts`) keeps a canonical tag only when a module-level `LANGUAGE_NAMES` (`Intl.DisplayNames(["en"], { type: "language", fallback: "none" })`) names `new Intl.Locale(tag).language`; script, region, and variant are not checked, so `en-XX` and `en-Qaaa` stay. Two cases in the reader's languages table: seven folders give `["en-US", "fil"]` (`img`, `js`, `qaa`, `IMG`, `js_US` dropped), and `en_XX` with `en_Qaaa` gives both. `LANGUAGE_TAG` and the schema patterns are unchanged; `languages` override values are not filtered. README, the Unreleased CHANGELOG entry, the schema `languages` description, DESIGN (data sources item 2, reader paragraph, a Known issue), and both reader comments name the rule and its source, the build's Node.js `Intl` data.

**Decisions:** none. The question set kept overrides unfiltered and accepted that rare real languages with no English name drop.

**Review:** Plan audit 8 findings, re-audit 3, all fixed. Claim audit: 14 claims, 0 corrected. Pass 1 returned AC3 once (the `languages` comment did not name the `Intl` data; T5). Pass 2 fan-out (diff-bug, blame-history, prior-review, ripple): 21 findings; 1 fixed in `703df79` (CHANGELOG empty-list wording); 1 follow-up, new row "Drop zxx and mul from the languages"; 18 rejected; 1 noted. CI on Node 24 green. Hygiene: row "Drop locale folders naming no language" graduated; Known issue added for unnamed real languages; 3 lessons marked used M025; 1 captured (`Intl.DisplayNames` subtag naming); 2026-10-25 (M005, used M012) on `unzipSync` and Vitest timeouts evicted by rank.
