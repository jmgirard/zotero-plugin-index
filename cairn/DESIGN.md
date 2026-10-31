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
the repository archived (when GitHub's response says), for a repo URL of
the form `https://github.com/<owner>/<repo>` the repository's owner and
name and its GitHub star count (M061), repository age, the
release the index read and whether it is a prerelease (corrected M014),
release count, open issues, the host of the `update.json` file, the
counted user reports on the release the index read (M021), the
languages of the plugin's menus and settings (M024), and whether the
release the index read starts in each tested Zotero release that its
manifest's range covers, shown as a start and never as "works" (D-023,
M047). For each start it runs, a CI job downloads the XPI from the URL the
build read and checks its SHA-256, and no artifact holds an XPI, so the
index still re-serves no plugin file. Since M059 the build reuses a
deployed `started` result for an unchanged XPI (D-035).
The data also carries the interface languages that the read XPI's locale
folders name (M023), keeping a tag only when its files hold at least one
message, judged by file type (M027), and at least half as many messages as
the fullest tag (M034), or when one of its files is a file the reader does
not count. They say which languages a plugin ships menu and
settings text for. A listed language can still be incomplete, since a tag
with half the fullest tag's messages stays. They do not say the language
of the description, which comes from the manifest, the GitHub About text,
or an override (M055). A `languages` override records them for a plugin
whose list is wrong or empty. Each plugin page shows them by name in the
"Menus and settings in" fact of its Details card (M054). When no language
is left, the fact reads "Unknown (no translations found)" (M036). The home
page lists the plugins in one table, sorted by display name with
`localeCompare` at base sensitivity and then by id (M053). Its script shows
the rows the filters pass 50 at a time, with a pager below the table, and
keeps the page after 1 in `?page=`; Previous and Next add a history entry
with `pushState`, the filters still replace the address, and a filter event
goes back to page 1 (M058). Without JavaScript every row shows. A classic
script before the table runs before the rows parse. In a browser that runs
module scripts, it adds a style that `prePaintStyle` writes from the
address. The style hides the rows outside the asked page of the rows that
`?language=`, `?zotero=`, and `?category=` pass (M066). So in a browser that reads
`:nth-child(… of S)`, no row that the script hides paints while the page
loads (see Known issues). A value that the script drops, or a page past the
last one, also hides rows that the script then shows. For an address with
a non-blank `?q=`, it hides every row until the script runs. The script
removes the style after its first pass, and the classic script removes it
on any error the window reports, such as a module script that throws or
cannot parse (M060). The home page's "Menus and
settings in" menu filters the table by language subtag,
run by the home page's script (D-014, D-026, M024, M033). The menu lists the
languages with the most plugins first, and languages with the same number
of plugins in code-unit order of their English names (M035). The home
page's "Declares Zotero" buttons, "Any" and one per major of
`ZOTERO_MAJORS`, filter the table to the plugins whose mark for the pressed
major is all or part, one major at a time, together with the language menu; the
same script runs them and keeps the choice in `?zotero=` (D-019, M037).
A search box filters the table to the rows whose name or description holds
the query, both lowercased, and keeps it in `?q=` (M053). A "Category" menu
after it filters the table to one category and keeps it in `?category=`
(M066). Its options are the categories that at least one row has, as "Name
(N)", most rows first and ties in `CATEGORIES` order. A category is the
index's own grouping, not a checkable fact (D-037): `categories` in
`src/site/categories.ts` assigns each of the 13 categories whose pattern
matches the display name, the shown description, or the manifest or GitHub
description, plus each whose `include` list holds the id, less each whose
`exclude` list holds it. The data file carries no categories. The same script
writes a plugin count beside the filters: the total, how many plugins the
filters pass on every page while a filter is on, or that none match (M044,
M053, M058). Typing writes `?q=`
once the visitor stops for half a second (M053 review). A top bar on every
page links to the home page, the About page (M054), the "Add a plugin"
issue form, and the data file (M053).
A plugin page has one column (M054). It opens with an "All plugins" link
home, the name with an "Archived" badge for an archived repository, a
repo line, the description, and links with icons. For a repo URL of the
form `https://github.com/<owner>/<repo>` (`githubRepo`), the repo line
reads "By <owner> · <repo>": the owner links to the owner's GitHub page
and the repo name to the repository (M061, M065). It adds the
`upstream.stars` count when the data has one (M061). The count shows as a
star icon filled with `--star` and the number, in an `aria-hidden` span
whose `title` gives the count and its words (`starsText`); a
`.visually-hidden` span after it gives the same words to screen readers,
as M054 does for the declared marks (M064). After the description, a page
whose record has a category shows "Index categories", a link to the About
page's Categories section, and each category's name as a link to the home
page filtered by it, in `CATEGORIES` order (M066). The links are: the
`.xpi` file (`upstream.xpiUrl`, only when it passes `safeHref`, in the
same plain button style as the others, D-029), the source, and the
releases; a repo URL that fails `safeHref` shows as plain text. A
"Zotero compatibility" card follows. For a read record it names the
version read and holds one table row per major,
newest first, for `ZOTERO_MAJORS` and each other major that the record's
reports or start results name. The row's cells are the declared support,
the major's newest start result (`majorStart`, M053), and that major's
report counts (M021). Under the table comes one line with the declared
range, when there is one, and the link to the About page, then the "Works"
and "Broken" buttons after a line naming the version read. For a record with a failure the card holds the
failure and the About line. An open "Details" card (h2) lists the plugin
id, the repository and release facts, and the "Menus and settings in"
fact (M024, M033), with each override beside the upstream value it
corrects under an h3 (M007, M015, M054). The About page
(`site/src/pages/about.astro`) holds the method notes: the declared range
and its marks, the start test, which reports count, and how overrides and
the Used column work (M054), and the categories, each with its `about`
text (M066). The home table marks an archived plugin with
"Archived" after its name (M053), and the data carries the same `archived`
fact (M013). Each page says that the index does not vet the plugins it
lists.

