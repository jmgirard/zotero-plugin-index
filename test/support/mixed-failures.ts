import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Responses } from "./fixture-fetch.ts";
import { pluginRepo } from "./plugin-repo.ts";

// The host whose lookup fails. The build test's DNS stub rejects it.
export const DNS_FAIL_HOST = "dns-fail.example";

const api = (name: string) => `https://api.github.com/repos/example/${name}`;
const xpi = (name: string) => `https://github.com/example/${name}/releases/download/v1.0.0/plugin.xpi`;
const update = (name: string) => `https://raw.githubusercontent.com/example/${name}/main/update.json`;

// One entry for each way of failing that the build-level rule sorts, and one that reads.
// Each case edits the responses of a plugin that would otherwise pass.
const CASES: Record<string, (r: Responses, name: string) => void> = {
  "api-reject": (r, n) => (r[api(n)] = { error: "connect ECONNRESET" }),
  "xpi-reject": (r, n) => (r[xpi(n)] = { error: "connect ECONNRESET" }),
  "dns-fail": (r, n) => {
    const releases = r[`${api(n)}/releases?per_page=100`].json as { assets: { browser_download_url: string }[] }[];
    releases[0].assets[0].browser_download_url = `https://${DNS_FAIL_HOST}/plugin.xpi`;
  },
  "api-body-error": (r, n) => (r[api(n)] = { bodyError: "terminated" }),
  unexpected: (r, n) => (r[api(n)] = { unexpected: "planted reader error" }),
  "api-403": (r, n) => (r[api(n)] = { status: 403, json: { message: "API rate limit exceeded" } }),
  "update-503": (r, n) => (r[update(n)] = { status: 503, text: "Service Unavailable" }),
  "api-404": (r, n) => delete r[api(n)],
  fork: (r, n) => ((r[api(n)].json as { fork: boolean }).fork = true),
  "xpi-404": (r, n) => (r[xpi(n)] = { status: 404, text: "Not Found" }),
  "redirect-loop": (r, n) => (r[xpi(n)] = { status: 302, headers: { location: xpi(n) } }),
  passing: () => {},
};

// Writes one entry `<case>@example.org` for each case under `root` and returns the
// responses for all of them.
export function mixedFailures(root: string): Responses {
  const responses: Responses = {};
  for (const [name, edit] of Object.entries(CASES)) {
    const id = `${name}@example.org`;
    const recorded = pluginRepo(`example/${name}`, id);
    edit(recorded, name);
    Object.assign(responses, recorded);
    mkdirSync(join(root, id), { recursive: true });
    writeFileSync(
      join(root, id, "meta.json"),
      JSON.stringify({ id, name, repoUrl: `https://github.com/example/${name}`, updateUrl: update(name) }),
    );
    writeFileSync(join(root, id, "index.json"), JSON.stringify({ schemaVersion: 1 }));
  }
  return responses;
}
