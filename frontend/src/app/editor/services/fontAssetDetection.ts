/**
 * Decide which OPTIONAL typst.ts font asset groups a compile actually needs.
 *
 * Loading every bundled group up front (`assets: ['text','cjk','emoji']`)
 * cost ~40 MB and hundreds of requests per session — almost always for
 * nothing, because TLU documents are Vietnamese (Latin script). Instead the
 * worker starts with the 'text' group only and re-initialises the compiler
 * with extra groups the first time a document actually needs them:
 *
 *   - any CJK codepoint in a source file            → 'cjk'
 *   - any emoji codepoint                            → 'emoji'
 *   - a CJK/emoji font FAMILY mentioned in the source (covers
 *     `#set text(font: "Noto Serif CJK SC")` typed before any CJK
 *     character exists)                              → matching group
 *
 * False positives are cheap (one extra font download); false negatives mean
 * tofu glyphs until detection catches up — so patterns lean inclusive.
 */

export type ExtraFontAsset = "cjk" | "emoji";

// Han + kana + hangul + CJK punctuation/extensions (BMP + astral via \u{...}).
const CJK_CHAR_RE =
  /[ᄀ-ᇿ⺀-⻿　-〿぀-ヿ㄀-ㄯ㄰-㆏ㇰ-ㇿ㐀-䶿一-鿿가-힯豈-﫿＀-￯]|[\u{20000}-\u{2FA1F}]/u;

// Pictographic emoji + symbol blocks commonly served by color-emoji fonts.
// Excludes bare VS16 (FE0F) on purpose — it only matters next to a base char
// these ranges already catch.
const EMOJI_CHAR_RE =
  /[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}☀-➿⬀-⯿]/u;

// Font families that imply a group even before matching characters exist.
const CJK_FONT_NAME_RE =
  /noto\s*(sans|serif)\s*cjk|source\s*han|simsun|simhei|fangsong|kaiti|ms\s*(gothic|mincho)|yu\s*(gothic|mincho)|meiryo|hiragino|pingfang|malgun|nanum|batang|gulim/i;
const EMOJI_FONT_NAME_RE = /emoji/i;

// Scanning is O(content); cap per file so a pathological multi-MB text file
// can't stall the compile pipeline. CJK/emoji usage virtually always shows
// up early (titles, abstracts, first paragraphs).
const SCAN_LIMIT = 512 * 1024;

/** Which extra asset groups do these source files require? */
export function detectExtraFontAssets(
  files: Record<string, string | Uint8Array>,
): ExtraFontAsset[] {
  let needCjk = false;
  let needEmoji = false;

  for (const content of Object.values(files)) {
    if (typeof content !== "string") continue;
    const text =
      content.length > SCAN_LIMIT ? content.slice(0, SCAN_LIMIT) : content;
    if (!needCjk && (CJK_CHAR_RE.test(text) || CJK_FONT_NAME_RE.test(text))) {
      needCjk = true;
    }
    if (
      !needEmoji &&
      (EMOJI_CHAR_RE.test(text) || EMOJI_FONT_NAME_RE.test(text))
    ) {
      needEmoji = true;
    }
    if (needCjk && needEmoji) break;
  }

  const out: ExtraFontAsset[] = [];
  if (needCjk) out.push("cjk");
  if (needEmoji) out.push("emoji");
  return out;
}

/** True when `requested` contains a group missing from `loaded`. */
export function needsAssetReload(
  loaded: ReadonlySet<ExtraFontAsset>,
  requested: readonly ExtraFontAsset[],
): boolean {
  return requested.some((asset) => !loaded.has(asset));
}
