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

### D-013: Count user reports from closed report issues, and withhold a deploy when they cannot be read, annotating D-011 and D-012

2026-10-27, M020 and M021 plan. User reports are GitHub issues filed from two
issue forms. At the plan question set the user chose to keep no copy of a
report in the repo. The daily build lists the index repo's closed issues with
the label `report` and counts the ones the bot closed as completed. The user
rejected a bot commit per report, which pushes to the default branch with no
review and no CI. The user also rejected a pull request per report, which
makes every count wait on the maintainer. The user chose to count only reports
on the plugin version the index read, so counts start over when the index
reads a new release. One report counts per GitHub account, plugin, and Zotero
major: the newest. The count follows each issue's current text, so a reporter
who edits a closed report changes it, which gains no more than filing a new
one. A maintainer removes an abusive report with the label `not-counted`.
The counts come only from the issues, so a build that cannot read them
withholds the deploy, whatever the failure, and it reads them before any
plugin read. This annotates D-011 and D-012, which withhold a deploy only for
build-level failures or when every record fails. The cost is that GitHub's
answer when the repo's issues are turned off stops every deploy until the
maintainer turns them back on. The data gains `reports` as an optional field
of schema v1 under D-006 and D-007.

### D-014: The home page carries one language-filter script, superseding D-009

2026-10-27, M023 and M024 plan. At the plan question set the user chose a
language menu on the home list, run by a script, over one static page per
language and over no filter. D-009 recorded that the pages carry no script
after M015 removed the version field. The home page now carries one script.
It shows the menu, hides the rows of other languages, and keeps the choice in
the URL. The menu is hidden in the HTML, so without JavaScript the home page
shows the full list and no menu, and each page still reads without
JavaScript, as D-004 says. The other pages carry no script. The menu's
options and counts are written at build, so the script reads no data file.

### D-015: A read cut by a time limit is build-level, annotating D-011

2026-10-27, M029. `pnpm build` stops a plugin read after 3 minutes and
starts no plugin read after 18 minutes from its start. Thus hosts that do
not answer cannot take the build job past its 30-minute limit, where GitHub
stops the job and nothing is kept or deployed. A read cut by the first limit
fails as `request-failed`, the name that README already gives a request
with no whole response. An entry that the second limit leaves unread fails
as `not-read`. Both count as build-level under D-011, because they point at
the build or a host, not at the plugin. So when more than half of the records
carry a build-level failure, these included, the build deploys nothing, and
the last good data stays.
The cost is that an unread plugin shows no facts on that day's site, since
the build restores no earlier data (D-010).

### D-016: The M029 time limits bound the plugin reads only, narrowing D-015

2026-10-27, M029 review. D-015 says that hosts that do not answer cannot
take the build job past its 30-minute limit. That holds for the plugin
reads alone. The read of the report issues before them has no total limit,
only 60 seconds for each page. A host lookup whose wait the limit ended can
also keep the process open after the build writes its file. Candidate row
"Bound the build's report issue read" holds both gaps. The rest of D-015
stands.

### D-017: Correct D-016's candidate row pointer

2026-10-27, M029 hygiene. D-016 names candidate row "Bound the build's
report issue read" as the home of the two gaps. That row belongs to a group
of rows that carries review findings from two milestones, and the hygiene
rule files new findings for such a group as a new row. So the gaps are in
candidate row "Close gaps in the build time limits", which names the first
row. The rest of D-016 stands.

### D-018: The v1 languages patterns refuse zxx and mul, narrowing schema v1

2026-10-28, M036 plan. The language codes `zxx` ("No linguistic content")
and `mul` ("Multiple languages") name no one interface language that a
visitor can pick. The user chose at the plan question set to refuse them in
`LANGUAGE_TAG`, as it refuses `und`, and so in the reader and in the
`languages` patterns of both v1 schemas. The user rejected refusing them in
the reader alone, which would let an override record them. The narrower
pattern accepts a subset of what v1 accepted, so a consumer that validates
new data against a saved copy of the schema still accepts it. The README's
rule gives a new schema version to a breaking change, and this change does
not break a consumer of the data. A `languages` override can no longer hold
these codes.

### D-019: The home page's one script also runs the version buttons, annotating D-014

2026-10-28, M037 plan. D-014 gave the home page one script, for the language
menu. M037 adds buttons that filter the home list by a declared Zotero major.
They act on the same rows and keep their choice in the address beside the
language, so they join that script rather than add a second one. The home
page still carries one script, and the other pages carry none. The buttons
are hidden in the HTML, so without JavaScript the home page shows every row
and no buttons, as D-014 says for the menu.

### D-020: A branch-name check that cannot run answers the issue, narrowing M011's no-request rule

2026-10-28, M038. M011 made `pnpm propose` refuse a handoff it cannot trust
before any request, so an issue whose handoff is refused gets no answer.
M030 put a time limit on the branch-name check in that path, and a check
that threw then stopped the command with a stack trace, so that issue got
no answer either. At the M038 plan question set the user chose to treat a
branch-name check that cannot run (git does not start, ends with any result
other than exit status 1, or passes its limit) as a failure of the write
step, not a refusal. An issue run comments `unexpected-error` and leaves
the issue open, as it does for a failed push, because a check that cannot
run says nothing about whether the handoff can be trusted. The user kept
the rule that a refused handoff sends no request, and a refusal by any
other check wins over a check that cannot run. The user rejected refusing
quietly, which left the issue unanswered.

