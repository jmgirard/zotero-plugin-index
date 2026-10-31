# description-ledger: the description gaps in the deployed data of 2026-10-31 (M067)

**Provenance.** Ingested 2026-10-31 by M067 from a run of `pnpm description-gaps` on branch `m067-description-gaps` at the T2 commit. The run used the Latin-script part rule and came before any new override. Its input was the deployed `https://jmgirard.github.io/zotero-plugin-index/v1/plugins.json`, downloaded 2026-10-31. Two Opus subagents then read each listed plugin's README on GitHub, and the session checked their drafts.
Pagination: —.
Extraction: a 2026-10-31 snapshot, and the deployed data and the READMEs can change after it — observed 2026-10-31.

**Scope.** This page records the ledger that AC4 of M067 asks for. It lists each description gap in one data file and the disposition of each. It is not a source summary, and it builds no checker. The command in `src/site/description-gaps.ts` and its tests in `test/description-gaps.test.ts` hold the rule. This is a reference, not an authority. Status lives in `ROADMAP.md`, decisions in `DECISIONS.md`, and architecture in `DESIGN.md`.

**Evidence snapshot.**

- Data file: `generatedAt` 2026-10-31T07:51:22.433Z, SHA-256 `d1c883cc6f945563ba133033491e8f9c21c69a088f527f18574287bff4e77287`, 272 records, on the shelf as `cairn/references/sources/plugins-data-2026-10-31.json` — observed 2026-10-31.
- The run printed 28 lines: 1 `missing`, 10 `cjk`, and 17 `short` — observed 2026-10-31.
- The plan's scan of the same data found three shown descriptions in Portuguese, which the command does not detect — observed 2026-10-31.
- Each plugin's README on its GitHub default branch, read 2026-10-31 — observed 2026-10-31.

## How a row gets its disposition

The case is the one that `pnpm description-gaps` named, or `Portuguese` for the three rows from the plan's scan. If an upstream file says what the plugin does, the disposition is `override`. If none does, it is `kept` (AC4). An `override` row has a `description` override with no `version` in its `plugins/<id>/index.json`. The shown column is the text that the run printed, or for a Portuguese row the shown manifest text. The source column names the file that the override text comes from, and whether the text was condensed from English or translated by hand. Each override's `reason` gives the case of each upstream text.

## Ledger

