// The categories the site sorts plugins into: the index's own grouping, not a fact that a
// plugin's author declares (D-037).
import { type DescriptionRecord, shownDescription } from "./description.ts";
import { appliedValue } from "./version.ts";

// One category. slug is its value in data-categories and ?category=; about says what it
// holds on the About page. pattern runs over each of a plugin's texts (see categories);
// include adds the category to the plugins with those ids, and exclude takes it from them,
// over include and over the pattern.
export interface Category {
  slug: string;
  name: string;
  about: string;
  pattern: RegExp;
  include: readonly string[];
  exclude: readonly string[];
}

// Ids of plugins that let outside AI tools reach the library and run no AI themselves.
const BRIDGES = [
  "autoattach@adolinjonathan-bot.github.io",
  "mcp-rdp@zotero.org",
  "retrieval-index@sit2023.local",
  "zofiles@zofiles.dev",
  "zotero-agent-bridge@zotero-agent",
  "zotero-agentibility@local",
  "zotero-codex-bridge@myang-print.github.io",
  "zotero-reading-bridge@volatile.static",
  "zotron@diamondrill",
];

export const CATEGORIES: readonly Category[] = [
  {
    slug: "ai",
    name: "AI assistants",
    about: "chat with papers, AI summaries and explanations, and AI agents inside Zotero",
    pattern:
      /\bai\b|\bai\d|\bllms?\b|\bgpt|chatgpt|claude|codex|deepseek|gemini|openai|ollama|copilot|\bagents?\b|\brag\b|retrieval-augmented|\bkimi\b|notebooklm|\bhermes\b|opencode|antigravity|\bchat\b|large language|大模型|人工智能|智能对话/iu,
    include: [],
    exclude: [...BRIDGES, "arxiv-marker@lele.dev", "weavero@mjthoraval", "zontex-bridge@endoretic.github.io"],
  },
  {
    slug: "translation",
    name: "Translation and dictionaries",
    about: "translated text and PDFs, bilingual reading, dictionaries, and vocabulary",
    pattern: /translat(?!ors\b)|翻译|译|bilingual|双语|dictionar|词典|查词|vocabular|单词/iu,
    include: [],
    exclude: ["zotdupe@hostiuc.com"],
  },
  {
    slug: "pdf-reading",
    name: "PDF reading",
    about: "the PDF reader's view, focus aids, navigation, and text-to-speech",
    pattern:
      /reading guide|reading mode|single-page|page view|line focus|line by line|bionic|text-to-speech|\btts\b|read aloud|white margins|horizontal scroll|reader (location )?history|keybindings|eye-care|护眼|dark-mode image|pagination|theorems|in-text citations|rendered (pdf )?pages|reading bookmarks|citation previews|pdf references|while you read/iu,
    include: [
      "zotero-alt-reader@hyxi.dev",
      "pdfpreview@windingwind.com",
      "zotero-memory-management@unitian",
      "keyword-highlighter@zotero-plugin",
    ],
    exclude: [],
  },
  {
    slug: "notes",
    name: "Notes and annotations",
    about: "notes, annotations, and mind maps",
    pattern: /\bnotes?\b|annotat|笔记|批注|标注|mind ?maps?|思维导图/iu,
    include: ["zotero-pdf-highlighter@memorushb.com"],
    exclude: [
      "RIOPACAddChapter@noidea.com",
      "autoattach@adolinjonathan-bot.github.io",
      "bibtex-clean@ouyangjiahong.github.io",
      "preprint-bridge@research.local",
      "zontex-bridge@endoretic.github.io",
      "zotero-ocr@bib.uni-mannheim.de",
      "zotero-pdf-transfer@charlesapetersen.github.io",
      "zotron@diamondrill",
    ],
  },
  {
    slug: "citations",
    name: "Citations and writing",
    about: "citations in Word and LaTeX, BibTeX, and citation styles",
    pattern:
      /bibtex|biblatex|\blatex holdouts|word documents?|citations? in word|cite while you write|in-text citations|narrative citations|citation style|abnt|gb\/t|参考文献格式/iu,
    include: [],
    exclude: [
      "attachments-markdown@harrywang",
      "jasminum@linxzh.com",
      "zofiles@zofiles.dev",
      "zotero-settings-sync@gaviiiinnnn.github.io",
      "zotero-wiki-citations@quinn.dev",
    ],
  },
  {
    slug: "metadata",
    name: "Metadata and cleanup",
    about: "item metadata, DOIs, titles, author names, and duplicates",
    pattern:
      /metadata|元数据|题录|\bdois?\b|title case|normali[sz]|linter|duplicat|dedup|isbn|cnki|author names|拼音|language field|italici|book information|search (&|and) replace/iu,
    include: [],
    exclude: [
      "attachmentscanner@changlab.um.edu.mo",
      "autoattach@adolinjonathan-bot.github.io",
      "better-find-full-text@example.com",
      "fullvahti@vahtian.com",
      "paper-library-checker@he-chun.github.io",
      "reference-map-connect@anoopkcn",
      "repository-detector@example.com",
      "scidownload@chen",
      "tagwiz@tsmdt.github.io",
      "zotero-feed-management@unitian",
      "zotero-pdf-deduplicator@xuan.dev",
      "zoterojs-bridge@local",
      "zoteropdftranslate@euclpts.com",
    ],
  },
  {
    slug: "attachments",
    name: "Attachments and full text",
    about: "finding and downloading PDFs, renaming and moving files, snapshots, and OCR",
    pattern:
      /attachments?\b|附件|full.?text pdfs|find(s|ing)? (the )?full.?text|download(s|ing)? (entitled )?(\w+ )?pdfs?|fetch pdfs|pdf files?|snapshots?|renam|\bocr\b|djvu|watch(ed)? folder|sci-hub|open-access|wayback/iu,
    include: [],
    exclude: [
      "askgpt@askgpt.zotero",
      "bibtex-clean@ouyangjiahong.github.io",
      "group-tabs-by-collection@example.com",
      "nodus-zotero@nodus.app",
      "seerai@zotero.org",
      "zotero-md-note@example.com",
      "zotero-sideline@shiys.local",
      "zotero@equalang.com",
    ],
  },
  {
    slug: "rankings",
    name: "Journal rankings and citation counts",
    about: "journal and conference rankings, impact factors, and citation counts",
    pattern:
      /\brank|impact factor|影响因子|分区|\bccf\b|\bjcr\b|citation counts?|citation tally|tallies citation|\bscite\b|\bvenues?\b|easyscholar|期刊/iu,
    include: [],
    exclude: [],
  },
  {
    slug: "export",
    name: "Export and sync",
    about: "Markdown files, Obsidian, Notion, reading apps and tablets, and backups",
    pattern: /notion|obsidian|logseq|readwise|remarkable|(to|as|into) (source-linked )?markdown|markdown (files|notes|database)|export|\bsync|backup|同步|导出/iu,
    include: [],
    exclude: [
      "latex-suite@ievlevpn.github.io",
      "paperpilot@zotero.org",
      "pdftrim-for-llm@shengjiejin.github.io",
      "watch-folder@zotero-plugin.org",
      "zotero-except@local",
      "zotero-extra-columns@fredyyoussif.github.io",
      "zotero-tts@xujialiu.top",
    ],
  },
  {
    slug: "search",
    name: "Search and discovery",
    about: "finding papers, preprints, related work, and citation graphs",
    pattern:
      /literature (search|scout)|search (pubmed|arxiv|across)|academic search|search plugin|semantic search|federated search|citation graphs?|reference map|forward (and backward )?citations|backward references|related papers|daily papers|published versions|\bscout\b/iu,
    include: [],
    exclude: ["citestamp@citestamp.com"],
  },
  {
    slug: "organization",
    name: "Library organization",
    about: "tags, collections, item columns, feeds, and reading status",
    pattern:
      /\btags?\b|tagging|collections? (icons?|colou?rs?)|suggests? (which )?collections|into (zotero )?collections|by collection|references between (zotero )?items|numbers to zotero items|syllabi|columns?\b|reading list|reading status|reading progress|to read|unread|pin items|\bfeeds?\b|\btasks\b|timelines?|标签/iu,
    include: [],
    exclude: [
      "alphalikes@iris",
      "careertracker@zotero.org",
      "ccfrank@timetrapzz.site",
      "daeda@mit.edu",
      "fullvahti@vahtian.com",
      "modern-zotero-themes@xzhang001.github.io",
      "zotero-memory-management@unitian",
      "zotero-pdf-transfer@charlesapetersen.github.io",
      "zoterotimeline@oekeur.github.io",
      "zotracer@euclpts.com",
    ],
  },
  {
    slug: "appearance",
    name: "Appearance",
    about: "color themes, dark mode, and the look of Zotero's window",
    pattern: /\bthemes?\b|dark mode|dark-mode|wallpaper|glass|userchrome|配色|主题|护眼|appearance/iu,
    include: ["condense-info-view@example.com", "colecoes-coloridas-zotero@joao-fisio"],
    exclude: ["zusia@firekern.github.io"],
  },
  {
    slug: "ai-tools",
    name: "Connections for AI tools",
    about: "MCP servers and local endpoints that let outside AI tools reach your library",
    pattern:
      /\bmcp\b|model context protocol|local (write )?endpoint|endpoints for|json-rpc|http api|local http|remote debugging|agent-ready|for ai agents|ai clients|let ai agents|connect claude|(local|authenticated) bridge|agent bridge/iu,
    include: ["zontex-bridge@endoretic.github.io"],
    exclude: [],
  },
];

