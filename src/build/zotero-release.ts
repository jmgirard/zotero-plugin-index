import type { Fetch } from "../upstream/reader.ts";
import { withinLimit } from "../upstream/time-limit.ts";

// The address that answers with the current Zotero release for each platform, as JSON.
export const ZOTERO_RELEASE_URL = "https://www.zotero.org/download/client/version?channel=release";

// The longest the read of the current Zotero release may take.
export const ZOTERO_RELEASE_LIMIT_MS = 30 * 1000;

// A release version such as 10.0.7: numbers joined by dots, so a beta such as 10.0.7-beta
// does not match. The schema's zoteroRelease pattern is the same.
const RELEASE_PATTERN = /^[0-9]+(\.[0-9]+)*$/;

// Reads the current Zotero release, the answer's linux-x86_64 value. The request sends no
// token, since zotero.org is not GitHub. A read that fails gives the cause instead.
export async function readZoteroRelease(
  fetch: Fetch,
  ms = ZOTERO_RELEASE_LIMIT_MS,
): Promise<{ ok: true; version: string } | { ok: false; message: string }> {
  try {
    return await withinLimit(ms, async (signal) => {
      const response = await fetch(ZOTERO_RELEASE_URL, { signal });
      if (!response.ok) return { ok: false, message: `GET ${ZOTERO_RELEASE_URL} returned HTTP ${response.status}` };
      let body: unknown;
      try {
        body = JSON.parse(await response.text());
      } catch {
        // A body cut by the time limit rejects text(), so that failure goes to the outer catch.
        if (signal.aborted) throw signal.reason;
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
