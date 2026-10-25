import { unzipSync, zipSync } from "fflate";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { Lookup } from "../src/upstream/host-guard.ts";
import { readUpstream } from "../src/upstream/reader.ts";
import { fixtureFetch, loadFixture, type Responses } from "./support/fixture-fetch.ts";

const FIXTURE = "test/fixtures/upstream/better-notes.json";
const REPO_URL = "https://github.com/windingwind/zotero-better-notes";
const REPO = "https://api.github.com/repos/windingwind/zotero-better-notes";
const RELEASES = `${REPO}/releases?per_page=100`;
const RELEASES_PAGE_2 = "https://api.github.com/repositories/486255787/releases?per_page=100&page=2";
const XPI = "https://github.com/windingwind/zotero-better-notes/releases/download/v3.3.3/better-notes-for-zotero.xpi";
const UPDATE = "https://github.com/windingwind/zotero-better-notes/releases/download/release/update.json";

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
        releaseCount: 2,
        latestReleaseDate: "2026-08-24T13:25:16Z",
      },
    });
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

  test("reads the newest published release with an .xpi, whatever the list order", async () => {
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

  test.each(["7.0", "*", undefined])("passes a strict_max_version of %j", async (max) => {
    const { result } = await read((r) => (manifest(r).applications.zotero.strict_max_version = max));
    expect(result.ok).toBe(true);
    expect(result.ok && result.facts.strictMaxVersion).toBe(max);
  });

  // Each row changes one recorded response, and `detail` is text the failure message
  // must hold, which shows the read reached the changed response.
  test.each<[string, (r: Responses) => void, string, string]>([
    ["the repo request returns 404", (r) => (r[REPO].status = 404), "github-http-error", "HTTP 404"],
    ["the releases request returns 403", (r) => (r[RELEASES].status = 403), "github-http-error", "HTTP 403"],
    ["a GitHub request cannot connect", (r) => (r[RELEASES_PAGE_2] = { error: "fetch failed" }), "request-failed", "fetch failed"],
    ["a body read is cut off", (r) => (r[UPDATE] = { bodyError: "terminated" }), "request-failed", "terminated"],
    ["the repo body is not JSON", (r) => (r[REPO] = { text: "<html>" }), "request-failed", "not JSON"],
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

  test("does not unzip the messages.json of a locale that is not the default", async () => {
    const { result } = await read((r) => {
      manifest(r).default_locale = "en";
      r[XPI].xpi!["_locales/de/messages.json"] = JSON.stringify({ name: { message: "Notizen" } }) + OVER_1_MIB;
    });
    expect(result.ok).toBe(true);
  });

  test("fflate inflates a file no further than the size the central directory declares", () => {
    const zip = zipSync({ "manifest.json": new Uint8Array(100_000).fill(32) });
    const view = new DataView(zip.buffer, zip.byteOffset);
    // The central directory header starts with 0x02014b50; its uncompressed size is at offset 24.
    const header = zip.findLastIndex((_, i) => i + 4 <= zip.length && view.getUint32(i, true) === 0x02014b50);
    view.setUint32(header + 24, 10, true);
    expect(unzipSync(zip)["manifest.json"].length).toBe(10);
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

  test("requests a name that resolves only to public addresses", async () => {
    const { requests } = await readUpdateUrl("http://public.example/update.json", namedLookup);
    expect(requests.at(-1)!.url).toBe("http://public.example/update.json");
  });

  test.each([
    ["fails", "missing.example", "ENOTFOUND missing.example"],
    ["returns no address", "empty.example", "no address"],
  ])("fails with request-failed and no request when the lookup %s", async (_name, host, detail) => {
    const { result, requests } = await readUpdateUrl(`http://${host}/update.json`, namedLookup);
    expect(result).toEqual({ ok: false, failure: "request-failed", message: expect.stringContaining(detail) });
    expect(requests.at(-1)!.url).toBe(XPI);
  });

  test("checks the XPI host as well", async () => {
    const { result, requests } = await read(undefined, REPO_URL, async () => ["127.0.0.1"]);
    expect(result).toEqual({ ok: false, failure: "host-refused", message: expect.stringContaining(XPI) });
    expect(requests.map((r) => r.url)).not.toContain(XPI);
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