Each plugin page's table shows one row, and the home table one declared
mark, for each Zotero major version in `ZOTERO_MAJORS` (7 to 10). A
declared cell or mark states how much of that major the declared range
covers, counting Zotero N as N.0 to the newest release of N: all, part, or
none. The newest release is the data's `zoteroRelease` for its major, else
the `LAST_RELEASES` entry in `src/site/version.ts`, else N.9; a range that
starts after it covers none (M062, D-036). The About page names each one.
The plugin page's table keeps the declared range, the start result, and
the reports in separate columns with no summary column, so it is not a
combined verdict (M054). A home table cell
shows the major's newest start-test result as a second mark in its own
element, and a legend under the table names each mark and says that a
declared range is not a test result (M053). The home table also shows the
language subtags in list order (the first 2 and "+N" past 3), the month of
the release read, and source and `.xpi` links that pass `safeHref` (M053).
The month is the UTC year and month as `YYYY-MM`, and its `<time datetime>`
holds the same text (M063).
A manifest `__MSG_` name or description takes its message from
`_locales/en/`, `en_US/`, or `en_GB/` before the default locale (M055).
The data also carries the GitHub repo's About text as `repoDescription`.
A `description` override that applies comes before every step below.
Without one, a manifest or GitHub description with a CJK share of 0.5 or
more first gives way to its Latin-script part, when that part exists and
does not only repeat the name: the pieces cut at ` / ` and after `。` whose
letters are all Latin and that hold at least three words, joined with one
space (M067, D-038).
The site drops a manifest or GitHub description that is blank or only
repeats the plugin's name (M015). It shows the manifest one when it is left
and its CJK share is below 0.5, else the GitHub one when it is left and the
manifest one was dropped or has a higher share, else the manifest one when
it is left; the share counts each Han,
kana, or Hangul character and each run of other letters as one unit
(M055). A `description` override that applies to the version the index
read always shows (M015). The plugin page's Details card shows both
descriptions (M055).

The index runs on GitHub only: GitHub Actions, GitHub Pages, and GitHub
issues. It has no server, no database, and no paid service. Thus every
contributor needs a GitHub account.

The generated JSON data is a public API at a stable URL, with a schema
version. A breaking change gets a new schema version. The old version stays
available for a transition period. A new optional field is not a breaking
change, and it stays in the current version (D-006, D-007). A narrower
pattern that the published data already meets is not a breaking change
either, and it stays in the current version (D-018). The v1 schema
rejects fields it does not define, so a consumer that validates against a
saved copy must fetch the schema again after such a change. The URL is
`https://jmgirard.github.io/zotero-plugin-index/v1/plugins.json`, and the
schemas are under `https://jmgirard.github.io/zotero-plugin-index/schemas/`,
each schema's `$id` being its own URL (M006). Each record that has
`upstream` carries the report counts in the optional `reports` field. The
daily build counts them from its read of the index repo's closed report
issues, and a build that cannot read those issues or their `report` label,
or that finds a listed issue with no `closed_by` key, deploys nothing
(D-013, M021, D-021, M041).

Out of scope: install buttons, mirrors for regions that cannot reach GitHub,
user accounts, and a combined compatibility verdict. A plain link to the
author's own `.xpi` file (the data's `xpiUrl`, M052) is not an install
button: it downloads the file and installs nothing (D-029).

## Data sources and contribution

Five sources feed each plugin entry. The index keeps the sources apart and
shows each one separately. A combined verdict is out of scope.

1. Discovery. A scheduled bot searches GitHub for repositories with the topic
   `zotero-plugin` or `zotero-addon`. In total, 400 and 109 repositories carry
   these topics (observed 2026-10-24). The bot also reads the repos that
   the zotero-chinese plugin catalog lists, which its maintainers keep by
   hand (M070, D-042). A failed read of the catalog, or of a repo's current
   name and last push, warns, and the run reads the other repos. The bot
   opens a pull request for each
   new candidate that passes the inclusion bar, at most 5 a run, with the
   result of `pnpm check` on the entry in its body. A bot pull request closed
   without a merge keeps the bot from proposing that owner/repo name again
   (M009). A person can also paste one repository URL into an issue
   form, and the bot drafts the entry. A daily sweep answers such an issue
   that no run answered, up to 3 a run (M040). Each bot pull request body
   has a Hold line (M056, D-033). The bot holds a pull request for the
   maintainer when its name or repo name matches another owner's entry, its
   owner's account is under 30 days old or cannot be read, its `update.json`
   is not on github.com or raw.githubusercontent.com, or an issue proposed a
   repo with neither topic. A catalog repo with neither topic gets no hold
   (D-042). A held pull request gets the `hold` label. A
   daily job merges a pull request that says `Hold: none` and has no `hold`
   label at its first daily run at least 48 hours after it opens, once its
   entry passes `pnpm check` beside the current entries. A run started by
   hand can set another wait, from 0 to 9999 hours (M057, D-034). Closing a
   bot pull request still keeps the bot from proposing that repo again.
2. Upstream facts. The bot reads the repository metadata, the releases, the
   `manifest.json` in the newest stable release that has an `.xpi` file,
   the names of that XPI's locale folders whose language is not `und`,
   `zxx`, or `mul` (M036), has an English
   name in the build's Node.js `Intl` data, and whose files, judged by type,
   hold at least one message and at least half as many as the fullest
   tag's, or hold a file that the reader does not count (M023, M025,
   M027, M034), so a listed language can still be incomplete, and the
   `update.json`
   that the manifest names (corrected M002, M014). A
   stable release is one that GitHub does not mark as a prerelease. If no
   stable release has an `.xpi` file, the bot reads the newest release that
   has one. If the stable release is not a Zotero 7+ build (`no-manifest`,
   `no-zotero-id`, or `max-version-below-7`), the bot reads the newest later
   release instead, when one has an `.xpi` file. The data's `prerelease`
   fact says whether the release read is a prerelease. The data's `xpiUrl`
   fact is the download address that GitHub gives for the first `.xpi`
   file of that release, the address the start plan names (M052, D-029).
   These files
   are the source of truth for the name, the description, the versions, and
   the declared compatibility (`strict_min_version`, `strict_max_version`).
   The repo's GitHub About text is a second source for the description
   (M055).
3. Overrides. An override in the index corrects a fact that the author cannot
   or will not fix upstream. Each override states its reason. A
   `description` override can also give English text for a plugin with no
   English description upstream: the manifest and GitHub texts are each
   missing, not in English, only repeat the name, or have a CJK share of
   0.5 or more. It can also replace an English description that the site
   shows without the override and that has fewer than six words (D-038).
   Its reason names its upstream source and which case each text is
   (D-030, D-031, D-032, D-038).
