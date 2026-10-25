# zotero-plugin-index

A community index of plugins for Zotero 7 and later. The index lists plugins
and links to the releases of each author. It does not host plugin files, and
it does not review or endorse plugins.

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
host:

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
failure name is `facts-invalid`. The command still writes the file and exits
with status 0.

The command writes no file and exits with status 1 in these cases:

- It finds no entries, or it cannot read the entry directory.
- An entry is not valid, for example a `meta.json` with no `repoUrl`.
- The file it built is not valid against the schema.
- It cannot write the file.

A file from an earlier run then stays in place.

To read the entries in another directory, give its path: `pnpm build <dir>`.
To write the file under another directory, add `--out <dir>`. As with
`pnpm add-plugin`, set `GITHUB_TOKEN` to get a higher GitHub API limit.

The `Build data` workflow runs `pnpm check` and then `pnpm build` once a day,
and you can also start it by hand. It keeps `dist/` as a workflow artifact named
`plugins-data`.

## Running the tests

To run the tests, run:

```bash
pnpm test
```
