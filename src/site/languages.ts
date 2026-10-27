// Interface languages for the site's templates: the list a record applies, the names the
// pages show, and the options of the home page's language menu.
import { usedOverride, type RangeRecord } from "./version.ts";

// The fields of a published record that the languages read.
export type LanguageRecord = RangeRecord & { upstream?: { languages?: string[] } };

const NAMES = new Intl.DisplayNames(["en"], { type: "language", languageDisplay: "standard" });

// The languages after overrides: the value of the languages override that applies (see
// usedOverride), split on ", ", or else the upstream list. Each tag is in the form
// Intl.getCanonicalLocales returns, once, in list order. Empty for a record with no
// upstream block, or with no languages field and no languages override that applies.
export function appliedLanguages(record: LanguageRecord): string[] {
  if (!record.upstream) return [];
  const override = usedOverride(record, "languages");
  return Intl.getCanonicalLocales(override ? override.value.split(", ") : (record.upstream.languages ?? []));
}

// The English name of a language tag, such as "Chinese (Taiwan)" for zh-TW.
export function languageName(tag: string): string {
  return NAMES.of(tag) ?? tag;
}

function subtags(record: LanguageRecord): string[] {
  return [...new Set(appliedLanguages(record).map((tag) => new Intl.Locale(tag).language))].sort();
}

// The row's data-languages: the language subtag of each applied tag, once, in code-unit
// order, joined by spaces, so zh-CN and zh-TW give "zh".
export function rowLanguages(record: LanguageRecord): string {
  return subtags(record).join(" ");
}

// One menu option for each subtag that some row carries. Its text is the subtag's name and
// the number of rows that carry it, such as "Chinese (2)". The options are in code-unit
// order of their text.
export function languageOptions(records: LanguageRecord[]): { value: string; text: string }[] {
  const counts = new Map<string, number>();
  for (const record of records) for (const subtag of subtags(record)) counts.set(subtag, (counts.get(subtag) ?? 0) + 1);
  return [...counts]
    .map(([value, count]) => ({ value, text: `${languageName(value)} (${count})` }))
    .sort((a, b) => (a.text < b.text ? -1 : a.text > b.text ? 1 : 0));
}
