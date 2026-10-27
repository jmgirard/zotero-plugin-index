import { ZOTERO_MAJORS } from "../site/version.ts";

// The labels of the inputs in .github/ISSUE_TEMPLATE/works.yml and broken.yml, by input
// id. GitHub writes each input of a form into the issue body as a level-3 heading with
// the label, then the value.
export const REPORT_LABELS = { plugin: "Plugin id", version: "Plugin version", zotero: "Zotero version" } as const;

export type Verdict = "works" | "broken";

export interface Report {
  plugin: string;
  version: string;
  zoteroMajor: number;
  verdict: Verdict;
}

export type ReportProblem = "missing-heading" | "no-response" | "unknown-plugin" | "bad-plugin-version" | "bad-zotero-version" | "bad-verdict";

export type ReportResult = { ok: true; report: Report } | { ok: false; problem: ReportProblem; message: string };

// The longest plugin version a report can name, so a report cannot fill a comment.
const VERSION_MAX = 100;
const NEWEST_MAJOR = Math.max(...ZOTERO_MAJORS.map(Number));

// Reads a report from an issue body and the issue's labels. `ids` holds the plugin ids
// of the index's entries. The verdict comes from the label that the form adds, which only
// the form or a maintainer can set. The first problem found is the one returned.
export function parseReport(body: string, labels: readonly string[], ids: ReadonlySet<string>): ReportResult {
  const lines = body.split(/\r?\n/);
  const values: Partial<Record<keyof typeof REPORT_LABELS, string>> = {};
  for (const id of ["plugin", "version", "zotero"] as const) {
    const value = field(lines, REPORT_LABELS[id]);
    if (!value.ok) return value;
    values[id] = value.value;
  }
  const { plugin, version, zotero } = values as Record<keyof typeof REPORT_LABELS, string>;
  if (!ids.has(plugin)) return problem("unknown-plugin", `the index has no plugin with the id ${plugin}`);
  if (version.length > VERSION_MAX || /\s/.test(version)) {
    return problem("bad-plugin-version", `the plugin version must be at most ${VERSION_MAX} characters with no spaces`);
  }
  const major = zotero.match(/\d+/)?.[0];
  const zoteroMajor = major === undefined ? NaN : Number(major);
  if (!(zoteroMajor >= 7 && zoteroMajor <= NEWEST_MAJOR)) {
    return problem("bad-zotero-version", `the Zotero version must start with a major from 7 to ${NEWEST_MAJOR}`);
  }
  const verdicts = (["works", "broken"] as const).filter((verdict) => labels.includes(verdict));
  if (verdicts.length !== 1) return problem("bad-verdict", "the issue must have exactly one of the labels works and broken");
  return { ok: true, report: { plugin, version, zoteroMajor, verdict: verdicts[0] } };
}

function problem(name: ReportProblem, message: string): ReportResult & { ok: false } {
  return { ok: false, problem: name, message };
}

// The first non-empty line under the heading `label`, trimmed, before the next heading.
function field(lines: string[], label: string): { ok: true; value: string } | (ReportResult & { ok: false }) {
  const heading = lines.findIndex((line) => line.trim() === `### ${label}`);
  if (heading === -1) return problem("missing-heading", `the issue body has no "### ${label}" heading`);
  const rest = lines.slice(heading + 1);
  const end = rest.findIndex((line) => line.startsWith("### "));
  const value = (end === -1 ? rest : rest.slice(0, end)).map((line) => line.trim()).find(Boolean);
  // GitHub writes _No response_ for an empty field.
  if (!value || value === "_No response_") return problem("no-response", `the "${label}" field is empty`);
  return { ok: true, value };
}
