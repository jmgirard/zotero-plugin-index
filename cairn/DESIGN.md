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

Each plugin page shows facts that a reader can check. These facts are the
declared range of Zotero versions, source availability, whether GitHub marks
the repository archived (when GitHub's response says), repository age, the
release the index read and whether it is a prerelease (corrected M014),
release count, open issues, and the host of the `update.json` file.
The page shows the name, the description, the version pills, the declared
range, and the repository and releases links first. The other facts sit in a
closed "Details" section (M015). The home list marks an
archived plugin with "(archived)" after its name, and the data carries the
same `archived` fact (M013).
The Details section also shows each override beside the upstream value it
corrects (M007, M015). Each page says that the index does not vet the plugins
it lists.

The home list and each plugin page show one pill for each Zotero major
version in `ZOTERO_MAJORS` (7 to 10). A pill states how much of that major the
declared range covers, counting Zotero N as N.0 to N.9: all, part, or none.
The pills show only the declared range, so they are not a combined verdict.
The site shows the manifest description unless it is blank or only repeats
the plugin's name; a `description` override that applies to the version the
index read always shows (M015). An archived plugin's page also shows
"(archived)" after its name, outside the Details section (M015 review).

The index runs on GitHub only: GitHub Actions, GitHub Pages, and GitHub
issues. It has no server, no database, and no paid service. Thus every
contributor needs a GitHub account.

The generated JSON data is a public API at a stable URL, with a schema
version. A breaking change gets a new schema version. The old version stays
available for a transition period. A new optional field is not a breaking
change, and it stays in the current version (D-006, D-007). The v1 schema
rejects fields it does not define, so a consumer that validates against a
saved copy must fetch the schema again after such a change. The URL is
`https://jmgirard.github.io/zotero-plugin-index/v1/plugins.json`, and the
schemas are under `https://jmgirard.github.io/zotero-plugin-index/schemas/`,
each schema's `$id` being its own URL (M006).

Out of scope: install buttons, mirrors for regions that cannot reach GitHub,
user accounts, and a combined compatibility verdict.

## Data sources and contribution

Four sources feed each plugin entry. The index keeps the sources apart and
shows each one separately.

1. Discovery. A scheduled bot searches GitHub for repositories with the topic
   `zotero-plugin` or `zotero-addon`. In total, 400 and 109 repositories carry
   these topics (observed 2026-10-24). The bot opens a pull request for each
   new candidate that passes the inclusion bar, at most 5 a run, with the
   result of `pnpm check` on the entry in its body. A bot pull request closed
   without a merge keeps the bot from proposing that owner/repo name again
   (M009). A person can also paste one repository URL into an issue
   form, and the bot drafts the entry. The maintainer approves each pull
   request.
2. Upstream facts. The bot reads the repository metadata, the releases, the
   `manifest.json` in the newest stable release that has an `.xpi` file,
   and the `update.json` that the manifest names (corrected M002, M014). A
   stable release is one that GitHub does not mark as a prerelease. If no
   stable release has an `.xpi` file, the bot reads the newest release that
   has one. If the stable release is not a Zotero 7+ build (`no-manifest`,
   `no-zotero-id`, or `max-version-below-7`), the bot reads the newest later
   release instead, when one has an `.xpi` file. The data's `prerelease`
   fact says whether the release read is a prerelease. These files
   are the source of truth for the name, the description, the versions, and
   the declared compatibility (`strict_min_version`, `strict_max_version`).
3. Overrides. An override in the index corrects a fact that the author cannot
   or will not fix upstream. Each override states its reason.
4. User reports (not built yet; the candidate "Collect works and broken user
   reports" holds them, corrected M007). Each plugin page is to have a
   "Works" link and a "Broken" link. Each link opens a GitHub issue form with
   the plugin and its version filled in. The reporter adds the Zotero version
   and submits the form. A bot adds the report to the data and closes the
   issue.

Inclusion bar: a public repository, a Zotero 7+ manifest, and at least one
release with a readable `update.json`. The bot checks all three, and it
refuses forks (corrected M002). An archived repository passes the bar, and
the index shows that it is archived (D-006, M013). The maintainer removes
spam. Inclusion is not a judgment of
quality. The index does not list plugins for Zotero 5 or 6.

Once user reports exist, a page whose declared compatibility and user reports
disagree shows both (corrected M007). For example, "Declares 7.0 to 8.*" appears beside "Reports on 8.x:
2 works, 3 broken".

An author can open an issue to be delisted or to correct a fact, and the
index honors both requests. An author cannot remove user reports. The
exception is a report that is abuse.

## Function Families

- Entry checks (`src/check/`): `pnpm check [dir]` checks each entry
  directory under `plugins/`, or under `dir`, and prints one line for each
  problem. Added M001.
- Upstream reader (`src/upstream/`): `readUpstream(repoUrl, fetch, {
  lookup })` returns the facts of one GitHub repo, or one named
  inclusion-bar failure. The optional `lookup` resolves download hosts for
  the host check (M004). Added M002. `githubClient(fetch)` makes its GitHub
  API requests and refuses a URL on another host, so the token goes to the
  API only (exported M008).
- Entry drafting (`src/add-plugin/`): `pnpm add-plugin <github-url> [--out
  <dir>]` writes a new entry from the reader's facts. Added M002.
- Discovery (`src/discover/`): `pnpm discover [--out <dir> | --handoff
  <dir>] [--state <file>] [--limit <n>] [--budget <n>]` searches the
  `zotero-plugin` and `zotero-addon` topics, reads each repo that no entry
  names, and writes the entries of up to `limit` repos (5 by default) that
  pass the inclusion bar. It prints a JSON report of what it wrote, refused,
  and skipped. Added M008. With `--handoff <dir>`, it also skips the repos of
  the bot pull requests and writes the entries and a `plan.json` into a
  handoff for `pnpm propose` (M011). `pnpm discover-issue --handoff <dir>`
  reads the "Add a plugin" form's repo URL from `ISSUE_BODY` and writes its
  outcome into a handoff (M010, M011). `pnpm propose <dir> [--limit <n>]`
  checks a handoff, then opens one pull request for each entry, or, with
  `ISSUE_NUMBER` set, answers the issue: a pull request, or a comment with
  the reason and a close (M009, M010, M011).
- Data build (`src/build/`): `pnpm build [<dir>] [--out <dir>]` writes
  `dist/v1/plugins.json`, one record per entry, with a failed upstream read
  kept in that entry's record, and copies the two schemas to `dist/schemas/`.
  It exits 1 when more than half of the records carry a build-level failure,
  as README "Building the data" defines it, and prints a summary of failure
  names and a `::warning::` line for build-level failures. Added M003;
  schemas and exit rule M006; build-level rule and summary M017.
- Site build (`src/site/`, `site/`): `pnpm site [--out <dir>]` writes the
  home page and one page per record into `dist/`, or `<dir>`, from the data
  file there. `src/site/version.ts` holds the version and range functions
  that the templates use, `majorSupport` and `ZOTERO_MAJORS` among them, and
  `src/site/description.ts` holds `shownDescription`. Added M007; pills and
  descriptions M015.

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
- `src/upstream/` reads the GitHub API with plain fetch (its client's `post`
  also creates the bot's pull requests, M009, and comments on issues, and its
  `patch` closes issues, M010), unzips the release
  XPI with fflate, and reads the `update.json` that the manifest names. The
  caller passes the fetch function, so the tests answer from recorded
  responses in `test/fixtures/upstream/` and `test/fixtures/build/`, and
  the discovery tests from `test/fixtures/discover/` and the repos that
  `test/support/plugin-repo.ts` builds (M008).
  The reader copies the repo response's `archived` value into its facts only
  when it is a boolean (M013).
  The reader caps the XPI at 50 MiB, each unzipped file at 1 MiB, and the
  `update.json` at 1 MiB. `src/upstream/host-guard.ts` refuses a download
  host in a loopback, private, or reserved range, by its literal address or
  by each address that DNS returns. The reader follows download redirects
  itself, at most 5, and checks each one (M004). If an XPI's zip claims
  more entries than its length can hold, at 46 bytes for each entry, the
  read fails with `xpi-unreadable`. If the zip has more than one entry named
  `manifest.json`, or more than one named the default locale's
  `messages.json`, the read also fails with `xpi-unreadable`. fflate's
  `unzipSync` loops over the claimed count and unzips each matching entry,
  so without these checks either zip held the build's CPU (M005, corrected
  M012).
  The reader finds each file from the central directory, read as `unzipSync`
  reads it, and loops over the claimed count. It inflates a deflated file
  with fflate's streaming `Inflate`, 16 KiB of input at a time. It fails with
  `xpi-unreadable` once the output passes the unzipped size that the zip
  declares, because `unzipSync` decodes the whole stream however far it runs
  past that size (M012).
- `src/discover/` pages through GitHub's repository search for each topic
  with the reader's GitHub client, which `src/upstream/reader.ts` exports.
  The search is sorted by last update, so pages do not shift between
  requests. It joins
  the two result lists by lowercase owner/repo and reads the newest pushed
  repos first, at most `budget` (100 by default) per run. It leaves out
  each repo whose owner/repo, ignoring case, an entry's `repoUrl` names,
  and it refuses a plugin id that an entry directory already has. A state
  file, `.cache/discovery-state.json` by default, keeps each refused repo's
  `pushed_at` and failure, and only for repos that the search found and
  the index lacks. A later run reads that repo again when its `pushed_at`
  changed or the record is 30 days old. A `github-http-error`,
  `request-failed`, or `unexpected-error` result is not kept, nor a write
  refused by the output directory (`entry-exists` there, `write-failed`).
  A failed search ends the run before any read and leaves the state file as
  it was. The report names, for each entry written, its version and declared
  range (M008).
- Each bot workflow runs in two jobs (M011). The read job has only read
  permissions and a checkout with `persist-credentials: false`. It reads the
  repos that anyone can name and leaves a handoff as an artifact:
  `plan.json` and `entries/<id>/` (`src/discover/handoff.ts`). The write job
  holds the write permissions, runs only `pnpm install` and `pnpm propose`,
  and reads no plugin repo. Neither job uses the dependency cache.
  `readHandoff` treats the handoff as untrusted: it checks `plan.json`
  against a schema with Ajv, each id against the Mozilla add-on id format,
  each repo as a lowercase owner/repo whose `discover/` branch
  `git check-ref-format` accepts and whose URL is its GitHub URL, the entry
  count against the limit, and each entry directory for exactly the regular
  files `meta.json` and `index.json`. Any failure refuses the whole handoff
  before a request. So that one plugin cannot refuse a run's handoff,
  `draftEntry` runs the same entry and file checks (`plannedProblem`) after
  it writes an entry, and refuses a failing one as `not-proposable`, a
  recorded failure; a check that throws, such as git failing to start, is
  `unexpected-error`, not recorded. Discovery plans a written entry under the
  name GitHub gives, which the check read. An issue's repo whose name has a
  shape the handoff refuses is never `known`. The read step cuts each issue
  message to 2,001 characters. Each read job outputs its upload's
  `artifact-id`, and the write side downloads only when this attempt
  uploaded one. The issue number comes from `ISSUE_NUMBER`, never from
  the handoff. The write step reads the bot pull requests again, and the
  index in its own checkout, which is the commit the read job saw, and skips
  an entry that either has. `propose` gives `git fetch` and
  `git push` the token as an `http.https://github.com/.extraheader` through
  `GIT_CONFIG_COUNT`, and `pnpmCheck` runs the check without `GITHUB_TOKEN`.
- `src/discover/propose.ts` holds both steps of a discover run. The read step,
  `discoverRead`, first lists the index repo's pull requests (`state=all`,
  every page) and puts in the skip set each repo whose
  `discover/<owner>/<repo>` pull request from the index repo itself is open
  or closed without a merge. A merged one's entry is in the index. The write
  step, `proposeHandoff`, runs `propose`: for each entry, it runs `pnpm check`
  on a temporary directory that holds only that entry. Then it builds one
  commit on top of the default branch with a temporary git index file,
  `commit-tree`, and the `github-actions[bot]` identity, force-pushes it to
  the branch, and sends one create-pull-request request whose body carries
  the check's status and output. The checkout's branch and working tree do
  not change. A failure for one entry is reported, and the run goes on and
  exits 1 at the end. Both steps read the files of each open bot pull request
  (`botPulls`): discovery refuses, without recording, a repo whose plugin id
  one of them adds, and the write step skips such an entry. `githubClient` gains `post`, which fails on a redirect, and
  M010 adds `patch`, which shares that code.
  `.github/workflows/discover.yml` runs it daily and on dispatch on the
  default branch only, with a `limit` input, in the `discover` concurrency
  group. Its write job holds `contents: write` and `pull-requests: write`.
  The read job restores the state file from the newest cache by prefix and
  saves it under a key with the run id, after a failed run too. Pull requests opened with the built-in token start no CI run, so
  the body carries the check result (M009).
