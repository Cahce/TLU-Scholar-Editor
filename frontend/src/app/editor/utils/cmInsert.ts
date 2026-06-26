import type { EditorView } from "@codemirror/view";

/**
 * Wrap the current selection in `before`/`after`. If nothing is selected the
 * cursor lands between them. Returns true on success.
 *
 * Adapted from TeXlyre's toolbar helpers — same dispatch pattern that keeps
 * CodeMirror's undo history intact (one user-visible edit per click).
 */
export function wrapSelection(
  view: EditorView,
  before: string,
  after: string,
): boolean {
  const sel = view.state.selection.main;
  const selected = view.state.doc.sliceString(sel.from, sel.to);
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: `${before}${selected}${after}` },
    selection: {
      anchor: sel.from + before.length,
      head: sel.from + before.length + selected.length,
    },
  });
  view.focus();
  return true;
}

/**
 * Insert `text` at the cursor (or replace selection). `cursorOffset` is added
 * to the end-of-insert position — pass a negative number to land inside the
 * snippet (e.g. for `#link("")` pass -3 to drop the cursor inside the quotes).
 */
export function insertText(
  view: EditorView,
  text: string,
  cursorOffset = 0,
): boolean {
  const sel = view.state.selection.main;
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: text },
    selection: { anchor: sel.from + text.length + cursorOffset },
  });
  view.focus();
  return true;
}

/**
 * Insert a Typst heading at the start of the current line. Uses the selection
 * as the heading text when present; otherwise inserts a placeholder. The
 * cursor lands at the end of the heading text so the user can keep typing.
 */
export function insertHeading(view: EditorView, level: 1 | 2 | 3 | 4): boolean {
  const sel = view.state.selection.main;
  const selected = view.state.doc.sliceString(sel.from, sel.to);
  const text = selected || "Tiêu đề";
  const prefix = "=".repeat(level);
  const line = view.state.doc.lineAt(sel.from);
  const atLineStart = sel.from === line.from;
  const snippet = atLineStart ? `${prefix} ${text}` : `\n${prefix} ${text}`;
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: snippet },
    selection: { anchor: sel.from + snippet.length },
  });
  view.focus();
  return true;
}

/**
 * Insert a list marker at the start of each line in the selection (or the
 * cursor's line if no selection). `marker` is "-" for bullets, "+" for
 * numbered (Typst auto-numbers).
 */
export function insertListMarker(view: EditorView, marker: "-" | "+"): boolean {
  const sel = view.state.selection.main;
  const startLine = view.state.doc.lineAt(sel.from);
  const endLine = view.state.doc.lineAt(sel.to);
  const changes = [];
  for (let n = startLine.number; n <= endLine.number; n++) {
    const line = view.state.doc.line(n);
    // Skip lines that already start with this marker — toggle off by stripping
    // would be nicer, but for v1 we just don't double-prefix.
    if (line.text.startsWith(`${marker} `)) continue;
    changes.push({ from: line.from, to: line.from, insert: `${marker} ` });
  }
  if (changes.length === 0) return true;
  view.dispatch({ changes });
  view.focus();
  return true;
}

/**
 * Display (block) math: `$ ... $` with spaces so Typst treats it as block.
 * Wraps selection; if empty, cursor lands between the spaces.
 */
export function insertDisplayMath(view: EditorView): boolean {
  const sel = view.state.selection.main;
  const selected = view.state.doc.sliceString(sel.from, sel.to);
  const text = `$ ${selected} $`;
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: text },
    selection: {
      anchor: sel.from + (selected ? text.length : 2),
    },
  });
  view.focus();
  return true;
}

/**
 * Equation block via the standard Typst pattern. Cursor lands inside the body.
 */
export function insertEquation(view: EditorView): boolean {
  const snippet = `#math.equation(block: true)[\n  \n]`;
  return insertText(view, snippet, -3);
}

/**
 * Triple-backtick code block. If a language hint is sensible we leave a
 * placeholder; user can type after the opening fence.
 */
