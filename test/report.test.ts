import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import { code } from "../src/discover/propose.ts";
import { answerReport } from "../src/reports/issue.ts";
import { parseReport, REPORT_LABELS } from "../src/reports/report.ts";
import { fixtureFetch, type Responses } from "./support/fixture-fetch.ts";

const ROOT = resolve(import.meta.dirname, "..");
const PRELOAD = resolve(ROOT, "test/support/preload-fixture.ts");
const IDS = new Set(["alpha@example.org", "beta@example.org"]);
const ISSUE = "https://api.github.com/repos/example/index/issues/7";
const COMMENTS = `${ISSUE}/comments`;

const temps: string[] = [];
afterAll(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// A plugins directory with one entry directory for each id in IDS.
function pluginsDir(): string {
  const root = mkdtempSync(join(tmpdir(), "zpi-report-"));
  temps.push(root);
  for (const id of IDS) mkdirSync(join(root, id));
  return root;
}

// The body GitHub writes for an issue opened from works.yml or broken.yml: the markdown
// block is left out, and each input's label becomes a level-3 heading over the value.
function rendered(values: { plugin?: string; version?: string; zotero?: string }): string {
  return (["plugin", "version", "zotero"] as const)
    .filter((id) => values[id] !== undefined)
    .map((id) => `### ${REPORT_LABELS[id]}\n\n${values[id]}`)
    .join("\n\n");
}

const valid = { plugin: "alpha@example.org", version: "1.2.0", zotero: "7.0.11" };

describe("the report forms", () => {
  test.each([
    ["works.yml", "works"],
    ["broken.yml", "broken"],
  ])("%s has the three required inputs, the labels, and the headings parseReport reads", (file, verdict) => {
    const form = readFileSync(resolve(ROOT, ".github/ISSUE_TEMPLATE", file), "utf8");
    expect(form).toMatch(new RegExp(`^labels: \\["report", "${verdict}"\\]$`, "m"));
    const inputs = form.split(/^ {2}- type: input$/m).slice(1);
    expect(inputs.map((block) => block.match(/^ {4}id: (\w+)$/m)?.[1])).toEqual(["plugin", "version", "zotero"]);
    for (const block of inputs) {
      const id = block.match(/^ {4}id: (\w+)$/m)![1] as keyof typeof REPORT_LABELS;
      expect(block).toMatch(new RegExp(`^ {6}label: ${REPORT_LABELS[id]}$`, "m"));
      expect(block).toMatch(/^ {6}required: true$/m);
    }
  });
});

describe("parseReport", () => {
  test("reads a report from each form, taking the first number of the Zotero version as the major", () => {
    expect(parseReport(rendered(valid), ["report", "works"], IDS)).toEqual({
      ok: true,
      report: { plugin: "alpha@example.org", version: "1.2.0", zoteroMajor: 7, verdict: "works" },
    });
    expect(parseReport(rendered({ ...valid, zotero: "Zotero 10.0.1" }), ["broken", "report"], IDS)).toEqual({
      ok: true,
      report: { plugin: "alpha@example.org", version: "1.2.0", zoteroMajor: 10, verdict: "broken" },
    });
  });

  test.each(["plugin", "version", "zotero"] as const)("names a missing heading for the %s input", (id) => {
    const body = rendered({ ...valid, [id]: undefined });
    expect(parseReport(body, ["report", "works"], IDS)).toEqual({
      ok: false,
      problem: "missing-heading",
      message: expect.stringContaining(`### ${REPORT_LABELS[id]}`),
    });
  });

  test.each(["plugin", "version", "zotero"] as const)("names an empty %s input", (id) => {
    const body = rendered({ ...valid, [id]: "_No response_" });
    expect(parseReport(body, ["report", "works"], IDS)).toEqual({
      ok: false,
      problem: "no-response",
      message: expect.stringContaining(REPORT_LABELS[id]),
    });
  });

  test("names a plugin id that no entry has, without quoting it", () => {
    expect(parseReport(rendered({ ...valid, plugin: "gamma@example.org" }), ["report", "works"], IDS)).toEqual({
      ok: false,
      problem: "unknown-plugin",
      message: "the index has no plugin with that id",
    });
  });

  test.each([
    ["longer than 100 characters", "1".repeat(101)],
    ["with whitespace", "1.2 beta"],
  ])("names a plugin version %s", (_, version) => {
    expect(parseReport(rendered({ ...valid, version }), ["report", "works"], IDS)).toMatchObject({
      ok: false,
      problem: "bad-plugin-version",
    });
  });

  test("takes a plugin version of 100 characters", () => {
    expect(parseReport(rendered({ ...valid, version: "1".repeat(100) }), ["report", "works"], IDS)).toMatchObject({ ok: true });
  });

  test.each([
    ["with no number", "latest"],
    ["below 7", "6.0.30"],
    ["above the newest major with a pill", "11.0"],
  ])("names a Zotero version %s", (_, zotero) => {
    expect(parseReport(rendered({ ...valid, zotero }), ["report", "works"], IDS)).toMatchObject({
      ok: false,
      problem: "bad-zotero-version",
    });
  });

  test.each([
    ["both verdict labels", ["report", "works", "broken"]],
    ["neither verdict label", ["report"]],
  ])("names a label set with %s", (_, labels) => {
    expect(parseReport(rendered(valid), labels, IDS)).toMatchObject({ ok: false, problem: "bad-verdict" });
  });
});

// The issue's API record, and answers to the comment and the close requests.
function issueResponses(body: string, labels: string[]): Responses {
  return {
    [ISSUE]: { json: { number: 7, body, labels: labels.map((name) => ({ name })) } },
    [`POST ${COMMENTS}`]: { status: 201, json: { id: 1 } },
    [`PATCH ${ISSUE}`]: { json: { number: 7, state: "closed" } },
  };
}

// Answers issue 7 against `responses` and returns the result and the requests other than GET.
async function runReport(responses: Responses, root = pluginsDir()) {
  const { fetch, requests } = fixtureFetch(responses);
  const result = await answerReport({ root, fetch, indexRepo: "example/index", issue: 7 });
  const sent = requests.filter((request) => request.method !== "GET").map(({ method, url, body }) => ({ method, url, body: JSON.parse(body ?? "null") }));
  return { result, sent };
}

describe("answering a report issue", () => {
  test("comments the taken report and closes the issue as completed", async () => {
    const { result, sent } = await runReport(issueResponses(rendered(valid), ["report", "works"]));
    expect(result).toMatchObject({ status: 0, errors: [] });
    expect(sent.map(({ method, url }) => `${method} ${url}`)).toEqual([`POST ${COMMENTS}`, `PATCH ${ISSUE}`]);
    const comment: string = sent[0].body.body;
    expect(comment).toContain(code("alpha@example.org"));
    expect(comment).toContain(code("1.2.0"));
    expect(comment).toContain(code("7"));
    expect(comment).toContain("works");
    expect(comment).toContain("only while it reads that plugin version");
    expect(sent[1].body).toEqual({ state: "closed", state_reason: "completed" });
  });

  test("comments the problem and closes the issue as not planned", async () => {
    const { result, sent } = await runReport(issueResponses(rendered({ ...valid, plugin: "gamma@example.org" }), ["report", "broken"]));
    expect(result).toMatchObject({ status: 0, errors: [] });
    expect(sent[0].body.body).toContain("`unknown-plugin`");
    expect(sent[0].body.body).toContain(code("the index has no plugin with that id"));
    expect(sent[0].body.body).not.toContain("gamma@example.org");
    expect(sent[1]).toEqual({ method: "PATCH", url: ISSUE, body: { state: "closed", state_reason: "not_planned" } });
  });

  test("says that the plugin is broken for a broken report", async () => {
    const { sent } = await runReport(issueResponses(rendered(valid), ["report", "broken"]));
    expect(sent[0].body.body).toContain(`${code("1.2.0")} is broken on Zotero ${code("7")}`);
  });

  test("puts a plugin version that holds a backtick and a Markdown link in a code span", async () => {
    const version = "[x](https://evil.example)`";
    const { sent } = await runReport(issueResponses(rendered({ ...valid, version }), ["report", "works"]));
    const comment: string = sent[0].body.body;
    expect(comment).toContain(code(version));
    expect(comment.replace(code(version), "")).not.toContain("https://evil.example");
  });

  test("sends nothing and fails when the issue read fails", async () => {
    const { result, sent } = await runReport({ ...issueResponses(rendered(valid), ["report", "works"]), [ISSUE]: { status: 503 } });
    expect(result.status).toBe(1);
    expect(result.errors[0]).toContain("HTTP 503");
    expect(sent).toEqual([]);
  });

  test("sends nothing and fails when the entry ids cannot be read", async () => {
    const { result, sent } = await runReport(issueResponses(rendered(valid), ["report", "works"]), join(pluginsDir(), "missing"));
    expect(result.status).toBe(1);
    expect(result.errors[0]).toContain("ENOENT");
    expect(sent).toEqual([]);
  });

  test("sends no close and fails when the comment request fails", async () => {
    const responses = { ...issueResponses(rendered(valid), ["report", "works"]), [`POST ${COMMENTS}`]: { status: 500, json: { message: "boom" } } };
    const { result, sent } = await runReport(responses);
    expect(result.status).toBe(1);
    expect(result.errors[0]).toContain("HTTP 500");
    expect(sent.map(({ method }) => method)).toEqual(["POST"]);
  });

  test("fails when the close request fails after the comment", async () => {
    const responses = { ...issueResponses(rendered(valid), ["report", "works"]), [`PATCH ${ISSUE}`]: { status: 500, json: { message: "boom" } } };
    const { result, sent } = await runReport(responses);
    expect(result.status).toBe(1);
    expect(result.errors[0]).toContain(`PATCH ${ISSUE} returned HTTP 500`);
    expect(sent.map(({ method }) => method)).toEqual(["POST", "PATCH"]);
  });
});

// Runs `pnpm report-issue` for issue 7 of example/index against `responses`, and returns
// the result and the requests other than GET that the command sent.
function pnpmReport(responses: Responses) {
  const pnpmPath = process.env.npm_execpath;
  if (!pnpmPath) throw new Error("run the tests with `pnpm test`, so they can call pnpm");
  const dir = mkdtempSync(join(tmpdir(), "zpi-report-cli-"));
  temps.push(dir);
  const fixture = join(dir, "responses.json");
  const log = join(dir, "requests.jsonl");
  writeFileSync(fixture, JSON.stringify({ source: "report test", repoUrl: "", responses }));
  writeFileSync(log, "");
  const { INIT_CWD: _outer, GITHUB_TOKEN: _token, ...outer } = process.env;
  Object.assign(outer, { ZPI_FIXTURE: fixture, ZPI_REQUESTS: log, NODE_OPTIONS: `--import=${PRELOAD}`, GITHUB_REPOSITORY: "example/index", ISSUE_NUMBER: "7" });
  const result = spawnSync(pnpmPath, ["--silent", "--dir", ROOT, "report-issue"], { cwd: dir, encoding: "utf8", env: outer, timeout: 50_000 });
  const sent = readFileSync(log, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter(({ method }) => method !== "GET");
  return { result, sent };
}

describe("pnpm report-issue", () => {
  // A real entry, since the command reads the entry ids from the repo's plugins directory.
  const plugin = readdirSync(resolve(ROOT, "plugins"), { withFileTypes: true }).find((entry) => entry.isDirectory() && !entry.name.startsWith("."))!.name;

  test("closes a valid report as completed and exits 0", () => {
    const { result, sent } = pnpmReport(issueResponses(rendered({ ...valid, plugin }), ["report", "works"]));
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(sent.map(({ method, url }) => `${method} ${url}`)).toEqual([`POST ${COMMENTS}`, `PATCH ${ISSUE}`]);
    expect(JSON.parse(sent[1].body)).toEqual({ state: "closed", state_reason: "completed" });
  });

  test("exits 1 when the close request fails", () => {
    const responses = { ...issueResponses(rendered({ ...valid, plugin }), ["report", "works"]), [`PATCH ${ISSUE}`]: { status: 500, json: { message: "boom" } } };
    const { result } = pnpmReport(responses);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`PATCH ${ISSUE} returned HTTP 500`);
  });
});
