import { describe, expect, test } from "vitest";
import { cjkShare, type DescriptionRecord, shownDescription } from "../src/site/description.ts";

function record(name: string, description: string | undefined, overrides: DescriptionRecord["overrides"] = []): DescriptionRecord {
  return { id: "a@example.org", upstream: { version: "2.0.0", name, description }, overrides };
}

describe("shownDescription", () => {
  test.each([
    ["Zotero OCR", "Zotero Plugin for OCR"],
    ["Scite Zotero Plugin (V7+)", "Scite Zotero Plugin (V7+)"],
    ["Zotero PDF Preview", "PDF Preview for Zotero."],
  ])("hides the name-only description of %s", (name, description) => {
    expect(shownDescription(record(name, description))).toBeUndefined();
  });

  test.each([
    ["ZotLit", "Zotero companion plugin for ZotLit"],
    ["Jasminum", "一个简单的 Zotero 中文插件"],
  ])("keeps the description of %s", (name, description) => {
    expect(shownDescription(record(name, description))).toBe(description);
  });

  test("hides a name-only description whose accents use another Unicode form", () => {
    expect(shownDescription(record("Café Notes", "Café Notes for Zotero"))).toBeUndefined();
  });

  test("hides a blank description", () => {
    expect(shownDescription(record("Zotero OCR", "  \n"))).toBeUndefined();
  });

  test("hides a missing description", () => {
    expect(shownDescription(record("Zotero OCR", undefined))).toBeUndefined();
  });

  test("shows a description override over a name-only description", () => {
    const corrected = record("Zotero OCR", "Zotero Plugin for OCR", [
      { field: "description", value: "Runs OCR on PDFs." },
    ]);
    expect(shownDescription(corrected)).toBe("Runs OCR on PDFs.");
  });

  test("ignores a description override for another plugin version", () => {
    const stale = record("Zotero OCR", "Zotero Plugin for OCR", [
      { field: "description", version: "1.0.0", value: "Runs OCR on PDFs." },
    ]);
    expect(shownDescription(stale)).toBeUndefined();
  });

  test("compares with the name after a name override", () => {
    const renamed = record("Zotero OCR", "OCR for Zotero", [{ field: "name", value: "Tesseract" }]);
    expect(shownDescription(renamed)).toBe("OCR for Zotero");
  });

  test("shows a description override over a manifest and a GitHub description", () => {
    const both = withGitHub(record("Notes", "Takes notes.", [{ field: "description", value: "Edits notes." }]), "Keeps notes.");
    expect(shownDescription(both)).toBe("Edits notes.");
  });

  const EN = "Takes notes beside each paper.";
  const EN_GITHUB = "Keeps notes next to each PDF.";
  const ZH = "在 Zotero 中记笔记";
  const ZH_LONG = "在文献旁边记录笔记并整理卡片";
  test.each<[string, string | undefined, string | undefined, string | undefined]>([
    ["English manifest and English GitHub", EN, EN_GITHUB, EN],
    ["English manifest and Chinese GitHub", EN, ZH, EN],
    ["Chinese manifest and English GitHub", ZH, EN_GITHUB, EN_GITHUB],
    ["manifest at a share of exactly 0.5 and English GitHub", "A Zotero 插件", EN_GITHUB, EN_GITHUB],
    ["Chinese manifest with Latin product names and English GitHub", "选中文字按 Ctrl K 提问，支持 PDF HTML Markdown 附件", EN_GITHUB, EN_GITHUB],
    ["Chinese manifest and mixed GitHub of lower share", ZH_LONG, "A Zotero add-on for CNKI metadata. 中文元数据", "A Zotero add-on for CNKI metadata. 中文元数据"],
    ["Chinese manifest and Chinese GitHub of higher share", ZH, ZH_LONG, ZH],
    ["equal shares at 0.5 or more", ZH_LONG, "在文献旁边整理卡片并记录笔记", ZH_LONG],
    ["Japanese manifest with kana and English GitHub", "論文の横にメモを書きます", EN_GITHUB, EN_GITHUB],
    ["Korean manifest and English GitHub", "논문 옆에 메모를 씁니다", EN_GITHUB, EN_GITHUB],
    ["name-only manifest and Chinese GitHub", "Notes for Zotero", ZH, ZH],
    ["both name-only", "Notes for Zotero", "Zotero Notes", undefined],
    ["Chinese manifest and name-only GitHub", ZH, "Notes plugin", ZH],
    ["Chinese manifest and no GitHub", ZH, undefined, ZH],
    ["digits-only manifest and English GitHub", "2026", EN_GITHUB, "2026"],
  ])("picks between a %s", (_name, manifest, github, shown) => {
    expect(shownDescription(withGitHub(record("Notes", manifest), github))).toBe(shown);
  });

  const BELOW_HALF = "Takes notes on each paper you read in your library / 在文献旁边记录笔记";
  test.each<[string, string | undefined, string | undefined, string | undefined]>([
    ["piece after ` / ` in the manifest", "用可追溯的原文证据比较论文实验 / Compare paper experiments with PDF evidence.", undefined, "Compare paper experiments with PDF evidence."],
    ["piece before ` / ` in the GitHub text", ZH, "Configurable structured tags for notes / 结构化标签与表格式文献批注插件", "Configurable structured tags for notes"],
    ["piece after `。`", "点击关闭按钮只最小化窗口，不退出。Minimize the window instead of quitting.", undefined, "Minimize the window instead of quitting."],
    ["two pieces", "为主列表增加重点内容列。Adds a key content column. / 允许为每个条目选择子笔记。 / Shows one child note per item.", undefined, "Adds a key content column. Shows one child note per item."],
    ["list of short pieces", "期刊分区 / 中科院 / JCR / 影响因子", undefined, "期刊分区 / 中科院 / JCR / 影响因子"],
    ["piece that only repeats the name", "在文献旁边记录笔记 / Zotero Notes plugin", undefined, "在文献旁边记录笔记 / Zotero Notes plugin"],
    ["text just below half CJK", BELOW_HALF, undefined, BELOW_HALF],
  ])("shows the Latin-script part of a %s", (_name, manifest, github, shown) => {
    expect(shownDescription(withGitHub(record("Notes", manifest), github))).toBe(shown);
  });
});

function withGitHub(record: DescriptionRecord, repoDescription: string | undefined): DescriptionRecord {
  return { ...record, upstream: { ...record.upstream!, repoDescription } };
}

describe("cjkShare", () => {
  test.each<[string, number]>([
    ["中文", 1],
    ["A Zotero 插件", 0.5],
    ["Zotero 插件 for notes", 0.4],
    ["2026 ✓", 0],
  ])("gives %s a share of %d", (text, share) => {
    expect(cjkShare(text)).toBeCloseTo(share);
  });
});