4. User reports. Two issue forms take a "works" or a "broken" report with
   the plugin id, the plugin version, and the Zotero version. A bot checks
   each report, comments, and closes the issue (M020), and a daily sweep
   answers up to 20 report issues that no run answered (M040). Each plugin
   page has a "Works" button and a "Broken" button. Each opens a form with the
   plugin and its version filled in, so the reporter adds only the Zotero
   version. The daily build reads the closed report issues and counts those
   that `github-actions[bot]`, the account the bot runs as, closed as
   completed, by D-013's rule (M021). No file in the repo holds a report.
5. Start tests. `build.yml` starts the release the build read in each
   tested Zotero release for Linux that the manifest's
   `strict_min_version` and `strict_max_version` cover, without overrides,
   since Zotero installs by the manifest. A maintainer pins the releases and
   their SHA-256 values in the workflow (D-023). The result is one of
   `started`, `start-error`, `not-installed`, or `timed-out`, read 3 s after
   the install, and the data keeps it in `startTests` (M046, M047). Since
   M059 a daily build reuses the deployed `started` result for an XPI whose
   SHA-256 (`upstream.xpiSha256`) is unchanged. It starts the plugin again
   for a new SHA-256, a release with no earlier result, a result other than
   `started`, and on the entry's re-test day, once every 7 days, in a build
   that deploys (D-035).

Beside these, the build reads one fact that is not about a plugin: the
current Zotero release, from zotero.org, which the declared marks use as
the newest release of its major (M062, D-036). It also reads the zotero.org
changelog page of each earlier major, which never enters the data and only
warns when the hand-kept release lists fall behind (M068, D-040).

Inclusion bar: a public repository, a Zotero 7+ manifest, and at least one
release with a readable `update.json`. The bot checks all three, and it
refuses forks (corrected M002). An archived repository passes the bar, and
the index shows that it is archived (D-006, M013). The maintainer removes
spam. Inclusion is not a judgment of
quality. The index does not list plugins for Zotero 5 or 6.

A page whose declared compatibility and user reports disagree shows both
(corrected M007, M021, M054). For example, the Zotero 8 row of the
compatibility table shows "✓ Yes" beside "2 works 3 broken".

An author can open an issue to be delisted or to correct a fact, and the
index honors both requests. An author cannot remove user reports. The
exception is a report that is abuse.

## Function Families

- Entry checks (`src/check/`): `pnpm check [dir]` checks each entry
  directory under `plugins/`, or under `dir`, and prints one line for each
  problem. Added M001. It also refuses a file beside the entries, a
  directory name that `entryNameProblem` refuses, and names that differ
  only in case; `writeEntry` refuses the same ids (M031). It refuses an
  override reason of only JavaScript `\s` whitespace and Unicode format
  characters, two overrides with the same `field` and `version`, and names
  a UTF-8 byte-order mark at the start of an entry file (M032).
- Upstream reader (`src/upstream/`): `readUpstream(repoUrl, fetch, {
  lookup, signal })` returns the facts of one GitHub repo with the URL and
  SHA-256 of the XPI it read (M047) and the repo's topics (M056), or one
  named inclusion-bar failure.
  `downloadXpi` downloads one XPI with the same host check (M047). The
  optional `lookup` resolves download hosts for the host check (M004).
  When the optional `signal` aborts, the read fails as a build-level
  `request-failed` (M029). Added M002. `githubClient(fetch)` makes its GitHub
  API requests and refuses a URL on another host, so the token goes to the
  API only (exported M008).
- Entry drafting (`src/add-plugin/`): `pnpm add-plugin <github-url> [--out
  <dir>]` writes a new entry from the reader's facts. Added M002.
- Discovery (`src/discover/`): `pnpm discover [--out <dir> | --handoff
  <dir>] [--state <file>] [--limit <n>] [--budget <n>]` searches the
  `zotero-plugin` and `zotero-addon` topics, adds the repos of the
  zotero-chinese catalog (M070), reads each repo that no entry names, and
  writes the entries of up to `limit` repos (5 by default) that
  pass the inclusion bar. It prints a JSON report of what it wrote, refused,
  and skipped. Added M008. With `--handoff <dir>`, it also skips the repos of
  the bot pull requests and writes the entries and a `plan.json` into a
  handoff for `pnpm propose` (M011). `pnpm discover-issue --handoff <dir>`
  reads the body of the issue that `ISSUE_NUMBER` names from the API, takes
  the "Add a plugin" form's repo URL from it, and writes its outcome into a
  handoff; a failed issue read is the `failed` outcome (M010, M011, M040).
  `pnpm propose <dir> [--limit <n>]` checks a handoff, then opens one pull
  request for each entry, or, with `ISSUE_NUMBER` set, answers the issue: a
  pull request, or a comment with the reason and a close (M009, M010, M011). A read of the repo that stops
  with a build-level failure, or throws, gets a comment and leaves the issue
  open (M019), as do an error from the check of the drafted entry (M022),
  an entry that `writeEntry` cannot write to the output directory, with
  `entry-exists` or `write-failed` (M028), and a branch-name check in
  `pnpm propose` that cannot run (M038). Each repo read stops at 3
  minutes as a build-level `request-failed`, not recorded, and `pnpm
  discover` starts no read after 18 minutes from the command's start,
  counting the rest in `unread` with a warning. The `git check-ref-format`
  check stops at 30 seconds and throws; in `pnpm propose` each other git
  process stops at 2 minutes and `pnpm check` at 5 minutes, failing only
  its entry (M030).
  `pnpm close-issue` reads the pull request that `PR_NUMBER` names. When it
  is a bot pull request closed without a merge, the command comments on the
  open "Add a plugin" issue that its `Closes #<n>` line names and closes it
  as not planned. `.github/workflows/close-add-plugin-issue.yml` runs it
  when a pull request closes (M022). An open bot pull request whose body has
  exactly one `Closes #<n>` line outside code blocks naming the issue gets
  the new-pull-request answer, and the issue stays open (`closesLines`,
  moved to `propose.ts`, M040).
- Issue sweeps (`src/issues/`): `unansweredIssues` returns, oldest first and
  at most `limit`, the open issues of one label created 1 hour to 7 days
  before `now` with no `github-actions[bot]` comment on any page, and none
  while any of the 100 newest `issues` runs of the given workflow has not
  completed. `pnpm unanswered-issues --label <l> --workflow <file> --limit
  <n>` prints them one per line. Added M040.
