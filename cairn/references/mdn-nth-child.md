# mdn-nth-child — which browsers read the `of <selector>` form of `:nth-child()`

**Provenance.** Ingested 2026-10-30 by M060 from
https://developer.mozilla.org/en-US/docs/Web/CSS/:nth-child, downloaded with curl by the agent to
`cairn/references/sources/mdn-nth-child.html` (gitignored). Its footer gives Jul 17, 2026 as the last change. The
page draws its browser compatibility table with JavaScript, from MDN's browser compat data. The agent downloaded
that data from https://bcd.developer.mozilla.org/bcd/api/v0/current/css.selectors.nth-child.json to
`cairn/references/sources/mdn-bcd-nth-child.json` (gitignored). Its `__meta` gives version 8.1.7 and timestamp
2026-10-30T00:01:30.334Z.
Pagination: none.
Extraction: verified 2026-10-30 against the downloaded page and data file, observed 2026-10-30.

**Citation.** MDN contributors. ":nth-child()". MDN Web Docs, Mozilla.
https://developer.mozilla.org/en-US/docs/Web/CSS/:nth-child. Browser compat data `css.selectors.nth-child`,
version 8.1.7.

**Role.** Settles which browsers apply the rules that use `:nth-child(An+B of S)` in the home page's pre-paint
style. When a language or Zotero filter is on, `prePaintStyle` writes such rules.

## Extracted values

Page section "The of <selector> syntax": by passing a selector argument, `:nth-child()` selects the nth element
that matches that selector, as in `:nth-child(-n + 3 of li.important)`. The page's specification row names
Selectors Level 4.

Data file, `css.selectors.nth-child.of_syntax` ("`of <selector>` syntax"), `version_added` per browser:

| Browser | Version |
|---|---|
| Chrome | 111 |
| Chrome Android | 111 |
| Edge | 111 |
| Firefox | 113 |
| Firefox for Android | 113 |
| Opera | 97 |
| Safari | 9 |
| Safari on iOS | 9 |

The plain `:nth-child()` entry gives Chrome 1, Edge 12, Firefox 3.5, and Safari 3.1.

## Traces to

- `src/site/home-filter.ts`: `prePaintStyle` puts each `of S` selector in its own rule, so a browser that does not
  read the form drops only those rules.
- `cairn/DESIGN.md` Known issues: the browsers that paint a filter's rows on every page before the script runs.

## Open questions

- None.
