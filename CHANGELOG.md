# Changelog

## Unreleased

- Each plugin entry is a directory `plugins/<id>/` with a registry `meta.json`
  and an `index.json` for index-only data, such as overrides with reasons.
- `pnpm check` checks every entry. It makes sure that both files exist, that
  each file is valid against its schema, that the `meta.json` id equals the
  directory name, and that each override reason contains text.
- `pnpm add-plugin <github-url>` drafts an entry from the GitHub repository of
  a plugin. It reads the manifest in the newest stable release that has an
  `.xpi` file, as the entry on prereleases below says. It writes `meta.json`
  and `index.json` under `plugins/<id>/`, or under the directory that
  `--out <dir>` names. If the plugin does not meet the inclusion bar, the
  command writes no file and prints the failure name.
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
- A `manifest.json` or default-locale `messages.json` whose deflate data
  inflates past the unzipped size that the zip declares fails with
  `xpi-unreadable`. The reader inflates the data 16 KiB of input at a time
  and stops after the first 16 KiB whose output passes that size. Before, it
  decoded the whole stream, however far the stream ran past that size.
- The daily build publishes the data on GitHub Pages at
  `https://jmgirard.github.io/zotero-plugin-index/v1/plugins.json`, with its
  schemas under `https://jmgirard.github.io/zotero-plugin-index/schemas/`.
  The schemas' `$id` values are now these URLs. `pnpm build` also writes the
  schemas to `dist/schemas/`. A build-level failure is a failure such as a
  rate limit or a network error. If more than half of the records carry
  one, `pnpm build` writes the file and exits with status 1. The daily
  build then deploys nothing.
- The daily build publishes a website at
  `https://jmgirard.github.io/zotero-plugin-index/`. The home page lists every
  plugin. Each plugin has a page. The entry on version pills below describes
  what the pages show. `pnpm site` builds the pages into `dist/` beside the
  data. If `pnpm site` fails, the daily build deploys nothing.
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
  index or a bot pull request already has. The bot's read of the repository
  can stop with a build-level failure, such as a GitHub rate limit or outage.
  It can also stop with an error that the reader does not name, and the
  check of the entry that the bot wrote can stop with an error. Then the bot
  comments the failure and leaves the issue open, and the workflow run fails.
  If a maintainer closes the bot's pull request without a merge, the bot
  comments on the issue and closes it as not planned.
- The bot reads the repositories that anyone can name in a job that cannot
  write to the index repository. The `Discover plugins` and `Add a plugin
  from an issue` workflows each run a read job with read-only permissions and
  a write job. The read job runs `pnpm discover --handoff <dir>` or
  `pnpm discover-issue --handoff <dir>`, which write the new entries and a
  plan into a directory. The write job runs `pnpm propose <dir>`, which
  pushes the branches, opens the pull requests, and answers the issue.
  `pnpm propose` refuses a handoff that does not pass its checks, before it
  sends any request. `pnpm discover --propose` is gone. If the write job
  cannot propose a plugin's entry, the read job refuses the plugin as
  `not-proposable`. Thus one such plugin does not stop the other pull requests.
- The index lists plugins whose GitHub repository is archived and marks them.
  The upstream reader reads GitHub's `archived` flag. If the GitHub response
  gives that flag, the record's `upstream` block in `v1/plugins.json` now has
  an `archived` field, `true` or `false`. The schema stays at
  version 1 under the project's rule that a new optional field does not need
  a new version. The schema rejects fields that it does not define, so fetch
  any saved copy of it again. If the record has an `archived` value, the
  plugin page shows "Archived on GitHub" with "Yes" or "No". The home page
  shows "(archived)" after the name of an archived plugin.
- The upstream reader reads the newest stable release that has an `.xpi`
  file, not the newest release. A stable release is one that GitHub does not
  mark as a prerelease. If no stable release has an `.xpi` file, the reader
  reads the newest release that has one. If the stable release fails with
  `no-manifest`, `no-zotero-id`, or `max-version-below-7`, the reader looks
  for a later release with an `.xpi` file. If one exists, the reader reads
  the newest such release instead. Other
  failures of the stable release stay as they are. `pnpm add-plugin`,
  `pnpm build`, `pnpm discover`, and `pnpm discover-issue` use this reader.
  The record's `upstream` block in `v1/plugins.json` now has a
  `prerelease` field, `true` or `false`, for the release that the reader
  read. The schema stays at version 1. The schema rejects fields that it does
  not define, so fetch any saved copy of it again. The plugin page labels the
  release fact "Release read by the index". If the reader read a prerelease,
  the page shows "(prerelease)" after the publish date.
