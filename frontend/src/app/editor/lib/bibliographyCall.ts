/**
 * Parse and edit `#bibliography(...)` calls in Typst source.
 *
 * Used by the bibliography panel's citation-style picker to read the current
 * `style:` argument and to rewrite it (or add it) via a CodeMirror change.
 *
 * Scope: handles the common single-call form
 *   #bibliography("refs.bib")
 *   #bibliography("refs.bib", style: "ieee")
 *   #bibliography("refs.bib", title: "…", style: "x.csl")
 * It scans for the first `#bibliography(` and matches the closing paren while
 * respecting string literals. It does NOT attempt full Typst parsing.
 */

export interface SourceEdit {
  from: number;
  to: number;
  insert: string;
}

export interface BibliographyCall {
  /** Offsets of the whole `#bibliography(...)` call. */
  callRange: { from: number; to: number };
  /** First bib path string argument, if present. */
  path: string | null;
  /** Current `style:` value, or null when the argument is absent. */
  style: string | null;
  /**
   * Offsets of the `style:` value *content* (between the quotes), for in-place
   * replacement. Null when there is no `style:` argument yet.
   */
  styleValueRange: { from: number; to: number } | null;
}

const STRING_LITERAL = /"([^"\\]*(?:\\.[^"\\]*)*)"/;
const STYLE_ARG = /style\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/;

/**
 * Find the first `#bibliography(...)` call in `source`. Returns null when there
 * is no call or the parentheses are unbalanced.
 */
export function findBibliographyCall(source: string): BibliographyCall | null {
  const opener = /#bibliography\s*\(/.exec(source);
  if (!opener) return null;

  const callStart = opener.index;
  const open = opener.index + opener[0].length - 1; // index of "("

  // Scan to the matching ")", skipping over string literals so a ")" inside a
  // quoted path/title does not terminate the call early.
  let depth = 0;
  let inStr = false;
  let i = open;
  for (; i < source.length; i++) {
    const c = source[i];
    if (inStr) {
      if (c === "\\") {
        i++;
        continue;
      }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
    } else if (c === "(") {
      depth++;
    } else if (c === ")") {
      depth--;
      if (depth === 0) break;
    }
  }
  if (depth !== 0) return null; // unbalanced

  const close = i;
  const argsBase = open + 1;
  const argsStr = source.slice(argsBase, close);

  const pathMatch = STRING_LITERAL.exec(argsStr);
  const path = pathMatch ? pathMatch[1] : null;

  let style: string | null = null;
  let styleValueRange: { from: number; to: number } | null = null;
  const styleMatch = STYLE_ARG.exec(argsStr);
  if (styleMatch) {
    style = styleMatch[1];
    const quoteRel = styleMatch[0].indexOf('"');
    const contentStart = argsBase + styleMatch.index + quoteRel + 1;
    styleValueRange = { from: contentStart, to: contentStart + styleMatch[1].length };
  }

  return {
    callRange: { from: callStart, to: close + 1 },
    path,
    style,
    styleValueRange,
  };
}

/**
 * Build a CodeMirror change that sets the citation style of `call` to `style`.
 * Replaces the existing `style:` value in place, or inserts a new `style:`
 * argument just before the closing paren (adding a comma when needed).
 */
export function buildStyleEdit(
  source: string,
  call: BibliographyCall,
  style: string,
): SourceEdit {
  if (call.styleValueRange) {
    return {
      from: call.styleValueRange.from,
      to: call.styleValueRange.to,
      insert: style,
    };
  }

  const closeIdx = call.callRange.to - 1; // position of ")"
  let j = closeIdx - 1;
  while (j > call.callRange.from && /\s/.test(source[j])) j--;
  const needsComma = source[j] !== ",";
  return {
    from: closeIdx,
    to: closeIdx,
    insert: `${needsComma ? ", " : " "}style: "${style}"`,
  };
}
