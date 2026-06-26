/// <reference lib="webworker" />

// =============================================================================
// Font Preloader — eager-fetch raw font bytes for both compiler and renderer.
// =============================================================================
//
// Pattern adapted from `references/texlyre/src/extensions/typst.ts/typst-worker.ts:86-110`.
//
// Why this exists:
//   The previous worker used typst.ts's `loadFonts(urls, { assets })` helper,
//   which resolves URLs lazily — the compiler/renderer internally fetches a
//   font only when it first encounters a glyph that needs it. For CDN-hosted
//   assets ('cjk', 'emoji'), the first compile would race with the CDN fetch
//   and fall back to tofu boxes. Pre-fetching all bytes up front guarantees
//   every glyph is ready when init() returns.
//
// Tier strategy:
//   - CORE: bundled in public/fonts/core/. Always loaded.
//   - CJK: bundled (Noto Sans CJK SC). Optional via includeCjk flag.
//   - EMOJI: bundled (Noto Color Emoji). Optional via includeEmoji flag.
// =============================================================================

/** Latin / math / sans fonts. All ~6 MB combined; load on every worker init. */
export const CORE_FONT_URLS: string[] = [
  "/fonts/core/times.ttf",
  "/fonts/core/timesbd.ttf",
  "/fonts/core/timesi.ttf",
  "/fonts/core/timesbi.ttf",
  "/fonts/core/IBMPlexSans-Regular.ttf",
  "/fonts/core/IBMPlexSans-Bold.ttf",
  "/fonts/core/NewCMMath-Regular.otf",
  "/fonts/core/NewCMMath-Book.otf",
];

/**
 * CJK (Chinese, Japanese, Korean). ~16 MB each — only load when content needs it.
 *
 * NOTE 2026-06-11: the LIVE worker path no longer eager-loads these — CJK +
 * emoji groups now join on demand from typst.ts's CDN asset bundles (see
 * `fontAssetDetection.ts` + `ensureFontAssets` in typstWorker.ts). The local
 * copies below stay in public/fonts/core per product decision (kept for a
 * future eager/offline path) at the cost of ~57 MB in the deploy artifact.
 */
export const CJK_FONT_URLS: string[] = [
  "/fonts/core/NotoSansCJKsc-Regular.otf",
  "/fonts/core/NotoSansCJKsc-Bold.otf",
];

/** Emoji glyphs. ~10 MB. */
export const EMOJI_FONT_URLS: string[] = [
  "/fonts/core/NotoColorEmoji.ttf",
];

export interface PrefetchFontBytesOptions {
  /** Include the CJK font bundle. Default: true. */
  includeCjk?: boolean;
  /** Include the emoji font bundle. Default: false (saves ~10 MB on cold start). */
  includeEmoji?: boolean;
}

/**
 * Fetch all configured font URLs in parallel and return the raw bytes ready
 * for `builder.add_raw_font()`.
 *
 * Behavior:
 *   - Each URL is fetched independently. A single 404 or network error logs a
 *     warning and is skipped — the rest still resolve.
 *   - Returns `Uint8Array[]` ordered roughly the same as the input URL list,
 *     with failed entries omitted (so the caller can safely iterate).
 *   - Logs total wall-clock time + success count.
 */
export async function prefetchFontBytes(
  options: PrefetchFontBytesOptions = {},
): Promise<Uint8Array[]> {
  const { includeCjk = true, includeEmoji = false } = options;
  const urls = [
    ...CORE_FONT_URLS,
    ...(includeCjk ? CJK_FONT_URLS : []),
    ...(includeEmoji ? EMOJI_FONT_URLS : []),
  ];

  const t0 = performance.now();

  const buffers = await Promise.all(
    urls.map(async (url): Promise<Uint8Array | null> => {
      try {
        const absoluteUrl = new URL(url, self.location.origin).href;
        const response = await fetch(absoluteUrl);
        if (!response.ok) {
          console.warn(
            `[Worker/fonts] Skip ${url} — status ${response.status}`,
          );
          return null;
        }
        return new Uint8Array(await response.arrayBuffer());
      } catch (err) {
        console.warn(`[Worker/fonts] Skip ${url} — fetch error:`, err);
        return null;
      }
    }),
  );

  const fonts = buffers.filter((b): b is Uint8Array => b !== null);
  const t1 = performance.now();
  const totalBytes = fonts.reduce((s, b) => s + b.byteLength, 0);
  console.log(
    `[Worker/fonts] Loaded ${fonts.length}/${urls.length} fonts (${(totalBytes / 1024 / 1024).toFixed(1)} MB) in ${(t1 - t0).toFixed(0)} ms`,
  );
  return fonts;
}
