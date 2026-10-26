# Decisions

Append-only. Never renumber; supersede with a new entry. D-entries record
choices with rationale — never deferrals ("not now" is a ROADMAP fact).

### D-001: Node toolchain for the bot, schema, and checks

2026-10-24, M001 plan. The project uses pnpm, TypeScript, Ajv for JSON Schema
checks, Vitest for tests, and fflate to read the zip inside an XPI. GitHub
calls use plain fetch, with no API client library. The user chose this set
at the plan question set over a smaller npm set with node:test and
hand-written checks, because it matches the zotero-plugin-registry tools and
checks JSON Schema directly.

### D-002: Each entry is a registry meta.json plus a sibling index.json

2026-10-24, M001 plan. Each plugin entry is `plugins/<id>/meta.json`, valid
against the zotero-plugin-registry schema, beside `plugins/<id>/index.json`,
which holds the fields only the index uses, such as overrides and their
reasons. The registry schema sets `additionalProperties: false`, so a field
the index adds to `meta.json` makes the entry invalid there. The user chose
the sibling file over one file with the index's own schema, which would give
up registry validity.

### D-003: Add @types/node to the D-001 toolchain

2026-10-24, M001 implement. The project adds `@types/node` as a dev
dependency, so `tsc --noEmit` can type-check code that imports Node's
built-in modules. D-001 did not name it. The user approved it at a chip over
running the code with no type check.

### D-004: Build the plugin site with Astro

2026-10-25, M007 plan. The static site uses the `astro` package, pinned at an
exact version when M007 adds it. Astro writes plain HTML from TypeScript
templates and sends no browser framework by default, so each page reads
without JavaScript and the version check stays one small script. The user
chose a framework at the plan question set over a TypeScript script that
writes HTML with no new package, which gives templates and routing. Any
further package, such as `@astrojs/check`, takes its own approval.

### D-005: Hand the bot's read results to its write job with actions/download-artifact

2026-10-26, M011 plan. The bot workflows read untrusted repos in a job with
read-only permissions and push from a second job, so the second job needs the
first job's output. The write job fetches it with `actions/download-artifact`,
beside the `actions/upload-artifact` that `build.yml` already uses. The user
chose the action at the plan question set over `gh run download` with an
`actions: read` permission, which adds no action but puts more script in the
workflow.

### D-006: List archived repos with an archived fact, added to schema v1 as an optional field

2026-10-26, M013 plan. Bot PR #13 proposed a repo that its owner archived, and
the inclusion bar did not say whether archived repos pass. The user chose at
the plan question set to list them and show "archived" as a fact in the data,
on the plugin page, and on the home list. The user rejected refusing archived
repos like forks, and refusing only new ones. A person who has the plugin
installed still needs its declared range. Inclusion is not a judgment of
quality. Many abandoned plugins are never archived, so a refusal would not
leave a list of maintained plugins. The data gains `archived` as an optional
field of schema v1. An added optional field does not need a new schema
version, because readers that ignore unknown fields keep working.

### D-007: D-006 supersedes M003's rule that a v1 file never changes shape

2026-10-26, M013 review. The M003 review recorded a milestone-local decision:
the v1 schema stays strict (`additionalProperties: false`), and adding a field
means `plugins.v2`. D-006 adds `archived` to v1 without naming that rule, and
its reason covers only readers that ignore unknown fields. The v1 schema stays
strict, so a consumer that validates against a saved copy of it rejects the
new data until it fetches the schema again. The user chose the optional v1
field at the M013 plan question set with that cost stated, so D-006 stands
and replaces the M003 rule. The README and the changelog tell consumers to
fetch the schema again.

### D-008: Read the newest stable release first, superseding M002's prereleases-included rule

2026-10-26, M014 review. M002 shipped a reader that takes the manifest from
the newest release with an `.xpi`, prereleases included. The M002 review left
a candidate row to read stable releases first. At the M014 plan question set
the user chose to read the newest stable release with an `.xpi` first. The
user also chose a fallback over a stable-only rule. If the stable release is
not a Zotero 7+ build (`no-manifest`, `no-zotero-id`, or
`max-version-below-7`), the reader reads the newest later release. A
stable-only rule drops each plugin whose Zotero 7 build exists only as a
prerelease. The data gains an optional `prerelease` field under D-006 and
D-007. For some plugins the change moves the values of existing v1 fields,
such as `version` and `latestReleaseDate`. This is not a breaking change,
because each field still describes the release whose manifest was read, as
the v1 schema says, and the record keeps its shape.

### D-009: The pages carry no script, annotating D-004

2026-10-26, M015 review. D-004 chose Astro partly because "the version check
stays one small script". At the M015 plan question set the user chose version
pills over the typed Zotero version field, so M015 removes the field and its
script. The pages now carry no script. The choice of Astro stands: it still
writes plain HTML from TypeScript templates and sends no browser framework.

### D-010: The deploy build restores no Actions cache

2026-10-26, M016 review. The build job of `build.yml` writes the site and data
that Pages publishes, so it restores no Actions cache: it sets
`cache-mode: none`, and no step sets a `cache` input. The fix sits in the job
that restores, not in the jobs that might write, because the discover read job
reads repos that anyone can tag and must save its state cache, and GitHub lets
its scheduled and dispatched runs save caches in the default branch's scope. A
job that a crafted file took over could save any key there. `ci.yml` keeps its
dependency cache, because it deploys nothing and no check gates a merge. A
later workflow that publishes or writes takes the same rule.

### D-011: Withhold a deploy only for build-level failures, narrowing M006's rule

2026-10-26, M017 review. M006 made `pnpm build` exit 1, so the daily build
deploys nothing, when more than half of the records carry any failure, because
so many failures usually come from the build. That rule also counted failures
that stay for good, such as a fork, a deleted repo, or a release with no XPI,
so an index where most plugins sat in such states would never deploy again.
At the M017 plan question set the user chose to count only build-level
failures, sorted by cause and HTTP status: an unexpected error, a request with
no whole response, a GitHub API 401 or 403, and a 429 or 5xx from any host.
The reader carries the mark beside the failure name, never in the published
data, so the v1 schema (D-006, D-007) stays as it is. The cost is that a reader
or schema regression that fails every record with a named failure, such as
`xpi-unreadable` or `facts-invalid`, now deploys a site with no plugin data.
Candidate row "Withhold deploys when all reads fail" holds the safety net.

### D-012: Also withhold a deploy when every record carries a failure, annotating D-011

2026-10-26, M018 plan. D-011 withholds a deploy only for build-level
failures, so a reader or schema regression that fails every record with a
named failure deploys a site with no plugin data. At the M018 plan question
set the user chose a second bar: `pnpm build` also exits 1 when every record
carries a failure, whatever its name. The build-level bar keeps the rule that
D-011 states. The user declined a bar on a failure share far above the live
data's, because it needs a read of the live data and more code. Thus a
regression that fails most records, but not all, still deploys. The cost is
the one D-011 avoided, in a smaller form: an index where every plugin fails
for good never deploys again.