- `.github/ISSUE_TEMPLATE/add-plugin.yml` is a form with one required input,
  `Repository URL`, that adds the label `add-plugin`.
  `.github/workflows/add-plugin-issue.yml` runs on `issues: opened` when that
  label is set, in the `discover` concurrency group, with the issue body
  passed only through `env:`. Its write job holds `contents`,
  `pull-requests`, and `issues` write, and it also runs when the read job
  failed, not when it was skipped; its download step may fail. In
  `src/discover/issue.ts`, `issueRead` parses the body and checks the entries
  and the bot pull requests by repo name before and after the read.
  `issueAnswer` checks them again by repo and id, and opens the pull request
  through the same propose step, with `Closes #<issue>` in its body (M010,
  M011).
- `.github/workflows/ci.yml` runs `pnpm test` and `pnpm check` on every push
  and pull request, except those the built-in token makes, such as the
  discovery bot's (M009).
- `src/build/` reads the entries, runs the upstream reader on each plugin in
  turn, and checks each record and then the whole output against
  `schemas/plugins.v1.schema.json` before it writes the file.
  `.github/workflows/build.yml` runs `pnpm check`, then the build, then
  `pnpm site` (M007), daily and on manual dispatch, and keeps `dist/` as a
  workflow artifact (M003). The build also copies both schemas to `dist/schemas/`, and it exits 1 after it
  writes the file when more than half of the records carry a build-level
  failure, as README "Building the data" defines it (M017). The reader
  marks a failure build-level beside its name, and `buildData` returns the
  marked ids outside the data, so the published file keeps its shape
  (D-011). The workflow then uploads `dist/` as the Pages artifact, and a deploy job that
  needs the build job publishes it. A failed build deploys nothing, and the
  `github-pages` environment takes deploys from `main` only (M006).
  The build job of `build.yml` restores no Actions cache: the job sets
  `cache-mode: none`, which GitHub enforces with the job's cache token, and no
  step sets a `cache` input (D-010). Scheduled and dispatched runs of the
  discover read job can save caches in the default branch's scope, while
  `issues` runs get read-only cache access. `test/workflows.test.ts` fails on a
  `cache` key or an `actions/cache` step in `build.yml`, or on a build job
  without `cache-mode: none`; `ci.yml` keeps `cache: pnpm` (M016).
