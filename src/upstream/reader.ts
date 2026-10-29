import { createHash } from "node:crypto";
import process from "node:process";
import { Inflate, strFromU8 } from "fflate";
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
  // The repo's About text from GitHub, trimmed, left out when it is not a string or is blank.
  repoDescription?: string;
  repoCreatedAt: string;
  openIssues: number;
  // Releases that carry an .xpi asset, drafts excluded.
  releaseCount: number;
  // The publish date of the release whose manifest was read.
  latestReleaseDate: string;
  // Whether GitHub marks the release whose manifest was read as a prerelease. The reader
  // always sets it; records written before it existed have none.
  prerelease?: boolean;
  // GitHub's archived flag, left out when the repo response has no boolean.
  archived?: boolean;
  // The language tags of the locale folders in the XPI whose manifest was read, each with a
  // language other than und, zxx, and mul that has an English name in the build's Node.js
  // Intl data (see LANGUAGE_TAG), and with either at
  // least one message and at least half the messages of the fullest tag, or a file that is
  // not counted (see localeLanguages). The reader always sets it;
  // records written before it existed have none.
  languages?: string[];
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

// `buildLevel` marks a failure that usually points at the build rather than at the plugin: a
// request with no whole response, a GitHub API body that is not JSON, or an answer that
// buildLevelStatus counts. The build counts such failures to decide whether to deploy. It
// is not part of the published data. Nor are `topics`, the repo's GitHub topics that are
// strings, which the discovery bot reads.
export type UpstreamResult =
  | { ok: true; facts: UpstreamFacts; xpi: XpiRead; topics: string[] }
  | { ok: false; failure: Failure; message: string; buildLevel?: true };

// The XPI whose manifest the reader read: the release asset's download URL, before any
// redirect, and the SHA-256 of the bytes it got, in hex. The build publishes the URL as
// `upstream.xpiUrl`; the SHA-256 stays out of the published data.
export interface XpiRead {
  url: string;
  sha256: string;
}

const API = "https://api.github.com";
const FETCH_TIMEOUT_MS = 60_000;
// The largest XPI among the listed plugins was 5.5 MB (observed 2026-10-25).
export const XPI_MAX_BYTES = 50 * 1024 * 1024;
export const UPDATE_JSON_MAX_BYTES = 1024 * 1024;
// Each file the reader unzips: manifest.json, the default locale's messages.json, the
// messages.json of each English folder in ENGLISH_LOCALES, and each locale file that
// localeLanguages reads. A locale file over it keeps its tag, and an English messages.json
// over it is skipped.
export const UNZIPPED_MAX_BYTES = 1024 * 1024;

export class ReadFailure extends Error {
  readonly failure: Failure;
  readonly buildLevel: boolean;
  constructor(failure: Failure, message: string, buildLevel = false) {
    super(message);
    this.failure = failure;
    this.buildLevel = buildLevel;
  }
}

function fail(failure: Failure, message: string, buildLevel = false): never {
  throw new ReadFailure(failure, message, buildLevel);
}

// Whether an HTTP error answer usually points at the build: a rate limit or a server error from
// any host, a refused token from the GitHub API, or a 403 to a download that requested a
// GitHub release URL (see isReleaseUrl). A 404 and the other answers point at the plugin.
export function buildLevelStatus(status: number, from: "github-api" | "github-release" | "download"): boolean {
  if (status === 429 || (status >= 500 && status <= 599)) return true;
  if (from === "github-release") return status === 403;
  return from === "github-api" && (status === 401 || status === 403);
}

// A URL on github.com whose third path segment is `releases`, such as
// /<owner>/<repo>/releases/download/<tag>/<file> or /<owner>/<repo>/releases/latest/download/<file>.
// GitHub answers it, or the release file host that it redirects to, so a 403 there is GitHub's.
function isReleaseUrl(url: URL): boolean {
  return url.host === "github.com" && url.pathname.split("/")[3] === "releases";
}

