# category-ledger: a hand read of the plugin categories on the deployed data (M066)

**Provenance.** Ingested 2026-10-31 by M066 from a hand read of the results of
`categories` in `src/site/categories.ts`. The read covers two inputs. The
first is the deployed
`https://jmgirard.github.io/zotero-plugin-index/v1/plugins.json`, downloaded
2026-10-31, whose `generatedAt` is 2026-10-30T21:13:54.875Z, with 272 records.
The second is the `meta.json` of the 19 open bot pull requests of 2026-10-31.
Pagination: —.
Extraction: a 2026-10-31 snapshot, and the deployed data and the rules can change after it — observed 2026-10-31.

**Scope.** This page records the read that AC7 of M066 rests on. It gives each
record's categories and the reader's mark on them. It is not a source summary,
and it builds no checker. It is a reference, not an authority. Status lives in
`ROADMAP.md`, decisions in `DECISIONS.md`, and architecture in `DESIGN.md`.

**Evidence snapshot.**

- Deployed data, 272 records, `generatedAt` 2026-10-30T21:13:54.875Z — observed 2026-10-31.
- `src/site/categories.ts` at the M066 T1 commit plus the T2 tuning on branch `m066-plugin-categories` — observed 2026-10-31.
- The `meta.json` of the 19 open bot pull requests (#103 to #344) — observed 2026-10-31.

## How the read marks an assignment

The `about` text of each category in `CATEGORIES` says what it holds. If the
plugin's name or descriptions say that it does such a thing, the assignment is
right. A plugin can do things for several categories, and each such category
is right. If the plugin only mentions the matched word, the assignment is
wrong. An example is an AI bridge whose text says "agents", under AI
assistants. Another is Zotero's import "translators", under translation. The
agent did the read. The user spot-checks this page at the merge question.

## Results

On the deployed data:

- Assignments: 363 across 252 records. Wrong by the read: 0 of 363.
- Records with no category: 20 of 272 (7.4%).
- Assignments that come from an `include` list alone: 8 of 363 (2.2%). The
  ledger marks them `(include)`.
- `exclude` entries: 66, on 58 records. The ledger lists them after
  "Excluded:". Each one removes an assignment that the read marked wrong
  during the tuning.

The rules were tuned on this same data. So a new plugin can expect a higher
error rate than the 0 above. Without the `exclude` lists, 66 of 429 pattern
assignments (15%) are wrong by the same read.

The tuning never read the 19 plugins of the open bot pull requests. The read
of those used the manifest name and description only. The rules made 27
assignments, and 2 are wrong. Quick Highlight is under translation. Literature
Library is under AI assistants, but its text describes access for outside
agents. 3 of 19 records got no category: Replication Checker, Chartero, and
超能文献, whose manifest description is "Zotero Suppr".

The read does not measure a missing category on a record that has another
one. An example is a translation plugin that also changes the PDF reader.

The read marked these borderline assignments right:

- `pdfpreview@windingwind.com` as PDF reading, for a preview of attachments.
- `zotero-memory-management@unitian` as PDF reading, for the reader's memory.
- `bibtex-clean@ouyangjiahong.github.io` as export, since it cleans BibTeX export.
- `pdftrim-for-llm@shengjiejin.github.io` as AI assistants, since it trims PDFs for an LLM.
- `zsearch@z-search.dev` as attachments, for open-access PDFs.

## Ledger

One line per record of the deployed data, in id order: its categories by slug
and the read's mark, or `none`.

- `DigiVatLibpdf@patzold.net`: attachments (right)
- `Knowledge4Zotero@windingwind.com`: notes (right)
- `RIOPACAddChapter@noidea.com`: metadata (right). Excluded: notes
- `abbreviation-helper@cydoimos.github.io`: pdf-reading (right)
- `add-missing-snapshots@seanlawsonphd`: attachments (right)
- `addontemplate@euclpts.com`: none
- `adhd-lens@observagp`: pdf-reading (right)
- `ai-summary@local`: ai, notes (right)
- `ai4paper-v2@cpc.dev`: ai, translation, notes, metadata, rankings, search (right)
- `aidea@visterainer`: ai, translation (right)
- `alphalikes@iris`: rankings (right). Excluded: organization
- `annota@equiriconi`: ai, notes (right)
- `annotation-links@mobench.dev`: notes (right)
- `arxiv-marker@lele.dev`: rankings (right). Excluded: ai
- `arxiv2zh@kongyan66`: translation (right)
- `arxiv@allanchain.github.com`: none
- `arxiv_marker_ccf2026@local`: rankings (right)
- `askgpt@askgpt.zotero`: ai, translation, notes (right). Excluded: attachments
- `assistente-ia@sbhg.pt`: ai (right)
- `attachments-markdown@harrywang`: attachments, export (right). Excluded: citations
- `attachmentscanner@changlab.um.edu.mo`: attachments (right). Excluded: metadata
- `autoattach@adolinjonathan-bot.github.io`: ai-tools (right). Excluded: ai, notes, metadata
- `babeldoc-sidebyside@codex.local`: translation (right)
- `beaver@jlegewie.com`: ai (right)
- `better-bibtex@iris-advies.com`: citations (right)
- `better-find-full-text@example.com`: attachments (right). Excluded: metadata
- `betterauthors@github.com`: none
- `bibgenie@outlook.com`: ai (right)
- `bibtex-clean@ouyangjiahong.github.io`: citations, metadata, export (right). Excluded: notes, attachments
- `bilingual-linked-reader@houxin2024.github.io`: translation (right)
- `bilingual-pdf@local.zotero`: translation (right)
- `bilingual-reader@zbr.local`: ai, translation (right)
- `bionicReader@euclpts.com`: pdf-reading (right)
- `careertracker@zotero.org`: none. Excluded: organization
- `ccf-for-zotero@nyaru177.github.io`: rankings (right)
- `ccfplus@timetrapzz.site`: rankings (right)
- `ccfrank@timetrapzz.site`: rankings (right). Excluded: organization
- `chat@zotero-mcp`: ai, notes, ai-tools (right)
- `citation-graph@julianschelb.github.io`: search (right)
- `citestamp@citestamp.com`: none. Excluded: search
- `codex-bilingual-reader@geyi.net`: ai, translation (right)
- `colecoes-coloridas-zotero@joao-fisio`: appearance (include) (right)
- `color-keys@meaning-infinite`: notes (right)
- `condense-info-view@example.com`: appearance (include) (right)
- `creator-pinyin-sort@local`: metadata (right)
- `crop-to-margin@waelitani.github.io`: pdf-reading (right)
- `csvenue@zotero-plugin`: rankings (right)
- `daeda@mit.edu`: notes, export (right). Excluded: organization
- `deepread@lsy-aia.github.io`: ai, translation, notes (right)
- `delitemwithatt@redleaf.me`: attachments (right)
- `dev@daeh.info`: rankings (right)
- `djvu-converter@zotero.org`: attachments (right)
- `duplicate-doctor@pandaaigc.github.io`: metadata (right)
- `en2zotero@hostiuc.com`: citations (right)
- `estravon@tiberavon.com`: export (right)
- `flexannotate@justanotherjurastudent.github.io`: notes (right)
- `focus-note-column@example.com`: notes, organization (right)
- `focus-reader@zoteroreader.local`: pdf-reading, notes (right)
- `fullvahti@vahtian.com`: attachments (right). Excluded: metadata, organization
- `gbt7714-2025-helper@wangzfof.github.io`: citations, metadata (right)
- `glossa-zotero@yiiwang118`: ai, translation, notes (right)
- `glossa@openzotero.org`: ai, translation (right)
- `group-tabs-by-collection@example.com`: organization (right). Excluded: attachments
- `hermes@techne-tools.org`: ai (right)
- `hfdailypapers@arno.dev`: search, organization (right)
- `hjfy-arxiv@translator.com`: translation (right)
- `imprint@katew11.github.io`: notes, metadata, attachments, export (right)
- `jasminum@linxzh.com`: metadata, attachments (right). Excluded: citations
- `journaltags@chen7447`: rankings, organization (right)
- `keep-reader-ready@local.invalid`: pdf-reading (right)
- `keepzotero@yhmtsai`: none
- `keyword-highlighter@zotero-plugin`: pdf-reading (include) (right)
- `know-ur-zotero@euclpts.com`: none
- `latex-suite@ievlevpn.github.io`: notes (right). Excluded: export
- `lidia-zotero@cdh.uu.nl`: notes (right)
- `line-focus@junyeol.dev`: pdf-reading (right)
- `llm-for-zotero-sync@cszr`: ai, notes, export (right)
- `llm-for-zotero-translator@cszr`: ai, translation (right)
- `local-mdx-click@noahx.local`: translation (right)
- `manuelarunge10@gmail.com`: metadata (right)
- `margincarry@0then0.github.io`: notes (right)
- `marginmind@github.vastronghq.com`: ai, translation (right)
- `mc2zotero@hostiuc.com`: citations (right)
- `mcp-rdp@zotero.org`: ai-tools (right). Excluded: ai
- `mdbundle@williammendes.dev`: citations, attachments, export (right)
- `metadatahunter@federicotorrielli.github.io`: metadata (right)
- `metadatascraper@creling`: metadata (right)
- `mktero@tenglvjun.github.io`: export (right)
- `modern-zotero-themes@xzhang001.github.io`: appearance (right). Excluded: organization
- `narrative-citations@jderrfuss.github.io`: citations (right)
- `nodus-zotero@nodus.app`: notes (right). Excluded: attachments
- `notero@vanoni.dev`: notes, export (right)
- `paper-chat-for-zotero@suzuka24.github.io`: ai (right)
- `paper-library-checker@he-chun.github.io`: none. Excluded: metadata
- `paper-outline@example.com`: ai, notes (right)
- `paper-reading-agent@xiaoxuan.li`: ai (right)
- `paper-talk-zotero@kromiii.github.io`: ai (right)
- `paper-translator@danielsu.local`: ai, translation (right)
- `paperbridge@example.com`: ai, translation (right)
- `papercompare@local.research`: none
- `paperlens@alanzeng.local`: ai, translation (right)
- `papermind-connector@papermind.local`: ai, translation (right)
- `paperminer@paperminer.org`: ai, translation, rankings (right)
- `paperpilot@zotero.org`: ai, translation, notes (right). Excluded: export
- `paperrouter@keshen-zhou.github.io`: ai, organization (right)
- `paperzorro@paperzorro.io`: ai, search (right)
- `papilot@dev.local`: ai, translation, metadata, organization (right)
- `pdf-attachment-downloader@vic-c33.github.io`: attachments (right)
- `pdf-fetcher@yuric.local`: attachments (right)
- `pdf-metadata-refresh@zotero.org`: metadata (right)
- `pdf-noir@zotero-plugins`: pdf-reading, appearance (right)
- `pdf2zh@guaguastandup.com`: ai, translation (right)
- `pdfpreview@windingwind.com`: pdf-reading (include), attachments (right)
- `pdfrename@theigrams.com`: attachments (right)
- `pdfsethorizontalscroll@euclpts.com`: pdf-reading (right)
- `pdftrim-for-llm@shengjiejin.github.io`: ai (right). Excluded: export
- `popfish@moonbow.dev`: rankings (right)
- `pp2zotero@hostiuc.com`: citations (right)
- `preprint-bridge@research.local`: metadata, search (right). Excluded: notes
- `prism@zotero-prism.org`: ai, translation (right)
- `qref@janr383.github.io`: organization (right)
- `random-read@zpeters`: organization (right)
- `reading-list@hotmail.com`: organization (right)
- `reading-queue-numbers@catcodeme.github.io`: organization (right)
- `readingflow@moon.com`: pdf-reading, organization (right)
- `readwise2zotero@seanlawson.net`: notes, export (right)
- `refdetect@hostiuc.com`: citations (right)
- `reference-map-connect@anoopkcn`: search (right). Excluded: metadata
- `reginamarza@gmail.com`: organization (right)
- `register02@cn.nutstore.net`: none
- `repository-detector@example.com`: attachments (right). Excluded: metadata
- `researchopia@zotero.plugin`: notes (right)
- `retrieval-index@sit2023.local`: ai-tools (right). Excluded: ai
- `scidownload@chen`: attachments (right). Excluded: metadata
- `scientific-name-italicizer@example.com`: metadata (right)
- `scite-zotero-plugin@scite.ai`: rankings (right)
- `seerai@zotero.org`: ai, ai-tools (right). Excluded: attachments
- `semantic-search@ildon.github.io`: ai, search, ai-tools (right)
- `semantic-tagger@zotero.local`: ai, organization (right)
- `site-metadata@barish.me`: metadata (right)
- `snowball-sources@socratic-irony.github.io`: search (right)
- `structured-tags@williamwhite.github.io`: notes, organization (right)
- `style-personal@nebularaven.local`: rankings (right)
- `super-scholar@Kohirus`: ai, export (right)
- `support@noedgeai.com`: ai, translation, notes, export (right)
- `syllabus@janbaykara.com`: organization (right)
- `tag-cited@onyxaegis.github.io`: citations, organization (right)
- `tagwiz@tsmdt.github.io`: organization (right). Excluded: metadata
- `tara@linxzh.com`: export (right)
- `theorem-list@local`: pdf-reading (right)
- `titledrop@local`: attachments (right)
- `todolist@groele.org`: organization (right)
- `ufc-zotero-plugin@saviotp`: citations (right)
- `vocabflow@moon.com`: translation (right)
- `washo-salvager@yasu.github.io`: metadata (right)
- `watch-folder@zotero-plugin.org`: metadata, attachments (right). Excluded: export
- `wayback-autosave@pranesh`: attachments (right)
- `weavero@mjthoraval`: none. Excluded: ai
- `wenxianyidu@wenxianyidu.local`: translation (right)
- `yangmei@yuanxuzhineng.com`: ai (right)
- `yaobian@zotero`: appearance (right)
- `zenotes@alefa.net`: notes (right)
- `zofiles@zofiles.dev`: notes, export, ai-tools (right). Excluded: ai, citations
- `zometaker@senior-developer`: metadata (right)
- `zontex-bridge@endoretic.github.io`: metadata, ai-tools (include) (right). Excluded: ai, notes
- `zoplicate@chenglongma.com`: metadata (right)
- `zotagent@shzhao.local`: ai, notes (right)
- `zotclip@cvrsg.dev`: ai, attachments, organization (right)
- `zotdupe@hostiuc.com`: metadata (right). Excluded: translation
- `zotero-agent-bridge@zotero-agent`: ai-tools (right). Excluded: ai
- `zotero-agent-copilot@KinomotoMio.github.io`: ai (right)
- `zotero-agentibility@local`: ai-tools (right). Excluded: ai
- `zotero-ai-assistant@agentpaper.dev`: ai (right)
- `zotero-ai-butler@github.com`: ai, notes (right)
- `zotero-ai-explain@vishnutskumar.github.io`: ai (right)
- `zotero-ai-guided-reader@jhj223`: ai, notes, export (right)
- `zotero-ai-notes@paper-ai.local`: ai, notes (right)
- `zotero-ai-sidebar@local`: ai (right)
- `zotero-alt-reader@hyxi.dev`: pdf-reading (include) (right)
- `zotero-annotation-markdown@34028312.qq.com`: notes (right)
- `zotero-annotations-count@hotmail.com`: notes, organization (right)
- `zotero-ask@benshenhar.com`: ai (right)
- `zotero-better-translate@zrb.local`: ai, translation (right)
- `zotero-citation-counts@tangzhao20`: rankings (right)
- `zotero-citation-graph@jajaho.dev`: search (right)
- `zotero-claude-code@yufeixia`: ai (right)
- `zotero-codex-bridge@myang-print.github.io`: metadata, ai-tools (right). Excluded: ai
- `zotero-context-translate@maverickzyc.github.io`: ai, translation (right)
- `zotero-cool-paper@andybear`: ai, search (right)
- `zotero-deselect@local`: none
- `zotero-docling@max3925vats`: attachments, export (right)
- `zotero-elsevier-fulltext@ching-chiang.github.io`: attachments (right)
- `zotero-except@local`: none. Excluded: export
- `zotero-extra-columns@fredyyoussif.github.io`: organization (right). Excluded: export
- `zotero-eye-care@zhaopu.local`: pdf-reading, appearance (right)
- `zotero-feed-management@unitian`: export, organization (right). Excluded: metadata
- `zotero-feed-sort@sebastiansherrah.github.io`: organization (right)
- `zotero-folder-drop-importer@open-source`: organization (right)
- `zotero-format-metadata@northword.cn`: metadata (right)
- `zotero-glass@avi7ii.github.io`: appearance (right)
- `zotero-keep-window@luke-evan`: none
- `zotero-language-categorizer@cboulanger.github.io`: metadata (right)
- `zotero-llm@github.com.yilewang`: ai (right)
- `zotero-md-note@example.com`: notes (right). Excluded: attachments
- `zotero-memory-management@unitian`: pdf-reading (include) (right). Excluded: organization
- `zotero-mouse-navigation@coro-afk.github.io`: pdf-reading (right)
- `zotero-name-normalizer@marcinmilkowski.pl`: metadata (right)
- `zotero-notebooklm@peterdresslar.com`: ai, export (right)
- `zotero-notes-sync@lojeunhou.github.io`: notes, export (right)
- `zotero-ocr@bib.uni-mannheim.de`: attachments (right). Excluded: notes
- `zotero-openalex@example.com`: metadata (right)
- `zotero-pdf-deduplicator@xuan.dev`: attachments (right). Excluded: metadata
- `zotero-pdf-highlighter@memorushb.com`: ai, notes (include) (right)
- `zotero-pdf-transfer@charlesapetersen.github.io`: attachments (right). Excluded: notes, organization
- `zotero-pdf2md@qingpy.github.io`: attachments, export (right)
- `zotero-pdf2zh-pro@study-233`: ai, translation (right)
- `zotero-pdf2zh@yuriyagn.github.io`: translation (right)
- `zotero-pin-items@hotmail.com`: organization (right)
- `zotero-rag@cboulanger.github.io`: ai (right)
- `zotero-reading-bridge@volatile.static`: ai-tools (right). Excluded: ai
- `zotero-reference-linker@ottersem.github.io`: pdf-reading (right)
- `zotero-remarkable@alfakini.github.io`: notes, export (right)
- `zotero-search-replace@marcinmilkowski.pl`: metadata (right)
- `zotero-settings-sync@gaviiiinnnn.github.io`: export (right). Excluded: citations
- `zotero-sideline@shiys.local`: ai, translation, notes (right). Excluded: attachments
- `zotero-skimming@00sapo.org`: notes (right)
- `zotero-split-theme@diraw.github.io`: appearance (right)
- `zotero-tag-logic@kanhao100`: organization (right)
- `zotero-title-translator@zhouyi654.github.io`: translation (right)
- `zotero-trackpad-navigation@luigicatello`: pdf-reading (right)
- `zotero-tts@xujialiu.top`: pdf-reading (right). Excluded: export
- `zotero-vim-plus@zotero-vim`: pdf-reading, notes (right)
- `zotero-voice-edge@local`: pdf-reading (right)
- `zotero-wallpaper@endoretic.github.io`: appearance (right)
- `zotero-warm-theme@yufeixia`: appearance (right)
- `zotero-wiki-citations@quinn.dev`: pdf-reading (right). Excluded: citations
- `zotero2notion@local.plugin`: export (right)
- `zotero@equalang.com`: translation (right). Excluded: attachments
- `zoteroAddons@ytshen.com`: none
- `zoteroEvidence@xiaojianjun.cn`: ai (right)
- `zoterochat@bowentian`: ai, notes (right)
- `zoterocitation@polygon.org`: citations (right)
- `zoterocitepreviewresizer@local`: pdf-reading (right)
- `zoteroeasygpt@euclpts.com`: ai (right)
- `zoterofigure@polygon.org`: none
- `zoterogpt-sidebar@workbuddy.local`: ai (right)
- `zoterogpt@polygon.org`: ai (right)
- `zoterojs-bridge@local`: ai-tools (right). Excluded: metadata
- `zoterolinkedmindmaps@oekeur.github.io`: notes (right)
- `zoteromaimemosync@luotiantian.com`: translation, notes, export (right)
- `zoteropdftranslate@euclpts.com`: translation, notes (right). Excluded: metadata
- `zoteroreference@polygon.org`: pdf-reading (right)
- `zoteroreviewassistant@alima-webdev.com`: none
- `zoteroshortdoi@wiernik.org`: metadata (right)
- `zoterostyle@polygon.org`: translation, notes, rankings, organization (right)
- `zoterotag@euclpts.com`: organization (right)
- `zoterotimeline@oekeur.github.io`: none. Excluded: organization
- `zoterotldr@syt.com`: none
- `zotgit@khodami.com`: attachments, export (right)
- `zotlit@aidenlx.site`: notes, export (right)
- `zotmeta@roadtodream.tech`: metadata (right)
- `zotmoov@wileyy.com`: attachments (right)
- `zotracer@euclpts.com`: notes, export (right). Excluded: organization
- `zotron@diamondrill`: ai-tools (right). Excluded: ai, notes
- `zsearch@z-search.dev`: attachments, rankings, search (right)
- `ztldr@aguvener`: none
- `zusia@firekern.github.io`: ai (right). Excluded: appearance
- `zys-notebook@kazys.local`: ai (right)
- `zys-pane@kazys.local`: metadata, attachments (right)
- `zys-praetor@kazys.local`: ai (right)
- `zys-reader@kazys.local`: pdf-reading (right)
- `zys-theme@kazys.local`: appearance (right)

## Disposition

The read's results back AC7 of M066. The rules that it tuned live in
`CATEGORIES`, and `test/categories.test.ts` locks their shape. If a later
tuning changes many assignments, it writes a new read here or in its
milestone.

## Open questions

- The open bot pull requests give 2 wrong of 27 and 3 of 19 with none. No later read checks new plugins on the deployed data — observed 2026-10-31.
- M067's description overrides changed the categories of 15 plugins after this read. `description-ledger.md`, section "Category changes", holds that read and the 9 excludes it added. The rows here for those plugins predate it — observed 2026-10-31.
