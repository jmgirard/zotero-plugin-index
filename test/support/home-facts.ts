import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// The facts the home page's rows and filters show, read from the built HTML. They leave out
// classes and element nesting, so wrapping elements or changing other classes leaves them the
// same while p.language-filter, div.version-filter, and the pills' .visually-hidden text stay.
// Run it as `node test/support/home-facts.ts <index.html>` to print the facts of a built home
// page, as the "facts" field of test/fixtures/site/home-facts.json holds them.

interface Element {
  tag: string;
  attributes: Map<string, string>;
  children: (Element | string)[];
}

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

// Builds a tree of the markup inside <body>, less any script. The built pages close every
// element they open.
function parse(html: string): Element {
  const body = html
    .slice(html.indexOf("<body>") + "<body>".length, html.indexOf("</body>"))
    .replace(/<script[\s>].*?<\/script>/gs, "");
  const root: Element = { tag: "body", attributes: new Map(), children: [] };
  const stack = [root];
  for (const [, closing, tag, attributes, text] of body.matchAll(/<(\/?)([a-z][a-z0-9]*)([^>]*)>|([^<]+)/g)) {
    const parent = stack.at(-1)!;
    if (text !== undefined) {
      parent.children.push(text);
    } else if (closing) {
      if (parent.tag !== tag) throw new Error(`</${tag}> closes <${parent.tag}>`);
      stack.pop();
    } else {
      const element: Element = { tag: tag!, attributes: new Map(), children: [] };
      for (const [, name, value] of attributes!.matchAll(/([^\s=]+)(?:="([^"]*)")?/g)) element.attributes.set(name!, value ?? "");
      parent.children.push(element);
      if (!VOID.has(tag!) && !attributes!.endsWith("/")) stack.push(element);
    }
  }
  if (stack.length !== 1) throw new Error(`<${stack.at(-1)!.tag}> is not closed`);
  return root;
}

function* descendants(element: Element): Generator<Element> {
  for (const child of element.children) {
    if (typeof child === "string") continue;
    yield child;
    yield* descendants(child);
  }
}

function text(element: Element): string {
  return element.children.map((child) => (typeof child === "string" ? child : text(child))).join("");
}

function find(root: Element, test: (element: Element) => boolean): Element[] {
  return [...descendants(root)].filter(test);
}

function only(root: Element, test: (element: Element) => boolean, what: string): Element {
  const found = find(root, test);
  if (found.length !== 1) throw new Error(`${found.length} elements are ${what}`);
  return found[0]!;
}

function hasClass(element: Element, name: string): boolean {
  return (element.attributes.get("class") ?? "").split(/\s+/).includes(name);
}

// The id, value, aria-pressed, role, hidden, and data-* attributes, which include all the
// ones the home page script reads or sets.
function kept(element: Element): Record<string, string> {
  const names = [...element.attributes.keys()].filter(
    (name) => ["id", "value", "aria-pressed", "role", "hidden"].includes(name) || name.startsWith("data-"),
  );
  return Object.fromEntries(names.sort().map((name) => [name, element.attributes.get(name)!]));
}

// One row's parts in document order: the name link, the archived mark, the description,
// and the pills or the status line.
function parts(row: Element): unknown[] {
  const found: unknown[] = [];
  for (const element of descendants(row)) {
    const get = (name: string) => element.attributes.get(name);
    if (element.tag === "a" && get("href") !== undefined) found.push(["link", get("href"), text(element)]);
    else if (get("data-archived") !== undefined) found.push(["archived", text(element)]);
    else if (get("data-description") !== undefined) found.push(["description", text(element)]);
    else if (get("data-status") !== undefined) found.push(["status", get("data-status"), text(element)]);
    else if (get("data-major") !== undefined) {
      const hidden = only(element, (child) => hasClass(child, "visually-hidden"), "the hidden text of a pill");
      found.push(["pill", get("data-major"), get("data-support"), get("title"), text(hidden)]);
    }
  }
  return found;
}

export function homeFacts(html: string) {
  const body = parse(html);
  const tagged = (tag: string, name: string) => (element: Element) => element.tag === tag && hasClass(element, name);
  const select = only(body, (element) => element.tag === "select", "a select");
  return {
    languageFilter: kept(only(body, tagged("p", "language-filter"), "p.language-filter")),
    versionFilter: kept(only(body, tagged("div", "version-filter"), "div.version-filter")),
    select: kept(select),
    options: find(select, (element) => element.tag === "option").map((option) => [kept(option), text(option)]),
    buttons: find(body, (element) => element.tag === "button").map((button) => [kept(button), text(button)]),
    status: kept(only(body, (element) => element.attributes.has("data-filter-status"), "the filter status line")),
    rows: find(body, (element) => element.tag === "li" && element.attributes.has("data-plugin")).map((row) => ({
      attributes: kept(row),
      parts: parts(row),
    })),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [path] = process.argv.slice(2);
  if (!path) throw new Error("usage: node test/support/home-facts.ts <index.html>");
  console.log(JSON.stringify(homeFacts(readFileSync(path, "utf8")), null, 2));
}