- Data build (`src/build/`): `pnpm build [<dir>] [--out <dir>] [--plan
  <file>]` writes
  `dist/v1/plugins.json`, one record per entry, with a failed upstream read
  kept in that entry's record, and copies the two schemas to `dist/schemas/`.
  It exits 1 when more than half of the records carry a build-level failure,
  as README "Building the data" defines it, and also when every record carries a
  failure, whatever its name, and, after writing the data, when it cannot
  write the `--plan` file (M047). It prints a summary of failure
  names and a `::warning::` line for build-level failures. Before any plugin
  read it reads the `report` label and the closed report issues of
  `GITHUB_REPOSITORY`, or of `INDEX_REPO`, and writes `reports` on each
  record that has `upstream`; a failed label or issue read, or a listed
  issue with no `closed_by` key, writes no file and exits 1 (D-013). A
  pull request or an item that is not an object is left for `countReports`
  to drop. A plugin read stops
  at 3 minutes and fails as `request-failed`. After 18 minutes from the
  command's start, the build reads no more plugins, and each entry left
  fails as `not-read`. Both are build-level (D-015). When the whole UTC days
  from 1970-01-01 to `generatedAt` are even, it reads the plugins in id
  order, and when they are odd, in reverse; the records, the build-level
  list, and the start plan keep id order (D-028). The label and report
  issue read stops at 3 minutes in all, a failed report read under D-013
  (D-027). After the plugin reads, `readZoteroRelease` in
  `src/build/zotero-release.ts` reads the current Zotero release from
  zotero.org with no token and a 30 s limit, and the build writes it as the
  top-level `zoteroRelease`; a failed read leaves the field out, prints one
  `::warning::` line, and does not change the exit code (M062, D-036). It
  writes no record, so it is not build-level. In the same limit and at the
  same time, `readChangelogRelease` reads the changelog page of each
  `LAST_RELEASES` major, and `releaseListWarnings` gives one warning, which
  the CLI prints as a `::warning::` line, for a current release from a
  newer major than the last of `ZOTERO_MAJORS`, for each page naming a
  newer release than the list, and for each failed page read; they change
  neither the exit code nor the data (M068, D-040). The
  command exits once stdout and stderr have flushed, so a host lookup that
  a limit cut cannot hold it open. Added M003;
  schemas and exit rule M006; build-level rule and summary M017; every-record
  rule M018; reports M021; time limits M029; label read and `closed_by`
  check M041; report read limit and exit M050; read order by day M051;
  Zotero release read M062; release list warnings M068.
- Site build (`src/site/`, `site/`): `pnpm site [--out <dir>]` writes the
  home page, the About page (M054), and one page per record into `dist/`,
  or `<dir>`, from the data file there. `src/site/version.ts` holds the version and range functions
  that the templates use, `majorSupport` and `ZOTERO_MAJORS` among them, and
  `src/site/description.ts` holds `shownDescription` and `cjkShare`.
  `pnpm description-gaps <data file>` (`src/site/description-gaps.ts`)
  lists the records whose shown description, with the checkout's overrides,
  is missing, has a CJK share of 0.5 or more, or has fewer than six words
  (M067).
  `src/site/categories.ts` holds `CATEGORIES`, `categories`, and
  `categoryOptions` (M066).
  `src/site/languages.ts` holds the applied languages, their names, and the
  menu options. `src/site/home-filter.ts` holds `passes`, `rowShows`,
  `chosenValue`, `filterHref`, `filterOn`, `filterStatus`, `PAGE_SIZE`,
  `pageCount`, `onPage`, and `chosenPage`, which the home page's script
  imports for the search box, the category and language menus, the version
  buttons, the count, and the pager (renamed from `language-filter.ts`, M037;
  pages M058; categories M066).
  It also holds `prePaintStyle`, whose source text the home page's classic
  script carries, so it calls and reads nothing outside its body except
  built-ins (M060);
  `rowMajors` in `version.ts` gives each row's `data-zotero`.
  `site/src/data.ts` holds the template helpers, among them `homeOrder`,
  `majorStart`, `shortLanguages`, and `monthYear` for the home table, and
  `compatMajors`, `majorReport`, and `startWords` for the plugin page's
  table (M054). `site/src/components/Icon.astro` draws the line icons and
  the star, which `Base.astro` fills only inside `[data-repo-stars]` (M064).
  `site/src/layouts/Base.astro` holds the color and size tokens for both
  color schemes, the shared rules, the top bar, and the footer. Added M007;
  pills and descriptions M015; languages M024; version buttons M037; status
  line M044; table, search box, and tokens M053; plugin page head,
  compatibility table, Details grid, and About page M054.
- Reports (`src/reports/`): `parseReport(body, labels, ids)` reads a report
  issue's plugin id, plugin version, Zotero major, and verdict, or names the
  first problem. `pnpm report-issue` reads the issue that `ISSUE_NUMBER`
  names, comments, and closes it as completed or not planned, sending the
  close alone when the bot already commented. Added M020; no second comment
  M040. `pnpm report-issue --sweep` answers, with `sweepReports`, up to 20
  report issues that `unansweredIssues` returns (M040).
  `countReports(issues, records)` (`src/reports/count.ts`) counts the closed
  report issues for each record that has `upstream`, by Zotero major
  (M021).
