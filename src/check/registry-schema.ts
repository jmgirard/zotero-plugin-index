import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// zotero-plugin-dev/zotero-plugin-registry has no license, so its schema is
// read at this commit rather than copied into the repo.
export const REGISTRY_COMMIT = "a06373e072f01d83f3b5f6e304b20824ee878460";
export const REGISTRY_SCHEMA_URL =
  `https://raw.githubusercontent.com/zotero-plugin-dev/zotero-plugin-registry/${REGISTRY_COMMIT}/shared/schemas/meta.schema.json`;
// SHA-256 of the file at REGISTRY_COMMIT, so a changed cache or download is refused.
export const REGISTRY_SCHEMA_SHA256 = "6decb4ca95d8a1d948da7a45babe81a45e5b6f97cd97640be0688bbc99d5d551";

const FETCH_TIMEOUT_MS = 30_000;

export class RegistrySchemaUnavailable extends Error {
  name = "RegistrySchemaUnavailable";
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export async function loadRegistrySchema(cacheDir: string): Promise<object> {
  const cachePath = join(cacheDir, `registry-meta-${REGISTRY_COMMIT}.schema.json`);
  try {
    const cached = await readFile(cachePath, "utf8");
    if (sha256(cached) === REGISTRY_SCHEMA_SHA256) return JSON.parse(cached);
  } catch {
    // Not cached yet: download it.
  }
  let text: string;
  try {
    const response = await fetch(REGISTRY_SCHEMA_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    text = await response.text();
  } catch (error) {
    throw new RegistrySchemaUnavailable(
      `cannot read the registry schema at ${REGISTRY_SCHEMA_URL}: ${(error as Error).message}`,
    );
  }
  if (sha256(text) !== REGISTRY_SCHEMA_SHA256) {
    throw new RegistrySchemaUnavailable(
      `the registry schema at ${REGISTRY_SCHEMA_URL} does not match its pinned SHA-256`,
    );
  }
  await mkdir(cacheDir, { recursive: true });
  await writeFile(cachePath, text);
  return JSON.parse(text);
}
