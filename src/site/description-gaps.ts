// The plugins whose shown description needs a description override (D-030, D-031, D-032, D-038).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Ajv } from "ajv";
import indexSchema from "../../schemas/index.v1.schema.json" with { type: "json" };
import pluginsSchema from "../../schemas/plugins.v1.schema.json" with { type: "json" };
import type { Override, PluginRecord, PluginsFile } from "../build/build.ts";
import { cjkShare, shownDescription } from "./description.ts";

export type GapCase = "missing" | "cjk" | "short";

export interface Gap {
  id: string;
  gap: GapCase;
  shown?: string;
}

export type GapsResult = { ok: true; gaps: Gap[] } | { ok: false; message: string };

// The fewest words a shown description can have outside the short case. A word is a run of
// letters, marks, and digits, and repeats and filler words count.
const MIN_WORDS = 6;

const ajv = new Ajv({ allErrors: true });
const validatePlugins = ajv.compile(pluginsSchema);
const validateIndex = ajv.compile(indexSchema);

// The first case that applies to the description the site shows, in the order missing, cjk,
// short, or none.
export function gapOf(record: PluginRecord): GapCase | undefined {
  const shown = shownDescription(record);
  if (shown === undefined) return "missing";
  if (cjkShare(shown) >= 0.5) return "cjk";
  if ((shown.match(/[\p{L}\p{M}\p{N}]+/gu)?.length ?? 0) < MIN_WORDS) return "short";
  return undefined;
}

// One printed line: the id, the case, and the shown text, with a tab between them. The shown
// text loses whitespace at its ends, and each other run of whitespace, tabs and line breaks
// included, becomes one space, so the line stays one line. A text left empty is left out.
export function gapLine({ id, gap, shown }: Gap): string {
  const text = shown?.trim().replace(/\s+/g, " ");
  return [id, gap, ...(text ? [text] : [])].join("\t");
}

// Reads the data file at dataPath and gives each record the overrides of root/<id>/index.json,
// or none when that file does not exist, then lists the records with an upstream block that
// have a gap. A data file that cannot be read, is not JSON, or fails the v1 schema, and an
// index.json that cannot be read, is not JSON, or fails its schema, give a message instead.
export async function findGaps(dataPath: string, root: string): Promise<GapsResult> {
  let text: string;
  try {
    text = await readFile(dataPath, "utf8");
  } catch (error) {
    return { ok: false, message: `data-unreadable: ${dataPath}: ${(error as Error).message}` };
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return { ok: false, message: `data-not-json: ${dataPath}: ${(error as Error).message}` };
  }
  if (!validatePlugins(data)) {
    return { ok: false, message: `data-invalid: ${dataPath}: ${ajv.errorsText(validatePlugins.errors)}` };
  }

  const gaps: Gap[] = [];
  for (const record of (data as unknown as PluginsFile).plugins) {
    if (!record.upstream) continue;
    const overrides = await checkoutOverrides(join(root, record.id, "index.json"));
    if (!Array.isArray(overrides)) return { ok: false, message: overrides.message };
    const checked = { ...record, overrides };
    const gap = gapOf(checked);
    if (gap) gaps.push({ id: record.id, gap, shown: shownDescription(checked) });
  }
  return { ok: true, gaps };
}

async function checkoutOverrides(path: string): Promise<Override[] | { message: string }> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    return { message: `entry-unreadable: ${path}: ${(error as Error).message}` };
  }
  let index: unknown;
  try {
    index = JSON.parse(text);
  } catch (error) {
    return { message: `entry-not-json: ${path}: ${(error as Error).message}` };
  }
  if (!validateIndex(index)) return { message: `entry-invalid: ${path}: ${ajv.errorsText(validateIndex.errors)}` };
  return (index as { overrides?: Override[] }).overrides ?? [];
}