- Start tests (`src/start-test/`): `pnpm start-test --zotero --xpi --out
  [--limit]` starts one Zotero binary with one XPI in a new profile, with
  the reporter plugin of `src/start-test/reporter/`, and writes one of the
  four results, or exits 1 with a failure name (M046). `pnpm
  carry-start-results --plan --data [--previous]` (`carryPlan`,
  `carryResults` in `src/start-test/carry.ts`, M059) reads the deployed
  `v1/plugins.json` within 60 s and 16 MiB and writes into each plan item
  a `carried` list of the earlier record's `started` results, when the
  record's upstream has the item's id, version, and `xpiSha256`, except on
  the entry's re-test day: `retestDay` (first 4 bytes of the SHA-256 of the
  entry id, mod 7) equal to the whole UTC days to the `--data` file's
  `generatedAt`, mod 7. It exits 0 on every read error, leaving the plan as
  it was (D-024). `pnpm start-tests
  --plan --zotero --out` starts each item of the plan that `pnpm build
  --plan` writes and whose manifest range covers the binary's version
  (`inRange`, by `compareVersions`), except an item whose `carried` list
  names that version. It downloads each XPI with the
  reader's `downloadXpi`, checks the plan's SHA-256, runs `pnpm start-test`
  in its own process, records no result for a failed download, a hash
  mismatch, or a failed start, and starts nothing new after 20 minutes.
  `pnpm add-start-results --data --plan --results --tested` keeps a job
  result only when its entry, plugin id, and version match the plan, its
  Zotero version equals the one in its artifact's name, is listed in
  `--tested`, falls in the range, and is not carried (since M059), and its
  result is one of the four names; it
  drops every result of a duplicate pair and each entry that is not a
  readable JSON array file of at most 1 MiB, and writes `startTests`
  ordered by version (`addResults`, M047). Since M059 it also adds each
  carried result for a `--tested` version in range, also when `--results`
  is missing, and drops a job result for a carried pair as `carried`;
  `parsePlan` refuses a `carried` list
  that is not a list of `started` results with distinct `zotero` strings.

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
  `update.json` at 1 MiB. A locale file whose declared or compressed size is
  over 1 MiB is not unzipped, and one that inflates past its declared size
  stops within one 1 KiB push; both keep their tag in `languages` (M027,
  M034).
  `src/upstream/host-guard.ts` refuses a download host in a loopback,
  private, or reserved range, by its literal address or by each address
  that DNS returns. The reader follows download redirects
  itself, at most 5, and checks each one (M004). If an XPI's zip claims
  more entries than its length can hold, at 46 bytes for each entry, the
  read fails with `xpi-unreadable`. If the zip has more than one entry named
  `manifest.json`, or more than one named the default locale's
  `messages.json`, the read also fails with `xpi-unreadable`. fflate's
  `unzipSync` loops over the claimed count and unzips each matching entry,
  so without these checks either zip held the build's CPU (M005, corrected
  M012).
  The reader finds each file from the central directory, read as `unzipSync`
  reads it, and loops over the claimed count. It inflates a deflated
  `manifest.json` or default locale's `messages.json` with fflate's
  streaming `Inflate`, 16 KiB of input at a time, and fails with
  `xpi-unreadable` once the output passes the unzipped size that the zip
  declares, because `unzipSync` decodes the whole stream however far it runs
  past that size (M012). The `messages.json` of `_locales/en/`, `en_US/`,
  and `en_GB/` goes through the same checks, but a refused English file is
  skipped and fails nothing (M055).
  The reader walks the same central directory once more, one header at a
  time, and records as `languages` the tags of the `locale/<tag>/` and
  `chrome/locale/<tag>/` folders whose files hold messages (M027, M034). It
  inflates each `.ftl`, `.properties`, and `.dtd` file from the header it is
  on, 1 KiB of input at a time, and adds its messages to its tag's count:
  each Fluent message or term line of an `.ftl` file, each line of a
  `.properties` file that is not blank and not a comment, and each
  `<!ENTITY` outside comments in a `.dtd` file. A tag is kept when its count
  is at least 1 and twice its count is at least the largest count among the
  XPI's tags, so a translation with under half the fullest tag's messages
  is left out and a listed one can still be incomplete (M034). A tag is kept
  whatever its count when one of its files is of any other type, which the
  reader does not inflate, or is a file that the reader does not inflate:
  one over 1 MiB declared or compressed, one with another compression, and
  one that would take the XPI's inflated locale total past 8 MiB
  (`LOCALE_MAX_BYTES`). So is a tag with a file that fails to inflate, or
  whose output length differs from its declared size, so no locale file
  fails the read. Such a file adds nothing to any count. The total charges
  each file the largest of
  its declared size, its compressed size, and its output, so the reader
  inflates at most about
  1 MiB past 8 MiB of locale files for each XPI, however small the sizes
  the files declare. Outside that total, each of the three English
  `messages.json` files inflates at most 1 MiB (M055). So each XPI takes up
  to six walks over the claimed count: for `manifest.json`, the default
  locale's `messages.json`, the three English `messages.json` files, and
  the locale folders. A
  folder name is a tag when it matches `LANGUAGE_TAG`, which refuses the
  language subtags `und`, `zxx`, and `mul` in any letter case (D-018,
  M036), and its language
  subtag has an English name in the build's Node.js `Intl` data
  (`Intl.DisplayNames` with `fallback: "none"`), so a node upgrade can
  change which rare codes are tags.
  Both schemas copy that pattern into their `languages` patterns, and a test
  checks the copies (M023, M025).
- `src/discover/` pages through GitHub's repository search for each topic
  with the reader's GitHub client, which `src/upstream/reader.ts` exports.
  The search is sorted by last update, so pages do not shift between
  requests. With the `catalog` option, which `pnpm discover` sets to
  `CATALOG_URL`, it also reads the zotero-chinese catalog's `plugins.json`
  through the contents API (`githubClient().raw`, 60 s, 8 MiB). A catalog
  name that an entry or the skip set names is skipped there; each other
  name that no topic search returned is looked up with one GraphQL request
  for each 100 names, the names sent as variables. A failed request ends
  the lookups, and so does `runMs` (M070). It joins
  the result lists by the lowercase owner/repo that the search or the
  lookup gives, a topic find before a catalog find, and reads the newest
  pushed repos first, at most `budget` (100 by default) per run. It leaves out
  each repo whose owner/repo, ignoring case, an entry's `repoUrl` names,
  and it refuses a plugin id that an entry directory already has. A state
  file, `.cache/discovery-state.json` by default, keeps each refused repo's
  `pushed_at` and failure while the index lacks the repo and the run found
  it or the record is under 30 days old (corrected M070). A later run
  reads that repo again when its `pushed_at` changed or the record is 30
  days old. A `github-http-error`,
  `request-failed`, or `unexpected-error` result is not kept, nor a write
  refused by the output directory (`entry-exists` there, `write-failed`),
  nor a refusal caused by an HTTP 429 or 5xx answer from a download host,
  or by a 403 to a download that requested a GitHub release URL, which the
  reader marks build-level (M026, M045).
  A failed topic search ends the run before any read and leaves the state
  file as it was; a failed catalog read or lookup only warns (corrected
  M070). The report names, for each entry written, its version and declared
  range (M008).
