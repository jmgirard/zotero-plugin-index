// The home page's filters: the search box, the language menu, the Zotero version buttons,
// and the plugin count beside them. The page's script imports it, so it has no imports.

// One filter's state: its chosen value and the values its menu or buttons offer.
export interface Filter {
  value: string;
  options: readonly string[];
}

// Whether a filter is on: its value is not "" (All languages, Any) and an option
// has it.
export function filterOn(filter: Filter): boolean {
  return filter.value !== "" && filter.options.includes(filter.value);
}

// Whether a filter passes a row. list is the row's data-languages or data-zotero, its values
// joined by spaces. A filter that is not on passes every row.
export function passes(list: string, filter: Filter): boolean {
  if (!filterOn(filter)) return true;
  return list.split(" ").includes(filter.value);
}

// One row of the home table: its data-languages and data-zotero values, and the plugin's
// name and description as the row shows them ("" for no description).
export interface HomeRow {
  languages: string;
  zotero: string;
  name: string;
  description: string;
}

// Whether the search box matches a row: the row's name or description holds the query,
// both lowercased, after the query's outer spaces go. An empty query matches every row.
function matches(row: HomeRow, query: string): boolean {
  const text = query.trim().toLowerCase();
  return row.name.toLowerCase().includes(text) || row.description.toLowerCase().includes(text);
}

// Whether the home table shows a row: when the search box, the language menu, and the
// version buttons all pass it.
export function rowShows(row: HomeRow, language: Filter, zotero: Filter, query: string): boolean {
  return matches(row, query) && passes(row.languages, language) && passes(row.zotero, zotero);
}

// The chosen value for an address parameter: the parameter when an option has it, else ""
// (All languages, Any).
export function chosenValue(asked: string | null, options: readonly string[]): string {
  return asked !== null && options.includes(asked) ? asked : "";
}

// The plugin count beside the filters: the table's total rows when no filter is on, else
// how many of them the filters show, or that none match.
export function filterStatus(shown: number, total: number, filtering: boolean): string {
  const plugins = total === 1 ? "plugin" : "plugins";
  if (!filtering) return `${total} ${plugins}`;
  if (shown === 0) return "No plugins match these filters.";
  return `${shown} of ${total} ${plugins}`;
}

// The page's address with parameter name set to value, or with the parameter removed when
// value is "". An address that already says so comes back unchanged. Otherwise the query is
// written again, so the other parameters keep their values but not always their spelling,
// such as %20 for +. The page writes the search box to q, the language menu to language,
// and the version buttons to zotero.
export function filterHref(href: string, name: string, value: string): string {
  const url = new URL(href);
  if (value ? url.searchParams.get(name) === value : !url.searchParams.has(name)) return href;
  if (value) url.searchParams.set(name, value);
  else url.searchParams.delete(name);
  return url.href;
}
