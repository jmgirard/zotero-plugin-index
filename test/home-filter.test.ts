import { describe, expect, test } from "vitest";
import {
  chosenPage,
  chosenValue,
  filterHref,
  filterOn,
  filterStatus,
  onPage,
  pageCount,
  passes,
  prePaintStyle,
  rowShows,
} from "../src/site/home-filter.ts";
import { PRE_PAINT_CASES } from "./support/pre-paint.ts";

const LANGUAGES = ["", "de", "en", "zh"];
const MAJORS = ["", "7", "8", "9", "10"];
const SLUGS = ["", "ai", "notes", "translation"];

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
    ["Any", "7", "", true],
    ["a row with no majors", "", "8", false],
    ["a row that lists only other majors", "7 8", "10", false],
    ["a major against a row that lists only 10", "10", "7", false],
    ["a value that no button has", "7", "6", true],
  ])("version: %s", (_, row, value, shows) => {
    expect(passes(row, { value, options: MAJORS })).toBe(shows);
  });
});

describe("rowShows", () => {
  const row = { languages: "en zh", zotero: "8 9", categories: "ai notes", name: "Better Notes", description: "Edits PDF annotations." };
  const ANY = { value: "", options: LANGUAGES };
  const ANY_MAJOR = { value: "", options: MAJORS };
  const ANY_CATEGORY = { value: "", options: SLUGS };

  test.each([
    ["both filters pass", "zh", "9", true],
    ["only the language passes", "zh", "7", false],
    ["only the version passes", "de", "8", false],
  ])("%s", (_, language, zotero, shows) => {
    expect(rowShows(row, { value: language, options: LANGUAGES }, { value: zotero, options: MAJORS }, "", ANY_CATEGORY)).toBe(shows);
  });

  test.each([
    ["a category the row has", "notes", "", "", true],
    ["a category the row lacks", "translation", "", "", false],
    ["a category the row has, with a language it lacks", "notes", "de", "", false],
    ["a category the row lacks, with a language it has", "translation", "zh", "", false],
    ["a category the row has, with a major it lacks", "ai", "", "7", false],
    ["a value that no option has", "xx", "", "", true],
  ])("category: %s", (_, category, language, zotero, shows) => {
    const filters = [{ value: language, options: LANGUAGES }, { value: zotero, options: MAJORS }] as const;
    expect(rowShows(row, ...filters, "", { value: category, options: SLUGS })).toBe(shows);
  });

  test("category: a matching query still hides a row that the category menu hides", () => {
    expect(rowShows(row, ANY, ANY_MAJOR, "notes", { value: "translation", options: SLUGS })).toBe(false);
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
  ])("search: %s", (_, query, shows) => {
    expect(rowShows(row, ANY, ANY_MAJOR, query, ANY_CATEGORY)).toBe(shows);
  });

  test("search: a matching query still hides a row that the version buttons hide", () => {
    expect(rowShows(row, ANY, { value: "7", options: MAJORS }, "notes", ANY_CATEGORY)).toBe(false);
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

  test.each([
    ["no language parameter", `${PAGE}?q=a%20b&a`, "language", ""],
    ["the language parameter already set", `${PAGE}?q=a%20b&language=zh`, "language", "zh"],
  ])("leaves an address with %s unchanged", (_, href, name, value) => {
    expect(filterHref(href, name, value)).toBe(href);
  });
});

describe("the home table's pages", () => {
  test.each([
    [0, 1],
    [1, 1],
    [50, 1],
    [51, 2],
    [100, 2],
    [101, 3],
    [272, 6],
  ])("%i passed rows fill %i pages of 50", (passed, pages) => {
    expect(pageCount(passed)).toBe(pages);
  });

  // The indexes of the rows on a page, out of 272 passed rows.
  const rowsOn = (page: number) => [...Array(272).keys()].filter((i) => onPage(i, page));

  test.each([
    [1, 0, 49],
    [3, 100, 149],
    [6, 250, 271],
  ])("page %i of 272 rows holds rows %i to %i", (page, first, last) => {
    const rows = rowsOn(page);
    expect([rows[0], rows.at(-1), rows.length]).toEqual([first, last, last - first + 1]);
  });

  test.each([
    ["2", 6, 2],
    ["6", 6, 6],
    [null, 6, 1],
    ["1", 6, 1],
    ["", 6, 1],
    ["0", 6, 1],
    ["-2", 6, 1],
    ["x", 6, 1],
    ["02", 6, 1],
    ["2.0", 6, 1],
    ["7", 6, 1],
  ])("reads the page parameter %j over %i pages as page %i", (asked, pages, page) => {
    expect(chosenPage(asked, pages)).toBe(page);
  });
});

describe("prePaintStyle", () => {
  test.each(PRE_PAINT_CASES)("writes the style for %j", (search, style) => {
    expect(prePaintStyle(search, 50)).toBe(style);
  });
});
