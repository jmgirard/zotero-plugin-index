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
  A cut-off XPI download, and a redirect with no `Location`, now fail with
  `request-failed`.
- If an XPI's zip claims more entries than its length can hold, at 46 bytes
  for each entry, the read fails with `xpi-unreadable`. The read also fails with
  `xpi-unreadable` for a zip with two or more entries named `manifest.json`.
  The same holds for the default-locale `messages.json`.
  Before, a 98-byte XPI that claimed 4,294,967,295 entries held the reader
  for more than 3 minutes.
- The daily build publishes the data on GitHub Pages at
  `https://jmgirard.github.io/zotero-plugin-index/v1/plugins.json`, with its
  schemas under `https://jmgirard.github.io/zotero-plugin-index/schemas/`.
  The schemas' `$id` values are now these URLs. `pnpm build` also writes the
  schemas to `dist/schemas/`. If more than half of the records carry a
  failure, `pnpm build` writes the file and exits with status 1. The daily
  build then deploys nothing.
- The daily build publishes a website at
  `https://jmgirard.github.io/zotero-plugin-index/`. The home page lists every
  plugin. Each plugin has a page that shows its declared range of Zotero
  versions first. If the build failed to read a plugin, its page shows the
  failure in that place. A visitor enters their Zotero version once. Each page
  then shows whether that version is inside the declared range, older than its
  minimum, or newer than its maximum. `pnpm site` builds the pages into `dist/`
  beside the data. If `pnpm site` fails, the daily build deploys nothing.
- A bot finds new plugins. Once a day, the `Discover plugins` workflow
  searches GitHub for repositories with the topic `zotero-plugin` or
  `zotero-addon` that no entry names. It opens one pull request for each
  new entry that passes the inclusion bar, at most 5 for each daily run. A
  run started by hand can set another limit. Each pull
  request body gives the repository URL, the plugin version, the declared
  Zotero range, and the result of `pnpm check` on the entry. If a bot pull
  request is closed without a merge, the bot does not propose that
  repository again. `pnpm discover` runs the same search by hand and writes
  the new entries to disk, with no pull request. Anyone can also propose a
  plugin with the "Add a plugin" issue form, which takes the URL of the
  plugin's GitHub repository. If the plugin passes the inclusion bar, the bot
  opens a pull request and comments its link on the issue. The issue closes
  when that pull request merges. If the plugin does not pass, the bot comments
  the reason and closes the issue. It does the same for a repository that the
  index or a bot pull request already has.
- The bot reads the repositories that anyone can name in a job that cannot
  write to the index repository. The `Discover plugins` and `Add a plugin
  from an issue` workflows each run a read job with read-only permissions and
  a write job. The read job runs `pnpm discover --handoff <dir>` or
  `pnpm discover-issue --handoff <dir>`, which write the new entries and a
  plan into a directory. The write job runs `pnpm propose <dir>`, which
  pushes the branches, opens the pull requests, and answers the issue.
  `pnpm propose` refuses a handoff that does not pass its checks, before it
  sends any request. `pnpm discover --propose` is gone. The read job refuses,
  with the failure name `not-proposable`, a plugin whose entry the write job
  would refuse, so one such plugin does not stop the other pull requests.
