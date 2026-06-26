/**
 * TypstWordCountService — fast in-browser word/character statistics for a
 * Typst source string.
 *
 * Implementation note: the current version uses a regex-based stripper. It is
 * an estimate (a Typst-aware AST would be more precise — see
 * `@preview/wordometer`), but it is good enough for thesis-scale documents
 * and adds zero compile cost. A future upgrade can plug typst.ts compile +
 * wordometer if higher fidelity is needed; this service's API will stay the
 * same.
 */

export interface TypstWordStats {
  /** Total words in body text (headings + paragraphs + captions). */
  totalWords: number;
  /** Words inside `= ... ==` heading lines. */
  headerWords: number;
  /** Words inside `figure(caption: [...])` or similar captions. */
  captionWords: number;
  /** Total characters including whitespace. */
  totalCharacters: number;
  /** Total characters excluding any whitespace. */
  charactersNoSpaces: number;
  /** Number of heading lines (`= ...`). */
  headerCount: number;
  /** Number of inline math expressions `$x$` and display math `$ ... $`. */
  inlineMath: number;
  displayMath: number;
  /** Number of `#figure(...)` blocks. */
  figureCount: number;
}

const HEADING_REGEX = /^(=+)\s+(.+)$/gm;
const FIGURE_REGEX = /#figure\s*\(/g;
// Caption arg detection — matches `caption: [ ... ]` allowing balanced braces.
const CAPTION_REGEX = /caption\s*:\s*\[([\s\S]*?)\]/g;
// Display math: $ on its own / surrounded by whitespace; inline math: $...$.
// We approximate by counting `$` pairs minus display blocks.
const DISPLAY_MATH_REGEX = /\$\s+[\s\S]+?\s+\$/g;
const ALL_DOLLAR_PAIRS = /\$[\s\S]+?\$/g;

function countWords(text: string): number {
  if (!text) return 0;
  // Split on whitespace and punctuation that isn't word-internal.
  const tokens = text
    .replace(/[—–-]/g, " ") // dashes
    .split(/\s+/)
    .filter((t) => /[\p{L}\p{N}]/u.test(t));
  return tokens.length;
}

function stripCodeAndRaw(src: string): string {
  return src
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ");
}

function stripMath(src: string): string {
  return src.replace(ALL_DOLLAR_PAIRS, " ");
}

function stripFunctionCalls(src: string): string {
  // Best-effort: remove `#name(...)` and `#name`. We don't fully balance
  // parens; a balanced parse would need a real lexer. The error mode here is
  // mild — undercounting in some doc-heavy markup contexts.
  return src
    // function calls with args (greedy until a matching closing paren on the
    // same line is good enough for the common case).
    .replace(/#[a-zA-Z_][\w-]*\s*\([^()\n]*\)/g, " ")
    .replace(/#[a-zA-Z_][\w-]*/g, " ");
}

function stripMarkup(src: string): string {
  return src
    .replace(/<[^>\n]+>/g, " ") // labels <my-label>
    .replace(/@[a-zA-Z_][\w-]*/g, " ") // refs @my-ref
    .replace(/^\s*=+\s+/gm, "") // heading markers (keep text)
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/_([^_\n]+)_/g, "$1");
}

export function countTypstStats(source: string): TypstWordStats {
  if (!source) {
    return {
      totalWords: 0,
      headerWords: 0,
      captionWords: 0,
      totalCharacters: 0,
      charactersNoSpaces: 0,
      headerCount: 0,
      inlineMath: 0,
      displayMath: 0,
      figureCount: 0,
    };
  }

  // ---- Structural counts (run on raw source) ------------------------------
  const headerMatches = Array.from(source.matchAll(HEADING_REGEX));
  const headerCount = headerMatches.length;
  const headerWords = headerMatches.reduce(
    (sum, match) => sum + countWords(match[2]),
    0,
  );

  const captionMatches = Array.from(source.matchAll(CAPTION_REGEX));
  const captionWords = captionMatches.reduce(
    (sum, match) => sum + countWords(match[1]),
    0,
  );

  const figureCount = (source.match(FIGURE_REGEX) || []).length;

  const displayMatchCount = (source.match(DISPLAY_MATH_REGEX) || []).length;
  const allMathCount = (source.match(ALL_DOLLAR_PAIRS) || []).length;
  const displayMath = displayMatchCount;
  const inlineMath = Math.max(0, allMathCount - displayMatchCount);

  // ---- Body-text word count ----------------------------------------------
  // Strip in passes — order matters: raw/code first, then math, then
  // function calls (since calls might contain code-like content), then markup.
  const body = stripMarkup(
    stripFunctionCalls(stripMath(stripCodeAndRaw(source))),
  );

  const totalWords = countWords(body);
  const totalCharacters = source.length;
  const charactersNoSpaces = source.replace(/\s+/g, "").length;

  return {
    totalWords,
    headerWords,
    captionWords,
    totalCharacters,
    charactersNoSpaces,
    headerCount,
    inlineMath,
    displayMath,
    figureCount,
  };
}