- `site/` is an Astro project (D-004), and `src/site/` builds it. `pnpm site`
  reads `<out>/v1/plugins.json`, builds into a temporary directory, because
  Astro empties its output directory, and copies the pages into `<out>` beside
  the data. `src/site/version.ts` orders versions by Mozilla's legacy version
  format (`cairn/references/mozilla-toolkit-version.md`), finds a record's
  declared range with overrides applied, and, in `majorSupport`, how much of
  one Zotero major that range covers. The tests and the templates (through
  `site/src/data.ts` and `site/src/components/Support.astro`) import it. The
  pages carry no script (M015). The templates take the Pages path
  from `site/src/base.ts`, because a `BASE_URL` environment variable replaces
  Astro's `import.meta.env.BASE_URL`. `build.yml` runs `pnpm site` after the
  build, so a failed site build also deploys nothing. `tsconfig.json` includes
  `site/`, so `pnpm test` type-checks its `.ts` files; the `.astro` templates
  are compiled by Astro without a type check (M007). A plugin page shows the
  "Archived on GitHub" fact only for a record whose `archived` is a boolean,
  and the home list's `data-archived` marker only for `archived: true` (M013).
  All styles are global in `site/src/layouts/Base.astro`, with a
  `prefers-color-scheme: dark` block, so Astro adds no scoped attributes to
  the markup the site tests match (M015).

## Known issues

- Plugin metadata is inconsistent. Some plugins lack an `update.json` or have
  a wrong one, use version strings that are not semver, declare ranges that
  are too loose or too strict, or have no releases. One bad plugin must not
  stop the run for all others. Expected at design time, 2026-10-24. The build
  keeps a failed read, or facts the schema rejects, in that plugin's record;
  an invalid entry in the repo still stops the build (M003).
- GitHub API rate limits apply to a daily job that reads hundreds of
  repositories. Topic search also misses plugins without a topic. Expected at
  design time, 2026-10-24. The reader sends `GITHUB_TOKEN` when it is set,
  which raises the limit (M002).
- The host check looks up a download host before the request, and fetch
  looks it up again when it connects. A DNS server that answers differently
  the second time (DNS rebinding) can still reach a private address. The
  plugin author picks the `update.json` host, and from that file the reader
  publishes only whether it lists the plugin id. The XPI comes from GitHub's
  download URL. Recorded at M004, 2026-10-25. The candidate "Check addresses
  when the reader connects" holds the fix.
- One person maintains the index. Approvals and disputes wait for that
  person. Expected at design time, 2026-10-24.
