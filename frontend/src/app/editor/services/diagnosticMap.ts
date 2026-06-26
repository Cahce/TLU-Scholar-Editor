import { type ChangeSet, type EditorState } from "@codemirror/state";
import { type Diagnostic as CmDiagnostic } from "@codemirror/lint";
import type {
  DiagnosticPosition,
  EditorDiagnostic,
} from "../types/diagnostics";

const SEVERITY_MAP: Record<EditorDiagnostic["severity"], CmDiagnostic["severity"]> = {
  error: "error",
  warning: "warning",
  // CodeMirror lint has no "hint"; downgrade to info but keep the source label
  hint: "info",
  info: "info",
};

/**
 * Convert 1-based line/column to byte offset in the document.
 * Typst uses 1-based line/column; CodeMirror uses 0-based byte offsets.
 */
function lineColToOffset(state: EditorState, line: number, column: number): number {
  const totalLines = state.doc.lines;
  const safeLine = Math.max(1, Math.min(line, totalLines));
  const lineInfo = state.doc.line(safeLine);
  // column is 1-based; columns in CM/typst are character-based, not byte-based
  const offset = lineInfo.from + Math.max(0, column - 1);
  return Math.min(offset, lineInfo.to);
}

/** Convert a 0-based byte offset back to 1-based (line, column). */
function offsetToLineCol(state: EditorState, offset: number): DiagnosticPosition {
  const safeOffset = Math.max(0, Math.min(offset, state.doc.length));
  const line = state.doc.lineAt(safeOffset);
  return { line: line.number, column: safeOffset - line.from + 1 };
}

/**
 * Translate diagnostic line/column positions through a CodeMirror ChangeSet
 * so they stay aligned to the moving source while the user edits between
 * compile passes. Diagnostics targeting other files (or with no range) are
 * returned unchanged. The mapping converts (line, col) → offset in the
 * pre-change doc, lets CodeMirror's mapPos shift the offset, and converts
 * the result back to (line, col) using the post-change doc.
 *
 * Returns the *same array reference* when no diagnostic moved — the store
 * setter then skips the React update, so this is cheap to call on every
 * keystroke.
 */
export function remapDiagnosticsThroughChanges(
  diagnostics: EditorDiagnostic[],
  activeFile: string | null,
  oldState: EditorState,
  changes: ChangeSet,
  newState: EditorState,
): EditorDiagnostic[] {
  if (diagnostics.length === 0) return diagnostics;
  if (changes.empty) return diagnostics;

  let mutated = false;
  const next = diagnostics.map((d) => {
    if (!d.range) return d;
    // A diagnostic targets this file when either:
    //  - it explicitly names the active file, or
    //  - it has no file (Typst occasionally omits the span path) and an
    //    active file exists — we treat it as belonging to the editor.
    const targetsActive = d.file
      ? d.file === activeFile
      : activeFile !== null;
    if (!targetsActive) return d;

    const startOffset = lineColToOffset(
      oldState,
      d.range.start.line,
      d.range.start.column,
    );
    const endOffset = lineColToOffset(
      oldState,
      d.range.end.line,
      d.range.end.column,
    );

    // `mapPos(p, -1)` keeps the position at the left edge of a replacement;
    // `+1` keeps it at the right. Using -1 for start and +1 for end keeps
    // the diagnostic widening when edits land inside it, matching how
    // CodeMirror's own lint markers track.
    const newStart = changes.mapPos(startOffset, -1);
    const newEnd = changes.mapPos(endOffset, 1);
    if (newStart === startOffset && newEnd === endOffset) return d;

    mutated = true;
    return {
      ...d,
      range: {
        start: offsetToLineCol(newState, newStart),
        end: offsetToLineCol(newState, newEnd),
      },
    };
  });
  return mutated ? next : diagnostics;
}

/**
 * Convert EditorDiagnostic[] to CodeMirror Diagnostic[] for the active file.
 * Only diagnostics with a range are converted (diagnostics without ranges
 * appear in the Issues panel but not as inline markers).
 */
export function toCmDiagnostics(
  state: EditorState,
  diagnostics: EditorDiagnostic[],
  activePath: string,
): CmDiagnostic[] {
  return diagnostics
    .filter((d) => (d.file ? d.file === activePath : true))
    .filter((d) => d.range)
    .map((d) => {
      const from = lineColToOffset(state, d.range!.start.line, d.range!.start.column);
      let to = lineColToOffset(state, d.range!.end.line, d.range!.end.column);
      // Empty ranges become invisible. Widen to one char so the squiggle shows.
      if (to <= from) to = Math.min(state.doc.length, from + 1);
      
      // Build message with hints if present
      const message = d.hints?.length
        ? `${d.message}\n\nhints:\n  - ${d.hints.join("\n  - ")}`
        : d.message;
      
      return {
        from,
        to,
        severity: SEVERITY_MAP[d.severity],
        source: d.source === "server" ? "compile (server)" : "preview (client)",
        message,
      };
    });
}
