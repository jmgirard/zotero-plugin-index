import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { loadRegistrySchema, REGISTRY_COMMIT, RegistrySchemaUnavailable } from "../src/check/registry-schema.ts";

const temps: string[] = [];
afterEach(() => {
  vi.unstubAllGlobals();
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function cacheDir(cached?: string): string {
  const dir = mkdtempSync(join(tmpdir(), "zpi-cache-"));
  temps.push(dir);
  if (cached !== undefined) writeFileSync(join(dir, `registry-meta-${REGISTRY_COMMIT}.schema.json`), cached);
  return dir;
}

describe("loadRegistrySchema", () => {
  test("throws RegistrySchemaUnavailable when the download fails", async () => {
    vi.stubGlobal("fetch", async () => new Response("", { status: 500 }));
    await expect(loadRegistrySchema(cacheDir())).rejects.toThrow(
      expect.objectContaining({ name: "RegistrySchemaUnavailable", message: expect.stringContaining("HTTP 500") }),
    );
  });

  test("refuses a cached copy and a download that differ from the pinned file", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 200 }));
    const load = loadRegistrySchema(cacheDir("{}"));
    await expect(load).rejects.toBeInstanceOf(RegistrySchemaUnavailable);
    await expect(load).rejects.toThrow("does not match its pinned SHA-256");
  });
});
