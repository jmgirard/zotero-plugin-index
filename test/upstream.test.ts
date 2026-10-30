import { deflateRawSync, inflateRawSync } from "node:zlib";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import type { Lookup } from "../src/upstream/host-guard.ts";
import indexSchema from "../schemas/index.v1.schema.json" with { type: "json" };
import pluginsSchema from "../schemas/plugins.v1.schema.json" with { type: "json" };
import { buildLevelStatus, LANGUAGE_TAG, readUpstream, zipEntryCount } from "../src/upstream/reader.ts";
import { fixtureFetch, loadFixture, type Recorded, type Responses } from "./support/fixture-fetch.ts";

const FIXTURE = "test/fixtures/upstream/better-notes.json";
const REPO_URL = "https://github.com/windingwind/zotero-better-notes";
const REPO = "https://api.github.com/repos/windingwind/zotero-better-notes";
const RELEASES = `${REPO}/releases?per_page=100`;
const RELEASES_PAGE_2 = "https://api.github.com/repositories/486255787/releases?per_page=100&page=2";
const XPI = "https://github.com/windingwind/zotero-better-notes/releases/download/v3.3.3/better-notes-for-zotero.xpi";
const UPDATE = "https://github.com/windingwind/zotero-better-notes/releases/download/release/update.json";
const BETA_XPI = "https://github.com/windingwind/zotero-better-notes/releases/download/v3.4.0-beta.1/better-notes-for-zotero.xpi";

afterEach(() => {
  vi.unstubAllEnvs();
});

type Json = Record<string, any>;

function manifest(responses: Responses): Json {
  return responses[XPI].xpi!["manifest.json"] as Json;
}

const publicLookup: Lookup = async () => ["140.82.112.3"];

// Reads the recorded plugin after `edit` changes its responses.
async function read(edit?: (responses: Responses) => void, repoUrl = REPO_URL, lookup = publicLookup) {
  const { responses } = loadFixture(FIXTURE);
  edit?.(responses);
  const { fetch, requests } = fixtureFetch(responses);
  return { result: await readUpstream(repoUrl, fetch, { lookup }), requests };
}

// Reads the recorded plugin with its update_url set to `url`.
function readUpdateUrl(url: string, lookup = publicLookup) {
  return read((r) => (manifest(r).applications.zotero.update_url = url), REPO_URL, lookup);
}

