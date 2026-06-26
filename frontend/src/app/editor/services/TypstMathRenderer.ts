/**
 * TypstMathRenderer — render a single math fragment as SVG via typst.ts.
 *
 * Why not MathLive: MathLive's `<math-field>` natively speaks LaTeX. Our
 * source is Typst (`$ integral_a^b f(x) dif x $`, `$ mat(1,0;0,1) $`,
 * `$ frac(a, b) $`), which uses a similar-but-different syntax. A
 * conservative Typst→LaTeX translator covers maybe 20% of real-world thesis
 * math; the rest renders as raw token names (`mat`, `dif`, …), which is
 * worse UX than no preview at all.
 *
 * Instead we follow Overleaf's pattern — feed the actual source to the
 * compiler and show the rendered output. typst.ts has a tiny enough cold
 * start (already initialised by the main preview pane) that compiling a
 * single equation feels instantaneous after the first call.
 *
 * Output is the raw SVG string, with the page chrome stripped (we only want
 * the math glyphs, not an A4 page). Cached by `<content, kind>` so cursor
 * movement within the same region is free after the first render.
 */

import { getTypstPreviewClient } from "./typstPreviewInstance";

const CACHE_MAX = 128;
const cache = new Map<string, string>();

const PREAMBLE_INLINE = [
  // Auto-size the page so the resulting SVG hugs the math glyphs.
  "#set page(width: auto, height: auto, margin: 4pt)",
  // Use a thesis-appropriate default size so the preview matches the
  // surrounding document feel.
  "#set text(size: 14pt)",
  "",
].join("\n");

const PREAMBLE_DISPLAY = [
  "#set page(width: auto, height: auto, margin: 6pt)",
  "#set text(size: 16pt)",
  "",
].join("\n");

function cacheKey(content: string, kind: "inline" | "display"): string {
  return `${kind}|${content}`;
}

function lruInsert(key: string, value: string): void {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  // Trim oldest entries when over capacity.
  if (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

/**
 * Render a single math fragment.
 *
 * @param content The body between `$ … $` (no surrounding dollars).
 * @param kind    `inline` or `display` — affects font size and spacing.
 * @returns       SVG markup ready for `dangerouslySetInnerHTML`. On compile
 *                failure returns `null` (caller can fall back to plain text).
 */
export async function renderMathSvg(
  content: string,
  kind: "inline" | "display",
): Promise<string | null> {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const key = cacheKey(trimmed, kind);
  const hit = cache.get(key);
  if (hit !== undefined) {
    // Re-insert to refresh LRU position.
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }

  const preamble = kind === "display" ? PREAMBLE_DISPLAY : PREAMBLE_INLINE;
  // Wrap source in the appropriate math delimiters. For display math we add
  // whitespace inside `$ … $` so Typst treats it as block; for inline math
  // we keep it tight.
  const wrapped =
    kind === "display"
      ? `${preamble}$ ${trimmed} $\n`
      : `${preamble}$${trimmed}$\n`;

  try {
    const client = getTypstPreviewClient();
    // overlay: fragment rides on top of the worker's project compile session
    // instead of wiping it — widget renders must not thrash document compiles.
    const { svg } = await client.compileSvg(
      { "math.typ": wrapped },
      "math.typ",
      { overlay: true },
    );
    const stripped = stripTypstPageChrome(svg);
    lruInsert(key, stripped);
    return stripped;
  } catch (err) {
    // Compile failure is expected for malformed math — caller renders the
    // raw source as a fallback.
    console.debug("[TypstMathRenderer] compile failed:", err);
    return null;
  }
}

/**
 * Synchronous read of the cache — useful when we want to render
 * immediately if the value is already known and otherwise show a placeholder
 * while the async render runs.
 */
export function peekMathSvg(
  content: string,
  kind: "inline" | "display",
): string | null {
  return cache.get(cacheKey(content.trim(), kind)) ?? null;
}

// Chemistry (whalogen — a Typst port of LaTeX mhchem). Typst has no `\ce{}`;
// we feed `#ce("…")` to the real compiler with the package imported, exactly
// like the math path, so the preview matches the PDF.
const WHALOGEN_IMPORT = '#import "@preview/whalogen:0.3.0": ce';
const PREAMBLE_CHEM = [
  "#set page(width: auto, height: auto, margin: 4pt)",
  "#set text(size: 14pt)",
  WHALOGEN_IMPORT,
  "",
].join("\n");

/**
 * Render a single `#ce("…")` chemical formula to SVG. `formula` is the inner
 * string (without the surrounding `#ce("…")`). Returns null on compile
 * failure (caller falls back to raw text). Cached under a `chem|` key.
 */
export async function renderChemSvg(formula: string): Promise<string | null> {
  const trimmed = formula.trim();
  if (!trimmed) return null;

  const key = `chem|${trimmed}`;
  const hit = cache.get(key);
  if (hit !== undefined) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }

  const wrapped = `${PREAMBLE_CHEM}#ce(${JSON.stringify(trimmed)})\n`;
  try {
    const client = getTypstPreviewClient();
    const { svg } = await client.compileSvg({ "chem.typ": wrapped }, "chem.typ", {
      overlay: true,
    });
    const stripped = stripTypstPageChrome(svg);
    lruInsert(key, stripped);
    return stripped;
  } catch (err) {
    console.debug("[TypstMathRenderer] chem compile failed:", err);
    return null;
  }
}

/** Synchronous cache read for chemistry — mirrors `peekMathSvg`. */
export function peekChemSvg(formula: string): string | null {
  return cache.get(`chem|${formula.trim()}`) ?? null;
}

/**
 * Strip the outer page wrapper Typst emits when compiling a tiny fragment so
 * the SVG hugs the glyphs. typst.ts SVG output has a recognisable structure:
 * one or more `<g class="typst-page">` blocks per page. For a single-fragment
 * compile there's exactly one page; we keep its contents but ensure the
 * outer `<svg>` element's viewBox is the actual content bounding box.
 */
function stripTypstPageChrome(svg: string): string {
  // Remove the white page background rect that typst.ts inserts.
  // It always has `fill="#ffffff"` (or `#fff`) and matches the full viewBox.
  return svg.replace(
    /<path [^>]*?class="typst-shape"[^>]*?fill="#fff(?:fff)?"[^>]*?\/>/g,
    "",
  );
}

/** Clear the cache (useful when switching projects). */
export function clearMathCache(): void {
  cache.clear();
}
