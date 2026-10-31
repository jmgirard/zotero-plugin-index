import { execFile } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, renameSync, rmSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { treeDigest } from "../src/build/digest.ts";

const CLI = join(import.meta.dirname, "..", "src", "build", "digest-cli.ts");
const USAGE = "usage: pnpm data-digest --dir <dir> [--expect <sha256>]";
const run = promisify(execFile);

let root: string;
let tree: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "zpi-digest-"));
  tree = join(root, "dist");
  mkdirSync(join(tree, "v1"), { recursive: true });
  mkdirSync(join(tree, "schemas"));
  writeFileSync(join(tree, "v1", "plugins.json"), '{"plugins":[]}\n');
  writeFileSync(join(tree, "schemas", "plugins.v1.schema.json"), "{}\n");
  writeFileSync(join(tree, "empty"), "");
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

async function digest(dir: string): Promise<string> {
  const result = await treeDigest(dir);
  if (!result.ok) throw new Error(result.message);
  return result.sha256;
}

function cli(args: string[]) {
  return run(process.execPath, [CLI, ...args], { cwd: root, env: { PATH: process.env.PATH } });
}

describe("treeDigest", () => {
  test("gives the same value for a copy at another path with other file times", async () => {
    const copy = join(root, "elsewhere", "copy");
    cpSync(tree, copy, { recursive: true });
    utimesSync(join(copy, "v1", "plugins.json"), new Date(2001, 0, 1), new Date(2001, 0, 1));
    utimesSync(join(copy, "v1"), new Date(2002, 0, 1), new Date(2002, 0, 1));
    expect(await digest(copy)).toBe(await digest(tree));
  });

  test.each<[string, (dir: string) => void]>([
    ["one changed byte", (dir) => writeFileSync(join(dir, "v1", "plugins.json"), '{"plugins":[]}\r')],
    ["an added file", (dir) => writeFileSync(join(dir, "index.html"), "")],
    ["a removed file", (dir) => rmSync(join(dir, "schemas", "plugins.v1.schema.json"))],
    ["a renamed file with the same bytes", (dir) => renameSync(join(dir, "v1", "plugins.json"), join(dir, "v1", "plugin.json"))],
    ["a file moved into another directory", (dir) => renameSync(join(dir, "v1", "plugins.json"), join(dir, "schemas", "plugins.json"))],
    ["an added empty directory", (dir) => mkdirSync(join(dir, "plugins"))],
    [
      "an empty file replaced by an empty directory of the same name",
      (dir) => {
        rmSync(join(dir, "empty"));
        mkdirSync(join(dir, "empty"));
      },
    ],
  ])("gives another value after %s", async (_name, change) => {
    const before = await digest(tree);
    change(tree);
    expect(await digest(tree)).not.toBe(before);
  });

  test("frames each entry, so file a holding bc differs from file ab holding c", async () => {
    const first = join(root, "first");
    const second = join(root, "second");
    mkdirSync(first);
    mkdirSync(second);
    writeFileSync(join(first, "a"), "bc");
    writeFileSync(join(second, "ab"), "c");
    expect(await digest(first)).not.toBe(await digest(second));
  });

  test.each<[string, (dir: string) => Promise<void> | void, string]>([
    ["a symbolic link to a file", (dir) => symlinkSync(join(dir, "empty"), join(dir, "v1", "link")), "v1/link"],
    ["a symbolic link to a directory", (dir) => symlinkSync("/", join(dir, "schemas", "root"), "dir"), "schemas/root"],
    [
      "a named pipe",
      async (dir) => {
        await run("mkfifo", [join(dir, "pipe")]);
      },
      "pipe",
    ],
  ])("refuses %s and names it", async (_name, plant, path) => {
    await plant(tree);
    expect(await treeDigest(tree)).toEqual({ ok: false, message: `not a file or directory: ${JSON.stringify(path)}` });
  });
});

describe("pnpm data-digest", () => {
  test("prints one SHA-256 line and exits 0", async () => {
    const { stdout } = await cli(["--dir", tree]);
    expect(stdout).toMatch(/^[0-9a-f]{64}\n$/);
    expect(stdout).toBe(`${await digest(tree)}\n`);
  });

  test("exits 0 when --expect matches", async () => {
    const sha256 = await digest(tree);
    const { stdout } = await cli(["--dir", tree, "--expect", sha256]);
    expect(stdout).toBe(`data digest matches: ${sha256}\n`);
  });

  test("exits 1 and names both values when --expect differs", async () => {
    const sha256 = await digest(tree);
    const expected = "0".repeat(64);
    await expect(cli(["--dir", tree, "--expect", expected])).rejects.toMatchObject({
      code: 1,
      stdout: "",
      stderr: `data digest ${sha256} differs from the expected ${expected}\n`,
    });
  });

  test("prints no digest and exits 1 for a tree with a symbolic link", async () => {
    symlinkSync(join(tree, "empty"), join(tree, "link"));
    await expect(cli(["--dir", tree])).rejects.toMatchObject({ code: 1, stdout: "", stderr: 'not a file or directory: "link"\n' });
  });

  test.each<[string, string[], RegExp]>([
    ["no --dir", [], new RegExp(`^${USAGE.replaceAll(/[[\]]/g, "\\$&")}\\n$`)],
    ["an unknown option", ["--dir", "dist", "--out", "x"], /^Unknown option '--out'[^\n]*\nusage: pnpm data-digest /],
    ["a positional argument", ["--dir", "dist", "extra"], /^Unexpected argument 'extra'[^\n]*\nusage: pnpm data-digest /],
    ["an --expect value that is not 64 lowercase hex digits", ["--dir", "dist", "--expect", "A".repeat(64)], /^--expect must be 64 lowercase hex digits\nusage: pnpm data-digest /],
    ["a --dir that is not a directory", ["--dir", "dist/empty"], /^not a directory: "[^"]*dist\/empty"\nusage: pnpm data-digest /],
    ["a --dir that does not exist", ["--dir", "none"], /^not a directory: "[^"]*none"\nusage: pnpm data-digest /],
  ])("exits 1 with its usage line for %s", async (_name, args, stderr) => {
    await expect(cli(args)).rejects.toMatchObject({ code: 1, stdout: "", stderr: expect.stringMatching(stderr) });
  });
});
