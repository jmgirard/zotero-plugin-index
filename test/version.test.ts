import { describe, expect, test } from "vitest";
import {
  appliedValue,
  compareVersions,
  majorSupport,
  rangeResult,
  type RangeRecord,
  ZOTERO_MAJORS,
  zoteroVersion,
} from "../src/site/version.ts";

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
  const equal = ORDERED.flatMap((group) => group.slice(1).map((b) => [group[0]!, b]));
  const older = ORDERED.slice(0, -1).flatMap((group, i) =>
    group.flatMap((a) => ORDERED[i + 1]!.map((b) => [a, b])),
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

describe("zoteroVersion", () => {
  test.each([
    ["8.0.1", "8.0.1"],
    ["Version 7.0.11 (64-bit)", "7.0.11"],
    ["Zotero 8.0-beta.3+abc, 64-bit", "8.0-beta.3+abc"],
    ["7.0.11/64-bit", "7.0.11"],
  ])("reads %j as %s", (input, version) => {
    expect(zoteroVersion(input)).toBe(version);
  });

  test("reads text with no digit as no version", () => {
    expect(zoteroVersion("Zotero")).toBe("");
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

  test("a version equal to the minimum is inside", () => {
    expect(rangeResult("7.0.0", ranged)).toBe("inside");
  });

  test("a version equal to the maximum is inside", () => {
    expect(rangeResult("8.0.1", record({ strictMinVersion: "7.0", strictMaxVersion: "8.0.1" }))).toBe("inside");
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
});

describe("majorSupport", () => {
  test("ZOTERO_MAJORS lists Zotero 7 to 10", () => {
    expect(ZOTERO_MAJORS).toEqual(["7", "8", "9", "10"]);
  });

  test.each([
    [{ strictMinVersion: "8.0-beta.21", strictMaxVersion: "10.99.99" }, "7", "none"],
    [{ strictMinVersion: "8.0-beta.21", strictMaxVersion: "10.99.99" }, "8", "all"],
    [{ strictMinVersion: "8.0-beta.21", strictMaxVersion: "10.99.99" }, "9", "all"],
    [{ strictMinVersion: "8.0-beta.21", strictMaxVersion: "10.99.99" }, "10", "all"],
    [{ strictMinVersion: "8.999", strictMaxVersion: "10.0.*" }, "8", "none"],
    [{ strictMinVersion: "8.999", strictMaxVersion: "10.0.*" }, "9", "all"],
    [{ strictMinVersion: "8.999", strictMaxVersion: "10.0.*" }, "10", "some"],
    [{ strictMinVersion: "6.999", strictMaxVersion: "7.0.*" }, "7", "some"],
    [{ strictMinVersion: "6.999", strictMaxVersion: "7.0.*" }, "8", "none"],
    [{ strictMinVersion: "8.0.1" }, "8", "some"],
    [{ strictMinVersion: "8.0.1" }, "10", "all"],
    [{ strictMaxVersion: "10.*" }, "7", "all"],
    [{ strictMaxVersion: "10.9.9" }, "10", "all"],
    [{ strictMinVersion: "8.5", strictMaxVersion: "8.2" }, "8", "none"],
  ])("reads %j as %s for Zotero %s", (facts, major, support) => {
    expect(majorSupport(record(facts), major)).toBe(support);
  });

  test("gives no result for a record with neither bound", () => {
    expect(majorSupport(record({}), "8")).toBeUndefined();
  });

  test("gives no result for a record with a failure", () => {
    const failed: RangeRecord = { failure: { name: "no-xpi-release", message: "no release" }, overrides: [] };
    expect(majorSupport(failed, "8")).toBeUndefined();
  });

  test("reads the maximum after a strict_max_version override", () => {
    const facts = { strictMinVersion: "7.0", strictMaxVersion: "7.*" };
    expect(majorSupport(record(facts), "8")).toBe("none");
    expect(majorSupport(record(facts, [{ field: "strict_max_version", value: "8.*" }]), "8")).toBe("all");
  });

  test("reads the minimum after a strict_min_version override", () => {
    const facts = { strictMinVersion: "7.0", strictMaxVersion: "10.*" };
    expect(majorSupport(record(facts), "8")).toBe("all");
    expect(majorSupport(record(facts, [{ field: "strict_min_version", value: "9.0" }]), "8")).toBe("none");
  });
});

describe("appliedValue", () => {
  test("no override applies to a record that was not read", () => {
    const failed: RangeRecord = {
      failure: { name: "no-xpi-release", message: "no release" },
      overrides: [{ field: "name", value: "Corrected Name" }],
    };
    expect(appliedValue(failed, "name", undefined)).toBeUndefined();
  });
});
