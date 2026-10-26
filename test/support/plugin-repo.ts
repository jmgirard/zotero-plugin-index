import type { Responses } from "./fixture-fetch.ts";

// The responses the reader requests for one GitHub repo `owner/repo` whose release XPI
// declares the plugin id `id`. With `noRelease`, the repo has no release, so the read
// fails with no-release.
export function pluginRepo(fullName: string, id: string, { noRelease = false } = {}): Responses {
  const repoUrl = `https://github.com/${fullName}`;
  const xpiUrl = `${repoUrl}/releases/download/v1.0.0/plugin.xpi`;
  const updateUrl = `https://raw.githubusercontent.com/${fullName}/main/update.json`;
  const responses: Responses = {
    [`https://api.github.com/repos/${fullName}`]: {
      json: { full_name: fullName, html_url: repoUrl, fork: false, created_at: "2025-01-10T09:00:00Z", open_issues_count: 0 },
    },
    [`https://api.github.com/repos/${fullName}/releases?per_page=100`]: {
      json: noRelease
        ? []
        : [
            {
              tag_name: "v1.0.0",
              draft: false,
              prerelease: false,
              published_at: "2026-03-01T12:00:00Z",
              assets: [{ name: "plugin.xpi", browser_download_url: xpiUrl }],
            },
          ],
    },
  };
  if (noRelease) return responses;
  responses[xpiUrl] = {
    xpi: {
      "manifest.json": {
        manifest_version: 2,
        name: fullName,
        version: "1.0.0",
        applications: { zotero: { id, update_url: updateUrl, strict_min_version: "7.0", strict_max_version: "8.*" } },
      },
    },
  };
  responses[updateUrl] = { json: { addons: { [id]: { updates: [{ version: "1.0.0" }] } } } };
  return responses;
}

// One page of repository search results, as GitHub returns it, for repos given as
// [full name, pushed_at] pairs.
export function searchPage(repos: [string, string][]) {
  return {
    total_count: repos.length,
    incomplete_results: false,
    items: repos.map(([fullName, pushedAt]) => ({
      full_name: fullName,
      html_url: `https://github.com/${fullName}`,
      pushed_at: pushedAt,
      fork: false,
    })),
  };
}
