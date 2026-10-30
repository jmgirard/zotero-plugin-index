import { createHash } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import type { CarriedResult, StartPlan, StartPlanItem } from "../build/build.ts";
import { compareVersions } from "../site/version.ts";
import type { Fetch } from "../upstream/reader.ts";
import { withinLimit } from "../upstream/time-limit.ts";
import { parsePlan } from "./start-tests.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

// The deployed data that the daily build reuses start results from.
export const PREVIOUS_URL = "https://jmgirard.github.io/zotero-plugin-index/v1/plugins.json";

// The largest earlier data read, counted in decoded bytes. The deployed file of 272 plugins was
// 375,942 bytes (observed 2026-10-30).
export const PREVIOUS_MAX_BYTES = 16 * 1024 * 1024;

// The longest the earlier data read may take.
export const PREVIOUS_LIMIT_MS = 60_000;

// The entry's re-test day, 0 to 6: the first four bytes of the SHA-256 of the entry id, read as
// an unsigned integer, modulo 7.
export function retestDay(entry: string): number {
  return createHash("sha256").update(entry).digest().readUInt32BE(0) % 7;
}

// Whether `nowMs` falls on the entry's re-test day, counted in whole UTC days since 1970-01-01.
export function isRetestDay(entry: string, nowMs: number): boolean {
  return Math.floor(nowMs / DAY_MS) % 7 === retestDay(entry);
}

// The plan with a `carried` list on each item outside its re-test day that has at least one
// `started` result in `earlier` for the same XPI: the earlier record with the item's entry id must
// have an upstream with the item's plugin id and version and an xpiSha256 equal to its sha256.
// Earlier data can hold any shape, so a record, a startTests list, or an item of another shape
// carries nothing. A Zotero version that a record names twice, and an entry id that two records
// name, carry nothing. Each item's earlier `carried` list is replaced.
export function carryResults(plan: StartPlan, earlier: unknown[], nowMs: number): StartPlan {
  const records = new Map<string, unknown>();
  const twice = new Set<string>();
  for (const record of earlier) {
    const id = (record as { id?: unknown } | null)?.id;
    if (typeof id !== "string") continue;
    if (records.has(id)) twice.add(id);
    records.set(id, record);
  }
  const plugins = plan.plugins.map(({ carried: _old, ...item }) => {
    if (twice.has(item.entry) || isRetestDay(item.entry, nowMs)) return item;
    const carried = startedResults(item, records.get(item.entry));
    return carried.length > 0 ? { ...item, carried } : item;
  });
  return { ...plan, plugins };
}

function startedResults(item: StartPlanItem, record: unknown): CarriedResult[] {
  if (typeof record !== "object" || record === null) return [];
  const { upstream, startTests } = record as { upstream?: unknown; startTests?: unknown };
  if (typeof upstream !== "object" || upstream === null || !Array.isArray(startTests)) return [];
  const { id, version, xpiSha256 } = upstream as Record<string, unknown>;
  if (id !== item.id || version !== item.version || xpiSha256 !== item.sha256) return [];
  const zoteros = startTests.flatMap((test: unknown) => {
    const zotero = (test as { zotero?: unknown } | null)?.zotero;
    return typeof zotero === "string" ? [zotero] : [];
  });
  return startTests
    .flatMap((test: unknown) => {
      const { zotero, result } = (typeof test === "object" && test !== null ? test : {}) as Record<string, unknown>;
      if (typeof zotero !== "string" || result !== "started") return [];
      if (zoteros.indexOf(zotero) !== zoteros.lastIndexOf(zotero)) return [];
      return [{ zotero, result: "started" as const }];
    })
    .sort((a, b) => compareVersions(a.zotero, b.zotero));
}

export interface CarryOptions {
  plan: string;
  data: string;
  previous: string;
  fetch: Fetch;
  limitMs?: number;
}

// Rewrites the plan file with the results that `carryResults` reuses from the earlier data at
// `previous`, on the day of the data file's generatedAt. Start results never withhold a deploy
// (D-024), so on any error it leaves the plan file as it was and returns the error's line with
// code 0. It writes through a temporary file, as `pnpm build` writes the plan.
export async function carryPlan(options: CarryOptions): Promise<{ code: 0; line: string }> {
  try {
    const parsed = parsePlan(await readFile(options.plan, "utf8"));
    if (!parsed.ok) return { code: 0, line: `carried no start results: plan-invalid: ${parsed.problem}` };
    const generatedAt = (JSON.parse(await readFile(options.data, "utf8")) as { generatedAt?: unknown } | null)?.generatedAt;
    const nowMs = typeof generatedAt === "string" ? Date.parse(generatedAt) : Number.NaN;
    if (Number.isNaN(nowMs)) return { code: 0, line: `carried no start results: ${options.data} has no readable generatedAt` };
    const earlier = await readPrevious(options.previous, options.fetch, options.limitMs ?? PREVIOUS_LIMIT_MS);
    if ("problem" in earlier) return { code: 0, line: `carried no start results: ${earlier.problem}` };
    const plan = carryResults(parsed.plan, earlier.plugins, nowMs);
    const temporary = `${options.plan}.tmp`;
    try {
      await writeFile(temporary, `${JSON.stringify(plan, null, 2)}\n`);
      await rename(temporary, options.plan);
    } catch (error) {
      await rm(temporary, { force: true }).catch(() => {});
      throw error;
    }
    const items = plan.plugins.filter((item) => item.carried);
    const results = items.reduce((sum, item) => sum + item.carried!.length, 0);
    return { code: 0, line: `carried ${results} start results for ${items.length} of ${plan.plugins.length} plan items` };
  } catch (error) {
    return { code: 0, line: `carried no start results: ${(error as Error).message}` };
  }
}

// The plugins list of the earlier data, read within `limitMs` and PREVIOUS_MAX_BYTES of decoded
// body, or the problem that stopped the read.
async function readPrevious(url: string, fetch: Fetch, limitMs: number): Promise<{ plugins: unknown[] } | { problem: string }> {
  return withinLimit(limitMs, async (signal) => {
    let text: string;
    try {
      const response = await fetch(url, { signal });
      if (response.status !== 200) {
        await response.body?.cancel().catch(() => {});
        return { problem: `GET ${url} returned HTTP ${response.status}` };
      }
      const bytes = await readCapped(response, PREVIOUS_MAX_BYTES);
      if (!bytes) return { problem: `the body of ${url} is over ${PREVIOUS_MAX_BYTES} bytes` };
      text = new TextDecoder().decode(bytes);
    } catch (error) {
      const reason = signal.aborted ? (signal.reason as Error).message : (error as Error).message;
      return { problem: `cannot read ${url}: ${reason}` };
    }
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch (error) {
      return { problem: `${url} is not JSON: ${(error as Error).message}` };
    }
    const plugins = (value as { plugins?: unknown } | null)?.plugins;
    return Array.isArray(plugins) ? { plugins } : { problem: `${url} has no plugins list` };
  });
}

// The body's bytes, or undefined once more than `max` have arrived.
async function readCapped(response: Response, max: number): Promise<Uint8Array | undefined> {
  if (!response.body) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = response.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel().catch(() => {});
      return undefined;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.length;
  }
  return bytes;
}
