import pluginsSchema from "../../schemas/plugins.v1.schema.json" with { type: "json" };
import { compareVersions, LAST_RELEASES, ZOTERO_MAJORS } from "../site/version.ts";
import type { Fetch } from "../upstream/reader.ts";
import { withinLimit } from "../upstream/time-limit.ts";

// The address that answers with the current Zotero release for each platform, as a JSON
// object keyed by platform, such as "linux-x86_64" (observed 2026-10-30).
export const ZOTERO_RELEASE_URL = "https://www.zotero.org/download/client/version?channel=release";

// The longest the read of the current Zotero release may take.
export const ZOTERO_RELEASE_LIMIT_MS = 30 * 1000;

// A release version such as 10.0.7: numbers joined by dots, so a beta such as 10.0.7-beta
// does not match. It is the schema's zoteroRelease pattern, so a value read here always passes
// the output check.
const RELEASE_PATTERN = new RegExp(pluginsSchema.properties.zoteroRelease.pattern);

// A release version that a read found, or the cause of its failure.
export type ReleaseRead = { ok: true; version: string } | { ok: false; message: string };

// Reads the current Zotero release, the answer's linux-x86_64 value. The request sends no
// token, since zotero.org is not GitHub. A read that fails gives the cause instead.
export async function readZoteroRelease(fetch: Fetch, ms = ZOTERO_RELEASE_LIMIT_MS): Promise<ReleaseRead> {
  try {
    return await withinLimit(ms, async (signal) => {
      const response = await fetch(ZOTERO_RELEASE_URL, { signal });
      if (!response.ok) return { ok: false, message: `GET ${ZOTERO_RELEASE_URL} returned HTTP ${response.status}` };
      // A body read that fails, or that the time limit cuts, rejects here and goes to the outer
      // catch with its own cause.
      const text = await response.text();
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        return { ok: false, message: `GET ${ZOTERO_RELEASE_URL} returned a body that is not JSON` };
      }
      const version = (body as { "linux-x86_64"?: unknown } | null)?.["linux-x86_64"];
      if (version === undefined) return { ok: false, message: `GET ${ZOTERO_RELEASE_URL} returned no linux-x86_64 value` };
      if (typeof version !== "string" || !RELEASE_PATTERN.test(version)) {
        return { ok: false, message: `GET ${ZOTERO_RELEASE_URL} returned the linux-x86_64 value ${JSON.stringify(version)}, which is not a release version` };
      }
      return { ok: true, version };
    });
  } catch (error) {
    return { ok: false, message: `GET ${ZOTERO_RELEASE_URL} failed: ${(error as Error).message}` };
  }
}

// The zotero.org changelog page of Zotero major N, which lists its releases newest first under
// "Changes in" headings (cairn/references/zotero-changelogs.md).
export function changelogUrl(major: string): string {
  return `https://www.zotero.org/support/${major}.0_changelog`;
}

// Reads the newest release on the changelog page of Zotero major N: the version in its first
// heading that starts with "Changes in N.". The page's first paragraph also starts with
// "Changes in", so the match takes only a heading. The request sends no token. A read that
// fails gives the cause instead.
export async function readChangelogRelease(fetch: Fetch, major: string, ms = ZOTERO_RELEASE_LIMIT_MS): Promise<ReleaseRead> {
  const url = changelogUrl(major);
  try {
    return await withinLimit(ms, async (signal) => {
      const response = await fetch(url, { signal });
      if (!response.ok) return { ok: false, message: `GET ${url} returned HTTP ${response.status}` };
      const text = await response.text();
      const heading = new RegExp(`<h[1-6][^>]*>\\s*Changes in (${major}\\.[0-9]+(?:\\.[0-9]+)*)`).exec(text);
      if (!heading) return { ok: false, message: `GET ${url} returned a page with no "Changes in ${major}." heading` };
      return { ok: true, version: heading[1] };
    });
  } catch (error) {
    return { ok: false, message: `GET ${url} failed: ${(error as Error).message}` };
  }
}

// The warnings for the hand-kept lists in src/site/version.ts, which a release of Zotero leaves
// behind until someone edits them: one when the current release is not from the last major of
// ZOTERO_MAJORS, then one for each changelog read, in the order of `changelogs`, that failed or
// that names a newer release than LAST_RELEASES holds for its major.
export function releaseListWarnings(zoteroRelease: string | undefined, changelogs: [string, ReleaseRead][]): string[] {
  const warnings: string[] = [];
  const last = ZOTERO_MAJORS.at(-1);
  if (zoteroRelease !== undefined && zoteroRelease.split(".")[0] !== last) {
    warnings.push(`Zotero ${zoteroRelease} is the current release, but the last Zotero version in ZOTERO_MAJORS in src/site/version.ts is ${last}`);
  }
  for (const [major, read] of changelogs) {
    const listed = LAST_RELEASES[major];
    if (!read.ok) warnings.push(`cannot read the Zotero ${major} changelog: ${read.message}`);
    else if (listed !== undefined && compareVersions(read.version, listed) > 0) {
      warnings.push(`the Zotero ${major} changelog names ${read.version}, newer than ${listed} in LAST_RELEASES in src/site/version.ts`);
    }
  }
  return warnings;
}