### D-021: A missing report label or closed_by key withholds the deploy, annotating D-013

2026-10-28, M041 plan and review. D-013 withholds a deploy when the build
cannot read the report issues. A renamed or deleted `report` label makes
GitHub answer the issue list with no issues, and an issue with no
`closed_by` key cannot be counted, so both gave counts of zero with no
failure. At the plan question set the user chose that the build reads the
label before the list and stops when that read fails. The build also stops
when a listed issue has no `closed_by` key. Each case is a failed read
under D-013. The cost adds to D-013's: a renamed or deleted label, or a
fork that builds the data with issues on but no `report` label, stops
every deploy until the label exists. An issue whose `closed_by` is `null`
still counts as read, so a list that keeps the key and sends `null` on
every issue still gives counts of zero.

### D-022: A GitHub API body that is not JSON and a 403 on a GitHub release URL are build-level, annotating D-011

2026-10-28, M045 plan. D-011 sorts build-level failures by cause and HTTP
status. Two answers that it left with the plugin point at GitHub or the
network instead. A GitHub API answer that succeeds but whose body is not
JSON, such as an HTML error page, comes from GitHub or a host between, since
a plugin cannot shape an API body. An HTTP 403 answer to an XPI or
`update.json` download that requested a GitHub release URL, a `github.com`
URL whose path's third segment is `releases`, comes from GitHub's release
file service. At the plan question set the user chose this work from its
candidate row. The rule looks at the release URL in the redirect chain, not
at the host that answers, because GitHub moved release files from one host
name to another, and a later move would put these 403s back with the
plugin. The cost is that a release file that GitHub refuses for good marks
its record build-level every day: it counts toward the more-than-half bar,
the discover bot keeps no state for that repo and reads it again, and an
"Add a plugin" issue for it stays open. The rest of D-011 stands.

### D-023: Start each listed plugin in Zotero in an isolated CI job, as a start fact only

2026-10-28, M046 and M047 plan. At the plan question set the user chose to
start each listed plugin in a Zotero that GitHub Actions runs, and to show
the result as a start, not as "works". A plugin starts only in the tested
releases that its manifest's range covers, because Zotero refuses to
install it outside that range, so users cannot run it there. The tested
releases are pinned in the workflow with a SHA-256 for each download, and
a maintainer edits the list when Zotero ships a release. The start-test
job holds no token permissions and no secrets, and it restores and saves
no cache (D-010). No artifact holds an XPI. Each job downloads the XPI
from the URL that the build read and checks its SHA-256, so the index
still re-serves no plugin file. The user also allowed CI to download
Zotero from download.zotero.org and to install Ubuntu packages with apt.
No npm package changes. The cost is that plugin code in a start-test job
can rewrite that job's results, its own included, so the data can show a
forged start. The user rejected starting plugins outside their range with
Zotero's compatibility check off, and finding the newest Zotero release at
run time, since Zotero publishes no release list as data and such a
download has no pinned hash to check.

### D-024: The daily build's site and start-test jobs follow D-010, and start results never withhold a deploy, annotating D-010 and D-011

2026-10-28, M047 review. M047 splits `build.yml` into build, start-test,
site, and deploy jobs. The site job now writes the site that Pages
publishes, so D-010's rule moves with it: the build, start-test, and site
jobs each set `cache-mode: none`, and no step sets a `cache` input. The
start-test job runs plugin code, so it sets no cache either. D-011 and
D-012 still decide when the build withholds a deploy. Start tests add no
reason of their own: a failed start-test job, a missing result, or a
results entry that cannot be read drops those results, and the site still
deploys. `pnpm add-start-results` exits 1, and so withholds the deploy, only
when the build's own data or plan cannot be read or the schema rejects the
merged data, the same kind of fault as a failed `pnpm site`. The deploy
job's `if:` names the site job's result, since GitHub skips a job whose
earlier jobs include a failed one unless its `if:` says otherwise. The cost
is that a day whose start tests all fail deploys with no start results.

### D-025: Correct D-024's list of the add-start-results failures that withhold a deploy, superseding that sentence of D-024

2026-10-28, M047 review. D-024 says `pnpm add-start-results` withholds the
deploy only when the build's data or plan cannot be read or the schema
rejects the merged data. The command also exits 1, and so withholds the
deploy, when it cannot list the results directory for a reason other than
its absence, when it cannot write the data file, and when its `--tested`
list is not a list of versions. Each is a fault of the site job's own files
or of the workflow, never a start result, so D-024's rule stands: no start
result withholds a deploy. The site job runs no plugin code, so plugin code
cannot cause these faults.

### D-026: Any page can carry a script that a feature needs, superseding D-019 and the script limits of D-014

