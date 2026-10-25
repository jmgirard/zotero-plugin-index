# mozilla-toolkit-version — how Zotero and Firefox order version strings

**Provenance.** Ingested 2026-10-25 by M007 from
https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/version/format,
downloaded with curl by the agent to `cairn/references/sources/mdn-legacy-version-format.html` (gitignored).
The old MDN titled this page "Toolkit version format". Its title is now "Legacy Version Formats", and the
format is in its section "Firefox legacy version number". Its footer gives Jul 17, 2025 as the last change.
Pagination: none.
Extraction: verified 2026-10-25 against the downloaded page, examples copied from its text — observed 2026-10-25.

**Citation.** MDN contributors. "Legacy Version Formats". MDN Web Docs, Mozilla.
https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/version/format.

**Role.** Settles how the site orders a visitor's Zotero version against a plugin's `strict_min_version` and
`strict_max_version`. Zotero 7+ reads these manifest fields with Mozilla's version comparator, which follows this
format. Firefox 108 and later warns on extension versions in this format. The `strict_*` fields of Zotero
plugin manifests still use it, for example `11.*.*` and `8.0-beta.21`.

## Extracted values

Section "Firefox legacy version number":

- A version string is one or more version parts separated by dots.
- "Each version part is parsed as a sequence of four parts: <number-a><string-b><number-c><string-d>." Each part
  is optional. Numbers are base-10 integers and can be negative. Strings are non-numeric ASCII characters.
- "if the version part is a single asterisk, it is interpreted as an infinitely-large number".
- "if string-b is a plus sign, number-a is incremented": "1.0+ is the same as 1.1pre".

Section "Comparing versions":

- Version parts are compared left to right. "An empty or missing version part is equivalent to 0."
- Within a part, "parts A and C are compared as numbers, while parts B and D are compared byte-wise."
- "A string part that exists is always less than a string part that doesn't exist (1.6a is less than 1.6)."

Section "Examples", copied verbatim (each line continues the ordering of the line above):

```
1.-1
< 1 == 1. == 1.0 == 1.0.0
< 1.1a < 1.1aa < 1.1ab < 1.1b < 1.1c
< 1.1pre == 1.1pre0 == 1.0+
< 1.1pre1a < 1.1pre1aa < 1.1pre1b < 1.1pre1
< 1.1pre2
< 1.1pre10
< 1.1.-1
< 1.1 == 1.1.0 == 1.1.00
< 1.10
< 1.* < 1.*.1
< 2.0
```

## Traces to

- `src/site/version.ts`: `compareVersions` implements the parsing and comparison rules above.
- `test/version.test.ts`: the ordered examples above, as a table.

## Open questions

- None.
