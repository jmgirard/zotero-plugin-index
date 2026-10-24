# Changelog

## Unreleased

- Each plugin entry is a directory `plugins/<id>/` with a registry `meta.json`
  and an `index.json` for index-only data, such as overrides with reasons.
- `pnpm check` checks every entry. It makes sure that both files exist, that
  each file is valid against its schema, that the `meta.json` id equals the
  directory name, and that each override reason contains text.
