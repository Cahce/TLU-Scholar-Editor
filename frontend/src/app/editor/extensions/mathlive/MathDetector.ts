/**
 * MathDetector — find Typst math regions (`$...$`) in a document.
 *
 * Typst's math syntax is delimited by `$`. Spaces directly inside the
 * delimiters mark *display* mode (`$ x^2 + 1 $` rendered as a block) while no
 * leading space indicates *inline* (`$x^2$`). We classify based on whitespace
 * around the opening delimiter.
 *
 * Scanner ignores code regions:
 *   - fenced raw blocks (```...```)
 *   - inline raw (`...`)
 *   - line comments (// ...)
 *
 * Limitations: doesn't yet ignore math-like patterns inside `raw()` function
 * calls. Good enough for thesis-typed Typst.
 */

export interface MathRegion {
  /** Position of opening `$` in doc. */
  from: number;
  /** Position just after closing `$`. */
  to: number;
  /** Whether the region is display mode (whitespace-wrapped). */
  kind: "inline" | "display";
  /** Raw content between the `$` delimiters (excluding `$` themselves). */
  content: string;
}

/**
 * Scan the document once and return every Typst math region.
 * O(n) where n is doc length. Acceptable for thesis-scale docs.
 */
export function findMathRegions(doc: string): MathRegion[] {
  const regions: MathRegion[] = [];
  const len = doc.length;
  let i = 0;

  while (i < len) {
    const ch = doc[i];

    // Skip fenced raw blocks ```...```
    if (ch === "`" && doc.slice(i, i + 3) === "```") {
      const end = doc.indexOf("```", i + 3);
      i = end === -1 ? len : end + 3;
      continue;
    }
    // Skip inline raw `...`
    if (ch === "`") {
      const end = doc.indexOf("`", i + 1);
      i = end === -1 ? len : end + 1;
      continue;
    }
    // Skip line comments // ...
    if (ch === "/" && doc[i + 1] === "/") {
      const end = doc.indexOf("\n", i + 2);
      i = end === -1 ? len : end + 1;
      continue;
    }
    // Math open
    if (ch === "$") {
      // Find closing `$` — naive search (no `\$` escape support, matches Typst).
      let j = i + 1;
      while (j < len && doc[j] !== "$") {
        // Skip nested raw inside math to avoid `$ ... `x` $` confusion.
        if (doc[j] === "`") {
          const close = doc.indexOf("`", j + 1);
          j = close === -1 ? len : close + 1;
          continue;
        }
        j++;
      }
      if (j >= len) break;
      const content = doc.slice(i + 1, j);
      // Display mode: at least one whitespace char immediately after `$` open.
      const isDisplay = /^\s/.test(content) && /\s$/.test(content);
      regions.push({
        from: i,
        to: j + 1,
        kind: isDisplay ? "display" : "inline",
        content,
      });
      i = j + 1;
      continue;
    }
    i++;
  }

  return regions;
}

/**
 * Find the math region containing position `pos`, or null if `pos` is outside
 * every region. Inclusive at the open `$`, inclusive at the close `$`.
 */
export function findMathRegionAt(
  regions: MathRegion[],
  pos: number,
): MathRegion | null {
  for (const r of regions) {
    if (pos >= r.from && pos <= r.to) return r;
    if (r.from > pos) return null;
  }
  return null;
}