// Reads one GitHub repo. It never throws for a problem with the plugin: each one
// comes back as a named failure, so a caller that reads many plugins can go on
// past a bad one. `lookup` resolves the hosts of the XPI and update.json URLs for
// the host check. When `signal` aborts, the request or lookup that the read waits on
// fails with request-failed, marked build-level, and its message holds the abort
// reason. Each request and lookup keeps its own 60 s limit as well.
export async function readUpstream(
  repoUrl: string,
  fetch: Fetch,
  { lookup = systemLookup, signal }: { lookup?: Lookup; signal?: AbortSignal } = {},
): Promise<UpstreamResult> {
  if (signal) {
    fetch = boundFetch(fetch, signal);
    lookup = boundLookup(lookup, signal);
  }
  try {
    return { ok: true, ...(await read(repoUrl, fetch, downloader(fetch, lookup, signal))) };
  } catch (error) {
    if (error instanceof ReadFailure) {
      return { ok: false, failure: error.failure, message: error.message, ...(error.buildLevel && { buildLevel: true }) };
    }
    throw error;
  }
}

// Each request also aborts when `signal` does. fetch then rejects with the signal's
// reason, and a body being read errors with it.
export function boundFetch(fetch: Fetch, signal: AbortSignal): Fetch {
  return (url, init = {}) => fetch(url, { ...init, signal: init.signal ? AbortSignal.any([init.signal, signal]) : signal });
}

// The lookup rejects with the signal's reason when the signal aborts. dns.lookup cannot
// be canceled, so only the wait for it ends.
function boundLookup(lookup: Lookup, signal: AbortSignal): Lookup {
  return (host) => {
    if (signal.aborted) return Promise.reject(signal.reason);
    // Started before the listener, so a lookup that throws leaves no listener behind.
    const answer = Promise.resolve().then(() => lookup(host));
    let onAbort!: () => void;
    const aborted = new Promise<never>((_, reject) => {
      onAbort = () => reject(signal.reason);
      signal.addEventListener("abort", onAbort, { once: true });
    });
    return Promise.race([answer, aborted]).finally(() => signal.removeEventListener("abort", onAbort));
  };
}

async function read(repoUrl: string, fetch: Fetch, download: Download): Promise<{ facts: UpstreamFacts; xpi: XpiRead; topics: string[] }> {
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

  // The newest stable release, or the newest release when none is stable. If the stable
  // release is not a Zotero 7+ build, the newest release published after it is read instead.
  const stable = withXpi.find((item) => item.release.prerelease !== true) ?? withXpi[0];
  const newest = withXpi[0];
  let facts: ReleaseFacts;
  try {
    facts = await readRelease(download, stable.release, stable.xpi!);
  } catch (error) {
    const notZotero7 = error instanceof ReadFailure && NOT_ZOTERO_7.includes(error.failure);
    if (!notZotero7 || !(Date.parse(newest.release.published_at) > Date.parse(stable.release.published_at))) throw error;
    facts = await readRelease(download, newest.release, newest.xpi!);
  }
  const { release, xpi, ...manifestFacts } = facts;

  return {
    facts: {
      ...manifestFacts,
      repoUrl: meta.html_url,
      repoDescription: typeof meta.description === "string" && meta.description.trim() !== "" ? meta.description.trim() : undefined,
      repoCreatedAt: meta.created_at,
      openIssues: meta.open_issues_count,
      releaseCount: withXpi.length,
      latestReleaseDate: release.published_at,
      prerelease: release.prerelease === true,
      archived: typeof meta.archived === "boolean" ? meta.archived : undefined,
    },
    xpi,
    topics: Array.isArray(meta.topics) ? meta.topics.filter((topic): topic is string => typeof topic === "string") : [],
  };
}

// The failures that show a release is not a Zotero 7+ build.
const NOT_ZOTERO_7: Failure[] = ["no-manifest", "no-zotero-id", "max-version-below-7"];

type ReleaseFacts = Pick<
  UpstreamFacts,
  | "id"
  | "name"
  | "description"
  | "homepage"
  | "version"
  | "strictMinVersion"
  | "strictMaxVersion"
  | "updateUrl"
  | "updateHost"
  | "languages"
> & { release: ReleaseJson; xpi: XpiRead };

