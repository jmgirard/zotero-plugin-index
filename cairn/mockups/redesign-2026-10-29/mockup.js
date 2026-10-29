// Shared helpers for the redesign mockup. Reads the live data copy in v1/plugins.json.
export const MAJORS = ["7", "8", "9", "10"];

export const ICONS = {
  github: '<svg class="icon" viewBox="0 0 24 24"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>',
  download: '<svg class="icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>',
  tag: '<svg class="icon" viewBox="0 0 24 24"><path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r=".5"/></svg>',
  check: '<svg class="icon" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
  x: '<svg class="icon" viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  half: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 4v16" /><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/></svg>',
  back: '<svg class="icon" viewBox="0 0 24 24"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>',
  info: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  search: '<svg class="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  archive: '<svg class="icon" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>',
};

// A local copy in v1/plugins.json wins; otherwise the deployed data file.
export async function loadPlugins() {
  const local = await fetch("v1/plugins.json").catch(() => undefined);
  if (local?.ok) return local.json();
  return (await fetch("https://jmgirard.github.io/zotero-plugin-index/v1/plugins.json")).json();
}

export function name(r) {
  return r.upstream?.name ?? r.id;
}

export function description(r) {
  const d = (r.upstream?.description ?? "").trim();
  return d && d !== name(r) ? d : "";
}

// Ported from src/site/version.ts (Mozilla's version comparator).
const LEADING_NUMBER = /^[+-]?\d+/;
function parsePart(part) {
  if (part === "*") return { a: Infinity, b: null, c: 0, d: null };
  const numberA = LEADING_NUMBER.exec(part);
  const a = numberA ? Number(numberA[0]) : 0;
  const rest = part.slice(numberA ? numberA[0].length : 0);
  if (rest === "") return { a, b: null, c: 0, d: null };
  if (rest.startsWith("+")) return { a: a + 1, b: "pre", c: 0, d: null };
  const numberStart = rest.search(/[0-9+-]/);
  if (numberStart === -1) return { a, b: rest, c: 0, d: null };
  const tail = rest.slice(numberStart);
  const numberC = LEADING_NUMBER.exec(tail);
  const d = tail.slice(numberC ? numberC[0].length : 0);
  return { a, b: rest.slice(0, numberStart), c: numberC ? Number(numberC[0]) : 0, d: d === "" ? null : d };
}
const cmpN = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
function cmpS(x, y) {
  if (x === null) return y === null ? 0 : 1;
  if (y === null) return -1;
  return x < y ? -1 : x > y ? 1 : 0;
}
export function compareVersions(a, b) {
  const pa = a.split("."), pb = b.split(".");
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = parsePart(pa[i] ?? ""), y = parsePart(pb[i] ?? "");
    const r = cmpN(x.a, y.a) || cmpS(x.b, y.b) || cmpN(x.c, y.c) || cmpS(x.d, y.d);
    if (r !== 0) return r;
  }
  return 0;
}
export function declaredRange(r) {
  if (r.failure !== undefined || !r.upstream) return {};
  const pick = (field, up) => {
    const a = r.overrides.filter((o) => o.field === field && (o.version === undefined || o.version === r.upstream.version));
    return (a.find((o) => o.version !== undefined) ?? a[0])?.value ?? up;
  };
  return { min: pick("strict_min_version", r.upstream.strictMinVersion), max: pick("strict_max_version", r.upstream.strictMaxVersion) };
}

// How much of Zotero N (N.0 to N.9) the declared range covers: all, some, none, or undefined.
export function support(r, major) {
  const { min, max } = declaredRange(r);
  if (min === undefined && max === undefined) return undefined;
  if (min !== undefined && max !== undefined && compareVersions(min, max) > 0) return "none";
  const fromStart = min === undefined || compareVersions(min, `${major}.0`) <= 0;
  const toEnd = max === undefined || compareVersions(max, `${major}.9`) >= 0;
  if (fromStart && toEnd) return "all";
  if ((max !== undefined && compareVersions(max, `${major}.0`) < 0) || (min !== undefined && compareVersions(min, `${major}.9`) > 0)) return "none";
  return "some";
}

export function rangeText(r) {
  const { min, max } = declaredRange(r);
  if (min && max) return `${min} – ${max}`;
  if (min) return `${min} or later`;
  if (max) return `up to ${max}`;
  return "";
}

export function startFor(r, major) {
  return (r.startTests ?? []).find((t) => t.zotero.split(".")[0] === major);
}

export function reportFor(r, major) {
  return (r.reports ?? []).find((t) => String(t.zoteroMajor) === major);
}

const langNames = new Intl.DisplayNames(["en"], { type: "language" });
export function languageName(tag) {
  try { return langNames.of(tag); } catch { return tag; }
}
export function shortLanguages(r) {
  const tags = r.upstream?.languages ?? [];
  const subtags = [...new Set(tags.map((t) => t.split("-")[0]))];
  return subtags;
}

export function day(iso) {
  return iso ? iso.slice(0, 10) : "";
}
export function monthYear(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function markHtml(kind, label) {
  const inner = { all: ICONS.check, some: ICONS.half, none: "–", fail: ICONS.x }[kind] ?? "";
  return `<span class="mark ${kind}" title="${label}" aria-label="${label}">${inner}</span>`;
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

export function variant(key, fallback) {
  return new URL(location.href).searchParams.get(key) ?? fallback;
}
export function variantHref(key, value) {
  const u = new URL(location.href);
  u.searchParams.set(key, value);
  return u.pathname + u.search;
}
