/**
 * Extract bibliography file paths referenced by a Typst source.
 *
 * Looks for `#bibliography("…")` invocations and pulls the first path
 * argument out of each. Supports both single-string form and the array
 * form (`#bibliography(("a.bib", "b.yml"))`), but multi-file is out of
 * scope for v1 — we only take the first array element so callers have a
 * single target path to write into.
 *
 * Regex-based on purpose: cheap to run on every editor keystroke and
 * good enough for the auto-detect heuristic. The Typst syntax tree is
 * available via the editor, but introducing tree-walking here would make
 * the helper coupled to CodeMirror state, which `useBibTargetPath` would
 * rather avoid.
 */

const BIB_CALL_REGEX = /#bibliography\s*\(\s*(?:"([^"]+)"|\(([^)]+)\))/g;

export function extractBibReferences(typContent: string): string[] {
  if (!typContent) return [];
  const refs: string[] = [];
  // Reset lastIndex so callers can safely reuse the regex literal.
  BIB_CALL_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = BIB_CALL_REGEX.exec(typContent))) {
    if (match[1]) {
      refs.push(match[1]);
    } else if (match[2]) {
      // Array form: pick the first quoted path.
      const inner = match[2].match(/"([^"]+)"/);
      if (inner) refs.push(inner[1]);
    }
  }
  return refs;
}
