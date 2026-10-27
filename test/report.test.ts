import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { parseReport, REPORT_LABELS } from "../src/reports/report.ts";

const ROOT = resolve(import.meta.dirname, "..");
const IDS = new Set(["alpha@example.org", "beta@example.org"]);

// The body GitHub writes for an issue opened from works.yml or broken.yml: the markdown
// block is left out, and each input's label becomes a level-3 heading over the value.
function rendered(values: { plugin?: string; version?: string; zotero?: string }): string {
  return (["plugin", "version", "zotero"] as const)
    .filter((id) => values[id] !== undefined)
    .map((id) => `### ${REPORT_LABELS[id]}\n\n${values[id]}`)
    .join("\n\n");
}

const valid = { plugin: "alpha@example.org", version: "1.2.0", zotero: "7.0.11" };

describe("the report forms", () => {
  test.each([
    ["works.yml", "works"],
    ["broken.yml", "broken"],
  ])("%s has the three required inputs, the labels, and the headings parseReport reads", (file, verdict) => {
    const form = readFileSync(resolve(ROOT, ".github/ISSUE_TEMPLATE", file), "utf8");
    expect(form).toMatch(new RegExp(`^labels: \\["report", "${verdict}"\\]$`, "m"));
    const inputs = form.split(/^ {2}- type: input$/m).slice(1);
    expect(inputs.map((block) => block.match(/^ {4}id: (\w+)$/m)?.[1])).toEqual(["plugin", "version", "zotero"]);
    for (const block of inputs) {
      const id = block.match(/^ {4}id: (\w+)$/m)![1] as keyof typeof REPORT_LABELS;
      expect(block).toMatch(new RegExp(`^ {6}label: ${REPORT_LABELS[id]}$`, "m"));
      expect(block).toMatch(/^ {6}required: true$/m);
    }
  });
});

describe("parseReport", () => {
  test("reads a report from each form, taking the first number of the Zotero version as the major", () => {
    expect(parseReport(rendered(valid), ["report", "works"], IDS)).toEqual({
      ok: true,
      report: { plugin: "alpha@example.org", version: "1.2.0", zoteroMajor: 7, verdict: "works" },
    });
    expect(parseReport(rendered({ ...valid, zotero: "Zotero 10.0.1" }), ["broken", "report"], IDS)).toEqual({
      ok: true,
      report: { plugin: "alpha@example.org", version: "1.2.0", zoteroMajor: 10, verdict: "broken" },
    });
  });

  test.each(["plugin", "version", "zotero"] as const)("names a missing heading for the %s input", (id) => {
    const body = rendered({ ...valid, [id]: undefined });
    expect(parseReport(body, ["report", "works"], IDS)).toEqual({
      ok: false,
      problem: "missing-heading",
      message: expect.stringContaining(`### ${REPORT_LABELS[id]}`),
    });
  });

  test.each(["plugin", "version", "zotero"] as const)("names an empty %s input", (id) => {
    const body = rendered({ ...valid, [id]: "_No response_" });
    expect(parseReport(body, ["report", "works"], IDS)).toEqual({
      ok: false,
      problem: "no-response",
      message: expect.stringContaining(REPORT_LABELS[id]),
    });
  });

  test("names a plugin id that no entry has", () => {
    expect(parseReport(rendered({ ...valid, plugin: "gamma@example.org" }), ["report", "works"], IDS)).toMatchObject({
      ok: false,
      problem: "unknown-plugin",
    });
  });

  test.each([
    ["longer than 100 characters", "1".repeat(101)],
    ["with whitespace", "1.2 beta"],
  ])("names a plugin version %s", (_, version) => {
    expect(parseReport(rendered({ ...valid, version }), ["report", "works"], IDS)).toMatchObject({
      ok: false,
      problem: "bad-plugin-version",
    });
  });

  test("takes a plugin version of 100 characters", () => {
    expect(parseReport(rendered({ ...valid, version: "1".repeat(100) }), ["report", "works"], IDS)).toMatchObject({ ok: true });
  });

  test.each([
    ["with no number", "latest"],
    ["below 7", "6.0.30"],
    ["above the newest major with a pill", "11.0"],
  ])("names a Zotero version %s", (_, zotero) => {
    expect(parseReport(rendered({ ...valid, zotero }), ["report", "works"], IDS)).toMatchObject({
      ok: false,
      problem: "bad-zotero-version",
    });
  });

  test.each([
    ["both verdict labels", ["report", "works", "broken"]],
    ["neither verdict label", ["report"]],
  ])("names a label set with %s", (_, labels) => {
    expect(parseReport(rendered(valid), labels, IDS)).toMatchObject({ ok: false, problem: "bad-verdict" });
  });
});