2026-10-29, M048 plan. D-014 gave the home page one script, and D-019 kept
that one script for the version buttons and said that the other pages carry
none. At the M048 plan the user rejected those limits: a page can carry a
script where a feature needs one, and a feature can add a second script to
a page. One rule of D-004 stays: each page reads in full without
JavaScript. A part that a script runs is hidden in the HTML or is extra, as
the home page's menu and buttons are, so a page with no JavaScript still
shows every fact. The site still sends no browser framework (D-004).

### D-027: The report issue read stops at 3 minutes and then fails the build, annotating D-013 and D-016

2026-10-29, M050. D-016 records that the build's read of the report issues
had no total limit, only 60 seconds for each page. The read of the `report`
label and every issue page now stops after 3 minutes in all. A read that the
limit cuts is a failed read of the report issues, so under D-013 the build
writes no file, reads no plugin, and deploys nothing. The plan rejected a
page cap: a cap that counts part of the list gives wrong counts, which D-013
forbids, and a cap that fails the build would stop deploys at a list size
that reads in seconds. The read still counts toward the 18 minutes after
which the build starts no plugin read (D-015). The cost is that a list of
report issues too long to read in 3 minutes stops every deploy until it is
shorter or the limit changes. M050 also closes D-016's second gap: the build
exits once its output is written, so a host lookup that a limit cut no longer
holds the process open.

### D-028: The build alternates its plugin read order by UTC day, annotating D-015

2026-10-29, M051. `pnpm build` reads the plugins in id order when the whole
UTC days from 1970-01-01 to `now`, the data file's `generatedAt`, are even,
and in reverse id order when they are odd. The data file, the build-level
list, and the start plan keep id order. Before, the build always read in id
order, so a build that D-015's 18-minute limit cut left the same last
plugins unread each day. The plan chose alternation over a rotation or a
shuffle by date. A build deploys only when at most half of its records are
build-level, so on two consecutive days that both deploy, the forward cut
and the reverse cut leave no entry unread on both days. A rotation or a
shuffle can. The limit: two deployed builds on days of the same parity,
such as two days apart with the build between them withheld, read in the
same order and can leave the same entries unread. The rest of D-015 stands.

### D-029: The data publishes the XPI address, and a plain link to it is not an install button, annotating D-023 and DESIGN's out-of-scope line

2026-10-29, M052. At the plan question set for the site redesign, the user
chose to link each plugin page straight to the author's XPI file, with the
address added to the data as an optional `upstream.xpiUrl` (D-006, D-007).
Before this, the XPI URL that the build read went only into the start plan,
and the reader's comment said it stayed out of the published data (M047).
The data now carries that URL. DESIGN keeps "install buttons" out of scope:
a link to the author's file on GitHub downloads it and installs nothing,
and Zotero installs a plugin only from its own add-ons dialog. The site
shows the link as a plain button beside the source and releases links, not
as a highlighted one, so it does not read as an endorsement. The index
still keeps no copy of a plugin file (D-023). The author can replace a
release file at the same address, so the file a reader downloads later can
differ from the one the build read and the start tests checked. The plan
rejected linking to the latest release page, which can name a newer release
than the one the index read.

### D-030: A description override can give English text for a plugin with none upstream, widening DESIGN's override rule

2026-10-29, M055. DESIGN says an override corrects a fact that the author
cannot or will not fix upstream. At the M055 question set the user chose to
also allow a `description` override that gives English text for a plugin
whose manifest, English locale, and GitHub About text hold no English
description, because the site is in English. Such a text is the index's
own wording drawn from the plugin's README or other upstream file, not a
correction. Its `reason` names that source and says that the upstream has
no English description. It carries no `version`, so it also hides any
English text the author adds later until the override is removed. The plan
rejected leaving those plugins with their Chinese or blank description,
and rejected machine translation, which needs a paid service or a model.

### D-031: D-030 also covers an upstream description that only repeats the name, and annotates DESIGN's override rule and the reason schema text

2026-10-29, M055. A plan re-audit found that D-030's case, no English
description upstream, leaves out plugins whose only English description
repeats the name, which the site hides (M015). D-030 covers those too, and
the `reason` then says that the upstream description only repeats the
name. The no-`version` rule of D-030 is intended: a text drawn by hand
stays until someone removes it. DESIGN's Data sources item 3 and the
`reason` prose of `schemas/index.v1.schema.json` ("Why the upstream value
is wrong") gain this case, since such an override fills a gap rather than
correcting a wrong value. The rest of D-030 stands.

### D-032: D-030 also covers upstream text that is half or more CJK, extending D-030 and D-031

2026-10-29, M055. The claim audit and the AC6 re-audit found that
Jasminum's GitHub About text opens with one short English sentence and
then a Chinese one, so D-030's case, no English description upstream, does
not cover its override. At the implement stop the user chose to keep the
override. A `description` override can now give English text for a plugin
whose manifest description and GitHub About text are each missing, only
repeat the name, or have a CJK share of 0.5 or more, as the site's rule
measures it, even when one of them holds some English. The `reason` says
which of these each text is. The plan's first count of seven such plugins
came before the CJK share counted runs of letters as one unit; that change
added Jasminum. The rest of D-030 and D-031 stands.