| # | Plugin id | Case | Shown text | Disposition | Source |
|---|---|---|---|---|---|
| G1 | `addontemplate@euclpts.com` | missing | (none) | override | README.md, condensed |
| G2 | `betterauthors@github.com` | short | Customize the displayed authors list | override | README.md, condensed |
| G3 | `bionicReader@euclpts.com` | short | Bionic reading experience with Zotero. | override | README.md, condensed |
| G4 | `creator-pinyin-sort@local` | cjk | 帮助修正Zotero中文文献多音字作者姓氏拼音排序，仅支持 Zotero 10。 | override | README.md, translated |
| G5 | `gbt7714-2025-helper@wangzfof.github.io` | cjk | Zotero 9 GB/T 7714—2025 文献助手：拼音姓名规范化、电子资源 OL 标记与安全撤销 | override | README.en.md, condensed |
| G6 | `keepzotero@yhmtsai` | short | Keep Zotero from accidental close | override | README.md, condensed |
| G7 | `local-mdx-click@noahx.local` | cjk | Zotero 查词与翻译：MDX、StarDict、DSL 本地词典，四种实验性在线翻译，多来源查询与排序，独立点击/划选开关，可拖动弹窗。 | override | README.md, translated |
| G8 | `paper-outline@example.com` | cjk | 用 AI 为论文自动生成整篇总结（存笔记）与带页码的层级目录、逐节摘要（显示在阅读器大纲栏、点击跳转）。扫描 PDF 可通过 MinerU 识别文字后继续处理，并提供 Token 到期提醒与上传选择。支持在设置页和阅读器内测试 API 连接，文献入库可自动生成，也可右键手动。兼容 DeepSeek/OpenAI/Xiaomi MiMo/Kimi/智谱/通义/SiliconFlow/Ollama 等服务商。另附「去除文字空格」「复制文献信息」与「复制 PDF 文件」等实用工具。 | override | README.md, translated |
| G9 | `pdfrename@theigrams.com` | short | Custom rename pdf | override | README.md, condensed |
| G10 | `reginamarza@gmail.com` | short | Track reading status and progress. | override | README.md, condensed |
| G11 | `register02@cn.nutstore.net` | short | Nutstore sso plugin for Zotero | override | README.md, condensed |
| G12 | `wenxianyidu@wenxianyidu.local` | cjk | 免费开源的 Zotero 中文文献翻译：双栏、段落对照、划词和输入翻译。 | override | README.en.md, condensed |
| G13 | `yaobian@zotero` | cjk | 给 Zotero 的 36 套配色家族主题：阅读器与书库一起换色，支持深浅切换、背景图片与毛玻璃 | override | README.md, translated |
| G14 | `zenotes@alefa.net` | short | Advanced notes manager | override | README.md, condensed |
| G15 | `zontex-bridge@endoretic.github.io` | short | Support component for Zontex. | override | README.md, condensed |
| G16 | `zotdupe@hostiuc.com` | short | Semantic duplicate detector for Zotero | override | README.md, condensed |
| G17 | `zotero-ai-guided-reader@jhj223` | cjk | Zotero 9 AI 论文带读：MinerU 解析、证据回跳、图表索引、笔记与 Anki 导出 | override | README.md, translated |
| G18 | `zotero-better-translate@zrb.local` | cjk | 选中单词即查词典，选中短语/句子即 AI 翻译；译文可编辑；金句原文收藏为可检索的分类列表（词典/AI/收藏）。 | override | README.md, translated |
| G19 | `zotero-citation-counts@tangzhao20` | short | Fetch and display citation counts | override | README.md, condensed |
| G20 | `zotero-keep-window@luke-evan` | short | Minimize Zotero instead of quitting. | override | README.md, translated |
| G21 | `zotero-openalex@example.com` | short | Set the OpenAlex WorkID | override | README.md, condensed |
| G22 | `zotero-pdf2zh@yuriyagn.github.io` | cjk | 在 Zotero 中使用 PDFMathTranslate Next 与 BabelDOC 将 PDF 文献翻译为简体中文。 | override | README.md, translated |
| G23 | `zotero-sideline@shiys.local` | cjk | Zotero PDF 阅读器 AI 助手：兼容 OpenAI API 与 Codex、OpenCode、DeepSeek Harness，支持文献对话、图片输入、原文定位、子笔记、会话检索及文字复制。自动高亮与撤销修复待完整真机验收。 | override | README.md, translated |
| G24 | `zoterogpt@polygon.org` | short | GPT Meet Zotero. | override | README.md, translated |
| G25 | `zoterotag@euclpts.com` | short | Action it, tag it, sorted. | override | README.md, condensed |
| G26 | `zotgit@khodami.com` | short | Mooves attachments and links them | override | README.md, condensed |
| G27 | `zotlit@aidenlx.site` | short | Zotero companion plugin for ZotLit | override | README.md, condensed |
| G28 | `zotmoov@wileyy.com` | short | Mooves attachments and links them | override | README.md, condensed |
| G29 | `assistente-ia@sbhg.pt` | Portuguese | Assistente de leitura científica / research reading assistant: resumos, avaliação crítica, fichas, comparação de PDFs, revisão de literatura e lacunas, com citações à página. Gemini, ChatGPT ou IAEdu, com contas gratuitas ou pagas. | override | README.md, condensed |
| G30 | `colecoes-coloridas-zotero@joao-fisio` | Portuguese | Personalize a cor e o ícone das suas coleções. | override | README.md, translated |
| G31 | `ufc-zotero-plugin@saviotp` | Portuguese | Plugin para Zotero 8 — Referências UFC/ABNT | override | README.md, translated |

## Disposition

All 31 rows are `override`, and none is `kept`. Each override is in this milestone's T4 or T5 commit. After them, `pnpm description-gaps` over the same file prints no gap.

Notes from the README reads. G1 is a developer template, not a plugin for end users, and its text says so. G15's repo is mainly a Codex plugin, and the text comes from the Bridge's row of the root README. G9's README says that custom rules are not implemented yet, so the text names only the default rule. G24's text covers only the free features. G26 is a fork of G28, and the two share a manifest description, but each has its own text. G20 became `short` only because the Latin-script part rule shows its English half.

## Category changes

The site's categories (D-037) read the shown description, so the new override texts changed the categories of 15 plugins. A hand read marked each new assignment by the rule of `category-ledger.md`. The read found 13 of 22 right and 9 wrong. Each wrong one is now on its category's `exclude` list in `src/site/categories.ts`.

- Right: betterauthors (organization), register02 (export), zenotes (ai, translation, attachments, export, organization), zontex-bridge (organization), zotero-citation-counts (organization), zotero-openalex (rankings, organization), zoterogpt (translation, notes).
- Wrong, excluded: creator-pinyin-sort (organization, from a column sort), gbt7714-2025-helper (translation, from a bilingual style), paper-outline (organization), pdfrename (organization, from journal tags), zotdupe (search, from "published versions"), zotero-keep-window (export, from "sync"), zotero-pdf2zh (attachments, from a child attachment), zoterogpt (organization, from command tags), zoterotag (notes, from writing a note).

## Open questions

- Plugins added after this data file are not in the ledger. The candidate row "Close gaps in the description pick", item (4), holds them — observed 2026-10-31.
- Some descriptions hold CJK text but have a CJK share below 0.5, such as a Chinese name before English text. They get no row, since no rule covers them (D-038) — observed 2026-10-31.
