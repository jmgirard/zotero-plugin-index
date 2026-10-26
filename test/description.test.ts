import { describe, expect, test } from "vitest";
import { type DescriptionRecord, shownDescription } from "../src/site/description.ts";

function record(name: string, description: string | undefined, overrides: DescriptionRecord["overrides"] = []): DescriptionRecord {
  return { id: "a@example.org", upstream: { version: "2.0.0", name, description }, overrides };
}

describe("shownDescription", () => {
  test.each([
    ["Zotero OCR", "Zotero Plugin for OCR"],
    ["Scite Zotero Plugin (V7+)", "Scite Zotero Plugin (V7+)"],
    ["Zotero PDF Preview", "PDF Preview for Zotero."],
  ])("hides the name-only description of %s", (name, description) => {
    expect(shownDescription(record(name, description))).toBeUndefined();
  });

  test.each([
    ["ZotLit", "Zotero companion plugin for ZotLit"],
    ["Jasminum", "一个简单的 Zotero 中文插件"],
  ])("keeps the description of %s", (name, description) => {
    expect(shownDescription(record(name, description))).toBe(description);
  });

  test("hides a name-only description whose accents use another Unicode form", () => {
    expect(shownDescription(record("Café Notes", "Café Notes for Zotero"))).toBeUndefined();
  });

  test("hides a blank description", () => {
    expect(shownDescription(record("Zotero OCR", "  \n"))).toBeUndefined();
  });

  test("hides a missing description", () => {
    expect(shownDescription(record("Zotero OCR", undefined))).toBeUndefined();
  });

  test("shows a description override over a name-only description", () => {
    const corrected = record("Zotero OCR", "Zotero Plugin for OCR", [
      { field: "description", value: "Runs OCR on PDFs." },
    ]);
    expect(shownDescription(corrected)).toBe("Runs OCR on PDFs.");
  });

  test("ignores a description override for another plugin version", () => {
    const stale = record("Zotero OCR", "Zotero Plugin for OCR", [
      { field: "description", version: "1.0.0", value: "Runs OCR on PDFs." },
    ]);
    expect(shownDescription(stale)).toBeUndefined();
  });

  test("compares with the name after a name override", () => {
    const renamed = record("Zotero OCR", "OCR for Zotero", [{ field: "name", value: "Tesseract" }]);
    expect(shownDescription(renamed)).toBe("OCR for Zotero");
  });
});
