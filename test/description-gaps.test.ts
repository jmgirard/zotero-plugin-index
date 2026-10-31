import { execFile } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import type { PluginRecord } from "../src/build/build.ts";
import { findGaps } from "../src/site/description-gaps.ts";

const CLI = join(import.meta.dirname, "..", "src", "site", "description-gaps-cli.ts");

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "zpi-gaps-"));
  mkdirSync(join(dir, "plugins"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function record(id: string, name: string, description: string | undefined): PluginRecord {
  return {
    id,
    repoUrl: `https://github.com/example/${id}`,
    upstream: {
      id,
      name,
      description,
      version: "1.0.0",
      updateUrl: "https://example.org/update.json",
      updateHost: "example.org",
      repoUrl: `https://github.com/example/${id}`,
      repoCreatedAt: "2024-01-01T00:00:00Z",
      openIssues: 0,
      releaseCount: 1,
      latestReleaseDate: "2026-01-01T00:00:00Z",
    },
    overrides: [],
  };
}

function writeData(plugins: PluginRecord[]): string {
  const path = join(dir, "plugins.json");
  writeFileSync(path, JSON.stringify({ schemaVersion: 1, generatedAt: "2026-10-31T00:00:00Z", plugins }));
  return path;
}

function writeIndex(id: string, index: unknown) {
  mkdirSync(join(dir, "plugins", id));
  writeFileSync(join(dir, "plugins", id, "index.json"), typeof index === "string" ? index : JSON.stringify(index));
}

const LONG = "Takes notes beside each paper you read.";
const OVERRIDE = { field: "description", value: LONG, reason: "From README.md." };

describe("findGaps", () => {
  test("names the first case that applies to each record", async () => {
    const data = writeData([
      record("blank@example.org", "Blank", undefined),
      record("zh@example.org", "Notes", "在文献旁边记录笔记并整理卡片"),
      record("short@example.org", "Notes", "Custom rename pdf"),
      record("fine@example.org", "Notes", LONG),
      { id: "failed@example.org", repoUrl: "https://github.com/example/failed", failure: { name: "not-read", message: "x" }, overrides: [] },
    ]);
    const result = await findGaps(data, join(dir, "plugins"));
    expect(result).toEqual({
      ok: true,
      gaps: [
        { id: "blank@example.org", gap: "missing", shown: undefined },
        { id: "zh@example.org", gap: "cjk", shown: "在文献旁边记录笔记并整理卡片" },
        { id: "short@example.org", gap: "short", shown: "Custom rename pdf" },
      ],
    });
  });

  test("names a CJK text of fewer than six words as CJK", async () => {
    const result = await findGaps(writeData([record("zh@example.org", "Notes", "记笔记")]), join(dir, "plugins"));
    expect(result).toEqual({ ok: true, gaps: [{ id: "zh@example.org", gap: "cjk", shown: "记笔记" }] });
  });

  test("counts repeats and filler words", async () => {
    const result = await findGaps(writeData([record("a@example.org", "Notes", "a sorter for the sorter for Zotero")]), join(dir, "plugins"));
    expect(result).toEqual({ ok: true, gaps: [] });
  });

  test("uses the checkout's overrides in place of the data file's", async () => {
    const stale = { ...record("short@example.org", "Notes", "Custom rename pdf"), overrides: [OVERRIDE] };
    writeIndex("fixed@example.org", { schemaVersion: 1, overrides: [OVERRIDE] });
    const result = await findGaps(
      writeData([stale, record("fixed@example.org", "Notes", "Custom rename pdf")]),
      join(dir, "plugins"),
    );
    expect(result).toEqual({ ok: true, gaps: [{ id: "short@example.org", gap: "short", shown: "Custom rename pdf" }] });
  });

  test.each<[string, (path: string) => void, RegExp]>([
    ["a missing file", () => {}, /^data-unreadable: .*plugins\.json: ENOENT/],
    ["a file that is not JSON", (path) => writeFileSync(path, "{"), /^data-not-json: /],
    ["a file the v1 schema refuses", (path) => writeFileSync(path, JSON.stringify({ schemaVersion: 1, plugins: [] })), /^data-invalid: .*generatedAt/],
  ])("refuses %s", async (_name, write, message) => {
    const path = join(dir, "plugins.json");
    write(path);
    const result = await findGaps(path, join(dir, "plugins"));
    expect(!result.ok && result.message).toMatch(message);
  });

  test.each<[string, unknown, RegExp]>([
    ["is not JSON", "{", /^entry-not-json: .*index\.json/],
    ["fails its schema", { schemaVersion: 2, overrides: [] }, /^entry-invalid: .*index\.json/],
  ])("refuses an index.json that %s", async (_name, index, message) => {
    writeIndex("a@example.org", index);
    const result = await findGaps(writeData([record("a@example.org", "Notes", LONG)]), join(dir, "plugins"));
    expect(!result.ok && result.message).toMatch(message);
  });

  test("refuses an index.json it cannot read", async () => {
    mkdirSync(join(dir, "plugins", "a@example.org", "index.json"), { recursive: true });
    const result = await findGaps(writeData([record("a@example.org", "Notes", LONG)]), join(dir, "plugins"));
    expect(!result.ok && result.message).toMatch(/^entry-unreadable: .*index\.json: EISDIR/);
  });
});

describe("pnpm description-gaps", () => {
  const run = promisify(execFile);

  test("prints each gap on one line and exits 0", async () => {
    const data = writeData([
      record("blank@example.org", "Blank", undefined),
      record("short@example.org", "Notes", "Custom\trename\n pdf"),
    ]);
    const { stdout } = await run(process.execPath, [CLI, data], { cwd: dir, env: { PATH: process.env.PATH } });
    expect(stdout).toBe("blank@example.org\tmissing\nshort@example.org\tshort\tCustom rename pdf\ndescription gaps: 2\n");
  });

  test("reads the checkout's entries from another directory", async () => {
    // pdfrename@theigrams.com has a description override in the checkout's plugins/.
    const data = writeData([record("pdfrename@theigrams.com", "PDF Rename", "Custom rename pdf")]);
    const { stdout } = await run(process.execPath, [CLI, data], { cwd: dir, env: { PATH: process.env.PATH } });
    expect(stdout).toBe("description gaps: 0\n");
  });

  test("exits 1 with the cause for a file it cannot read", async () => {
    const failed = run(process.execPath, [CLI, join(dir, "none.json")], { cwd: dir, env: { PATH: process.env.PATH } });
    await expect(failed).rejects.toMatchObject({ code: 1, stderr: expect.stringMatching(/^data-unreadable: /) });
  });
});
