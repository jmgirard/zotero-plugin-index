import { afterEach, describe, expect, test, vi } from "vitest";
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

// Reads the recorded plugin after `edit` changes its responses.
async function read(edit?: (responses: Responses) => void, repoUrl = REPO_URL) {
  const { responses } = loadFixture(FIXTURE);
  edit?.(responses);
  const { fetch, requests } = fixtureFetch(responses);
  return { result: await readUpstream(repoUrl, fetch), requests };
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

  test("leaves out a placeholder that no messages.json resolves", async () => {
    const { result } = await read((r) => (manifest(r).name = "__MSG_name__"));
    expect(result.ok).toBe(true);
    expect(result.ok && result.facts.name).toBeUndefined();
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

  test.each(["https://gitlab.com/windingwind/zotero-better-notes", "https://github.com/windingwind", "not a url"])(
    "fails on %j, which is not a GitHub repo URL, with no request",
    async (url) => {
      const { result, requests } = await read(undefined, url);
      expect(result).toEqual({ ok: false, failure: "not-github-repo", message: expect.stringContaining(url) });
      expect(requests).toEqual([]);
    },
  );
});
