import type { PluginRecord } from "../build/build.ts";
import { parseReport, type Verdict } from "./report.ts";

// The account that closes issues for a workflow run on GITHUB_TOKEN, as report-issue.yml
// runs the report bot. A login with brackets cannot be registered.
export const REPORT_BOT = "github-actions[bot]";

// The counted reports on one Zotero major of one plugin.
export interface ReportCount {
  zoteroMajor: number;
  works: number;
  broken: number;
}

interface Counted {
  account: number;
  plugin: string;
  zoteroMajor: number;
  verdict: Verdict;
  createdAt: number;
  number: number;
}

// Counts the report issues for each record that has `upstream`, keyed by record id. Items
// come from GitHub's issue list. An item counts only when it is an issue, not a pull
// request, that the bot closed as completed, that has no `not-counted` label, that
// `parseReport` takes, and whose plugin version is the one the record read. Of one
// account's counted reports on one plugin and Zotero major, the newest counts, and the
// higher issue number wins a tie. Each record's counts are ordered by major and hold
// only majors with a counted report.
export function countReports(issues: readonly unknown[], records: readonly PluginRecord[]): Map<string, ReportCount[]> {
  const versions = new Map(records.flatMap((record) => (record.upstream ? [[record.id, record.upstream.version]] : [])));
  const ids = new Set(records.map((record) => record.id));
  const newest = new Map<string, Counted>();
  for (const item of issues) {
    const report = counted(item, ids);
    if (!report || versions.get(report.plugin) !== report.version) continue;
    const key = JSON.stringify([report.account, report.plugin, report.zoteroMajor]);
    const kept = newest.get(key);
    if (!kept || report.createdAt > kept.createdAt || (report.createdAt === kept.createdAt && report.number > kept.number)) {
      newest.set(key, report);
    }
  }
  const counts = new Map<string, ReportCount[]>([...versions.keys()].map((id) => [id, []]));
  for (const { plugin, zoteroMajor, verdict } of newest.values()) {
    const list = counts.get(plugin)!;
    let count = list.find((item) => item.zoteroMajor === zoteroMajor);
    if (!count) list.push((count = { zoteroMajor, works: 0, broken: 0 }));
    count[verdict]++;
  }
  for (const list of counts.values()) list.sort((a, b) => a.zoteroMajor - b.zoteroMajor);
  return counts;
}

// The report in one item of the issue list, or undefined when the item does not count. An
// item without the fields the count reads does not count either.
function counted(item: unknown, ids: ReadonlySet<string>): (Counted & { version: string }) | undefined {
  const issue = item as {
    number?: unknown;
    pull_request?: unknown;
    state_reason?: unknown;
    closed_by?: { login?: unknown } | null;
    user?: { id?: unknown } | null;
    created_at?: unknown;
    labels?: unknown;
    body?: unknown;
  } | null;
  if (typeof issue !== "object" || issue === null || issue.pull_request !== undefined) return undefined;
  if (issue.state_reason !== "completed" || issue.closed_by?.login !== REPORT_BOT) return undefined;
  const labels = (Array.isArray(issue.labels) ? issue.labels : [])
    .map((label) => (typeof label === "string" ? label : label?.name))
    .filter((name): name is string => typeof name === "string");
  if (labels.includes("not-counted")) return undefined;
  const account = issue.user?.id;
  const createdAt = typeof issue.created_at === "string" ? Date.parse(issue.created_at) : NaN;
  if (typeof account !== "number" || Number.isNaN(createdAt) || typeof issue.number !== "number") return undefined;
  const parsed = parseReport(typeof issue.body === "string" ? issue.body : "", labels, ids);
  if (!parsed.ok) return undefined;
  const { plugin, version, zoteroMajor, verdict } = parsed.report;
  return { account, plugin, version, zoteroMajor, verdict, createdAt, number: issue.number };
}
