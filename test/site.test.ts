import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Ajv } from "ajv";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import pluginsSchema from "../schemas/plugins.v1.schema.json" with { type: "json" };
import { displayName, pluginHref, rangeText, type PluginRecord } from "../site/src/data.ts";
import type { PluginsFile } from "../src/build/build.ts";
import { shownDescription } from "../src/site/description.ts";
import { declaredRange, majorSupport, ZOTERO_MAJORS } from "../src/site/version.ts";

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
  return spawnSync(pnpmPath, ["--silent", "--dir", ROOT, "site", ...args], { encoding: "utf8", env, timeout: 50_000 });
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
    expect(ids.some((id) => /^\{[0-9a-f-]+\}$/.test(id))).toBe(true);
    expect(fixture.plugins.some((plugin) => "failure" in plugin)).toBe(true);
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
      expect(page(id)).toMatch(/<a data-report="works" href="[^"]*">Works<\/a>/);
      expect(page(id)).toMatch(/<a data-report="broken" href="[^"]*">Broken<\/a>/);
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

describe("the plugin page", () => {
  test.each(ids)("shows the parts of %s in order, with the minor facts in a closed Details section", (id) => {
    const record = records.find((r) => r.id === id)!;
    const html = page(id);
    const description = shownDescription(record);
    const support = record.failure ? 'data-fact="failure"' : hasBound(record) ? 'class="pills"' : 'data-status="no-range"';
    const archived = record.upstream?.archived === true ? "<span data-archived>(archived)</span>" : "";
    expectInOrder(html, [
      `<h1>${escaped(displayName(record))}${archived}</h1>`,
      ...(description ? [`<p class="description" data-description>${escaped(description)}</p>`] : []),
      support,
      ...(hasBound(record) ? ['data-fact="declared-range"'] : []),
      ...(record.upstream ? ['data-fact="languages"', "<section class=\"reports\" data-reports>"] : []),
      'data-fact="repository"',
      ...(record.upstream ? ['data-fact="releases"'] : []),
      "<details>",
    ]);
    if (!description) expect(html).not.toContain("data-description");
    if (!hasBound(record)) expect(html).not.toContain('data-fact="declared-range"');
    if (!record.upstream) expect(html).not.toMatch(/data-fact="(?:releases|languages)"/);
    if (!record.failure && hasBound(record)) expectPills(html, record);
    else expect(pills(html)).toEqual([]);

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
    expect(html).toContain('<a href="https://github.com/example/first-plugin">');
    expect(html).toContain('<a href="https://github.com/example/first-plugin/releases">');
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
    ["two upstream tags", "first-plugin@example.org", "English (United States), Chinese (China)"],
    ["an empty upstream list", "old-plugin@example.org", "None declared"],
    ["no languages field", "{c2a6e4c8-1b7d-4f3a-9e2b-5d8f0a1c3e7b}", "None declared"],
    ["an override for every version, in its own order", "no-range-plugin@example.org", "French, German"],
    ["an override for another version only", "min-only-plugin@example.org", "Chinese (China), Chinese (Taiwan)"],
    ["an override for the version read beside one for every version", "locale-plugin@example.org", "Portuguese (Brazil), Spanish (Latin America)"],
  ])("shows the interface languages for %s", (_, id, text) => {
    expect(page(id)).toContain(`<p class="languages">Interface languages: <span data-fact="languages">`);
    expect(fact(page(id), "languages")).toBe(text);
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

  // The row holds no other <li>, so it ends at the first </li> after it starts.
  function row(id: string): string {
    const html = home();
    const start = html.indexOf(` data-plugin="${escaped(id)}"`);
    expect(start, id).toBeGreaterThan(-1);
    return html.slice(start, html.indexOf("</li>", start));
  }

  test.each(ids)("shows the row of %s with its parts in order", (id) => {
    const record = records.find((r) => r.id === id)!;
    const html = row(id);
    const archived = record.upstream?.archived === true;
    const description = shownDescription(record);
    const status = record.failure ? `Not read: ${record.failure.name}` : hasBound(record) ? 'class="pills"' : "No declared range";
    expectInOrder(html, [
      `<a href="${escaped(pluginHref(id))}">${escaped(displayName(record))}</a>`,
      ...(archived ? ["<span data-archived>(archived)</span>"] : []),
      ...(description ? [`<p class="description" data-description>${escaped(description)}</p>`] : []),
      status,
    ]);
    if (!archived) expect(html).not.toContain("data-archived");
    if (!description) expect(html).not.toContain("data-description");
    if (!record.failure && hasBound(record)) expectPills(html, record);
    else expect(pills(html)).toEqual([]);
  });

  test("marks only the archived plugin", () => {
    expect(home().match(/\sdata-archived/g)).toHaveLength(1);
  });

  test("gives each row the language subtags it applies", () => {
    const rows = [...home().matchAll(/<li class="plugin"[^>]*>/g)].map(([tag]) => [
      /\sdata-plugin="([^"]*)"/.exec(tag)?.[1],
      /\sdata-languages="([^"]*)"/.exec(tag)?.[1],
    ]);
    expect(rows).toEqual([
      ["broken-plugin@example.org", ""],
      ["first-plugin@example.org", "en zh"],
      ["old-plugin@example.org", ""],
      ["{c2a6e4c8-1b7d-4f3a-9e2b-5d8f0a1c3e7b}", ""],
      ["no-range-plugin@example.org", "de fr"],
      ["min-only-plugin@example.org", "zh"],
      ["locale-plugin@example.org", "es pt"],
    ]);
  });

  test("holds a hidden language menu with one option for each subtag", () => {
    const menu = /<p class="language-filter" hidden><label for="language">Interface language<\/label> <select id="language" data-language-filter>(.*?)<\/select><\/p>/.exec(home());
    expect(menu).not.toBeNull();
    const options = [...menu![1]!.matchAll(/<option value="([^"]*)">([^<]*)<\/option>/g)].map(([, value, text]) => [value, text]);
    expect(options).toEqual([
      ["", "All languages"],
      ["zh", "Chinese (2)"],
      ["en", "English (1)"],
      ["fr", "French (1)"],
      ["de", "German (1)"],
      ["pt", "Portuguese (1)"],
      ["es", "Spanish (1)"],
    ]);
  });
});

describe("the built site", () => {
  test("has a script on the home page only", () => {
    const files = htmlFiles(out);
    expect(files).toContain("index.html");
    for (const file of files) expect(readFileSync(join(out, file), "utf8").includes("<script"), file).toBe(file === "index.html");
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
