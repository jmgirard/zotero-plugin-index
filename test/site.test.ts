import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Ajv } from "ajv";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import pluginsSchema from "../schemas/plugins.v1.schema.json" with { type: "json" };

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
  return spawnSync(pnpmPath, ["--silent", "--dir", ROOT, "site", ...args], { encoding: "utf8", env, timeout: 110_000 });
}

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

// The text of the element whose data-fact attribute is name, with tags removed.
function fact(html: string, name: string): string | undefined {
  const match = new RegExp(`data-fact="${name}"[^>]*>(.*?)</(?:p|dd)>`).exec(html);
  return match?.[1]!.replace(/<[^>]+>/g, "");
}

describe("the plugin page", () => {
  const page = (id: string) => readFileSync(join(out, "plugins", id, "index.html"), "utf8");
  const FACTS = ["repository", "repo-created", "latest-release", "release-count", "open-issues", "update-host", "releases"];

  test("puts the declared range and the version field before the other facts", () => {
    const html = page("first-plugin@example.org");
    const range = html.indexOf('data-fact="declared-range"');
    const field = html.indexOf('id="zotero-version"');
    const later = [...FACTS.map((name) => `data-fact="${name}"`), "data-override=", 'data-fact="not-vetted"'];
    expect(range).toBeGreaterThan(-1);
    expect(field).toBeGreaterThan(-1);
    for (const marker of later) {
      const at = html.indexOf(marker);
      expect(at, marker).toBeGreaterThan(Math.max(range, field));
    }
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
    // Field, upstream value, override value, version, applies, reason.
    expect(rows).toEqual([
      ["strict_max_version", "7.*", "8.*", "every version", "yes", "The author confirmed that the plugin works on Zotero 8."],
      ["strict_min_version", "7.0", "8.5", "0.9.0", "no", "Version 0.9.0 needs an API that Zotero 8.5 added."],
    ]);
  });

  test("shows the failure and no declared range for a record that was not read", () => {
    const html = page("broken-plugin@example.org");
    expect(fact(html, "failure")).toBe(
      "The last build could not read this plugin: no-xpi-release: no release of example/broken-plugin has an .xpi asset",
    );
    expect(html).not.toContain('data-fact="declared-range"');
    expect(html).not.toContain("data-result-for");
  });
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
