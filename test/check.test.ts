import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";

const VALID = "test/fixtures/check/valid";
const ENTRY = "first-plugin@example.org";

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "zpi-check-"));
  temps.push(dir);
  return dir;
}

// A copy of the valid tree whose ENTRY is changed by `edit`.
function treeWith(edit: (entryDir: string) => void): string {
  const root = tempDir();
  cpSync(VALID, root, { recursive: true });
  edit(join(root, ENTRY));
  return root;
}

function editJson(path: string, change: (value: Record<string, unknown>) => void) {
  const value = JSON.parse(readFileSync(path, "utf8"));
  change(value);
  writeFileSync(path, JSON.stringify(value));
}

function runCheck(root: string) {
  const result = spawnSync("node", ["src/check/cli.ts", root], { encoding: "utf8" });
  const findings = result.stdout
    .split("\n")
    .filter((line) => line.includes(": "))
    .filter((line) => !line.startsWith("checked "))
    .map((line) => {
      const [entry, rule] = line.split(": ");
      return { entry, rule };
    });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr, findings };
}

function expectOnlyRule(root: string, rule: string) {
  const result = runCheck(root);
  expect(result.status).toBe(1);
  expect(result.findings.length).toBeGreaterThan(0);
  expect(result.findings).toEqual(result.findings.map(() => ({ entry: ENTRY, rule })));
  return result;
}

describe("check CLI (node src/check/cli.ts <root>)", () => {
  test("passes a tree of valid entries", () => {
    const result = runCheck(VALID);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("checked 2 entries");
  });

  test.each([
    ["an empty directory", () => tempDir()],
    ["a missing path", () => join(tempDir(), "plugins")],
  ])("passes %s with zero entries checked", (_name, makeRoot) => {
    const result = runCheck(makeRoot());
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("checked 0 entries");
  });

  test("files-present: an entry without index.json", () => {
    expectOnlyRule(treeWith((dir) => rmSync(join(dir, "index.json"))), "files-present");
  });

  test("registry-schema: meta.json without the required updateUrl", () => {
    const root = treeWith((dir) => editJson(join(dir, "meta.json"), (meta) => delete meta.updateUrl));
    expectOnlyRule(root, "registry-schema");
  });

  test("registry-schema: meta.json with a field the registry does not define", () => {
    const root = treeWith((dir) => editJson(join(dir, "meta.json"), (meta) => (meta.downloads = 5)));
    const result = expectOnlyRule(root, "registry-schema");
    expect(result.stdout).toContain('field "downloads" that the schema does not define');
  });

  test("index-schema: index.json with an unknown schema version", () => {
    const root = treeWith((dir) => editJson(join(dir, "index.json"), (index) => (index.schemaVersion = 2)));
    expectOnlyRule(root, "index-schema");
  });

  test("id-matches-directory: meta.json id differs from the directory", () => {
    const root = treeWith((dir) => editJson(join(dir, "meta.json"), (meta) => (meta.id = "other@example.org")));
    expectOnlyRule(root, "id-matches-directory");
  });

  test.each([" ", " \t\n"])("reason-not-blank: reason %j", (reason) => {
    const root = treeWith((dir) =>
      editJson(join(dir, "index.json"), (index) => {
        index.overrides = [{ field: "name", value: "First", reason }];
      }),
    );
    expectOnlyRule(root, "reason-not-blank");
  });
});
