import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { Ajv } from "ajv";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import pluginsSchema from "../schemas/plugins.v1.schema.json" with { type: "json" };
import { displayName, pluginHref, rangeText, safeHref, type PluginRecord } from "../site/src/data.ts";
import type { PluginsFile } from "../src/build/build.ts";
import { shownDescription } from "../src/site/description.ts";
import { appliedLanguages, languageName } from "../src/site/languages.ts";
import { compareVersions, declaredRange, majorSupport, ZOTERO_MAJORS } from "../src/site/version.ts";

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

  test("writes the home page and one page for each record under its raw id", () => {
    expect(existsSync(join(out, "index.html"))).toBe(true);
    expect(readdirSync(join(out, "plugins")).sort()).toEqual([...ids].sort());
    for (const id of ids) expect(readdirSync(join(out, "plugins", id))).toEqual(["index.html"]);
  });

  test("leaves the data and schema files byte-identical", () => {
    for (const [file, bytes] of before) expect(readFileSync(join(out, file)).equals(bytes), file).toBe(true);
  });

  test("starts every link inside the site with the Pages path", () => {
    const files = htmlFiles(out);
    expect(files).toHaveLength(ids.length + 1);
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

const PILL =
  /<span class="pill" role="listitem" data-major="([^"]+)" data-support="([^"]+)" title="([^"]*)"><span aria-hidden="true">([^<]*)<\/span><span class="visually-hidden">([^<]*)<\/span><\/span>/g;

function pills(html: string) {
  return [...html.matchAll(PILL)].map(([, major, support, title, visible, hidden]) => ({ major, support, title, visible, hidden }));
}

function expectPills(html: string, record: PluginRecord): void {
  const marks: Record<string, string> = { all: "✓", some: "◐", none: "–" };
  const label = (major: string, support: string) =>
    support === "all"
      ? `Declares all of Zotero ${major}`
      : support === "some"
        ? `Declares part of Zotero ${major}. Declared range: ${rangeText(record)}`
        : `Does not declare Zotero ${major}`;
  const found = pills(html);
  expect(found.map(({ major, support }) => [major, support])).toEqual(
    ZOTERO_MAJORS.map((major) => [major, majorSupport(record, major)]),
  );
  for (const pill of found) {
    expect(pill.visible).toBe(`${pill.major} ${marks[pill.support!]}`);
    expect(pill.title).toBe(label(pill.major!, pill.support!));
    expect(pill.hidden).toBe(pill.title);
  }
}

