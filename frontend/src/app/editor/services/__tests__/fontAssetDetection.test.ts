import { describe, it, expect } from "vitest";
import {
  detectExtraFontAssets,
  needsAssetReload,
} from "../fontAssetDetection";

describe("detectExtraFontAssets", () => {
  it("returns nothing for Vietnamese/Latin documents", () => {
    expect(
      detectExtraFontAssets({
        "main.typ": "= Chương 1: Đặt Vấn Đề\nTrong thời đại số hóa, đề tài…",
        "refs.bib": "@article{key, title={Tổng quan}}",
      }),
    ).toEqual([]);
  });

  it("detects CJK characters (Han / kana / hangul)", () => {
    expect(detectExtraFontAssets({ "a.typ": "tiêu đề 中文 nội dung" })).toEqual(["cjk"]);
    expect(detectExtraFontAssets({ "a.typ": "カタカナ" })).toEqual(["cjk"]);
    expect(detectExtraFontAssets({ "a.typ": "한국어" })).toEqual(["cjk"]);
  });

  it("detects emoji codepoints", () => {
    expect(detectExtraFontAssets({ "a.typ": "kết quả 🎉" })).toEqual(["emoji"]);
    expect(detectExtraFontAssets({ "a.typ": "cảnh báo ⚠ chú ý" })).toEqual(["emoji"]);
  });

  it("detects a CJK font family before any CJK character exists", () => {
    expect(
      detectExtraFontAssets({
        "a.typ": '#set text(font: "Noto Serif CJK SC")\nXin chào',
      }),
    ).toEqual(["cjk"]);
  });

  it("detects an emoji font family by name", () => {
    expect(
      detectExtraFontAssets({
        "a.typ": '#set text(font: "Noto Color Emoji")',
      }),
    ).toEqual(["emoji"]);
  });

  it("returns both groups when both are present", () => {
    expect(detectExtraFontAssets({ "a.typ": "中文 🎉" })).toEqual([
      "cjk",
      "emoji",
    ]);
  });

  it("ignores binary files", () => {
    expect(
      detectExtraFontAssets({ "img.png": new Uint8Array([0x89, 0x50]) }),
    ).toEqual([]);
  });
});

describe("needsAssetReload", () => {
  it("requests a reload only for missing groups", () => {
    expect(needsAssetReload(new Set(), ["cjk"])).toBe(true);
    expect(needsAssetReload(new Set(["cjk"]), ["cjk"])).toBe(false);
    expect(needsAssetReload(new Set(["cjk"]), ["cjk", "emoji"])).toBe(true);
    expect(needsAssetReload(new Set(["cjk", "emoji"]), [])).toBe(false);
  });
});
