import { readFileSync } from "node:fs";
import type { Override, PluginRecord, PluginsFile, StartTestRecord } from "../../src/build/build.ts";
import { shownDescription } from "../../src/site/description.ts";
import { appliedLanguages, languageName, languageOptions, listedSubtags, rowLanguages } from "../../src/site/languages.ts";
import {
  appliedValue,
  compareVersions,
  declaredRange,
  rowMajors,
  usedOverride,
  ZOTERO_MAJORS,
  type MajorSupport,
} from "../../src/site/version.ts";
import { BASE } from "./base.ts";

export { BASE, declaredRange, languageName, languageOptions, shownDescription };
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

// The records in the home table's order: by display name, ignoring letter case and accents,
// then by id in code-unit order for names that compare equal.
export function homeOrder(records: PluginRecord[]): PluginRecord[] {
  return records.toSorted(
    (a, b) =>
      displayName(a).localeCompare(displayName(b), "en", { sensitivity: "base" }) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

export function rangeText(record: PluginRecord): string {
  const { min, max } = declaredRange(record);
  if (min !== undefined && max !== undefined) return `Zotero ${min} to ${max}`;
  if (min !== undefined) return `Zotero ${min} or newer`;
  if (max !== undefined) return `Zotero ${max} or older`;
  return "No declared range";
}

// The sign for each kind of declared support, on a home table mark and a plugin page's
// compatibility table.
export const SUPPORT_MARKS: Record<MajorSupport, string> = { all: "✓", some: "◐", none: "–" };

// The word for each kind of declared support in a plugin page's compatibility table.
export const SUPPORT_WORDS: Record<MajorSupport, string> = { all: "Yes", some: "Partly", none: "No" };

// The words for one major's declared support, as a mark's title and hidden text say them.
export function supportText(record: PluginRecord, support: MajorSupport, major: string): string {
  if (support === "all") return `Declares all of Zotero ${major}`;
  if (support === "some") return `Declares part of Zotero ${major}. Declared range: ${rangeText(record)}`;
  return `Does not declare Zotero ${major}`;
}

// The names of the languages after overrides, in list order, or "Unknown (no translations
// found)" when none is left. The list is empty when, for example, a plugin writes its text in
// its code and ships no locale folders, so the index cannot tell which language that text is in.
export function languagesText(record: PluginRecord): string {
  const tags = appliedLanguages(record);
  return tags.length > 0 ? tags.map(languageName).join(", ") : "Unknown (no translations found)";
}

// The language subtags a home row shows (see listedSubtags): all of them when there are 3
// or fewer, else the first 2, with the rest under "+N".
export function shortLanguages(record: PluginRecord): { shown: string[]; rest: string[] } {
  const subtags = listedSubtags(record);
  return subtags.length <= 3 ? { shown: subtags, rest: [] } : { shown: subtags.slice(0, 2), rest: subtags.slice(2) };
}

// Astro writes an attribute whose value is "" as its bare name, and checks for "" with ===,
// so an empty value goes out as a String object, which Astro writes as name="".
function attributeValue(value: string): string | String {
  return value === "" ? new String("") : value;
}

// The row's data-languages value (see rowLanguages).
export function rowLanguagesAttribute(record: PluginRecord): string | String {
  return attributeValue(rowLanguages(record));
}

// The row's data-zotero value (see rowMajors).
export function rowMajorsAttribute(record: PluginRecord): string | String {
  return attributeValue(rowMajors(record));
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

// The new-issue page with the add-plugin.yml form, which proposes a plugin for the index.
export const ADD_PLUGIN_HREF = `${NEW_ISSUE}?template=add-plugin.yml`;

// The new-issue page with the works.yml or broken.yml form, its plugin and version fields
// filled in with the record's id and the version the index read.
export function reportHref(record: PluginRecord, verdict: "works" | "broken"): string {
  const fields = [`template=${verdict}.yml`, `plugin=${encodeURIComponent(record.id)}`];
  if (record.upstream) fields.push(`version=${encodeURIComponent(record.upstream.version)}`);
  return `${NEW_ISSUE}?${fields.join("&")}`;
}

// Each start-test result in words.
const START_WORDS: Record<StartTestRecord["result"], string> = {
  started: "started",
  "start-error": "failed at startup",
  "not-installed": "did not install",
  "timed-out": "gave no answer in time",
};

// One start-test result in words, such as "Zotero 8.0.4 failed at startup".
export function startText({ zotero, result }: StartTestRecord): string {
  return `Zotero ${zotero} ${START_WORDS[result]}`;
}

// One start-test result in words that open a table cell, such as "Failed at startup".
export function startWords(result: StartTestRecord["result"]): string {
  const words = START_WORDS[result];
  return words[0]!.toUpperCase() + words.slice(1);
}

// The Zotero majors of a plugin page's compatibility table, newest first: each major of
// ZOTERO_MAJORS and each other major that the record's reports or start results name.
export function compatMajors(record: PluginRecord): string[] {
  const majors = new Set([
    ...ZOTERO_MAJORS,
    ...(record.reports ?? []).map(({ zoteroMajor }) => String(zoteroMajor)),
    ...(record.startTests ?? []).map(({ zotero }) => zotero.split(".")[0]!),
  ]);
  return [...majors].sort((a, b) => Number(b) - Number(a));
}

// The counted reports on Zotero major N, if any count. The build writes one item per major,
// and the schema allows more, so the counts of every item for N are added.
export function majorReport(record: PluginRecord, major: string): { works: number; broken: number } | undefined {
  const items = (record.reports ?? []).filter(({ zoteroMajor }) => String(zoteroMajor) === major);
  if (items.length === 0) return undefined;
  return items.reduce((sum, { works, broken }) => ({ works: sum.works + works, broken: sum.broken + broken }), { works: 0, broken: 0 });
}

// The start-test result for Zotero major N: the result whose Zotero release is N.x, the
// newest release when several are.
export function majorStart(record: PluginRecord, major: string): StartTestRecord | undefined {
  return (record.startTests ?? [])
    .filter(({ zotero }) => zotero.split(".")[0] === major)
    .reduce<StartTestRecord | undefined>((newest, test) => (newest && compareVersions(newest.zotero, test.zotero) >= 0 ? newest : test), undefined);
}

// Only an http or https URL becomes a link; repoUrl in meta.json is any string.
export function safeHref(url: string): string | undefined {
  return /^https?:\/\//i.test(url) ? url : undefined;
}

export function day(timestamp: string): string {
  return timestamp.slice(0, 10);
}

// The month and year of a timestamp in UTC, such as "Sep 2026".
export function monthYear(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString("en", { month: "short", year: "numeric", timeZone: "UTC" });
}
