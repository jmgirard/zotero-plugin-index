# Decisions

Append-only. Never renumber; supersede with a new entry. D-entries record
choices with rationale — never deferrals ("not now" is a ROADMAP fact).

### D-001: Node toolchain for the bot, schema, and checks

2026-10-24, M001 plan. The project uses pnpm, TypeScript, Ajv for JSON Schema
checks, Vitest for tests, and fflate to read the zip inside an XPI. GitHub
calls use plain fetch, with no API client library. The user chose this set
at the plan question set over a smaller npm set with node:test and
hand-written checks, because it matches the zotero-plugin-registry tools and
checks JSON Schema directly.

### D-002: Each entry is a registry meta.json plus a sibling index.json

2026-10-24, M001 plan. Each plugin entry is `plugins/<id>/meta.json`, valid
against the zotero-plugin-registry schema, beside `plugins/<id>/index.json`,
which holds the fields only the index uses, such as overrides and their
reasons. The registry schema sets `additionalProperties: false`, so a field
the index adds to `meta.json` makes the entry invalid there. The user chose
the sibling file over one file with the index's own schema, which would give
up registry validity.

### D-003: Add @types/node to the D-001 toolchain

2026-10-24, M001 implement. The project adds `@types/node` as a dev
dependency, so `tsc --noEmit` can type-check code that imports Node's
built-in modules. D-001 did not name it. The user approved it at a chip over
running the code with no type check.

### D-004: Build the plugin site with Astro

2026-10-25, M007 plan. The static site uses the `astro` package, pinned at an
exact version when M007 adds it. Astro writes plain HTML from TypeScript
templates and sends no browser framework by default, so each page reads
without JavaScript and the version check stays one small script. The user
chose a framework at the plan question set over a TypeScript script that
writes HTML with no new package, which gives templates and routing. Any
further package, such as `@astrojs/check`, takes its own approval.
