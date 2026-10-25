import process from "node:process";
import { strFromU8, unzipSync } from "fflate";
import { type Lookup, refusal, systemLookup } from "./host-guard.ts";

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

// The facts the index reads from one plugin's repo and release XPI, after it checks
// that the plugin's update.json lists the plugin id.
export interface UpstreamFacts {
  id: string;
  name?: string;
  description?: string;
  homepage?: string;
  version: string;
  strictMinVersion?: string;
  strictMaxVersion?: string;
  updateUrl: string;
  updateHost: string;
  repoUrl: string;
  repoCreatedAt: string;
  openIssues: number;
  // Releases that carry an .xpi asset, drafts excluded.
  releaseCount: number;
  // The publish date of the release whose manifest was read.
  latestReleaseDate: string;
}

// Each way a repo can fail the inclusion bar or fail to be read.
export type Failure =
  | "not-github-repo"
  | "github-http-error"
  | "request-failed"
  | "private"
  | "fork"
  | "no-release"
  | "no-xpi-release"
  | "xpi-unreadable"
  | "xpi-too-large"
  | "no-manifest"
  | "manifest-too-large"
  | "manifest-invalid"
  | "no-zotero-id"
  | "max-version-below-7"
  | "no-update-url"
  | "update-json-http-error"
  | "update-json-invalid"
  | "update-json-too-large"
  | "update-json-missing-id"
  | "host-refused";

export type UpstreamResult = { ok: true; facts: UpstreamFacts } | { ok: false; failure: Failure; message: string };

const API = "https://api.github.com";
const FETCH_TIMEOUT_MS = 60_000;
// The largest XPI among the listed plugins was 5.5 MB (observed 2026-10-25).
export const XPI_MAX_BYTES = 50 * 1024 * 1024;
export const UPDATE_JSON_MAX_BYTES = 1024 * 1024;
// Each file the reader unzips: manifest.json and the default locale's messages.json.
export const UNZIPPED_MAX_BYTES = 1024 * 1024;

class ReadFailure extends Error {
  readonly failure: Failure;
  constructor(failure: Failure, message: string) {
    super(message);
    this.failure = failure;
  }
}

function fail(failure: Failure, message: string): never {
  throw new ReadFailure(failure, message);
}

// Reads one GitHub repo. It never throws for a problem with the plugin: each one
// comes back as a named failure, so a caller that reads many plugins can go on
// past a bad one. `lookup` resolves the hosts of the XPI and update.json URLs for
// the host check.
export async function readUpstream(
  repoUrl: string,
  fetch: Fetch,
  { lookup = systemLookup }: { lookup?: Lookup } = {},
): Promise<UpstreamResult> {
  try {
    return { ok: true, facts: await read(repoUrl, fetch, downloader(fetch, lookup)) };
  } catch (error) {
    if (error instanceof ReadFailure) return { ok: false, failure: error.failure, message: error.message };
    throw error;
  }
}

async function read(repoUrl: string, fetch: Fetch, download: Download): Promise<UpstreamFacts> {
  const { owner, repo } = parseRepoUrl(repoUrl);
  const github = githubClient(fetch);

  const metaUrl = `${API}/repos/${owner}/${repo}`;
  const meta = (await github.json(metaUrl)) as RepoJson;
  if (typeof meta !== "object" || meta === null || Array.isArray(meta)) {
    fail("request-failed", `GET ${metaUrl} returned a body that is not an object`);
  }
  if (meta.private) fail("private", `${meta.full_name} is a private repo`);
  if (meta.fork) fail("fork", `${meta.full_name} is a fork`);

  const releases = (await github.pages(`${API}/repos/${owner}/${repo}/releases?per_page=100`)) as ReleaseJson[];
  const published = releases.filter((release) => typeof release === "object" && release !== null && !release.draft);
  if (published.length === 0) fail("no-release", `${meta.full_name} has no release`);
  const withXpi = published
    .map((release) => ({
      release,
      xpi: (Array.isArray(release.assets) ? release.assets : []).find((asset) => /\.xpi$/i.test(asset?.name)),
    }))
    .filter((item) => item.xpi !== undefined)
    .sort((a, b) => Date.parse(b.release.published_at) - Date.parse(a.release.published_at));
  if (withXpi.length === 0) fail("no-xpi-release", `no release of ${meta.full_name} has an .xpi asset`);
  const { release, xpi } = withXpi[0];

  const { manifest, messages } = await readManifest(download, xpi!.browser_download_url, release.tag_name);
  const zotero = manifest.applications?.zotero;
  const id = stringOrUndefined(zotero?.id);
  if (!id) fail("no-zotero-id", `the manifest of ${release.tag_name} has no applications.zotero.id`);
  const version = stringOrUndefined(manifest.version);
  if (!version) fail("manifest-invalid", `the manifest of ${release.tag_name} has no version`);
  const strictMaxVersion = checkMaxVersion(zotero?.strict_max_version);

  const updateUrl = stringOrUndefined(zotero?.update_url);
  if (!updateUrl) fail("no-update-url", `the manifest of ${release.tag_name} has no applications.zotero.update_url`);
  const updateHost = httpHost(updateUrl);
  if (!updateHost) fail("no-update-url", `update_url ${updateUrl} is not an http or https URL`);
  await checkUpdateJson(download, updateUrl, id);

  return {
    id,
    name: localized(manifest.name, messages),
    description: localized(manifest.description, messages),
    homepage: stringOrUndefined(manifest.homepage_url),
    version,
    strictMinVersion: stringOrUndefined(zotero?.strict_min_version),
    strictMaxVersion,
    updateUrl,
    updateHost,
    repoUrl: meta.html_url,
    repoCreatedAt: meta.created_at,
    openIssues: meta.open_issues_count,
    releaseCount: withXpi.length,
    latestReleaseDate: release.published_at,
  };
}