export function insertCodeBlock(view: EditorView): boolean {
  const sel = view.state.selection.main;
  const selected = view.state.doc.sliceString(sel.from, sel.to);
  const snippet = `\`\`\`\n${selected}\n\`\`\``;
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: snippet },
    selection: {
      anchor: selected
        ? sel.from + snippet.length
        : sel.from + 4, // place cursor right after opening fence + newline
    },
  });
  view.focus();
  return true;
}

/**
 * Reference to a label. If text is selected we treat it as the label name
 * (typst syntax `<label-name>` adjacent to body — Typst's natural label form).
 * Otherwise insert `#ref(<>)` with the cursor inside the angle brackets.
 */
export function insertReference(view: EditorView): boolean {
  const sel = view.state.selection.main;
  const selected = view.state.doc.sliceString(sel.from, sel.to);
  if (selected) {
    return insertText(view, `@${selected}`, 0);
  }
  return insertText(view, `#ref(<>)`, -2);
}

/**
 * Attach a label to the current position. Inserts `#label("...")` with the
 * cursor inside the quotes if no selection, otherwise wraps selection as the
 * label name.
 */
export function insertLabel(view: EditorView): boolean {
  const sel = view.state.selection.main;
  const selected = view.state.doc.sliceString(sel.from, sel.to);
  if (selected) {
    return insertText(view, `<${selected}>`, 0);
  }
  return insertText(view, `<label>`, -1);
}

/**
 * Insert an empty `#table(...)` sized by the toolbar grid picker. `rows` is
 * the TOTAL row count including the header row when `withHeader` is set
 * (matching how the picker visualises the grid). Cursor lands inside the
 * first cell; block-level insert gets its own line.
 */
export function insertGridTable(
  view: EditorView,
  rows: number,
  columns: number,
  withHeader: boolean,
): boolean {
  if (rows < 1 || columns < 1) return false;
  const rowOf = (): string => Array(columns).fill("[]").join(", ");
  const lines: string[] = ["#table(", `  columns: ${columns},`];
  if (withHeader) lines.push(`  table.header(${rowOf()}),`);
  const bodyRows = Math.max(0, rows - (withHeader ? 1 : 0));
  for (let r = 0; r < bodyRows; r++) lines.push(`  ${rowOf()},`);
  lines.push(")");
  const snippet = lines.join("\n");

  const sel = view.state.selection.main;
  const line = view.state.doc.lineAt(sel.from);
  const lead = sel.from === line.from || line.text.length === 0 ? "" : "\n";
  const text = `${lead}${snippet}\n`;
  const firstCell = snippet.indexOf("[]");
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: text },
    selection: { anchor: sel.from + lead.length + firstCell + 1 },
    userEvent: "input.insertTable",
  });
  view.focus();
  return true;
}

/**
 * Wrap selection in `#text(fill: rgb("#xxxxxx"))[...]`. If no selection,
 * leaves cursor inside the body brackets for the user to type colored text.
 */
export function insertColoredText(view: EditorView, hex: string): boolean {
  const sel = view.state.selection.main;
  const selected = view.state.doc.sliceString(sel.from, sel.to);
  const prefix = `#text(fill: rgb("${hex}"))[`;
  const suffix = `]`;
  const text = `${prefix}${selected}${suffix}`;
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: text },
    selection: {
      anchor: selected ? sel.from + text.length : sel.from + prefix.length,
    },
  });
  view.focus();
  return true;
}

/**
 * Wrap selection in `#highlight(fill: rgb("#xxxxxx"))[...]`. Same cursor
 * placement semantics as `insertColoredText`.
 */
export function insertHighlight(view: EditorView, hex: string): boolean {
  const sel = view.state.selection.main;
  const selected = view.state.doc.sliceString(sel.from, sel.to);
  const prefix = `#highlight(fill: rgb("${hex}"))[`;
  const suffix = `]`;
  const text = `${prefix}${selected}${suffix}`;
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: text },
    selection: {
      anchor: selected ? sel.from + text.length : sel.from + prefix.length,
    },
  });
  view.focus();
  return true;
}
