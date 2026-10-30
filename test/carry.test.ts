import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterAll, describe, expect, test } from "vitest";
import type { StartPlan, StartPlanItem } from "../src/build/build.ts";
import { carryPlan, carryResults, isRetestDay, PREVIOUS_MAX_BYTES, retestDay } from "../src/start-test/carry.ts";
import { fixtureFetch, type Recorded } from "./support/fixture-fetch.ts";

const ROOT = resolve(import.meta.dirname, "..");
const CLI = resolve(ROOT, "src/start-test/carry-cli.ts");
const run = promisify(execFile);
const DAY_MS = 24 * 60 * 60 * 1000;
const SHA = "a".repeat(64);
const PREVIOUS = "https://example.org/v1/plugins.json";

const temps: string[] = [];
afterAll(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "zpi-carry-"));
  temps.push(dir);
  return dir;
}

function item(entry: string, fields: Partial<StartPlanItem> = {}): StartPlanItem {
  return { entry, id: `${entry}@example.org`, version: "1.0.0", xpiUrl: `https://x/${entry}.xpi`, sha256: SHA, ...fields };
}

function earlier(entry: string, upstream: Record<string, unknown> = {}, startTests: unknown = [{ zotero: "7.0.32", result: "started" }]) {
  return { id: entry, upstream: { id: `${entry}@example.org`, version: "1.0.0", xpiSha256: SHA, ...upstream }, startTests };
}

// The start of a UTC day that is not the entry's re-test day, and the start of the one that is.
function days(entry: string): { off: number; on: number } {
  const base = 20_000;
  const on = [0, 1, 2, 3, 4, 5, 6].map((i) => base + i).find((day) => day % 7 === retestDay(entry))!;
  return { off: (on + 1) * DAY_MS, on: on * DAY_MS };
}

