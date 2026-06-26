/** 1-based line/column. Matches Typst compiler convention. */
export interface DiagnosticPosition {
  line: number;
  column: number;
}

/** Half-open span [start, end). When start == end, treat as a point and widen
 *  to one character at render time so the squiggle is visible. */
export interface DiagnosticRange {
  start: DiagnosticPosition;
  end: DiagnosticPosition;
}

export type DiagnosticSeverity = "error" | "warning" | "hint" | "info";

export interface EditorDiagnostic {
  /** Where the diagnostic was produced. UI shows a small badge per source. */
  source: "client" | "server";
  severity: DiagnosticSeverity;
  message: string;
  /** Relative path inside the project. If undefined, the diagnostic targets
   *  the active file (rare; typst usually returns a span with file). */
  file?: string;
  /** Span of the offending code. Required for inline squiggle/gutter rendering.
   *  Diagnostics WITHOUT a range still appear in the Issues panel but are not
   *  drawn inline (e.g. "missing main.typ"). */
  range?: DiagnosticRange;
  /** Optional follow-up hints. Typst's compiler often attaches "help:" notes
   *  alongside the primary error; render them in the hover tooltip and panel. */
  hints?: string[];
}
