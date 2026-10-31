# Changelog

## Unreleased

- `pnpm discover` also runs five GitHub code searches for the
  `manifest.json` and `package.json` files of Zotero plugins, as the README
  lists, so a plugin that no topic and no catalog names can reach the index.
  If `CODE_SEARCH_TOKEN` is set, the code search sends it, and otherwise
  `GITHUB_TOKEN`. `Discover plugins` passes it from a repository secret of
  that name, since the built-in token gets HTTP 429 from code search. The
  code search sends at most 10 requests in any 60 seconds. It sends none
  from 8 minutes after the run starts. Its time
  counts toward the run's 18 minutes. A failed request adds a warning that
  names the query, and the run keeps that query's earlier pages and reads
  the other repositories. A repository that the topic search or the catalog
  also names keeps that source. If the bot found a repository by code
  search, its pull request says so, and it gets no `issue-no-topic` hold.
  A `Discover plugins` run started by hand takes a `budget` input, the most
  repositories the run reads.
- `pnpm discover` also reads the repositories that the zotero-chinese plugin
  catalog lists, so a plugin whose repository has neither topic can reach
  the index. It looks up each such repository's current name and last push
  with the GitHub GraphQL API, which needs `GITHUB_TOKEN`. A failed catalog
  read or lookup adds a warning to the report, and the run reads the other
  repositories. A bot pull request says how the bot found the repository,
  and a repository that the bot finds in the catalog gets no
  `issue-no-topic` hold. If a run does not find a refused repository, the
  state file still keeps its record until 30 days after the refusal.
- If the data that the daily build's site job downloads differs from the
  data that the build job wrote, the daily build deploys nothing. The site
  job compares the two with the new `pnpm data-digest` command, as the
  README says.
- Each plugin entry is a directory `plugins/<id>/` with a registry `meta.json`
  and an `index.json` for index-only data, such as overrides with reasons.
- `pnpm check` checks every entry. It makes sure that both files exist, that
  each file is valid against its schema, and that the `meta.json` id equals
  the directory name. Each override reason must hold a character other than
  whitespace, as JavaScript's `\s` defines it, and Unicode format
  characters.
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
  1 MiB fails with `manifest-too-large`. A file in a `locale/<tag>/` or
  `chrome/locale/<tag>/` folder fails nothing. The reader inflates at most
  about 9 MiB of such files from each XPI. A file that it does not read, or
  cannot inflate, keeps its language in the list. A download from `localhost`
  fails with `host-refused`. So does a download from a host that is, or resolves
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
  plugin. A later entry says how its script shows 50 at a time. Each plugin
  has a page. The entry on version pills below describes
  what the pages show. `pnpm site` builds the pages into `dist/` beside the
  data. If `pnpm site` fails, the daily build deploys nothing.
