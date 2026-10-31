import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { Ajv } from "ajv";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import pluginsSchema from "../schemas/plugins.v1.schema.json" with { type: "json" };
import {
  displayName,
  githubRepo,
  homeOrder,
  majorReport,
  pluginHref,
  rangeText,
  reportHref,
  safeHref,
  starsText,
  type PluginRecord,
} from "../site/src/data.ts";
import type { PluginsFile } from "../src/build/build.ts";
import { CATEGORIES, categories } from "../src/site/categories.ts";
import { shownDescription } from "../src/site/description.ts";
import { PAGE_SIZE, prePaintStyle } from "../src/site/home-filter.ts";
import { appliedLanguages, languageName } from "../src/site/languages.ts";
import { START_LIMIT_MS } from "../src/start-test/start-test.ts";
import { compareVersions, declaredRange, majorSupport, ZOTERO_MAJORS } from "../src/site/version.ts";
import { PRE_PAINT_CASES } from "./support/pre-paint.ts";

const ROOT = resolve(import.meta.dirname, "..");
const FIXTURE = resolve(ROOT, "test/fixtures/site/plugins.json");
const DATA_FILES = ["v1/plugins.json", "schemas/plugins.v1.schema.json", "schemas/index.v1.schema.json"];
const fixture = JSON.parse(readFileSync(FIXTURE, "utf8")) as { plugins: { id: string }[] };
const ids = fixture.plugins.map((plugin) => plugin.id);

let out: string;
let before: Map<string, Buffer>;
let result: ReturnType<typeof spawnSync>;

// pnpm sets npm_execpath to its own binary when it runs `pnpm test`.
function pnpmSite(args: string[]) {
  const pnpmPath = process.env.npm_execpath;
  if (!pnpmPath) throw new Error("run the tests with `pnpm test`, so they can call pnpm");
  const { INIT_CWD: _outer, ...env } = process.env;
  // A zone behind UTC, so a release date written in local time shows the wrong month here.
  return spawnSync(pnpmPath, ["--silent", "--dir", ROOT, "site", ...args], {
    encoding: "utf8",
    env: { ...env, TZ: "America/New_York" },
    timeout: 50_000,
  });
}

// An out directory holding data, for the failure cases.
function outWith(data: string): string {
  const dir = mkdtempSync(join(tmpdir(), "zpi-site-fail-"));
  temps.push(dir);
  mkdirSync(join(dir, "v1"));
  writeFileSync(join(dir, "v1/plugins.json"), data);
  return dir;
}

const temps: string[] = [];

function htmlFiles(dir: string): string[] {
  return (readdirSync(dir, { recursive: true }) as string[]).filter((path) => path.endsWith(".html"));
}

beforeAll(() => {
  out = mkdtempSync(join(tmpdir(), "zpi-site-test-"));
  mkdirSync(join(out, "v1"));
  cpSync(FIXTURE, join(out, "v1/plugins.json"));
  cpSync(resolve(ROOT, "schemas"), join(out, "schemas"), { recursive: true });
  // A page left by an earlier build, for a plugin the data no longer lists.
  mkdirSync(join(out, "plugins/removed-plugin@example.org"), { recursive: true });
  writeFileSync(join(out, "plugins/removed-plugin@example.org/index.html"), "<p>old</p>");
  before = new Map(DATA_FILES.map((file) => [file, readFileSync(join(out, file))]));
  result = pnpmSite(["--out", out]);
}, 120_000);

