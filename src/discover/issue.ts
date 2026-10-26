// The label of the URL input in .github/ISSUE_TEMPLATE/add-plugin.yml. GitHub writes each
// input of a form into the issue body as a level-3 heading with the label, then the value.
export const URL_LABEL = "Repository URL";

export type ParseResult = { ok: true; url: string } | { ok: false; problem: "no-url-heading" | "no-response"; message: string };

// Returns the first non-empty line under the URL heading, trimmed. Whether that line is
// a GitHub repo URL is for the reader to judge.
export function parseIssueBody(body: string): ParseResult {
  const lines = body.split(/\r?\n/);
  const heading = lines.findIndex((line) => line.trim() === `### ${URL_LABEL}`);
  if (heading === -1) {
    return { ok: false, problem: "no-url-heading", message: `the issue body has no "### ${URL_LABEL}" heading` };
  }
  const rest = lines.slice(heading + 1);
  const end = rest.findIndex((line) => line.startsWith("### "));
  const value = (end === -1 ? rest : rest.slice(0, end)).map((line) => line.trim()).find(Boolean);
  // GitHub writes _No response_ for an empty field.
  if (!value || value === "_No response_") {
    return { ok: false, problem: "no-response", message: `the "${URL_LABEL}" field is empty` };
  }
  return { ok: true, url: value };
}

export async function issueRun(_options: unknown): Promise<{ status: number }> {
  throw new Error("not implemented");
}