- A bot finds new plugins. Once a day, the `Discover plugins` workflow
  searches GitHub for repositories with the topic `zotero-plugin` or
  `zotero-addon` that no entry names. It opens one pull request for each
  new entry that passes the inclusion bar, at most 5 for each daily run. A
  run started by hand can set another limit. Each pull
  request body gives the repository URL, the plugin version, the declared
  Zotero range, and the result of `pnpm check` on the entry. If the output
  of `pnpm check` is longer than 10,000 characters, the body quotes only its
  first 10,000 characters and says that the output is cut. If a bot pull
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
  It can also stop with an error that the reader does not name. The bot can
  fail to write the entry, with `entry-exists` for a directory already in its
  output directory or with `write-failed`. The check of the entry that the bot
  wrote can stop with an error. Then the bot comments the failure and leaves
  the issue open, and the workflow run fails.
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
  shows its repository and releases links. It puts
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
  and `chrome/locale/<tag>/` folders in the XPI that the reader read. If a
  tag's language has no English name in the build's Node.js `Intl` data, the
  list leaves the tag out. So a folder such as `locale/img/` adds no
  language. The list also leaves out a tag whose language is `und`
  (undetermined), `zxx` (no linguistic content), or `mul` (multiple
  languages), in any letter case. Its messages do not count. The reader
  counts the messages in the files of each tag's folders. In an `.ftl`
  file, each Fluent message or term line is a message.
  In a `.properties` file, each line that is not blank and not a `#` or `!`
  comment is a message. In a `.dtd` file, each `<!ENTITY` outside comments
  is a message. If a tag's count is at least 1 and at least half the largest
  count among the XPI's tags, the list keeps the tag. So a folder whose files
  hold only comments adds no language, and neither does a translation with
  under half the messages of the fullest one. A tag with a file of any other
  type is kept whatever its count. The reader inflates at most about 9 MiB
  of locale files from each XPI. A tag with a file that it does not read, or
  cannot inflate, is kept whatever its count too. Such a file adds no
  messages to any count. If no tag is left, the list is empty. A listed
  language can still be incomplete, since a tag with half the fullest tag's
  messages stays. An `index.json` override can have the
  field `languages` and a value such as `zh-CN, en-US`. It records the
  languages of a plugin whose list is wrong or empty, in the record's
  `overrides` block. The value cannot hold a tag whose language is `und`,
  `zxx`, or `mul`. As with every override, the `upstream` block does not
  apply it. The schema stays at version 1. The schema rejects fields that
  it does not define, so fetch any saved copy of it again. The page of each
  plugin that the index read shows the languages by name in a "Menus and
  settings in" line. The description comes from the plugin's manifest or
  from an index override, so it can be in another language. If a
  `languages` override applies to the version the index read, the line
  shows the override's languages in place of the list. If no language is
  left, the line says "Unknown (no translations found)". The home page has
  a "Menus and settings in" menu that shows only the plugins with the
  language you pick. It counts `zh-CN` and `zh-TW` under one entry,
  Chinese. The menu lists the languages with the most plugins first, and
  languages with the same number of plugins by name. The page keeps the
  choice in the `language` query parameter, such as `?language=zh`. A
  script runs the menu, so without JavaScript the home page shows no menu
  and lists every plugin.
- `pnpm build` stops each plugin read after 3 minutes, and its record fails
  with `request-failed`. It starts no plugin read after 18 minutes. Each
  entry that it did not read gets a record that fails with the new failure
  name `not-read`. Both failures are build-level. Before, only the
  60-second limit of each request and each host lookup bounded a read. If
  hosts that did not answer took the build past the 30-minute limit of the
  daily build job, GitHub stopped the job. The job then kept no data and
  deployed nothing.
- `pnpm discover` stops each repository read after 3 minutes and refuses
  the repository with `request-failed`, which the state file does not
  record. It starts no repository read after 18 minutes. The `unread` field
  of its report counts the repositories that it did not reach, and the
  report gets a warning that names the time limit. The command still writes
  its state file and handoff. The git check of a branch name stops after 30
  seconds. `pnpm propose` stops each other git process after 2 minutes and
  each `pnpm check` after 5 minutes, and fails only that entry. A fetch of
  the default branch past its limit fails every entry. Before, a run
  that the 30-minute limit of the `Discover plugins` job stopped wrote no
  new state and no handoff. The next run then read the same repositories
  first.
- `pnpm check` checks the names in the entry directory with three new
  rules. `entry-is-directory` refuses a file beside the entries, such as
  `plugins/stray.json`. Before, the command skipped such a file and exited
  with status 0. `entry-name` refuses a directory name with a character
  outside `A-Z a-z 0-9 _ @ { } + . -`, such as `%` or a space. It also
  refuses a name that ends with `.`, and a name that Windows reserves, such as `CON` or `nul.tar.gz`.
  `unique-ignoring-case` refuses two directory names that differ only in
  case. `pnpm add-plugin` and `pnpm discover` refuse the same ids with
  `unsafe-id` and `entry-exists`.
- `pnpm check` refuses more override problems. `reason-not-blank` refuses a
  reason that holds only whitespace, as JavaScript's `\s` defines it, and
  Unicode format characters, such as U+200B. Before, it refused only a reason of whitespace. The new rule
  `unique-override` refuses two overrides with the same `field` and
  `version`. Before, the command passed them, and the site ignored the
  repeat. A file can start with a UTF-8 byte-order mark. For such a
  `meta.json` or `index.json`, the line now names the mark, in place of "is
  not valid JSON".
