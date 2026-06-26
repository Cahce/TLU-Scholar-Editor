// =============================================================================
// addRawFonts — beforeBuild factory for both compiler and renderer.
// =============================================================================
//
// typst.ts's compiler and renderer both expose a `builder.add_raw_font(bytes)`
// API at init time. The wrapper here defers font registration to the
// `beforeBuild` phase, matching the pattern used by `loadFonts()` and the
// TeXlyre reference (`references/texlyre/src/extensions/typst.ts/typst-worker.ts:131-150`).
//
// Each font is wrapped in try/catch so one corrupted file doesn't abort the
// whole init — important since a stray bad byte in one font would otherwise
// take down the entire preview pipeline.
// =============================================================================

/**
 * Build a `beforeBuild` callback that registers a list of raw font byte
 * buffers into either a `TypstCompilerBuilder` or `TypstRendererBuilder`.
 *
 * Usage:
 *   await compiler.init({
 *     getModule: ...,
 *     beforeBuild: [addRawFonts(fontBytes), withPackageRegistry(...)],
 *   });
 */
export function addRawFonts(fontBytes: Uint8Array[]) {
  return async (_: unknown, ctx: { builder: { add_raw_font(bytes: Uint8Array): Promise<void> | void } }) => {
    for (const bytes of fontBytes) {
      try {
        await ctx.builder.add_raw_font(bytes);
      } catch (err) {
        console.warn(
          "[Worker/fonts] add_raw_font failed for a font buffer; continuing:",
          err,
        );
      }
    }
  };
}
