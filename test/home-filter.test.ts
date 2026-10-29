import { describe, expect, test } from "vitest";
import { chosenValue, filterHref, filterOn, filterStatus, passes, rowShows } from "../src/site/home-filter.ts";

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
    ["a row with no majors", "", "8", false],
    ["a row that lists only other majors", "7 8", "10", false],
    ["a major against a row that lists only 10", "10", "7", false],
    ["a value that no button has", "7", "6", true],
  ])("version: %s", (_, row, value, shows) => {
    expect(passes(row, { value, options: MAJORS })).toBe(shows);
  });
});

describe("rowShows", () => {
  const row = { languages: "en zh", zotero: "8 9", name: "Better Notes", description: "Edits PDF annotations." };
  const ANY = { value: "", options: LANGUAGES };
  const ANY_MAJOR = { value: "", options: MAJORS };

  test.each([
    ["both filters pass", "zh", "9", true],
    ["only the language passes", "zh", "7", false],
    ["only the version passes", "de", "8", false],
  ])("%s", (_, language, zotero, shows) => {
    expect(rowShows(row, { value: language, options: LANGUAGES }, { value: zotero, options: MAJORS }, "")).toBe(shows);
  });

  test.each([
    ["an empty query", "", true],
    ["a query of spaces only", "   ", true],
    ["part of the name", "ter no", true],
    ["part of the description only", "pdf annot", true],
    ["the name in another letter case", "BETTER", true],
    ["a query with outer spaces", "  notes ", true],
    ["text in neither", "zotfile", false],
    ["text that spans the name and the description", "notes edits", false],
    ["inner spaces that the name does not have", "better  notes", false],
  ])("search: %s", (_, query, shows) => {
    expect(rowShows(row, ANY, ANY_MAJOR, query)).toBe(shows);
  });

  test("search: a row with no description matches on its name only", () => {
    const bare = { ...row, description: "" };
    expect(rowShows(bare, ANY, ANY_MAJOR, "better")).toBe(true);
    expect(rowShows(bare, ANY, ANY_MAJOR, "pdf")).toBe(false);
  });

  test.each([
    ["the language fails", "de", "8", false],
    ["the version fails", "zh", "7", false],
    ["both pass", "zh", "8", true],
  ])("search: with a matching query, the row shows only if the other filters pass: %s", (_, language, zotero, shows) => {
    expect(rowShows(row, { value: language, options: LANGUAGES }, { value: zotero, options: MAJORS }, "notes")).toBe(shows);
  });
});

describe("chosenValue", () => {
  test.each([
    ["a major a button has", "10", "10"],
    ["a major no button has", "6", ""],
    ["no parameter", null, ""],
  ])("chooses %s", (_, asked, value) => {
    expect(chosenValue(asked, MAJORS)).toBe(value);
  });
});

describe("filterOn", () => {
  test.each([
    ["a value an option has", "zh", true],
    ["All languages", "", false],
    ["a value that no option has", "xx", false],
  ])("%s", (_, value, on) => {
    expect(filterOn({ value, options: LANGUAGES })).toBe(on);
  });
});

describe("filterStatus", () => {
  test.each([
    ["no filter is on", 42, 42, false, "42 plugins"],
    ["no filter is on and the table holds one row", 1, 1, false, "1 plugin"],
    ["a filter hides every row", 0, 42, true, "No plugins match these filters."],
    ["a filter shows some rows", 8, 42, true, "8 of 42 plugins"],
    ["the table holds one row", 1, 1, true, "1 of 1 plugin"],
  ])("says the count when %s", (_, shown, total, filtering, text) => {
    expect(filterStatus(shown, total, filtering)).toBe(text);
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
  });

  test.each([
    ["a major", "8"],
    ["a value no button has", "6"],
  ])("removes a held zotero parameter (%s) when the value is \"\" and keeps the language parameter", (_, held) => {
    expect(filterHref(`${PAGE}?zotero=${held}&language=zh`, "zotero", "")).toBe(`${PAGE}?language=zh`);
  });

  test("writes the search query to q and keeps the other parameters", () => {
    expect(filterHref(`${PAGE}?language=zh`, "q", "pdf notes")).toBe(`${PAGE}?language=zh&q=pdf+notes`);
  });

  test("removes q for an empty query and keeps the other parameters", () => {
    expect(filterHref(`${PAGE}?q=pdf&zotero=8`, "q", "")).toBe(`${PAGE}?zotero=8`);
  });

  test("reads back a query that it wrote", () => {
    const query = "café & co?";
    expect(new URL(filterHref(PAGE, "q", query)).searchParams.get("q")).toBe(query);
  });

  test.each([
    ["no language parameter", `${PAGE}?q=a%20b&a`, "language", ""],
    ["the language parameter already set", `${PAGE}?q=a%20b&language=zh`, "language", "zh"],
  ])("leaves an address with %s unchanged", (_, href, name, value) => {
    expect(filterHref(href, name, value)).toBe(href);
  });
});