- Each bot workflow that reads plugin repos splits the work into a read job
  and a write job (M011); `add-plugin-issue.yml` adds a `pick` job before
  them that reads no plugin repo (M040). The
  report workflow reads no plugin repo and runs in one job (M020). The read
  job has only read permissions and a checkout with
  `persist-credentials: false`. It reads the
  repos that anyone can name and leaves a handoff as an artifact:
  `plan.json` and `entries/<id>/` (`src/discover/handoff.ts`), in
  `add-plugin-issue.yml` one such directory `handoff/<issue>/` per issue
  (M040). The write job
  holds the write permissions, runs only `pnpm install` and `pnpm propose`,
  and reads no plugin repo. Neither job uses the dependency cache.
  `readHandoff` treats the handoff as untrusted: it checks `plan.json`
  against a schema with Ajv, each id against the Mozilla add-on id format,
  each repo as a lowercase owner/repo whose `discover/` branch
  `git check-ref-format` accepts and whose URL is its GitHub URL, the entry
  count against the limit, and each entry directory for exactly the regular
  files `meta.json` and `index.json`. Any check that runs and fails refuses
  the whole handoff before a request. A branch-name check that cannot run
  (git does not start or ends with any result other than exit status 1) or
  passes its limit is not a refusal: `readHandoff` returns `check-failed`
  once every other check passes, so a handoff that another check refuses
  stays refused. An issue run comments `check-failed` as `unexpected-error`
  and leaves the issue open, and a discover run prints it and exits 1
  (M038). So that one plugin cannot
  refuse a run's handoff, `draftEntry` runs the same entry and file checks
  (`plannedProblem`) after it writes an entry, and refuses a failing one as
  `not-proposable`, a recorded failure; a check that throws, such as git
  failing to start, is `unexpected-error`, not recorded. Discovery plans a
  written entry under the name GitHub gives, which the check read. An
  issue's repo whose name has a shape the handoff refuses is never `known`.
  The read step cuts each issue message to 2,001 characters. Each read job
  outputs its upload's `artifact-id`, and the write side downloads only
  when this attempt uploaded one. The issue number comes from
  `ISSUE_NUMBER`, never from the handoff. The write step reads the bot pull
  requests again. `fetchBase` fetches the default branch and reads
  `plugins/` at the fetched commit with `git ls-tree` and `git cat-file`,
  and the write step skips an entry that the pull requests or that index
  has; a fetched commit with no `plugins/` fails every entry (M042).
  `propose` builds on that same commit. `fetchBase` and `propose` give
  `git fetch` and `git push` the token as an
  `http.https://github.com/.extraheader` through `GIT_CONFIG_COUNT`, and
  `pnpmCheck` runs the check without `GITHUB_TOKEN`.
- `src/discover/propose.ts` holds both steps of a discover run. The read step,
  `discoverRead`, first lists the index repo's pull requests (`state=all`,
  every page) and puts in the skip set each repo whose
  `discover/<owner>/<repo>` pull request from the index repo itself is open
  or closed without a merge. A merged one's entry is in the index. The write
  step, `proposeHandoff`, runs `propose`: for each entry, it runs `pnpm check`
  on a temporary directory that holds only that entry. Then it builds one
  commit on top of the commit that `fetchBase` read, with a temporary git
  index file,
  `commit-tree`, and the `github-actions[bot]` identity, force-pushes it to
  the branch, and sends one create-pull-request request whose body carries
  the check's status and output, cut to its first 10,000 characters (M039).
  The checkout's branch and working tree do
  not change. A failure for one entry is reported, and the run goes on and
  exits 1 at the end. Both steps read the files of each open bot pull request
  (`botPulls`): discovery refuses, without recording, a repo whose plugin id
  one of them adds, and the write step skips such an entry. `githubClient` gains `post`, which fails on a redirect, and
  M010 adds `patch` and M056 `put`, which share that code.
  `.github/workflows/discover.yml` runs it daily and on dispatch on the
  default branch only, with a `limit` input, in the `discover` concurrency
  group. Its write job holds `contents: write` and `pull-requests: write`.
  The read job restores the state file from the newest cache by prefix and
  saves it under a key with the run id, after a failed run too. Pull requests opened with the built-in token start no CI run, so
  the body carries the check result (M009).
- `.github/ISSUE_TEMPLATE/add-plugin.yml` is a form with one required input,
  `Repository URL`, that adds the label `add-plugin`.
  `.github/workflows/add-plugin-issue.yml` runs its jobs on `issues: opened`
  when that label is set, daily at 02:43 UTC, and on dispatch from the
  default branch, in the `discover` concurrency group (M040). Its `pick`
  job (`contents`, `issues`, and `actions` read) outputs the event's issue
  number, or for a sweep the up to 3 numbers that `pnpm unanswered-issues`
  prints; it reads no plugin repo. The read job (`contents`,
  `pull-requests`, and `issues` read) and the write job run
  `pnpm discover-issue` and `pnpm propose` once for each number, with one
  handoff directory per number in one artifact, each number passed only
  through `env:` (`ISSUES`, then `ISSUE_NUMBER`), and each fails at the end
  when one of its runs fails. All three jobs set `cache-mode: none`. Both
  workflows, and `merge-discover.yml` since M056, set `queue: max` on the
  `discover` group (M043), so up to 100
  runs wait and run one at a time, in an order GitHub does not promise, and
  GitHub cancels a run past that; a later sweep can answer a canceled run's
  issue while it is at most 7 days old and among the 3 oldest unanswered
  issues. An
  `issues` run without the `add-plugin` label, like a dispatch from another
  ref, takes a group of its own (`add-plugin-skipped-<run id>`).
  An issue with any bot comment, such as "The bot could not finish", stays
  for a maintainer. A rerun of the write job answers each issue of its run
  again. Its write job holds `contents`,
  `pull-requests`, and `issues` write, and it also runs when the read job
  failed, not when it was skipped; its download step may fail. In
  `src/discover/issue.ts`, `issueRead` reads the body from the API and
  checks the entries and the bot pull requests by repo name before and after
  the read.
  `issueAnswer` checks them again by repo and id, and opens the pull request
  through the same propose step, with `Closes #<issue>` in its body (M010,
  M011). `.github/workflows/close-add-plugin-issue.yml` runs
  `pnpm close-issue` (`src/discover/close-issue.ts`) on
  `pull_request_target: closed` for a `discover/` branch of the index repo
  closed without a merge, in a concurrency group for each pull request, with
  only the pull request number passed through `env:`. Its one job holds `contents: read`, `issues: write`, and
  `pull-requests: read`, sets `cache-mode: none`, and checks out the default
  branch, so it runs no code from the pull request. `test/workflows.test.ts`
  checks these facts (M022).
