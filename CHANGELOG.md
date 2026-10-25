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
- `pnpm build` writes the data file `dist/v1/plugins.json`, valid against
  `schemas/plugins.v1.schema.json` (`schemaVersion` 1). Each entry gets one
  record, with its upstream facts and its overrides in separate blocks. If
  the read of a plugin fails, its record carries the failure name, and the
  build goes on. A workflow runs the build once a day and keeps `dist/` as a
  workflow artifact.
- The upstream reader limits what it downloads. An XPI over 50 MiB fails
  with `xpi-too-large`, and an `update.json` over 1 MiB fails with
  `update-json-too-large`. A `manifest.json` or default-locale
  `messages.json` whose unzipped or compressed size in the zip is more than
  1 MiB fails with `manifest-too-large`. A download from `localhost` fails
  with `host-refused`. So does a download from a host that is, or resolves
  to, an address in a blocked range, such as a loopback or private range.
  The reader follows at most 5 redirects for the XPI and the `update.json`.
