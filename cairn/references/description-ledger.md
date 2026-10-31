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

The case is the one that `pnpm description-gaps` named, or `Portuguese` for the three rows from the plan's scan. If an upstream file says what the plugin does, the disposition is `override`. If none does, it is `kept` (AC4). An `override` row has a `description` override with no `version` in its `plugins/<id>/index.json`. The source column names the file that the text comes from, and whether the text was condensed from English or translated by hand. Each override's `reason` gives the case of each upstream text.

## Ledger

| # | Plugin id | Case | Disposition | Source |
|---|---|---|---|---|
| G1 | `addontemplate@euclpts.com` | missing | override | README.md, condensed |
| G2 | `betterauthors@github.com` | short | override | README.md, condensed |
| G3 | `bionicReader@euclpts.com` | short | override | README.md, condensed |
| G4 | `creator-pinyin-sort@local` | cjk | override | README.md, translated |
| G5 | `gbt7714-2025-helper@wangzfof.github.io` | cjk | override | README.en.md, condensed |
| G6 | `keepzotero@yhmtsai` | short | override | README.md, condensed |
| G7 | `local-mdx-click@noahx.local` | cjk | override | README.md, translated |
| G8 | `paper-outline@example.com` | cjk | override | README.md, translated |
| G9 | `pdfrename@theigrams.com` | short | override | README.md, condensed |
| G10 | `reginamarza@gmail.com` | short | override | README.md, condensed |
| G11 | `register02@cn.nutstore.net` | short | override | README.md, condensed |
| G12 | `wenxianyidu@wenxianyidu.local` | cjk | override | README.en.md, condensed |
| G13 | `yaobian@zotero` | cjk | override | README.md, translated |
| G14 | `zenotes@alefa.net` | short | override | README.md, condensed |
| G15 | `zontex-bridge@endoretic.github.io` | short | override | README.md, condensed |
| G16 | `zotdupe@hostiuc.com` | short | override | README.md, condensed |
| G17 | `zotero-ai-guided-reader@jhj223` | cjk | override | README.md, translated |
| G18 | `zotero-better-translate@zrb.local` | cjk | override | README.md, translated |
| G19 | `zotero-citation-counts@tangzhao20` | short | override | README.md, condensed |
| G20 | `zotero-keep-window@luke-evan` | short | override | README.md, translated |
| G21 | `zotero-openalex@example.com` | short | override | README.md, condensed |
| G22 | `zotero-pdf2zh@yuriyagn.github.io` | cjk | override | README.md, translated |
| G23 | `zotero-sideline@shiys.local` | cjk | override | README.md, translated |
| G24 | `zoterogpt@polygon.org` | short | override | README.md, translated |
| G25 | `zoterotag@euclpts.com` | short | override | README.md, condensed |
| G26 | `zotgit@khodami.com` | short | override | README.md, condensed |
| G27 | `zotlit@aidenlx.site` | short | override | README.md, condensed |
| G28 | `zotmoov@wileyy.com` | short | override | README.md, condensed |
| G29 | `assistente-ia@sbhg.pt` | Portuguese | override | README.md, condensed |
| G30 | `colecoes-coloridas-zotero@joao-fisio` | Portuguese | override | README.md, translated |
| G31 | `ufc-zotero-plugin@saviotp` | Portuguese | override | README.md, translated |

## Disposition

All 31 rows are `override`, and none is `kept`. Each override is in this milestone's T4 or T5 commit. After them, `pnpm description-gaps` over the same file prints no gap.

Notes from the README reads. G1 is a developer template, not a plugin for end users, and its text says so. G15's repo is mainly a Codex plugin, and the text comes from the Bridge's row of the root README. G9's README says that custom rules are not implemented yet, so the text names only the default rule. G24's text covers only the free features. G26 is a fork of G28, and the two share a manifest description, but each has its own text. G20 became `short` only because the Latin-script part rule shows its English half.

## Open questions

- Plugins added after this data file are not in the ledger. The candidate row "Close gaps in the description pick", item (4), holds them — observed 2026-10-31.
- Some descriptions hold CJK text but have a CJK share below 0.5, such as a Chinese name before English text. They get no row, since no rule covers them (D-038) — observed 2026-10-31.
