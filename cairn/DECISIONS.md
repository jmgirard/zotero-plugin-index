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
