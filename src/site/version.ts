// Version ordering and declared ranges for the site's templates. Plain TypeScript with no
// imports.

// One dot-separated part of a version, parsed as <number-a><string-b><number-c><string-d>.
// A string that is absent is null; a present string can be empty (as string-b of "0-beta").
interface VersionPart {
  a: number;
  b: string | null;
  c: number;
  d: string | null;
}

const LEADING_NUMBER = /^[+-]?\d+/;

// Follows Mozilla's version comparator, the format on MDN's "Legacy Version Formats" page
// (cairn/references/mozilla-toolkit-version.md): "*" is an infinitely large number, a
// "+" in string-b adds one to number-a and becomes "pre", and a missing part is 0.
function parsePart(part: string): VersionPart {
  if (part === "*") return { a: Number.POSITIVE_INFINITY, b: null, c: 0, d: null };
  const numberA = LEADING_NUMBER.exec(part);
  const a = numberA ? Number(numberA[0]) : 0;
  const rest = part.slice(numberA ? numberA[0].length : 0);
  if (rest === "") return { a, b: null, c: 0, d: null };
  if (rest.startsWith("+")) return { a: a + 1, b: "pre", c: 0, d: null };
  const numberStart = rest.search(/[0-9+-]/);
  if (numberStart === -1) return { a, b: rest, c: 0, d: null };
  const tail = rest.slice(numberStart);
  const numberC = LEADING_NUMBER.exec(tail);
  const d = tail.slice(numberC ? numberC[0].length : 0);
  return { a, b: rest.slice(0, numberStart), c: numberC ? Number(numberC[0]) : 0, d: d === "" ? null : d };
}

function compareNumbers(x: number, y: number): number {
  return x < y ? -1 : x > y ? 1 : 0;
}

// A string that exists is less than one that does not; two strings compare by code unit.
function compareStrings(x: string | null, y: string | null): number {
  if (x === null) return y === null ? 0 : 1;
  if (y === null) return -1;
  return x < y ? -1 : x > y ? 1 : 0;
}

// Negative, 0, or positive as a is older than, equal to, or newer than b.
export function compareVersions(a: string, b: string): number {
  const partsA = a.split(".");
  const partsB = b.split(".");
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const x = parsePart(partsA[i] ?? "");
    const y = parsePart(partsB[i] ?? "");
    const result =
      compareNumbers(x.a, y.a) || compareStrings(x.b, y.b) || compareNumbers(x.c, y.c) || compareStrings(x.d, y.d);
    if (result !== 0) return result;
  }
  return 0;
}

// The fields of a published record that the range reads.
export interface RangeRecord {
  upstream?: { version: string; strictMinVersion?: string; strictMaxVersion?: string };
  failure?: unknown;
  overrides: { field: string; version?: string; value: string }[];
}

// The override that sets a field, if any. An override applies to a record that was read,
// when it has no version or names the upstream version. The one that names the version
// wins over one with none.
export function usedOverride(record: RangeRecord, field: string): RangeRecord["overrides"][number] | undefined {
  if (!record.upstream) return undefined;
  const applying = record.overrides.filter(
    (o) => o.field === field && (o.version === undefined || o.version === record.upstream?.version),
  );
  return applying.find((o) => o.version !== undefined) ?? applying[0];
}

// The value of a field after overrides.
export function appliedValue(record: RangeRecord, field: string, upstream: string | undefined): string | undefined {
  return usedOverride(record, field)?.value ?? upstream;
}

// The declared range after overrides. Undefined bounds are missing; a record with a
// failure has no range.
export function declaredRange(record: RangeRecord): { min?: string; max?: string } {
  if (record.failure !== undefined || !record.upstream) return {};
  return {
    min: appliedValue(record, "strict_min_version", record.upstream.strictMinVersion),
    max: appliedValue(record, "strict_max_version", record.upstream.strictMaxVersion),
  };
}

// The Zotero major versions that get a mark column on the home table and a row in each plugin
// page's compatibility table. Add a major when Zotero ships it.
export const ZOTERO_MAJORS = ["7", "8", "9", "10"];

export type MajorSupport = "all" | "some" | "none";

// The newest release of each Zotero major before the current one, from the "Changes in"
// headings of https://www.zotero.org/support/<N>.0_changelog on 2026-10-30. Add the
// current major here when Zotero ships the next one.
export const LAST_RELEASES: Record<string, string> = { "7": "7.0.32", "8": "8.0.5", "9": "9.0.6" };

// The newest release of Zotero major N: `zoteroRelease`, the current release that the build
// read, when its first part is N, else the LAST_RELEASES entry for N, else N.9, since authors
// write maxima such as 10.99.99 to mean all of 10.
export function newestRelease(major: string, zoteroRelease?: string): string {
  if (zoteroRelease?.split(".")[0] === major) return zoteroRelease;
  return LAST_RELEASES[major] ?? `${major}.9`;
}

// How much of Zotero major N the declared range covers, where a major runs from N.0 to its
// newest release (see newestRelease). Undefined for a record with a failure or with neither
// bound.
export function majorSupport(record: RangeRecord, major: string, zoteroRelease?: string): MajorSupport | undefined {
  const { min, max } = declaredRange(record);
  if (min === undefined && max === undefined) return undefined;
  if (min !== undefined && max !== undefined && compareVersions(min, max) > 0) return "none";
  const first = `${major}.0`;
  const last = newestRelease(major, zoteroRelease);
  const fromStart = min === undefined || compareVersions(min, first) <= 0;
  const toEnd = max === undefined || compareVersions(max, last) >= 0;
  if (fromStart && toEnd) return "all";
  if ((max !== undefined && compareVersions(max, first) < 0) || (min !== undefined && compareVersions(min, last) > 0)) {
    return "none";
  }
  return "some";
}

// The row's data-zotero: each major of ZOTERO_MAJORS whose support is all or some, in that
// order, joined by spaces. Empty for a record with no declared marks or with only "none" marks.
export function rowMajors(record: RangeRecord, zoteroRelease?: string): string {
  return ZOTERO_MAJORS.filter((major) => {
    const support = majorSupport(record, major, zoteroRelease);
    return support === "all" || support === "some";
  }).join(" ");
}
