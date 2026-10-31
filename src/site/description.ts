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

const NON_LATIN_LETTER = /[\p{L}--\p{Script=Latin}]/v;
const WORD = /[\p{L}\p{M}\p{N}]+/gu;

// For a text half or more CJK, its pieces cut at " / " and after "。" whose letters are all
// Latin and that hold at least three words, joined with one space, when they are not only the
// name. Otherwise the text itself, so a list of short terms or a name keeps the whole text.
function latinPart(text: string | undefined, name: Set<string>): string | undefined {
  if (text === undefined || cjkShare(text) < 0.5) return text;
  const pieces = text
    .split(/ \/ |(?<=。)/u)
    .map((piece) => piece.trim())
    .filter((piece) => !NON_LATIN_LETTER.test(piece) && (piece.match(WORD)?.length ?? 0) >= 3);
  return informative(pieces.join(" "), name) ?? text;
}

// The description override when one applies. Otherwise the manifest description when it is
// informative and under half CJK; else the GitHub description when it is informative and the
// manifest one is not, or has a higher CJK share; else the informative manifest description.
// Each upstream text takes its Latin-script part first.
export function shownDescription(record: DescriptionRecord): string | undefined {
  const override = appliedValue(record, "description", undefined);
  if (override !== undefined) return override;
  const name = words(appliedValue(record, "name", record.upstream?.name) ?? record.id);
  const manifest = informative(latinPart(record.upstream?.description, name), name);
  const github = informative(latinPart(record.upstream?.repoDescription, name), name);
  if (manifest !== undefined && cjkShare(manifest) < 0.5) return manifest;
  if (github !== undefined && (manifest === undefined || cjkShare(github) < cjkShare(manifest))) return github;
  return manifest;
}