- The home page has "Declares Zotero" buttons: "Any version" and one button
  for each Zotero major from 7 to 10. If you press a major, the list shows
  only the plugins whose declared range covers all or part of it. These
  are the plugins with a ✓ or ◐ pill for that major. The buttons work with the
  "Menus and settings in" menu, and the list shows the plugins that both
  pass. The page keeps the choice in the `zotero` query parameter, such as
  `?zotero=8`. The script that runs the menu also runs the buttons, so
  without JavaScript the home page shows no buttons and lists every plugin.
  The home page intro also links to the "Add a plugin" issue form.
- `pnpm propose` checks each branch name in the handoff with git again. The
  check can fail to run: git cannot start, git ends with any result other
  than exit status 1, or the check passes its 30-second limit. An issue run
  then comments the error on the issue with the failure name
  `unexpected-error`, and the issue stays open. A discover run prints
  "could not check the handoff:" and the error, with no stack trace, and
  exits with status 1.
  Neither run pushes a branch. Before, the command stopped with a stack
  trace, and the issue got no answer. A handoff that the command refuses
  still gets no answer on the issue.
- A daily sweep answers the "Add a plugin" issues and the report issues that
  no run answered. Before, such an issue got no answer. An example is an
  issue whose run failed before its comment.
  The sweep takes the open issues of the label that are 1 hour to 7 days old
  and have no comment from `github-actions[bot]`. While a run for a new issue
  of the same workflow has not finished, the sweep takes no issue. The
  `Add a plugin from an issue` workflow sweeps at 02:43 UTC, at most 3
  issues in each run. The `Answer a report` workflow sweeps at 03:13 UTC, at
  most 20 issues in each run. A maintainer can also run either sweep by hand
  from the default branch. `pnpm unanswered-issues` prints the issues that a
  sweep takes, and `pnpm report-issue --sweep` answers the report issues. An
  issue with any bot comment stays for a maintainer. Each sweep of "Add a
  plugin" issues answers at most 3, oldest first. A rerun of the write job of
  `Add a plugin from an issue` answers each issue of its run again.
- `pnpm discover-issue` reads the issue body from the GitHub API for
  `ISSUE_NUMBER`. It no longer reads the `ISSUE_BODY` environment variable.
  If the read fails, the bot comments `The bot could not finish` with the
  error and leaves the issue open.
- If the bot already commented on a report issue, `pnpm report-issue` closes
  the issue with no second comment.
- An open bot pull request can have exactly one `Closes #<issue>` line
  outside code blocks for the issue that a run answers. Then the bot
  comments the link of that pull request and leaves the issue open. Before,
  it said that it already proposed the repository and closed the issue as
  not planned.
- `pnpm build` reads the `report` label before the report issues. If the
  label read fails, the build writes no data file and exits 1. A renamed or
  deleted label gives such a failure. If an issue in the list has no
  `closed_by` field, the build also writes no data file and exits 1. The
  site then keeps the data of the last good build. Before, a missing label
  gave report counts of zero, and the counts left out each issue with no
  `closed_by` field. The build went on in both cases.
- `pnpm propose` reads the index at the commit of the default branch that it
  fetches, and each pull request builds on that commit. Before, it read the
  index in its checkout, so it proposed again an entry merged during a run.
  A discover run now skips such an entry. An issue run comments the entry
  and closes the issue as completed, or refuses an id that the index has
  with `entry-exists`. If the fetched commit has no `plugins/` folder, every
  entry fails. An issue run then leaves the issue open with its "could not
  finish" comment.
- Runs of `Discover plugins`, `Add a plugin from an issue`, and
  `Merge bot pull requests` wait in turn in their shared concurrency group,
  up to 100 pending. GitHub does not promise
  their order. If 100 runs already wait, GitHub cancels a new run, and a
  later sweep can answer its issue, as for any unanswered issue. Before, a
  new run in the group canceled the run that waited, for example a waiting
  `Discover plugins` run that an issue or a sweep met. The run that an issue
  without the label `add-plugin` starts does nothing, and it now takes a
  group of its own.
- While a filter is on, the home page shows a line under its filters that
  reads "Showing N of M plugins." N is the number of plugins that the
  filters show, and M is the number that the page lists, shown or not. If
  the filters show no plugin, the line reads "No plugins match these
  filters." Before, the list was blank with no message. With "All
  languages" and "Any version", the line is empty. The script that runs
  the filters writes the line, so without JavaScript the home page shows
  no line.
