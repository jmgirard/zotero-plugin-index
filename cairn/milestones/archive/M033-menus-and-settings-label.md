# M033: Label the languages as menus and settings

**Status:** done (2026-10-28, PR #60 https://github.com/jmgirard/zotero-plugin-index/pull/60)

**Goal:** A site visitor reads the languages that a plugin page lists as the languages of the plugin's own menus and settings, not of its description.

**Outcome:** The plugin page's languages line reads `Menus and settings in: <span data-fact="languages">…</span>` (`site/src/pages/plugins/[id]/index.astro`), and the home menu's `<label for="language">` reads `Menus and settings in` (`site/src/pages/index.astro`). The data field `languages`, the `?language=` parameter, "None declared", and the language names are unchanged. `test/site.test.ts` asserts both labels and reads every built plugin page for the old `Interface languages:`. README's home-menu and plugin-page paragraphs, the CHANGELOG Unreleased languages entry, and DESIGN's facts paragraph name the label, say the menu lists languages after overrides, and say the description comes from the manifest or an index override, so it can be in another language than the line names. The data docs keep the name "interface languages". The plan's scan of 22 of the 30 multi-language XPIs on 2026-10-28 found 21 with real translations of most strings; thin translations are M034.

**Decisions:** none. The plan question set chose the label "Menus and settings in" over "Translated into" and over a note under the old label.

**Review:** Plan audit and re-audit fixed AC1's page loop and AC3's wording. At implement AC3 was amended once: "the author's own text" became "comes from the plugin's manifest or from an index override", since `shownDescription` shows a maintainer's override (re-audit: nothing). Claim audit: 16 claims, 4 corrected. Fan-out (diff-bug, blame-history, prior-review, ripple): 24 findings; 6 fixed in `e9164ec` (README's override sentence, rewraps, a label split across lines); 2 to new row "Reword the empty languages line"; 15 rejected (the data keeps "interface languages", AC1's page loop, test names, comments); 1 noted. CI green. Hygiene: 6 lessons marked used M033; none captured; M030 row pruned.
