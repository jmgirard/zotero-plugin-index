import process from "node:process";
import { strFromU8, unzipSync } from "fflate";

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

// The facts the index reads from one plugin's repo, release XPI, and update.json.
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
  | "fork"
  | "no-release"
  | "no-xpi-release"
  | "xpi-unreadable"
  | "no-manifest"
  | "manifest-invalid"
  | "no-zotero-id"
  | "max-version-below-7"
  | "no-update-url"
  | "update-json-http-error"
  | "update-json-invalid"
  | "update-json-missing-id";

export type UpstreamResult = { ok: true; facts: UpstreamFacts } | { ok: false; failure: Failure; message: string };

const API = "https://api.github.com";
const FETCH_TIMEOUT_MS = 60_000;

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
// comes back as a named failure, so one bad plugin cannot stop a run over many.
export async function readUpstream(repoUrl: string, fetch: Fetch): Promise<UpstreamResult> {
  try {
    return { ok: true, facts: await read(repoUrl, fetch) };
  } catch (error) {
    if (error instanceof ReadFailure) return { ok: false, failure: error.failure, message: error.message };
    throw error;
  }
}

async function read(repoUrl: string, fetch: Fetch): Promise<UpstreamFacts> {
  const { owner, repo } = parseRepoUrl(repoUrl);
  const github = githubClient(fetch);

  const meta = (await github.json(`${API}/repos/${owner}/${repo}`)) as RepoJson;
  if (meta.fork) fail("fork", `${meta.full_name} is a fork`);

  const releases = (await github.pages(`${API}/repos/${owner}/${repo}/releases?per_page=100`)) as ReleaseJson[];
  const published = releases.filter((release) => !release.draft);
  if (published.length === 0) fail("no-release", `${meta.full_name} has no release`);
  const withXpi = published
    .map((release) => ({ release, xpi: release.assets.find((asset) => /\.xpi$/i.test(asset.name)) }))
    .filter((item) => item.xpi !== undefined)
    .sort((a, b) => Date.parse(b.release.published_at) - Date.parse(a.release.published_at));
  if (withXpi.length === 0) fail("no-xpi-release", `no release of ${meta.full_name} has an .xpi asset`);
  const { release, xpi } = withXpi[0];

  const manifest = await readManifest(fetch, xpi!.browser_download_url, release.tag_name);
  const zotero = manifest.applications?.zotero;
  const id = stringOrUndefined(zotero?.id);
  if (!id) fail("no-zotero-id", `the manifest of ${release.tag_name} has no applications.zotero.id`);
  const version = stringOrUndefined(manifest.version);
  if (!version) fail("manifest-invalid", `the manifest of ${release.tag_name} has no version`);
  const strictMaxVersion = stringOrUndefined(zotero?.strict_max_version);
  if (strictMaxVersion !== undefined && Number.parseInt(strictMaxVersion, 10) < 7) {
    fail("max-version-below-7", `strict_max_version ${strictMaxVersion} is below Zotero 7`);
  }

  const updateUrl = stringOrUndefined(zotero?.update_url);
  if (!updateUrl) fail("no-update-url", `the manifest of ${release.tag_name} has no applications.zotero.update_url`);
  const updateHost = httpHost(updateUrl);
  if (!updateHost) fail("no-update-url", `update_url ${updateUrl} is not an http or https URL`);
  await checkUpdateJson(fetch, updateUrl, id);

  return {
    id,
    name: stringOrUndefined(manifest.name),
    description: stringOrUndefined(manifest.description),
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
  applications?: { zotero?: Record<string, unknown> };
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
    try {
      return { body: await response.json(), link: response.headers.get("link") };
    } catch (error) {
      fail("request-failed", `GET ${url} returned a body that is not JSON: ${(error as Error).message}`);
    }
  }

  return {
    json: async (url: string): Promise<unknown> => (await get(url)).body,
    // Follows the Link header's rel="next" and joins the pages' arrays.
    async pages(url: string): Promise<unknown[]> {
      const items: unknown[] = [];
      for (let next: string | undefined = url; next; ) {
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

async function readManifest(fetch: Fetch, url: string, tag: string): Promise<ManifestJson> {
  const response = await request(fetch, url);
  if (!response.ok) fail("xpi-unreadable", `the XPI of ${tag} at ${url} returned HTTP ${response.status}`);
  let files: Record<string, Uint8Array>;
  try {
    const zip = new Uint8Array(await response.arrayBuffer());
    files = unzipSync(zip, { filter: (file) => file.name === "manifest.json" });
  } catch (error) {
    fail("xpi-unreadable", `the XPI of ${tag} is not a readable zip: ${(error as Error).message}`);
  }
  const bytes = files["manifest.json"];
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
  return manifest as ManifestJson;
}

async function checkUpdateJson(fetch: Fetch, url: string, id: string): Promise<void> {
  const response = await request(fetch, url);
  if (!response.ok) fail("update-json-http-error", `the update.json at ${url} returned HTTP ${response.status}`);
  let body: unknown;
  try {
    body = JSON.parse(await response.text());
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