interface RepoJson {
  full_name: string;
  html_url: string;
  private: boolean;
  fork: boolean;
  created_at: string;
  open_issues_count: number;
}

interface ReleaseJson {
  tag_name: string;
  draft: boolean;
  published_at: string;
  assets: { name: string; browser_download_url: string }[];
}

interface ManifestJson {
  name?: unknown;
  description?: unknown;
  homepage_url?: unknown;
  version?: unknown;
  default_locale?: unknown;
  applications?: { zotero?: Record<string, unknown> };
}

// The default locale's _locales/<locale>/messages.json.
type Messages = Record<string, { message?: unknown } | null>;

// A manifest string such as "__MSG_name__" names a message in the default locale's
// messages.json; message names ignore case. An unresolved placeholder is not a value.
function localized(value: unknown, messages: Messages): string | undefined {
  const text = stringOrUndefined(value);
  const key = /^__MSG_(\w+)__$/.exec(text ?? "")?.[1];
  if (!key) return text;
  const entry = Object.entries(messages).find(([name]) => name.toLowerCase() === key.toLowerCase());
  return stringOrUndefined(entry?.[1]?.message);
}

// A version starts with a digit, or is "*" for any version. An absent one passes.
function checkMaxVersion(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !/^(\*|\d)/.test(value)) {
    fail("manifest-invalid", `strict_max_version ${JSON.stringify(value)} is not a version`);
  }
  if (Number.parseInt(value, 10) < 7) fail("max-version-below-7", `strict_max_version ${value} is below Zotero 7`);
  return value;
}

function parseRepoUrl(url: string): { owner: string; repo: string } {
  let parsed: URL | undefined;
  try {
    parsed = new URL(url);
  } catch {
    // Reported below.
  }
  const [owner, repo] = parsed?.pathname.split("/").filter(Boolean) ?? [];
  if (!parsed || !["github.com", "www.github.com"].includes(parsed.host) || !owner || !repo) {
    fail("not-github-repo", `${url} is not a GitHub repo URL such as https://github.com/<owner>/<repo>`);
  }
  return { owner, repo: repo.replace(/\.git$/, "") };
}

function githubClient(fetch: Fetch) {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "user-agent": "zotero-plugin-index",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.authorization = `Bearer ${token}`;

  async function get(url: string): Promise<{ body: unknown; link: string | null }> {
    const response = await request(fetch, url, { headers });
    if (!response.ok) fail("github-http-error", `GET ${url} returned HTTP ${response.status}`);
    const text = await readText(response, url);
    try {
      return { body: JSON.parse(text), link: response.headers.get("link") };
    } catch (error) {
      fail("request-failed", `GET ${url} returned a body that is not JSON: ${(error as Error).message}`);
    }
  }

  return {
    json: async (url: string): Promise<unknown> => (await get(url)).body,
    // Follows the Link header's rel="next" and joins the pages' arrays. The token
    // goes only to the API host, and a page seen before ends the read.
    async pages(url: string): Promise<unknown[]> {
      const items: unknown[] = [];
      const seen = new Set<string>();
      for (let next: string | undefined = url; next; ) {
        if (!URL.canParse(next) || new URL(next).origin !== API) fail("request-failed", `the next page ${next} is not on ${API}`);
        if (seen.has(next)) fail("request-failed", `the next page ${next} was read before`);
        seen.add(next);
        const { body, link } = await get(next);
        if (!Array.isArray(body)) fail("request-failed", `GET ${next} returned a body that is not a list`);
        items.push(...body);
        next = /<([^>]+)>;\s*rel="next"/.exec(link ?? "")?.[1];
      }
      return items;
    },
  };
}

async function request(fetch: Fetch, url: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch (error) {
    fail("request-failed", `GET ${url} failed: ${(error as Error).message}`);
  }
}