afterAll(() => {
  if (out) rmSync(out, { recursive: true, force: true });
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("pnpm site", () => {
  test("the site fixture is valid against the v1 schema", () => {
    const validate = new Ajv({ allErrors: true }).compile(pluginsSchema);
    expect(validate(fixture), JSON.stringify(validate.errors)).toBe(true);
    expect(ids).toContain("first-plugin@example.org");
    expect(ids.some((id) => /^\{[0-9a-f-]+\}$/.test(id))).toBe(true);    expect(fixture.plugins.some((plugin) => "failure" in plugin)).toBe(true);
  });

  test("exits 0", () => {
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  test("writes the home page, the About page, and one page for each record under its raw id", () => {
    expect(existsSync(join(out, "index.html"))).toBe(true);
    expect(readdirSync(join(out, "about"))).toEqual(["index.html"]);
    expect(readdirSync(join(out, "plugins")).sort()).toEqual([...ids].sort());
    for (const id of ids) expect(readdirSync(join(out, "plugins", id))).toEqual(["index.html"]);
  });

  test("leaves the data and schema files byte-identical", () => {
    for (const [file, bytes] of before) expect(readFileSync(join(out, file)).equals(bytes), file).toBe(true);
  });

  test("starts every link inside the site with the Pages path", () => {
    const files = htmlFiles(out);
    expect(files).toHaveLength(ids.length + 2);
    const inside = files.flatMap((file) =>
      [...readFileSync(join(out, file), "utf8").matchAll(/\s(?:href|src)="([^"]*)"/g)]
        .map((match) => match[1]!)
        .filter((url) => !/^[a-z][a-z0-9+.-]*:/i.test(url))
        .map((url) => ({ file, url })),
    );
    // Each plugin page links home, and the home page links each plugin page.
    expect(inside.length).toBeGreaterThanOrEqual(2 * ids.length);
    expect(inside.filter(({ url }) => !url.startsWith("/zotero-plugin-index/"))).toEqual([]);
  });
});

function fact(html: string, name: string): string | undefined {
  const match = new RegExp(`data-fact="${name}"[^>]*>(.*?)</(?:p|dd|li|span)>`).exec(html);
  return match?.[1]!.replace(/<[^>]+>/g, "");
}

const page = (id: string) => readFileSync(join(out, "plugins", id, "index.html"), "utf8");
const home = () => readFileSync(join(out, "index.html"), "utf8");
const records = (fixture as unknown as PluginsFile).plugins;
// The failure records whose repo URL each break one part of the repo line's URL form, in
// home table order.
const NO_REPO_LINE_IDS = [
  "repo-fragment@example.org",
  "repo-gitlab@example.org",
  "repo-http@example.org",
  "repo-owner-query@example.org",
  "repo-path@example.org",
  "repo-query@example.org",
];

// Text as Astro writes it into the page.
function escaped(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Text as the browser reads it from the page.
function unescaped(html: string): string {
  return html.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
}

function hasBound(record: PluginRecord): boolean {
  const { min, max } = declaredRange(record);
  return min !== undefined || max !== undefined;
}

// Each marker is found, after the one before it.
function expectInOrder(html: string, markers: string[]): void {
  let last = -1;
  for (const marker of markers) {
    const at = html.indexOf(marker, last + 1);
    expect(at, marker).toBeGreaterThan(last);
    last = at;
  }
}

interface CompatRow {
  major: string;
  declared: string;
  // The declared cell's text for screen readers, which the visible mark and word hide from them.
  spoken?: string;
  cells: string[];
}

const HIDDEN = /<span class="visually-hidden">([^<]*)<\/span>/;

// The rows of a page's compatibility table, or undefined when the page has none: each row's
// major, its declared kind and spoken text, and the visible text of its declared, start, and
// reports cells.
function compatRows(html: string): CompatRow[] | undefined {
  const table = /<table class="compat-table">(.*?)<\/table>/s.exec(html)?.[1];
  if (table === undefined) return undefined;
  const text = (cell: string) => unescaped(cell.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  const row =
    /<tr data-major="([^"]+)">\s*<th scope="row">([^<]*)<\/th>\s*<td data-declared="([^"]+)">(.*?)<\/td>\s*<td data-start-cell>(.*?)<\/td>\s*<td data-reports-cell>(.*?)<\/td>\s*<\/tr>/gs;
  const rows = [...table.matchAll(row)].map(([, major, heading, declared, declaredCell, ...cells]) => {
    expect(heading).toBe(major);
    const spoken = HIDDEN.exec(declaredCell!)?.[1];
    if (spoken !== undefined) {
      // Outside the hidden text, the cell holds only spans hidden from screen readers.
      expect(declaredCell!.replace(HIDDEN, "").match(/<span(?![^>]*aria-hidden="true")[^>]*>/g)).toBeNull();
    }
    const visible = text(declaredCell!.replace(HIDDEN, ""));
    return { major: major!, declared: declared!, ...(spoken === undefined ? {} : { spoken: unescaped(spoken) }), cells: [visible, ...cells.map((cell) => text(cell!))] };
  });
  expect(table.split("<tr data-major=").length - 1).toBe(rows.length);
  return rows;
}

const DECLARED_CELL: Record<string, string> = { all: "✓ Yes", some: "◐ Partly", none: "– No" };
const START_CELL: Record<string, string> = {
  started: "● Started",
  "start-error": "✕ Failed at startup",
  "not-installed": "✕ Did not install",
  "timed-out": "✕ Gave no answer in time",
};

// The rows a record's table holds: each major of ZOTERO_MAJORS and each major its reports or
// start results name, newest first, with the newest start result of each major.
function expectedRows(record: PluginRecord): CompatRow[] {
  const majorOf = (zotero: string) => zotero.split(".")[0]!;
  const majors = new Set([
    ...ZOTERO_MAJORS,
    ...(record.reports ?? []).map(({ zoteroMajor }) => String(zoteroMajor)),
    ...(record.startTests ?? []).map(({ zotero }) => majorOf(zotero)),
  ]);
  return [...majors]
    .sort((a, b) => Number(b) - Number(a))
    .map((major) => {
      const support = majorSupport(record, major);
      const start = (record.startTests ?? []).filter(({ zotero }) => majorOf(zotero) === major).sort((a, b) => compareVersions(b.zotero, a.zotero))[0];
      const report = record.reports?.find(({ zoteroMajor }) => String(zoteroMajor) === major);
      const spoken =
        support === "all"
          ? `Declares all of Zotero ${major}`
          : support === "some"
            ? `Declares part of Zotero ${major}. Declared range: ${rangeText(record)}`
            : support === "none"
              ? `Does not declare Zotero ${major}`
              : undefined;
      return {
        major,
        declared: support ?? "no-range",
        ...(spoken === undefined ? {} : { spoken }),
        cells: [
          support ? DECLARED_CELL[support]! : "No range",
          start ? `${START_CELL[start.result]} Zotero ${start.zotero}` : "Not tested",
          report ? `${report.works} works ${report.broken} broken` : "None yet",
        ],
      };
    });
}

describe("the site fixture", () => {
  test("holds each shape of row and page", () => {
    const bounded = records.filter((record) => !record.failure && hasBound(record));
    expect(records.some((record) => record.failure)).toBe(true);
    expect(records.some((record) => !record.failure && !hasBound(record))).toBe(true);
    expect(records.some((record) => record.upstream?.archived === true)).toBe(true);
    expect(records.some((record) => record.upstream?.description && !shownDescription(record))).toBe(true);
    expect(records.some((record) => record.overrides.some((o) => o.field === "description"))).toBe(true);
    for (const support of ["all", "some", "none"]) {
      expect(bounded.some((record) => ZOTERO_MAJORS.some((major) => majorSupport(record, major) === support)), support).toBe(true);
    }
    expect(records.some((record) => (record.reports?.length ?? 0) > 0)).toBe(true);
    expect(records.some((record) => record.upstream && record.reports?.length === 0)).toBe(true);
    expect(records.some((record) => record.upstream && !("reports" in record))).toBe(true);
    const extra = (majors: string[]) => majors.some((major) => !ZOTERO_MAJORS.includes(major));
    expect(records.some((record) => (record.reports ?? []).some(({ zoteroMajor }) => zoteroMajor === 11))).toBe(true);
    expect(records.some((record) => extra((record.startTests ?? []).map(({ zotero }) => zotero.split(".")[0]!)))).toBe(true);
    const majors = (record: PluginRecord) => (record.startTests ?? []).map(({ zotero }) => zotero.split(".")[0]);
    expect(records.some((record) => majors(record).some((major, i) => majors(record).indexOf(major) !== i))).toBe(true);
  });

  test("holds each shape of home table row", () => {
    const names = records.map(displayName);
    expect(
      names.some((a, i) => names.some((b, j) => i !== j && a !== b && a.localeCompare(b, "en", { sensitivity: "base" }) === 0)),
    ).toBe(true);
    expect(
      records.some((record) => {
        const declared = ZOTERO_MAJORS.filter((major) => majorSupport(record, major) === "all");
        const tested = new Set((record.startTests ?? []).map(({ zotero }) => zotero.split(".")[0]));
        return declared.some((major) => tested.has(major)) && declared.some((major) => !tested.has(major));
      }),
    ).toBe(true);
    expect(records.some((record) => new Set(appliedLanguages(record).map((tag) => new Intl.Locale(tag).language)).size >= 4)).toBe(true);
    expect(records.some((record) => record.upstream?.xpiUrl && safeHref(record.upstream.xpiUrl))).toBe(true);
    expect(records.some((record) => record.upstream?.xpiUrl && !safeHref(record.upstream.xpiUrl))).toBe(true);
    expect(records.some((record) => record.upstream && record.upstream.xpiUrl === undefined)).toBe(true);
    expect(records.some((record) => !safeHref(record.upstream?.repoUrl ?? record.repoUrl))).toBe(true);
  });
});

// The href of the report link `verdict` in a page, with the HTML escapes undone.
function reportLink(html: string, verdict: string): string | undefined {
  const href = new RegExp(`<a data-report="${verdict}" href="([^"]*)"`).exec(html)?.[1];
  return href?.replace(/&amp;/g, "&");
}

describe("the compatibility table", () => {
  test.each(ids)("shows the table of %s, or the failure of a record that was not read", (id) => {
    const record = records.find((r) => r.id === id)!;
    const section = sections(page(id)).find(({ name }) => name === "compatibility")!;
    expect(section.heading).toBe("Zotero compatibility");
    if (record.upstream) {
      expect(compatRows(section.body)).toEqual(expectedRows(record));
      expect(fact(section.body, "read-version")).toBe(`For version ${escaped(record.upstream.version)}, the release the index read`);
      expect(section.body).not.toContain('data-fact="failure"');
    } else {
      expect(compatRows(section.body)).toBeUndefined();
      expect(unescaped(fact(section.body, "failure")!)).toBe(
        `The last build could not read this plugin: ${record.failure!.name}: ${record.failure!.message}`,
      );
    }
  });

  test("adds a row for each other major that reports or start results name, newest first, with the newest start result of a major", () => {
    const next = compatRows(page("next-plugin@example.org"))!;
    expect(next.map(({ major }) => major)).toEqual(["12", "11", "10", "9", "8", "7"]);
    const cells = (major: string) => next.find((row) => row.major === major)!.cells;
    expect(cells("12")).toEqual(["– No", "✕ Did not install Zotero 12.0.1", "None yet"]);
    expect(cells("11")).toEqual(["✓ Yes", "Not tested", "2 works 1 broken"]);
    expect(cells("8")).toEqual(["✓ Yes", "● Started Zotero 8.0.4", "1 works 0 broken"]);
    expect(cells("7")).toEqual(["– No", "Not tested", "None yet"]);
    expect(compatRows(page("a-cafe@example.org"))!.find((row) => row.major === "8")!.cells[1]).toBe("● Started Zotero 8.0.10");
  });

  test("tells screen readers how much of a major the range declares, with the range for part of one", () => {
    const spoken = compatRows(page("min-only-plugin@example.org"))!.map(({ major, spoken }) => [major, spoken]);
    expect(spoken).toEqual([
      ["10", "Declares all of Zotero 10"],
      ["9", "Declares all of Zotero 9"],
      ["8", "Declares part of Zotero 8. Declared range: Zotero 8.0.1 or newer"],
      ["7", "Does not declare Zotero 7"],
    ]);
    expect(page("no-range-plugin@example.org")).toMatch(/<span class="start" data-start="started" aria-hidden="true">●<\/span>/);
  });

  // The build writes one item per major; the schema lets a file hold two.
  test("adds the counts of two report items on one major", () => {
    const record = { ...records.find((r) => r.id === "first-plugin@example.org")!, reports: [
      { zoteroMajor: 8, works: 1, broken: 0 },
      { zoteroMajor: 8, works: 0, broken: 3 },
    ] };
    expect(majorReport(record, "8")).toEqual({ works: 1, broken: 3 });
    expect(majorReport(record, "7")).toBeUndefined();
  });
});

describe("the report row", () => {
  test.each(ids)("puts the report links of %s under the table, after a line that names the version read", (id) => {
    const record = records.find((r) => r.id === id)!;
    const html = page(id);
    if (!record.upstream) {
      expect(html).not.toMatch(/\sdata-reports[\s>]|\sdata-report="|\sdata-fact="(?:read-version|report-prompt)"/);
      return;
    }
    expect(reportLink(html, "works")).toBe(reportHref(record, "works"));
    expect(reportLink(html, "broken")).toBe(reportHref(record, "broken"));
    expect(fact(html, "report-prompt")).toBe(`Tried version ${escaped(record.upstream.version)} on Zotero? Report what you found:`);
    expectInOrder(html, ['class="compat-table"', "</table>", 'data-fact="report-prompt"', 'data-report="works"', 'data-report="broken"']);
  });

  test("names each button by its verdict and describes it by the line above it", () => {
    const html = page("first-plugin@example.org");
    expect(html).toContain('<p id="report-prompt" data-fact="report-prompt">');
    expect(html).toMatch(/<a data-report="works" href="[^"]*" class="button" aria-describedby="report-prompt">Works<\/a>/);
    expect(html).toMatch(/<a data-report="broken" href="[^"]*" class="button" aria-describedby="report-prompt">Broken<\/a>/);
  });

  // A record with reports and one with no reports field.
  test.each(["first-plugin@example.org", "{c2a6e4c8-1b7d-4f3a-9e2b-5d8f0a1c3e7b}"])(
    "links %s to both report forms with its id and version filled in",
    (id) => {
      const record = records.find((r) => r.id === id)!;
      for (const verdict of ["works", "broken"]) {
        const href = reportLink(page(id), verdict)!;
        const url = new URL(href);
        expect(`${url.origin}${url.pathname}`).toBe("https://github.com/jmgirard/zotero-plugin-index/issues/new");
        expect([...url.searchParams.entries()]).toEqual([
          ["template", `${verdict}.yml`],
          ["plugin", id],
          ["version", record.upstream!.version],
        ]);
      }
    },
  );

  test("URL-encodes an id and a version that need it", () => {
    const href = reportLink(page("{c2a6e4c8-1b7d-4f3a-9e2b-5d8f0a1c3e7b}"), "works")!;
    expect(href.slice(href.indexOf("?") + 1)).toBe("template=works.yml&plugin=%7Bc2a6e4c8-1b7d-4f3a-9e2b-5d8f0a1c3e7b%7D&version=3.0.0%2Br1");
  });

});

// The h2 card sections of the main content, each with its markup.
function sections(html: string): { name: string; heading: string; body: string }[] {
  const main = html.slice(html.indexOf("<main>"), html.indexOf("</main>"));
  return [...main.matchAll(/<section class="card[^"]*" data-section="([^"]+)"[^>]*>\s*<h2>([^<]*)<\/h2>(.*?)<\/section>/gs)].map(
    ([, name, heading, body]) => ({ name: name!, heading: heading!, body: body! }),
  );
}

const ICON = /<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">(?:<path d="[^"]*"><\/path>)+<\/svg>/.source;

// The links of a page head in order: each one's kind, its href (undefined for plain text),
// and its text, with the HTML escapes undone.
function headLinks(actions: string): { kind: string; href?: string; text: string }[] {
  const item = new RegExp(`<a class="btn" href="([^"]*)" data-link="([^"]+)">${ICON}(.*?)</a>|<span class="link-text" data-link="([^"]+)">(.*?)</span>`, "gs");
  const found = [...actions.matchAll(item)];
  // Nothing but these items sits in the links block.
  expect(actions.replace(item, "").trim()).toBe("");
  return found.map(([, href, kind, text, plainKind, plainText]) =>
    href === undefined
      ? { kind: plainKind!, text: unescaped(plainText!) }
      : { kind: kind!, href: unescaped(href), text: unescaped(text!).replace(/\s+/g, " ").trim() },
  );
}

describe("the plugin page", () => {
  test.each(ids)("opens the main content of %s with a back link, the name, any repo line, the description, and the links", (id) => {
    const record = records.find((r) => r.id === id)!;
    const html = page(id);
    const description = shownDescription(record);
    // A space keeps the name and the badge apart in the heading's text.
    const archived = record.upstream?.archived === true ? ' <span class="badge" data-archived>Archived</span>' : "";
    const main = html.slice(html.indexOf("<main>") + "<main>".length, html.indexOf("</main>"));
    const head = new RegExp(
      `^<a class="back" href="/zotero-plugin-index/" data-back>${ICON}All plugins</a>` +
        `<div class="page-head" data-page-head>(.*?)<div class="actions" data-links>(.*?)</div></div>`,
      "s",
    ).exec(main.replace(/>\s+</g, "><").trim());
    const { upstream } = record;
    const repoUrl = upstream?.repoUrl ?? record.repoUrl;
    const github = githubRepo(repoUrl);
    const stars =
      upstream?.stars !== undefined
        ? `<span aria-hidden="true">·</span><span data-repo-stars><span aria-hidden="true" title="${starsText(upstream.stars)}"><svg> ` +
          `${upstream.stars.toLocaleString("en")}</span><span class="visually-hidden">${starsText(upstream.stars)}</span></span>`
        : "";
    expect(head?.[1]?.replace(new RegExp(ICON, "g"), "<svg>")).toBe(
      `<h1>${escaped(displayName(record))}${archived}</h1>` +
        (github
          ? `<p class="repo-line" data-repo-line>By <a href="https://github.com/${escaped(github.owner)}" data-repo-owner>${escaped(github.owner)}</a>` +
            `<span aria-hidden="true">·</span><a href="${escaped(repoUrl)}" data-repo-name>${escaped(github.repo)}</a>${stars}</p>`
          : "") +
        (description ? `<p class="description" data-description>${escaped(description)}</p>` : ""),
    );
    const repo = safeHref(repoUrl) !== undefined;
    expect(headLinks(head![2]!)).toEqual([
      ...(upstream?.xpiUrl && safeHref(upstream.xpiUrl)
        ? [{ kind: "download", href: upstream.xpiUrl, text: `Download ${upstream.version} (.xpi)` }]
        : []),
      repo ? { kind: "source", href: repoUrl, text: "Source" } : { kind: "source", text: repoUrl },
      ...(upstream
        ? [repo ? { kind: "releases", href: `${repoUrl}/releases`, text: "Releases" } : { kind: "releases", text: `${repoUrl}/releases` }]
        : []),
    ]);
    expect(main).not.toMatch(/<header[\s>]/);
  });

  test.each<[string, string, string, string, string, string | undefined]>([
    ["first-plugin@example.org", "https://github.com/example", "https://github.com/example/first-plugin", "first-plugin", "By example · first-plugin · 1,234", "1,234 GitHub Stars"],
    ["old-plugin@example.org", "https://github.com/example", "https://github.com/example/old-plugin", "old-plugin", "By example · old-plugin · 1", "1 GitHub Star"],
    ["{c2a6e4c8-1b7d-4f3a-9e2b-5d8f0a1c3e7b}", "https://github.com/example", "https://github.com/example/guid-plugin", "guid-plugin", "By example · guid-plugin · 0", "0 GitHub Stars"],
    ["no-range-plugin@example.org", "https://github.com/example", "https://github.com/example/no-range-plugin", "no-range-plugin", "By example · no-range-plugin", undefined],
    ["broken-plugin@example.org", "https://github.com/example", "https://github.com/example/broken-plugin", "broken-plugin", "By example · broken-plugin", undefined],
  ])("shows the owner, the repo, and any stars of %s under the name", (id, ownerHref, repoHref, repoText, visible, words) => {
    const line = /<p class="repo-line" data-repo-line>(.*?)<\/p>/s.exec(page(id))?.[1];
    const text = (html: string) => unescaped(html.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
    expect(/<a href="([^"]*)" data-repo-owner>([^<]*)<\/a>/.exec(line ?? "")?.slice(1)).toEqual([ownerHref, "example"]);
    expect(/<a href="([^"]*)" data-repo-name>([^<]*)<\/a>/.exec(line ?? "")?.slice(1)).toEqual([repoHref, repoText]);
    expect(text(line!.replace(/<span class="visually-hidden">[^<]*<\/span>/g, ""))).toBe(visible);
    if (words === undefined) {
      expect(line).not.toMatch(/data-repo-stars|<svg/);
    } else {
      expect(/<span aria-hidden="true" title="([^"]*)">/.exec(line!)?.[1]).toBe(words);
      expect(/<span class="visually-hidden">([^<]*)<\/span>/.exec(line!)?.[1]).toBe(words);
      expect(line).toMatch(/<path d="M12 2l3\.09 6\.26L22 9\.27l-5 4\.87 1\.18 6\.88L12 17\.77l-6\.18 3\.25L7 14\.14 2 9\.27l6\.91-1\.01L12 2z">/);
    }
  });

  test.each([
    ["a GitHub URL with an extra path segment", "repo-path@example.org"],
    ["an http: GitHub URL", "repo-http@example.org"],
    ["a non-GitHub host", "repo-gitlab@example.org"],
    ["a GitHub URL with a query after the repo", "repo-query@example.org"],
    ["a GitHub URL with a query after the owner", "repo-owner-query@example.org"],
    ["a GitHub URL with a fragment", "repo-fragment@example.org"],
  ])("shows no repo line for %s", (_name, id) => {
    expect(page(id)).not.toContain("data-repo-line");
  });

  test("covers each shape of page head link in the site fixture", () => {
    const repoFails = (record: PluginRecord) => !safeHref(record.upstream?.repoUrl ?? record.repoUrl);
    expect(records.some((record) => record.upstream && repoFails(record))).toBe(true);
    expect(records.some((record) => !record.upstream && repoFails(record))).toBe(true);
    expect(records.some((record) => record.upstream?.xpiUrl && !safeHref(record.upstream.xpiUrl))).toBe(true);
    expect(records.some((record) => record.upstream?.xpiUrl && safeHref(record.upstream.xpiUrl) && !repoFails(record))).toBe(true);
  });

  test.each(ids)("shows the sections of %s in order, each with its facts", (id) => {
    const record = records.find((r) => r.id === id)!;
    const html = page(id);
    const read = record.upstream !== undefined;
    const found = sections(html);
    // No other section or h2 sits in the main content.
    const main = html.slice(html.indexOf("<main>"), html.indexOf("</main>"));
    expect(main.split("<section").length - 1).toBe(found.length);
    expect(main.split("<h2").length - 1).toBe(found.length);
    expect(found.map(({ name, heading }) => [name, heading])).toEqual([
      ["compatibility", "Zotero compatibility"],
      ["details", "Details"],
    ]);
    const body = (name: string) => found.find((section) => section.name === name)!.body;
    const holds: [string, string[]][] = [
      [
        "compatibility",
        read
          ? [
              'data-fact="read-version"',
              'class="compat-table"',
              ...(hasBound(record) ? ['data-fact="declared-range"'] : []),
              'data-fact="report-prompt"',
              'data-report="works"',
              'data-report="broken"',
            ]
          : ['data-fact="failure"'],
      ],
    ];
    for (const [name, markers] of holds) {
      expectInOrder(body(name), markers);
      // Each fact sits in its section and nowhere else on the page.
      for (const marker of markers) expect(html.split(marker).length - 1, marker).toBe(1);
    }
    if (!hasBound(record)) expect(html).not.toContain('data-fact="declared-range"');
  });

  test.each(ids)("lists the facts of %s in an open Details section, with the overrides under an h3", (id) => {
    const record = records.find((r) => r.id === id)!;
    const html = page(id);
    expect(html).not.toMatch(/<details[\s>]|<summary[\s>]/);
    const details = sections(html).find(({ name }) => name === "details")!.body;
    const facts = /^\s*<dl class="facts">(.*?)<\/dl>/s.exec(details)?.[1];
    const items = [...facts!.matchAll(/<div>\s*<dt>([^<]*)<\/dt>\s*<dd data-fact="([^"]+)">/g)].map(([, label, name]) => [label, name]);
    expect(facts!.split("<dt>").length - 1).toBe(items.length);
    const { upstream } = record;
    expect(items).toEqual([
      ["Plugin id", "id"],
      ...(upstream
        ? [
            ...(upstream.description !== undefined ? [["Manifest description", "manifest-description"]] : []),
            ...(upstream.repoDescription !== undefined ? [["GitHub description", "github-description"]] : []),
            ...(typeof upstream.archived === "boolean" ? [["Archived on GitHub", "archived"]] : []),
            ["Repository created", "repo-created"],
            ["Release read by the index", "latest-release"],
            ["Releases with an .xpi", "release-count"],
            ["Open issues and pull requests", "open-issues"],
            ["Host of update.json", "update-host"],
            ["Menus and settings in", "languages"],
          ]
        : []),
    ]);
    if (record.overrides.length > 0) {
      const overrides = /<div class="overrides" data-overrides>\s*<h3>Overrides<\/h3>(.*?)<\/table>/s.exec(details)?.[1];
      expect(overrides?.split("<tr data-override=").length).toBe(record.overrides.length + 1);
    } else {
      expect(details).not.toMatch(/\sdata-overrides[\s>]|<h3[\s>]/);
    }
    expect(html).not.toMatch(/<h2>Overrides<\/h2>/);
    expect(html.indexOf('data-fact="not-vetted"')).toBeGreaterThan(html.indexOf('data-section="details"'));
  });

  test("shows the declared range with the override that applies", () => {
    expect(fact(page("first-plugin@example.org"), "declared-range")).toBe("Zotero 7.0 to 8.*");
  });

  test("shows the repository facts", () => {
    const html = page("first-plugin@example.org");
    expect(fact(html, "repo-created")).toBe("2023-03-14");
    expect(fact(html, "latest-release")).toBe("1.2.0, published 2026-09-30");
    expect(fact(html, "release-count")).toBe("27");
    expect(fact(html, "open-issues")).toBe("12");
    expect(fact(html, "update-host")).toBe("example.org");
    expect(fact(html, "not-vetted")).toBe("This index does not vet the plugins it lists.");
  });

  test("shows each override beside the upstream value", () => {
    const rows = [...page("first-plugin@example.org").matchAll(/<tr data-override="[^"]*">(.*?)<\/tr>/g)].map((row) =>
      [...row[1]!.matchAll(/<td>(.*?)<\/td>/g)].map((cell) => cell[1]!.replace(/<[^>]+>/g, "")),
    );
    // Field, upstream value, override value, version, used, reason.
    expect(rows).toEqual([
      ["strict_max_version", "7.*", "8.*", "every version", "yes", "The author confirmed that the plugin works on Zotero 8."],
      ["strict_min_version", "7.0", "8.5", "0.9.0", "no", "Version 0.9.0 needs an API that Zotero 8.5 added."],
    ]);
  });

  test.each([
    ["three upstream tags", "first-plugin@example.org", "English (United States), Spanish, Chinese (China)"],
    ["an empty upstream list", "old-plugin@example.org", "Unknown (no translations found)"],
    ["no languages field", "{c2a6e4c8-1b7d-4f3a-9e2b-5d8f0a1c3e7b}", "Unknown (no translations found)"],
    ["an override for every version, in its own order", "no-range-plugin@example.org", "French, German"],
    ["an override for another version only", "min-only-plugin@example.org", "Chinese (China), Chinese (Taiwan)"],
    ["an override for the version read beside one for every version", "locale-plugin@example.org", "Portuguese (Brazil), Spanish (Latin America)"],
  ])("shows the interface languages for %s", (_, id, text) => {
    expect(fact(page(id), "languages")).toBe(text);
  });

  test("labels the languages fact as menus and settings", () => {
    expect(page("first-plugin@example.org")).toMatch(/<dt>Menus and settings in<\/dt>\s*<dd data-fact="languages">/);
  });

  test("leaves the old languages label off every plugin page", () => {
    const pages = htmlFiles(join(out, "plugins"));
    expect(pages.length).toBe(ids.length);
    for (const path of pages) expect(readFileSync(join(out, "plugins", path), "utf8"), path).not.toContain("Interface languages:");
  });

  test.each([
    ["a non-empty", "no-range-plugin@example.org", [["en", "fr, de"]]],
    ["an empty", "locale-plugin@example.org", [["none", "es"], ["none", "pt-BR, es-419"]]],
  ])("shows %s upstream list beside a languages override", (_, id, cells) => {
    const rows = [...page(id).matchAll(/<tr data-override="languages">(.*?)<\/tr>/g)].map((row) =>
      [...row[1]!.matchAll(/<td>(.*?)<\/td>/g)].slice(1, 3).map((cell) => cell[1]),
    );
    expect(rows).toEqual(cells);
  });

  test.each([
    ["old-plugin@example.org", "Yes"],
    ["first-plugin@example.org", "No"],
  ])("shows whether the repo of %s is archived", (id, text) => {
    expect(page(id)).toMatch(/<dt>Archived on GitHub<\/dt>\s*<dd data-fact="archived">/);
    expect(fact(page(id), "archived")).toBe(text);
  });

  test.each<[string, string | undefined, string | undefined]>([
    ["first-plugin@example.org", "A plugin for the site tests.", "Tests the site &amp; its &lt;pages&gt;."],
    ["old-plugin@example.org", undefined, "An old plugin kept for history."],
    ["b-cafe@example.org", "Keeps a log of item edits.", undefined],
    ["zotero6-plugin@example.org", undefined, undefined],
  ])("shows the manifest and GitHub descriptions of %s that its record holds", (id, manifest, github) => {
    expect(fact(page(id), "manifest-description")).toBe(manifest);
    expect(fact(page(id), "github-description")).toBe(github);
  });

  test("shows no archived fact when the record has no archived value", () => {
    expect(page("{c2a6e4c8-1b7d-4f3a-9e2b-5d8f0a1c3e7b}")).not.toMatch(/\sdata-fact="archived"/);
  });

  test("labels the release fact as the release the index read", () => {
    expect(page("first-plugin@example.org")).toMatch(/<dt>Release read by the index<\/dt>\s*<dd data-fact="latest-release">/);
  });

  test.each([
    ["old-plugin@example.org", "0.4.1, published 2024-07-01 (prerelease)"],
    ["first-plugin@example.org", "1.2.0, published 2026-09-30"],
    ["{c2a6e4c8-1b7d-4f3a-9e2b-5d8f0a1c3e7b}", "3.0.0+r1, published 2026-10-01"],
  ])("marks the release of %s as a prerelease only when the record says so", (id, text) => {
    expect(fact(page(id), "latest-release")).toBe(text);
  });
});

// The text of a page's main content, with tags removed, the HTML escapes undone, and spaces
// collapsed. A tag adds no space, so text that Astro joins to an element stays joined.
function mainText(html: string): string {
  const main = html.slice(html.indexOf("<main>"), html.indexOf("</main>"));
  return unescaped(main.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

describe("the About page", () => {
  const about = () => readFileSync(join(out, "about/index.html"), "utf8");

  test("has one section for each part of the method, each under its h2", () => {
    expect([...about().matchAll(/<section class="card" id="([^"]+)" data-about="\1">\s*<h2>([^<]*)<\/h2>/g)].map(([, id, h2]) => [id, h2])).toEqual([
      ["declared", "Declared range"],
      ["start-test", "Start test"],
      ["reports", "User reports"],
      ["descriptions", "Descriptions"],
      ["overrides", "Overrides"],
      ["not-vetted", "What the index does not do"],
    ]);
  });

  test("names each declared mark and says that a range is not a test result", () => {
    const text = mainText(about());
    for (const line of [
      "✓ The range covers every release of that Zotero version, up to its newest release.",
      "◐ The range covers part of it.",
      "– The range covers none of it.",
      "The index counts Zotero N as the versions from N.0 to the newest release of N.",
      "so a minimum such as 8.999, which authors write to mean Zotero 9 and newer, covers none of Zotero 8.",
      "Each day the build reads the current Zotero release from zotero.org, and the index keeps the last release of each earlier Zotero version.",
      "For a Zotero version with no known release, the index counts N.0 to N.9,",
      "A plugin that declares no range shows no mark. The range is what the author declares, not a test result.",
    ]) {
      expect(text).toContain(line);
    }
  });

  test("describes the start test on Linux in a new profile with a 3-second wait, and says that a start is not a report that it works", () => {
    const text = mainText(about());
    expect(text).toContain("installs the plugin version that the index read in a new Zotero profile on Linux");
    expect(text).toContain("It waits 3 seconds after the install");
    expect(text).toContain("✕ Gave no answer in time: no result came within 90 seconds.");
    expect(text).toContain("A start is not a report that the plugin works.");
    // The 3 seconds is the reporter's wait after the install, and the 90 the start's time limit.
    const reporter = readFileSync(resolve(ROOT, "src/start-test/reporter/bootstrap.js"), "utf8");
    expect(/^const SETTLE_MS = (\d+);$/m.exec(reporter)?.[1]).toBe("3000");
    expect(START_LIMIT_MS).toBe(90 * 1000);
  });

  test("says where the description comes from and when an override gives English text", () => {
    const text = mainText(about());
    for (const line of [
      "the index reads the plugin's English locale file first, if it has one.",
      "A description override that applies to the version the index read comes first.",
      "Without one, if less than half of the manifest description is Chinese, Japanese, or Korean, the site shows it.",
      "the manifest description was dropped, or the GitHub description has less of that text.",
      "A description override can also give English text for a plugin with no English description upstream.",
      "That covers a description that is not in English, that only repeats the name, or that is half or more Chinese, Japanese, or Korean.",
    ]) {
      expect(text).toContain(line);
    }
  });

  test("says which user reports count, how overrides and the Used column work, and that the index does not vet plugins", () => {
    const text = mainText(about());
    for (const line of [
      "The index counts a report only when the bot closed it as completed and the report names the plugin version that the index read.",
      "A report with the label not-counted does not count.",
      "Of one GitHub account's reports on one plugin and Zotero major, only the newest counts.",
      'Its Used column says "yes" for the override that applies to the plugin version that the index read.',
      'The declared range uses the strict_min_version and strict_max_version overrides marked "yes".',
      "This index does not vet the plugins it lists.",
    ]) {
      expect(text).toContain(line);
    }
  });

  // Each sentence that moved to the About page, as it read on a plugin page before.
  const MOVED = ["waits 3 seconds", "A start test does not show that the plugin works", "An override marked", "The declared range above uses"];

  test.each(ids)("leaves the moved method sentences off the page of %s, and links the About page once in the compatibility card", (id) => {
    const html = page(id);
    // The whole page, as markup and as text with the tags removed.
    const text = unescaped(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ");
    for (const sentence of MOVED) {
      expect(html, sentence).not.toContain(sentence);
      expect(text, sentence).not.toContain(sentence);
    }
    const main = html.slice(html.indexOf("<main>"), html.indexOf("</main>"));
    expect(main.split('href="/zotero-plugin-index/about/"').length - 1).toBe(1);
    const line = /<p class="fineprint" data-about-line>(.*?)<\/p>/s.exec(main)?.[1];
    expect(line).toMatch(/<a href="\/zotero-plugin-index\/about\/">How the index checks plugins<\/a>\s*$/);
    const card = sections(html).find(({ name }) => name === "compatibility")!.body;
    expect(card).toContain("data-about-line");
    if (records.find((r) => r.id === id)!.upstream) expectInOrder(card, ["</table>", "data-about-line", 'data-fact="report-prompt"']);
    else expectInOrder(card, ['data-fact="failure"', "data-about-line"]);
  });
});

describe("the home page", () => {
  test("links each plugin to the directory of its raw id", () => {
    const html = readFileSync(join(out, "index.html"), "utf8");
    const linked = [...html.matchAll(/href="\/zotero-plugin-index\/plugins\/([^/"]+)\/"/g)].map((m) =>
      decodeURIComponent(m[1]!),
    );
    expect(linked.sort()).toEqual([...ids].sort());
    for (const id of linked) expect(existsSync(join(out, "plugins", id, "index.html")), id).toBe(true);
  });

  // The table's body rows, each with its attributes and its cells, the row header first.
  function rows() {
    const html = home();
    const body = html.slice(html.indexOf("<tbody>"), html.indexOf("</tbody>"));
    return [...body.matchAll(/<tr([^>]*)>(.*?)<\/tr>/gs)].map(([, attributes, inner]) => ({
      attributes: attributes!,
      id: unescaped(/^ data-plugin="([^"]*)"/.exec(attributes!)![1]!),
      cells: [...inner!.matchAll(/<(t[dh])([^>]*)>(.*?)<\/\1>/gs)].map(([, tag, cellAttributes, cell]) => ({
        attributes: cellAttributes!,
        html: cell!,
        tag: tag!,
      })),
    }));
  }

  function row(id: string) {
    const found = rows().find((r) => r.id === id);
    expect(found, id).toBeDefined();
    return found!;
  }

  test("holds one table whose body has one row per record, by name and then by id", () => {
    expect(home().match(/<table[\s>]/g)).toHaveLength(1);
    expect(rows().map(({ id }) => id)).toEqual([
      "_x-y+z.w@{v}",
      "broken-plugin@example.org",
      // "Café Tools" and "cafe tools" compare equal, so their ids order them.
      "a-cafe@example.org",
      "b-cafe@example.org",
      "first-plugin@example.org",
      "{c2a6e4c8-1b7d-4f3a-9e2b-5d8f0a1c3e7b}",
      "locale-plugin@example.org",
      "min-only-plugin@example.org",
      "next-plugin@example.org",
      "no-range-plugin@example.org",
      "old-plugin@example.org",
      "repo-fragment@example.org",
      "repo-gitlab@example.org",
      "repo-http@example.org",
      "repo-owner-query@example.org",
      "repo-path@example.org",
      "repo-query@example.org",
      "ssh-plugin@example.org",
      "zotero6-plugin@example.org",
    ]);
  });

  test.each(ids)("shows the name cell of %s", (id) => {
    const record = records.find((r) => r.id === id)!;
    const description = shownDescription(record);
    expect(row(id).cells[0]!.attributes).toBe(' scope="row" class="name"');
    expect(row(id).cells.map(({ tag }) => tag)).toEqual(["th", ...row(id).cells.slice(1).map(() => "td")]);
    expect(row(id).cells[0]!.html).toBe(
      `<a href="${escaped(pluginHref(id))}" data-name>${escaped(displayName(record))}</a>` +
        (record.upstream?.archived === true ? '<span class="badge" data-archived>Archived</span>' : "") +
        (description ? `<div class="desc" data-description>${escaped(description)}</div>` : ""),
    );
  });

  test("marks only the archived plugin", () => {
    expect(home().match(/\sdata-archived/g)).toHaveLength(1);
  });

  // The declared mark and the start mark of one version cell.
  const MARK = /^(?:<span class="mark" data-support="([^"]+)" title="([^"]*)"><span aria-hidden="true">([^<]*)<\/span><span class="visually-hidden">([^<]*)<\/span><\/span>)?(?:<span class="start" data-start="([^"]+)" title="([^"]*)"><span aria-hidden="true">([^<]*)<\/span><span class="visually-hidden">([^<]*)<\/span><\/span>)?$/;

  // The start result for a major, found here without majorStart: the newest of the major's results.
  function newestStart(record: PluginRecord, major: string) {
    const results = (record.startTests ?? []).filter(({ zotero }) => zotero.split(".")[0] === major);
    return results.sort((a, b) => compareVersions(b.zotero, a.zotero))[0];
  }

  const START_WORDS: Record<string, string> = {
    started: "started",
    "start-error": "failed at startup",
    "not-installed": "did not install",
    "timed-out": "gave no answer in time",
  };

  test.each(ids)("shows the version cells of %s: a declared mark and a start mark per major, or Not read", (id) => {
    const record = records.find((r) => r.id === id)!;
    const cells = row(id).cells.slice(1, record.failure ? 2 : 1 + ZOTERO_MAJORS.length);
    if (record.failure) {
      expect(cells[0]).toEqual({ attributes: ' class="v not-read" colspan="4" data-status="failure"', html: "Not read", tag: "td" });
      expect(row(id).cells.some(({ attributes }) => attributes.includes("data-major"))).toBe(false);
      return;
    }
    const marks: Record<string, string> = { all: "✓", some: "◐", none: "–" };
    const label = (major: string, support: string) =>
      support === "all"
        ? `Declares all of Zotero ${major}`
        : support === "some"
          ? `Declares part of Zotero ${major}. Declared range: ${rangeText(record)}`
          : `Does not declare Zotero ${major}`;
    expect(cells.map(({ attributes }) => attributes)).toEqual(ZOTERO_MAJORS.map((major) => ` class="v" data-major="${major}"`));
    ZOTERO_MAJORS.forEach((major, i) => {
      const found = MARK.exec(cells[i]!.html);
      expect(found, `${id} ${major}: ${cells[i]!.html}`).not.toBeNull();
      const [, support, title, visible, hidden, start, startTitle, startVisible, startHidden] = found!;
      const declared = majorSupport(record, major);
      expect(support, major).toBe(declared);
      if (declared) {
        expect([title, visible, hidden]).toEqual([escaped(label(major, declared)), marks[declared], escaped(label(major, declared))]);
      }
      const result = newestStart(record, major);
      expect(start, major).toBe(result?.result);
      if (result) {
        const words = `Zotero ${result.zotero} ${START_WORDS[result.result]}`;
        expect([startTitle, startVisible, startHidden]).toEqual([words, result.result === "started" ? "●" : "✕", `Start test: ${words}`]);
      }
    });
  });

  test("shows the newest start result of a major and none for a declared major with no result", () => {
    const cells = row("a-cafe@example.org").cells;
    const starts = cells.slice(1, 5).map(({ html }) => /<span class="start" data-start="([^"]+)" title="([^"]*)"/.exec(html)?.slice(1));
    expect(starts).toEqual([["started", "Zotero 7.0.32 started"], ["started", "Zotero 8.0.10 started"], undefined, undefined]);
    const bare = row("no-range-plugin@example.org").cells.slice(1, 5).map(({ html }) => [html.includes('class="mark"'), /data-start="([^"]+)"/.exec(html)?.[1]]);
    expect(bare).toEqual([[false, "started"], [false, "start-error"], [false, "not-installed"], [false, "timed-out"]]);
  });

  // The language codes a row shows, found here without shortLanguages.
  function codes(record: PluginRecord): string[] {
    const subtags = [...new Set(appliedLanguages(record).map((tag) => new Intl.Locale(tag).language))];
    return subtags.length <= 3 ? subtags : [...subtags.slice(0, 2), `+${subtags.length - 2}`];
  }

  test.each(ids)("shows the languages, the release date, and the links of %s", (id) => {
    const record = records.find((r) => r.id === id)!;
    const cells = row(id).cells;
    const [languages, date, links] = cells.slice(-3);
    expect(cells).toHaveLength((record.failure ? 2 : 1 + ZOTERO_MAJORS.length) + 3);
    expect(languages!.attributes).toBe(' class="lang" data-languages-shown');
    expect([...languages!.html.matchAll(/<abbr[^>]*>([^<]*)<\/abbr>/g)].map(([, text]) => text)).toEqual(codes(record));
    // One space between codes, so a screen reader does not read them as one word.
    expect(languages!.html.replace(/<abbr[^>]*>[^<]*<\/abbr>/g, "")).toBe(" ".repeat(Math.max(0, codes(record).length - 1)));
    const released = record.upstream?.latestReleaseDate;
    expect(date!.html).toBe(
      released
        ? `<time datetime="${released.slice(0, 7)}">${released.slice(0, 7)}</time>`
        : "",
    );
    const linked = [...links!.html.matchAll(/<a href="([^"]*)" data-link="([^"]+)"/g)].map(([, href, kind]) => [kind, unescaped(href!)]);
    const source = safeHref(record.upstream?.repoUrl ?? record.repoUrl);
    const xpi = record.upstream?.xpiUrl && safeHref(record.upstream.xpiUrl);
    expect(linked).toEqual([...(source ? [["source", source]] : []), ...(xpi ? [["download", xpi]] : [])]);
  });

  test("shows the first two of four or more language codes and names the rest", () => {
    const html = row("a-cafe@example.org").cells.at(-3)!.html;
    expect(html).toBe('<abbr title="French">fr</abbr> <abbr title="German">de</abbr> <abbr class="more" title="Japanese, English, Italian">+3</abbr>');
    expect(row("b-cafe@example.org").cells.at(-3)!.html).toBe(`<abbr title="${languageName("en")}">en</abbr>`);
  });

  // The site builds in New York time (pnpmSite), where 02:00 UTC on the 1st is still the month before.
  test("shows the release month in UTC", () => {
    expect(row("a-cafe@example.org").cells.at(-2)!.html).toBe('<time datetime="2026-11">2026-11</time>');
  });

  test("links a source and a download only when the address passes", () => {
    const kinds = (id: string) => [...row(id).cells.at(-1)!.html.matchAll(/data-link="([^"]+)"/g)].map(([, kind]) => kind);
    expect(kinds("a-cafe@example.org")).toEqual(["source", "download"]);
    // An ftp: xpiUrl, no xpiUrl, and a repoUrl that is not a web address.
    expect(kinds("b-cafe@example.org")).toEqual(["source"]);
    expect(kinds("first-plugin@example.org")).toEqual(["source"]);
    expect(kinds("ssh-plugin@example.org")).toEqual([]);
    expect(row("a-cafe@example.org").cells.at(-1)!.html).toContain(
      'title="Download version 2.0.0 (.xpi)" aria-label="Download Café Tools 2.0.0 (.xpi)"',
    );
  });

  test("names each declared mark and each start mark in a legend under the table, and says a range is not a test result", () => {
    const html = home();
    const legend = /<ul class="legend" role="list" data-legend>(.*?)<\/ul>/s.exec(html);
    expect(legend).not.toBeNull();
    expect(html.indexOf("<ul class=\"legend\"")).toBeGreaterThan(html.indexOf("</table>"));
    const items = [...legend![1]!.matchAll(/<li[^>]*>(.*?)<\/li>/gs)].map(([, item]) => item!.replace(/\s+/g, " "));
    expect(items).toEqual([
      '<span class="mark" data-support="all" aria-hidden="true">✓</span> Declares every release of that Zotero version, up to its newest release',
      '<span class="mark" data-support="some" aria-hidden="true">◐</span> Declares part of it',
      '<span class="mark" data-support="none" aria-hidden="true">–</span> Declares none of it',
      "No mark: the plugin declares no range",
      '<span class="start" data-start="started" aria-hidden="true">●</span> Started in the start test',
      '<span class="start" data-start="start-error" aria-hidden="true">✕</span> Failed to install, start, or answer in the start test',
      "A declared range comes from the plugin's manifest and the index's overrides, not from a test. A start test does not show that a plugin works.",
    ]);
  });

  test("gives each row the language subtags it applies", () => {
    expect(rows().map(({ id, attributes }) => [id, /\sdata-languages="([^"]*)"/.exec(attributes)?.[1]])).toEqual([
      ["_x-y+z.w@{v}", ""],
      ["broken-plugin@example.org", ""],
      ["a-cafe@example.org", "de en fr it ja"],
      ["b-cafe@example.org", "en"],
      ["first-plugin@example.org", "en es zh"],
      ["{c2a6e4c8-1b7d-4f3a-9e2b-5d8f0a1c3e7b}", ""],
      ["locale-plugin@example.org", "es pt"],
      ["min-only-plugin@example.org", "zh"],
      ["next-plugin@example.org", ""],
      ["no-range-plugin@example.org", "de fr"],
      ["old-plugin@example.org", ""],
      ...NO_REPO_LINE_IDS.map((id) => [id, ""]),
      ["ssh-plugin@example.org", ""],
      ["zotero6-plugin@example.org", ""],
    ]);
  });

  test("gives each row the Zotero majors it declares all or part of", () => {
    expect(rows().map(({ id, attributes }) => [id, /\sdata-zotero="([^"]*)"/.exec(attributes)?.[1]])).toEqual([
      ["_x-y+z.w@{v}", ""],
      ["broken-plugin@example.org", ""],
      ["a-cafe@example.org", "7 8 9"],
      ["b-cafe@example.org", "7"],
      ["first-plugin@example.org", "7 8"],
      ["{c2a6e4c8-1b7d-4f3a-9e2b-5d8f0a1c3e7b}", "9"],
      ["locale-plugin@example.org", "7 8 9"],
      ["min-only-plugin@example.org", "8 9 10"],
      ["next-plugin@example.org", "8 9 10"],
      ["no-range-plugin@example.org", ""],
      ["old-plugin@example.org", "7"],
      ...NO_REPO_LINE_IDS.map((id) => [id, ""]),
      ["ssh-plugin@example.org", ""],
      ["zotero6-plugin@example.org", ""],
    ]);
  });

  test("holds hidden version buttons, Any pressed, then one for each major", () => {
    const group = /<div class="version-filter" hidden><span id="([^"]+)">Declares Zotero<\/span><div role="group" aria-labelledby="([^"]+)" data-version-filter>(.*?)<\/div><\/div>/.exec(home());
    expect(group).not.toBeNull();
    expect(group![2]).toBe(group![1]);
    const buttons = [...group![3]!.matchAll(/<button([^>]*)>([^<]*)<\/button>/g)].map(([, attributes, text]) => [attributes, text]);
    expect(group![3]!.replace(/<button[^>]*>[^<]*<\/button>/g, "")).toBe("");
    expect(buttons).toEqual([
      [' type="button" aria-pressed="true"', "Any"],
      ...["7", "8", "9", "10"].map((major) => [` type="button" value="${major}" aria-pressed="false"`, major]),
    ]);
  });

  test("holds a hidden language menu with one option for each subtag, most plugins first", () => {
    const menu = /<p class="language-filter" hidden><label for="language">Menus and settings in<\/label> <select id="language" data-language-filter autocomplete="off">(.*?)<\/select><\/p>/.exec(home());
    expect(menu).not.toBeNull();
    const options = [...menu![1]!.matchAll(/<option value="([^"]*)">([^<]*)<\/option>/g)].map(([, value, text]) => [value, text]);
    expect(options).toEqual([
      ["", "All languages"],
      ["en", "English (3)"],
      ["zh", "Chinese (2)"],
      ["fr", "French (2)"],
      ["de", "German (2)"],
      ["es", "Spanish (2)"],
      ["it", "Italian (1)"],
      ["ja", "Japanese (1)"],
      ["pt", "Portuguese (1)"],
    ]);
  });

  test("gives each row the slugs of its record's categories", () => {
    const expected = homeOrder(fixture.plugins as PluginRecord[]).map((record) => [record.id, categories(record).join(" ")]);
    expect(rows().map(({ id, attributes }) => [id, /\sdata-categories="([^"]*)"/.exec(attributes)?.[1]])).toEqual(expected);
    expect(expected.filter(([, slugs]) => slugs !== "").length).toBeGreaterThan(1);
    expect(expected.filter(([, slugs]) => slugs === "").length).toBeGreaterThan(1);
  });

  test("holds a hidden category menu with one option for each category a row has, most rows first and ties in list order", () => {
    const menu = /<p class="category-filter" hidden><label for="category">Category<\/label> <select id="category" data-category-filter autocomplete="off">(.*?)<\/select><\/p>/.exec(home());
    expect(menu).not.toBeNull();
    const options = [...menu![1]!.matchAll(/<option value="([^"]*)">([^<]*)<\/option>/g)].map(([, value, text]) => [value, text]);
    // Three categories tie at 1, and their names in alphabetical order would put "Library
    // organization" first; Notes and the other categories have no row.
    expect(options).toEqual([
      ["", "All categories"],
      ["attachments", "Attachments and full text (2)"],
      ["translation", "Translation and dictionaries (1)"],
      ["pdf-reading", "PDF reading (1)"],
      ["organization", "Library organization (1)"],
    ]);
  });

  test("holds every row without hidden, and the search box, the menu, the buttons, the count, and the pager inside hidden elements", () => {
    const html = home();
    expect(rows().length).toBe(ids.length);
    for (const { id, attributes } of rows()) expect(attributes, id).not.toMatch(/\shidden[\s=]|\shidden$/);
    const toolbar = html.slice(html.indexOf('<div class="toolbar">') + '<div class="toolbar">'.length, html.indexOf("</div><script>"));
    expect(toolbar.length).toBeGreaterThan(0);
    expect(toolbar).toMatch(/^<p class="search" hidden><label for="search" class="visually-hidden">Search plugins<\/label><svg [^]*?<\/svg><input type="search" id="search" data-search placeholder="Search plugins" autocomplete="off"><\/p>/);
    expect(toolbar).toMatch(/<p class="category-filter" hidden><label[^>]*>[^<]*<\/label> <select[^>]*>(?:<option[^>]*>[^<]*<\/option>)+<\/select><\/p>/);
    expect(toolbar).toMatch(/<p class="language-filter" hidden><label[^>]*>[^<]*<\/label> <select[^>]*>(?:<option[^>]*>[^<]*<\/option>)+<\/select><\/p>/);
    expect(toolbar).toMatch(/<div class="version-filter" hidden><span[^>]*>[^<]*<\/span><div role="group"[^>]*>(?:<button[^>]*>[^<]*<\/button>)+<\/div><\/div>/);
    expect(toolbar).toMatch(/<p class="filter-status" role="status" data-filter-status hidden><\/p>$/);
    expect(html.match(/<input[\s>]/g)).toHaveLength(1);
    expect(html.match(/<select[\s>]/g)).toHaveLength(2);
    expect(html.match(/<button[\s>]/g)).toHaveLength(ZOTERO_MAJORS.length + 3);
    expect(html.match(/\sdata-filter-status/g)).toHaveLength(1);
    expect(html).toContain(
      '</table></div><nav class="pager" aria-label="Pages" data-pager hidden><button type="button" data-page-step="-1">Previous</button><span role="status" data-page-status></span><button type="button" data-page-step="1">Next</button></nav>',
    );
  });

  test("hides each control's element while it has hidden, whatever display its other rules give it", () => {
    const hiding = cssRules(readFileSync(resolve(ROOT, "site/src/layouts/Base.astro"), "utf8")).filter(({ declarations }) =>
      declarations.some(([property, value]) => property === "display" && value === "none"),
    );
    const selectors = hiding.flatMap(({ selector }) => selector.split(",").map((part) => part.trim()));
    for (const control of [".search[hidden]", ".category-filter[hidden]", ".language-filter[hidden]", ".version-filter[hidden]", ".filter-status[hidden]", ".pager[hidden]"]) {
      expect(selectors, control).toContain(control);
    }
  });
});

// The built home page script run against stand-ins for the elements it reads, so a test can
// type in the search box, load an address, or go Back, and read which rows it hides.
// A generated row, "gen-<n>@example.org" named "Bulk <n>" with n from 001, after the built
// rows. Its description holds "alpha" for n up to 50, "beta" up to 51, and "gamma" up to 20,
// so a search can pass exactly 50, 51, or 20 of them. Each one is in the translation category.
function generatedRow(n: number) {
  const tags = [n <= 20 && "gamma", n <= 50 && "alpha", n <= 51 && "beta"].filter(Boolean).join(" ");
  const fields: Record<string, string> = { name: `Bulk ${String(n).padStart(3, "0")}`, description: tags };
  return {
    hidden: false,
    dataset: { plugin: `gen-${n}@example.org`, languages: "", zotero: "", categories: "translation" },
    querySelector: (selector: string) => {
      const field = fields[selector.slice(6, -1)];
      return field ? { textContent: field } : null;
    },
  };
}

function homeScript(href: string, generated = 0, missing?: "search" | "category" | "menu" | "buttons") {
  const html = home();
  const script = /<script type="module">(.*?)<\/script>/s.exec(html)![1]!;
  const shown = new Set<string>();
  const wrapper = (name: string) => ({ removeAttribute: (attribute: string) => attribute === "hidden" && shown.add(name) });
  const events = new Map<string, () => void>();
  const listen = (name: string) => (type: string, handler: () => void) => events.set(`${name}:${type}`, handler);
  const search = { value: "", addEventListener: listen("search"), closest: () => wrapper("search") };
  // The options of the select whose attribute is marker.
  const optionsOf = (marker: string) => {
    const menu = new RegExp(`<select[^>]*\\s${marker}[\\s>][^]*?</select>`).exec(html)![0];
    return [...menu.matchAll(/<option value="([^"]*)">/g)].map(([, value]) => ({ value: unescaped(value!) }));
  };
  const select = { value: "", options: optionsOf("data-language-filter"), addEventListener: listen("select"), closest: () => wrapper("menu") };
  const categorySelect = {
    value: "",
    options: optionsOf("data-category-filter"),
    addEventListener: listen("category"),
    closest: () => wrapper("category"),
  };
  const buttons = [...html.matchAll(/<button type="button"(?: value="([^"]*)")? aria-pressed="[^"]*">/g)].map(([, value]) => ({
    value: value ?? "",
    addEventListener: () => {},
    setAttribute: () => {},
    closest: () => wrapper("buttons"),
  }));
  const status = { textContent: "", removeAttribute: () => shown.add("count") };
  const body = html.slice(html.indexOf("<tbody>"), html.indexOf("</tbody>"));
  const tableRows = [
    ...body.matchAll(/<tr data-plugin="([^"]*)" data-languages="([^"]*)" data-zotero="([^"]*)" data-categories="([^"]*)">(.*?)<\/tr>/gs),
  ].map(([, plugin, languages, zotero, categories, inner]) => {
    const text = (attribute: string) => {
      const found = new RegExp(`\\s${attribute}>([^<]*)<`).exec(inner!);
      return found ? { textContent: unescaped(found[1]!) } : null;
    };
    return {
      hidden: false,
      dataset: { plugin: unescaped(plugin!), languages, zotero, categories },
      querySelector: (selector: string) => text(selector.slice(1, -1)),
    };
  });
  tableRows.push(...Array.from({ length: generated }, (_, i) => generatedRow(i + 1)));
  const pager = { hidden: true };
  const pageStatus = { textContent: "" };
  const steps = [
    ["previous", "-1"],
    ["next", "1"],
  ].map(([name, pageStep]) => {
    const attributes = new Map<string, string>();
    return {
      name,
      dataset: { pageStep },
      attributes,
      setAttribute: (attribute: string, value: string) => attributes.set(attribute, value),
      getAttribute: (attribute: string) => attributes.get(attribute) ?? null,
      addEventListener: listen(name),
    };
  });
  let scrolls = 0;
  const table = { scrollIntoView: () => scrolls++ };
  // The style that the classic script adds to the head.
  // How many rows were hidden when the module script removed it, or undefined before then.
  let hiddenAtRemoval: number | undefined;
  const prePaint = { remove: () => (hiddenAtRemoval = tableRows.filter((row) => row.hidden).length) };
  const lookups: Record<string, unknown> = {
    "input[data-search]": missing === "search" ? null : search,
    "select[data-category-filter]": missing === "category" ? null : categorySelect,
    "select[data-language-filter]": missing === "menu" ? null : select,
    "[data-filter-status]": status,
    "[data-pager]": pager,
    "[data-page-status]": pageStatus,
    ".table-card": table,
    "style[data-pre-paint]": prePaint,
  };
  const lists: Record<string, unknown[]> = {
    "[data-version-filter] button": missing === "buttons" ? [] : buttons,
    "tbody tr[data-plugin]": tableRows,
    "[data-pager] button": steps,
  };
  const location = { href };
  const document = {
    querySelector: (selector: string) => {
      if (!(selector in lookups)) throw new Error(`the script asks for ${selector}`);
      return lookups[selector];
    },
    querySelectorAll: (selector: string) => {
      if (!(selector in lists)) throw new Error(`the script asks for all ${selector}`);
      return lists[selector];
    },
  };
  const writes: string[] = [];
  const pushes: string[] = [];
  const history = {
    replaceState: (_state: unknown, _title: string, next: string) => {
      location.href = String(next);
      writes.push(location.href);
    },
    pushState: (_state: unknown, _title: string, next: string) => {
      location.href = String(next);
      pushes.push(location.href);
    },
  };
  // Timers wait until the test runs them, as the page's would wait for a pause in typing.
  const timers = new Map<number, { run: () => void; delay: number }>();
  let nextTimer = 0;
  const setTimeout = (run: () => void, delay: number) => (timers.set(++nextTimer, { run, delay }), nextTimer);
  const clearTimeout = (timer?: number) => timers.delete(timer!);
  runInNewContext(script, { document, location, history, URL, setTimeout, clearTimeout, addEventListener: listen("window") });
  return {
    search,
    select,
    categorySelect,
    status,
    location,
    shown,
    writes,
    pushes,
    timers,
    pager,
    pageStatus,
    steps,
    scrolls: () => scrolls,
    hiddenAtRemoval: () => hiddenAtRemoval,
    all: () => tableRows.map((r) => r.dataset.plugin),
    visible: () => tableRows.filter((r) => !r.hidden).map((r) => r.dataset.plugin),
    fire: (name: string) => events.get(name)!(),
    runTimers: () => {
      for (const [timer, { run }] of [...timers]) (timers.delete(timer), run());
    },
  };
}

describe("the home page script", () => {
  const PAGE = "https://jmgirard.github.io/zotero-plugin-index/";

  test("reads q into the search box on load and shows only the rows it matches", () => {
    const page = homeScript(`${PAGE}?q=TOOLS`);
    expect(page.search.value).toBe("TOOLS");
    expect(page.visible()).toEqual(["a-cafe@example.org", "b-cafe@example.org"]);
    expect(page.status.textContent).toBe(`2 of ${ids.length} plugins`);
    expect([...page.shown].sort()).toEqual(["buttons", "category", "count", "menu", "search"]);
  });

  test("passes what the visitor types to the row test and writes it to q once typing stops", () => {
    const page = homeScript(PAGE);
    expect(page.visible()).toHaveLength(ids.length);
    expect(page.status.textContent).toBe(`${ids.length} plugins`);
    for (const value of [" L", " LO", " LOG "]) {
      page.search.value = value;
      page.fire("search:input");
    }
    expect(page.visible()).toEqual(["b-cafe@example.org"]);
    expect(page.writes).toEqual([]);
    expect([...page.timers.values()].map(({ delay }) => delay)).toEqual([500]);
    page.runTimers();
    expect(page.writes).toEqual([`${PAGE}?q=LOG`]);
    page.search.value = "";
    page.fire("search:input");
    page.runTimers();
    expect(page.visible()).toHaveLength(ids.length);
    expect(page.location.href).toBe(PAGE);
  });

  test("removes a language parameter that names no option and keeps q", () => {
    const page = homeScript(`${PAGE}?language=xx&q=log`);
    expect(page.writes).toEqual([`${PAGE}?q=log`]);
    expect(page.visible()).toEqual(["b-cafe@example.org"]);
  });

  describe("the category menu", () => {
    test("shows only the rows of the chosen category, counts them, and writes category", () => {
      const page = homeScript(PAGE);
      page.categorySelect.value = "attachments";
      page.fire("category:change");
      expect(page.visible()).toEqual(["a-cafe@example.org", "min-only-plugin@example.org"]);
      expect(page.status.textContent).toBe(`2 of ${ids.length} plugins`);
      expect(page.writes).toEqual([`${PAGE}?category=attachments`]);
    });

    test("All categories shows every row and removes category from the address", () => {
      const page = homeScript(`${PAGE}?category=attachments`);
      page.categorySelect.value = "";
      page.fire("category:change");
      expect(page.visible()).toHaveLength(ids.length);
      expect(page.status.textContent).toBe(`${ids.length} plugins`);
      expect(page.location.href).toBe(PAGE);
    });

    test("reads category on load and when Back or Forward changes the address", () => {
      const page = homeScript(`${PAGE}?category=translation`);
      expect(page.categorySelect.value).toBe("translation");
      expect(page.visible()).toEqual(["locale-plugin@example.org"]);
      expect(page.writes).toEqual([]);
      page.location.href = `${PAGE}?category=organization`;
      page.fire("window:popstate");
      expect(page.categorySelect.value).toBe("organization");
      expect(page.visible()).toEqual(["next-plugin@example.org"]);
    });

    test("selects All categories for a value that no option has and removes it, keeping q", () => {
      const page = homeScript(`${PAGE}?category=notes&q=log`);
      expect(page.categorySelect.value).toBe("");
      expect(page.writes).toEqual([`${PAGE}?q=log`]);
      expect(page.visible()).toEqual(["b-cafe@example.org"]);
    });

    test.each([
      ["the search box", "q=tools", ["a-cafe@example.org"]],
      ["the language menu", "language=zh", ["min-only-plugin@example.org"]],
      ["the version buttons", "zotero=7", ["a-cafe@example.org"]],
    ])("shows only the rows that it and %s both pass", (_, other, visible) => {
      const page = homeScript(`${PAGE}?category=attachments&${other}`);
      expect(page.visible()).toEqual(visible);
      expect(page.status.textContent).toBe(`1 of ${ids.length} plugins`);
    });

    test("a menu change on page 2 goes back to page 1 of the rows it passes", () => {
      const page = homeScript(`${PAGE}?page=2`, 120);
      page.categorySelect.value = "translation";
      page.fire("category:change");
      const translated = page.all().filter((id) => id === "locale-plugin@example.org" || id!.startsWith("gen-"));
      expect(translated.length).toBeGreaterThan(50);
      expect(page.visible()).toEqual(translated.slice(0, 50));
      expect(page.pageStatus.textContent).toBe("Page 1 of 3");
      expect(page.writes).toEqual([`${PAGE}?category=translation`]);
    });
  });

  test("counts every row for a query of spaces only", () => {
    const page = homeScript(PAGE);
    page.search.value = "   ";
    page.fire("search:input");
    expect(page.visible()).toHaveLength(ids.length);
    expect(page.status.textContent).toBe(`${ids.length} plugins`);
  });

  describe("pages", () => {
    // The built rows and 120 generated ones, 3 pages with no filter on while the fixture
    // holds 30 rows or fewer.
    const GENERATED = 120;
    const PAGES = Math.ceil((ids.length + GENERATED) / 50);
    const gen = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `gen-${from + i}@example.org`);
    const pressed = (page: ReturnType<typeof homeScript>) => page.steps.map((step) => step.getAttribute("aria-disabled"));

    // The tests below walk pages 1 to 3, so a larger fixture fails here first, by name.
    test("the fixture and the generated rows fill 3 pages", () => {
      expect(PAGES).toBe(3);
    });

    test("shows the first 50 rows, the pager, and a count of every row", () => {
      const page = homeScript(PAGE, GENERATED);
      const total = ids.length + GENERATED;
      expect(page.visible()).toEqual(page.all().slice(0, 50));
      expect([page.pager.hidden, page.pageStatus.textContent, pressed(page)]).toEqual([false, `Page 1 of ${PAGES}`, ["true", "false"]]);
      expect(page.status.textContent).toBe(`${total} plugins`);
    });

    test("pages the rows a filter passes and counts them all", () => {
      const page = homeScript(`${PAGE}?q=bulk`, GENERATED);
      expect(page.visible()).toEqual(gen(1, 50));
      expect(page.status.textContent).toBe(`${GENERATED} of ${ids.length + GENERATED} plugins`);
      expect(page.pageStatus.textContent).toBe("Page 1 of 3");
    });

    test.each([
      ["alpha", 50, true, "Page 1 of 1"],
      ["beta", 51, false, "Page 1 of 2"],
    ])("a filter that passes %s's %i rows sets the pager's hidden to %s", (query, count, hidden, text) => {
      const page = homeScript(`${PAGE}?q=${query}`, GENERATED);
      expect(page.visible()).toEqual(gen(1, Math.min(count, 50)));
      expect([page.pager.hidden, page.pageStatus.textContent]).toEqual([hidden, text]);
    });

    test("Next and Previous move a page, add a history entry, and scroll to the table, and do nothing at an end", () => {
      const page = homeScript(PAGE, GENERATED);
      const next = () => page.fire("next:click");
      const previous = () => page.fire("previous:click");
      previous();
      expect(page.pushes).toEqual([]);
      next();
      expect(page.visible()).toEqual(page.all().slice(50, 100));
      next();
      expect(page.visible()).toEqual(page.all().slice(100));
      expect(pressed(page)).toEqual(["false", "true"]);
      next();
      previous();
      previous();
      expect(page.pushes).toEqual([`${PAGE}?page=2`, `${PAGE}?page=3`, `${PAGE}?page=2`, PAGE]);
      expect(page.visible()).toEqual(page.all().slice(0, 50));
      expect(page.scrolls()).toBe(4);
      expect(page.writes).toEqual([]);
    });

    test("Next drops a write that typing left waiting, and its address keeps the search text", () => {
      const page = homeScript(PAGE, GENERATED);
      page.search.value = "bulk";
      page.fire("search:input");
      page.fire("next:click");
      page.runTimers();
      expect(page.pushes).toEqual([`${PAGE}?q=bulk&page=2`]);
      expect(page.writes).toEqual([]);
      expect(page.visible()).toEqual(gen(51, 100));
    });

    test("a search input or a menu change on page 2 goes back to page 1 and drops page from the address", () => {
      const typed = homeScript(`${PAGE}?page=2`, GENERATED);
      typed.search.value = "bulk";
      typed.fire("search:input");
      expect(typed.visible()).toEqual(gen(1, 50));
      expect(typed.location.href).toBe(`${PAGE}?page=2`);
      typed.runTimers();
      expect(typed.location.href).toBe(`${PAGE}?q=bulk`);
      const picked = homeScript(`${PAGE}?page=2`, GENERATED);
      picked.select.value = "";
      picked.fire("select:change");
      expect(picked.visible()).toEqual(picked.all().slice(0, 50));
      expect(picked.writes).toEqual([PAGE]);
    });

    test("reads page on load and shows that page", () => {
      const page = homeScript(`${PAGE}?page=3`, GENERATED);
      expect(page.visible()).toEqual(page.all().slice(100));
      expect(page.writes).toEqual([]);
    });

    test.each(["1", "", "0", "-2", "x", "02", String(PAGES + 1)])("shows page 1 for page=%j and removes it from the address", (value) => {
      const page = homeScript(`${PAGE}?page=${value}`, GENERATED);
      expect(page.visible()).toEqual(page.all().slice(0, 50));
      expect(page.writes).toEqual([PAGE]);
    });

    test("judges page against the pages the filters on the address leave", () => {
      const page = homeScript(`${PAGE}?q=gamma&page=2`, GENERATED);
      expect(page.visible()).toEqual(gen(1, 20));
      expect(page.writes).toEqual([`${PAGE}?q=gamma`]);
    });

    test("Back and Forward read page again", () => {
      const page = homeScript(PAGE, GENERATED);
      page.location.href = `${PAGE}?page=2`;
      page.fire("window:popstate");
      expect(page.visible()).toEqual(page.all().slice(50, 100));
      page.location.href = PAGE;
      page.fire("window:popstate");
      expect(page.visible()).toEqual(page.all().slice(0, 50));
      expect(page.writes).toEqual([]);
    });
  });

  test("reads q again when Back or Forward changes the address, and drops a write that typing left waiting", () => {
    const page = homeScript(PAGE);
    page.search.value = "tools";
    page.fire("search:input");
    page.location.href = `${PAGE}?q=edits`;
    page.fire("window:popstate");
    expect(page.search.value).toBe("edits");
    expect(page.visible()).toEqual(["b-cafe@example.org"]);
    expect(page.timers.size).toBe(0);
  });

  test("removes the classic script's style once its first pass has hidden the rows off page 1", () => {
    const page = homeScript(PAGE, 120);
    expect(page.hiddenAtRemoval()).toBe(page.all().length - 50);
  });

  test.each(["search", "category", "menu", "buttons"] as const)("removes the classic script's style on a page with no %s", (missing) => {
    const page = homeScript(PAGE, 0, missing);
    expect(page.hiddenAtRemoval()).toBe(0);
  });
});

// The built home page's classic script run against a stand-in head, location, and window. It
// returns the attributes and text of each element the script appends to the head, and runs
// the window's error listeners on fire().
function prePaintScript(search: string, modules = true) {
  const html = home();
  const script = /<script>(.*?)<\/script>/s.exec(html)![1]!;
  type Element = { attributes: Record<string, string>; textContent: string; removed: boolean };
  const appended: Element[] = [];
  const document = {
    createElement: (tag: string) => {
      if (tag !== "style") throw new Error(`the script creates ${tag}`);
      const element: Element & { setAttribute: unknown; remove: unknown } = {
        attributes: {},
        textContent: "",
        removed: false,
        setAttribute: (name: string, value: string) => (element.attributes[name] = value),
        remove: () => (element.removed = true),
      };
      return element;
    },
    head: { append: (element: Element) => appended.push(element) },
  };
  const errors: (() => void)[] = [];
  const addEventListener = (type: string, listener: () => void) => {
    if (type !== "error") throw new Error(`the script listens for ${type}`);
    errors.push(listener);
  };
  const HTMLScriptElement = { prototype: modules ? { noModule: false } : {} };
  runInNewContext(script, { document, location: { search }, HTMLScriptElement, URLSearchParams, addEventListener });
  return {
    styles: () => appended.map(({ attributes, textContent }) => ({ attributes, textContent })),
    removed: () => appended.map(({ removed }) => removed),
    fire: () => errors.forEach((listener) => listener()),
  };
}

describe("the home page's classic script", () => {
  test("comes before the table", () => {
    const html = home();
    expect(html.indexOf("<script>")).toBeGreaterThan(-1);
    expect(html.indexOf("<script>")).toBeLessThan(html.indexOf('<table class="plugins">'));
  });

  test.each(PRE_PAINT_CASES.map(([search]) => search))("adds the style that prePaintStyle writes for %j", (search) => {
    expect(prePaintScript(search).styles()).toEqual([{ attributes: { "data-pre-paint": "" }, textContent: prePaintStyle(search, PAGE_SIZE) }]);
  });

  test("adds no style in a browser that does not run module scripts", () => {
    expect(prePaintScript("?page=2", false).styles()).toEqual([]);
  });

  test("removes its style on a window error, so a module script that failed leaves every row shown", () => {
    const page = prePaintScript("?page=2");
    expect(page.removed()).toEqual([false]);
    page.fire();
    expect(page.removed()).toEqual([true]);
  });
});

describe("the built site", () => {
  test("puts the top bar and the footer on every page", () => {
    const files = htmlFiles(out);
    expect(files).toHaveLength(ids.length + 2);
    for (const path of files) {
      const html = readFileSync(join(out, path), "utf8");
      const bar = /<body><header class="topbar"><div class="topbar-inner">(.*?)<\/div><\/header><main>/s.exec(html)?.[1];
      expect(bar, path).toBe(
        '<a class="brand" href="/zotero-plugin-index/">Zotero plugin index</a><nav aria-label="Site">' +
          '<a href="/zotero-plugin-index/about/">About</a>' +
          '<a href="https://github.com/jmgirard/zotero-plugin-index/issues/new?template=add-plugin.yml" data-add-plugin>Add a plugin</a>' +
          '<a href="/zotero-plugin-index/v1/plugins.json">Data</a></nav>',
      );
      const foot = /<\/main><footer class="foot"><div class="foot-inner foot-rule">(.*?)<\/div><\/footer><\/body>/s.exec(html)?.[1];
      expect(foot, path).toBe(
        '<p data-fact="not-vetted">This index does not vet the plugins it lists.</p>' +
          "<p>The build read each plugin's repository and releases on 2026-10-25.</p>" +
          '<p>Data file: <a href="/zotero-plugin-index/v1/plugins.json">v1/plugins.json</a></p>',
      );
    }
    expect(existsSync(join(ROOT, ".github/ISSUE_TEMPLATE/add-plugin.yml"))).toBe(true);
  });

  test("carries its styles in each page and links no stylesheet", () => {
    for (const path of htmlFiles(out)) {
      const html = readFileSync(join(out, path), "utf8");
      // The minified rules can hold "<", as in @media (width<=760px).
      expect(/<style>(.*?)<\/style>/s.exec(html)?.[1], path).toContain(".card");
      expect(html, path).not.toMatch(/<link[^>]*rel="stylesheet"/);
    }
  });

  test("has scripts on the home page only, a classic one and then a module", () => {
    const files = htmlFiles(out);
    expect(files).toContain("index.html");
    for (const file of files) expect(readFileSync(join(out, file), "utf8").includes("<script"), file).toBe(file === "index.html");
    expect(readFileSync(join(out, "index.html"), "utf8").match(/<script[\s>]/g)).toEqual(["<script>", "<script "]);
  });

  test("has no trace of the Zotero version field", () => {
    const files = (readdirSync(out, { recursive: true }) as string[]).filter((path) => statSync(join(out, path)).isFile());
    expect(files.length).toBeGreaterThan(ids.length);
    const traces = ['id="zotero-version"', 'for="zotero-version"', "Your Zotero version", "zotero-plugin-index:zotero-version", "data-result-for"];
    for (const file of files) {
      const text = readFileSync(join(out, file), "utf8");
      for (const trace of traces) expect(text.includes(trace), `${file}: ${trace}`).toBe(false);
    }
  });
});

describe("the newest Zotero release", () => {
  // The shared fixture has no zoteroRelease, so these records get their own two builds.
  const base = records.find((record) => record.id === "first-plugin@example.org")!;
  const UP_TO = "up-to-10-0@example.org";
  const FROM = "from-10-1@example.org";
  const ranged = (id: string, range: { strictMinVersion?: string; strictMaxVersion?: string }): PluginRecord => {
    const { strictMinVersion: _min, strictMaxVersion: _max, ...upstream } = base.upstream!;
    return { ...base, id, upstream: { ...upstream, id, ...range }, reports: [], overrides: [] };
  };
  const plugins = [ranged(UP_TO, { strictMinVersion: "7.0", strictMaxVersion: "10.0.*" }), ranged(FROM, { strictMinVersion: "10.1" })];
  const built: Record<"known" | "unknown", string> = { known: "", unknown: "" };
  beforeAll(() => {
    for (const [name, zoteroRelease] of [["known", "10.0.7"], ["unknown", undefined]] as const) {
      const dir = outWith(JSON.stringify({ schemaVersion: 1, generatedAt: "2026-10-30T06:17:00.000Z", zoteroRelease, plugins }));
      const run = pnpmSite(["--out", dir]);
      if (run.status !== 0) throw new Error(run.stderr);
      built[name] = dir;
    }
  }, 120_000);

  const homeOf = (name: keyof typeof built) => readFileSync(join(built[name], "index.html"), "utf8");
  const pageOf = (name: keyof typeof built, id: string) => readFileSync(join(built[name], "plugins", id, "index.html"), "utf8");
  // The row's data-zotero value and its home mark for 10.
  const row = (html: string, id: string) => {
    const tr = new RegExp(`<tr data-plugin="${escaped(id)}"[^>]*data-zotero="([^"]*)"[^>]*>([\\s\\S]*?)</tr>`).exec(html)!;
    return { majors: tr[1], mark: /<td class="v" data-major="10">\s*<span class="mark" data-support="(\w+)"/.exec(tr[2])?.[1] };
  };
  const declared = (html: string) => /<tr data-major="10">[\s\S]*?<td data-declared="([^"]+)"/.exec(html)?.[1];

  test("the data files are valid against the v1 schema", () => {
    const validate = new Ajv({ allErrors: true }).compile(pluginsSchema);
    for (const dir of Object.values(built)) {
      const data = JSON.parse(readFileSync(join(dir, "v1/plugins.json"), "utf8"));
      expect(validate(data), JSON.stringify(validate.errors)).toBe(true);
    }
  });

  test("with zoteroRelease 10.0.7, marks a maximum of 10.0.* as all of 10 and leaves 10 out of a 10.1 minimum's row", () => {
    expect(row(homeOf("known"), UP_TO)).toEqual({ majors: "7 8 9 10", mark: "all" });
    expect(declared(pageOf("known", UP_TO))).toBe("all");
    expect(pageOf("known", UP_TO)).toContain('<span class="visually-hidden">Declares all of Zotero 10</span>');
    expect(row(homeOf("known"), FROM)).toEqual({ majors: "", mark: "none" });
  });

  test("with no zoteroRelease, marks a maximum of 10.0.* as part of 10 and keeps 10 in a 10.1 minimum's row", () => {
    expect(row(homeOf("unknown"), UP_TO)).toEqual({ majors: "7 8 9 10", mark: "some" });
    expect(declared(pageOf("unknown", UP_TO))).toBe("some");
    expect(row(homeOf("unknown"), FROM).majors).toBe("10");
  });

  // The About page's list of the newest release of each major, one item per major.
  const releases = (name: keyof typeof built) => {
    const list = /<ul[^>]*data-newest-releases>([\s\S]*?)<\/ul>/.exec(readFileSync(join(built[name], "about/index.html"), "utf8"))![1]!;
    return [...list.matchAll(/<li data-major="(\d+)">\s*([^<]*?)\s*<\/li>/g)].map(([, major, text]) => [major, text]);
  };

  test("the About page names the newest release of each major: 10.0.7 from the data and the last releases of 7, 8, and 9", () => {
    expect(releases("known")).toEqual([
      ["7", "Zotero 7: 7.0.32"],
      ["8", "Zotero 8: 8.0.5"],
      ["9", "Zotero 9: 9.0.6"],
      ["10", "Zotero 10: 10.0.7"],
    ]);
  });

  test("the About page says that no release of 10 is known when the data has no zoteroRelease", () => {
    expect(releases("unknown").at(-1)).toEqual(["10", "Zotero 10: no release known, so the index counts 10.0 to 10.9"]);
  });
});

describe("pnpm site failures", () => {
  test.each([[["extra"]], [["--out"]]])("rejects %j with the usage line", (args) => {
    const usage = pnpmSite(args);
    expect(usage.status).toBe(1);
    expect(usage.stderr).toContain("usage: pnpm site [--out <dir>]");
  }, 60_000);

  test("reports an Astro build failure and writes no page", () => {
    const dir = outWith("{}");
    const failed = pnpmSite(["--out", dir]);
    expect(failed.status).toBe(1);
    expect(failed.stderr).toContain(`site-failed: ${join(dir, "v1", "plugins.json")} has no plugins list`);
    expect(readdirSync(dir)).toEqual(["v1"]);
  }, 60_000);

  test("refuses a site build that writes v1/ and leaves the data as it was", () => {
    const dir = outWith(readFileSync(FIXTURE, "utf8"));
    const clashRoot = resolve(ROOT, "test/fixtures/site-clash");
    const script = `import { buildSite } from ${JSON.stringify(resolve(ROOT, "src/site/site.ts"))};
      console.log(JSON.stringify(await buildSite(process.argv[1], process.argv[2])));`;
    const run = spawnSync(process.execPath, ["--input-type=module", "-e", script, dir, clashRoot], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 50_000,
    });
    expect(JSON.parse(run.stdout.trim().split("\n").at(-1)!)).toEqual({
      ok: false,
      message: "the site build wrote v1, which holds the data",
    });
    expect(readdirSync(dir)).toEqual(["v1"]);
    expect(readFileSync(join(dir, "v1/plugins.json"), "utf8")).toBe(readFileSync(FIXTURE, "utf8"));
  }, 60_000);
});

describe("pnpm site with no data file", () => {
  test("exits 1 and names the missing file", () => {
    const empty = mkdtempSync(join(tmpdir(), "zpi-site-empty-"));
    try {
      const missing = pnpmSite(["--out", empty]);
      expect(missing.status).toBe(1);
      expect(missing.stderr).toContain(`site-failed: cannot read ${join(empty, "v1", "plugins.json")}`);
      expect(readdirSync(empty)).toEqual([]);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  }, 60_000);
});

// The rules of the layout's style element, comments removed. A rule inside @media keeps
// its own selector.
function cssRules(layout: string): { selector: string; declarations: [string, string][] }[] {
  const css = /<style is:global>(.*?)<\/style>/s.exec(layout)![1]!.replace(/\/\*.*?\*\//gs, "");
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
    selector: selector!.trim().replace(/\s+/g, " "),
    declarations: body!
      .split(";")
      .map((declaration) => declaration.trim())
      .filter(Boolean)
      .map((declaration) => {
        const at = declaration.indexOf(":");
        return [declaration.slice(0, at).trim(), declaration.slice(at + 1).trim()];
      }),
  }));
}

