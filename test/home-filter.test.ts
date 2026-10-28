import { describe, expect, test } from "vitest";
import { chosenValue, filterHref, passes, rowShows } from "../src/site/home-filter.ts";

const LANGUAGES = ["", "de", "en", "zh"];
const MAJORS = ["", "7", "8", "9", "10"];

describe("passes", () => {
  test.each([
    ["a subtag the row carries", "en zh", "zh", true],
    ["All languages", "en zh", "", true],
    ["a row with no subtags", "", "en", false],
    ["en against a row that carries only ken", "ken", "en", false],
    ["a row whose match is not its first subtag", "de en zh", "zh", true],
    ["a value that no option has", "en", "xx", true],
  ])("language: %s", (_, row, value, shows) => {
    expect(passes(row, { value, options: LANGUAGES })).toBe(shows);
  });

  test.each([
    ["a major the row lists", "7 8 9", "8", true],
    ["Any version", "7", "", true],
    ["Any version on a row with no majors", "", "", true],
    ["a row with no majors", "", "8", false],
    ["a row that lists only other majors", "7 8", "10", false],
    ["a major against a row that lists only 10", "10", "7", false],
    ["a value that no button has", "7", "6", true],
  ])("version: %s", (_, row, value, shows) => {
    expect(passes(row, { value, options: MAJORS })).toBe(shows);
  });
});

describe("rowShows", () => {
  const row = { languages: "en zh", zotero: "8 9" };

  test.each([
    ["both filters pass", "zh", "9", true],
    ["only the language passes", "zh", "7", false],
    ["only the version passes", "de", "8", false],
    ["neither passes", "de", "10", false],
    ["both are at their all value", "", "", true],
  ])("%s", (_, language, zotero, shows) => {
    expect(rowShows(row, { value: language, options: LANGUAGES }, { value: zotero, options: MAJORS })).toBe(shows);
  });
});

describe("chosenValue", () => {
  test.each([
    ["a language option's value", "zh", LANGUAGES, "zh"],
    ["a language no option has", "xx", LANGUAGES, ""],
    ["a major a button has", "10", MAJORS, "10"],
    ["a major no button has", "6", MAJORS, ""],
    ["no parameter", null, MAJORS, ""],
  ])("chooses %s", (_, asked, options, value) => {
    expect(chosenValue(asked, options)).toBe(value);
  });
});

describe("filterHref", () => {
  const PAGE = "http://localhost:4321/zotero-plugin-index/";

  test("sets the language parameter and keeps the path and the other parameters", () => {
    expect(filterHref(`${PAGE}?a=1&language=en`, "language", "zh")).toBe(`${PAGE}?a=1&language=zh`);
  });

  test("removes the language parameter for All languages", () => {
    expect(filterHref(`${PAGE}?language=zh`, "language", "")).toBe(PAGE);
  });

  test("sets the zotero parameter and keeps the language parameter", () => {
    expect(filterHref(`${PAGE}?language=zh`, "zotero", "8")).toBe(`${PAGE}?language=zh&zotero=8`);
    expect(filterHref(`${PAGE}?zotero=7&language=zh`, "zotero", "10")).toBe(`${PAGE}?zotero=10&language=zh`);
  });

  test.each([
    ["Any version", "8"],
    ["a value no button has", "6"],
  ])("removes the zotero parameter for %s and keeps the language parameter", (_, held) => {
    expect(filterHref(`${PAGE}?zotero=${held}&language=zh`, "zotero", "")).toBe(`${PAGE}?language=zh`);
  });

  test.each([
    ["no language parameter", `${PAGE}?q=a%20b&a`, "language", ""],
    ["the language parameter already set", `${PAGE}?q=a%20b&language=zh`, "language", "zh"],
    ["the zotero parameter already set", `${PAGE}?q=a%20b&zotero=9`, "zotero", "9"],
  ])("leaves an address with %s unchanged", (_, href, name, value) => {
    expect(filterHref(href, name, value)).toBe(href);
  });
});
