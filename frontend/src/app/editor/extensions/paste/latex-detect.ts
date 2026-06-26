/**
 * LaTeX-math detection + conversion for pasted plain text
 * (spec: visual-editor-aux-polish, US-4).
 *
 * Conversion is delegated to the `tex2typst` package, loaded via dynamic
 * import so the main bundle doesn't pay for it until a user actually
 * converts. IMPORTANT: tex2typst happily "converts" prose into garbage
 * (`hello` → `h e l l o`), so we only ever feed it (a) `$…$` / `$$…$$`
 * delimited segments, or (b) bare text that passes a strict
 * formula-likeness check.
 */

const LATEX_COMMAND_RE =
  /\\(frac|sum|int|sqrt|alpha|beta|gamma|delta|theta|lambda|sigma|omega|pi|mu|infty|partial|nabla|cdot|times|left|right|mathbb|mathbf|mathrm|begin\{|leq|geq|neq|approx|pm|hat|bar|vec|over|text\{)/;

/** Heuristic: does pasted plain text contain LaTeX math worth converting? */
export function looksLikeLatexMath(text: string): boolean {
  if (!text.includes("\\")) return false;
  if (LATEX_COMMAND_RE.test(text)) return true;
  // `$…$` wrappers whose body uses any backslash command.
  return /\$[^$\n]*\\[a-zA-Z]+[^$\n]*\$/.test(text);
}

export interface MathSegment {
  kind: "text" | "inline" | "display";
  value: string;
}

/** Split text into prose + `$…$` (inline) + `$$…$$` (display) segments. */
export function segmentMath(text: string): MathSegment[] {
  const segments: MathSegment[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) {
      segments.push({ kind: "text", value: text.slice(last, m.index) });
    }
    if (m[1] !== undefined) {
      segments.push({ kind: "display", value: m[1] });
    } else {
      segments.push({ kind: "inline", value: m[2] });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    segments.push({ kind: "text", value: text.slice(last) });
  }
  return segments;
}

/**
 * Bare text (no `$` delimiters) is treated as one formula only when it
 * really looks like one — short, has a backslash command, and is not mostly
 * plain words (tex2typst would letter-space prose).
 */
export function bareTextIsFormula(text: string): boolean {
  const t = text.trim();
  if (t.length === 0 || t.length > 300) return false;
  if (!LATEX_COMMAND_RE.test(t)) return false;
  const words = t.split(/\s+/);
  const plainWords = words.filter((w) => /^[A-Za-zÀ-ỹ]{2,}$/.test(w));
  return plainWords.length <= Math.max(2, Math.floor(words.length * 0.4));
}

export interface LatexConversion {
  converted: string;
  /** Number of math segments left untouched because conversion failed. */
  failures: number;
  /** Number of segments successfully converted. */
  successes: number;
}

/** Convert one TeX snippet to Typst math, null on failure. Exposed for the
 * MathEditDialog's "Chuyển từ LaTeX" helper. */
export async function convertTexSnippet(tex: string): Promise<string | null> {
  const trimmed = tex.trim();
  if (!trimmed) return null;
  try {
    const { tex2typst } = await import("tex2typst");
    const out = tex2typst(trimmed).trim();
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

/**
 * Convert every math segment of `text` to Typst syntax. Prose stays
 * verbatim; failed segments keep their original form (counted in
 * `failures`).
 */
export async function convertLatexText(text: string): Promise<LatexConversion> {
  const { tex2typst } = await import("tex2typst");

  const convert = (tex: string): string | null => {
    try {
      const out = tex2typst(tex.trim()).trim();
      return out.length > 0 ? out : null;
    } catch {
      return null;
    }
  };

  const segments = segmentMath(text);
  const hasDelimited = segments.some((s) => s.kind !== "text");

  if (!hasDelimited) {
    if (!bareTextIsFormula(text)) {
      return { converted: text, failures: 0, successes: 0 };
    }
    const out = convert(text);
    return out
      ? { converted: `$ ${out} $`, failures: 0, successes: 1 }
      : { converted: text, failures: 1, successes: 0 };
  }

  let failures = 0;
  let successes = 0;
  const converted = segments
    .map((seg) => {
      if (seg.kind === "text") return seg.value;
      const out = convert(seg.value);
      if (out == null) {
        failures++;
        return seg.kind === "display" ? `$$${seg.value}$$` : `$${seg.value}$`;
      }
      successes++;
      return seg.kind === "display" ? `$ ${out} $` : `$${out}$`;
    })
    .join("");
  return { converted, failures, successes };
}
