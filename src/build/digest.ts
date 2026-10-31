import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export type DigestResult = { ok: true; sha256: string } | { ok: false; message: string };

type Entry = { path: string; kind: "file" | "directory"; sha256: string | null };

// Lists every entry under dir with its path relative to dir, joined with "/". An entry that
// is neither a file nor a directory, such as a symbolic link or a named pipe, stops the walk.
async function walk(dir: string, prefix: string, entries: Entry[]): Promise<string | null> {
  for (const dirent of await readdir(dir, { withFileTypes: true })) {
    const path = prefix === "" ? dirent.name : `${prefix}/${dirent.name}`;
    const full = join(dir, dirent.name);
    if (dirent.isDirectory()) {
      entries.push({ path, kind: "directory", sha256: null });
      const refused = await walk(full, path, entries);
      if (refused !== null) return refused;
    } else if (dirent.isFile()) {
      entries.push({ path, kind: "file", sha256: createHash("sha256").update(await readFile(full)).digest("hex") });
    } else {
      return path;
    }
  }
  return null;
}

// The SHA-256 of the tree under dir: of one JSON line per entry, [kind, path, file SHA-256 or
// null], sorted by path in UTF-8 byte order. JSON quotes each path, so no path can run into
// the next field. File times and modes do not count.
export async function treeDigest(dir: string): Promise<DigestResult> {
  const entries: Entry[] = [];
  let refused: string | null;
  try {
    refused = await walk(dir, "", entries);
  } catch (error) {
    return { ok: false, message: `cannot read ${JSON.stringify(dir)}: ${(error as Error).message}` };
  }
  if (refused !== null) return { ok: false, message: `not a file or directory: ${JSON.stringify(refused)}` };
  entries.sort((a, b) => Buffer.compare(Buffer.from(a.path), Buffer.from(b.path)));
  const hash = createHash("sha256");
  for (const entry of entries) hash.update(`${JSON.stringify([entry.kind, entry.path, entry.sha256])}\n`);
  return { ok: true, sha256: hash.digest("hex") };
}
