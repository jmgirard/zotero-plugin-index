import { describe, expect, test } from "vitest";
import { compareVersions, rangeResult, type RangeRecord } from "../src/site/version.ts";

// MDN, "Legacy Version Formats", section "Examples" (cairn/references/mozilla-toolkit-version.md).
// Each group is equal within itself and older than every later group.
const ORDERED = [
  ["1.-1"],
  ["1", "1.", "1.0", "1.0.0"],
  ["1.1a"],
  ["1.1aa"],
  ["1.1ab"],
  ["1.1b"],
  ["1.1c"],
  ["1.1pre", "1.1pre0", "1.0+"],
  ["1.1pre1a"],
  ["1.1pre1aa"],
  ["1.1pre1b"],
  ["1.1pre1"],
  ["1.1pre2"],
  ["1.1pre10"],
  ["1.1.-1"],
  ["1.1", "1.1.0", "1.1.00"],
  ["1.10"],
  ["1.*"],
  ["1.*.1"],
  ["2.0"],
];

describe("compareVersions", () => {
  const equal = ORDERED.flatMap((group) => group.flatMap((a) => group.map((b) => [a, b])));
  const older = ORDERED.flatMap((group, i) =>
    ORDERED.slice(i + 1).flatMap((later) => group.flatMap((a) => later.map((b) => [a, b]))),
  );

  test.each(equal)("%s equals %s", (a, b) => {
    expect(compareVersions(a!, b!)).toBe(0);
  });

  test.each(older)("%s is older than %s", (a, b) => {
    expect(compareVersions(a!, b!)).toBeLessThan(0);
    expect(compareVersions(b!, a!)).toBeGreaterThan(0);
  });

  test.each([
    ["11.*.*", 1],
    ["8.0-beta.21", -1],
    ["10.99.99", 1],
  ])("%s against 8.0.1", (version, sign) => {
    expect(Math.sign(compareVersions(version, "8.0.1"))).toBe(sign);
  });
});

function record(
  facts: { version?: string; strictMinVersion?: string; strictMaxVersion?: string },
  overrides: RangeRecord["overrides"] = [],
): RangeRecord {
  return { upstream: { version: "2.0.0", ...facts }, overrides };
}

describe("rangeResult", () => {
  const ranged = record({ strictMinVersion: "7.0", strictMaxVersion: "8.0.*" });

  test("a version older than the minimum is below", () => {
    expect(rangeResult("6.0.30", ranged)).toBe("below");
  });

  test("a version newer than the maximum is above", () => {
    expect(rangeResult("9.0", ranged)).toBe("above");
  });

  test("a version between the bounds is inside", () => {
    expect(rangeResult("7.1", ranged)).toBe("inside");
  });

  test("a version equal to the minimum is inside", () => {
    expect(rangeResult("7.0.0", ranged)).toBe("inside");
  });

  test("a version equal to the maximum is inside", () => {
    expect(rangeResult("8.0.*", ranged)).toBe("inside");
  });

  test("a missing minimum sets no lower bound", () => {
    expect(rangeResult("0.1", record({ strictMaxVersion: "8.*" }))).toBe("inside");
  });

  test("a missing maximum sets no upper bound", () => {
    expect(rangeResult("99", record({ strictMinVersion: "7.0" }))).toBe("inside");
  });

  test("a record with neither bound has no range", () => {
    expect(rangeResult("7.0", record({}))).toBe("no-range");
  });

  test("a record with a failure has no range", () => {
    const failed: RangeRecord = { failure: { name: "no-xpi-release", message: "no release" }, overrides: [] };
    expect(rangeResult("7.0", failed)).toBe("no-range");
  });

  test("an override with no version replaces the upstream value", () => {
    const corrected = record({ strictMinVersion: "7.0", strictMaxVersion: "7.*" }, [
      { field: "strict_max_version", value: "8.*" },
    ]);
    expect(rangeResult("8.0.1", corrected)).toBe("inside");
  });

  test("an override for the upstream version replaces the upstream value", () => {
    const corrected = record({ strictMinVersion: "7.0", strictMaxVersion: "7.*" }, [
      { field: "strict_max_version", version: "2.0.0", value: "8.*" },
    ]);
    expect(rangeResult("8.0.1", corrected)).toBe("inside");
  });

  test("an override for another version does not apply", () => {
    const stale = record({ strictMinVersion: "7.0", strictMaxVersion: "7.*" }, [
      { field: "strict_max_version", version: "1.0.0", value: "8.*" },
    ]);
    expect(rangeResult("8.0.1", stale)).toBe("above");
  });

  test("an override for the upstream version wins over one with no version", () => {
    const both = record({ strictMinVersion: "7.0", strictMaxVersion: "7.*" }, [
      { field: "strict_max_version", version: "2.0.0", value: "8.*" },
      { field: "strict_max_version", value: "7.5" },
    ]);
    expect(rangeResult("8.0.1", both)).toBe("inside");
    expect(rangeResult("8.0.1", { ...both, overrides: [...both.overrides].reverse() })).toBe("inside");
  });

  test("an override can supply a bound the upstream facts lack", () => {
    const added = record({}, [{ field: "strict_min_version", value: "7.0" }]);
    expect(rangeResult("6.0", added)).toBe("below");
  });
});
