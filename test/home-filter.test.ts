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
  ])("search: %s", (_, query, shows) => {
    expect(rowShows(row, ANY, ANY_MAJOR, query)).toBe(shows);
  });

  test("search: a matching query still hides a row that the version buttons hide", () => {
    expect(rowShows(row, ANY, { value: "7", options: MAJORS }, "notes")).toBe(false);
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
  const R = ".plugins tbody tr";
  const css = (...rules: string[]) => rules.join("\n");
  const ALL = css(`${R}{display:none}`);
  const BARE = css(`${R}:nth-child(n+51){display:none}`, `${R}:nth-child(1){border-top:0!important}`);
  const PAGE_2 = css(
    `${R}:nth-child(-n+50){display:none}`,
    `${R}:nth-child(n+101){display:none}`,
    `${R}:nth-child(51){border-top:0!important}`,
  );
  const filtered = (s: string) =>
    css(`${R}:not(${s}){display:none}`, `${R}:nth-child(n+51 of ${s}){display:none}`, `${R}:nth-child(1 of ${s}){border-top:0!important}`);
  const filteredPage2 = (s: string) =>
    css(
      `${R}:not(${s}){display:none}`,
      `${R}:nth-child(-n+50 of ${s}){display:none}`,
      `${R}:nth-child(n+101 of ${s}){display:none}`,
      `${R}:nth-child(51 of ${s}){border-top:0!important}`,
    );
  const EN = '[data-languages~="en"]';
  const Z7 = '[data-zotero~="7"]';

  test.each([
    ["", BARE],
    ["?page=2", PAGE_2],
    ["?page=1", BARE],
    ["?page=02", BARE],
    ["?page=0", BARE],
    ["?page=-2", BARE],
    ["?page=2.0", BARE],
    ["?page=abc", BARE],
    ["?page=", BARE],
    [
      "?page=99",
      css(`${R}:nth-child(-n+4900){display:none}`, `${R}:nth-child(n+4951){display:none}`, `${R}:nth-child(4901){border-top:0!important}`),
    ],
    [
      "?page=999999",
      css(
        `${R}:nth-child(-n+49999900){display:none}`,
        `${R}:nth-child(n+49999951){display:none}`,
        `${R}:nth-child(49999901){border-top:0!important}`,
      ),
    ],
    ["?page=1234567", ALL],
    ["?page=2&page=3", PAGE_2],
    ["?language=en", filtered(EN)],
    ["?zotero=7", filtered(Z7)],
    ["?language=en&zotero=7", filtered(EN + Z7)],
    ["?language=en&page=2", filteredPage2(EN)],
    ["?zotero=7&page=2", filteredPage2(Z7)],
    ["?language=en&zotero=7&page=2", filteredPage2(EN + Z7)],
    ["?language=EN", filtered('[data-languages~="EN"]')],
    ["?language=zh-Hant", filtered('[data-languages~="zh-Hant"]')],
    ["?language=e%6E", filtered(EN)],
    ["?zotero=99", filtered('[data-zotero~="99"]')],
    ["?zotero=7&zotero=8", filtered(Z7)],
    ["?language=", BARE],
    ["?zotero=", BARE],
    ['?language=a"b', ALL],
    ["?language=a]b", ALL],
    ["?language=a%20b", ALL],
    ["?q", BARE],
    ["?q=", BARE],
    ["?q=+", BARE],
    ["?q=%20", BARE],
    ["?q=pdf", ALL],
    ["?q=pdf&page=2", ALL],
  ])("writes the style for %j", (search, style) => {
    expect(prePaintStyle(search, 50)).toBe(style);
  });
});
