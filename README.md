# zotero-plugin-index

A community index of plugins for Zotero 7 and later. The index lists plugins
and links to the releases of each author. It does not host plugin files, and
it does not review or endorse plugins.

## The site

The index has a website at <https://jmgirard.github.io/zotero-plugin-index/>.
The home page lists every plugin with the range of Zotero versions that the
plugin declares. Each plugin has its own page. The page shows the declared
range first, then facts about the repository and its releases, then the
overrides of the index for that plugin.

To compare your Zotero version with each declared range, enter it in the
"Your Zotero version" field at the top of any page. Your browser keeps the
value in its local storage, so the other pages show it too. Each plugin then
shows whether your version is inside its declared range, older than its
minimum, or newer than its maximum. The declared range uses the overrides
that apply to the plugin version that the index read. The site does not say
whether a plugin works. It shows only what the plugin declares.

## Using the data

The index publishes its data file on GitHub Pages:

- Data: <https://jmgirard.github.io/zotero-plugin-index/v1/plugins.json>
- Schema for the data file:
  <https://jmgirard.github.io/zotero-plugin-index/schemas/plugins.v1.schema.json>
- Schema for `index.json`:
  <https://jmgirard.github.io/zotero-plugin-index/schemas/index.v1.schema.json>

A daily build updates the data. If more than half of the records carry a
failure, the build deploys nothing, and the data from the last good build
stays in place. "Building the data" below describes the file. A breaking
change to the file gets a new schema version under a new path, such as `v2/`.

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

The command reads the repository, its releases, the `manifest.json` in the
newest release that has an `.xpi` file, and the `update.json` that the
manifest names. Then it writes `plugins/<id>/meta.json` and
`plugins/<id>/index.json`. To write the entry in another directory, add
`--out <dir>`. The command does not replace an entry that already exists.

If the plugin does not meet the inclusion bar, or the command cannot read one
of these files, the command writes no file. It prints the name of the failure
and a message, then exits with status 1. Two failure names are `fork` and
`no-xpi-release`. The `Failure` type in `src/upstream/reader.ts` lists each
failure name for reading a plugin. The `WriteResult` type in
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
[`schemas/plugins.v1.schema.json`](schemas/plugins.v1.schema.json).

If the read of a plugin fails, its record has no `upstream` block. The
record has a `failure` block with the failure name and a message. If the
read stops with an error that the reader does not name, the failure name is
`unexpected-error`. If the read gives facts that the schema rejects, the
failure name is `facts-invalid`. The command still writes the file. If half
of the records or fewer have a `failure` block, it exits with status 0. If
more than half have one, the command prints how many and exits with status 1.
So many failures usually come from the build, for example a bad token or a
GitHub outage.

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
longer lists goes away. Links in the pages start with `/zotero-plugin-index/`,
the path of the site on GitHub Pages. The command turns off the telemetry of
Astro, the site builder.

To read the data from another directory and write the pages there, add
`--out <dir>`. The command then reads `<dir>/v1/plugins.json`. If it cannot
read or parse the data file, it writes no page and exits with status 1.

## The daily workflow

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
