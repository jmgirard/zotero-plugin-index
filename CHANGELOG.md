# Changelog

## Unreleased

- Each plugin entry is a directory `plugins/<id>/` with a registry `meta.json`
  and an `index.json` for index-only data, such as overrides with reasons.
- `pnpm check` checks every entry. It makes sure that both files exist, that
  each file is valid against its schema, that the `meta.json` id equals the
  directory name, and that each override reason contains text.
- `pnpm add-plugin <github-url>` drafts an entry from the GitHub repository of
  a plugin. It reads the manifest in the newest release that has an `.xpi`
  file. It writes `meta.json` and `index.json` under `plugins/<id>/`, or under
  the directory that `--out <dir>` names. If the plugin does not meet the
  inclusion bar, the command writes no file and prints the failure name.
- The index lists its first 14 plugins.
