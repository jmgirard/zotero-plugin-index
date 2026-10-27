// The home page's language filter. The page's script imports it, so it has no imports.

// Whether the home list shows a row while the language menu has value. rowLanguages is the
// row's data-languages, its language subtags joined by spaces, and options are the menu's
// values. "" (All languages) and a value that no option has show every row.
export function rowShows(rowLanguages: string, value: string, options: readonly string[]): boolean {
  if (value === "" || !options.includes(value)) return true;
  return rowLanguages.split(" ").includes(value);
}

// The menu value for the page's language parameter: the parameter when an option has it,
// else "" (All languages).
export function menuValue(asked: string | null, options: readonly string[]): string {
  return asked !== null && options.includes(asked) ? asked : "";
}

// The page's address with its language parameter set to value, or with the parameter
// removed when value is "". An address that already says so comes back unchanged.
// Otherwise the query is written again, so the other parameters keep their values but not
// always their spelling, such as %20 for +.
export function filterHref(href: string, value: string): string {
  const url = new URL(href);
  if (value ? url.searchParams.get("language") === value : !url.searchParams.has("language")) return href;
  if (value) url.searchParams.set("language", value);
  else url.searchParams.delete("language");
  return url.href;
}
