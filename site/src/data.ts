import { readFileSync } from "node:fs";
import type { Override, PluginRecord, PluginsFile } from "../../src/build/build.ts";
import { appliedValue, declaredRange, usedOverride } from "../../src/site/version.ts";
import { BASE } from "./base.ts";

export { BASE };
export type { Override, PluginRecord };

let loaded: { path: string; data: PluginsFile } | undefined;

// pnpm site sets ZPI_SITE_DATA to the data file it builds the pages from. Every page
// calls this, so the file is parsed once per path.
export function loadData(): PluginsFile {
  const path = process.env.ZPI_SITE_DATA;
  if (!path) throw new Error("ZPI_SITE_DATA is not set; build the site with pnpm site");
  if (loaded?.path === path) return loaded.data;
  const data = JSON.parse(readFileSync(path, "utf8")) as PluginsFile;
  if (!Array.isArray(data?.plugins)) throw new Error(`${path} has no plugins list`);
  loaded = { path, data };
  return data;
}

export function pluginHref(id: string): string {
  return `${BASE}plugins/${encodeURIComponent(id)}/`;
}

// The name after overrides, or the id when neither the manifest nor an override gives one.
export function displayName(record: PluginRecord): string {
  return appliedValue(record, "name", record.upstream?.name) ?? record.id;
}

export function rangeText(record: PluginRecord): string {
  const { min, max } = declaredRange(record);
  if (min !== undefined && max !== undefined) return `Zotero ${min} to ${max}`;
  if (min !== undefined) return `Zotero ${min} or newer`;
  if (max !== undefined) return `Zotero ${max} or older`;
  return "No declared range";
}

// The upstream value an override corrects, under the override's field name.
export function upstreamValue(record: PluginRecord, field: string): string | undefined {
  const upstream = record.upstream;
  if (!upstream) return undefined;
  const fields: Record<string, string | undefined> = {
    name: upstream.name,
    description: upstream.description,
    homepage: upstream.homepage,
    strict_min_version: upstream.strictMinVersion,
    strict_max_version: upstream.strictMaxVersion,
  };
  return fields[field];
}

// Whether this override is the one that applies to its field, for the version the index
// read (see usedOverride).
export function overrideUsed(record: PluginRecord, override: Override): boolean {
  return usedOverride(record, override.field) === override;
}

// Only an http or https URL becomes a link; repoUrl in meta.json is any string.
export function safeHref(url: string): string | undefined {
  return /^https?:\/\//i.test(url) ? url : undefined;
}

// The fields the browser script needs to compute a record's range result: the upstream
// version and bounds, the failure, and the overrides of the two bounds.
export function rangeFields(record: PluginRecord): string {
  const { upstream, failure, overrides } = record;
  return JSON.stringify({
    upstream: upstream && {
      version: upstream.version,
      strictMinVersion: upstream.strictMinVersion,
      strictMaxVersion: upstream.strictMaxVersion,
    },
    failure: failure && { name: failure.name },
    overrides: overrides
      .filter((o) => o.field === "strict_min_version" || o.field === "strict_max_version")
      .map(({ field, version, value }) => ({ field, version, value })),
  });
}

export function day(timestamp: string): string {
  return timestamp.slice(0, 10);
}
