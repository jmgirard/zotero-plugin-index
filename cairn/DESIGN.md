# Design

_Architecture as it **is**, not as it will be. Future work lives in
`ROADMAP.md`; status lives there too._

## Purpose & Scope

> Elicited by `/design-interview` Phase 1 on 2026-10-24, run on Opus 5.5.
> Design Principles come from Phase 2.

zotero-plugin-index is a community index of Zotero plugins for Zotero 7 and
later. It answers one question for Zotero users first: does this plugin work
on my version of Zotero? Zotero publishes no plugin list. Its support page
says that an official directory is planned.

Audience: Zotero users who look for plugins. Plugin authors benefit, but the
index does not depend on their participation.

Distribution: a public repository with tagged releases (`v<version>`) for the
data format and the tooling. The site deploys from the default branch between
tags.

## Contract boundary

The index lists plugins and links to the releases of each author. It does not
host, mirror, or re-serve plugin files (XPI files). It does not review plugin
code, and it does not endorse plugins.

Each plugin page shows facts that a reader can check. These facts are source
availability, repository age, last release, release count, open issues, and
the host of the `update.json` file. Each page says that the index does not
vet the plugins it lists.

The index runs on GitHub only: GitHub Actions, GitHub Pages, and GitHub
issues. It has no server, no database, and no paid service. Thus every
contributor needs a GitHub account.

The generated JSON data is a public API at a stable URL, with a schema
version. A breaking change gets a new schema version. The old version stays
available for a transition period.

Out of scope: install buttons, mirrors for regions that cannot reach GitHub,
user accounts, and a combined compatibility verdict.

## Data sources and contribution

Four sources feed each plugin entry. The index keeps the sources apart and
shows each one separately.

1. Discovery. A scheduled bot searches GitHub for repositories with the topic
   `zotero-plugin` or `zotero-addon`. In total, 400 and 109 repositories carry
   these topics (observed 2026-10-24). The bot opens a pull request for each
   new candidate. A person can also paste one repository URL into an issue
   form, and the bot drafts the entry. The maintainer approves each pull
   request.
2. Upstream facts. The bot reads the `manifest.json`, the `update.json`, the
   latest release, and the repository metadata of each plugin. These files
   are the source of truth for the name, the description, the versions, and
   the declared compatibility (`strict_min_version`, `strict_max_version`).
3. Overrides. An override in the index corrects a fact that the author cannot
   or will not fix upstream. Each override states its reason.
4. User reports. Each plugin page has a "Works" link and a "Broken" link. Each
   link opens a GitHub issue form with the plugin and its version filled in.
   The reporter adds the Zotero version and submits the form. A bot adds the
   report to the data and closes the issue.

Inclusion bar: a public repository, a Zotero 7+ manifest, and at least one
release with a readable `update.json`. The bot checks all three. The
maintainer removes only spam and forks. Inclusion is not a judgment of
quality. The index does not list plugins for Zotero 5 or 6.

If the declared compatibility and the user reports disagree, the page shows
both. For example, "Declares 7.0 to 8.*" appears beside "Reports on 8.x:
2 works, 3 broken".

An author can open an issue to be delisted or to correct a fact, and the
index honors both requests. An author cannot remove user reports. The
exception is a report that is abuse.

## Function Families

- Entry checks (`src/check/`): `pnpm check [dir]` checks each entry
  directory under `plugins/`, or under `dir`, and prints one line for each
  problem. Added M001.
- Upstream reader (`src/upstream/`): `readUpstream(repoUrl, fetch)` returns
  the facts of one GitHub repo, or one named inclusion-bar failure. Added
  M002.
- Entry drafting (`src/add-plugin/`): `pnpm add-plugin <github-url> [--out
  <dir>]` writes a new entry from the reader's facts. Added M002.

## Conventions

- Numeric results are not held to the two-independent-sources check of the
  validation doctrine. Chosen at init, 2026-10-24.
- The bot, the data schema, and the static site use TypeScript. Plugin
  authors write TypeScript, and zotero-plugin-registry uses it.
- Each `meta.json` stays a valid entry for zotero-plugin-registry. The
  registry schema rejects fields it does not define, so the fields that the
  index adds go in a sibling `index.json` (D-002; corrected M001).

## Design Principles

_None yet. Phase 2 of `/design-interview` sets them. The Inviolable (IP<n>)
block comes first, then the Guiding (GP<n>) block. Numbers are never
reused._

### Banked candidates (Phase 1 ledger, removed at Phase 2 write-out)

- Contributors never type a fact that the bot can read. Source: answers on
  adding plugins and on corrections.
- The index never hosts or re-serves plugin code. Source: scope answer.
- Everything runs on GitHub, with no server. Source: infrastructure answer.
- Each page answers "does it work on my Zotero?" first. Source: audience.
- One compatibility report costs one click and one typed field. Source:
  reports answer.
- Each entry stays a valid zotero-plugin-registry `meta.json`. Source: the
  registry answer.
- Each source shows separately, with no combined verdict. Source: conflicts.
- The index states facts and does not endorse. Source: trust answer.
- The pipeline runs unattended when the maintainer is away. Source: warts.
- Upstream files are the source of truth, and each override has a reason.
  Source: corrections answer.
- The published data is a versioned public API. Source: data API answer.

## Architecture

- A pnpm project in TypeScript. Node runs the `.ts` files through its
  built-in type stripping, and `pnpm test` runs `tsc --noEmit`, then Vitest.
- Entries live in `plugins/<id>/` as `meta.json` and `index.json` (D-002).
  `schemas/index.v1.schema.json` is the `index.json` schema.
- `src/check/` holds the checker. It reads the registry schema from
  zotero-plugin-registry at a pinned commit, checks the file against a pinned
  SHA-256, and caches it in the gitignored `.cache/`.
- `src/upstream/` reads the GitHub API with plain fetch, unzips the release
  XPI with fflate, and reads the `update.json` that the manifest names. The
  caller passes the fetch function, so the tests answer from recorded
  responses in `test/fixtures/upstream/`.
- `.github/workflows/ci.yml` runs `pnpm test` and `pnpm check` on every push
  and pull request.

## Known issues

- Plugin metadata is inconsistent. Some plugins lack an `update.json` or have
  a wrong one, use version strings that are not semver, declare ranges that
  are too loose or too strict, or have no releases. One bad plugin must not
  stop the run for all others. Expected at design time, 2026-10-24.
- GitHub API rate limits apply to a daily job that reads hundreds of
  repositories. Topic search also misses plugins without a topic. Expected at
  design time, 2026-10-24.
- One person maintains the index. Approvals and disputes wait for that
  person. Expected at design time, 2026-10-24.
