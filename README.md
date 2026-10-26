# zotero-plugin-index

A community index of plugins for Zotero 7 and later. The index lists plugins
and links to the releases of each author. It does not host plugin files, and
it does not review or endorse plugins.

## The site

The website <https://jmgirard.github.io/zotero-plugin-index/> shows the index.
The home page lists every plugin with its name, its description, and one
pill for each Zotero major version from 7 to 10. A pill shows how much of
that version the plugin's declared range covers. A check mark (✓) means all
of it, a half circle (◐) means part of it, and a dash means none of it. Hold
the pointer over a pill to read its meaning and, for a half circle, the
declared range. On a touch screen, open the plugin's page to read its
declared range. A pill counts Zotero N as the versions from N.0 to N.9.
Plugin authors often write a maximum such as 10.99.99 to mean every Zotero 10
release. They also write a minimum such as 8.999 to mean Zotero 9 and newer.
The declared range uses the overrides that apply to the plugin version that
the index read. The site does not test plugins. The pills show what each
plugin declares.

A plugin with no declared range shows "No declared range" in place of the
pills. If the last build failed to read a plugin, its row shows the failure.

The description comes from the plugin's manifest. If the manifest has no
description, if it is blank, or if it only repeats the plugin's name, the
site shows no description. The site checks for a repeated name this way. It
takes the words of the description and of the name. It leaves out "zotero",
"plugin", "addon", "add", "on", "extension", "for", "a", "an", and "the". If
every word of the description that is left is also a word of the name, the
description only repeats the name. For example, "Zotero Plugin for OCR" only repeats the name
"Zotero OCR". A `description` override that applies to the plugin version
that the index read replaces the manifest description. The name check does
not apply to an override.

Each plugin has its own page. The page shows the name, the description, the
pills, the declared range, and links to the repository and its releases. A
closed "Details" section follows. It holds the plugin id, facts about the
repository and its releases, and the overrides of the index for the plugin.
If the last build failed to read a plugin, its page shows the failure in place
of the pills.

The index lists a plugin whose GitHub repository is archived. Its row on the
home page shows "(archived)" after its name. The Details section of its page
shows the fact "Archived on GitHub" with the value "Yes". GitHub makes an
archived repository read-only until someone with admin access to it
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
build-level. If the site build fails, the build also
deploys nothing. The data from the last good build then stays in place. "Building the data" below describes the file. A breaking
change to the file gets a new schema version under a new path, such as `v2/`.
By this project's rule, a new optional field does not get a new schema
version. The schema rejects fields that it does not define. If you validate
against a saved copy of the schema, fetch it again after such a change.

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
  when the plugin author cannot or will not fix the fact upstream. Each item
  has these fields:
  - `field`: the fact to correct. The value is one of `name`, `description`,
    `homepage`, `strict_min_version`, or `strict_max_version`.
  - `version`: the plugin version that the override applies to. If you leave
    it out, the override applies to every version.
  - `value`: the corrected value.
  - `reason`: why the upstream value is wrong. The reason must contain text
    other than whitespace.

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
`write-failed`.

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
error, such as a rate limit, or a failed request. Such a repository is read
again on the next run. To use another file, add `--state <file>`.

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

Before it pushes, the command reads the bot pull requests again, and the
index in its checkout. It skips an entry that one of them has. It gives
the token to git only in git's environment, and `pnpm check` gets no token.

The workflow uses the built-in `GITHUB_TOKEN`, and a pull request that this
token opens starts no CI run. Thus the body of each pull request gives the
exit status and the output of `pnpm check` on the new entry. The body also
gives the repository URL, the plugin version, and the declared range of
Zotero versions. The maintainer reviews each pull request and merges it or
closes it.

If you close a bot pull request without a merge, the bot does not propose
that owner/repo name again. The bot also skips a repository whose bot pull
request is still open, and a plugin whose id an open bot pull request already
adds. A renamed repository has a new name, so the bot can
propose it again.

If the push or the pull request fails for one entry, the command goes on to
the next entry. At the end, it names each failed entry with its error and
exits with status 1.

Both commands read the name of the index repository from the
`GITHUB_REPOSITORY` environment variable, which GitHub Actions sets. The
workflow needs the repository setting "Allow GitHub Actions to create and
approve pull requests" under Settings > Actions > General.

### Proposing a plugin with an issue

To propose a plugin, open an issue with the "Add a plugin" form. Give the URL
of the plugin's GitHub repository. The form adds the label `add-plugin` to the
issue. If the repository has no such label, GitHub does not add it.

When an issue with that label opens, the `Add a plugin from an issue` workflow
runs in two jobs, as `Discover plugins` does. The first job runs
`pnpm discover-issue --handoff handoff`. The command reads the URL from the
issue body, writes its outcome and any new entry into the handoff, and makes no
change on GitHub. The second job runs `pnpm propose handoff` with the issue
number, which answers the issue. If an entry already names the repository, the bot comments the entry and closes
the issue as completed. A bot pull request for the repository can be open, or
closed without a merge. Then the bot comments its link and closes the issue as
not planned. In these cases the bot does not read the repository.

Otherwise, the bot reads the repository in the same way as `pnpm add-plugin`.
If the plugin passes the inclusion bar, the bot opens a pull request in the
same way as for `Discover plugins`. The body of the pull request contains
`Closes #<issue>`. Thus a merge of the pull request closes the issue. The bot
comments the link to the pull request on the issue.

