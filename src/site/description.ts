// The description the site shows for a plugin.
import { appliedValue, type RangeRecord } from "./version.ts";

// The fields of a published record that the description reads.
export interface DescriptionRecord {
  id: string;
  upstream?: { version: string; name?: string; description?: string };
  failure?: unknown;
  overrides: RangeRecord["overrides"];
}

// Words that say nothing about what a plugin does, left out before the name comparison.
const FILLER = new Set(["zotero", "plugin", "addon", "add", "on", "extension", "for", "a", "an", "the"]);

// NFC first, so a name and a description that spell the same accented word in different
// Unicode forms give the same word; combining marks stay inside their word.
function words(text: string): Set<string> {
  const runs = text.normalize("NFC").toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
  return new Set(runs.filter((word) => !FILLER.has(word)));
}

// The description override when one applies. Otherwise the upstream description, unless it
// is missing, blank, or only repeats the name: every word it has, filler left out, is a
// word of the name shown on the site.
export function shownDescription(record: DescriptionRecord): string | undefined {
  const override = appliedValue(record, "description", undefined);
  if (override !== undefined) return override;
  const description = record.upstream?.description;
  if (description === undefined || description.trim() === "") return undefined;
  const name = words(appliedValue(record, "name", record.upstream?.name) ?? record.id);
  return [...words(description)].every((word) => name.has(word)) ? undefined : description;
}
