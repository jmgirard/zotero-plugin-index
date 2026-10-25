import { readFileSync } from "node:fs";
import type { PluginRecord, PluginsFile } from "../../src/build/build.ts";
import { BASE } from "./base.ts";

export { BASE };
export type { PluginRecord };

// pnpm site sets ZPI_SITE_DATA to the data file it builds the pages from.
export function loadData(): PluginsFile {
  const path = process.env.ZPI_SITE_DATA;
  if (!path) throw new Error("ZPI_SITE_DATA is not set; build the site with pnpm site");
  return JSON.parse(readFileSync(path, "utf8")) as PluginsFile;
}

export function pluginHref(id: string): string {
  return `${BASE}plugins/${encodeURIComponent(id)}/`;
}

// The fields the browser script needs to compute a record's range result.
export function rangeFields(record: PluginRecord): string {
  const { upstream, failure, overrides } = record;
  return JSON.stringify({
    upstream: upstream && {
      version: upstream.version,
      strictMinVersion: upstream.strictMinVersion,
      strictMaxVersion: upstream.strictMaxVersion,
    },
    failure,
    overrides,
  });
}

export function day(timestamp: string): string {
  return timestamp.slice(0, 10);
}
