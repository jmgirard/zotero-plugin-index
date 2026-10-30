import { describe, expect, test } from "vitest";
import {
  appliedValue,
  compareVersions,
  declaredRange,
  majorSupport,
  type RangeRecord,
  ZOTERO_MAJORS,
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

function record(
  facts: { version?: string; strictMinVersion?: string; strictMaxVersion?: string },
  overrides: RangeRecord["overrides"] = [],
): RangeRecord {
  return { upstream: { version: "2.0.0", ...facts }, overrides };
}

describe("declaredRange", () => {
  const upstream = { strictMinVersion: "7.0", strictMaxVersion: "7.*" };

  test("a record with a failure has no range", () => {
    const failed: RangeRecord = { failure: { name: "no-xpi-release", message: "no release" }, overrides: [] };
    expect(declaredRange(failed)).toEqual({});
  });

  test("an override with no version replaces the upstream value", () => {
    expect(declaredRange(record(upstream, [{ field: "strict_max_version", value: "8.*" }])).max).toBe("8.*");
  });

  test("an override for the upstream version replaces the upstream value", () => {
    const corrected = record(upstream, [{ field: "strict_max_version", version: "2.0.0", value: "8.*" }]);
    expect(declaredRange(corrected).max).toBe("8.*");
  });

  test("an override for another version does not apply", () => {
    const stale = record(upstream, [{ field: "strict_max_version", version: "1.0.0", value: "8.*" }]);
    expect(declaredRange(stale).max).toBe("7.*");
  });

  test("an override for the upstream version wins over one with no version", () => {
    const both = record(upstream, [
      { field: "strict_max_version", version: "2.0.0", value: "8.*" },
      { field: "strict_max_version", value: "7.5" },
    ]);
    expect(declaredRange(both).max).toBe("8.*");
    expect(declaredRange({ ...both, overrides: [...both.overrides].reverse() }).max).toBe("8.*");
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
    [{ strictMinVersion: "6.999", strictMaxVersion: "7.0.*" }, "7", "all"],
    [{ strictMinVersion: "6.999", strictMaxVersion: "7.0.31" }, "7", "some"],
    [{ strictMinVersion: "6.999", strictMaxVersion: "7.0.*" }, "8", "none"],
    [{ strictMinVersion: "8.0.1" }, "8", "some"],
    [{ strictMinVersion: "8.0.1" }, "10", "all"],
    [{ strictMaxVersion: "10.*" }, "7", "all"],
    [{ strictMaxVersion: "10.9.9" }, "10", "all"],
    [{ strictMinVersion: "8.5", strictMaxVersion: "8.2" }, "8", "none"],
  ])("reads %j for Zotero %s as %s", (facts, major, support) => {
    expect(majorSupport(record(facts), major)).toBe(support);
  });

  test.each([
    [{ strictMaxVersion: "10.0.*" }, "10", "10.0.7", "all"],
    [{ strictMaxVersion: "10.0.6" }, "10", "10.0.7", "some"],
    [{ strictMinVersion: "10.1" }, "10", "10.0.7", "none"],
    [{ strictMinVersion: "10.0" }, "10", "10.0.7", "all"],
    [{ strictMaxVersion: "10.0.*" }, "10", "10.1.0", "some"],
    [{ strictMaxVersion: "10.0.*" }, "10", undefined, "some"],
    [{ strictMaxVersion: "10.99.99" }, "10", undefined, "all"],
    [{ strictMaxVersion: "9.0.*" }, "9", "10.0.7", "all"],
    [{ strictMinVersion: "10.0.3", strictMaxVersion: "10.0.1" }, "10", "10.0.7", "none"],
  ])("reads %j for Zotero %s with the current release %s as %s", (facts, major, zoteroRelease, support) => {
    expect(majorSupport(record(facts), major, zoteroRelease)).toBe(support);
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
