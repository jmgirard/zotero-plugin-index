import { describe, expect, test } from "vitest";
import { appliedLanguages, languageName, languageOptions, rowLanguages, type LanguageRecord } from "../src/site/languages.ts";

function record(languages: string[] | undefined, overrides: LanguageRecord["overrides"] = []): LanguageRecord {
  return { upstream: { version: "2.0.0", ...(languages && { languages }) }, overrides };
}

describe("appliedLanguages", () => {
  test("is the upstream list when no override applies", () => {
    expect(appliedLanguages(record(["en-US", "zh-CN"]))).toEqual(["en-US", "zh-CN"]);
  });

  test("is empty for a record with no upstream block or no languages field", () => {
    expect(appliedLanguages({ overrides: [] })).toEqual([]);
    expect(appliedLanguages(record(undefined))).toEqual([]);
  });

  test("splits the override that applies, in its own order", () => {
    const languages = record(["en"], [
      { field: "languages", value: "es" },
      { field: "languages", version: "2.0.0", value: "pt-BR, es-419" },
      { field: "languages", version: "1.0.0", value: "ja" },
    ]);
    expect(appliedLanguages(languages)).toEqual(["pt-BR", "es-419"]);
  });

  test("writes each override tag in canonical form, once", () => {
    expect(appliedLanguages(record([], [{ field: "languages", value: "ZH-cn, zh-CN, fr" }]))).toEqual(["zh-CN", "fr"]);
  });
});

describe("languageName", () => {
  test("names a tag with its region", () => {
    expect(languageName("zh-TW")).toBe("Chinese (Taiwan)");
  });
});

describe("rowLanguages", () => {
  test("is each language subtag once, in code-unit order", () => {
    expect(rowLanguages(record(["zh-TW", "en-US", "zh-CN"]))).toBe("en zh");
  });
});

describe("languageOptions", () => {
  test("counts each subtag once per row and sorts by count, then by name", () => {
    const records = [record(["es", "zh-CN", "zh-TW"]), record(["fr", "de", "es"]), record(["fr-CA"]), record([])];
    expect(languageOptions(records)).toEqual([
      { value: "fr", text: "French (2)" },
      { value: "es", text: "Spanish (2)" },
      { value: "zh", text: "Chinese (1)" },
      { value: "de", text: "German (1)" },
    ]);
  });
});
