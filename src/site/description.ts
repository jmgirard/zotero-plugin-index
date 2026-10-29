// The description the site shows for a plugin.
import { appliedValue, type RangeRecord } from "./version.ts";

// The fields of a published record that the description reads.
export interface DescriptionRecord {
  id: string;
  upstream?: { version: string; name?: string; description?: string; repoDescription?: string };
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

// A text unless it is missing, blank, or only repeats the name: every word it has, filler
// left out, is a word of the name shown on the site.
function informative(text: string | undefined, name: Set<string>): string | undefined {
  if (text === undefined || text.trim() === "") return undefined;
  return [...words(text)].every((word) => name.has(word)) ? undefined : text;
}

const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gv;
const OTHER_LETTERS = /[\p{L}--[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]]+/gv;

// The share of a text written in Chinese, Japanese, or Korean: its CJK characters over those
// characters plus its runs of other letters, since one CJK character is closer to a word than
// one Latin letter is. 0 for a text with neither.
export function cjkShare(text: string): number {
  const cjk = text.match(CJK)?.length ?? 0;
  const other = text.match(OTHER_LETTERS)?.length ?? 0;
  return cjk + other === 0 ? 0 : cjk / (cjk + other);
}

// The description override when one applies. Otherwise the manifest description when it is
// informative and under half CJK; else the GitHub description when it is informative and the
// manifest one is not, or has a higher CJK share; else the informative manifest description.
export function shownDescription(record: DescriptionRecord): string | undefined {
  const override = appliedValue(record, "description", undefined);
  if (override !== undefined) return override;
  const name = words(appliedValue(record, "name", record.upstream?.name) ?? record.id);
  const manifest = informative(record.upstream?.description, name);
  const github = informative(record.upstream?.repoDescription, name);
  if (manifest !== undefined && cjkShare(manifest) < 0.5) return manifest;
  if (github !== undefined && (manifest === undefined || cjkShare(github) < cjkShare(manifest))) return github;
  return manifest;
}
