import { readFileSync } from "node:fs";
import type { Override, PluginRecord, PluginsFile } from "../../src/build/build.ts";
import { shownDescription } from "../../src/site/description.ts";
import { appliedLanguages, languageName } from "../../src/site/languages.ts";
import { appliedValue, declaredRange, usedOverride } from "../../src/site/version.ts";
import { BASE } from "./base.ts";

export { BASE, declaredRange, shownDescription };
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

// The names of the languages after overrides, in list order, or "None declared".
export function languagesText(record: PluginRecord): string {
  const tags = appliedLanguages(record);
  return tags.length > 0 ? tags.map(languageName).join(", ") : "None declared";
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
    languages: upstream.languages?.length ? upstream.languages.join(", ") : undefined,
  };
  return fields[field];
}

// Whether this override is the one that applies to its field, for the version the index
// read (see usedOverride).
export function overrideUsed(record: PluginRecord, override: Override): boolean {
  return usedOverride(record, override.field) === override;
}

// The index repo's page for a new issue, where the report forms live.
const NEW_ISSUE = "https://github.com/jmgirard/zotero-plugin-index/issues/new";

// The new-issue page with the works.yml or broken.yml form, its plugin and version fields
// filled in with the record's id and the version the index read.
export function reportHref(record: PluginRecord, verdict: "works" | "broken"): string {
  const fields = [`template=${verdict}.yml`, `plugin=${encodeURIComponent(record.id)}`];
  if (record.upstream) fields.push(`version=${encodeURIComponent(record.upstream.version)}`);
  return `${NEW_ISSUE}?${fields.join("&")}`;
}

// Only an http or https URL becomes a link; repoUrl in meta.json is any string.
export function safeHref(url: string): string | undefined {
  return /^https?:\/\//i.test(url) ? url : undefined;
}

export function day(timestamp: string): string {
  return timestamp.slice(0, 10);
}
