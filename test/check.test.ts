import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

// pnpm sets npm_execpath to its own binary when it runs `pnpm test`.
function runCheck(root: string, cwd?: string) {
  const pnpm = process.env.npm_execpath;
  if (!pnpm) throw new Error("run the tests with `pnpm test`, so they can call `pnpm check`");
  // Drop the outer run's INIT_CWD, so pnpm sets it from cwd as it does for a user.
  const { INIT_CWD: _outer, ...env } = process.env;
  const result = spawnSync(pnpm, ["--silent", "check", root], { encoding: "utf8", cwd, env, timeout: 50_000 });
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

describe("pnpm check <root>", () => {
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

  test("resolves a relative <dir> against the directory pnpm was run from", () => {
    const result = runCheck(".", VALID);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("checked 2 entries");
  });

  test("skips dot-directories such as .idea", () => {
    const root = treeWith(() => {});
    mkdirSync(join(root, ".idea"));
    const result = runCheck(root);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("checked 2 entries");
  });

  test("files-present: an entry without meta.json", () => {
    const result = expectOnlyRule(treeWith((dir) => rmSync(join(dir, "meta.json"))), "files-present");
    expect(result.stdout).toContain("missing meta.json");
  });

  test("files-present: a meta.json that cannot be read", () => {
    const root = treeWith((dir) => {
      rmSync(join(dir, "meta.json"));
      mkdirSync(join(dir, "meta.json"));
    });
    const result = expectOnlyRule(root, "files-present");
    expect(result.stdout).toContain("cannot read meta.json");
  });

  test("registry-schema: a meta.json that is not valid JSON", () => {
    const root = treeWith((dir) => writeFileSync(join(dir, "meta.json"), "{ not json"));
    const result = expectOnlyRule(root, "registry-schema");
    expect(result.stdout).toContain("meta.json is not valid JSON");
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

  // The README documents each of these limits on an override.
  test.each([
    ["a field outside the listed facts", { field: "version_name", value: "x", reason: "r" }, "/overrides/0/field"],
    ["an empty value", { field: "name", value: "", reason: "r" }, "/overrides/0/value"],
    ["an empty reason", { field: "name", value: "x", reason: "" }, "/overrides/0/reason"],
  ])("index-schema: an override with %s", (_name, override, path) => {
    const root = treeWith((dir) => editJson(join(dir, "index.json"), (index) => (index.overrides = [override])));
    const result = expectOnlyRule(root, "index-schema");
    expect(result.stdout).toContain(path);
  });

  test.each(["Chinese (China)", "zh-CN,,en", "abcd", "en-u-ca-gregory", "UND"])(
    "index-schema: a languages override with the value %j",
    (value) => {
      const root = treeWith((dir) =>
        editJson(join(dir, "index.json"), (index) => (index.overrides = [{ field: "languages", value, reason: "r" }])),
      );
      const result = expectOnlyRule(root, "index-schema");
      expect(result.stdout).toContain("/overrides/0/value");
    },
  );

  test("passes a languages override with the value zh-CN, en-US", () => {
    const root = treeWith((dir) =>
      editJson(join(dir, "index.json"), (index) => (index.overrides = [{ field: "languages", value: "zh-CN, en-US", reason: "r" }])),
    );
    expect(runCheck(root).status).toBe(0);
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