- `src/discover/holds.ts` (M056) holds `TOPICS`, `SOURCES` (M070),
  `HOLD_REASONS`, and `holdReasons`. `draftEntry` reads `GET /users/<owner>` and the repo's
  `topics`, which `readUpstream` returns beside `facts` and the build does not
  publish, and fills each planned entry's `holds`, which the handoff schema
  requires. `body()` in `propose.ts` writes `Hold: none` or the reasons with a
  `HOLD_TEXT` sentence each, and `proposeHandoff` posts the `hold` label to a
  held pull request. `pnpm merge-discover` (`src/discover/merge.ts`) reads
  every page of open pull requests, skips each that fails a condition (the
  Hold line read outside fences with `unfencedLines`, the label in any case,
  the wait, an opening time that is unreadable or after the run, no draft,
  the default branch as base), reads the two entry files through
  the contents API at the head SHA, runs `pnpmCheck` on a copy of `plugins/`
  with them added, reads the pull request again, and sends a squash merge
  pinned to that SHA. `.github/workflows/merge-discover.yml` runs it
  daily at 05:13 UTC and on dispatch from the default branch, in the
  `discover` group, with `contents: write`, `pull-requests: write`, and
  `cache-mode: none`. A dispatch's `wait_hours` input reaches
  `--wait-hours` through `env:`; a scheduled run has none, so
  `pnpm merge-discover` uses `DEFAULT_WAIT_HOURS`, 48 (M057).
- `.github/ISSUE_TEMPLATE/works.yml` and `broken.yml` are report forms with
  the inputs `plugin`, `version`, and `zotero`. Each adds the label `report`
  and its verdict label, `works` or `broken`. `.github/workflows/report-issue.yml`
  runs `pnpm report-issue` on `issues: opened` when `report` is set, with
  only the issue number passed through `env:`, and `pnpm report-issue
  --sweep` daily at 03:13 UTC and on dispatch from the default branch
  (M040). Its one job holds `contents: read`, `issues: write`, and
  `actions: read`, and sets `cache-mode: none`. Each report run has a
  concurrency group of its own, and the sweeps share the group
  `report-sweep` (M040). `answerReport` (`src/reports/issue.ts`) reads the
  issue's body, labels, and comments from the API and the entry ids with its own
  `readdir`, so a missing `plugins/` fails the run instead of refusing every
  report. The comment puts each value from the issue in a code span (M020).
- `.github/workflows/ci.yml` runs `pnpm test` and `pnpm check` on every push
  and pull request, except those the built-in token makes, such as the
  discovery bot's (M009). Its `start-test` job downloads Zotero 10.0.6 for
  Linux, checks its SHA-256, and runs `test/start-test-zotero.test.ts` under
  `xvfb-run` with `ZOTERO_BIN` set; the `check` job skips that file (M046).
- `src/build/` reads the entries, then the `report` label and every page of
  the closed report issues, runs the upstream reader on each plugin in turn,
  writes the `countReports` counts into each read record's `reports`, and checks each record and then the whole output against
  `schemas/plugins.v1.schema.json` before it writes the file.
  `.github/workflows/build.yml` runs `pnpm check` and the build (M007),
  then since M059 `pnpm carry-start-results`,
  daily and on manual dispatch, and keeps the data as a workflow artifact
  (M003); since M047 a later site job runs `pnpm site`. The build also
  copies both schemas to `dist/schemas/`, and it exits 1 after it writes
  the file when more than half of the records carry a build-level
  failure, as README "Building the data" defines it (M017), or when every
  record carries a failure of any name (M018, D-012). A failed read of the
  `report` label or the report issues, or a listed issue with no
  `closed_by` key, stops the build before any plugin read and writes no file
  (D-013, M021, M041), as does a report read that passes 3 minutes (D-027,
  M050). The build job holds `contents: read` and `issues: read`
  for that read, and `test/workflows.test.ts` checks both (M021). The reader
  marks a failure build-level beside its name, and `buildData` returns the
  marked ids outside the data, so the published file keeps its shape
  (D-011). Since M047 the workflow has four jobs. The build job runs
  `pnpm build --plan start-plan.json`, then since M059 `pnpm
  carry-start-results` on the plan, gives the plan's SHA-256 as the job
  output `plan-sha256` and, since M069, the `pnpm data-digest --dir dist`
  value as `data-sha256`, and uploads `dist/` as `plugins-data` and the
  plan as `start-plan`. The site job checks the downloaded `dist/` with
  `pnpm data-digest --dir dist --expect` and the downloaded plan with
  `sha256sum --check`, each against its output, before
  `pnpm add-start-results`, so a mismatch deploys nothing. Plugin code that
  reaches the run's artifact token can delete and upload again an artifact
  of another job (M069). `src/build/digest.ts` hashes one JSON line per
  entry, its kind, path, and file SHA-256, sorted by path, and refuses an
  entry that is not a file or a directory. A
  `start-test` matrix job, one line per tested Zotero release with its
  file name and SHA-256, runs `pnpm start-tests` and uploads
  `start-results-<version>`; it holds
  `permissions: {}`, reads no secret, checks out with
  `persist-credentials: false`, and sets `cache-mode: none`, since plugin
  code runs in it (D-023). The site job, whose `if:` is
  `${{ !cancelled() && needs.build.result == 'success' }}`, runs
  `pnpm add-start-results` and `pnpm site` and uploads `dist/` as the Pages
  artifact. A deploy job that needs the site job publishes it; its `if:`
  is `${{ !cancelled() && needs.site.result == 'success' }}`, since a job
  with a failed earlier job is skipped by default, so a failed start test
  still deploys. A failed build deploys nothing, and the
  `github-pages` environment takes deploys from `main` only (M006).
  The build, start-test, and site jobs of `build.yml` restore no Actions
  cache (M047). The build job's rule came first: the job sets
  `cache-mode: none`, which GitHub enforces with the job's cache token, and no
  step sets a `cache` input (D-010). Scheduled and dispatched runs of the
  discover read job can save caches in the default branch's scope, while
  `issues` runs get read-only cache access. `test/workflows.test.ts` fails on a
  `cache` key or an `actions/cache` step in `build.yml`, or on a build,
  start-test, or site job without `cache-mode: none` (M047); `ci.yml` keeps
  `cache: pnpm` (M016). It also checks `report-issue.yml`: its triggers,
  job condition, permissions,
  `cache-mode: none`, no cache line, its concurrency groups, the issue number
  through `env:`, and no use of `github.event` other than the issue number,
  its labels, and the repository's default branch (M020, M040), and that
  `pnpm report-issue` and its sweep get `secrets.GITHUB_TOKEN`, whose account
  the report count requires (M021). It checks the same kinds of fact for
  `add-plugin-issue.yml`, and that its read and write jobs take the issue
  numbers only from the `pick` job (M040).
