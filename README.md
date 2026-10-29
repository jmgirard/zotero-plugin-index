# zotero-plugin-index

A community index of plugins for Zotero 7 and later. The index lists plugins
and links to the releases of each author. It does not host plugin files, and
it does not review or endorse plugins.

## The site

The website <https://jmgirard.github.io/zotero-plugin-index/> shows the index.
A top bar on every page links to the home page and to the About page. It
also links to the "Add a plugin" issue form and to the data file. The home page lists every plugin in one table,
sorted by name. The sort ignores letter case and accents, and names that
are then equal sort by plugin id. Each row shows the plugin's name and its
description. If the plugin's GitHub repository is archived, the row shows
"Archived" after the name. Then come one cell for each Zotero major version
from 7 to 10 and a "Menus and settings" cell. Next comes the month of
the release that the index read. Last come links to the source code and to
the `.xpi` file.

A version cell shows how much of that version the plugin's declared range
covers. A check mark (✓) means all of it, a half circle (◐) means part of
it, and a dash means none of it. Hold the pointer over a mark to read
its meaning and, for a half circle, the declared range. On a touch screen,
open the plugin's page to read its declared range. A mark counts Zotero N
as the versions from N.0 to N.9. Plugin authors often write a maximum such
as 10.99.99 to mean every Zotero 10 release. They also write a minimum such
as 8.999 to mean Zotero 9 and newer. The declared range uses the overrides
that apply to the plugin version that the index read. The marks show what
each plugin declares, not a test result.

Under the declared mark, a version cell shows the result of the daily
start tests on that major, which "Using the data" describes. If more than
one release of that major has a result, the cell shows the result of the
newest release. A dot (●) means that the plugin started. A cross (✕) means
that it failed at startup, did not install, or gave no answer in time. A
cell with neither has no start result. A legend under the table names each
mark. A plugin with no declared range shows no declared marks. If the last
build failed to read a plugin, its row shows "Not read" in place of the
version cells.

The "Menus and settings" cell shows the language codes of the plugin's
languages list, after overrides, in list order. Regional forms such as
`zh-CN` and `zh-TW` share one code. Hold the pointer over a code to read its
name. If the list has more than 3 codes, the cell shows the first 2 and "+N"
for the rest. An empty cell means that no language is left, which the
plugin's page shows as "Unknown (no translations found)".
The source link goes to the plugin's repository. The download link goes to
the `.xpi` file that the index read, on the author's release. The author
can replace that file later. A link whose address does not start with
`http://` or `https://` does not show.

On a screen 760 pixels wide or less, the table hides the languages and the
release columns. At 560 pixels or less, it also hides the descriptions and
the source links.

The description comes from the plugin's manifest or from the About text of
its GitHub repository. A manifest name or description of the form
`__MSG_<key>__` names a message in a `_locales/<locale>/messages.json` file.
The index first tries the English folders `_locales/en/`, `_locales/en_US/`,
and `_locales/en_GB/`, in that order. If none of them holds a message that
is not blank, the index reads the message of the manifest's default locale.

The site drops a description that is missing, blank, or only repeats the
plugin's name. The site checks for a repeated name this way. It takes the
words of the description and of the name. It leaves out "zotero", "plugin",
"addon", "add", "on", "extension", "for", "a", "an", and "the". If every word
of the description that is left is also a word of the name, the description
only repeats the name. For example, "Zotero Plugin for OCR" only repeats the
name "Zotero OCR".

The site then compares the share of Chinese, Japanese, and Korean text in
the descriptions that are left. It counts each Han, Hiragana, Katakana, or
Hangul character as one unit and each run of other letters as one unit. If
less than half of the manifest description is such text, the site shows
the manifest description. If not, the site shows the GitHub description in
two cases: the site dropped the manifest description, or the GitHub
description has a lower share. In all other cases the site shows the
manifest description, or no description. A `description` override that
applies to the plugin version that the index read replaces both. The name
check does not apply to an override.

The home page has a search box. It shows only the plugins whose name or
description holds the text you type. The search ignores letter case and the
spaces before and after the text, but not accents. The page keeps the text
in the `q` query parameter of its address, such as `?q=pdf`.

The home page has a "Menus and settings in" menu. It lists each language on
at least one plugin's languages list, after overrides, with the number of
those plugins, such as "Chinese (2)". The languages with the most plugins
come first, and languages with the same number of plugins come in order of
their names. If you pick a language, the table shows only the plugins whose
languages list includes it. The menu groups the regional forms of a
language, so a plugin with `zh-CN` or `zh-TW` counts under Chinese.
"All languages" shows every plugin. The page keeps your choice in the
`language` query parameter of its address, such as `?language=zh`, so you
can link to the filtered table. If the parameter names no language in the
menu, the page shows every plugin and removes the parameter.

The home page also has "Declares Zotero" buttons: "Any" and one button for
each Zotero major from 7 to 10. If you press a major, the table shows only
the plugins whose declared range covers all or part of that version. These
are the plugins with a ✓ or ◐ mark for it. A plugin with no declared range,
or one that the last build failed to read, does not show. The page keeps
your choice in the `zotero` query parameter of its address, such as
`?zotero=8`. If the parameter names no button, the page acts as if "Any" is
pressed and removes the parameter.

The search box, the menu, and the buttons work together: the table shows
the plugins that pass all three. A count beside them reads "M plugins",
where M is the number of plugins in the table. While a filter is on, it
reads "N of M plugins", where N is the number that the filters show. If
the filters show no plugin, the count says that no plugins match these
filters.

A script runs the search box, the menu, the buttons, and the count.
Without JavaScript, the home page shows none of them and lists every
plugin.

The "Add a plugin" link in the top bar opens the issue form that
"Proposing a plugin with an issue" describes. The form needs a GitHub
account.

Each plugin has its own page. It opens with an "All plugins" link back to
the home page, the plugin's name, and its description. Then come up to
three links, each with an icon and text: "Download <version> (.xpi)" to the `.xpi`
file that the index read, "Source" to the repository, and "Releases" to
the repository's releases page. If the download address does not start
with `http://` or `https://`, the page has no download link. If the
repository address does not, the page shows that address, and the releases
address after it, as plain text. A plugin whose read failed has no download or releases link.

A "Zotero compatibility" card follows. It names the plugin version that
the index read and holds a table, newest major first. The table has one
row for each Zotero major from 7 to 10. It also has a row for each other
major that the plugin's counted reports or start-test results name. Each
row has three cells:

- Declared: the mark and the word for how much of that major the declared
  range covers. The words are "Yes" (✓), "Partly" (◐), and "No" (a dash). If the
  plugin declares no range, the cell shows "No range".
- Start test: the result of the newest tested release of that major, in
  words, with that release, such as "Started Zotero 10.0.6". A dot (●)
  marks a start, and a cross (✕) marks a failure. If no release of that
  major has a result, the cell shows "Not tested".
- User reports: the number of "works" reports and of "broken" reports on
  that major, as "Using the data" counts them. If no report counts, the
  cell shows "None yet".

Under the table, the card shows a link to the About page. If the plugin
declares a range, the declared range comes before that link. Then a line names the plugin version that the index read, beside a
"Works" button and a "Broken" button. The buttons open the report forms on
GitHub with the plugin id and that version filled in. If the last build
failed to read a plugin, the card shows the failure in place of the table,
with no report buttons.

An open "Details" card comes last. It lists the plugin id. If the build
read the plugin, it also lists facts about the repository and the release
that the index read. Its last fact is "Menus and settings in". That fact names the
languages of the `languages` list that "Using the data" describes, which
come from the plugin's locale folders. If a `languages` override applies to
the plugin version that the index read, the override replaces that list.
The fact does not say how complete each language is. If no language is
left, the page shows "Unknown (no translations found)". The description
comes from the plugin's manifest, from the About text of its GitHub
repository, or from an index override. So it can be in another language
than the languages fact names. The card shows the manifest description and
the GitHub description as two more facts. If the index has overrides
for the plugin, an "Overrides" table under its own heading in the card
lists them.

The About page says how the index shows the declared range and how the
start test runs. It says which user reports count. It also says how
overrides and the Used column of the Overrides table work, and that the
index does not vet the plugins it lists.

The index lists a plugin whose GitHub repository is archived. Its row on the
home page and the name on its page show "Archived". The Details card of its
page shows the fact "Archived on GitHub" with the value "Yes". GitHub makes
an archived repository read-only until someone with admin access to it
unarchives it.

## Using the data

The index publishes its data file on GitHub Pages:

- Data: <https://jmgirard.github.io/zotero-plugin-index/v1/plugins.json>
- Schema for the data file:
  <https://jmgirard.github.io/zotero-plugin-index/schemas/plugins.v1.schema.json>
- Schema for `index.json`:
  <https://jmgirard.github.io/zotero-plugin-index/schemas/index.v1.schema.json>

A daily build updates the data. If more than half of the records carry a
build-level failure, such as a rate limit or a network error, the build
deploys nothing. "Building the data" below says which failures are
build-level. If every record carries a failure, whatever its name, the build
also deploys nothing. The build also deploys nothing in these cases: it
cannot read the report issues, it cannot write the start plan,
`pnpm add-start-results` fails, or the site build fails. "The daily build"
below names the commands. A failed start test does not stop the deploy.
The data from the last good build then stays in place. "Building the data"
below describes the file. A breaking change to the file gets a new schema
version under a new path, such as `v2/`. By this project's rule, a new
optional field does not get a new schema version. The schema rejects fields
that it does not define. If you validate
against a saved copy of the schema, fetch it again after such a change.

Each `upstream` block has an `xpiUrl` field. It is the download address
that GitHub gives for the first `.xpi` file of the release whose manifest
the index read. The start plan names the same address. The file is the
author's own: the data gives its address, and the index keeps no copy. An
author can replace a release file later, so the file at the address can
differ from the one the build read. Data written before the build wrote
this field has none.

An `upstream` block can have a `repoDescription` field. It is the About
text of the plugin's GitHub repository, with the spaces before and after
it removed. If GitHub gives no such text, or the text is blank, the field
is absent. Data written before the build wrote this field has none. The
site uses the field by the description rule above.

Each `upstream` block has a `languages` list, such as `["en-US", "zh-CN"]`.
It holds the language tags of the locale folders in the plugin's XPI, the
one whose manifest the index read. A locale folder is `locale/<tag>/` or
`chrome/locale/<tag>/`. The build counts the messages in the files of each
tag's folders. In an `.ftl` file, each Fluent message or term line, such as
`hello = Hello`, is a message. In a `.properties` file, each line that is
not blank and not a `#` or `!` comment is a message. In a `.dtd` file, each
`<!ENTITY` outside `<!-- -->` comments is a message. If a tag's count is at
least 1 and at least half the largest count among the XPI's tags, the list
keeps the tag. So a folder whose files hold only comments, as some plugins
ship for each language that Zotero supports, adds no language. Neither does
a translation with under half the messages of the fullest one. A tag with a
file of any other type is kept whatever its count. The build inflates at
most about 9 MiB of locale files from each XPI. A tag with a file that the
build does not read, or cannot inflate, is kept whatever its count too.
Such a file adds no messages to any count. The build writes each tag in its
standard form, so `zh_CN` becomes `zh-CN`, and sorts the list. It
leaves out a folder whose name does not have the form of a language tag. It
also leaves out a tag whose language is `und` (undetermined), `zxx` (no
linguistic content), or `mul` (multiple languages), in any letter case. It
skips such a folder before it counts messages, so the folder cannot drop
another tag. It also leaves out a tag whose language has no English name in
the `Intl` data of the Node.js that runs the build. So a folder such as
`locale/img/` or `locale/js/` adds no language. It does not check the
script, region, or variant of a tag, so `en-XX` stays. A `languages`
override value is not checked for an English name. The list says which
languages a plugin ships interface text for. A listed language can still be
incomplete, since a tag with half the fullest tag's messages stays. A
plugin that writes
its text straight into its code ships no locale folders, so its list is
empty. A `languages` override in its `index.json` can record its
languages in the record's `overrides` block, as "Plugin entries" says.
Data written before the list existed has no `languages` field.

Each record that has an `upstream` block also has a `reports` list. It
counts the user reports on the plugin version in `upstream.version`. The
list has one item for each Zotero major with at least one counted report,
ordered by major, such as `{ "zoteroMajor": 7, "works": 3, "broken": 1 }`.
If no report counts, the list is empty. A report is a closed issue of this
repository with the label `report`. The build drops a report in each of
these cases:

- It is a pull request.
- It was not closed as completed.
- It was not closed by `github-actions[bot]`, the account that the report
  bot closes issues as. A report that someone reopens and closes again is
  dropped.