async function readText(response: Response, url: string): Promise<string> {
  try {
    return await response.text();
  } catch (error) {
    fail("request-failed", `GET ${url} failed while reading the body: ${(error as Error).message}`);
  }
}

// Reads the body until it ends or passes `max` bytes. Past `max` it cancels the body,
// so it reads at most `max` bytes plus the chunk that crosses it.
async function readCapped(response: Response, url: string, max: number, tooLarge: () => never): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    const reader = response.body?.getReader();
    for (let chunk = await reader?.read(); chunk && !chunk.done; chunk = await reader!.read()) {
      total += chunk.value.byteLength;
      if (total > max) {
        await reader!.cancel().catch(() => {});
        tooLarge();
      }
      chunks.push(chunk.value);
    }
  } catch (error) {
    if (error instanceof ReadFailure) throw error;
    fail("request-failed", `GET ${url} failed while reading the body: ${(error as Error).message}`);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

// Requests a plugin file that is not on the GitHub API: the XPI or the update.json.
type Download = (url: string) => Promise<Response>;

// Checks the host of each URL before it requests it.
function downloader(fetch: Fetch, lookup: Lookup): Download {
  return async (url) => {
    if (!URL.canParse(url)) fail("request-failed", `${url} is not a URL`);
    const refused = await refusal(new URL(url), lookup);
    if (refused) fail(refused.failure, refused.message);
    return request(fetch, url);
  };
}

async function readManifest(
  download: Download,
  url: string,
  tag: string,
): Promise<{ manifest: ManifestJson; messages: Messages }> {
  const response = await download(url);
  if (!response.ok) fail("xpi-unreadable", `the XPI of ${tag} at ${url} returned HTTP ${response.status}`);
  const zip = await readCapped(response, url, XPI_MAX_BYTES, () =>
    fail("xpi-too-large", `the XPI of ${tag} at ${url} is larger than ${XPI_MAX_BYTES} bytes`),
  );
  const bytes = unzipOne(zip, "manifest.json", tag);
  if (!bytes) fail("no-manifest", `the XPI of ${tag} holds no manifest.json`);
  let manifest: unknown;
  try {
    manifest = JSON.parse(strFromU8(bytes));
  } catch (error) {
    fail("manifest-invalid", `the manifest.json of ${tag} is not valid JSON: ${(error as Error).message}`);
  }
  if (typeof manifest !== "object" || manifest === null) {
    fail("manifest-invalid", `the manifest.json of ${tag} is not a JSON object`);
  }
  const locale = stringOrUndefined((manifest as ManifestJson).default_locale);
  const messagesBytes = locale ? unzipOne(zip, `_locales/${locale}/messages.json`, tag) : undefined;
  let messages: unknown;
  try {
    messages = messagesBytes && JSON.parse(strFromU8(messagesBytes));
  } catch {
    // Unreadable messages leave the placeholders unresolved.
  }
  const isObject = typeof messages === "object" && messages !== null;
  return { manifest: manifest as ManifestJson, messages: isObject ? (messages as Messages) : {} };
}

// Unzips the one file `name`, or returns undefined when the zip lacks it. fflate sizes
// the output from the zip's central directory and stops inflating at that size
// (observed with fflate 0.8.3, 2026-10-25), so refusing a large declared size bounds
// the memory the file takes.
function unzipOne(zip: Uint8Array, name: string, tag: string): Uint8Array | undefined {
  try {
    return unzipSync(zip, {
      filter: (file) => {
        if (file.name !== name) return false;
        if (file.originalSize > UNZIPPED_MAX_BYTES) {
          fail("manifest-too-large", `${name} in the XPI of ${tag} is larger than ${UNZIPPED_MAX_BYTES} bytes`);
        }
        return true;
      },
    })[name];
  } catch (error) {
    if (error instanceof ReadFailure) throw error;
    fail("xpi-unreadable", `the XPI of ${tag} is not a readable zip: ${(error as Error).message}`);
  }
}

async function checkUpdateJson(download: Download, url: string, id: string): Promise<void> {
  const response = await download(url);
  if (!response.ok) fail("update-json-http-error", `the update.json at ${url} returned HTTP ${response.status}`);
  const bytes = await readCapped(response, url, UPDATE_JSON_MAX_BYTES, () =>
    fail("update-json-too-large", `the update.json at ${url} is larger than ${UPDATE_JSON_MAX_BYTES} bytes`),
  );
  const text = new TextDecoder().decode(bytes);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    fail("update-json-invalid", `the update.json at ${url} is not valid JSON`);
  }
  const addons = (body as { addons?: Record<string, unknown> } | null)?.addons;
  if (typeof addons !== "object" || addons === null || !Object.hasOwn(addons, id)) {
    fail("update-json-missing-id", `the update.json at ${url} has no entry for ${id}`);
  }
}

function httpHost(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.host : undefined;
  } catch {
    return undefined;
  }
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