- `site/` is an Astro project (D-004), and `src/site/` builds it. `pnpm site`
  reads `<out>/v1/plugins.json`, builds into a temporary directory, because
  Astro empties its output directory, and copies the pages into `<out>` beside
  the data. `src/site/version.ts` orders versions by Mozilla's legacy version
  format (`cairn/references/mozilla-toolkit-version.md`), finds a record's
  declared range with overrides applied, and, in `majorSupport`, how much of
  one Zotero major that range covers, up to `newestRelease` (M062). The
  tests and the templates (through `site/src/data.ts`, and, for
  `majorSupport`, `site/src/pages/index.astro` and
  `site/src/pages/plugins/[id]/index.astro`, and, for `ZOTERO_MAJORS`,
  `site/src/pages/index.astro` and, with `knownRelease`,
  `site/src/pages/about.astro`) import it. The
  pages carried no script from M015. Since M024 the home page carries one,
  for the language menu and, since M037, the version buttons and, since
  M044, the status line under them, and since M053 the search box and the
  count that replaced that line, and since M058 the pager, which Astro
  inlines as a `type="module"` script. Since M060 a classic inline script
  before the table adds the pre-paint style. The other pages carry none
  (D-014, D-019, D-026). The templates take the Pages path
  from `site/src/base.ts`, because a `BASE_URL` environment variable replaces
  Astro's `import.meta.env.BASE_URL`. `build.yml`'s site job runs `pnpm site`
  after the build job (M047), so a failed site build also deploys nothing.
  `tsconfig.json` includes `site/`, so `pnpm test` type-checks its `.ts`
  files; the `.astro` templates
  are compiled by Astro without a type check (M007). A plugin page shows the
  "Archived on GitHub" fact only for a record whose `archived` is a boolean,
  and the home table's `data-archived` marker only for `archived: true` (M013).
  All styles are global in `site/src/layouts/Base.astro`, with a
  `prefers-color-scheme: dark` block, so Astro adds no scoped attributes to
  the markup the site tests match (M015). Outside its `:root` blocks and
  `.visually-hidden`, each value part of each margin, padding, gap,
  `border-radius`, and `font-size` there is a custom property, `0`, or
  `auto`, and no other `.astro` file holds a style (M049). The one style
  outside it is the home page's pre-paint style, which `prePaintStyle`
  writes and the classic script adds at load (M060).

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
  which raises the limit (M002). Since M070 discovery also reads the
  zotero-chinese catalog, so a plugin with no topic is missed only when the
  catalog does not list it either (corrected M070). On 2026-10-31 the
  catalog listed 132 such plugins that passed the inclusion bar.
- The host check looks up a download host before the request, and fetch
  looks it up again when it connects. A DNS server that answers differently
  the second time (DNS rebinding) can still reach a private address. The
  plugin author picks the `update.json` host, and from that file the reader
  publishes only whether it lists the plugin id. The XPI comes from GitHub's
  download URL. Recorded at M004, 2026-10-25. The candidate "Check addresses
  when the reader connects" holds the fix.
- One person maintains the index. Approvals and disputes wait for that
  person. Expected at design time, 2026-10-24.
- Throwaway GitHub accounts can inflate the report counts, because each
  account counts once for each plugin and Zotero major. The maintainer
  removes abuse one issue at a time with the label `not-counted`. A report
  that someone reopens and closes again, or that the maintainer closes by
  hand after a failed bot run, does not count, because the count takes only
  issues that `github-actions[bot]` closed. GitHub shows every deleted
  account as one "ghost" account, so their reports count once for each
  plugin and major. Recorded at M021, 2026-10-27.
- The `languages` list leaves out a real language that the Node.js `Intl`
  data has no English name for, such as `cdo` (Min Dong Chinese) or `mnw`
  (Mon) on Node 26, and a Node upgrade can change which rare codes count.
  A `languages` override records such a language. Accepted at the M025
  plan, 2026-10-27.
- Plugin code that runs in a start-test job can rewrite that job's results,
  its own included, so the data can show a forged start. The job has no
  token permission and no secret, and `pnpm add-start-results` keeps only
  results whose entry, plugin id, version, and range match the plan and
  whose Zotero version equals the artifact's name and is one of the
  matrix's versions. A process left from a start can also upload an
  artifact; under another job's name it wins if it uploads first, and that
  job's own upload then fails. The command cannot tell a forged result from
  a real one inside those bounds, and an unreadable entry drops without
  stopping the deploy. Accepted with D-023, 2026-10-28; bounds set in the
  M047 review. Since M059 a carried `started` result comes from the plan,
  which the site job checks against the build job's output, and a job
  result for a carried pair drops; a forged `started` result in the
  deployed data stays until the entry's re-test day, or longer if that
  day's build deploys nothing, and plugin code can forge it again on that
  day (D-035).
- If a language, Zotero, or category filter is on (category since M066), a browser that cannot read the
  `of <selector>` form of `:nth-child()` paints every row that the filter
  passes, on every page, until the home page's script runs. Chrome and Edge
  before 111, Firefox before 113, and Opera before 97 cannot read it; Safari
  reads it since 9 (`cairn/references/mdn-nth-child.md`). Such a browser
  drops only the rules that use the form. Each filter's `:not()` rule holds
  one attribute selector, so the browser still hides the rows that the
  filter does not pass. Recorded at M060, 2026-10-30.
- A saved copy of a v1 schema rejects data that carries an optional field
  added after the copy was saved, because the v1 objects keep
  `additionalProperties: false` while D-006 lets v1 gain optional fields
  (`upstream.repoDescription` since M055). Allowing unknown fields would
  change what the schema checks. Routed from candidates 2026-10-31; added
  2026-10-26 — M013, M055, D-007.
- The reader judges a plugin by the one release it reads, the newest stable
  release first (D-008), so a plugin whose read release fails is refused
  even when another release has a readable `update.json`, though the
  inclusion bar asks for at least one such release. It also trusts GitHub's
  `published_at` to be a valid UTC timestamp: an invalid date would leave
  the release order undefined, and an offset would give the plugin page and
  the home page different months. Routed from candidates 2026-10-31; added
  2026-10-26 — M014, M053, M063.