The bot can also find no URL in the issue body, fail to read the repository,
or fail to write the entry. Then it comments the failure name and its message,
and it closes the issue as not planned. A failed read includes a GitHub API
error, such as a rate limit, while the bot reads the repository.

The bot itself can fail. It can fail to read `plugins/`, its own pull
requests, or the default branch, or the push or the pull request can fail.
The first job can also fail and leave no handoff. Then the bot comments the
error and leaves the issue open, and the workflow run fails. If `pnpm propose`
refuses the handoff, the bot does not answer the issue, and the workflow run
fails.

The first job gets the issue body in the `ISSUE_BODY` environment variable.
The second job gets the issue number in `ISSUE_NUMBER`. The workflow runs in the
concurrency group of `Discover plugins`, so the two workflows do not push at
the same time. A concurrency group holds one running run and one pending run.
A newer run cancels the pending run, and the issue of that run gets no
answer.

## Checking entries

To check every entry under `plugins/`, run:

```bash
pnpm check
```

The command prints one line for each problem, with the entry directory and
the rule that failed, then a summary line. If it finds a problem or cannot
load the registry schema, it exits with status 1. To check
the entries in another directory, give its path: `pnpm check <dir>`.

The first run downloads the registry schema into `.cache/`, so that run needs
a network connection. The command refuses a downloaded or cached schema whose
SHA-256 differs from the hash pinned in `src/check/registry-schema.ts`.

## Building the data

To build the data file, run:

```bash
pnpm build
```

The command reads each entry under `plugins/`, then reads each plugin from
GitHub in the same way as `pnpm add-plugin`. It writes one file,
`dist/v1/plugins.json`. The file has a `schemaVersion` of `1`, a
`generatedAt` time, and one record for each entry. Each record keeps the
upstream facts in an `upstream` block and the overrides of the entry, with
their reasons, in an `overrides` block. The schema for the file is
[`schemas/plugins.v1.schema.json`](schemas/plugins.v1.schema.json). If the
GitHub response for the repository says whether it is archived, the
`upstream` block has an `archived` field, `true` or `false`. The `upstream`
block also has a `prerelease` field, `true` or `false`. It says whether
GitHub marks the release that the reader read as a prerelease.

If the read of a plugin fails, its record has no `upstream` block. The
record has a `failure` block with the failure name and a message. If the
read stops with an error that the reader does not name, the failure name is
`unexpected-error`. If the read gives facts that the schema rejects, the
failure name is `facts-invalid`. The command still writes the file.

A build-level failure points at the build, not at the plugin. These
failures are build-level:

- an `unexpected-error`,
- a request that gets no whole response, such as a failed host lookup, a
  network error, or a timeout,
- an HTTP 401 or 403 answer from the GitHub API,
- an HTTP 429 or 5xx answer from any host.

Every other failure, a 404 included, belongs to the plugin. First, the
command prints one line for each failed record. Next, it prints one line
for each failure name, with the number of records that carry it. Then it
prints the number of records with a build-level failure. If a record
carries a build-level failure, the command also prints a `::warning::`
line. GitHub Actions shows this line as a warning on the run. If more than
half of the records carry a build-level failure, the command exits with
status 1. If half of the records or fewer carry one, the command exits with
status 0. That includes a build in which every record fails for a reason of
its own.

The command also writes copies of the two schemas to `dist/schemas/`.

The command writes no data file and exits with status 1 in these cases:

- It finds no entries, or it cannot read the entry directory.
- An entry is not valid, for example a `meta.json` with no `repoUrl`.
- The file it built is not valid against the schema.
- It cannot write the schema copies or the data file.

A data file from an earlier run then stays in place. In the last case, the
schema copies can already be in `dist/schemas/`.

To read the entries in another directory, give its path: `pnpm build <dir>`.
To write the file under another directory, add `--out <dir>`. As with
`pnpm add-plugin`, set `GITHUB_TOKEN` to get a higher GitHub API limit.

## Building the site

To build the site, first run `pnpm build`, then run:

```bash
pnpm site
```

The command reads `dist/v1/plugins.json`. It writes the home page,
`dist/index.html`, and one page for each record, `dist/plugins/<id>/index.html`.
It does not change the data file or the schemas. It replaces the `index.html`
and `plugins/` of an earlier run, so a page for a plugin that the data no
longer lists goes away. Links between the pages, and to the data file, start
with `/zotero-plugin-index/`, the path of the site on GitHub Pages.

To read the data from another directory and write the pages there, add
`--out <dir>`. The command then reads `<dir>/v1/plugins.json`. If it cannot
read or parse the data file, or the file has no `plugins` list, it writes no
page and exits with status 1.

## The daily build

The `Build data` workflow runs `pnpm check`, `pnpm build`, and then
`pnpm site` once a day, and you can also start it by hand. It keeps `dist/` as
a workflow artifact named `plugins-data`. If all three commands succeed, the
workflow deploys `dist/` to GitHub Pages. If `pnpm build` or `pnpm site` exits
with status 1, the workflow deploys nothing, and the site and data from the
last good build stay published. The repository's
`github-pages` environment, set in its GitHub settings, lets only runs on the
`main` branch deploy.

## Running the tests

To run the tests, run:

```bash
pnpm test
```
