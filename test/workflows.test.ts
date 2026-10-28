import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const ROOT = resolve(import.meta.dirname, "..");
const BUILD = resolve(ROOT, ".github/workflows/build.yml");
const REPORT = resolve(ROOT, ".github/workflows/report-issue.yml");
const CLOSE = resolve(ROOT, ".github/workflows/close-add-plugin-issue.yml");
const ADD = resolve(ROOT, ".github/workflows/add-plugin-issue.yml");
const DISCOVER = resolve(ROOT, ".github/workflows/discover.yml");

// Each line of a workflow, other than a comment line, that uses an actions/cache action or
// sets a `cache` key, in block or flow form. An inline comment stays in its line, so a
// value that holds ` #` cannot hide a key after it. GitHub hands an input to a JavaScript
// or Docker action as an upper-case `INPUT_<NAME>` variable, so the key match ignores
// case. The `uses` match ignores case too, as a precaution: GitHub's docs do not say how
// it matches action names.
function cacheLines(text: string): string[] {
  const uses = /uses\s*:\s*["']?actions\/cache(?:\/(?:restore|save))?@/i;
  const key = /(?:^|[\s{,])["']?cache["']?\s*:/i;
  return text
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("#"))
    .filter((line) => uses.test(line) || key.test(line));
}

// Each use of the event in a `${{ }}` expression or an `if:` value, which GitHub reads as
// an expression without the braces, other than the uses in `allowed`: the body, the
// title, or the whole event, and a bare `github`, which holds the event too.
function otherEventUses(text: string, allowed: string[]): string[] {
  const expressions = [
    ...[...text.matchAll(/\$\{\{([\s\S]*?)\}\}/g)].map(([, inner]) => inner),
    ...[...text.matchAll(/^\s*if\s*:(.*)$/gm)].map(([, value]) => value),
  ];
  return expressions.flatMap((inner) =>
    [...inner.matchAll(/\bgithub\b(?:\s*(?:\.\s*[\w-]+|\[[^\]]*\]))*/g)]
      .map(([use]) => use.replace(/\s/g, ""))
      .filter((use) => /^github(?:$|\.event\b|\[["']event["']\])/.test(use))
      .filter((use) => !allowed.includes(use)),
  );
}

// The text of one job, from its `  <id>:` line to the next job's.
function jobText(text: string, id: string): string {
  const start = text.indexOf(`\n  ${id}:\n`);
  const next = text.slice(start + 1).search(/\n {2}[\w-]+:\n/);
  return next < 0 ? text.slice(start) : text.slice(start, start + 1 + next);
}

describe("build.yml", () => {
  const build = readFileSync(BUILD, "utf8");

  test("has no cache step and no cache key", () => {
    expect(cacheLines(build)).toEqual([]);
  });

  test("gives the build job contents read and issues read, and no other permission", () => {
    expect(jobText(build, "build")).toMatch(/^ {4}permissions:\n {6}contents: read\n {6}issues: read\n {4}\S/m);
  });

  test.each(["build", "start-test", "site"])("sets cache-mode none on the %s job", (job) => {
    expect(jobText(build, job)).toMatch(/^ {4}cache-mode: none$/m);
  });

  test("gives the start-test job no permission, no secret, and no stored git credentials", () => {
    const job = jobText(build, "start-test");
    expect(job).toMatch(/^ {4}permissions: \{\}$/m);
    expect(job).not.toMatch(/secrets/);
    expect(job).toMatch(/- uses: actions\/checkout@v7\n {8}with:\n {10}persist-credentials: false\n/);
  });

  test("checks each Zotero download against the SHA-256 of its matrix line", () => {
    const job = jobText(build, "start-test");
    const hashes = [...job.matchAll(/^ {12}sha256: (\S+)$/gm)].map(([, hash]) => hash);
    expect(hashes).toHaveLength(4);
    for (const hash of hashes) expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(job).toContain('echo "$ZOTERO_SHA256  $RUNNER_TEMP/$ZOTERO_FILE" | sha256sum --check');
  });

  test("runs the site job after a build that succeeded, whatever the start tests did, and deploys only after the site job", () => {
    const site = jobText(build, "site");
    expect(site).toMatch(/^ {4}needs: \[build, start-test\]$/m);
    expect(site).toMatch(/^ {4}if: \$\{\{ !cancelled\(\) && needs\.build\.result == 'success' \}\}$/m);
    expect(jobText(build, "deploy")).toMatch(/^ {4}needs: site$/m);
  });

  test.each([
    ["a block cache key", "          cache: pnpm"],
    ["a flow cache key", "        with: {node-version: 24,cache: pnpm}"],
    ["a quoted cache key", '        with: {"cache": pnpm}'],
    ["actions/cache", "      - uses: actions/cache@v6"],
    ["actions/cache/restore", "      - uses: actions/cache/restore@v6"],
    ["actions/cache/save", "      - uses: Actions/Cache/Save@v6"],
  ])("finds %s", (_name, line) => {
    expect(cacheLines(`steps:\n${line}\n`)).toEqual([line]);
  });

  test("leaves other keys and comments alone", () => {
    const text = [
      "          package-manager-cache: false",
      "          cache-dependency-path: pnpm-lock.yaml",
      "      # No dependency cache: cache: pnpm would restore one.",
      "      - uses: actions/upload-artifact@v7",
    ].join("\n");
    expect(cacheLines(text)).toEqual([]);
  });
});

// The `on:` block of a workflow without its comment lines.
function triggers(text: string): string | undefined {
  return text
    .match(/^on:\n((?: .*\n|\n)*?)(?=^\S)/m)?.[1]
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n")
    .trim();
}

// The top-level `concurrency:` block of a workflow, up to the next line that is not
// indented, and each line that sets a `concurrency` key at any level, quoted or not.
function concurrency(text: string): { block: string | undefined; keys: string[] } {
  return {
    block: text.match(/^concurrency:\n(?: .*\n)*/m)?.[0],
    keys: text.split("\n").filter((line) => /^\s*["']?concurrency["']?\s*:/i.test(line)),
  };
}

describe("report-issue.yml", () => {
  const report = readFileSync(REPORT, "utf8");
  const ISSUE_USES = ["github.event.issue.number", "github.event.issue.labels", "github.event.repository.default_branch"];
  const answer = jobText(report, "answer");

  test("runs on opened issues, daily, and on dispatch, and its one job for the label report or a sweep from the default branch", () => {
    expect(triggers(report)).toBe('issues:\n    types: [opened]\n  schedule:\n    - cron: "13 3 * * *"\n  workflow_dispatch:');
    expect(report.slice(report.indexOf("\njobs:\n")).match(/^ {2}[\w-]+:$/gm)).toEqual(["  answer:"]);
    expect(answer.match(/^ {4}if:.*$/gm)).toEqual([
      "    if: (github.event_name == 'issues' && contains(github.event.issue.labels.*.name, 'report')) || github.event_name == 'schedule' || (github.event_name == 'workflow_dispatch' && github.ref == format('refs/heads/{0}', github.event.repository.default_branch))",
    ]);
  });

  test("gives the job contents read, issues write, and actions read, and no other permission", () => {
    expect(report).toMatch(/^permissions: \{\}$/m);
    expect(answer).toMatch(/^ {4}permissions:\n {6}contents: read\n {6}issues: write\n {6}actions: read\n {4}\S/m);
  });

  test("restores no cache", () => {
    expect(answer).toMatch(/^ {4}cache-mode: none$/m);
    expect(cacheLines(report)).toEqual([]);
  });

  // A report run's own group shares it with no other run; the sweeps share one group, and
  // a dispatch from another ref, which runs no job, takes a group of its own.
  test("puts each report run in a group of its own and the sweeps in one group", () => {
    expect(report.split("\n").filter((line) => !line.trimStart().startsWith("#") && /concurrency\s*:/.test(line))).toEqual(["concurrency:"]);
    expect(report).toContain(
      "\nconcurrency:\n  group: ${{ github.event_name == 'issues' && format('report-{0}', github.run_id) || github.event_name == 'workflow_dispatch' && github.ref != format('refs/heads/{0}', github.event.repository.default_branch) && format('report-skipped-{0}', github.run_id) || 'report-sweep' }}\n  cancel-in-progress: false\n",
    );
  });

  test("passes the issue number through env, and no other part of the event", () => {
    expect(answer).toMatch(/^ {8}env:\n(?: {10}\S.*\n)* {10}ISSUE_NUMBER: \$\{\{ github\.event\.issue\.number \}\}$/m);
    expect(otherEventUses(report, ISSUE_USES)).toEqual([]);
  });

  // The build counts only reports closed by github-actions[bot], the GITHUB_TOKEN's account.
  test("runs pnpm report-issue for an opened issue and pnpm report-issue --sweep otherwise, each with the built-in GITHUB_TOKEN", () => {
    expect(answer).toMatch(
      /^ {6}- if: github\.event_name == 'issues'\n {8}run: pnpm report-issue\n {8}env:\n {10}GITHUB_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}\n {10}ISSUE_NUMBER: \$\{\{ github\.event\.issue\.number \}\}\n/m,
    );
    expect(answer).toMatch(/^ {6}- if: github\.event_name != 'issues'\n {8}run: pnpm report-issue --sweep\n {8}env:\n {10}GITHUB_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}\n?$/m);
  });

  test.each([
    ["the body", "${{ github.event.issue.body }}", "github.event.issue.body"],
    ["the title", "${{github.event.issue.title}}", "github.event.issue.title"],
    ["an index", "${{ github.event['issue'].body }}", "github.event['issue'].body"],
    ["the whole event", "${{ toJSON(github.event) }}", "github.event"],
    ["the body inside a format string with braces", "${{ format('{0}', github.event.issue.body) }}", "github.event.issue.body"],
    ["an index on the context", "${{ github['event'].issue.body }}", "github['event'].issue.body"],
    ["the whole context", "${{ toJSON(github) }}", "github"],
  ])("finds an expression that uses %s", (_name, line, use) => {
    expect(otherEventUses(`run: echo "${line}"`, ISSUE_USES)).toEqual([use]);
  });

  test("finds the body in an if: value without braces", () => {
    expect(otherEventUses("    if: contains(github.event.issue.body, 'x')\n", ISSUE_USES)).toEqual(["github.event.issue.body"]);
  });

  test("leaves other contexts alone", () => {
    expect(otherEventUses("run: echo ${{ github.repository }} ${{ github.event_name }} ${{ secrets.GITHUB_TOKEN }}\n", ISSUE_USES)).toEqual([]);
  });
});

describe("add-plugin-issue.yml", () => {
  const add = readFileSync(ADD, "utf8");
  const [pick, read, write] = ["pick", "read", "write"].map((id) => jobText(add, id));
  const LOOP_ENV = / {8}env:\n {10}GITHUB_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}\n {10}ISSUES: \$\{\{ needs\.pick\.outputs\.issues \}\}\n/;

  test("runs on opened issues, daily, and on dispatch, and its pick job for the label add-plugin or a sweep from the default branch", () => {
    expect(triggers(add)).toBe('issues:\n    types: [opened]\n  schedule:\n    - cron: "43 2 * * *"\n  workflow_dispatch:');
    expect(add.slice(add.indexOf("\njobs:\n")).match(/^ {2}[\w-]+:$/gm)).toEqual(["  pick:", "  read:", "  write:"]);
    expect(pick.match(/^ {4}if:.*$/gm)).toEqual([
      "    if: (github.event_name == 'issues' && contains(github.event.issue.labels.*.name, 'add-plugin')) || github.event_name == 'schedule' || (github.event_name == 'workflow_dispatch' && github.ref == format('refs/heads/{0}', github.event.repository.default_branch))",
    ]);
  });

  test("queues the runs whose pick job can run in the discover group, and gives each other run a group of its own", () => {
    expect(concurrency(add)).toEqual({
      block:
        "concurrency:\n  group: ${{ (github.event_name == 'issues' && !contains(github.event.issue.labels.*.name, 'add-plugin') || github.event_name == 'workflow_dispatch' && github.ref != format('refs/heads/{0}', github.event.repository.default_branch)) && format('add-plugin-skipped-{0}', github.run_id) || 'discover' }}\n  cancel-in-progress: false\n  queue: max\n",
      keys: ["concurrency:"],
    });
  });

  test("tests the label in the group with the same text as the pick job", () => {
    const label = pick.match(/github\.event_name == 'issues' && (contains\([^)]*\))/)?.[1];
    expect(label).toBeDefined();
    expect(concurrency(add).block).toContain(`github.event_name == 'issues' && !${label}`);
  });

  test("gives each job only the permissions its steps use", () => {
    expect(add).toMatch(/^permissions: \{\}$/m);
    expect(pick).toMatch(/^ {4}permissions:\n {6}contents: read\n {6}issues: read\n {6}actions: read\n {4}\S/m);
    expect(read).toMatch(/^ {4}permissions:\n {6}contents: read\n {6}pull-requests: read\n {6}issues: read\n {4}\S/m);
    expect(write).toMatch(/^ {4}permissions:\n {6}contents: write\n {6}pull-requests: write\n {6}issues: write\n {4}\S/m);
  });

  test("restores no cache in any job", () => {
    for (const job of [pick, read, write]) expect(job).toMatch(/^ {4}cache-mode: none$/m);
    expect(cacheLines(add)).toEqual([]);
  });

  test("picks the event's issue, or up to 3 unanswered add-plugin issues for a sweep", () => {
    expect(pick).toMatch(/^ {4}outputs:\n {6}issues: \$\{\{ steps\.event\.outputs\.issues \|\| steps\.sweep\.outputs\.issues \}\}$/m);
    expect(pick).toMatch(
      /^ {6}- id: event\n {8}if: github\.event_name == 'issues'\n {8}run: echo "issues=\$ISSUE_NUMBER" >> "\$GITHUB_OUTPUT"\n {8}env:\n {10}ISSUE_NUMBER: \$\{\{ github\.event\.issue\.number \}\}$/m,
    );
    expect(pick).toMatch(
      /^ {6}- id: sweep\n {8}if: github\.event_name != 'issues'\n {8}run: \|\n {10}issues=\$\(pnpm --silent unanswered-issues --label add-plugin --workflow add-plugin-issue\.yml --limit 3\)\n/m,
    );
  });

  test("runs pnpm discover-issue and pnpm propose once for each picked number, in ISSUE_NUMBER, and fails after the rest when one fails", () => {
    expect(read).toMatch(/^ {4}needs: pick\n {4}if: needs\.pick\.outputs\.issues != ''$/m);
    expect(write).toMatch(/^ {4}needs: \[pick, read\]$/m);
    for (const [job, command] of [
      [read, 'pnpm discover-issue --handoff "handoff/$issue"'],
      [write, 'pnpm propose "handoff/$issue"'],
    ]) {
      const loop = `      - run: |\n          status=0\n          for issue in $ISSUES; do\n            ISSUE_NUMBER="$issue" ${command} || status=1\n          done\n          exit "$status"\n`;
      expect(job).toContain(loop);
      expect(job.slice(job.indexOf(loop) + loop.length)).toMatch(new RegExp(`^${LOOP_ENV.source}`));
    }
    expect(read).toMatch(/hashFiles\('handoff\/\*\/plan\.json'\)/);
  });

  test("passes issue numbers only through env, and the read and write jobs take them only from the pick job", () => {
    expect(otherEventUses(add, ["github.event.issue.number", "github.event.issue.labels", "github.event.repository.default_branch"])).toEqual([]);
    for (const job of [read, write]) {
      expect(otherEventUses(job, [])).toEqual([]);
      expect([...job.matchAll(/\$\{\{[^}]*\}\}/g)].map(([use]) => use).filter((use) => /issue/i.test(use))).toEqual(["${{ needs.pick.outputs.issues }}"]);
    }
    expect(add).not.toMatch(/ISSUE_BODY|issue\.body/);
  });
});

describe("discover.yml", () => {
  const discover = readFileSync(DISCOVER, "utf8");

  test("queues its runs in the discover group", () => {
    expect(concurrency(discover)).toEqual({
      block: "concurrency:\n  group: discover\n  cancel-in-progress: false\n  queue: max\n",
      keys: ["concurrency:"],
    });
  });
});

describe("close-add-plugin-issue.yml", () => {
  const close = readFileSync(CLOSE, "utf8");
  const job = jobText(close, "close");

  test("runs on closed pull requests through pull_request_target only, and its one job only for a bot branch closed without a merge", () => {
    expect(close.match(/^on:\n((?: .*\n|\n)*?)(?=^\S)/m)?.[1].trim()).toBe("pull_request_target:\n    types: [closed]");
    expect(close.slice(close.indexOf("\njobs:\n")).match(/^ {2}[\w-]+:$/gm)).toEqual(["  close:"]);
    expect(job.match(/^ {4}if:.*$/gm)).toEqual([
      "    if: github.event.pull_request.merged == false && startsWith(github.event.pull_request.head.ref, 'discover/') && github.event.pull_request.head.repo.full_name == github.repository",
    ]);
  });

  test("gives the job contents read, issues write, and pull-requests read, and no other permission", () => {
    expect(close).toMatch(/^permissions: \{\}$/m);
    expect(job).toMatch(/^ {4}permissions:\n {6}contents: read\n {6}issues: write\n {6}pull-requests: read\n {4}\S/m);
  });

  test("restores no cache", () => {
    expect(job).toMatch(/^ {4}cache-mode: none$/m);
    expect(cacheLines(close)).toEqual([]);
  });

  test("checks out the default branch with no stored credentials", () => {
    expect(job).toMatch(/^ {6}- uses: actions\/checkout@v7\n {8}with:\n {10}persist-credentials: false\n {6}- /m);
    expect(close.split("\n").filter((line) => !line.trimStart().startsWith("#") && /\bref\s*:/.test(line))).toEqual([]);
  });

  test("runs one job at a time for each pull request", () => {
    expect(close).toMatch(/^concurrency:\n {2}group: close-add-plugin-issue-\$\{\{ github\.event\.pull_request\.number \}\}\n {2}cancel-in-progress: false\n/m);
  });

  test("passes the token and the pull request number to pnpm close-issue only through env", () => {
    expect(job).toMatch(
      /^ {6}- run: pnpm close-issue\n {8}env:\n {10}GITHUB_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}\n {10}PR_NUMBER: \$\{\{ github\.event\.pull_request\.number \}\}\n?$/m,
    );
    expect([...close.matchAll(/^.*\$\{\{.*$/gm)].map(([line]) => line.trim())).toEqual([
      "group: close-add-plugin-issue-${{ github.event.pull_request.number }}",
      "GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}",
      "PR_NUMBER: ${{ github.event.pull_request.number }}",
    ]);
  });

  test("uses no field of the pull request other than its number, merged, and head branch and repo", () => {
    const allowed = ["number", "merged", "head.ref", "head.repo.full_name"].map((field) => `github.event.pull_request.${field}`);
    expect(otherEventUses(close, allowed)).toEqual([]);
    expect(otherEventUses("run: echo ${{ github.event.pull_request.head.sha }} ${{ github.event.pull_request.title }}\n", allowed)).toEqual([
      "github.event.pull_request.head.sha",
      "github.event.pull_request.title",
    ]);
  });
});