- It has the label `not-counted`.
- It fails the bot's checks, as "Reporting whether a plugin works" lists
  them.
- Its plugin version is not the version in the record's `upstream.version`.

Of one GitHub account's remaining reports on one plugin and Zotero major,
only the newest counts. The account is known by its user id, so a renamed
account stays one account. If two such reports have the same creation time,
the one with the higher issue number counts. The count follows each issue's
current text, so a reporter who edits a closed report changes the count.
When the index reads a new release of a plugin, its counts start over.

A record with an `upstream` block can have a `startTests` list. It says
whether the plugin version in `upstream.version` started in each tested
Zotero release, such as
`[{ "zotero": "7.0.32", "result": "started" }, { "zotero": "10.0.6", "result": "start-error" }]`.
The daily build installs the plugin in a new profile of Zotero for Linux
and waits 3 seconds. Then it reads one of four results:

- `started`: Zotero lists the plugin as active, and the plugin logged no
  startup error.
- `start-error`: the plugin's startup threw an error, or an async startup
  rejected, in those 3 seconds. A startup that fails later counts as
  `started`.
- `not-installed`: Zotero does not list the plugin, or lists it as
  inactive.
- `timed-out`: no result came before the start's time limit of 90 seconds.

A start does not show that the plugin works. Zotero does not install a
plugin outside the range of its manifest's `strict_min_version` and
`strict_max_version`. So the build tests only the releases in that range.
Overrides do not change which releases it tests. The list is ordered by
Zotero version. If no tested release gave a result, the record has no
`startTests` field. Data written before the start tests has none. The
tested releases are Zotero 7.0.32, 8.0.4, 9.0.6, and 10.0.6. When Zotero
ships a release, a maintainer adds it to the workflow. The `startTests`
field is new in schema v1. If you validate against a saved copy of the
schema, fetch the schema again.

Plugin code runs during its start test. Code that runs in a start-test job
can rewrite that job's results, its own included. That code can also leave
a process running. If the process uploads results under the artifact name
of another tested release before that release's job does, its results
count. So a `startTests` item can be forged. "Starting plugins in Zotero"
below says which results the build keeps.

## Plugin entries

Each plugin has one directory, `plugins/<id>/`, where `<id>` is the plugin id
from its manifest, for example `plugins/first-plugin@example.org/`. The
directory holds two files.