- Two more failures are build-level. One is an answer from the GitHub API
  that succeeds but whose body is not JSON, such as an HTML error page. The
  other is an HTTP 403 answer to an XPI or `update.json` download that
  requested a GitHub release download URL. The rule counts any URL on
  `github.com` whose path has `releases` as its third part. Such a 403
  comes from GitHub, for example from the host that serves release files,
  which a release URL redirects to.
  Before, both failures belonged to the plugin, so an outage that failed
  most reads this way did not stop the deploy. Now they count toward the
  build's more-than-half rule, and an issue run that meets one leaves the
  issue open with its "could not finish" comment.
- The daily build starts each plugin in Zotero 7.0.32, 8.0.4, 9.0.6, and
  10.0.6 for Linux, each release that its manifest's range covers. Each
  start installs the plugin in a new profile and waits 3 seconds. A record
  can have the new optional field `startTests`, with one result for each
  tested release: `started`, `start-error`, `not-installed`, or
  `timed-out`. Each plugin page shows them in a "Starts in Zotero" line. A
  start does not show that the plugin works. If you validate against a
  saved copy of `schemas/plugins.v1.schema.json`, fetch the schema again,
  since it rejects fields that it does not define. The new commands are
  `pnpm start-test`, `pnpm start-tests`, and `pnpm add-start-results`, and
  `pnpm build --plan <file>` writes the start plan.
- Each plugin page has a new layout. A header block shows the name and the
  description. Cards with headings follow, in this order: "Declared
  support" (the pills and the declared range, the "No declared range"
  line, or the failure when the build could not read the plugin), "Start
  test" (when the plugin has
  start results), "User reports" (when the build read the plugin), and
  "About" (the "Menus and settings in" line, the repository link, and the
  releases link, the first and last only when the build read the plugin).
  The closed "Details" section comes last. The "Works" and "Broken" report
  links now look like buttons and open the same forms. The page shows the
  same facts as before. The new text is the card headings and the report
  prompt, which now reads "Tried this version on Zotero? Report what you
  found:".
- The header, the footer, and the home page take the card look of the
  plugin pages. The header and the footer are cards on every page. On the
  home page, the title and the intro sit in a card. The filter labels are
  smaller, bold, and gray, and the status line is smaller and gray. The home
  page shows the same facts, and the menu and the buttons filter the list as
  before.
- `pnpm build` stops the read of the `report` label and the report issues
  after 3 minutes in all. It then prints a line that names the time limit,
  reads no plugin, writes no data file, and exits with status 1. Before,
  only each request, the label read and each page, had a limit of 60
  seconds. The command also exits once
  its output is written. Work that a read left running, such as a host
  lookup that a time limit cut, no longer keeps it open.
- If the number of whole days from 1970-01-01T00:00Z to `generatedAt` is
  even, `pnpm build` reads the plugins in id order. If that number is odd,
  it reads them in reverse id order. So the entries that the 18-minute
  limit leaves `not-read` are the last ids on even days and the first ids
  on odd days. Before, the build always read in id order, so a cut build
  left the last ids unread every day. The data file still lists its records
  in id order.
- Each `upstream` block of the data file has a new optional `xpiUrl` field:
  the download address that GitHub gives for the first `.xpi` file of the
  release whose manifest the index read. The start plan names the same
  address. The schema stays at version 1 under the project's rule that a
  new optional field does not need a new version. The schema rejects
  fields that it does not define, so fetch any saved copy of it again.
