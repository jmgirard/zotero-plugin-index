import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test, vi } from "vitest";
import type { PluginRecord, PluginsFile } from "../src/build/build.ts";
import { rangeResult } from "../src/site/version.ts";
import { displayName, loadData, overrideUsed, rangeFields, rangeText, safeHref } from "../site/src/data.ts";

const FIXTURE = resolve(import.meta.dirname, "fixtures/site/plugins.json");

function record(facts: Partial<NonNullable<PluginRecord["upstream"]>>, overrides: PluginRecord["overrides"] = []): PluginRecord {
  return {
    id: "a@example.org",
    repoUrl: "https://github.com/example/a",
    upstream: {
      id: "a@example.org",
      version: "2.0.0",
      updateUrl: "https://example.org/update.json",
      updateHost: "example.org",
      repoUrl: "https://github.com/example/a",
      repoCreatedAt: "2024-01-01T00:00:00Z",
      openIssues: 0,
      releaseCount: 1,
      latestReleaseDate: "2026-01-01T00:00:00Z",
      ...facts,
    },
    overrides,
  };
}

describe("rangeText", () => {
  test.each([
    [{ strictMinVersion: "7.0", strictMaxVersion: "8.*" }, "Zotero 7.0 to 8.*"],
    [{ strictMinVersion: "7.0" }, "Zotero 7.0 or newer"],
    [{ strictMaxVersion: "8.*" }, "Zotero 8.* or older"],
    [{}, "No declared range"],
  ])("states %j as %s", (facts, text) => {
    expect(rangeText(record(facts))).toBe(text);
  });
});

describe("displayName", () => {
  test("uses a name override over the manifest name", () => {
    expect(displayName(record({ name: "Upstream" }, [{ field: "name", value: "Corrected", reason: "r" }]))).toBe("Corrected");
  });

  test("falls back to the id when no name is known", () => {
    expect(displayName(record({}))).toBe("a@example.org");
  });
});

describe("overrideUsed", () => {
  test("marks only the override that sets the field", () => {
    const unversioned = { field: "strict_max_version", value: "7.5", reason: "r" };
    const versioned = { field: "strict_max_version", version: "2.0.0", value: "8.*", reason: "r" };
    const both = record({ strictMaxVersion: "7.*" }, [unversioned, versioned]);
    expect(overrideUsed(both, versioned)).toBe(true);
    expect(overrideUsed(both, unversioned)).toBe(false);
  });
});

describe("rangeFields", () => {
  const fixture = JSON.parse(readFileSync(FIXTURE, "utf8")) as PluginsFile;
  const both = record({ strictMinVersion: "7.0", strictMaxVersion: "7.*" }, [
    { field: "strict_max_version", value: "7.5", reason: "r" },
    { field: "strict_max_version", version: "2.0.0", value: "8.*", reason: "r" },
    { field: "name", value: "Corrected", reason: "r" },
  ]);

  test("gives the browser the same range result as the full record", () => {
    for (const plugin of [...fixture.plugins, both]) {
      const fields = JSON.parse(rangeFields(plugin));
      for (const version of ["6.0", "7.5", "8.0.1", "9.0"]) {
        expect(rangeResult(version, fields), `${plugin.id} at ${version}`).toBe(rangeResult(version, plugin));
      }
    }
  });

  test("keeps only the bound overrides, without their reasons", () => {
    expect(JSON.parse(rangeFields(both)).overrides).toEqual([
      { field: "strict_max_version", value: "7.5" },
      { field: "strict_max_version", version: "2.0.0", value: "8.*" },
    ]);
  });
});

describe("loadData", () => {
  test("names the missing variable when pnpm site did not set it", () => {
    vi.stubEnv("ZPI_SITE_DATA", "");
    try {
      expect(() => loadData()).toThrow("ZPI_SITE_DATA is not set; build the site with pnpm site");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("safeHref", () => {
  test("keeps an https URL", () => {
    expect(safeHref("https://github.com/example/a")).toBe("https://github.com/example/a");
  });

  test("drops a javascript: URL", () => {
    expect(safeHref("javascript:alert(1)")).toBeUndefined();
  });
});
