// The home page's language filter. The page's script imports it, so it has no imports.

// Whether the home list shows a row while the language menu has value. rowLanguages is the
// row's data-languages, its language subtags joined by spaces, and options are the menu's
// values. "" (All languages) and a value that no option has show every row.
export function rowShows(rowLanguages: string, value: string, options: readonly string[]): boolean {
  if (value === "" || !options.includes(value)) return true;
  return rowLanguages.split(" ").includes(value);
}
