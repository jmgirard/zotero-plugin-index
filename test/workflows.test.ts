import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const ROOT = resolve(import.meta.dirname, "..");
const BUILD = resolve(ROOT, ".github/workflows/build.yml");

// Each line of a workflow, other than a comment line, that uses an actions/cache action or
// sets a `cache` key, in block or flow form. An inline comment stays in its line, so a
// value that holds ` #` cannot hide a key after it. GitHub hands an input to a JavaScript
// or Docker action as an upper-case `INPUT_<NAME>` variable, so the key match ignores
// case. The `uses` match ignores case too, as a precaution: GitHub's docs do not say how
// it matches action names.
function cacheLines(text: string): string[] {
  const uses = /uses\s*:\s*["']?actions\/cache(?:\/(?:restore|save))?@/i;
  const key = /(?:^|[\s{,])["']?cache["']?\s*:/i;
  return text
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("#"))
    .filter((line) => uses.test(line) || key.test(line));
}

// The text of one job, from its `  <id>:` line to the next job's.
function jobText(text: string, id: string): string {
  const start = text.indexOf(`\n  ${id}:\n`);
  const next = text.slice(start + 1).search(/\n {2}[\w-]+:\n/);
  return next < 0 ? text.slice(start) : text.slice(start, start + 1 + next);
}

describe("build.yml", () => {
  const build = readFileSync(BUILD, "utf8");

  test("has no cache step and no cache key", () => {
    expect(cacheLines(build)).toEqual([]);
  });

  test("sets cache-mode none on the build job", () => {
    expect(jobText(build, "build")).toMatch(/^ {4}cache-mode: none$/m);
  });

  test.each([
    ["a block cache key", "          cache: pnpm"],
    ["a flow cache key", "        with: {node-version: 24,cache: pnpm}"],
    ["a quoted cache key", '        with: {"cache": pnpm}'],
    ["actions/cache", "      - uses: actions/cache@v6"],
    ["actions/cache/restore", "      - uses: actions/cache/restore@v6"],
    ["actions/cache/save", "      - uses: Actions/Cache/Save@v6"],
  ])("finds %s", (_name, line) => {
    expect(cacheLines(`steps:\n${line}\n`)).toEqual([line]);
  });

  test("leaves other keys and comments alone", () => {
    const text = [
      "          package-manager-cache: false",
      "          cache-dependency-path: pnpm-lock.yaml",
      "      # No dependency cache: cache: pnpm would restore one.",
      "      - uses: actions/upload-artifact@v7",
    ].join("\n");
    expect(cacheLines(text)).toEqual([]);
  });
});
