import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

// The real pinned file, read through the loader before any fetch is stubbed.
async function pinnedSchemaText(): Promise<string> {
  const dir = cacheDir();
  await loadRegistrySchema(dir);
  return readFileSync(join(dir, `registry-meta-${REGISTRY_COMMIT}.schema.json`), "utf8");
}

describe("loadRegistrySchema", () => {
  test("throws RegistrySchemaUnavailable when the download fails", async () => {
    vi.stubGlobal("fetch", async () => new Response("", { status: 500 }));
    await expect(loadRegistrySchema(cacheDir())).rejects.toThrow(
      expect.objectContaining({ name: "RegistrySchemaUnavailable", message: expect.stringContaining("HTTP 500") }),
    );
  });

  test("uses a cached copy that matches the pin, with no download", async () => {
    const pinned = await pinnedSchemaText();
    vi.stubGlobal("fetch", async () => {
      throw new Error("offline");
    });
    await expect(loadRegistrySchema(cacheDir(pinned))).resolves.toEqual(JSON.parse(pinned));
  });

  test("returns a good download when the cache cannot be written", async () => {
    const pinned = await pinnedSchemaText();
    vi.stubGlobal("fetch", async () => new Response(pinned, { status: 200 }));
    const notADirectory = join(cacheDir(), "file");
    writeFileSync(notADirectory, "");
    await expect(loadRegistrySchema(notADirectory)).resolves.toEqual(JSON.parse(pinned));
  });

  test("skips a changed cache and refuses a changed download", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 200 }));
    const load = loadRegistrySchema(cacheDir("{}"));
    await expect(load).rejects.toBeInstanceOf(RegistrySchemaUnavailable);
    await expect(load).rejects.toThrow("does not match its pinned SHA-256");
  });
});