describe("the site styles", () => {
  const layout = readFileSync(resolve(ROOT, "site/src/layouts/Base.astro"), "utf8");

  test("takes each margin, padding, gap, corner radius, and font size outside :root and .visually-hidden from a custom property, 0, or auto", () => {
    const sized = cssRules(layout)
      .filter(({ selector }) => selector !== ":root" && selector !== ".visually-hidden")
      .flatMap(({ selector, declarations }) =>
        declarations
          .filter(([property]) => /^(?:border-radius|padding(?:-[a-z-]+)?|margin(?:-[a-z-]+)?|gap|font-size)$/.test(property))
          .map(([property, value]) => ({ selector, property, value })),
      );
    for (const property of ["border-radius", "padding", "margin", "margin-left", "gap", "font-size"]) {
      expect(sized.map((declaration) => declaration.property)).toContain(property);
    }
    // Each value part, split at spaces outside parentheses.
    const literal = sized.flatMap(({ selector, property, value }) =>
      (value.match(/(?:[^\s(]+|\([^)]*\))+/g) ?? [])
        .filter((part) => !/^(?:var\(--[\w-]+\)|0|auto)$/.test(part))
        .map((part) => `${selector} { ${property}: ${part} }`),
    );
    expect(literal).toEqual([]);
  });

  test("hides the languages and release columns at 760 px or less, and the descriptions and source links at 560 px or less", () => {
    expect(layout).toMatch(/@media \(max-width: 760px\) \{\s*\.plugins \.lang,\s*\.plugins \.date \{\s*display: none;\s*\}/);
    expect(layout).toMatch(
      /@media \(max-width: 560px\) \{\s*\.plugins \.desc,\s*\.plugins \.links a\[data-link="source"\] \{\s*display: none;\s*\}/,
    );
    const html = home();
    expect(html.match(/<t[dh][^>]* class="lang"/g)).toHaveLength(ids.length + 2);
    expect(html.match(/<t[dh][^>]* class="date"/g)).toHaveLength(ids.length + 2);
  });

  test("draws the language and category menus' arrow in currentColor, inset from the right by the left padding", () => {
    const menu = cssRules(layout).filter(({ selector }) => selector === "[data-language-filter], [data-category-filter]");
    const drawn = new Map(menu.find(({ declarations }) => declarations.some(([property]) => property === "appearance"))!.declarations);
    expect(drawn.get("appearance")).toBe("none");
    const gradients = drawn.get("background-image")!.match(/linear-gradient\([^)]*\)/g)!;
    expect(gradients).toHaveLength(2);
    for (const gradient of gradients) expect(gradient).toContain("currentColor");
    const left = drawn.get("padding")!.split(" ")[3];
    // The last layer is the arrow's right half, so its offset is the arrow's inset.
    expect(drawn.get("background-position")!.split(",").at(-1)!.trim()).toBe(`right ${left} top 50%`);
    // Forced colors drop gradients, so there the browser draws its own arrow.
    expect(layout).toMatch(/@media \(forced-colors: active\) \{\s*\[data-language-filter\],\s*\[data-category-filter\] \{[^}]*appearance: auto;/);
  });

  test("leaves styles out of every other .astro file", () => {
    const files = (readdirSync(resolve(ROOT, "site/src"), { recursive: true }) as string[]).filter(
      (path) => path.endsWith(".astro") && path !== join("layouts", "Base.astro"),
    );
    for (const file of ["pages/index.astro", "pages/plugins/[id]/index.astro", "components/Icon.astro"]) {
      expect(files).toContain(join(file));
    }
    for (const file of files) {
      const source = readFileSync(resolve(ROOT, "site/src", file), "utf8");
      expect(source, file).not.toMatch(/<style[\s>]/);
      expect(source, file).not.toMatch(/\sstyle=/);
    }
  });
});

// The color variables of one :root block of the layout.
function colors(block: string): Map<string, string> {
  return new Map([...block.matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6});/gi)].map(([, name, value]) => [name!, value!.toLowerCase()]));
}