- The site has a new look, and the home page lists the plugins in one
  table. A top bar on every page links to the home page and to a new
  About page. It also links to the "Add a plugin" issue form and to the
  data file. The table sorts the plugins by
  name, ignoring letter case and accents. Each row shows the name,
  "Archived" for an archived repository, and the description. Then come
  one cell for each Zotero major from 7 to 10 and the language codes. Next
  comes the month of the release that the index read. Last come links to
  the source code and to the `.xpi` file. A version cell shows the declared
  mark (✓, ◐, or a dash). Under it is the start-test result of the newest
  tested release of that major: a dot for started, a cross for a failure.
  A plugin that the build failed to read shows "Not read" in place of the
  version cells. A legend under the table names each mark and says that a
  declared range is not a test result. The language cell shows up to 3
  codes, or the first 2 and "+N". The home page has a search box. It shows
  only the plugins whose name or description holds the text you type,
  ignoring letter case. The page keeps the text in the `q` query parameter,
  such as `?q=pdf`. A count beside the filters now always shows: "M
  plugins", or "N of M plugins" while a filter is on, or that no plugins
  match. The first version button now reads "Any". On a screen 760 pixels
  wide or less, the table hides the languages and the release month. At
  560 pixels or less, it also hides the descriptions and the source links.
  Without JavaScript, the home page shows every plugin and no search box,
  menu, buttons, or count. Every page is now up to 65rem wide, not 50rem.
  Each plugin page has a new layout in place of the four cards, the pills,
  and the closed "Details" section that the entries above describe. It has
  two cards. It opens with
  a link back to the home page, the name with "Archived" for an archived
  repository, and the description. Links to the `.xpi` file, the source
  code, and the releases follow. If the repository address does not start
  with `http://` or `https://`, the source and releases addresses show as
  plain text. If the `.xpi` address does not, the `.xpi` link does not
  show. Then comes a "Zotero compatibility" table, newest major
  first. It has one row for each Zotero major from 7 to 10. It also has a
  row for each other major that the plugin's reports or start results
  name. A row shows the declared mark with "Yes", "Partly", or "No". It
  also shows the result of the newest tested release of that major and
  the counts of "works" and "broken" reports. Under the table comes a
  link to the About page. If the plugin declares a range, the declared
  range comes before that link. A line that names the
  version that the index read comes next, with the "Works" and "Broken"
  buttons. An open "Details" card lists the plugin id, the repository
  facts, the release that the index read, and the languages. The
  overrides sit under their own heading in that card. The About page says
  how the index shows the declared range, runs the start test, counts user
  reports, and applies overrides. It also says that the index does not vet
  the plugins it lists. The notes on the start test and the overrides that
  the plugin pages held before are now on the About page.
- The index shows more plugin descriptions in English. A manifest name or
  description can have the form `__MSG_<key>__`. The reader now first tries
  that message in `_locales/en/`, `_locales/en_US/`, and `_locales/en_GB/`.
  If none of them holds a message that is not blank, it reads the default
  locale. Each `upstream` block of the data file has a new optional
  `repoDescription` field: the About text of the GitHub repository,
  trimmed. A `description` override that applies to the version the index
  read still comes first. With no such override, the site checks the
  manifest description. If the site keeps it and less than half of it is
  Chinese, Japanese, or Korean, the site shows it. The README says how
  that share is counted. In other
  cases the site can show the GitHub description, by the rule in the
  README. Each plugin page's Details card shows both descriptions. A
  `description` override can now give English text for a plugin with no
  English description upstream, as the README defines it. Eight plugins
  have one. If you validate against a saved copy of
  `schemas/plugins.v1.schema.json`, fetch the schema again, since it
  rejects fields that it does not define.
- When half or more of a manifest or GitHub description is Chinese,
  Japanese, or Korean and the description has a Latin-script part, the
  site now shows that part. The site cuts the text at each ` / ` and after
  each `。`. The part is the pieces whose letters are all Latin and that
  hold at least three words, unless they only repeat the name. The README
  gives the whole rule. A `description` override can now also replace an
  English description of fewer than six words. `pnpm description-gaps
  <data file>` lists the plugins with a description gap, after the
  checkout's overrides. A gap is a description that is missing, half or
  more Chinese, Japanese, or Korean, or under six words.
- The bot now merges its own pull requests. Each new bot pull request body
  has a Hold line, which names the entry's hold reasons or says
  `Hold: none`. The README lists the five reasons. A held pull request gets
  the `hold` label.
  The new `Merge bot pull requests` workflow runs `pnpm merge-discover`
  daily. The command merges a bot pull request that says `Hold: none`, has
  no `hold` label, and opened at least 48 hours before the run. A run
  started by hand can set another wait, as the next entry says. Before the
  merge, the entry must pass `pnpm check` beside the current entries. To
  stop the bot from merging one, add the `hold` label or close it.