// Reads the manifest and the language tags of the locale folders (see localeLanguages) in one
// release's XPI, and checks the update.json the manifest names.
async function readRelease(download: Download, release: ReleaseJson, xpi: { browser_download_url: string }): Promise<ReleaseFacts> {
  const url = xpi.browser_download_url;
  const { manifest, messages, languages, sha256 } = await readManifest(download, url, release.tag_name);
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
    languages,
    release,
    xpi: { url, sha256 },
  };
}

interface RepoJson {
  full_name: string;
  html_url: string;
  private: boolean;
  fork: boolean;
  archived?: unknown;
  description?: unknown;
  created_at: string;
  open_issues_count: number;
  topics?: unknown;
}

interface ReleaseJson {
  tag_name: string;
  draft: boolean;
  prerelease?: unknown;
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

// One _locales/<locale>/messages.json.
type Messages = Record<string, { message?: unknown } | null>;

// The messages a manifest placeholder can name: those of each English folder that
// readManifest read, in ENGLISH_LOCALES order, then the default locale's.
interface LocaleMessages {
  english: Messages[];
  default: Messages;
}

// The English _locales folders whose messages come before the default locale's, in order.
const ENGLISH_LOCALES = ["en", "en_US", "en_GB"];

function message(messages: Messages, key: string): unknown {
  const entry = Object.entries(messages).find(([name]) => name.toLowerCase() === key.toLowerCase());
  return entry?.[1]?.message;
}

// A manifest string such as "__MSG_name__" names a message; message names ignore case. The
// first English folder whose message is a string that is not blank gives the value, and
// otherwise the default locale's message does. An unresolved placeholder is not a value.
function localized(value: unknown, messages: LocaleMessages): string | undefined {
  const text = stringOrUndefined(value);
  const key = /^__MSG_(\w+)__$/.exec(text ?? "")?.[1];
  if (!key) return text;
  for (const english of messages.english) {
    const found = message(english, key);
    if (typeof found === "string" && found.trim() !== "") return found;
  }
  return stringOrUndefined(message(messages.default, key));
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

// Requests to the GitHub API. Each failure throws a ReadFailure.
export function githubClient(fetch: Fetch) {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "user-agent": "zotero-plugin-index",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.authorization = `Bearer ${token}`;

  // The token goes only to the API host, so a URL on another origin is refused.
  async function get(url: string): Promise<{ body: unknown; link: string | null }> {
    if (!URL.canParse(url) || new URL(url).origin !== API) fail("request-failed", `${url} is not on ${API}`);
    const response = await request(fetch, url, { headers });
    if (!response.ok) {
      fail("github-http-error", `GET ${url} returned HTTP ${response.status}`, buildLevelStatus(response.status, "github-api"));
    }
    const text = await readText(response, url);
    try {
      return { body: JSON.parse(text), link: response.headers.get("link") };
    } catch (error) {
      // No plugin shapes an API body, so a body that is not JSON, such as an HTML error
      // page, comes from GitHub or a host between.
      fail("request-failed", `GET ${url} returned a body that is not JSON: ${(error as Error).message}`, true);
    }
  }

  // Sends `payload` as JSON. A refused request fails with GitHub's message and the
  // message of each error it lists, such as why a pull request cannot be created. A
  // redirect fails the request, so the payload is not sent to another host.
  async function send(method: "POST" | "PATCH", url: string, payload: unknown): Promise<unknown> {
    if (!URL.canParse(url) || new URL(url).origin !== API) fail("request-failed", `${url} is not on ${API}`);
    let response: Response;
    let text: string;
    try {
      response = await fetch(url, {
        method,
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify(payload),
        redirect: "error",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      text = await response.text();
    } catch (error) {
      fail("request-failed", `${method} ${url} failed: ${(error as Error).message}`);
    }
    let body: { message?: unknown; errors?: { message?: unknown }[] } | undefined;
    try {
      body = JSON.parse(text);
    } catch {
      // Reported below.
    }
    if (!response.ok) {
      const messages = [body?.message, ...(Array.isArray(body?.errors) ? body.errors.map((error) => error?.message) : [])];
      const said = messages.filter((message) => typeof message === "string").join("; ");
      fail("github-http-error", `${method} ${url} returned HTTP ${response.status}${said ? `: ${said}` : ""}`);
    }
    if (body === undefined) fail("request-failed", `${method} ${url} returned a body that is not JSON`);
    return body;
  }

  return {
    get,
    post: (url: string, payload: unknown) => send("POST", url, payload),
    patch: (url: string, payload: unknown) => send("PATCH", url, payload),
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
    fail("request-failed", `GET ${url} failed: ${(error as Error).message}`, true);
  }
}

async function readText(response: Response, url: string): Promise<string> {
  try {
    return await response.text();
  } catch (error) {
    fail("request-failed", `GET ${url} failed while reading the body: ${(error as Error).message}`, true);
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
    fail("request-failed", `GET ${url} failed while reading the body: ${(error as Error).message}`, true);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

// Requests a plugin file that is not on the GitHub API: the XPI or the update.json. `from`
// is github-release when a URL that the download requested, the first or a redirect, is a
// GitHub release URL, for buildLevelStatus.
type Download = (url: string) => Promise<{ response: Response; from: "github-release" | "download" }>;

const REDIRECTS = [301, 302, 303, 307, 308];
const MAX_REDIRECTS = 5;

// Follows redirects itself, at most MAX_REDIRECTS, and checks the host of each URL
// before it requests it. A `signal` that aborts while a redirect's body is canceled
// fails the download as a cut read, since the cancel hides the abort.
function downloader(fetch: Fetch, lookup: Lookup, signal?: AbortSignal): Download {
  return async (url) => {
    if (!URL.canParse(url) || !["http:", "https:"].includes(new URL(url).protocol)) {
      fail("request-failed", `${url} is not an http or https URL`);
    }
    let current = new URL(url);
    let release = false;
    for (let redirects = 0; ; redirects++) {
      const refused = await refusal(current, lookup);
      if (refused) fail(refused.failure, refused.message, refused.buildLevel);
      release ||= isReleaseUrl(current);
      const response = await request(fetch, current.href, { redirect: "manual" });
      if (!REDIRECTS.includes(response.status)) return { response, from: release ? "github-release" : "download" };
      await response.body?.cancel().catch(() => {});
      if (signal?.aborted) {
        const reason = signal.reason instanceof Error ? signal.reason.message : String(signal.reason);
        fail("request-failed", `GET ${current.href} failed: ${reason}`, true);
      }
      if (redirects === MAX_REDIRECTS) fail("request-failed", `GET ${url} took more than ${MAX_REDIRECTS} redirects`);
      const location = response.headers.get("location");
      if (location === null || !URL.canParse(location, current)) {
        fail("request-failed", `GET ${current.href} returned HTTP ${response.status} with no usable Location`);
      }
      const next = new URL(location, current);
      if (!["http:", "https:"].includes(next.protocol)) {
        fail("request-failed", `GET ${current.href} redirects to ${next.href}, which is not an http or https URL`);
      }
      current = next;
    }
  };
}

// Downloads one XPI with the reads' host check and redirect rules, and returns its bytes.
// It throws a ReadFailure: xpi-unreadable for an HTTP error answer, xpi-too-large past
// XPI_MAX_BYTES, and the reads' failures for a refused host or a failed request, which
// include the abort of `signal`. `pnpm start-tests` downloads the XPI that the build read
// with it.
export async function downloadXpi(
  url: string,
  fetch: Fetch,
  { lookup = systemLookup, signal }: { lookup?: Lookup; signal?: AbortSignal } = {},
): Promise<Uint8Array> {
  if (signal) {
    fetch = boundFetch(fetch, signal);
    lookup = boundLookup(lookup, signal);
  }
  const { response } = await downloader(fetch, lookup, signal)(url);
  if (!response.ok) fail("xpi-unreadable", `the XPI at ${url} returned HTTP ${response.status}`);
  return readCapped(response, url, XPI_MAX_BYTES, () => fail("xpi-too-large", `the XPI at ${url} is larger than ${XPI_MAX_BYTES} bytes`));
}

// The bytes of the XPI's manifest.json, or undefined when it holds none. It fails when the
// zip claims more entries than its bytes can hold, holds more than one manifest.json, or
// holds one over UNZIPPED_MAX_BYTES or one that inflates past its declared size.
// `pnpm start-test` reads the plugin id with it too.
export function xpiManifestBytes(zip: Uint8Array, tag: string): Uint8Array | undefined {
  const count = zipEntryCount(zip);
  if (count !== undefined && count * CENTRAL_HEADER_MIN_BYTES > zip.length) {
    fail("xpi-unreadable", `the XPI of ${tag} claims ${count} entries, more than its ${zip.length} bytes can hold`);
  }
  return unzipOne(zip, "manifest.json", tag);
}

async function readManifest(
  download: Download,
  url: string,
  tag: string,
): Promise<{ manifest: ManifestJson; messages: LocaleMessages; languages: string[]; sha256: string }> {
  const { response, from } = await download(url);
  if (!response.ok) {
    fail("xpi-unreadable", `the XPI of ${tag} at ${url} returned HTTP ${response.status}`, buildLevelStatus(response.status, from));
  }
  const zip = await readCapped(response, url, XPI_MAX_BYTES, () =>
    fail("xpi-too-large", `the XPI of ${tag} at ${url} is larger than ${XPI_MAX_BYTES} bytes`),
  );
  const bytes = xpiManifestBytes(zip, tag);
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
    // A messages.json that is not JSON leaves the placeholders unresolved.
  }
  const isObject = typeof messages === "object" && messages !== null;
  const english = ENGLISH_LOCALES.flatMap((folder) => englishMessages(zip, folder, tag));
  let languages: string[];
  try {
    languages = localeLanguages(zip);
  } catch (error) {
    fail("xpi-unreadable", `the XPI of ${tag} is not a readable zip: ${(error as Error).message}`);
  }
  const sha256 = createHash("sha256").update(zip).digest("hex");
  return {
    manifest: manifest as ManifestJson,
    messages: { english, default: isObject ? (messages as Messages) : {} },
    languages,
    sha256,
  };
}

// The messages of one English folder's messages.json, as a list of one, or an empty list when
// the XPI has none, when the reader refuses the file (its size limits among other reasons), or
// when the file is not a JSON object. Unlike the default locale's file, a refused English file
// does not fail the read.
function englishMessages(zip: Uint8Array, folder: string, tag: string): Messages[] {
  let parsed: unknown;
  try {
    const bytes = unzipOne(zip, `_locales/${folder}/messages.json`, tag);
    parsed = bytes && JSON.parse(strFromU8(bytes));
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ReadFailure) return [];
    throw error;
  }
  return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? [parsed as Messages] : [];
}

// One language tag: a language of 2 or 3 letters other than "und" (undetermined), "zxx" (no
// linguistic content), and "mul" (multiple languages) in any letter case, then an optional
// script, region, and variant. None of the three names one interface language (D-018). Both
// schemas copy it into their languages patterns, and a test checks that the copies match.
export const LANGUAGE_TAG =
  "(?!([Uu][Nn][Dd]|[Zz][Xx][Xx]|[Mm][Uu][Ll])(?![A-Za-z0-9]))[A-Za-z]{2,3}(-[A-Za-z]{4})?(-([A-Za-z]{2}|[0-9]{3}))?(-([A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3}))?";
const WHOLE_TAG = new RegExp(`^${LANGUAGE_TAG}$`, "u");
const LOCALE_FOLDER = /^(?:chrome\/)?locale\/([^/]+)\/./;
const LANGUAGE_NAMES = new Intl.DisplayNames(["en"], { type: "language", fallback: "none" });

// The locale total past which localeLanguages inflates no further file of one XPI, counted for
// each file as the largest of its declared size, its compressed size, and its output. One
// file can take the total about 1 MiB past it.
// The locale files of the listed plugins took at most 562,599 bytes (observed 2026-10-27).
export const LOCALE_MAX_BYTES = 8 * 1024 * 1024;
// localeLanguages inflates 1 KiB of input at a time, so deflate's limit of about 1032 bytes
// of output for each byte of input keeps one push to about 1 MiB of output.
const LOCALE_INFLATE_CHUNK_BYTES = 1024;

// The language tags of the locale folders in the zip, the <tag> of an entry name
// locale/<tag>/<file> or chrome/locale/<tag>/<file>. A "_" in <tag> reads as "-". A <tag>
// that is not LANGUAGE_TAG, such as zxx or mul, is left out before any of its files counts,
// and so is one whose language subtag has no English name in the Node.js Intl data, such as
// img or js; its script, region, and variant are not checked. A tag's count is the sum of
// the messages in the files of its folders (see MESSAGE_COUNTERS). A tag is kept when its
// count is at least 1 and twice its count is at least the largest count among the zip's
// tags, so a translation with under half the messages of the fullest one is left out. Each
// tag is in the form Intl.getCanonicalLocales returns, once, in code-unit order.
// It reads the zip one header at a time, in one walk, and inflates each file from the header
// it is on, so it keeps no list of the zip's entries. A tag is kept whatever its count when
// one of its files is of another type, which it does not inflate, or is a file it does not
// inflate: one whose declared or compressed size is over UNZIPPED_MAX_BYTES, whose
// compression is neither stored nor deflate, or whose larger size would take the total past
// LOCALE_MAX_BYTES. So is a tag with a file whose inflate fails or whose output length
// differs from its declared size, so no locale file fails the read. Such a file adds nothing
// to any count. A file whose output passes its declared size adds that output to the total,
// so files that each declare a small size cannot make it inflate more than about 1 MiB past
// LOCALE_MAX_BYTES.
function localeLanguages(zip: Uint8Array): string[] {
  const counts = new Map<string, number>();
  // The tags kept whatever their count.
  const kept = new Set<string>();
  let inflated = 0;
  for (const { fileName: name, header, zip64 } of centralEntries(zip)) {
    const folder = LOCALE_FOLDER.exec(name)?.[1].replaceAll("_", "-");
    if (!folder || name.endsWith("/") || !WHOLE_TAG.test(folder)) continue;
    let tag: string;
    try {
      tag = Intl.getCanonicalLocales(folder)[0];
      if (!LANGUAGE_NAMES.of(new Intl.Locale(tag).language)) continue;
    } catch {
      // A tag that Intl rejects is left out like any other folder that is not a tag.
      continue;
    }
    const count = counts.get(tag) ?? 0;
    counts.set(tag, count);
    const counter = MESSAGE_COUNTERS.get(/\.([^./]*)$/.exec(name)?.[1].toLowerCase() ?? "");
    if (!counter) {
      kept.add(tag);
      continue;
    }
    try {
      const entry = entryAt(zip, header, zip64);
      const bytes = Math.max(entry.size, entry.originalSize);
      if (bytes > UNZIPPED_MAX_BYTES || ![0, 8].includes(entry.compression) || inflated + bytes > LOCALE_MAX_BYTES) {
        kept.add(tag);
        continue;
      }
      let output = 0;
      try {
        const data = inflateEntry(
          zip,
          entry,
          () => {
            throw new Error("inflates past its declared size");
          },
          LOCALE_INFLATE_CHUNK_BYTES,
          (length) => (output += length),
        );
        if (data.length !== entry.originalSize) kept.add(tag);
        else counts.set(tag, count + counter(strFromU8(data)));
      } finally {
        inflated += Math.max(bytes, output);
      }
    } catch {
      kept.add(tag);
    }
  }
  let largest = 0;
  for (const count of counts.values()) largest = Math.max(largest, count);
  return [...counts]
    .filter(([tag, count]) => kept.has(tag) || (count >= 1 && 2 * count >= largest))
    .map(([tag]) => tag)
    .sort();
}

const FLUENT_ENTRY = /^-?[A-Za-z][A-Za-z0-9_-]*[ \t]*=/gm;

// The number of messages in the text of a locale file, by the file's extension, whose letter
// case does not count. The text comes from strFromU8, whose TextDecoder drops a byte-order
// mark at its start. An .ftl file counts each line
// that starts with a Fluent identifier, an optional leading -, then spaces or tabs and =, as
// a message or term line does; a .properties file each line whose first character other
// than space, tab, or form feed is not # or !, and a .dtd file each <!ENTITY outside
// comments, where a comment with no --> runs to the end of the file.
const MESSAGE_COUNTERS = new Map<string, (text: string) => number>([
  ["ftl", (text) => text.match(FLUENT_ENTRY)?.length ?? 0],
  ["properties", (text) => text.split(/\r\n|\r|\n/).filter((line) => !["#", "!", undefined].includes(/[^ \t\f]/.exec(line)?.[0])).length],
  ["dtd", (text) => text.replace(/<!--[\s\S]*?(?:-->|$)/g, "").split("<!ENTITY").length - 1],
]);

// The smallest central-directory header: its fixed part, with no name, extra field, or comment.
const CENTRAL_HEADER_MIN_BYTES = 46;

// Little-endian reads that, like fflate, read bytes past the end of the zip as 0.
const u16 = (zip: Uint8Array, i: number) => (zip[i] ?? 0) | ((zip[i + 1] ?? 0) << 8);
const u32 = (zip: Uint8Array, i: number) => (u16(zip, i) | (u16(zip, i + 2) << 16)) >>> 0;
const u64 = (zip: Uint8Array, i: number) => u32(zip, i) + u32(zip, i + 4) * 2 ** 32;

// Finds the central directory the way fflate 0.8.3's unzipSync does
// (node_modules/fflate/esm/index.mjs:2670), from the end record and the zip64 end record,
// or returns undefined when it finds no end record.
function centralDirectory(zip: Uint8Array): { count: number; offset: number; zip64: boolean } | undefined {
  let end = zip.length - 22;
  while (u32(zip, end) !== 0x06054b50) {
    if (!end || zip.length - end > 65558) return undefined;
    end--;
  }
  const count = u16(zip, end + 8);
  if (!count) return { count: 0, offset: 0, zip64: false };
  if (u32(zip, end - 20) === 0x07064b50) {
    const record = u32(zip, end - 12);
    if (u32(zip, record) === 0x06064b50) return { count: u32(zip, record + 32), offset: u32(zip, record + 48), zip64: true };
  }
  return { count, offset: u32(zip, end + 16), zip64: false };
}

// Returns the entry count that bounds the loop over the central directory in centralEntries,
// or undefined when it finds no end record. The loop reads one header for each entry the
// count claims, so readManifest refuses a count that the zip's bytes cannot hold.
export function zipEntryCount(zip: Uint8Array): number | undefined {
  return centralDirectory(zip)?.count;
}

// The compressed size, unzipped size, and local header offset of a central-directory
// header, with the zip64 extra field read as fflate 0.8.3 reads it.
function zip64Sizes(zip: Uint8Array, header: number, zip64: boolean): [number, number, number] {
  const sizes = [u32(zip, header + 20), u32(zip, header + 24), u32(zip, header + 42)];
  const [size, originalSize, offset] = sizes.map((value) => value === 0xffffffff);
  if (!zip64 || !(size || originalSize || offset)) return sizes as [number, number, number];
  const extra = header + 46 + u16(zip, header + 28);
  const extraEnd = extra + u16(zip, header + 30);
  for (let field = extra; field + 4 < extraEnd; field += 4 + u16(zip, field + 2)) {
    if (u16(zip, field) !== 1) continue;
    const at = (index: number) => u64(zip, field + 4 + 8 * index);
    return [
      size ? at(+originalSize) : sizes[0],
      originalSize ? at(0) : sizes[1],
      offset ? at(+originalSize + +size) : sizes[2],
    ];
  }
  throw new Error("invalid zip data");
}

interface ZipEntry {
  compression: number;
  size: number;
  originalSize: number;
  // Where the file data starts, after the local header.
  start: number;
}

// Each header of the central directory, with its file name, read the way fflate 0.8.3's
// unzipSync reads them.
function* centralEntries(zip: Uint8Array): Generator<{ fileName: string; header: number; zip64: boolean }> {
  const directory = centralDirectory(zip);
  if (!directory) throw new Error("invalid zip data");
  for (let i = 0, header = directory.offset; i < directory.count; i++) {
    const nameEnd = header + 46 + u16(zip, header + 28);
    const fileName = strFromU8(zip.subarray(header + 46, nameEnd), !(u16(zip, header + 8) & 2048));
    yield { fileName, header, zip64: directory.zip64 };
    header = nameEnd + u16(zip, header + 30) + u16(zip, header + 32);
  }
}

// Finds the one entry `name` in the central directory, or returns undefined when the zip
// lacks it. It fails when the zip holds more than one entry named `name`, or when its
// declared or compressed size is over the cap.
function zipEntry(zip: Uint8Array, name: string, tag: string): ZipEntry | undefined {
  let entry: ZipEntry | undefined;
  for (const { fileName, header, zip64 } of centralEntries(zip)) {
    const found = entryAt(zip, header, zip64);
    if (fileName === name) {
      if (entry) fail("xpi-unreadable", `the XPI of ${tag} holds more than one ${name}`);
      if (found.originalSize > UNZIPPED_MAX_BYTES || found.size > UNZIPPED_MAX_BYTES) {
        fail("manifest-too-large", `${name} in the XPI of ${tag} is larger than ${UNZIPPED_MAX_BYTES} bytes`);
      }
      entry = found;
    }
  }
  return entry;
}

// The entry whose central-directory header starts at `header`.
function entryAt(zip: Uint8Array, header: number, zip64: boolean): ZipEntry {
  const [size, originalSize, offset] = zip64Sizes(zip, header, zip64);
  const start = offset + 30 + u16(zip, offset + 26) + u16(zip, offset + 28);
  return { compression: u16(zip, header + 10), size, originalSize, start };
}

const INFLATE_CHUNK_BYTES = 16 * 1024;

// Unzips the one file `name`, or returns undefined when the zip lacks it.
function unzipOne(zip: Uint8Array, name: string, tag: string): Uint8Array | undefined {
  try {
    const entry = zipEntry(zip, name, tag);
    if (!entry) return undefined;
    return inflateEntry(zip, entry, (declared) =>
      fail("xpi-unreadable", `${name} in the XPI of ${tag} inflates past the ${declared} bytes its zip declares`),
    );
  } catch (error) {
    if (error instanceof ReadFailure) throw error;
    fail("xpi-unreadable", `the XPI of ${tag} is not a readable zip: ${(error as Error).message}`);
  }
}

// Unzips one entry. fflate 0.8.3's unzipSync decodes the whole stream of a deflated file,
// however far its output runs past the size the central directory declares (observed
// 2026-10-25), so this inflates the file `chunkBytes` of input at a time and calls
// `overflow` with the declared size once the output passes it. It hands `onOutput` the
// length of each piece of output first, the piece that passes the size included. It returns
// a stored file at its compressed size, as unzipSync does, and throws on any other
// compression.
function inflateEntry(
  zip: Uint8Array,
  entry: ZipEntry,
  overflow: (declared: number) => never,
  chunkBytes = INFLATE_CHUNK_BYTES,
  onOutput?: (length: number) => void,
): Uint8Array {
  const data = zip.subarray(entry.start, entry.start + entry.size);
  if (entry.compression === 0) return data.slice();
  if (entry.compression !== 8) throw new Error(`unknown compression type ${entry.compression}`);
  const out = new Uint8Array(entry.originalSize);
  let length = 0;
  const inflate = new Inflate((chunk) => {
    onOutput?.(chunk.length);
    if (length + chunk.length > out.length) overflow(out.length);
    out.set(chunk, length);
    length += chunk.length;
  });
  let at = 0;
  do {
    inflate.push(data.subarray(at, at + chunkBytes), at + chunkBytes >= data.length);
    at += chunkBytes;
  } while (at < data.length);
  return out.subarray(0, length);
}

async function checkUpdateJson(download: Download, url: string, id: string): Promise<void> {
  const { response, from } = await download(url);
  if (!response.ok) {
    const buildLevel = buildLevelStatus(response.status, from);
    fail("update-json-http-error", `the update.json at ${url} returned HTTP ${response.status}`, buildLevel);
  }
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
