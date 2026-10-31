import { describe, expect, test } from "vitest";
import { CATEGORIES, categories } from "../src/site/categories.ts";
import type { DescriptionRecord } from "../src/site/description.ts";

function record(
  name: string,
  description?: string,
  { id = "a@example.org", repoDescription, overrides = [] }: { id?: string; repoDescription?: string; overrides?: DescriptionRecord["overrides"] } = {},
): DescriptionRecord {
  return { id, upstream: { version: "1.0.0", name, description, repoDescription }, overrides };
}

// For each category, a description its pattern matches and one it does not.
const CASES: Record<string, [string, string]> = {
  ai: ["Chat with the open paper using your own LLM.", "Chats are kept in a log file."],
  translation: ["Translates the selected text.", "Backs up Zotero translators and styles."],
  "pdf-reading": ["Adds a single-page reading mode.", "Reads metadata from PDF files."],
  notes: ["Exports annotations to a file.", "Keeps a notebook of tags."],
  citations: ["Converts EndNote citations in Word documents.", "Counts how often each paper is cited."],
  metadata: ["Finds missing DOIs for your items.", "Finds missing PDFs for your items."],
  attachments: ["Renames PDF files by title.", "Attaches tags to new items."],
  rankings: ["Shows the CCF rank of each venue.", "Shows the frank opinion of reviewers."],
  export: ["Syncs items into Notion.", "Imports items from a folder."],
  search: ["Draws citation graphs of a collection.", "Searches and replaces text in fields."],
  organization: ["Pin items to the top of a collection.", "Adds a tagline under the title."],
  appearance: ["A warm color theme for Zotero.", "Keeps the window open."],
  "ai-tools": ["A local MCP endpoint for your library.", "A bridge between two PDF revisions."],
};

describe("CATEGORIES", () => {
  test("holds the 13 categories in the planned order", () => {
    expect(CATEGORIES.map((category) => category.name)).toEqual([
      "AI assistants",
      "Translation and dictionaries",
      "PDF reading",
      "Notes and annotations",
      "Citations and writing",
      "Metadata and cleanup",
      "Attachments and full text",
      "Journal rankings and citation counts",
      "Export and sync",
      "Search and discovery",
      "Library organization",
      "Appearance",
      "Connections for AI tools",
    ]);
  });

  test("gives each category a unique slug of lowercase letters, digits, and hyphens", () => {
    const slugs = CATEGORIES.map((category) => category.slug);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test("puts no id in both the include and exclude lists of one category", () => {
    for (const category of CATEGORIES) {
      expect(category.include.filter((id) => category.exclude.includes(id)), category.slug).toEqual([]);
    }
  });

  test("has a case for each category", () => {
    expect(Object.keys(CASES).toSorted()).toEqual(CATEGORIES.map((category) => category.slug).toSorted());
  });
});

describe("categories", () => {
  test.each(Object.entries(CASES))("matches and leaves out records for %s", (slug, [matched, unmatched]) => {
    expect(categories(record("Helper", matched))).toContain(slug);
    expect(categories(record("Helper", unmatched))).not.toContain(slug);
  });

  test("gives a record that no pattern matches no category", () => {
    expect(categories(record("Helper", "Keeps the window open."))).toEqual([]);
  });

  test("lists the categories in CATEGORIES order", () => {
    expect(categories(record("Helper", "Translates notes in the single-page reading mode with AI."))).toEqual([
      "ai",
      "translation",
      "pdf-reading",
      "notes",
    ]);
  });

  describe("reads each of the four texts", () => {
    test("the name after a name override", () => {
      const renamed = record("Helper", "Keeps the window open.", { overrides: [{ field: "name", value: "Paper Translator" }] });
      expect(categories(renamed)).toEqual(["translation"]);
      expect(categories(record("Helper", "Keeps the window open."))).toEqual([]);
    });

    test("the shown description from a description override", () => {
      const corrected = record("Helper", "Keeps the window open.", {
        overrides: [{ field: "description", value: "Translates the abstract." }],
      });
      expect(categories(corrected)).toEqual(["translation"]);
    });

    test("the manifest description while the GitHub one is shown", () => {
      // The manifest text is all CJK, so the GitHub text shows (see shownDescription).
      const both = record("Helper", "论文标题翻译插件", { repoDescription: "Keeps the window open." });
      expect(categories(both)).toEqual(["translation"]);
    });

    test("the GitHub description while the manifest one is shown", () => {
      const both = record("Helper", "Keeps the window open.", { repoDescription: "Translates the abstract." });
      expect(categories(both)).toEqual(["translation"]);
    });
  });

  test("adds a category for an id on its include list", () => {
    const text = "Hides empty fields in the Info panel.";
    expect(categories(record("Helper", text))).toEqual([]);
    expect(categories(record("Helper", text, { id: "condense-info-view@example.com" }))).toEqual(["appearance"]);
  });

  test("leaves out a category for an id on its exclude list, over a matching pattern", () => {
    const text = "Ask Claude about the paper, in a glass panel.";
    expect(categories(record("Helper", text))).toEqual(["ai", "appearance"]);
    expect(categories(record("Helper", text, { id: "zusia@firekern.github.io" }))).toEqual(["ai"]);
  });
});