- The home page and each plugin page show the plugin's description and one
  version pill for each Zotero major version from 7 to 10. A plugin with no
  description shows none. A
  plugin with no declared range shows "No declared range" instead, and a
  plugin that the build failed to read shows its failure. If the declared
  range covers all of that version, the pill shows a check mark (✓). A half
  circle (◐) means part of it, and a dash means none of it. A pill counts
  Zotero N as the versions from N.0 to N.9. The "Your Zotero version" field
  and the local storage that kept its value are gone. If the manifest
  description is blank or only repeats the plugin's name, the site shows no
  description. A `description` override still replaces it. Each plugin page
  shows its repository and releases links under the declared range. It puts
  the plugin id, the repository and release facts such as the release count,
  and the overrides in a closed "Details" section. An archived plugin shows
  "(archived)" after its name on its page too.
- The build job of `build.yml` restores no Actions cache. The build job of
  the `Build data` workflow sets `cache-mode: none`, and its
  `actions/setup-node` step no longer sets `cache: pnpm`. The read job of
  `Discover plugins` reads repositories that anyone can tag, and its runs can
  save caches that a run on the default branch restores. Thus the build job
  cannot restore a cache that such a job saved.
- `pnpm build` counts only build-level failures toward its more-than-half
  exit-1 rule.
  "Building the data" in the README lists them. A 404, a fork, or a release
  with no `.xpi` file no longer counts. Before, a build where most records
  failed for such reasons deployed nothing. The command also prints the
  number of records for each failure name and the number with a
  build-level failure. If a record carries a build-level failure, it prints
  a `::warning::` line, which GitHub Actions shows on the run.
- If every record carries a failure, build-level or not, `pnpm build` now
  exits with status 1 after it writes the file, and the daily build deploys
  nothing. Before, a bug of this kind did not stop the deploy. One example
  is a bug that fails every record with `facts-invalid`, which is not
  build-level. The site then showed no upstream data for any record. The rule for build-level failures
  stays as it was.
- Two issue forms take reports that a plugin version works or is broken on a
  Zotero version. Each asks for the plugin id, the plugin version, and the
  Zotero version. The `Answer a report` workflow runs `pnpm report-issue`,
  which checks each report, comments, and closes the issue. It closes a
  report it takes as completed, and any other report as not planned with
  the problem. `pnpm build` reads the closed report issues before it reads
  any plugin. It writes a new optional `reports` field on each record that
  has an `upstream` block. The field has the numbers of "works" and
  "broken" reports for each Zotero major with a counted report. Only
  reports on the plugin version that the index read count. For each plugin
  and Zotero major, only the newest report of each GitHub account counts.
  README "Using the data" gives the whole rule. The page of each plugin
  that the index read shows the counts, a "Works" link, and a "Broken"
  link. The links open the forms with the plugin id and the version filled
  in. If the build cannot read the report issues, it writes
  no data file, and the daily build deploys nothing. The schema now defines
  `reports`. If you validate against a saved copy of the schema, fetch it
  again.
- The data records the interface languages of each plugin. The record's
  `upstream` block in `v1/plugins.json` now has a `languages` list, such as
  `["en-US", "zh-CN"]`. It holds the language tags of the `locale/<tag>/`
  and `chrome/locale/<tag>/` folders in the XPI that the reader read. A
  plugin with no such folder gets an empty list. The list does not say
  whether a translation is complete. An `index.json` override can have the
  field `languages` and a value such as `zh-CN, en-US`. It records the
  languages of a plugin whose list is wrong or empty, in the record's
  `overrides` block. As with every override, the `upstream` block does not
  apply it. The schema stays at version 1. The schema rejects fields that
  it does not define, so fetch any saved copy of it again. The page of each
  plugin that the index read shows the languages by name in an "Interface languages" line. That line
  uses a `languages` override that applies to the version the index read. If
  the plugin has no languages, the line says "None declared". The home page has an "Interface language" menu that shows only
  the plugins with the language you pick. It counts `zh-CN` and `zh-TW`
  under one entry, Chinese. The page keeps the choice in the `language`
  query parameter, such as `?language=zh`. A script runs the menu, so
  without JavaScript the home page shows no menu and lists every plugin.