describe("the site fixture", () => {
  test("holds each shape of row and page", () => {
    const pilled = records.filter((record) => !record.failure && hasBound(record));
    expect(records.some((record) => record.failure)).toBe(true);
    expect(records.some((record) => !record.failure && !hasBound(record))).toBe(true);
    expect(records.some((record) => record.upstream?.archived === true)).toBe(true);
    expect(records.some((record) => record.upstream?.description && !shownDescription(record))).toBe(true);
    expect(records.some((record) => record.overrides.some((o) => o.field === "description"))).toBe(true);
    for (const support of ["all", "some", "none"]) {
      expect(pilled.some((record) => ZOTERO_MAJORS.some((major) => majorSupport(record, major) === support)), support).toBe(true);
    }
    expect(records.some((record) => (record.reports?.length ?? 0) > 0)).toBe(true);
    expect(records.some((record) => record.upstream && record.reports?.length === 0)).toBe(true);
    expect(records.some((record) => record.upstream && !("reports" in record))).toBe(true);
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

describe("the report block", () => {
  test("shows the version the index read and the counts on each major", () => {
    const html = page("first-plugin@example.org");
    expect(fact(html, "report-version")).toBe("User reports on version 1.2.0, the version the index read");
    const counts = [...html.matchAll(/<li data-report-major="(\d+)">(.*?)<\/li>/gs)].map(([, major, text]) => [major, text.replace(/\s+/g, " ").trim()]);
    expect(counts).toEqual([
      ["7", "Zotero 7: 3 works, 1 broken"],
      ["8", "Zotero 8: 0 works, 2 broken"],
    ]);
    expect(html).not.toMatch(/\sdata-fact="no-reports"/);
  });

  test.each([
    ["an empty reports list", "old-plugin@example.org", "0.4.1"],
    ["no reports field", "{c2a6e4c8-1b7d-4f3a-9e2b-5d8f0a1c3e7b}", "3.0.0+r1"],
  ])("says the version has no reports yet for a record with %s", (_, id, version) => {
    const html = page(id);
    expect(fact(html, "report-version")).toBe(`User reports on version ${escaped(version)}, the version the index read`);
    expect(fact(html, "no-reports")).toBe("No reports on this version yet.");
    expect(html).not.toMatch(/\sdata-report-major="/);
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
      // Each button is named by its verdict and described by the prompt above it.
      expect(page(id)).toContain('<p class="report-links" id="report-prompt">Tried this version on Zotero? Report what you found:</p>');
      expect(page(id)).toMatch(/<a data-report="works" href="[^"]*" class="button" aria-describedby="report-prompt">Works<\/a>/);
      expect(page(id)).toMatch(/<a data-report="broken" href="[^"]*" class="button" aria-describedby="report-prompt">Broken<\/a>/);
    },
  );

  test("URL-encodes an id and a version that need it", () => {
    const href = reportLink(page("{c2a6e4c8-1b7d-4f3a-9e2b-5d8f0a1c3e7b}"), "works")!;
    expect(href.slice(href.indexOf("?") + 1)).toBe("template=works.yml&plugin=%7Bc2a6e4c8-1b7d-4f3a-9e2b-5d8f0a1c3e7b%7D&version=3.0.0%2Br1");
  });

  test("shows neither counts nor links for a record that was not read", () => {
    const html = page("broken-plugin@example.org");
    expect(html).not.toMatch(/\sdata-reports[\s>]/);
    expect(html).not.toMatch(/\sdata-report="/);
    expect(html).not.toMatch(/\sdata-fact="(?:report-version|no-reports)"/);
  });
});

// The h2 card sections before <details>, each with its markup.
function sections(html: string): { name: string; heading: string; body: string }[] {
  const top = html.slice(0, html.indexOf("<details>"));
  return [...top.matchAll(/<section class="card[^"]*" data-section="([^"]+)"[^>]*>\s*<h2>([^<]*)<\/h2>(.*?)<\/section>/gs)].map(
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
  test.each(ids)("opens the main content of %s with a back link, the name, the description, and the links", (id) => {
    const record = records.find((r) => r.id === id)!;
    const html = page(id);
    const description = shownDescription(record);
    const archived = record.upstream?.archived === true ? '<span class="badge" data-archived>Archived</span>' : "";
    const main = html.slice(html.indexOf("<main>") + "<main>".length, html.indexOf("</main>"));
    const head = new RegExp(
      `^<a class="back" href="/zotero-plugin-index/" data-back>${ICON}All plugins</a>` +
        `<div class="page-head" data-page-head>(.*?)<div class="actions" data-links>(.*?)</div></div>`,
      "s",
    ).exec(main.replace(/>\s+</g, "><").trim());
    expect(head?.[1]).toBe(
      `<h1>${escaped(displayName(record))}${archived}</h1>` +
        (description ? `<p class="description" data-description>${escaped(description)}</p>` : ""),
    );
    const { upstream } = record;
    const repoUrl = upstream?.repoUrl ?? record.repoUrl;
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
    const started = read && (record.startTests?.length ?? 0) > 0;
    const found = sections(html);
    // No other section or h2 sits between the layout's top and <details>.
    const top = html.slice(html.indexOf("<main>"), html.indexOf("<details>"));
    expect(top.split("<section").length - 1).toBe(found.length);
    expect(top.split("<h2").length - 1).toBe(found.length);
    expect(found.map(({ name, heading }) => [name, heading])).toEqual([
      ["support", "Declared support"],
      ...(started ? [["start-test", "Start test"]] : []),
      ...(read ? [["reports", "User reports"]] : []),
      ...(read ? [["about", "About"]] : []),
    ]);
    const body = (name: string) => found.find((section) => section.name === name)!.body;
    const holds: [string, string[]][] = [
      [
        "support",
        [
          record.failure ? 'data-fact="failure"' : hasBound(record) ? 'class="pills"' : 'data-status="no-range"',
          ...(hasBound(record) ? ['data-fact="declared-range"'] : []),
        ],
      ],
      ...(started ? [["start-test", ['data-fact="start-tests"', 'data-fact="start-test-note"']] as [string, string[]]] : []),
      ...(read
        ? [
            [
              "reports",
              [
                'data-fact="report-version"',
                (record.reports?.length ?? 0) > 0 ? "data-report-major=" : 'data-fact="no-reports"',
                'data-report="works"',
                'data-report="broken"',
              ],
            ] as [string, string[]],
          ]
        : []),
      ...(read ? [["about", ['data-fact="languages"']] as [string, string[]]] : []),
    ];
    for (const [name, markers] of holds) {
      expectInOrder(body(name), markers);
      // Each fact sits in its section and nowhere else on the page.
      for (const marker of markers) expect(html.split(marker).length - 1, marker).toBe(marker === "data-report-major=" ? record.reports!.length : 1);
    }
    if (!hasBound(record)) expect(html).not.toContain('data-fact="declared-range"');
    if (!read) expect(html).not.toMatch(/data-fact="languages"/);
    if (!record.failure && hasBound(record)) expectPills(body("support"), record);
    else expect(pills(html)).toEqual([]);
  });

  test.each(ids)("holds the minor facts of %s in a closed Details section after the sections", (id) => {
    const record = records.find((r) => r.id === id)!;
    const html = page(id);
    expect(html).not.toMatch(/<details\s+open/);
    const start = html.indexOf("<details>");
    const end = html.indexOf("</details>");
    const inside = ['data-fact="id"'];
    if (record.upstream) {
      if (typeof record.upstream.archived === "boolean") inside.push('data-fact="archived"');
      inside.push(...["repo-created", "latest-release", "release-count", "open-issues", "update-host"].map((n) => `data-fact="${n}"`));
    }
    if (record.overrides.length > 0) inside.push("data-override=");
    for (const marker of inside) {
      const at = html.indexOf(marker);
      expect(at, marker).toBeGreaterThan(start);
      expect(at, marker).toBeLessThan(end);
    }
    expect(html.indexOf('data-fact="not-vetted"')).toBeGreaterThan(end);
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
    expect(page("first-plugin@example.org")).toContain(`<p class="languages">Menus and settings in: <span data-fact="languages">`);
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

  test("shows the failure and no declared range for a record that was not read", () => {
    const html = page("broken-plugin@example.org");
    expect(fact(html, "failure")).toBe(
      "The last build could not read this plugin: no-xpi-release: no release of example/broken-plugin has an .xpi asset",
    );
    expect(html).not.toContain('data-fact="declared-range"');
    expect(html).toContain("<h1>broken-plugin@example.org</h1>");
  });

  test.each([
    ["old-plugin@example.org", "Yes"],
    ["first-plugin@example.org", "No"],
  ])("shows whether the repo of %s is archived", (id, text) => {
    expect(page(id)).toMatch(/<dt>Archived on GitHub<\/dt>\s*<dd data-fact="archived">/);
    expect(fact(page(id), "archived")).toBe(text);
  });

  test("shows each start-test result in words outside the Details section, with the note that a start is not a working plugin", () => {
    const html = page("no-range-plugin@example.org");
    expect(fact(html, "start-tests")).toBe(
      "Zotero 7.0.32 started; Zotero 8.0.4 failed at startup; Zotero 9.0.6 did not install; Zotero 10.0.6 gave no answer in time",
    );
    expect(html).toMatch(/<p>\s*Starts in Zotero: <span data-fact="start-tests">/);
    const note = /data-fact="start-test-note"[^>]*>(.*?)<\/p>/s.exec(html)?.[1].replace(/\s+/g, " ").trim();
    expect(note).toBe(
      "The daily build installs version 1.0.0 in a new Zotero profile on Linux and waits 3 seconds. A start test does not show that the plugin works.",
    );
    expect(html.indexOf("data-start-tests")).toBeLessThan(html.indexOf("<details>"));
    // The note's 3 seconds is the reporter's wait after the install.
    const reporter = readFileSync(resolve(ROOT, "src/start-test/reporter/bootstrap.js"), "utf8");
    expect(/^const SETTLE_MS = (\d+);$/m.exec(reporter)?.[1]).toBe("3000");
  });

  // A read record and a failed one, the two ways a page has no startTests.
  test.each(["first-plugin@example.org", "broken-plugin@example.org"])("shows no start-test line for %s, which has no startTests", (id) => {
    expect(records.find((record) => record.id === id)?.startTests).toBeUndefined();
    expect(page(id)).not.toMatch(/\sdata-start-tests[\s>]|\sdata-fact="start-test/);
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
        ? `<time datetime="${released.slice(0, 10)}">${new Date(released).toLocaleDateString("en", { month: "short", year: "numeric", timeZone: "UTC" })}</time>`
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

  // The site builds in New York time (pnpmSite), where 00:30 UTC on the 1st is still the month before.
  test("shows the release month in UTC", () => {
    expect(row("a-cafe@example.org").cells.at(-2)!.html).toBe('<time datetime="2026-07-01">Jul 2026</time>');
    expect(row("b-cafe@example.org").cells.at(-2)!.html).toBe('<time datetime="2025-12-31">Dec 2025</time>');
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
      '<span class="mark" data-support="all" aria-hidden="true">✓</span> Declares all of that Zotero version',
      '<span class="mark" data-support="some" aria-hidden="true">◐</span> Declares part of it',
      '<span class="mark" data-support="none" aria-hidden="true">–</span> Declares none of it',
      "No mark: the plugin declares no range",
      '<span class="start" data-start="started" aria-hidden="true">●</span> Started in the daily start test',
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

  test("holds every row without hidden, and the search box, the menu, the buttons, and the count inside hidden elements", () => {
    const html = home();
    expect(rows().length).toBe(ids.length);
    for (const { id, attributes } of rows()) expect(attributes, id).not.toMatch(/\shidden[\s=]|\shidden$/);
    const toolbar = html.slice(html.indexOf('<div class="toolbar">') + '<div class="toolbar">'.length, html.indexOf('</div><div class="table-card">'));
    expect(toolbar.length).toBeGreaterThan(0);
    expect(toolbar).toMatch(/^<p class="search" hidden><label for="search" class="visually-hidden">Search plugins<\/label><svg [^]*?<\/svg><input type="search" id="search" data-search placeholder="Search plugins" autocomplete="off"><\/p>/);
    expect(toolbar).toMatch(/<p class="language-filter" hidden><label[^>]*>[^<]*<\/label> <select[^>]*>(?:<option[^>]*>[^<]*<\/option>)+<\/select><\/p>/);
    expect(toolbar).toMatch(/<div class="version-filter" hidden><span[^>]*>[^<]*<\/span><div role="group"[^>]*>(?:<button[^>]*>[^<]*<\/button>)+<\/div><\/div>/);
    expect(toolbar).toMatch(/<p class="filter-status" role="status" data-filter-status hidden><\/p>$/);
    expect(html.match(/<input[\s>]/g)).toHaveLength(1);
    expect(html.match(/<select[\s>]/g)).toHaveLength(1);
    expect(html.match(/<button[\s>]/g)).toHaveLength(ZOTERO_MAJORS.length + 1);
    expect(html.match(/\sdata-filter-status/g)).toHaveLength(1);
  });

  test("hides each control's element while it has hidden, whatever display its other rules give it", () => {
    const hiding = cssRules(readFileSync(resolve(ROOT, "site/src/layouts/Base.astro"), "utf8")).filter(({ declarations }) =>
      declarations.some(([property, value]) => property === "display" && value === "none"),
    );
    const selectors = hiding.flatMap(({ selector }) => selector.split(",").map((part) => part.trim()));
    for (const control of [".search[hidden]", ".language-filter[hidden]", ".version-filter[hidden]", ".filter-status[hidden]"]) {
      expect(selectors, control).toContain(control);
    }
  });
});

// The built home page script run against stand-ins for the elements it reads, so a test can
// type in the search box, load an address, or go Back, and read which rows it hides.
function homeScript(href: string) {
  const html = home();
  const script = /<script type="module">(.*?)<\/script>/s.exec(html)![1]!;
  const shown = new Set<string>();
  const wrapper = (name: string) => ({ removeAttribute: (attribute: string) => attribute === "hidden" && shown.add(name) });
  const events = new Map<string, () => void>();
  const listen = (name: string) => (type: string, handler: () => void) => events.set(`${name}:${type}`, handler);
  const search = { value: "", addEventListener: listen("search"), closest: () => wrapper("search") };
  const options = [...html.matchAll(/<option value="([^"]*)">/g)].map(([, value]) => ({ value: unescaped(value!) }));
  const select = { value: "", options, addEventListener: listen("select"), closest: () => wrapper("menu") };
  const buttons = [...html.matchAll(/<button type="button"(?: value="([^"]*)")? aria-pressed="[^"]*">/g)].map(([, value]) => ({
    value: value ?? "",
    addEventListener: () => {},
    setAttribute: () => {},
    closest: () => wrapper("buttons"),
  }));
  const status = { textContent: "", removeAttribute: () => shown.add("count") };
  const body = html.slice(html.indexOf("<tbody>"), html.indexOf("</tbody>"));
  const tableRows = [...body.matchAll(/<tr data-plugin="([^"]*)" data-languages="([^"]*)" data-zotero="([^"]*)">(.*?)<\/tr>/gs)].map(
    ([, plugin, languages, zotero, inner]) => {
      const text = (attribute: string) => {
        const found = new RegExp(`\\s${attribute}>([^<]*)<`).exec(inner!);
        return found ? { textContent: unescaped(found[1]!) } : null;
      };
      return {
        hidden: false,
        dataset: { plugin: unescaped(plugin!), languages, zotero },
        querySelector: (selector: string) => text(selector.slice(1, -1)),
      };
    },
  );
  const lookups: Record<string, unknown> = {
    "input[data-search]": search,
    "select[data-language-filter]": select,
    "[data-filter-status]": status,
  };
  const lists: Record<string, unknown[]> = { "[data-version-filter] button": buttons, "tbody tr[data-plugin]": tableRows };
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
  const history = {
    replaceState: (_state: unknown, _title: string, next: string) => {
      location.href = String(next);
      writes.push(location.href);
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
    status,
    location,
    shown,
    writes,
    timers,
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
    expect([...page.shown].sort()).toEqual(["buttons", "count", "menu", "search"]);
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

  test("counts every row for a query of spaces only", () => {
    const page = homeScript(PAGE);
    page.search.value = "   ";
    page.fire("search:input");
    expect(page.visible()).toHaveLength(ids.length);
    expect(page.status.textContent).toBe(`${ids.length} plugins`);
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
});

describe("the built site", () => {
  test("puts the top bar and the footer on every page", () => {
    const files = htmlFiles(out);
    expect(files).toHaveLength(ids.length + 1);
    for (const path of files) {
      const html = readFileSync(join(out, path), "utf8");
      const bar = /<body><header class="topbar"><div class="topbar-inner">(.*?)<\/div><\/header><main>/s.exec(html)?.[1];
      expect(bar, path).toBe(
        '<a class="brand" href="/zotero-plugin-index/">Zotero plugin index</a><nav aria-label="Site">' +
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

  test("has a script on the home page only", () => {
    const files = htmlFiles(out);
    expect(files).toContain("index.html");
    for (const file of files) expect(readFileSync(join(out, file), "utf8").includes("<script"), file).toBe(file === "index.html");
    expect(readFileSync(join(out, "index.html"), "utf8").match(/<script[\s>]/g)).toHaveLength(1);
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

  test("leaves styles out of every other .astro file", () => {
    const files = (readdirSync(resolve(ROOT, "site/src"), { recursive: true }) as string[]).filter(
      (path) => path.endsWith(".astro") && path !== join("layouts", "Base.astro"),
    );
    for (const file of ["pages/index.astro", "pages/plugins/[id]/index.astro", "components/Support.astro"]) {
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
  // the surface, at 4.5:1; each mark or icon token on the surface at 3:1.
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
      expect.arrayContaining(["body", '.pill[data-support="all"]', '.mark[data-support="all"]', '[data-version-filter] button[aria-pressed="true"]']),
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
  ])("gives the edges of the search box, the menu, and the version buttons a contrast of at least 3:1 with the surface in the %s scheme", (_, scheme) => {
    const edges = cssRules(layout).flatMap(({ selector, declarations }) =>
      declarations
        .filter(([property, value]) => (property === "border" || property === "border-left") && value.includes("var("))
        .filter(() => [".search input", "[data-language-filter]", "[data-version-filter]"].some((control) => selector.includes(control)))
        .map(([, value]) => ({ selector, token: /var\((--[\w-]+)\)/.exec(value)?.[1] })),
    );
    expect(edges.map(({ selector }) => selector)).toEqual([
      ".search input, [data-language-filter]",
      "[data-version-filter]",
      "[data-version-filter] button",
    ]);
    for (const { selector, token } of edges) {
      expect(contrast(scheme.get(token!)!, scheme.get("--surface")!), `${selector}: ${token}`).toBeGreaterThanOrEqual(3);
    }
  });
});