// The texts a pattern runs over: the name shown on the site, the shown description, and the
// manifest and GitHub descriptions.
function texts(record: DescriptionRecord): string[] {
  const name = appliedValue(record, "name", record.upstream?.name) ?? record.id;
  const shown = shownDescription(record);
  return [name, shown, record.upstream?.description, record.upstream?.repoDescription].filter(
    (text): text is string => text !== undefined,
  );
}

// The slugs of a record's categories, in CATEGORIES order: each category whose exclude list
// lacks the record's id and whose include list has it or whose pattern matches one of its
// texts.
export function categories(record: DescriptionRecord): string[] {
  const all = texts(record);
  return CATEGORIES.filter(
    (category) =>
      !category.exclude.includes(record.id) &&
      (category.include.includes(record.id) || all.some((text) => category.pattern.test(text))),
  ).map((category) => category.slug);
}

// The home page's category menu options: one for each category that at least one record has,
// as "Name (N)" with N its records, most records first and ties in CATEGORIES order.
export function categoryOptions(records: DescriptionRecord[]): { value: string; text: string }[] {
  const counts = new Map<string, number>();
  for (const record of records) for (const slug of categories(record)) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  return CATEGORIES.filter((category) => counts.has(category.slug))
    .toSorted((a, b) => counts.get(b.slug)! - counts.get(a.slug)!)
    .map((category) => ({ value: category.slug, text: `${category.name} (${counts.get(category.slug)})` }));
}
