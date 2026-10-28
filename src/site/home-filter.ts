// The home page's filters: the language menu and the Zotero version buttons. The page's
// script imports it, so it has no imports.

// One filter's state: its chosen value and the values its menu or buttons offer.
export interface Filter {
  value: string;
  options: readonly string[];
}

// Whether a filter passes a row. list is the row's data-languages or data-zotero, its values
// joined by spaces. "" (All languages, Any version) and a value that no option has pass
// every row.
export function passes(list: string, filter: Filter): boolean {
  if (filter.value === "" || !filter.options.includes(filter.value)) return true;
  return list.split(" ").includes(filter.value);
}

// Whether the home list shows a row: when both the language menu and the version buttons
// pass it.
export function rowShows(row: { languages: string; zotero: string }, language: Filter, zotero: Filter): boolean {
  return passes(row.languages, language) && passes(row.zotero, zotero);
}

// The chosen value for an address parameter: the parameter when an option has it, else ""
// (All languages, Any version).
export function chosenValue(asked: string | null, options: readonly string[]): string {
  return asked !== null && options.includes(asked) ? asked : "";
}

// The text of the line under the filters: "" when no filter is on, else how many of the
// list's total rows the filters show, or that none match.
export function filterStatus(shown: number, total: number, filtering: boolean): string {
  if (!filtering) return "";
  if (shown === 0) return "No plugins match these filters.";
  return `Showing ${shown} of ${total} ${total === 1 ? "plugin" : "plugins"}.`;
}

// The page's address with parameter name set to value, or with the parameter removed when
// value is "". An address that already says so comes back unchanged. Otherwise the query is
// written again, so the other parameters keep their values but not always their spelling,
// such as %20 for +.
export function filterHref(href: string, name: string, value: string): string {
  const url = new URL(href);
  if (value ? url.searchParams.get(name) === value : !url.searchParams.has(name)) return href;
  if (value) url.searchParams.set(name, value);
  else url.searchParams.delete(name);
  return url.href;
}