- A run of `Merge bot pull requests` started by hand takes a `wait_hours`
  input, 48 unless you change it, and `pnpm merge-discover` takes
  `--wait-hours <n>`. Scheduled runs still wait 48 hours. With
  `wait_hours` 0, rounds of discovery and merging add every clean plugin
  without the wait, as the README's backfill steps say.
- The home table shows 50 of the plugins that its filters pass at a time.
  If more than 50 pass, a pager below it reads "Page p of P" between
  Previous and Next. A page number after 1 goes in the `page` query
  parameter, and Back returns to the address before. A filter change goes
  back to page 1, and the count still covers every page. Without
  JavaScript the home page still lists every plugin.
- Each `upstream` block of the data file has a new optional `xpiSha256`
  field: the SHA-256 of the XPI bytes that the build read from `xpiUrl`.
  The schema rejects fields that it does not define, so fetch any saved
  copy of `schemas/plugins.v1.schema.json` again. If an XPI's SHA-256 is
  unchanged, the daily build now reuses its `started` result from the
  published data, and the start-test jobs skip that start. It starts
  a plugin again for a new XPI file, a tested release with no earlier
  result, and a result other than `started`. It also starts each plugin
  again on one day of each week. The new `pnpm carry-start-results`
  command writes the reused results into the start plan, as the README
  says.
- In a browser that runs module scripts, the home table no longer shows
  rows that its filters or page leave out while the page loads. An
  address with `language`, `zotero`, or `page` shows only the rows of
  that page. An address with a non-blank `q` shows no row until the
  search runs. Chrome and Edge before 111, Firefox before 113, and Opera
  before 97 cannot read the `of <selector>` form of `:nth-child()`. If a
  language or Zotero filter is on, such browsers still show the filter's
  rows on every page until the script runs.
- Each plugin page shows a line under the plugin's name, such as "By
  windingwind · zotero-better-notes · ★ 8,400". The star is a gold icon.
  A tooltip gives the count with its label, such as "8,400 GitHub Stars",
  or "1 GitHub Star" for a count of 1. Screen readers skip the icon and
  the number and read hidden text with the same words. The owner links to
  the owner's GitHub page, and the repository name links to the
  repository. The line shows only for a repository URL of the form
  `https://github.com/<owner>/<repo>`. Each `upstream` block of the data
  file has a new optional `stars` field: the star count that the build
  read for the repository. The schema rejects fields that it does not
  define, so fetch any saved copy of `schemas/plugins.v1.schema.json`
  again.
- A declared mark now counts Zotero N as the versions from N.0 to the
  newest release of N, not to N.9. So a check mark means that the range
  covers every release of that version up to its newest release. A range
  such as `10.0.*` now shows all of Zotero 10 while 10.0.7 is the newest
  release. A range that starts after the newest release shows none of it.
  The home table, the Zotero filter, and the plugin pages follow the rule,
  and the About page names the newest release of each version. The data
  file has a new optional top-level `zoteroRelease` field: the current
  Zotero release that `pnpm build` read from zotero.org. The schema
  rejects fields that it does not define, so fetch any saved copy of
  `schemas/plugins.v1.schema.json` again.
- The home table writes the month of the release that the index read as
  the year and month in UTC, such as `2026-09`, in place of `Sep 2026`.
  Its `<time datetime>` holds the same text, in place of the release day.
- The "Menus and settings in" menu draws its own down arrow in the text
  color, inside the box, in place of the browser's arrow. With forced
  colors on, the browser draws its own arrow.
- The home page has a "Category" menu that filters the table to one of the
  index's 13 categories, such as AI assistants or Translation and
  dictionaries. It lists the categories that at least one plugin has, and it
  keeps the choice in `?category=`. Each plugin page links its categories
  to the filtered home page, and the About page lists the categories. The
  index assigns them from words in a plugin's name and descriptions. It
  adds or removes some by hand, so a category can be wrong or missing. The
  data file does not carry them.
- `pnpm build` also reads the zotero.org changelog page of each earlier
  Zotero version that the site keeps a last release for. It prints a
  `::warning::` line in three cases. The current release is from a newer
  Zotero version than the site marks. A changelog page names a newer
  release than the site keeps, one line for each such page. A changelog
  read fails, one line for each such page. These lines change neither the
  exit status nor the data file.
