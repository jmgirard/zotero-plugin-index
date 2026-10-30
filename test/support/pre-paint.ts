// Search strings and the style that prePaintStyle writes for each at a page size of 50. The
// unit tests check the styles, and the site tests run the built page's classic script on the
// same search strings.
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

export const PRE_PAINT_CASES: [search: string, style: string][] = [
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
];