describe("carryResults", () => {
  const { off, on } = days("alpha");
  const carried = (record: unknown, plan: StartPlan = { plugins: [item("alpha")] }, now = off) =>
    carryResults(plan, [record], now).plugins[0].carried;

  test("carries the started results of an earlier record for the same XPI, ordered by Zotero version", () => {
    const tests = [
      { zotero: "10.0.6", result: "started" },
      { zotero: "7.0.32", result: "started" },
    ];
    expect(carried(earlier("alpha", {}, tests))).toEqual([
      { zotero: "7.0.32", result: "started" },
      { zotero: "10.0.6", result: "started" },
    ]);
  });

  test("carries only the started items of a record that mixes results across versions", () => {
    const tests = [
      { zotero: "7.0.32", result: "started" },
      { zotero: "8.0.4", result: "start-error" },
      { zotero: "9.0.6", result: "not-installed" },
      { zotero: "10.0.6", result: "timed-out" },
    ];
    expect(carried(earlier("alpha", {}, tests))).toEqual([{ zotero: "7.0.32", result: "started" }]);
  });

  test.each([
    ["a different hash", earlier("alpha", { xpiSha256: "b".repeat(64) })],
    ["a different version", earlier("alpha", { version: "1.0.1" })],
    ["a different plugin id", earlier("alpha", { id: "other@example.org" })],
    ["no earlier record for the entry", earlier("beta")],
    ["an earlier record with a failure and no upstream", { id: "alpha", failure: { name: "fork", message: "a fork" } }],
    ["an earlier record with no startTests", { ...earlier("alpha"), startTests: undefined }],
    ["an earlier record with no xpiSha256", earlier("alpha", { xpiSha256: undefined })],
    ["a start-error result", earlier("alpha", {}, [{ zotero: "7.0.32", result: "start-error" }])],
    ["a not-installed result", earlier("alpha", {}, [{ zotero: "7.0.32", result: "not-installed" }])],
    ["a timed-out result", earlier("alpha", {}, [{ zotero: "7.0.32", result: "timed-out" }])],
  ])("carries nothing for %s", (_name, record) => {
    expect(carried(record)).toBeUndefined();
  });

  test("carries nothing on the entry's re-test day", () => {
    expect(carried(earlier("alpha"))).toHaveLength(1);
    expect(carried(earlier("alpha"), undefined, on)).toBeUndefined();
  });

  test("withholds the carry for one entry on exactly one of 7 consecutive days", () => {
    const withheld = [0, 1, 2, 3, 4, 5, 6].filter((i) => carried(earlier("alpha"), undefined, off + i * DAY_MS) === undefined);
    expect(withheld).toHaveLength(1);
    expect(isRetestDay("alpha", off + withheld[0] * DAY_MS)).toBe(true);
  });

  test("gives each entry a re-test day from 0 to 6 that depends on its id", () => {
    const entries = Array.from({ length: 70 }, (_, i) => `plugin-${i}@example.org`);
    const found = new Set(entries.map(retestDay));
    expect([...found].sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(entries.map(retestDay)).toEqual(entries.map(retestDay));
  });

  test("carries nothing from a malformed record, a malformed item, or a Zotero version named twice, and goes on", () => {
    const plan = { plugins: [item("alpha"), item("beta"), item("gamma"), item("delta")] };
    const now = [0, 1, 2, 3, 4, 5, 6].map((i) => off + i * DAY_MS).find((t) => plan.plugins.every((p) => !isRetestDay(p.entry, t)));
    // Some day in any 7 has none of the four entries due, unless they cover all 7 days.
    if (now === undefined) throw new Error("the four entries cover every day");
    const records: unknown[] = [
      null,
      "alpha",
      { ...earlier("alpha"), startTests: "started" },
      earlier("beta", {}, [null, 7, { zotero: 7, result: "started" }, { zotero: "8.0.4", result: "started" }]),
      earlier("gamma", {}, [
        { zotero: "7.0.32", result: "started" },
        { zotero: "7.0.32", result: "started" },
      ]),
      earlier("delta"),
    ];
    expect(carryResults(plan, records, now).plugins.map((p) => p.carried)).toEqual([
      undefined,
      [{ zotero: "8.0.4", result: "started" }],
      undefined,
      [{ zotero: "7.0.32", result: "started" }],
    ]);
  });

  test("carries nothing for an entry id that two earlier records name", () => {
    expect(carryResults({ plugins: [item("alpha")] }, [earlier("alpha"), earlier("alpha")], off).plugins[0].carried).toBeUndefined();
  });

  test("replaces a carried list that the plan already holds", () => {
    const plan = { plugins: [item("alpha", { carried: [{ zotero: "9.0.6", result: "started" }] })] };
    expect(carried(earlier("alpha"), plan)).toEqual([{ zotero: "7.0.32", result: "started" }]);
    expect(carried(earlier("beta"), plan)).toBeUndefined();
  });
});

describe("carryPlan", () => {
  const { off } = days("alpha");
  const plan: StartPlan = { plugins: [item("alpha")] };
  const deployed = { schemaVersion: 1, generatedAt: "2026-10-29T06:17:00.000Z", plugins: [earlier("alpha")] };

  function files(dataText = JSON.stringify({ generatedAt: new Date(off).toISOString() }), planText = `${JSON.stringify(plan, null, 2)}\n`) {
    const dir = tempDir();
    const planPath = join(dir, "start-plan.json");
    const dataPath = join(dir, "plugins.json");
    writeFileSync(planPath, planText);
    writeFileSync(dataPath, dataText);
    return { planPath, dataPath, planText };
  }

  test("writes the carried results into the plan on the day of the data's generatedAt", async () => {
    const { planPath, dataPath } = files();
    const { fetch } = fixtureFetch({ [PREVIOUS]: { json: deployed } });
    expect(await carryPlan({ plan: planPath, data: dataPath, previous: PREVIOUS, fetch })).toEqual({
      code: 0,
      line: "carried 1 start results for 1 of 1 plan items",
    });
    expect(JSON.parse(readFileSync(planPath, "utf8")).plugins[0].carried).toEqual([{ zotero: "7.0.32", result: "started" }]);
  });

  const failures: [string, Recorded, string][] = [
    ["a failed fetch", { error: "getaddrinfo ENOTFOUND" }, `cannot read ${PREVIOUS}: getaddrinfo ENOTFOUND`],
    ["an answer other than 200", { status: 404, text: "Not Found" }, `GET ${PREVIOUS} returned HTTP 404`],
    ["a body over 16 MiB", { chunks: { size: 1024 * 1024, count: 17 } }, `the body of ${PREVIOUS} is over ${PREVIOUS_MAX_BYTES} bytes`],
    ["a body that is not JSON", { text: "<html>" }, `${PREVIOUS} is not JSON`],
    ["a body with no plugins list", { json: { plugins: {} } }, `${PREVIOUS} has no plugins list`],
    ["a read past the time limit", { stall: "headers" }, `cannot read ${PREVIOUS}: the read passed its time limit of 50 ms`],
    ["a body cut by the time limit", { stall: "body" }, `cannot read ${PREVIOUS}: the read passed its time limit of 50 ms`],
  ];
  test.each(failures)("leaves the plan as it was and returns 0 for %s", async (_name, recorded, cause) => {
    const { planPath, dataPath, planText } = files();
    const { fetch } = fixtureFetch({ [PREVIOUS]: recorded });
    const outcome = await carryPlan({ plan: planPath, data: dataPath, previous: PREVIOUS, fetch, limitMs: 50 });
    expect(outcome.code).toBe(0);
    expect(outcome.line).toContain(`carried no start results: ${cause}`);
    expect(outcome.line).not.toContain("\n");
    expect(readFileSync(planPath, "utf8")).toBe(planText);
  });

  test("reads at most 16 MiB and one chunk of a longer body", async () => {
    const { planPath, dataPath } = files();
    const { fetch, requests } = fixtureFetch({ [PREVIOUS]: { chunks: { size: 1024 * 1024, count: 64 } } });
    await carryPlan({ plan: planPath, data: dataPath, previous: PREVIOUS, fetch });
    expect(requests[0].bytesEnqueued).toBeLessThanOrEqual(PREVIOUS_MAX_BYTES + 2 * 1024 * 1024);
  });

  test.each([
    ["an unreadable plan", () => ({ ...files(), planPath: join(tempDir(), "missing.json") }), "ENOENT"],
    ["a plan that is not a plan", () => files(undefined, '{"plugins": 1}\n'), "plan-invalid: the plan has no plugins list"],
    ["an unreadable data file", () => ({ ...files(), dataPath: join(tempDir(), "missing.json") }), "ENOENT"],
    ["a data file with no generatedAt", () => files("{}"), "has no readable generatedAt"],
  ])("returns 0 and leaves the plan as it was for %s", async (_name, make, cause) => {
    const { planPath, dataPath } = make();
    const before = (() => {
      try {
        return readFileSync(planPath, "utf8");
      } catch {
        return undefined;
      }
    })();
    const { fetch, requests } = fixtureFetch({ [PREVIOUS]: { json: deployed } });
    const outcome = await carryPlan({ plan: planPath, data: dataPath, previous: PREVIOUS, fetch });
    expect(outcome).toEqual({ code: 0, line: expect.stringContaining(cause) });
    expect(outcome.line).toMatch(/^carried no start results: /);
    expect(requests).toEqual([]);
    if (before !== undefined) expect(readFileSync(planPath, "utf8")).toBe(before);
  });

  test("the command exits 0 and leaves the plan as it was when the earlier data cannot be fetched", async () => {
    const { planPath, dataPath, planText } = files();
    const { stdout } = await run(process.execPath, [CLI, "--plan", planPath, "--data", dataPath, "--previous", "http://127.0.0.1:9/plugins.json"]);
    expect(stdout).toMatch(/^carried no start results: cannot read http:\/\/127\.0\.0\.1:9\/plugins\.json: /);
    expect(readFileSync(planPath, "utf8")).toBe(planText);
  });
});