describe("readUpstream", () => {
  test("returns the facts of a plugin that meets the bar", async () => {
    vi.stubEnv("GITHUB_TOKEN", undefined);
    const { result } = await read();
    expect(result).toEqual({
      ok: true,
      facts: {
        id: "Knowledge4Zotero@windingwind.com",
        name: "Better Notes for Zotero",
        description: "Everything about note management. All in Zotero.",
        homepage: "https://github.com/windingwind/zotero-better-notes#readme",
        version: "3.3.3",
        strictMinVersion: "8.0-beta.21",
        strictMaxVersion: "10.99.99",
        updateUrl: UPDATE,
        updateHost: "github.com",
        repoUrl: REPO_URL,
        repoCreatedAt: "2022-04-27T15:46:23Z",
        openIssues: 15,
        stars: 8400,
        releaseCount: 2,
        latestReleaseDate: "2026-08-24T13:25:16Z",
        prerelease: false,
        archived: false,
        languages: [],
      },
      xpi: {
        url: "https://github.com/windingwind/zotero-better-notes/releases/download/v3.3.3/better-notes-for-zotero.xpi",
        sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
      },
      topics: [],
    });
  });

  test.each<[string, (repo: Json) => void, boolean | undefined]>([
    ["true", (repo) => (repo.archived = true), true],
    ["absent", (repo) => delete repo.archived, undefined],
    ["null", (repo) => (repo.archived = null), undefined],
    ['the string "true"', (repo) => (repo.archived = "true"), undefined],
  ])("reads a repo whose archived value is %s", async (_name, edit, archived) => {
    const { result } = await read((r) => edit(r[REPO].json as Json));
    expect(result.ok).toBe(true);
    expect(result.ok && result.facts.archived).toBe(archived);
  });

  test.each<[string, (repo: Json) => void, string | undefined]>([
    ["a string with outer spaces", (repo) => (repo.description = "  Notes in Zotero. \n"), "Notes in Zotero."],
    ["null", (repo) => (repo.description = null), undefined],
    ["absent", (repo) => delete repo.description, undefined],
    ["a number", (repo) => (repo.description = 7), undefined],
    ["blank", (repo) => (repo.description = " \t"), undefined],
  ])("reads a repo whose description is %s", async (_name, edit, repoDescription) => {
    const { result } = await read((r) => edit(r[REPO].json as Json));
    expect(result.ok).toBe(true);
    expect(result.ok && result.facts.repoDescription).toBe(repoDescription);
  });

  test.each<[string, (repo: Json) => void, number | undefined]>([
    ["0", (repo) => (repo.stargazers_count = 0), 0],
    ["absent", (repo) => delete repo.stargazers_count, undefined],
    ["-1", (repo) => (repo.stargazers_count = -1), undefined],
    ["1.5", (repo) => (repo.stargazers_count = 1.5), undefined],
    ['the string "12"', (repo) => (repo.stargazers_count = "12"), undefined],
  ])("reads a repo whose star count is %s", async (_name, edit, stars) => {
    const { result } = await read((r) => edit(r[REPO].json as Json));
    expect(result.ok).toBe(true);
    expect(result.ok && result.facts.stars).toBe(stars);
  });

  test("sends GITHUB_TOKEN with each GitHub API request and with no other request", async () => {
    vi.stubEnv("GITHUB_TOKEN", "test-token");
    const { result, requests } = await read();
    expect(result.ok).toBe(true);
    const api = requests.filter((r) => new URL(r.url).host === "api.github.com");
    const other = requests.filter((r) => !api.includes(r));
    expect(api.map((r) => r.url)).toEqual([REPO, RELEASES, RELEASES_PAGE_2]);
    expect(api.map((r) => r.headers.get("authorization"))).toEqual(api.map(() => "Bearer test-token"));
    expect(other.map((r) => r.url)).toEqual([XPI, UPDATE]);
    expect(other.map((r) => r.headers.get("authorization"))).toEqual([null, null]);
  });

  test("sends no Authorization header when GITHUB_TOKEN is not set", async () => {
    vi.stubEnv("GITHUB_TOKEN", undefined);
    const { requests } = await read();
    expect(requests.length).toBe(5);
    expect(requests.map((r) => r.headers.get("authorization"))).toEqual(requests.map(() => null));
  });

  test("returns the manifest version unchanged", async () => {
    const { result } = await read((r) => (manifest(r).version = "v2.0-beta"));
    expect(result.ok && result.facts.version).toBe("v2.0-beta");
  });

  test("resolves __MSG_ placeholders from the default locale, ignoring case", async () => {
    const { result } = await read((r) => {
      Object.assign(manifest(r), { default_locale: "en_US", name: "__MSG_name__", description: "__MSG_Desc__" });
      Object.assign(r[XPI].xpi!, {
        "_locales/de_DE/messages.json": { name: { message: "Notizen" }, desc: { message: "Deutsch" } },
        "_locales/en_US/messages.json": { name: { message: "Notes" }, desc: { message: "English" } },
      });
    });
    expect(result.ok && [result.facts.name, result.facts.description]).toEqual(["Notes", "English"]);
  });

  // The description read when the manifest names default_locale `locale` (none when
  // undefined) and the XPI holds `files`.
  async function englishDescription(locale: string | undefined, files: Record<string, unknown>) {
    const { result } = await read((r) => {
      Object.assign(manifest(r), { default_locale: locale, description: "__MSG_desc__" });
      Object.assign(r[XPI].xpi!, files);
    });
    expect(result.ok).toBe(true);
    return result.ok ? result.facts.description : "not read";
  }
  const zh = { "_locales/zh_CN/messages.json": { desc: { message: "中文" } } };
  const en = (text: unknown) => ({ desc: { message: text } });

  test.each<[string, string | undefined, Record<string, unknown>, string | undefined]>([
    ["en alone", "zh_CN", { ...zh, "_locales/en/messages.json": en("en") }, "en"],
    ["en_US alone", "zh_CN", { ...zh, "_locales/en_US/messages.json": en("en_US") }, "en_US"],
    ["en_GB alone", "zh_CN", { ...zh, "_locales/en_GB/messages.json": en("en_GB") }, "en_GB"],
    ["en before en_GB", "zh_CN", { ...zh, "_locales/en_GB/messages.json": en("en_GB"), "_locales/en/messages.json": en("en") }, "en"],
    ["en_US before en_GB", "zh_CN", { ...zh, "_locales/en_GB/messages.json": en("en_GB"), "_locales/en_US/messages.json": en("en_US") }, "en_US"],
    ["en_US after an en without the key", "zh_CN", { ...zh, "_locales/en/messages.json": {}, "_locales/en_US/messages.json": en("en_US") }, "en_US"],
    ["en_US after an en that is not JSON", "zh_CN", { ...zh, "_locales/en/messages.json": "{", "_locales/en_US/messages.json": en("en_US") }, "en_US"],
    ["en_US after an en that is an array", "zh_CN", { ...zh, "_locales/en/messages.json": [en("en")], "_locales/en_US/messages.json": en("en_US") }, "en_US"],
    ["en_US after an en whose message is a number", "zh_CN", { ...zh, "_locales/en/messages.json": en(1), "_locales/en_US/messages.json": en("en_US") }, "en_US"],
    ["the default after a blank en message", "zh_CN", { ...zh, "_locales/en/messages.json": en(" \n") }, "中文"],
    ["en with the key in another case", "zh_CN", { ...zh, "_locales/en/messages.json": { DESC: { message: "en" } } }, "en"],
    ["en with no default_locale", undefined, { "_locales/en/messages.json": en("en") }, "en"],
    ["nothing with no default_locale and no English folder", undefined, zh, undefined],
    ["the default with no English folder", "zh_CN", zh, "中文"],
  ])("reads %s", async (_name, locale, files, description) => {
    expect(await englishDescription(locale, files)).toBe(description);
  });

  test("skips an English messages.json over 1 MiB and reads the default locale", async () => {
    const big = JSON.stringify(en("en")) + " ".repeat(1024 * 1024);
    expect(await englishDescription("zh_CN", { ...zh, "_locales/en/messages.json": big })).toBe("中文");
  });

  test("reads the name from an English folder before the default locale", async () => {
    const { result } = await read((r) => {
      Object.assign(manifest(r), { default_locale: "zh_CN", name: "__MSG_name__" });
      Object.assign(r[XPI].xpi!, {
        "_locales/zh_CN/messages.json": { name: { message: "名称" } },
        "_locales/en/messages.json": { name: { message: "Name" } },
      });
    });
    expect(result.ok && result.facts.name).toBe("Name");
  });

  test("reads the name and the description from the first English folder that holds each", async () => {
    const { result } = await read((r) => {
      Object.assign(manifest(r), { default_locale: "zh_CN", name: "__MSG_name__", description: "__MSG_desc__" });
      Object.assign(r[XPI].xpi!, {
        "_locales/zh_CN/messages.json": { name: { message: "名称" }, desc: { message: "中文" } },
        "_locales/en/messages.json": en("English"),
        "_locales/en_US/messages.json": { name: { message: "Name" } },
      });
    });
    expect(result.ok && [result.facts.name, result.facts.description]).toEqual(["Name", "English"]);
  });

  test.each<[string, Record<string, unknown>]>([
    ["no messages.json", {}],
    ["an unreadable messages.json", { "_locales/en/messages.json": "{" }],
  ])("leaves out a placeholder when the XPI has %s", async (_name, files) => {
    const { result } = await read((r) => {
      Object.assign(manifest(r), { default_locale: "en", name: "__MSG_name__" });
      Object.assign(r[XPI].xpi!, files);
    });
    expect(result.ok).toBe(true);
    expect(result.ok && result.facts.name).toBeUndefined();
  });

  // A file of each type that holds one message.
  const FTL = "hello = Hallo\n";
  const DTD = '<!ENTITY hello "Hallo">\n';
  // An .ftl and a .dtd file that hold `count` messages.
  const lines = (count: number, line: (i: number) => string) => Array.from({ length: count }, (_, i) => line(i)).join("");
  const ftl = (count: number) => lines(count, (i) => `m${i} = Hallo\n`);
  const dtd = (count: number) => lines(count, (i) => `<!ENTITY m${i} "Hallo">\n`);

  test.each<[string, Record<string, string>, string[]]>([
    ["two folders under locale/, in code-unit order", { "locale/zh-CN/a.ftl": FTL, "locale/en-US/a.ftl": FTL }, ["en-US", "zh-CN"]],
    ["a nested file under chrome/locale/ only", { "chrome/locale/fr-FR/addon/x.dtd": DTD }, ["fr-FR"]],
    ["one tag under both paths once", { "locale/de/a.ftl": FTL, "chrome/locale/de/b.dtd": DTD }, ["de"]],
    [
      "tags with _ or other letter case in canonical form",
      { "locale/zh_CN/a.ftl": FTL, "locale/zh-CN/b.ftl": FTL, "locale/EN-us/a.ftl": FTL },
      ["en-US", "zh-CN"],
    ],
    ["an alias in canonical form", { "locale/iw/a.ftl": FTL }, ["he"]],
    ["no folder whose name is not a kept tag", { "locale/en-x-pirate/a.ftl": FTL, "locale/default/a.ftl": FTL, "locale/und/a.ftl": FTL }, []],
    [
      "only tags whose language has an English name",
      {
        "locale/en-US/a.ftl": FTL,
        "locale/img/a.png": "",
        "locale/js/a.js": "",
        "locale/qaa/a.ftl": FTL,
        "chrome/locale/IMG/a.png": "",
        "locale/js_US/a.ftl": FTL,
        "locale/fil/a.ftl": FTL,
      },
      ["en-US", "fil"],
    ],
    ["tags whose region or script has no name", { "chrome/locale/en_XX/a.dtd": DTD, "chrome/locale/en_Qaaa/a.dtd": DTD }, ["en-Qaaa", "en-XX"]],
    [
      "no tag from other paths or a directory entry",
      { "_locales/de/messages.json": "{}", "content/locale/fr/x.ftl": FTL, "locale/en-US.ftl": FTL, "locale/it/": "", "locale/it/sub/": "" },
      [],
    ],
    ["only the .ftl folder with a message", { "locale/de/a.ftl": "# Comment\n\n## Group\n### Resource\n", "locale/fr/a.ftl": FTL }, ["fr"]],
    [
      "only the .properties folder with a message",
      { "locale/de/a.properties": "# Comment\n! Comment\n\t# Comment\n \t\f\n", "locale/fr/a.properties": "  hello=Hallo\n" },
      ["fr"],
    ],
    [
      "only the .dtd folder with an entity outside comments",
      { "locale/de/a.dtd": `<!-- ${DTD} -->\n`, "locale/it/a.dtd": `<!-- open\n${DTD}`, "locale/fr/a.dtd": `<!-- c -->\n${DTD}` },
      ["fr"],
    ],
    ["a folder whose .ftl file holds only a term", { "locale/de/a.ftl": "# Brand\n-brand-name = Zoplicate\n" }, ["de"]],
    ["a folder whose .ftl message follows a byte-order mark", { "locale/de/a.ftl": `﻿${FTL}` }, ["de"]],
    ["no folder whose .properties file holds a byte-order mark and comments", { "locale/de/a.properties": "﻿# Comment\n" }, []],
    ["folders whose file has another extension or none", { "locale/de/icon.png": "", "locale/fr/LICENSE": "" }, ["de", "fr"]],
    ["only the folder with a message, whatever the extension's letter case", { "locale/de/A.FTL": "# Comment\n", "locale/fr/A.FTL": FTL }, ["fr"]],
    [
      "only the folders with a message under chrome/locale/ and in nested folders",
      {
        "chrome/locale/de/a.ftl": "# Comment\n",
        "chrome/locale/fr/a.ftl": FTL,
        "locale/it/sub/x.ftl": "# Comment\n",
        "locale/es/sub/x.ftl": FTL,
      },
      ["es", "fr"],
    ],
    ["a folder with a comment-only file and a file with a message", { "locale/de/a.ftl": "# Comment\n", "locale/de/b.ftl": FTL }, ["de"]],
    ["one tag when either of its folders holds a message", { "locale/zh_CN/a.ftl": "# Comment\n", "chrome/locale/zh-CN/b.ftl": FTL }, ["zh-CN"]],
    ["no tag when none of its folders holds a message", { "locale/zh_CN/a.ftl": "# Comment\n", "chrome/locale/zh-CN/b.ftl": "# Comment\n" }, []],
    ["no tag with under half the fullest tag's messages", { "locale/en-US/a.ftl": ftl(10), "locale/zh-CN/a.ftl": ftl(4) }, ["en-US"]],
    ["a tag with half the fullest tag's messages", { "locale/en-US/a.ftl": ftl(10), "locale/zh-CN/a.ftl": ftl(5) }, ["en-US", "zh-CN"]],
    ["no tag with under half of an odd count", { "locale/en-US/a.ftl": ftl(9), "locale/zh-CN/a.ftl": ftl(4) }, ["en-US"]],
    [
      "a .properties folder counted without its comments and blank lines",
      {
        "locale/en-US/a.ftl": ftl(5),
        "locale/fr/a.properties": `# Comment\n${lines(10, (i) => `m${i}=Bonjour\n! Comment\n\n`)}`,
      },
      ["en-US", "fr"],
    ],
    [
      "a .properties folder with half the fullest tag's messages",
      { "locale/en-US/a.ftl": ftl(20), "locale/fr/a.properties": `# Comment\n${lines(10, (i) => `m${i}=Bonjour\n! Comment\n\n`)}` },
      ["en-US", "fr"],
    ],
    [
      "a .dtd folder counted without the entity in a comment",
      { "locale/en-US/a.ftl": ftl(5), "locale/de/a.dtd": `${dtd(10)}<!-- <!ENTITY old "Alt"> -->\n` },
      ["de", "en-US"],
    ],
    [
      "a .dtd folder with half the fullest tag's messages",
      { "locale/en-US/a.ftl": ftl(20), "locale/de/a.dtd": `${dtd(10)}<!-- <!ENTITY old "Alt"> -->\n` },
      ["de", "en-US"],
    ],
    [
      "a tag kept by the sum of its two folders",
      { "locale/en-US/a.ftl": ftl(10), "locale/zh-CN/a.ftl": ftl(3), "chrome/locale/zh_CN/b.ftl": ftl(2) },
      ["en-US", "zh-CN"],
    ],
    [
      "a tag counted over its .ftl and .dtd files",
      { "locale/en-US/a.ftl": ftl(10), "locale/de/a.ftl": ftl(3), "locale/de/b.dtd": dtd(2) },
      ["de", "en-US"],
    ],
    [
      "no zxx or mul folder, and none sets the largest count",
      {
        "locale/en-US/a.ftl": ftl(2),
        "locale/zxx/a.ftl": ftl(5),
        "locale/ZXX/b.properties": lines(5, (i) => `m${i}=Hallo\n`),
        "chrome/locale/mul/a.ftl": ftl(5),
        "locale/Mul_Latn/a.ftl": ftl(5),
        "locale/zxx_US/a.ftl": ftl(5),
        "locale/mul/a.json": "{}",
      },
      ["en-US"],
    ],
  ])("lists %s as the languages", async (_name, files, languages) => {
    const { result } = await read((r) => Object.assign(r[XPI].xpi!, files));
    expect(result.ok && result.facts.languages).toEqual(languages);
  });

  // Calls `edit` with the central-directory header of the entry `name` in a zipSync zip.
  function editHeader(zip: Uint8Array, name: string, edit: (view: DataView, header: number) => void): Uint8Array {
    const view = new DataView(zip.buffer, zip.byteOffset);
    const nameLength = (at: number) => view.getUint16(at + 28, true);
    let header = view.getUint32(zip.length - 22 + 16, true);
    while (strFromU8(zip.subarray(header + 46, header + 46 + nameLength(header))) !== name) {
      header += 46 + nameLength(header) + view.getUint16(header + 30, true) + view.getUint16(header + 32, true);
    }
    edit(view, header);
    return zip;
  }

  const COMMENT = strToU8("# Comment\n");
  const DEFLATED_COMMENT = new Uint8Array(deflateRawSync(COMMENT));
  // The same data with its first block type set to 3, which no deflate stream may use.
  const BROKEN_COMMENT = DEFLATED_COMMENT.map((byte, i) => (i === 0 ? byte | 0b110 : byte));

  test.each<[string, Uint8Array, { compression?: number; size?: number; originalSize?: number }, string[]]>([
    ["holds deflated comments, as a control", DEFLATED_COMMENT, { compression: 8, originalSize: COMMENT.length }, []],
    ["declares an unzipped size over 1 MiB", DEFLATED_COMMENT, { compression: 8, originalSize: 1_048_577 }, ["de"]],
    ["declares a compressed size over 1 MiB", COMMENT, { size: 1_048_577 }, ["de"]],
    ["uses a compression other than stored or deflate", COMMENT, { compression: 12 }, ["de"]],
    ["holds deflate data that fails to inflate", BROKEN_COMMENT, { compression: 8, originalSize: COMMENT.length }, ["de"]],
    ["inflates past its declared size", DEFLATED_COMMENT, { compression: 8, originalSize: 3 }, ["de"]],
    ["holds no deflate data for its declared size", new Uint8Array(0), { compression: 8, originalSize: COMMENT.length }, ["de"]],
    ["declares stored data that runs past the zip's end", COMMENT, { size: 1000, originalSize: 1000 }, ["de"]],
  ])("reads an XPI whose comment-only locale file %s", async (_name, data, fields, languages) => {
    const { result } = await readXpi((json) =>
      editHeader(zipSync({ "manifest.json": json, "locale/de/a.ftl": [data, { level: 0 }] }), "locale/de/a.ftl", (view, header) => {
        if (fields.compression !== undefined) view.setUint16(header + 10, fields.compression, true);
        if (fields.size !== undefined) view.setUint32(header + 20, fields.size, true);
        if (fields.originalSize !== undefined) view.setUint32(header + 24, fields.originalSize, true);
      }),
    );
    expect(result.ok && result.facts.languages).toEqual(languages);
  });

  const DECLARED_OVER_1_MIB = { compression: 8, originalSize: 1_048_577 };
  const BROKEN = { compression: 8, originalSize: COMMENT.length };

  test.each<[string, number, string, Uint8Array, { compression?: number; originalSize?: number }]>([
    ["of another type", 0, "icon.png", COMMENT, {}],
    ["of another type", 1, "icon.png", COMMENT, {}],
    ["over 1 MiB", 0, "x.ftl", DEFLATED_COMMENT, DECLARED_OVER_1_MIB],
    ["over 1 MiB", 1, "x.ftl", DEFLATED_COMMENT, DECLARED_OVER_1_MIB],
    ["that fails to inflate", 0, "x.ftl", BROKEN_COMMENT, BROKEN],
    ["that fails to inflate", 1, "x.ftl", BROKEN_COMMENT, BROKEN],
  ])("keeps a tag with a file %s beside %i counted messages", async (_name, count, file, data, fields) => {
    const { result } = await readXpi((json) => {
      const files = { "manifest.json": json, "locale/en-US/a.ftl": strToU8(ftl(10)), "locale/de/a.ftl": strToU8(ftl(count)) };
      const zip = zipSync({ ...files, [`locale/de/${file}`]: [data, { level: 0 }] });
      return editHeader(zip, `locale/de/${file}`, (view, header) => {
        if (fields.compression !== undefined) view.setUint16(header + 10, fields.compression, true);
        if (fields.originalSize !== undefined) view.setUint32(header + 24, fields.originalSize, true);
      });
    });
    expect(result.ok && result.facts.languages).toEqual(["de", "en-US"]);
  });

  test("counts no message in a kept tag's file of another type", async () => {
    const { result } = await read((r) =>
      Object.assign(r[XPI].xpi!, {
        "locale/en-US/a.json": lines(100, (i) => `m${i} = Hallo\n`),
        "locale/en-US/b.ftl": ftl(1),
        "locale/fr/a.ftl": ftl(4),
        "locale/de/a.ftl": ftl(1),
      }),
    );
    expect(result.ok && result.facts.languages).toEqual(["en-US", "fr"]);
  });

  test("keeps the folders whose files would take the inflated total past 8 MiB", async () => {
    const comments = "# Comment\n".repeat(100_000);
    const tags = ["ar", "bg", "cs", "da", "de", "el", "es", "fi", "fr", "he"];
    const { result } = await read((r) => Object.assign(r[XPI].xpi!, Object.fromEntries(tags.map((tag) => [`locale/${tag}/a.ftl`, comments]))));
    expect(result.ok && result.facts.languages).toEqual(["fr", "he"]);
  });

  test("reads two locale entries with the same name", async () => {
    const { result } = await readXpi((json) => {
      const zip = zipSync({ "manifest.json": json, "locale/de/a.ftl": COMMENT, "locale/de/b.ftl": strToU8(FTL) });
      return editHeader(zip, "locale/de/b.ftl", (_view, header) => zip.set(strToU8("locale/de/a.ftl"), header + 46));
    });
    expect(result.ok && result.facts.languages).toEqual(["de"]);
  });

  test("reads within 1 s an XPI of 512 locale files that each declare 1 byte and inflate to 16 MiB", async () => {
    const bomb = new Uint8Array(deflateRawSync(Buffer.alloc(16 * 1024 * 1024)));
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const tags = Array.from({ length: 512 }, (_, i) => `en-${letters[Math.floor(i / 26)]}${letters[i % 26]}`);
    const json = strToU8(JSON.stringify(manifest(loadFixture(FIXTURE).responses)));
    const zip = zipSync({ "manifest.json": json, ...Object.fromEntries(tags.map((tag) => [`locale/${tag}/a.ftl`, [bomb, { level: 0 }]])) });
    for (const tag of tags) {
      editHeader(zip, `locale/${tag}/a.ftl`, (view, header) => {
        view.setUint16(header + 10, 8, true);
        view.setUint32(header + 24, 1, true);
      });
    }
    const started = performance.now();
    const { result } = await readXpi(() => zip);
    expect(performance.now() - started).toBeLessThan(1000);
    // Some regions, such as AN, are retired, so their tags read in another canonical form.
    expect(result.ok && result.facts.languages).toEqual([...new Set(Intl.getCanonicalLocales(tags))].sort());
  });

  test("shares its language tag pattern with both schemas", () => {
    const list = `^${LANGUAGE_TAG}(, ${LANGUAGE_TAG})*$`;
    const { definitions } = pluginsSchema as Json;
    expect(definitions.upstream.properties.languages.items.pattern).toBe(`^${LANGUAGE_TAG}$`);
    for (const override of [definitions.override, (indexSchema as Json).properties.overrides.items]) {
      expect(override.if).toEqual({ required: ["field"], properties: { field: { const: "languages" } } });
      expect(override.then.properties.value.pattern).toBe(list);
    }
  });

  test.each([
    ["refuses", ["zxx", "ZXX", "mul", "Mul-Latn", "zxx-US"], false],
    ["matches", ["mus", "zh", "en-US"], true],
  ])("its language tag pattern %s %j", (_verb, tags, matches) => {
    const whole = new RegExp(`^${LANGUAGE_TAG}$`, "u");
    for (const tag of tags) expect(whole.test(tag), tag).toBe(matches);
  });

  test("reads the newest published stable release with an .xpi, whatever the list order", async () => {
    const { result } = await read((r) => {
      const [stable, beta] = r[RELEASES].json as Json[];
      const draft = {
        tag_name: "v9.0.0",
        draft: true,
        published_at: "2026-10-01T00:00:00Z",
        assets: [{ name: "draft.xpi", browser_download_url: "https://example.org/draft.xpi" }],
      };
      r[RELEASES].json = [draft, beta, stable];
    });
    expect(result.ok && [result.facts.version, result.facts.releaseCount]).toEqual(["3.3.3", 2]);
  });

  test("skips a release that is not an object and assets that are not a list", async () => {
    const { result } = await read((r) => {
      const releases = r[RELEASES].json as Json[];
      releases[1].assets = "not a list";
      releases.unshift(null as unknown as Json);
    });
    expect(result.ok && [result.facts.version, result.facts.releaseCount]).toEqual(["3.3.3", 1]);
  });

  describe("with a prerelease published after the stable release", () => {
    const BETA_DATE = "2026-09-01T00:00:00Z";

    // Adds a prerelease v3.4.0-beta.1 with its own XPI to the recorded responses.
    function addBeta(r: Responses, publishedAt = BETA_DATE) {
      (r[RELEASES].json as Json[]).unshift({
        tag_name: "v3.4.0-beta.1",
        draft: false,
        prerelease: true,
        published_at: publishedAt,
        assets: [{ name: "better-notes-for-zotero.xpi", browser_download_url: BETA_XPI }],
      });
      r[BETA_XPI] = { xpi: { "manifest.json": { ...structuredClone(manifest(r)), version: "3.4.0-beta.1" } } };
    }

    function betaManifest(r: Responses): Json {
      return r[BETA_XPI].xpi!["manifest.json"] as Json;
    }

    function readsBeta(requests: { url: string }[]) {
      return requests.some((q) => q.url === BETA_XPI);
    }

    test("reads the stable release", async () => {
      const { result, requests } = await read((r) => addBeta(r));
      expect(result.ok && [result.facts.version, result.facts.prerelease, result.facts.releaseCount]).toEqual([
        "3.3.3",
        false,
        3,
      ]);
      expect(readsBeta(requests)).toBe(false);
    });

    test("reads the newest prerelease when no release is stable", async () => {
      const { result } = await read((r) => {
        addBeta(r);
        for (const release of [...(r[RELEASES].json as Json[]), ...(r[RELEASES_PAGE_2].json as Json[])]) release.prerelease = true;
      });
      expect(result.ok && [result.facts.version, result.facts.prerelease, result.facts.latestReleaseDate]).toEqual([
        "3.4.0-beta.1",
        true,
        BETA_DATE,
      ]);
    });

    test("reads the stable release when the prerelease has the same publish date", async () => {
      const { result } = await read((r) => addBeta(r, "2026-08-24T13:25:16Z"));
      expect(result.ok && result.facts.version).toBe("3.3.3");
    });

    test('reads a release whose prerelease value is the string "true" as stable', async () => {
      const { result } = await read((r) => {
        addBeta(r);
        (r[RELEASES].json as Json[])[1].prerelease = "true";
      });
      expect(result.ok && [result.facts.version, result.facts.prerelease]).toEqual(["3.3.3", false]);
    });

    const notZotero7: [string, (m: Json, r: Responses) => void][] = [
      ["no-manifest", (_m, r) => (r[XPI] = { xpi: { "install.rdf": "" } })],
      ["no-zotero-id", (m) => delete m.applications.zotero.id],
      ["max-version-below-7", (m) => (m.applications.zotero.strict_max_version = "6.*")],
    ];

    test.each(notZotero7)("reads the prerelease when the stable release fails with %s", async (_name, edit) => {
      const { result } = await read((r) => {
        addBeta(r);
        edit(manifest(r), r);
      });
      expect(result.ok && [result.facts.version, result.facts.prerelease, result.facts.latestReleaseDate]).toEqual([
        "3.4.0-beta.1",
        true,
        BETA_DATE,
      ]);
    });

    test.each<[string, (r: Responses) => void]>([
      ["no prerelease", () => {}],
      ["a prerelease with the same publish date", (r) => addBeta(r, "2026-08-24T13:25:16Z")],
    ])("returns the stable failure, reading its XPI once, when %s is later", async (_name, edit) => {
      const { result, requests } = await read((r) => {
        edit(r);
        r[XPI] = { xpi: { "install.rdf": "" } };
      });
      expect(result).toEqual({ ok: false, failure: "no-manifest", message: expect.stringContaining("v3.3.3") });
      expect(requests.filter((q) => q.url.endsWith(".xpi")).map((q) => q.url)).toEqual([XPI]);
    });

    test("returns the prerelease's failure when both reads fail", async () => {
      const { result } = await read((r) => {
        addBeta(r);
        r[XPI] = { xpi: { "install.rdf": "" } };
        betaManifest(r).applications.zotero.strict_max_version = "6.5";
      });
      expect(result).toEqual({ ok: false, failure: "max-version-below-7", message: expect.stringContaining("6.5") });
    });

    test.each<[string, (r: Responses) => void]>([
      ["update-json-http-error", (r) => (r[UPDATE] = { status: 404 })],
      ["manifest-invalid", (r) => delete manifest(r).version],
    ])("returns %s from the stable release without reading the prerelease", async (failure, edit) => {
      const { result, requests } = await read((r) => {
        addBeta(r);
        edit(r);
      });
      expect(result).toEqual({ ok: false, failure, message: expect.any(String) });
      expect(readsBeta(requests)).toBe(false);
    });
  });

  test.each(["7.0", "*", undefined])("passes a strict_max_version of %j", async (max) => {
    const { result } = await read((r) => (manifest(r).applications.zotero.strict_max_version = max));
    expect(result.ok).toBe(true);
    expect(result.ok && result.facts.strictMaxVersion).toBe(max);
  });

  // Each row changes one recorded response, and `detail` is text the failure message
  // must hold, which shows the read reached the changed response.
  test.each<[string, (r: Responses) => void, string, string]>([
    ["the repo request returns 404", (r) => (r[REPO].status = 404), "github-http-error", "HTTP 404"],
    ["the repo body is not an object", (r) => (r[REPO] = { json: null }), "request-failed", "not an object"],
    ["the releases body is not a list", (r) => (r[RELEASES] = { json: {} }), "request-failed", "not a list"],
    [
      "the next page is on another host",
      (r) => (r[RELEASES].headers = { link: '<https://evil.example/releases>; rel="next"' }),
      "request-failed",
      "https://evil.example/releases",
    ],
    [
      "the next page points back to a page read before",
      (r) => (r[RELEASES_PAGE_2].headers = { link: `<${RELEASES_PAGE_2}>; rel="next"` }),
      "request-failed",
      "read before",
    ],
    ["the repo is private", (r) => (r[REPO].json as Json).private = true, "private", "private"],
    ["the repo is a fork", (r) => (r[REPO].json as Json).fork = true, "fork", "fork"],
    ["the repo has no release", (r) => (r[RELEASES] = { json: [] }), "no-release", "no release"],
    [
      "no release has a .xpi asset",
      (r) => (r[RELEASES].json as Json[]).forEach((release) => (release.assets = [])),
      "no-xpi-release",
      ".xpi",
    ],
    ["the XPI download returns 404", (r) => (r[XPI] = { status: 404 }), "xpi-unreadable", "HTTP 404"],
    ["the XPI is not a zip", (r) => (r[XPI] = { text: "not a zip" }), "xpi-unreadable", "v3.3.3"],
    ["the XPI holds no manifest.json", (r) => (r[XPI] = { xpi: { "bootstrap.js": "" } }), "no-manifest", "v3.3.3"],
    ["manifest.json is not valid JSON", (r) => (r[XPI] = { xpi: { "manifest.json": "{" } }), "manifest-invalid", "JSON"],
    ["manifest.json is not an object", (r) => (r[XPI] = { xpi: { "manifest.json": "5" } }), "manifest-invalid", "object"],
    ["the manifest has no version", (r) => delete manifest(r).version, "manifest-invalid", "version"],
    [
      "the manifest has no applications.zotero.id",
      (r) => delete manifest(r).applications.zotero.id,
      "no-zotero-id",
      "applications.zotero.id",
    ],
    [
      "strict_max_version is 6.*",
      (r) => (manifest(r).applications.zotero.strict_max_version = "6.*"),
      "max-version-below-7",
      "6.*",
    ],
    [
      "strict_max_version is 6.999",
      (r) => (manifest(r).applications.zotero.strict_max_version = "6.999"),
      "max-version-below-7",
      "6.999",
    ],
    [
      "strict_max_version is a number",
      (r) => (manifest(r).applications.zotero.strict_max_version = 6),
      "manifest-invalid",
      "strict_max_version 6",
    ],
    [
      "strict_max_version does not start with a digit",
      (r) => (manifest(r).applications.zotero.strict_max_version = "abc"),
      "manifest-invalid",
      '"abc"',
    ],
    [
      "the manifest has no update_url",
      (r) => delete manifest(r).applications.zotero.update_url,
      "no-update-url",
      "update_url",
    ],
    [
      "the update_url is not an http URL",
      (r) => (manifest(r).applications.zotero.update_url = "file:///update.json"),
      "no-update-url",
      "file:///update.json",
    ],
    ["the update.json request returns 404", (r) => (r[UPDATE] = { status: 404 }), "update-json-http-error", "HTTP 404"],
    ["the update.json body is not JSON", (r) => (r[UPDATE] = { text: "<html>" }), "update-json-invalid", UPDATE],
    [
      "update.json has no entry for the manifest id",
      (r) => (r[UPDATE] = { json: { addons: { "other@example.org": { updates: [] } } } }),
      "update-json-missing-id",
      "Knowledge4Zotero@windingwind.com",
    ],
  ])("fails when %s", async (_name, edit, failure, detail) => {
    const { result } = await read(edit);
    expect(result).toEqual({ ok: false, failure, message: expect.stringContaining(detail) });
  });

  // As above, for failures that point at the build, so the result carries buildLevel.
  test.each<[string, (r: Responses) => void, string, string]>([
    ["the releases request returns 403", (r) => (r[RELEASES].status = 403), "github-http-error", "HTTP 403"],
    ["the repo body is not JSON", (r) => (r[REPO] = { text: "<html>" }), "request-failed", "not JSON"],
    ["the first releases page is not JSON", (r) => (r[RELEASES] = { text: "<html>" }), "request-failed", `${RELEASES} returned a body that is not JSON`],
    [
      "the second releases page is not JSON",
      (r) => (r[RELEASES_PAGE_2] = { text: "<html>" }),
      "request-failed",
      `${RELEASES_PAGE_2} returned a body that is not JSON`,
    ],
    ["a GitHub request cannot connect", (r) => (r[RELEASES_PAGE_2] = { error: "fetch failed" }), "request-failed", "fetch failed"],
    ["a body read is cut off", (r) => (r[UPDATE] = { bodyError: "terminated" }), "request-failed", "terminated"],
    ["the XPI body read is cut off", (r) => (r[XPI] = { bodyError: "terminated" }), "request-failed", "terminated"],
    ["the XPI download returns 502", (r) => (r[XPI] = { status: 502 }), "xpi-unreadable", "HTTP 502"],
  ])("fails with buildLevel when %s", async (_name, edit, failure, detail) => {
    const { result } = await read(edit);
    expect(result).toEqual({ ok: false, failure, message: expect.stringContaining(detail), buildLevel: true });
  });

  // The release URL can be any hop of the download, not only the last.
  const ASSET = "https://release-assets.githubusercontent.com/github-production-release-asset/486255787/asset";
  const LATEST = "https://github.com/windingwind/zotero-better-notes/releases/latest/download/update.json";
  const RAW = "https://raw.githubusercontent.com/windingwind/zotero-better-notes/main/update.json";
  const BLOB_RAW = "https://github.com/windingwind/zotero-better-notes/raw/main/update.json";
  const redirect = (location: string) => ({ status: 302, headers: { location } });
  const forbidden = { status: 403 };
  const updateAt = (r: Responses, url: string) => {
    manifest(r).applications.zotero.update_url = url;
    r[url] = forbidden;
  };
  test.each<[string, (r: Responses) => void, string, string, boolean]>([
    ["the XPI's release URL", (r) => (r[XPI] = forbidden), "xpi-unreadable", XPI, true],
    ["the asset URL that the XPI's release URL redirects to", (r) => ((r[XPI] = redirect(ASSET)), (r[ASSET] = forbidden)), "xpi-unreadable", XPI, true],
    ["the update.json's release URL", (r) => (r[UPDATE] = forbidden), "update-json-http-error", UPDATE, true],
    [
      "the asset URL that the update.json's release URL redirects to",
      (r) => ((r[UPDATE] = redirect(ASSET)), (r[ASSET] = forbidden)),
      "update-json-http-error",
      UPDATE,
      true,
    ],
    [
      "a release URL that a URL on another host redirects to",
      (r) => {
        manifest(r).applications.zotero.update_url = "https://hop.example/0";
        r["https://hop.example/0"] = redirect(UPDATE);
        r[UPDATE] = forbidden;
      },
      "update-json-http-error",
      "https://hop.example/0",
      true,
    ],
    ["a releases/latest/download URL", (r) => updateAt(r, LATEST), "update-json-http-error", LATEST, true],
    ["a raw.githubusercontent.com update.json", (r) => updateAt(r, RAW), "update-json-http-error", RAW, false],
    ["an asset URL given as the update.json", (r) => updateAt(r, ASSET), "update-json-http-error", ASSET, false],
    ["a github.com raw update.json", (r) => updateAt(r, BLOB_RAW), "update-json-http-error", BLOB_RAW, false],
  ])("sorts a 403 at %s by the release URL rule", async (_name, edit, failure, detail, buildLevel) => {
    const { result } = await read(edit);
    expect(result).toEqual({
      ok: false,
      failure,
      message: expect.stringContaining(`${detail} returned HTTP 403`),
      ...(buildLevel && { buildLevel: true }),
    });
  });

  test("fails with xpi-too-large and stops reading an XPI past 50 MiB", async () => {
    const { result, requests } = await read((r) => (r[XPI] = { chunks: { size: 1_048_576, count: 60 } }));
    expect(result).toEqual({ ok: false, failure: "xpi-too-large", message: expect.stringContaining(XPI) });
    expect(requests.find((q) => q.url === XPI)!.bytesEnqueued).toBeLessThanOrEqual(52_428_800 + 1_048_576);
  });

  test("reads the whole of an XPI of exactly 50 MiB", async () => {
    const { result, requests } = await read((r) => (r[XPI] = { chunks: { size: 1_048_576, count: 50 } }));
    // Zero bytes are not a zip, so the read gets past the cap and fails on the unzip.
    expect(result).toEqual({ ok: false, failure: "xpi-unreadable", message: expect.stringContaining("zip") });
    expect(requests.find((q) => q.url === XPI)!.bytesEnqueued).toBe(52_428_800);
  });

  test("fails with update-json-too-large and stops reading an update.json past 1 MiB", async () => {
    const { result, requests } = await read((r) => (r[UPDATE] = { chunks: { size: 65_536, count: 20 } }));
    expect(result).toEqual({ ok: false, failure: "update-json-too-large", message: expect.stringContaining(UPDATE) });
    expect(requests.find((q) => q.url === UPDATE)!.bytesEnqueued).toBeLessThanOrEqual(1_048_576 + 65_536);
  });

  // Spaces after the JSON keep it valid, so only the size can fail the read.
  const OVER_1_MIB = " ".repeat(1_048_577);

  test("fails with manifest-too-large when manifest.json unzips to more than 1 MiB", async () => {
    const { result } = await read((r) => (r[XPI].xpi!["manifest.json"] = JSON.stringify(manifest(r)) + OVER_1_MIB));
    expect(result).toEqual({ ok: false, failure: "manifest-too-large", message: expect.stringContaining("manifest.json") });
  });

  test("fails with manifest-too-large when the default locale's messages.json unzips to more than 1 MiB", async () => {
    const { result } = await read((r) => {
      manifest(r).default_locale = "en";
      r[XPI].xpi!["_locales/en/messages.json"] = JSON.stringify({ name: { message: "Notes" } }) + OVER_1_MIB;
    });
    expect(result).toEqual({
      ok: false,
      failure: "manifest-too-large",
      message: expect.stringContaining("_locales/en/messages.json"),
    });
  });

  test("does not fail on an over-1 MiB messages.json of a locale that is not the default", async () => {
    const { result } = await read((r) => {
      manifest(r).default_locale = "en";
      r[XPI].xpi!["_locales/de/messages.json"] = JSON.stringify({ name: { message: "Notizen" } }) + OVER_1_MIB;
    });
    expect(result.ok).toBe(true);
  });

  // Sets the uncompressed size of the zip's one file in its central directory, whose
  // header starts with 0x02014b50 and holds that size at offset 24.
  function understate(zip: Uint8Array, size: number): Uint8Array {
    const view = new DataView(zip.buffer, zip.byteOffset);
    const header = zip.findLastIndex((_, i) => i + 4 <= zip.length && view.getUint32(i, true) === 0x02014b50);
    view.setUint32(header + 24, size, true);
    return zip;
  }

  test("fails with manifest-too-large on a stored manifest.json over 1 MiB whose declared size is small", async () => {
    const { result } = await read((r) => {
      const json = strToU8(JSON.stringify(manifest(r)) + OVER_1_MIB);
      const zip = understate(zipSync({ "manifest.json": [json, { level: 0 }] }), 1000);
      r[XPI] = { base64: Buffer.from(zip).toString("base64") };
    });
    expect(result).toEqual({ ok: false, failure: "manifest-too-large", message: expect.stringContaining("manifest.json") });
  });

  // Marks the stored entry `name` of a zipSync zip as deflated and sets its declared
  // unzipped size, so that the reader inflates its stored bytes.
  function asDeflated(zip: Uint8Array, name: string, size: number): Uint8Array {
    const view = new DataView(zip.buffer, zip.byteOffset);
    const nameLength = (at: number) => view.getUint16(at + 28, true);
    let header = view.getUint32(zip.length - 22 + 16, true);
    while (strFromU8(zip.subarray(header + 46, header + 46 + nameLength(header))) !== name) {
      header += 46 + nameLength(header) + view.getUint16(header + 30, true) + view.getUint16(header + 32, true);
    }
    view.setUint16(header + 10, 8, true);
    view.setUint32(header + 24, size, true);
    view.setUint16(view.getUint32(header + 42, true) + 8, 8, true);
    return zip;
  }

  // Raw deflate data that inflates to 512 MiB of zero bytes.
  let deflatedZeros: Uint8Array;
  beforeAll(() => {
    deflatedZeros = deflateRawSync(Buffer.alloc(512 * 1024 * 1024), { level: 9 });
  }, 30_000);

  test("the crafted deflate data is under 1 MiB and inflates to 512 MiB", () => {
    expect(deflatedZeros.length).toBeLessThan(1_048_576);
    expect(inflateRawSync(deflatedZeros).length).toBe(536_870_912);
  });

  test.each(["manifest.json", "_locales/en/messages.json"])(
    "fails with xpi-unreadable within 1 s when %s inflates to 512 MiB past its declared 1000 bytes",
    async (name) => {
      const json = { ...manifest(loadFixture(FIXTURE).responses), default_locale: "en" };
      const files = {
        "manifest.json": strToU8(JSON.stringify(json)),
        "_locales/en/messages.json": strToU8("{}"),
        [name]: [deflatedZeros, { level: 0 }] as [Uint8Array, { level: 0 }],
      };
      const zip = asDeflated(zipSync(files), name, 1000);
      const started = performance.now();
      const { result } = await readXpi(() => zip);
      expect(performance.now() - started).toBeLessThan(1000);
      expect(result).toEqual({
        ok: false,
        failure: "xpi-unreadable",
        message: expect.stringContaining(`${name} in the XPI of v3.3.3 inflates past the 1000 bytes`),
      });
    },
  );

  test("fails with xpi-unreadable when manifest.json inflates to one byte more than its declared size", async () => {
    const { result } = await readXpi((json) => understate(zipSync({ "manifest.json": json }), json.length - 1));
    expect(result).toEqual({
      ok: false,
      failure: "xpi-unreadable",
      message: expect.stringContaining("manifest.json in the XPI of v3.3.3 inflates past the"),
    });
  });

  test.each([0, 1])("reads a manifest.json whose declared size is its unzipped size plus %i", async (extra) => {
    const { result } = await readXpi((json) => understate(zipSync({ "manifest.json": json }), json.length + extra));
    expect(result.ok && result.facts.version).toBe("3.3.3");
  });

  // A zip of `length` bytes that is zero bytes up to its end record, whose entry count
  // is `count` and whose directory starts at offset 0. With `zip64Count`, a zip64 end
  // record and its locator come before the end record and give that count instead.
  function endRecords(length: number, count: number, zip64Count?: number): Uint8Array {
    const zip = new Uint8Array(length);
    const view = new DataView(zip.buffer);
    const end = length - 22;
    view.setUint32(end, 0x06054b50, true);
    view.setUint16(end + 8, count, true);
    view.setUint16(end + 10, count, true);
    if (zip64Count !== undefined) {
      const record = end - 76;
      view.setUint32(record, 0x06064b50, true);
      view.setBigUint64(record + 32, BigInt(zip64Count), true);
      view.setUint32(end - 20, 0x07064b50, true);
      view.setBigUint64(end - 12, BigInt(record), true);
    }
    return zip;
  }

  function readZip(zip: Uint8Array) {
    return read((r) => (r[XPI] = { base64: Buffer.from(zip).toString("base64") }));
  }

  test.each([
    ["a zip64 end record", endRecords(98, 0xffff, 4_294_967_295), 4_294_967_295],
    ["an end record", endRecords(22, 65_535), 65_535],
  ])("fails with xpi-unreadable when %s claims more entries than the zip can hold", async (_name, zip, count) => {
    const { result } = await readZip(zip);
    expect(result).toEqual({ ok: false, failure: "xpi-unreadable", message: expect.stringContaining(`claims ${count} entries`) });
  }, 10_000);

  // 46 bytes for each entry is the smallest central directory the count allows.
  test.each([
    ["a zip64 end record", endRecords(138, 0xffff, 3)],
    ["an end record", endRecords(46, 1)],
  ])("reads past the count check when %s claims as many entries as the zip can hold", async (_name, zip) => {
    const { result } = await readZip(zip);
    expect(result).toEqual({ ok: false, failure: "no-manifest", message: expect.stringContaining("manifest.json") });
  });

  // Appends `comment` to a zip whose end record is its last 22 bytes.
  function withComment(zip: Uint8Array, comment: Uint8Array): Uint8Array {
    const out = new Uint8Array(zip.length + comment.length);
    out.set(zip);
    out.set(comment, zip.length);
    new DataView(out.buffer).setUint16(zip.length - 2, comment.length, true);
    return out;
  }

  function edit(zip: Uint8Array, change: (view: DataView, end: number) => void): Uint8Array {
    change(new DataView(zip.buffer), zip.length - 22);
    return zip;
  }

  const twoFiles = () => zipSync({ a: strToU8("1"), b: strToU8("2") });

  test.each<[string, () => Uint8Array, number]>([
    ["a two-file zip from zipSync", twoFiles, 2],
    ["an end record with a comment", () => withComment(twoFiles(), strToU8("a comment")), 2],
    [
      "a comment that holds a decoy end record with a larger count",
      () => {
        const zip = twoFiles();
        const decoy = zip.slice(-22);
        new DataView(decoy.buffer).setUint16(8, 3, true);
        return withComment(zip, decoy);
      },
      3,
    ],
    [
      "an end record signature in the last 21 bytes",
      () => {
        const comment = new Uint8Array(21);
        new DataView(comment.buffer).setUint32(0, 0x06054b50, true);
        new DataView(comment.buffer).setUint16(8, 9, true);
        return withComment(twoFiles(), comment);
      },
      2,
    ],
    ["a zip64 end record whose count is within the bound", () => endRecords(200, 0xffff, 4), 4],
    [
      "a zip64 locator whose record offset points outside the file",
      () => edit(endRecords(98, 2, 3), (view, end) => view.setUint32(end - 12, 10_000, true)),
      2,
    ],
    [
      "a zip64 locator whose record offset has its high 32 bits set",
      () => edit(endRecords(98, 0xffff, 2), (view, end) => view.setUint32(end - 8, 1, true)),
      2,
    ],
    ["a 2-byte count of 0 beside a zip64 count of 2^32 - 1", () => endRecords(98, 0, 4_294_967_295), 0],
    [
      "a zip64 end record whose count field runs past the end of the zip",
      () => {
        // A locator at 0, an end record at 20, and a 4-byte comment that holds the zip64 signature.
        const zip = new Uint8Array(46);
        const view = new DataView(zip.buffer);
        view.setUint32(0, 0x07064b50, true);
        view.setUint32(8, 42, true);
        view.setUint32(20, 0x06054b50, true);
        view.setUint16(28, 0xffff, true);
        view.setUint16(40, 4, true);
        view.setUint32(42, 0x06064b50, true);
        return zip;
      },
      0,
    ],
  ])("counts the entries that unzipSync loops over in %s", (_name, make, count) => {
    let calls = 0;
    unzipSync(make(), { filter: () => (calls++, false) });
    expect(calls).toBe(count);
    expect(zipEntryCount(make())).toBe(count);
  });

  // Appends `times` copies of the central-directory header of `name` to the directory of
  // a zip with no comment, so that each copy points at the same file data.
  function repeatEntry(zip: Uint8Array, name: string, times: number): Uint8Array {
    const view = new DataView(zip.buffer, zip.byteOffset);
    const end = zip.length - 22;
    const headerLength = (at: number) =>
      46 + view.getUint16(at + 28, true) + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
    let header = view.getUint32(end + 16, true);
    while (strFromU8(zip.subarray(header + 46, header + 46 + view.getUint16(header + 28, true))) !== name) {
      header += headerLength(header);
    }
    const copy = zip.slice(header, header + headerLength(header));
    const out = new Uint8Array(zip.length + copy.length * times);
    out.set(zip.subarray(0, end));
    for (let i = 0; i < times; i++) out.set(copy, end + i * copy.length);
    out.set(zip.subarray(end), end + times * copy.length);
    const outView = new DataView(out.buffer);
    const outEnd = out.length - 22;
    const count = outView.getUint16(outEnd + 8, true) + times;
    outView.setUint16(outEnd + 8, count, true);
    outView.setUint16(outEnd + 10, count, true);
    outView.setUint32(outEnd + 12, outView.getUint32(outEnd + 12, true) + copy.length * times, true);
    return out;
  }

  // Reads the recorded plugin with its XPI replaced by `make` of the recorded manifest.
  function readXpi(make: (json: Uint8Array) => Uint8Array) {
    return read((r) => {
      const zip = make(strToU8(JSON.stringify(manifest(r))));
      r[XPI] = { base64: Buffer.from(zip).toString("base64") };
    });
  }

  test("fails with xpi-unreadable when the zip holds manifest.json twice", async () => {
    const { result } = await readXpi((json) =>
      repeatEntry(zipSync({ "manifest.json": json, "other.txt": strToU8("x") }), "manifest.json", 1),
    );
    expect(result).toEqual({ ok: false, failure: "xpi-unreadable", message: expect.stringContaining("more than one manifest.json") });
  });

  test("fails with xpi-unreadable when the zip holds the default locale's messages.json twice", async () => {
    const { result } = await read((r) => {
      manifest(r).default_locale = "en";
      const json = strToU8(JSON.stringify(manifest(r)));
      const files = { "manifest.json": json, "_locales/en/messages.json": strToU8("{}") };
      const zip = repeatEntry(zipSync(files), "_locales/en/messages.json", 1);
      r[XPI] = { base64: Buffer.from(zip).toString("base64") };
    });
    expect(result).toEqual({
      ok: false,
      failure: "xpi-unreadable",
      message: expect.stringContaining("more than one _locales/en/messages.json"),
    });
  });

  test("skips an English messages.json that the zip holds twice and reads the default locale", async () => {
    const { result } = await read((r) => {
      Object.assign(manifest(r), { default_locale: "zh_CN", description: "__MSG_desc__" });
      const json = strToU8(JSON.stringify(manifest(r)));
      const files = {
        "manifest.json": json,
        "_locales/zh_CN/messages.json": strToU8(JSON.stringify({ desc: { message: "中文" } })),
        "_locales/en/messages.json": strToU8(JSON.stringify({ desc: { message: "English" } })),
      };
      const zip = repeatEntry(zipSync(files), "_locales/en/messages.json", 1);
      r[XPI] = { base64: Buffer.from(zip).toString("base64") };
    });
    expect(result.ok && result.facts.description).toBe("中文");
  });

  test("refuses at the second of 2,000 manifest.json entries that each point at a 1 MiB stream", async () => {
    const spaces = new Uint8Array(1_048_576).fill(32);
    const zip = repeatEntry(zipSync({ "manifest.json": [spaces, { level: 9 }] }), "manifest.json", 1999);
    const started = performance.now();
    const { result } = await readXpi(() => zip);
    expect(result).toEqual({ ok: false, failure: "xpi-unreadable", message: expect.stringContaining("more than one manifest.json") });
    expect(performance.now() - started).toBeLessThan(1000);
  });

  // The first and last address of each blocked range, then mapped and loopback names.
  test.each([
    "0.0.0.0", "0.255.255.255", "10.0.0.0", "10.255.255.255", "100.64.0.0", "100.127.255.255",
    "127.0.0.0", "127.255.255.255", "169.254.0.0", "169.254.255.255", "172.16.0.0", "172.31.255.255",
    "192.0.0.0", "192.0.0.255", "192.0.2.0", "192.0.2.255", "192.168.0.0", "192.168.255.255",
    "198.18.0.0", "198.19.255.255", "198.51.100.0", "198.51.100.255", "203.0.113.0", "203.0.113.255",
    "224.0.0.0", "239.255.255.255", "240.0.0.0", "255.255.255.255",
    "[::]", "[::ffff:ffff]", "[fc00::]", "[fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff]",
    "[fe80::]", "[febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff]", "[ff00::]", "[ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff]",
    "[64:ff9b::]", "[64:ff9b::ffff:ffff]", "[2002::]", "[2002:ffff:ffff:ffff:ffff:ffff:ffff:ffff]",
    "[2001:db8::]", "[2001:db8:ffff:ffff:ffff:ffff:ffff:ffff]",
    "[::ffff:127.0.0.1]", "[::ffff:10.0.0.1]", "localhost", "foo.localhost.", "LOCALHOST.",
  ])("refuses an update_url on %s with no request to it", async (host) => {
    const { result, requests } = await readUpdateUrl(`http://${host}/update.json`);
    expect(result).toEqual({ ok: false, failure: "host-refused", message: expect.stringContaining("does not request") });
    expect(requests.at(-1)!.url).toBe(XPI);
  });

  // The address just outside each range edge that lies outside every range, then a public mapped address.
  test.each([
    "1.0.0.0", "9.255.255.255", "11.0.0.0", "100.63.255.255", "100.128.0.0", "126.255.255.255", "128.0.0.0",
    "169.253.255.255", "169.255.0.0", "172.15.255.255", "172.32.0.0", "191.255.255.255", "192.0.1.0",
    "192.0.1.255", "192.0.3.0", "192.167.255.255", "192.169.0.0", "198.17.255.255", "198.20.0.0",
    "198.51.99.255", "198.51.101.0", "203.0.112.255", "203.0.114.0", "223.255.255.255",
    "[::1:0:0]", "[fbff:ffff:ffff:ffff:ffff:ffff:ffff:ffff]", "[fe00::]", "[fe7f:ffff:ffff:ffff:ffff:ffff:ffff:ffff]",
    "[fec0::]", "[feff:ffff:ffff:ffff:ffff:ffff:ffff:ffff]", "[64:ff9a:ffff:ffff:ffff:ffff:ffff:ffff]",
    "[64:ff9b::1:0:0]", "[2001:ffff:ffff:ffff:ffff:ffff:ffff:ffff]", "[2003::]",
    "[2001:db7:ffff:ffff:ffff:ffff:ffff:ffff]", "[2001:db9::]", "[::ffff:8.8.8.8]",
  ])("requests an update_url on %s", async (host) => {
    const url = new URL(`http://${host}/update.json`).href;
    const { result, requests } = await readUpdateUrl(url);
    expect(result).toEqual({ ok: false, failure: "update-json-http-error", message: expect.stringContaining(url) });
    expect(requests.at(-1)!.url).toBe(url);
  });

  const NAMES: Record<string, string[]> = {
    "github.com": ["140.82.112.3"],
    "mixed.example": ["8.8.8.8", "fd00::1"],
    "public.example": ["8.8.8.8", "2606:4700::1111"],
    "empty.example": [],
  };
  const namedLookup: Lookup = async (host) => NAMES[host] ?? Promise.reject(new Error(`ENOTFOUND ${host}`));

  test("refuses a name that resolves to one public and one blocked address", async () => {
    const { result, requests } = await readUpdateUrl("http://mixed.example/update.json", namedLookup);
    expect(result).toEqual({ ok: false, failure: "host-refused", message: expect.stringContaining("fd00::1") });
    expect(requests.at(-1)!.url).toBe(XPI);
  });

  test("refuses a name whose lookup answer is not an address", async () => {
    const lookup: Lookup = async (host) => (host === "odd.example" ? ["127.0.0.1 "] : publicLookup(host));
    const { result, requests } = await readUpdateUrl("http://odd.example/update.json", lookup);
    expect(result).toEqual({ ok: false, failure: "host-refused", message: expect.stringContaining('"127.0.0.1 "') });
    expect(requests.at(-1)!.url).toBe(XPI);
  });

  test("looks up a name with its trailing dot, as fetch will", async () => {
    const asked: string[] = [];
    await readUpdateUrl("http://public.example./update.json", async (host) => (asked.push(host), ["8.8.8.8"]));
    expect(asked).toContain("public.example.");
  });

  test("fails with request-failed and no request when the XPI URL is not http or https", async () => {
    const { result, requests } = await read((r) => {
      (r[RELEASES].json as Json[])[0].assets[0].browser_download_url = "file:///etc/passwd";
    });
    expect(result).toEqual({ ok: false, failure: "request-failed", message: expect.stringContaining("file:///etc/passwd") });
    expect(requests.map((q) => q.url)).not.toContain("file:///etc/passwd");
  });

  test("requests a name that resolves only to public addresses", async () => {
    const { requests } = await readUpdateUrl("http://public.example/update.json", namedLookup);
    expect(requests.at(-1)!.url).toBe("http://public.example/update.json");
  });

  test.each([
    ["fails", "missing.example", "ENOTFOUND missing.example"],
    ["returns no address", "empty.example", "no address"],
  ])("fails with request-failed and no request when the lookup %s", async (_name, host, detail) => {
    const { result, requests } = await readUpdateUrl(`http://${host}/update.json`, namedLookup);
    expect(result).toEqual({ ok: false, failure: "request-failed", message: expect.stringContaining(detail), buildLevel: true });
    expect(requests.at(-1)!.url).toBe(XPI);
  });

  test("fails with request-failed when the lookup gives no answer within 60 s", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const pending = readUpdateUrl("http://hung.example/update.json", (host) =>
        host === "hung.example" ? new Promise(() => {}) : publicLookup(host),
      );
      let settled = false;
      void pending.then(() => (settled = true));
      // The read reaches the lookup only after real I/O, so the clock moves until it settles.
      for (let i = 0; i < 100 && !settled; i++) {
        await new Promise((resolve) => setImmediate(resolve));
        await vi.advanceTimersByTimeAsync(10_000);
      }
      const { result, requests } = await pending;
      expect(result).toEqual({ ok: false, failure: "request-failed", message: expect.stringContaining("no answer after 60000 ms"), buildLevel: true });
      expect(requests.at(-1)!.url).toBe(XPI);
    } finally {
      vi.useRealTimers();
    }
  });

  test.each<[string, string | undefined, Recorded["stall"]]>([
    ["the headers of a GitHub API answer", REPO, "headers"],
    ["the body of a GitHub API answer", RELEASES, "body"],
    ["a host lookup", undefined, undefined],
    ["the headers of the XPI", XPI, "headers"],
    ["the body of the XPI", XPI, "body"],
    ["the headers of the update.json", UPDATE, "headers"],
    ["the body of the update.json", UPDATE, "body"],
  ])("fails with request-failed and the abort reason when the signal aborts during %s", async (_name, url, stall) => {
    const { responses } = loadFixture(FIXTURE);
    if (url) responses[url].stall = stall;
    const controller = new AbortController();
    const abort = () => setImmediate(() => controller.abort(new Error("the read passed its test limit")));
    const { fetch, requests } = fixtureFetch(responses, (seen) => seen.url === url && abort());
    const lookup: Lookup = url ? publicLookup : () => (abort(), new Promise(() => {}));
    const result = await readUpstream(REPO_URL, fetch, { lookup, signal: controller.signal });
    expect(result).toEqual({
      ok: false,
      failure: "request-failed",
      message: expect.stringContaining("the read passed its test limit"),
      buildLevel: true,
    });
    expect(requests.at(-1)!.url).toBe(url ?? RELEASES_PAGE_2);
  });

  test("checks the XPI host as well", async () => {
    const { result, requests } = await read(undefined, REPO_URL, async () => ["127.0.0.1"]);
    expect(result).toEqual({ ok: false, failure: "host-refused", message: expect.stringContaining(XPI) });
    expect(requests.map((r) => r.url)).not.toContain(XPI);
  });

  test("asks fetch not to follow redirects for the XPI and update.json, and only for those", async () => {
    const { requests } = await read();
    expect(requests.map((r) => [r.url, r.redirect])).toEqual([
      [REPO, undefined],
      [RELEASES, undefined],
      [RELEASES_PAGE_2, undefined],
      [XPI, "manual"],
      [UPDATE, "manual"],
    ]);
  });

  // Each hop of `chain` redirects to the next with `status`; the last hop is the recorded update.json.
  function redirectChain(r: Responses, chain: string[], status = 302) {
    manifest(r).applications.zotero.update_url = chain[0];
    chain.forEach((url, i) => (r[url] = { status, headers: { location: chain[i + 1] ?? UPDATE } }));
  }
  const hops = (n: number) => Array.from({ length: n }, (_, i) => `https://hop.example/${i}`);

  test.each([
    ["an address", "http://127.0.0.1/update.json"],
    ["a protocol-relative Location", "//127.0.0.1/x"],
  ])("refuses a redirect to %s with no request to it", async (_name, location) => {
    const { result, requests } = await read((r) => {
      manifest(r).applications.zotero.update_url = "https://hop.example/0";
      r["https://hop.example/0"] = { status: 302, headers: { location } };
    });
    expect(result).toEqual({ ok: false, failure: "host-refused", message: expect.stringContaining("127.0.0.1") });
    expect(requests.at(-1)!.url).toBe("https://hop.example/0");
  });

  test("fails with request-failed after more than 5 redirects", async () => {
    const { result, requests } = await read((r) => redirectChain(r, hops(6)));
    expect(result).toEqual({ ok: false, failure: "request-failed", message: expect.stringContaining("more than 5 redirects") });
    expect(requests.at(-1)!.url).toBe("https://hop.example/5");
  });

  test("fails as a cut read when the signal aborts at the last redirect", async () => {
    const { responses } = loadFixture(FIXTURE);
    redirectChain(responses, hops(6));
    const controller = new AbortController();
    const { fetch } = fixtureFetch(responses, (seen) => {
      if (seen.url === "https://hop.example/5") controller.abort(new Error("the read passed its test limit"));
    });
    const result = await readUpstream(REPO_URL, fetch, { lookup: publicLookup, signal: controller.signal });
    expect(result).toEqual({
      ok: false,
      failure: "request-failed",
      message: "GET https://hop.example/5 failed: the read passed its test limit",
      buildLevel: true,
    });
  });

  test("follows 5 redirects with relative Locations to the update.json", async () => {
    const { result } = await read((r) => {
      redirectChain(r, hops(5));
      for (let i = 0; i < 4; i++) r[`https://hop.example/${i}`].headers = { location: `/${i + 1}` };
    });
    expect(result.ok).toBe(true);
  });

  test.each([301, 302, 303, 307, 308])("follows a %i redirect", async (status) => {
    const { result } = await read((r) => redirectChain(r, hops(1), status));
    expect(result.ok).toBe(true);
  });

  test.each<[string, Record<string, string> | undefined, string]>([
    ["no Location", undefined, "no usable Location"],
    ["a file: Location", { location: "file:///etc/passwd" }, "not an http or https URL"],
  ])("fails with request-failed on a redirect with %s", async (_name, headers, detail) => {
    const { result } = await read((r) => {
      manifest(r).applications.zotero.update_url = "https://hop.example/0";
      r["https://hop.example/0"] = { status: 302, headers };
    });
    expect(result).toEqual({ ok: false, failure: "request-failed", message: expect.stringContaining(detail) });
  });

  test.each(["https://gitlab.com/windingwind/zotero-better-notes", "https://github.com/windingwind", "not a url"])(
    "fails on %j, which is not a GitHub repo URL, with no request",
    async (url) => {
      const { result, requests } = await read(undefined, url);
      expect(result).toEqual({ ok: false, failure: "not-github-repo", message: expect.stringContaining(url) });
      expect(requests).toEqual([]);
    },
  );
});

describe("buildLevelStatus", () => {
  test("counts 401 and 403 from the GitHub API, 403 from a GitHub release download, and 429 and 500 to 599 from any host", () => {
    for (let status = 200; status <= 599; status++) {
      const anyHost = status === 429 || status >= 500;
      expect([status, buildLevelStatus(status, "github-api")]).toEqual([status, anyHost || status === 401 || status === 403]);
      expect([status, buildLevelStatus(status, "github-release")]).toEqual([status, anyHost || status === 403]);
      expect([status, buildLevelStatus(status, "download")]).toEqual([status, anyHost]);
    }
  });
});
