// Version ordering for the site. Plain TypeScript with no imports, so both the tests and
// the browser script can use it.

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

export type RangeResult = "below" | "above" | "inside" | "no-range";

// The value of a field after overrides. An override applies to a record that was read,
// when it has no version or names the upstream version. The one that names the version
// wins over one with none.
export function appliedValue(record: RangeRecord, field: string, upstream: string | undefined): string | undefined {
  if (!record.upstream) return upstream;
  const applying = record.overrides.filter(
    (o) => o.field === field && (o.version === undefined || o.version === record.upstream?.version),
  );
  return (applying.find((o) => o.version !== undefined) ?? applying[0])?.value ?? upstream;
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

// Where a Zotero version falls against the record's declared range. The bounds themselves
// are inside the range.
export function rangeResult(zotero: string, record: RangeRecord): RangeResult {
  const { min, max } = declaredRange(record);
  if (min === undefined && max === undefined) return "no-range";
  if (min !== undefined && compareVersions(zotero, min) < 0) return "below";
  if (max !== undefined && compareVersions(zotero, max) > 0) return "above";
  return "inside";
}