// WCAG 2.2 contrast ratio of two #rrggbb colors.
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((at) => {
      const c = parseInt(hex.slice(at, at + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

describe("the site colors", () => {
  const layout = readFileSync(resolve(ROOT, "site/src/layouts/Base.astro"), "utf8");
  const light = colors(/\n {6}:root \{(.*?)\n {6}\}/s.exec(layout)![1]!);
  const darkBlock = /@media \(prefers-color-scheme: dark\) \{\s*:root \{(.*?)\}/s.exec(layout)![1]!;
  const dark = new Map([...light, ...colors(darkBlock)]);
  // Each text token on each surface, and each status token on its own background and on
  // the surface, at 4.5:1; each mark or icon token on the surface at 3:1, and the star, which
  // the plugin page head shows on the page background, on both.
  const PAIRS: [string, string, number][] = [
    ...["--text", "--muted", "--link"].flatMap((text) =>
      ["--bg", "--surface", "--hover"].map((surface): [string, string, number] => [text, surface, 4.5]),
    ),
    ...["--ok", "--part", "--bad"].flatMap((status): [string, string, number][] => [
      [status, `${status}-bg`, 4.5],
      [status, "--surface", 4.5],
    ]),
    ["--faint", "--surface", 3],
    ["--none", "--surface", 3],
    ["--star", "--bg", 3],
    ["--star", "--surface", 3],
  ];

  test.each([
    ["light", light],
    ["dark", dark],
  ])("gives each listed token pair its contrast in the %s scheme", (_, scheme) => {
    for (const [text, background, least] of PAIRS) {
      expect(scheme.get(text), text).toMatch(/^#/);
      expect(scheme.get(background), background).toMatch(/^#/);
      expect(contrast(scheme.get(text)!, scheme.get(background)!), `${text} on ${background}`).toBeGreaterThanOrEqual(least);
    }
  });

  test("redefines every hex color of the light block in the dark block, so none falls back to it", () => {
    expect([...colors(darkBlock).keys()].sort()).toEqual([...light.keys()].sort());
  });

  const together = cssRules(layout).flatMap(({ selector, declarations }) => {
    const get = (name: string) => declarations.find(([property]) => property === name)?.[1];
    const text = get("color");
    const background = get("background") ?? get("background-color");
    return text && background ? [{ selector, text, background }] : [];
  });

  test.each([
    ["light", light],
    ["dark", dark],
  ])("gives the text and background that each rule sets together a contrast of at least 4.5:1 in the %s scheme", (_, scheme) => {
    expect(together.map(({ selector }) => selector)).toEqual(
      expect.arrayContaining(["body", ".btn", '.mark[data-support="all"]', '[data-version-filter] button[aria-pressed="true"]']),
    );
    for (const { selector, text, background } of together) {
      const [, textName] = /^var\((--[\w-]+)\)$/.exec(text) ?? [];
      const [, backgroundName] = /^var\((--[\w-]+)\)$/.exec(background) ?? [];
      expect(scheme.get(textName!), `${selector} color`).toMatch(/^#/);
      expect(scheme.get(backgroundName!), `${selector} background`).toMatch(/^#/);
      expect(contrast(scheme.get(textName!)!, scheme.get(backgroundName!)!), selector).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("colors each report button from its verdict's pair", () => {
    expect(layout).toMatch(/\.button\[data-report="works"\] \{\s*background: var\(--ok-bg\);\s*color: var\(--ok\);\s*\}/);
    expect(layout).toMatch(/\.button\[data-report="broken"\] \{\s*background: var\(--bad-bg\);\s*color: var\(--bad\);\s*\}/);
  });

  test("fills the plugin page's star with --star and no stroke, with CanvasText in forced colors, and keeps it on one line", () => {
    const base = /\n {6}\[data-repo-stars\] \.icon \{[^}]*fill: var\(--star\);[^}]*stroke: none;/.exec(layout);
    const forced = /@media \(forced-colors: active\) \{\s*\[data-repo-stars\] \.icon \{\s*fill: CanvasText;/.exec(layout);
    expect(base).not.toBeNull();
    expect(forced).not.toBeNull();
    // Both rules have one specificity, so the forced-colors fill wins only when it comes later.
    expect(forced!.index).toBeGreaterThan(base!.index);
    expect(layout).toMatch(/\[data-repo-stars\] \{\s*white-space: nowrap;/);
  });

  // A report button's border takes its text color, and WCAG 2.2 asks 3:1 for a control's edge.
  test.each([
    ["light", light],
    ["dark", dark],
  ])("gives each report button's edge a contrast of at least 3:1 with the surface in the %s scheme", (_, scheme) => {
    expect(layout).toMatch(/\.button \{[^}]*border: 1px solid currentColor;/);
    for (const border of ["--ok", "--bad"]) {
      expect(contrast(scheme.get(border)!, scheme.get("--surface")!), `${border} on --surface`).toBeGreaterThanOrEqual(3);
    }
  });

  test.each([
    ["light", light],
    ["dark", dark],
  ])("gives the edges of the search box, the menu, the version buttons, the pager buttons, and the plugin page links a contrast of at least 3:1 with the surface and the page in the %s scheme", (_, scheme) => {
    const edges = cssRules(layout).flatMap(({ selector, declarations }) =>
      declarations
        .filter(([property, value]) => (property === "border" || property === "border-left") && value.includes("var("))
        .filter(() => [".search input", "[data-language-filter]", "[data-version-filter]", ".btn", ".pager button"].some((control) => selector.includes(control)))
        .map(([, value]) => ({ selector, token: /var\((--[\w-]+)\)/.exec(value)?.[1] })),
    );
    expect(edges.map(({ selector }) => selector)).toEqual([
      ".search input, [data-language-filter], [data-category-filter]",
      "[data-version-filter]",
      "[data-version-filter] button",
      ".pager button",
      ".btn",
    ]);
    // The controls sit on the page background and fill with the surface color.
    for (const { selector, token } of edges) {
      for (const background of ["--surface", "--bg"]) {
        expect(contrast(scheme.get(token!)!, scheme.get(background)!), `${selector}: ${token} on ${background}`).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