`meta.json` is an entry in the registry format. The registry is
[zotero-plugin-registry](https://github.com/zotero-plugin-dev/zotero-plugin-registry),
and its schema rejects fields that it does not define. Thus this file holds
only registry fields. Its `id` must equal the directory name.

`index.json` holds the data that only this index uses. It has these fields:

- `schemaVersion`: the version of the `index.json` schema. The current version
  is `1`. This field is required.
- `overrides`: a list of corrections to upstream facts. Use an override only
  when the plugin author cannot or will not fix the fact upstream. A
  `description` override can also give English text for a plugin with no
  English description upstream. "Upstream" here means the manifest, its
  English locale files, and the About text of the GitHub repository. A
  description that is not in English or only repeats the name counts as
  none. So does a description of which half or more is Chinese, Japanese,
  or Korean, by the share that the site counts. Each item has these fields:
  - `field`: the fact to correct or fill in. The value is one of `name`,
    `description`, `homepage`, `strict_min_version`, `strict_max_version`,
    or `languages`.
  - `version`: the plugin version that the override applies to. If you leave
    it out, the override applies to every version.
  - `value`: the corrected value. For `languages`, the value is one or more
    language tags joined by a comma and a space, such as `zh-CN, en-US`. A
    tag starts with a language of 2 or 3 letters. An optional script,
    region, and variant follow, each after a `-`. Examples are `zh`,
    `zh-TW`, and `sr-Latn-RS`. A tag whose language is `und`, `zxx`, or
    `mul`, in any letter case, is not allowed.
  - `reason`: why the upstream value is wrong. For English description
    text, the reason names the upstream file or section the text came
    from. It also says which case above each upstream description is. The
    reason must hold a
    character other than whitespace, as JavaScript's `\s` defines it, and
    Unicode format characters, such as U+200B.

Two overrides must not have the same `field` and `version`.

The schema for `index.json` is
[`schemas/index.v1.schema.json`](schemas/index.v1.schema.json).

## Setup

The project uses Node 24 or later and pnpm. To install the dependencies, run:

```bash
pnpm install
```

## Adding a plugin

To draft an entry from the GitHub repository of a plugin, run:

```bash
pnpm add-plugin https://github.com/<owner>/<repo>
```

The command reads the repository and its releases. It reads the
`manifest.json` in the newest stable release that has an `.xpi` file, and the
`update.json` that the manifest names. A stable release is a release that
GitHub does not mark as a prerelease. If no stable release has an `.xpi`
file, the command reads the newest release that has one. The stable release
can fail to be a Zotero 7+ build: its `.xpi` file has no `manifest.json`, the
manifest has no `applications.zotero.id`, or its `strict_max_version` is
below 7. If a later release has an `.xpi` file, the command then reads the
newest such release instead. Then it writes `plugins/<id>/meta.json` and
`plugins/<id>/index.json`. To write the entry in another directory, add
`--out <dir>`. The command does not replace an entry that already exists.

If the plugin does not meet the inclusion bar, or the command cannot read one
of these files, the command writes no file. It prints the name of the failure
and a message, then exits with status 1. Two failure names are `fork` and
`no-xpi-release`. An archived repository passes the inclusion bar, so the
command writes its entry. The `Failure` type in `src/upstream/reader.ts`
lists each failure name for reading a plugin. The `WriteResult` type in
`src/add-plugin/add-plugin.ts` adds `entry-exists`, `unsafe-id`, and
`write-failed`. If the rule `entry-name` of "Checking entries" refuses the
id as a directory name, the command fails with `unsafe-id`. An example is
the Windows name `CON`. If an entry has the id as its name, the command fails
with `entry-exists`. A name that differs from the id only in case also
counts.

The command limits what it downloads from the plugin's release and update
host, and what it unzips from the XPI:

- An XPI larger than 50 MiB fails with `xpi-too-large`.
- A `manifest.json`, or the `messages.json` of the default locale, whose
  size in the zip, unzipped or compressed, is more than 1 MiB fails with
  `manifest-too-large`.
- An `update.json` larger than 1 MiB fails with `update-json-too-large`.
- An XPI whose zip claims more entries than its length can hold, at 46
  bytes for each entry, fails with `xpi-unreadable`.
- An XPI whose zip has more than one entry named `manifest.json`, or more
  than one entry named the `messages.json` of the default locale, fails
  with `xpi-unreadable`.
- A `manifest.json`, or the `messages.json` of the default locale, whose
  deflate data inflates past the unzipped size that the zip declares fails
  with `xpi-unreadable`. The command inflates 16 KiB of that data at a time
  and stops after the first 16 KiB whose output passes that size.
- The `messages.json` of `_locales/en/`, `_locales/en_US/`, or
  `_locales/en_GB/` fails nothing. If the command refuses such a file under
  the rules above, it skips the file. The rules still apply to the same
  file as the default locale's.
- A file in a locale folder fails nothing. The command inflates the whole
  file, 1 KiB of input at a time, and then counts its messages. For each
  file it counts the largest of the declared size, the compressed size, and
  the output. It does not inflate a
  locale file that takes that count for the XPI past 8 MiB. One file that
  inflates past its declared size can add about 1 MiB more. A locale file
  over 1 MiB, past that count, or not readable keeps its language in the
  list.

Before the command requests the XPI, the `update.json`, or a redirect target,
it checks the host. The read fails with `host-refused` for `localhost` and
for names that end in `.localhost`. It also fails for a host that is, or
resolves to, an address in a blocked range. The blocked ranges include the
loopback, private, link-local, shared, multicast, documentation, benchmark,
6to4, and NAT64 ranges. `src/upstream/host-guard.ts` lists them. The command
follows at most 5 redirects for these two files.

GitHub limits the number of API requests per hour. If the `GITHUB_TOKEN`
environment variable is set, the command sends it with each GitHub API
request, which gives a higher limit.

## Finding new plugins

To search GitHub for plugins that the index does not list, run:

```bash
pnpm discover
```

The command searches for repositories with the topic `zotero-plugin` or
`zotero-addon`. It leaves out each repository that an entry already names. It
reads the other repositories in the same way as `pnpm add-plugin`, the newest
pushed first. It writes the entries of at most 5 repositories that pass the
inclusion bar under `plugins/`, and it reads at most 100 repositories. To
change these numbers, add `--limit <n>` or `--budget <n>`. To write the
entries in another directory, add `--out <dir>`. The command prints a JSON
report that names each repository that it wrote, refused, or skipped.

The command also refuses a plugin that the bot cannot propose, with the
failure name `not-proposable`. Some examples:

- an id that is not a Mozilla add-on id
- a repository name that git refuses as a branch name
- a value longer than `pnpm propose` accepts

`pnpm discover-issue` refuses such a plugin in the same way.

The command keeps a state file, `.cache/discovery-state.json`. The file
records each refused repository. A later run reads that repository again
only after a new push or after 30 days. The file does not record a GitHub API
error, such as a rate limit, or a failed request. It also does not record an
HTTP 429 or 5xx answer to the download of the XPI or the `update.json`, after
any redirects. Nor does it record a 403 answer to a download that requested
a GitHub release download URL, as "Building the data" defines it. Such a
repository is read again on the next run. To use
another file, add `--state <file>`.

The command gives each repository read 3 minutes, as `pnpm build` does. If a
read takes longer, the command stops it and refuses the repository with
`request-failed`. The state file does not record this refusal, so the next
run reads the repository again. The check of the branch name with git stops
after 30 seconds. If it takes longer, the command refuses the repository with
`unexpected-error`, which the state file also does not record. The command
starts no repository read after 18 minutes from its start. The `unread` field
of the report counts each repository that it did not reach. The report also
gets a warning that names the time limit. The command still writes its state
file and, with `--handoff`, its handoff. These limits leave time for the
other steps of the first job of `Discover plugins`, which GitHub stops at 30
minutes. In the second job, `pnpm propose` has limits on each process but
none on the whole run.

### Pull requests from the bot

The `Discover plugins` workflow runs once a day in two jobs. You can also
start it by hand on the default branch and set its `limit` input. A run
started on another branch does nothing.

The first job can only read the index repository, and its checkout keeps no
token. It runs `pnpm discover --handoff handoff`. With `--handoff <dir>`, the
command writes each new entry under `<dir>/entries/` and a plan file,
`<dir>/plan.json`, that lists them. The command makes no change on GitHub.
The job keeps the directory as a workflow artifact.

The second job can push and open pull requests, and it reads no plugin
repository. It runs `pnpm propose handoff`. For each entry in the handoff,
the command pushes the branch `discover/<owner>/<repo>` with one commit that
adds the two files of the entry. Then it opens a pull request from that
branch. A run opens at most 5 pull requests, or the number that `--limit`
gives.

The first job reads files that anyone can write, so `pnpm propose` does not
trust the handoff. It refuses the whole handoff, and pushes nothing and sends
no request, in cases such as these:

- `plan.json` does not match its schema.
- An id is not a Mozilla add-on id.
- A repository name is not a lowercase owner/repo that makes a valid branch
  name.
- The handoff holds more entries than the limit, which is 1 for an issue
  run.
- An entry directory holds anything other than the regular files `meta.json`
  and `index.json`.

Before it pushes, the command reads the bot pull requests again. It also
fetches the default branch and reads the index at the fetched commit. Each
pull request builds on that commit, so an entry merged before the fetch
counts, also one merged while the read job ran. It skips an entry that the
pull requests or that index has. It gives the token to git only in git's
environment, and `pnpm check` gets no token.

The workflow uses the built-in `GITHUB_TOKEN`, and a pull request that this
token opens starts no CI run. Thus the body of each pull request gives the
exit status and the output of `pnpm check` on the new entry. If the output
is longer than 10,000 characters, the body quotes only its first 10,000
characters and says that the output is cut. The body also gives the
repository URL, the plugin version, and the declared range of Zotero
versions.

The body also has a Hold line. The read job reads the hold reasons of each
entry, and the line names them, or says `Hold: none`. An entry has these
reasons, in this order:

- `name-match`: the manifest name matches the name of an entry from another
  owner, or the repository name without its owner matches that part of such
  an entry's repository. The match ignores letter case and each character
  other than `a` to `z` and `0` to `9`. It also drops `zotero`, `plugin`,
  `addon`, and `for` where they stand apart as words. A name with nothing
  left matches no entry.
- `owner-unread`: the bot did not get the creation date of the owner's
  GitHub account.
- `new-account`: the owner's GitHub account is less than 30 days old.
- `update-host`: the host of the manifest's `update_url`, with any port other
  than the default one, is not `github.com` or `raw.githubusercontent.com`.
- `issue-no-topic`: an issue proposed the repository, and it has neither the
  topic `zotero-plugin` nor `zotero-addon`.

A held pull request also gets the label `hold`, and the maintainer merges or
closes it. If the label request fails, the command names the pull request
as a failed entry and exits with status 1. The pull request stays open, and
its Hold line still keeps the bot from merging it.

If you close a bot pull request without a merge, the bot does not propose
that owner/repo name again. The bot also skips a repository whose bot pull
request is still open, and a plugin whose id an open bot pull request already
adds. A renamed repository has a new name, so the bot can
propose it again.

If the push or the pull request fails for one entry, the command goes on to
the next entry. At the end, it names each failed entry with its error and
exits with status 1. If the fetch of the default branch fails, every entry
fails, and the command pushes nothing. If the fetched commit has no
`plugins/` folder, the same happens. An entry that a bot pull request adds
also fails then.

`pnpm propose` stops each git process that fetches, builds, or pushes a
commit after 2 minutes, and each `pnpm check` process after 5 minutes. If a
process for one entry takes longer, that entry fails, and the command opens
no pull request for it. If the fetch of the default branch takes longer,
every entry fails, as when the fetch fails. The
command also checks each branch name in the handoff with git again, with the
30-second limit of "Finding new plugins". The check can pass that limit,
or git can fail to start or end with any result other than exit status 1.
Then the command pushes nothing, prints the error, and exits with
status 1. In an issue run, the command first comments the error on the
issue, as "Proposing a plugin with an issue" says.

Both commands read the name of the index repository from the
`GITHUB_REPOSITORY` environment variable, which GitHub Actions sets. The
workflow needs the repository setting "Allow GitHub Actions to create and
approve pull requests" under Settings > Actions > General.

### Merging bot pull requests

The `Merge bot pull requests` workflow runs `pnpm merge-discover` once a day
at 05:13 UTC, before the daily build. You can also start it by hand on the
default branch. It runs in the same group as `Discover plugins`, so it never
runs while that workflow or `Add a plugin from an issue` runs.

The command reads every page of the open pull requests. It merges a pull
request that meets all of these conditions:

- Its branch starts with `discover/` and is in the index repository.
- `github-actions[bot]` opened it.
- Its body has a line that is exactly `Hold: none`.
- It has no `hold` label.
- It opened at least 48 hours before the run.
- Its files are exactly `plugins/<id>/meta.json` and
  `plugins/<id>/index.json` for one id, both added.
- The checkout's `plugins/` folder has no folder of that id in any letter
  case.

So the bot can merge a bot pull request without a hold reason at its first
daily run at least 48 hours after it opens. A run started by hand after
those 48 hours can merge it sooner. To stop the bot from merging one, add
the `hold` label or close it. Bot pull requests opened before the Hold line
existed have no `Hold: none` line, so the command never merges them.

Before it merges, the command reads the two files at the head commit of the
pull request. It copies the checkout's `plugins/` folder, adds the new entry,
and runs `pnpm check` on the copy. An entry that this run merged is in that
copy too. Then it squash-merges the pull request at that head commit.

In these cases a pull request fails, and the command goes on to the next:

- Its head has no commit SHA.
- A read of its files or their contents fails.
- The check fails or passes its time limit of 5 minutes.
- GitHub refuses the merge.

The command first prints a `merged #<n>` line for each merged pull request.
Then it prints a `skipped #<n>: <reason>` line for each skipped one. Last,
it prints a `failed #<n>: <error>` line on stderr for each failed one. If a
pull request failed, the command exits with status 1. If the command cannot
read the list of pull requests or the checkout's `plugins/` folder, it
prints `merged nothing: <error>` and exits with status 1.

A merge made with the workflow's `GITHUB_TOKEN` starts no workflow run, so
the merged plugin appears on the site after the next daily build.

### Proposing a plugin with an issue

To propose a plugin, open an issue with the "Add a plugin" form. Give the URL
of the plugin's GitHub repository. The form adds the label `add-plugin` to the
issue. If the repository has no such label, GitHub does not add it.

When an issue with that label opens, the `Add a plugin from an issue` workflow
runs in three jobs. The `pick` job names the issue. The read job and the write
job split the work as those of `Discover plugins` do. The read job runs
`pnpm discover-issue --handoff handoff/<issue>` with the issue number in
`ISSUE_NUMBER`. The command reads the issue body from the GitHub API and
takes the URL from it. It writes its outcome and any new entry into the
handoff, and makes no change on GitHub. The write job runs
`pnpm propose handoff/<issue>` with the issue number, which answers the
issue. If an entry already names the repository, the bot comments the entry
and closes the issue as completed. A bot pull request for the repository can
be open, or closed without a merge.
Then the bot comments its link and closes the issue as not planned. An open
bot pull request whose body has exactly one `Closes #<issue>` line outside
code blocks, for this issue, is the exception: the bot comments its link as
for a new pull request and leaves the issue open. In these cases the bot does
not read the repository.

Otherwise, the bot reads the repository in the same way as `pnpm add-plugin`.
If the plugin passes the inclusion bar, the bot opens a pull request in the
same way as for `Discover plugins`. The body of the pull request contains
`Closes #<issue>`. Thus a merge of the pull request closes the issue. The bot
comments the link to the pull request on the issue.

The bot can also find no URL in the issue body. It can find that an entry or
an open bot pull request already has the plugin's id, or that the id cannot
name a directory. Its read of the repository can also fail for a reason
that is not build-level. Then it comments the failure name and its message,
and it closes the issue as not planned. A failed read includes a GitHub API
answer of HTTP 404, which a repository that does not exist or is private
gives.

The bot itself can fail. Its read of the issue can fail, for example with
an HTTP 503 or 404 answer. Its read of the repository can stop with a
build-level failure, as "Building the data" defines it. Examples are a rate
limit, an outage, a read stopped at 3 minutes, and an error that the reader
does not name. The bot can fail to write the entry: its directory can
already be in the output directory (`entry-exists`), or the write can fail
(`write-failed`). The check of the written entry can also stop with an
error, `unexpected-error`. Examples are a git that cannot start and a
branch-name check stopped at 30 seconds. "Finding new plugins" gives both
time limits. The bot can fail to read `plugins/` in its checkout, its own
pull requests, or the default branch. It can fail to fetch the default
branch, or the fetched commit can have no `plugins/` folder. The push or the
pull request can also fail. The git and `pnpm check` limits of "Pull
requests from the bot" also apply. The read
job can also fail and leave no handoff. In the write job, `pnpm propose`
checks the branch name again, and that check can also stop with an error,
`unexpected-error`: git cannot start, git ends with any result other than
exit status 1, or the check passes its 30-second limit.
Then the bot comments the error and leaves the issue open, and the workflow
run fails. A failed read of the repository, write of the entry, or check of
the written entry also puts the failure name in the comment. So does a
failed branch-name check of `pnpm propose`.
If `pnpm propose` refuses the handoff, the bot does not answer the issue,
and the workflow run fails. A branch name that git refuses, with status 1,
is such a refusal.

A maintainer can close a bot pull request without a merge. Then the
`Close the issue of a closed bot pull request` workflow runs
`pnpm close-issue` with the pull request number in `PR_NUMBER`. The bot
comments on the issue that the `Closes #<issue>` line of the pull request
names, and closes that issue as not planned. The command acts only on a pull
request from a `discover/` branch of the index repository whose body has
exactly one `Closes #<issue>` line outside code blocks. The issue must be
open, have the label `add-plugin`, and have a bot comment with the link to
the pull request. If the bot already commented that the pull request was
closed without a merge, the command does nothing. One run at a time handles
each pull request. The workflow runs on `pull_request_target`, so it runs its
file from the default branch and runs no code from the pull request. A pull
request that the bot's own token closes starts no workflow run, so its issue
stays open.

Once a day at 02:43 UTC, the workflow also sweeps for issues that no run
answered. A maintainer can also run the sweep by hand from the default
branch. The `pick` job runs
`pnpm unanswered-issues --label add-plugin --workflow add-plugin-issue.yml --limit 3`.
The command prints, oldest first, at most 3 open issues with the label
`add-plugin`. Each issue was opened at least 1 hour and at most 7 days
before, and has no comment from `github-actions[bot]`. The command prints
none while any of the 100 newest `issues` runs of the workflow has not
finished. Then the read job and the write job handle each of these issues in
turn, as for a new issue. A failure for one issue does not stop the others,
and the job fails at the end. A rerun of the write job answers each issue of
its run again. An issue with any bot comment stays for a maintainer. An
example is the comment that starts with `The bot could not finish`.

The jobs get only issue numbers. The read job and the write job get them
from the `pick` job in the `ISSUES` environment variable. Each command gets
one in `ISSUE_NUMBER`. Some runs share the concurrency group of
`Discover plugins`, so the two workflows do not push at the same time.
These are a run for an issue with the label `add-plugin`, a sweep, and a
dispatch from the default branch. Up to 100 runs wait in the group, and
they run one at a time. GitHub does not promise their order. If 100 runs
already wait, GitHub cancels a new run. The issue of a canceled run gets no
answer at first. A later sweep can answer it while it is at most 7 days
old. Each sweep answers at most 3 issues, oldest first. An issue without
the label `add-plugin` also starts a run of the workflow. That run does
nothing, so it takes a group of its own and waits for no other run.

## Reporting whether a plugin works

To report on a plugin, open an issue with the "Report that a plugin works"
form or the "Report that a plugin is broken" form. Each form asks for the
plugin id, the plugin version, and the Zotero version. The works form adds
the labels `report` and `works`. The broken form adds the labels `report`
and `broken`. If the repository has no such label, GitHub does not add it.

When an issue with the label `report` opens, the `Answer a report` workflow
runs `pnpm report-issue` with the issue number in `ISSUE_NUMBER`. The
command reads the issue's body, labels, and comments from the GitHub API,
and the entry directories under `plugins/`. If all of these hold, the bot
takes the report:

- Each of the three fields has a value.
- The plugin id is the name of an entry directory under `plugins/`.
- The plugin version has at most 100 characters and no spaces.
- The first number in the Zotero version is a major from 7 to the newest
  major in `ZOTERO_MAJORS` (`src/site/version.ts`).
- The issue has exactly one of the labels `works` and `broken`.

If the bot takes the report, it comments the plugin id, the plugin version,
the Zotero major, and the verdict. The comment also states how the index
counts the report. It counts a report only while it reads that plugin
version, and once per GitHub account for each plugin and Zotero major.
"Using the data" above gives the whole rule. Then the bot closes the issue
as completed. Otherwise, the bot
comments the name and the message of the first problem it found, and
closes the issue as not planned. The comment puts each value from the issue
in a code span, so the value cannot link to a page or mention a user.

If the bot cannot read the issue, its comments, or `plugins/`, it sends
nothing. If it cannot post the comment, it does not close the issue. In
these cases the workflow run fails. A failed close also fails the run. If
the bot already commented on the issue, it sends the close alone. So a
rerun of a run whose close failed closes the issue with no second comment.
Each report run has a concurrency group of its own, so a report run does
not wait for another run or cancel one. Its job restores no Actions cache.

Once a day at 03:13 UTC, the workflow runs `pnpm report-issue --sweep`. A
maintainer can also run it by hand from the default branch. The command
answers, in turn, at most 20 report issues that no run answered. It picks
them as `pnpm unanswered-issues` does for the label `report` and the
workflow `report-issue.yml`, as "Proposing a plugin with an issue" says. A
failed answer does not stop the others, and the command exits 1 at the end.
The sweeps share one concurrency group, so two sweeps do not answer one
issue at once. A sweep can answer an issue from 1 hour to 7 days old. That
holds also for an issue whose `report` label was added after it opened. An
issue with a
bot comment stays for a maintainer, as does a report issue opened more than
7 days before the sweep.

## Checking entries

To check every entry under `plugins/`, run:

```bash
pnpm check
```

The command prints one line for each problem, then a summary line. Each
line names the entry directory or file and the rule that failed. If it finds a problem or cannot
load the registry schema, it exits with status 1. To check
the entries in another directory, give its path: `pnpm check <dir>`.

The command skips each name that starts with `.`, such as `.idea`. Three
rules check the names in the directory:

- `entry-is-directory`: each other name must be a directory.
- `entry-name`: a directory name holds only the letters A to Z and a to z,
  the digits, and `_ @ { } + . -`, at most 200 characters. It must not end
  with `.`. The part before its first `.` must not be one of the
  names that Windows reserves, in any case: CON, PRN, AUX, NUL, COM1 to
  COM9, and LPT1 to LPT9. For example, `nul.tar.gz` is refused.
- `unique-ignoring-case`: two directory names must not differ only in case,
  because Windows and macOS check them out as one directory. The line names
  every directory of the set.

In each entry, the rule `registry-schema` checks `meta.json` against the
registry schema, and `index-schema` checks `index.json` against its schema.
A file can start with a UTF-8 byte-order mark (U+FEFF). Then the line names
the mark, in place of "is not valid JSON". Save such a file as UTF-8
without the mark. Besides `index-schema`, two rules check the overrides in
`index.json`:

- `reason-not-blank`: a reason must hold a character other than whitespace,
  as JavaScript's `\s` defines it, and Unicode format characters. Most
  format characters, such as U+200B (zero width space), print nothing.
- `unique-override`: two overrides must not have the same `field` and
  `version`. An override with no `version` repeats only another override
  with no `version`. Versions must match exactly, so `1.0` and `1.0.0` do
  not repeat each other. The line names the index of the repeat and the index
  of the first override with that field and version. The site never applies
  the repeat.

The first run downloads the registry schema into `.cache/`, so that run needs
a network connection. The command refuses a downloaded or cached schema whose
SHA-256 differs from the hash pinned in `src/check/registry-schema.ts`.

## Building the data

To build the data file, run:

```bash
pnpm build
```

The command reads each entry under `plugins/`. Then it reads the label
`report` and every page of the closed issues with that label. It reads them
from the repository that `GITHUB_REPOSITORY` names. If that variable is not
set, it reads them from `jmgirard/zotero-plugin-index`. A fork that builds
the data must have a label named `report`, or the build exits 1. Then it
reads each plugin
from GitHub in the same way as `pnpm add-plugin`. It writes one file,
`dist/v1/plugins.json`. The file has a `schemaVersion` of `1`, a
`generatedAt` time, and one record for each entry. Each record keeps the
upstream facts in an `upstream` block and the overrides of the entry, with
their reasons, in an `overrides` block. The schema for the file is
[`schemas/plugins.v1.schema.json`](schemas/plugins.v1.schema.json). If the
GitHub response for the repository says whether it is archived, the
`upstream` block has an `archived` field, `true` or `false`. The `upstream`
block also has a `prerelease` field, `true` or `false`. It says whether
GitHub marks the release that the reader read as a prerelease. It also has
a `languages` list and an `xpiUrl` field, which "Using the data"
describes. Each record
with an `upstream` block has a `reports` list, which "Using the data"
describes. The command writes no `startTests` list. The daily build adds
it with `pnpm add-start-results`, as "Starting plugins in Zotero" says.

If the read of a plugin fails, its record has no `upstream` block. The
record has a `failure` block with the failure name and a message. If the
read stops with an error that the reader does not name, the failure name is
`unexpected-error`. If the read gives facts that the schema rejects, the
failure name is `facts-invalid`. The command still writes the file.

The command gives each plugin read 3 minutes. If a read takes longer, the
command stops it, and the record fails with `request-failed`. The command
starts no plugin read after 18 minutes from its start. Each entry that it
did not read gets a record that fails with `not-read`. If the number of
whole days from 1970-01-01T00:00Z to `generatedAt` is even, the command
reads the plugins in id order. Id order sorts the entry directory names by
character code, so capital letters come before small letters. If that
number is odd, it reads them in reverse id order. So the entries that get
`not-read` are the last ids on even days and the first ids on odd days. The
file lists its records in id order on every day. A plugin with either
failure shows no facts until a later build reads it. The read of the
`report` label and the report issues, which comes before the plugin reads,
also counts toward the 18 minutes. These limits leave time for the other
steps of the daily build, whose job GitHub stops at 30 minutes.

A build-level failure usually comes from the build, not from the plugin.
A plugin's own download host that is down also gives one. These failures
are build-level:

- an `unexpected-error`,
- a request that gets no whole response, such as a failed host lookup, a
  network error, or a timeout, such as a read stopped at 3 minutes,
- a `not-read` entry,
- an HTTP 401 or 403 answer from the GitHub API,
- an answer from the GitHub API that succeeds but whose body is not JSON,
  such as an HTML error page,
- an HTTP 403 answer to an XPI or `update.json` download that requested a
  GitHub release download URL, as its first URL or after a redirect. The
  rule counts any URL on `github.com` whose path has `releases` as its
  third part. An example is
  `https://github.com/<owner>/<repo>/releases/download/<tag>/<file>`,
- an HTTP 429 or 5xx answer from any host.

Every other failure, a 404 included, belongs to the plugin. First, the
command prints one line for each failed record. Next, it prints one line
for each failure name, with the number of records that carry it. Then it
prints the number of records with a build-level failure. If a record
carries a build-level failure, the command also prints a `::warning::`
line. GitHub Actions shows this line as a warning on the run. If more than
half of the records carry a build-level failure, the command exits with
status 1. If every record carries a failure, whatever its name, the command
also exits with status 1. For each of these two cases that holds, the
command prints one line on stderr. In every other build that writes the
file, the command exits with status 0.

The command also writes copies of the two schemas to `dist/schemas/`.

The command writes no data file and exits with status 1 in these cases:

- It finds no entries, or it cannot read the entry directory.
- An entry is not valid, for example a `meta.json` with no `repoUrl`.
- It cannot read the `report` label, which it reads before the report
  issues. After a rename or a delete of the label, GitHub answers HTTP 404.
  It prints a line that names the failure, and it reads neither the report
  issues nor any plugin.
- It cannot read a page of the report issues, for example after an HTTP
  error, a network error, or an answer that is not a list. It prints a line
  that names the failure, and it reads no plugin.
- An issue in the list of report issues has no `closed_by` field. It prints
  a line that names the field. If the issue has a number, the line also
  names that number. It reads no plugin.
- The read of the `report` label and every page of the report issues takes
  more than 3 minutes in all. It prints a line that names the time limit,
  and it reads no plugin.
- The file it built is not valid against the schema.
- It cannot write the schema copies or the data file.

A data file from an earlier run then stays in place. In the last case, the
schema copies can already be in `dist/schemas/`. The command writes the
data file before the start plan that `--plan` names. If it cannot write the
plan, it prints `write-failed` with the plan's path and exits with status
1. The new data file then stays in place.

To read the entries in another directory, give its path: `pnpm build <dir>`.
To write the file under another directory, add `--out <dir>`. As with
`pnpm add-plugin`, set `GITHUB_TOKEN` to get a higher GitHub API limit.

To also write a start plan, add `--plan <file>`. The plan has one item for
each record with an `upstream` block. Each item names the entry id, the
plugin id and version, and the manifest's `strict_min_version` and
`strict_max_version`. It also names the URL of the XPI that the build read
and the SHA-256 of the bytes that it got. The data's `xpiUrl` holds the
same URL. The plan is not part of the data file, and the daily build
writes it outside `dist/`. Without `--plan`, the
command writes no plan.

## Starting plugins in Zotero

To start one plugin in one Zotero install, run:

```bash
pnpm start-test --zotero <binary> --xpi <file> --out <file>
```

The command reads the Zotero version from the `app/application.ini` file
beside the binary, or on macOS from `../Resources/app/application.ini`.
It makes a new Zotero profile with a reporter plugin of the index. It
starts Zotero with `MOZ_HEADLESS=1`. On Linux, Zotero also needs a display,
such as the one `xvfb-run` gives. Once Zotero is ready, the reporter
installs the XPI and waits 3 seconds. Then it reports one of the four
results that "Using the data" lists. The command writes the result as JSON,
such as
`{ "id": "<plugin id>", "version": "1.0.0", "zotero": "10.0.6", "result": "started" }`,
and exits with status 0. A start gets 90 seconds. To give it another limit
from 1 to 3600 seconds, add `--limit <seconds>`. If the command cannot run
the start, it writes no file. It then prints a failure name, such as
`zotero-missing` or `reporter-not-started`, and exits with status 1. At the
end, the command stops every process that Zotero started and removes the
profile.

To start each plugin of a start plan in one Zotero install, run:

```bash
pnpm start-tests --plan <file> --zotero <binary> --out <file>
```

The command starts only the plan items whose manifest range covers the
binary's Zotero version. It downloads each XPI from the plan's URL with the
same host check as the build. If the download fails, or its SHA-256 differs
from the plan, the item gets no result. The command runs `pnpm start-test`
for each other item. If that command exits with status 1, the item also
gets no result. The command prints one line for each item that it tries.
After 20 minutes, it starts no new plugin. If that leaves items in range
unstarted, it prints a `::warning::` line with their number. It
writes the results as a JSON array, each with its entry id beside the
fields of `pnpm start-test`, and exits with status 0. If it cannot read
the plan or the binary's Zotero version, it writes no file and exits with
status 1.

To add start results to a data file, run:

```bash
pnpm add-start-results --data <file> --plan <file> --results <dir> --tested <versions>
```

The command reads each file in each directory under `--results`. A
directory named `start-results-<version>` holds the results of one Zotero
version, as the daily build names its artifacts. `--tested` lists the Zotero
versions to keep, joined by commas, such as `7.0.32,10.0.6`. The daily build
passes the versions of its start-test jobs. Plugin code in a start-test job
can upload an artifact of another name, so the list stops it from adding a
version. If a result meets all of these conditions, the command keeps it:

- Its entry id, plugin id, and plugin version match an item of the plan.
- Its entry's record in the data file has an `upstream` block.
- Its Zotero version is the one in its directory's name, and `--tested`
  lists it.
- Its Zotero version is in the range of the item's manifest.
- Its result is one of the four names.

If two or more such results name one entry and one Zotero version, the
command drops all of them. It also drops each entry that is not a readable
JSON array. Such an entry can be a directory, a link, or a file over 1 MiB.
Then it writes each record's kept results into the data file as
`startTests`, ordered by Zotero version, and prints how many it dropped. If
`--results` does not exist, the command adds no results and exits with
status 0. The command can fail to read the data, the plan, or the list of
the results directories, or the schema can reject the new data. In each
case, the command leaves the file as it was and exits with status 1.

## Building the site

To build the site, first run `pnpm build`. To show start tests, also run
`pnpm add-start-results` on `dist/v1/plugins.json`, as "Starting plugins in
Zotero" says. Then run:

```bash
pnpm site
```

The command reads `dist/v1/plugins.json`. It writes the home page,
`dist/index.html`, the About page, `dist/about/index.html`, and one page
for each record, `dist/plugins/<id>/index.html`. It does not change the
data file or the schemas. It replaces the `index.html`, `about/`, and
`plugins/` of an earlier run. So a page for a plugin that the data no
longer lists goes away. Links between the pages, and to the data file, start
with `/zotero-plugin-index/`, the path of the site on GitHub Pages.

To read the data from another directory and write the pages there, add
`--out <dir>`. The command then reads `<dir>/v1/plugins.json`. If it cannot
read or parse the data file, or the file has no `plugins` list, it writes no
page and exits with status 1.

## The daily build

The `Build data` workflow runs once a day, and you can also start it by
hand. It has four jobs:

1. The build job runs `pnpm check` and `pnpm build --plan start-plan.json`.
   It keeps `dist/` as a workflow artifact named `plugins-data`, and the
   plan as an artifact named `start-plan`. No artifact holds an XPI.
2. The start-test job runs once for each tested Zotero release for Linux.
   It downloads Zotero from download.zotero.org and checks the file against
   a SHA-256 in the workflow. Then it runs `pnpm start-tests` under
   `xvfb-run` and keeps the results as an artifact named
   `start-results-<version>`. The job has no token permission, reads no
   secret, keeps no git credentials, and uses no cache, since plugin code
   runs in it.
3. The site job runs `pnpm add-start-results` and then `pnpm site`. It runs
   when the build job succeeded, whatever the start-test jobs' results.
4. If the site job succeeded, the deploy job deploys `dist/` to GitHub
   Pages, whatever the start-test jobs' results.

If `pnpm build`, `pnpm add-start-results`, or `pnpm site` exits with
status 1, the workflow deploys nothing. The site and data from the last
good build then stay published.
GitHub stops the build job at 30 minutes, and then the workflow also
deploys nothing. The repository's
`github-pages` environment, set in its GitHub settings, lets only runs on the
`main` branch deploy.

## Running the tests

To run the tests, run:

```bash
pnpm test
```

The tests of `pnpm start-test` use a stand-in for Zotero. The test file
`test/start-test-zotero.test.ts` starts a real Zotero. If `ZOTERO_BIN`
is not set, the file skips its tests. The `start-test`
job of `ci.yml` sets it. To run that file yourself, run:

```bash
ZOTERO_BIN=<binary> pnpm exec vitest run test/start-test-zotero.test.ts
```
