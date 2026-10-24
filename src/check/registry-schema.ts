import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// zotero-plugin-dev/zotero-plugin-registry has no license, so its schema is
// read at this commit rather than copied into the repo.
export const REGISTRY_COMMIT = "a06373e072f01d83f3b5f6e304b20824ee878460";
export const REGISTRY_SCHEMA_URL =
  `https://raw.githubusercontent.com/zotero-plugin-dev/zotero-plugin-registry/${REGISTRY_COMMIT}/shared/schemas/meta.schema.json`;

export class RegistrySchemaUnavailable extends Error {
  name = "RegistrySchemaUnavailable";
}

export async function loadRegistrySchema(cacheDir: string): Promise<object> {
  const cachePath = join(cacheDir, `registry-meta-${REGISTRY_COMMIT}.schema.json`);
  try {
    return JSON.parse(await readFile(cachePath, "utf8"));
  } catch {
    // Not cached yet, or the cached copy is unreadable: download it.
  }
  let text: string;
  try {
    const response = await fetch(REGISTRY_SCHEMA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    text = await response.text();
    JSON.parse(text);
  } catch (error) {
    throw new RegistrySchemaUnavailable(
      `cannot read the registry schema at ${REGISTRY_SCHEMA_URL}: ${(error as Error).message}`,
    );
  }
  await mkdir(cacheDir, { recursive: true });
  await writeFile(cachePath, text);
  return JSON.parse(text);
}
