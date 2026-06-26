// Detect common LaTeX-isms inside Typst math and surface them as CodeMirror
// lint diagnostics (squiggle + hover tooltip) instead of inline comments.
//
// Scope: only inside math regions (`$ ... $`). Outside math, `^{...}` etc. are
// literal text and not a mistake, so flagging there would be a false positive.
//
// Pure + unit-testable: `findTypstLatexisms(text)` takes a string and returns
// findings with absolute offsets. `latexismsToCmDiagnostics(text)` maps them to
// `@codemirror/lint` diagnostics.

import type { Diagnostic } from "@codemirror/lint";

export interface Latexism {
  /** Inclusive start offset in the document. */
  from: number;
  /** Exclusive end offset in the document. */
  to: number;
  /** Human-readable explanation (Vietnamese) shown in the hover tooltip. */
  message: string;
}

/**
 * Math regions as `[innerStart, innerEnd)` offsets (content between the `$`
 * delimiters). Typst uses `$` for both inline and block math. Escaped `\$` is
 * skipped so it doesn't toggle math state.
 */
function mathRegions(text: string): Array<[number, number]> {
  const regions: Array<[number, number]> = [];
  let inMath = false;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\\") {
      i += 1; // skip the escaped character (covers \$)
      continue;
    }
    if (ch === "$") {
      if (!inMath) {
        inMath = true;
        start = i + 1;
      } else {
        inMath = false;
        regions.push([start, i]);
      }
    }
  }
  return regions;
}

/**
 * Index just past the `}` matching the `{` at `open`, within `[open, end)`.
 * Returns -1 if unmatched. Respects `\{` / `\}` escapes.
 */
function matchBrace(text: string, open: number, end: number): number {
  let depth = 0;
  for (let i = open; i < end; i++) {
    const c = text[i];
    if (c === "\\") {
      i += 1;
      continue;
    }
    if (c === "{") depth += 1;
    else if (c === "}") {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

function scanRegion(
  text: string,
  rs: number,
  re: number,
  out: Latexism[],
): void {
  const region = text.slice(rs, re);

  // 1 & 2. `^{ ... }` / `_{ ... }` — LaTeX super/subscript braces.
  for (const m of region.matchAll(/([\^_])[ \t]*\{/g)) {
    const idx = m.index ?? 0;
    const braceRel = idx + m[0].length - 1;
    const closeRel = matchBrace(region, braceRel, region.length);
    if (closeRel === -1) continue;
    const inner = region.slice(braceRel + 1, closeRel - 1).trim();
    const isSup = m[1] === "^";
    const fix = `${m[1]}(${inner})`;
    out.push({
      from: rs + idx,
      to: rs + closeRel,
      message: isSup
        ? `Số mũ trong Typst viết là \`^( )\` hoặc \`^2\`, không dùng \`^{ }\` như LaTeX. Sửa thành: ${fix}`
        : `Chỉ số dưới trong Typst viết là \`_( )\` hoặc \`_1\`, không dùng \`_{ }\` như LaTeX. Sửa thành: ${fix}`,
    });
  }

  // 3. `\frac{a}{b}` — LaTeX fraction.
  for (const m of region.matchAll(/\\frac[ \t]*\{/g)) {
    const idx = m.index ?? 0;
    const brace1 = idx + m[0].length - 1;
    const close1 = matchBrace(region, brace1, region.length);
    if (close1 === -1) continue;
    const numer = region.slice(brace1 + 1, close1 - 1).trim();
    // Optional denominator group right after the first.
    const afterNum = /^[ \t]*\{/.exec(region.slice(close1));
    let to = rs + close1;
    let fix = `(${numer})/( )`;
    if (afterNum) {
      const brace2 = close1 + afterNum[0].length - 1;
      const close2 = matchBrace(region, brace2, region.length);
      if (close2 !== -1) {
        const denom = region.slice(brace2 + 1, close2 - 1).trim();
        to = rs + close2;
        fix = `(${numer})/(${denom})`;
      }
    }
    out.push({
      from: rs + idx,
      to,
      message: `Phân số trong Typst viết là \`(tử)/(mẫu)\` hoặc \`frac(tử, mẫu)\`, không dùng \`\\frac{}{}\` như LaTeX. Sửa thành: ${fix}`,
    });
  }

  // 4. `\sqrt{ ... }` — LaTeX square root.
  for (const m of region.matchAll(/\\sqrt[ \t]*\{/g)) {
    const idx = m.index ?? 0;
    const braceRel = idx + m[0].length - 1;
    const closeRel = matchBrace(region, braceRel, region.length);
    if (closeRel === -1) continue;
    const inner = region.slice(braceRel + 1, closeRel - 1).trim();
    out.push({
      from: rs + idx,
      to: rs + closeRel,
      message: `Căn trong Typst viết là \`sqrt(...)\`, không dùng \`\\sqrt{}\` như LaTeX. Sửa thành: sqrt(${inner})`,
    });
  }

  // 5. Generic `\command` (backslash + letters), excluding the cases above.
  //    Typst math symbols are bare identifiers (`alpha`, `sum`, `times`), never
  //    backslash-prefixed. `\ ` (line break) and `\$`/`\#` escapes don't match
  //    because they aren't followed by letters.
  for (const m of region.matchAll(/\\(?!frac\b|sqrt\b)([a-zA-Z]+)/g)) {
    const idx = m.index ?? 0;
    const name = m[1];
    out.push({
      from: rs + idx,
      to: rs + idx + m[0].length,
      message: `Ký hiệu toán trong Typst không có dấu \`\\\` ở đầu — viết \`${name}\` thay cho \`\\${name}\` (ví dụ \`alpha\`, \`sum\`, \`times\`).`,
    });
  }
}

/** Find every LaTeX-ism inside math regions of `text`, sorted by position. */
export function findTypstLatexisms(text: string): Latexism[] {
  const out: Latexism[] = [];
  for (const [rs, re] of mathRegions(text)) {
    scanRegion(text, rs, re, out);
  }
  out.sort((a, b) => a.from - b.from);
  return out;
}

/** Map LaTeX-ism findings to `@codemirror/lint` diagnostics (warning severity). */
export function latexismsToCmDiagnostics(text: string): Diagnostic[] {
  return findTypstLatexisms(text).map((f) => ({
    from: f.from,
    to: f.to,
    severity: "warning",
    source: "Typst ↔ LaTeX",
    message: f.message,
  }));
}
