/**
 * Cursor-aware `#table(...)` context for the toolbar's contextual table
 * actions (spec: visual-editor-aux-polish, US-6).
 *
 * Detection walks the Lezer tree up from the cursor to the nearest
 * markup-mode `#table` FuncCall (same `#`-prefix rule as atomic-decorations).
 * Row/column mutations are pure `TableModel → TableModel` functions
 * round-tripped through `serializeTable`, so named args (align/stroke/fill/…)
 * and non-integer `columns` specs survive untouched.
 */

import { syntaxTree } from "@codemirror/language";
import type { EditorState, Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import { NODE } from "./typst-node-names";
import { parseFuncCallArgs } from "./func-call-args";
import { parseTableCall } from "./widgets/FuncCallWidgets";
import { serializeTable, type TableModel } from "./table-serialize";

export interface TableContext {
  /** Doc offset of the leading `#`. */
  from: number;
  /** Doc offset just past the closing `)`. */
  to: number;
  /** Editable grid model — null when the table can't round-trip (complex). */
  model: TableModel | null;
  /** 0-based row index under the cursor (header row = 0 when present);
   * null when the cursor isn't inside a cell (e.g. on `columns:`). */
  rowIndex: number | null;
  colIndex: number | null;
}

/**
 * Find the nearest enclosing `#table(...)` call around `pos`. A nested
 * `#table` inside another table's cell resolves to the inner call (we walk
 * inner → outer). Bare `table(...)` calls (no `#`, e.g. inside `#figure`)
 * are skipped — `serializeTable` can only emit the markup form.
 */
export function findTableAt(
  state: EditorState,
  pos: number,
): TableContext | null {
  const doc = state.doc;
  const tree = syntaxTree(state);
  for (const side of [-1, 1] as const) {
    let node: ReturnType<typeof tree.resolveInner> | null = tree.resolveInner(
      pos,
      side,
    );
    while (node) {
      if (node.name === NODE.FuncCall) {
        const ident = node.firstChild;
        if (
          ident &&
          ident.name === NODE.Ident &&
          doc.sliceString(ident.from, ident.to) === "table" &&
          node.from > 0 &&
          doc.sliceString(node.from - 1, node.from) === "#"
        ) {
          return buildContext(state, node.from - 1, node.to, pos);
        }
      }
      node = node.parent;
    }
  }
  return null;
}

function buildContext(
  state: EditorState,
  callFrom: number,
  callTo: number,
  pos: number,
): TableContext {
  const rawCall = state.doc.sliceString(callFrom, callTo);
  const parsed = parseTableCall(rawCall);
  const model = parsed?.model ?? null;
  let rowIndex: number | null = null;
  let colIndex: number | null = null;
  if (model && model.columns > 0) {
    const spans = computeCellSpans(rawCall, callFrom);
    const idx = spans?.findIndex((s) => pos >= s.from && pos <= s.to) ?? -1;
    if (idx >= 0) {
      rowIndex = Math.floor(idx / model.columns);
      colIndex = idx % model.columns;
    }
  }
  return { from: callFrom, to: callTo, model, rowIndex, colIndex };
}

/* ------------------------- cell span computation ------------------------- */

interface Span {
  from: number;
  to: number;
}

const NAMED_ARG_RE = /^[A-Za-z_][\w-]*\s*:/;

/**
 * Split the argument list opened at `openIdx` ("(") into trimmed top-level
 * argument spans. Same bracket/string state machine as `parseFuncCallArgs`,
 * but position-preserving.
 */
function splitArgSpans(
  src: string,
  openIdx: number,
): { spans: Span[]; closeIdx: number } | null {
  let depth = 1;
  let inString = false;
  let escape = false;
  let argStart = openIdx + 1;
  const spans: Span[] = [];

  const push = (end: number): void => {
    let s = argStart;
    let e = end;
    while (s < e && /\s/.test(src[s])) s++;
    while (e > s && /\s/.test(src[e - 1])) e--;
    if (e > s) spans.push({ from: s, to: e });
  };

  for (let i = openIdx + 1; i < src.length; i++) {
    const ch = src[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (inString) {
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      depth++;
      continue;
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      if (depth === 0) {
        push(i);
        return { spans, closeIdx: i };
      }
      continue;
    }
    if (ch === "," && depth === 1) {
      push(i);
      argStart = i + 1;
    }
  }
  return null;
}

function findMatchingBracket(src: string, openIdx: number): number {
  let depth = 1;
  for (let j = openIdx + 1; j < src.length; j++) {
    const c = src[j];
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) return j;
    }
  }
  return -1;
}

/**
 * Absolute doc spans of every cell (`[...]` content args, header cells
 * included) in document order. Best-effort — used only to map the cursor to
 * a row/column index, never to mutate text.
 */
function computeCellSpans(rawCall: string, base: number): Span[] | null {
  if (!rawCall.startsWith("#table")) return null;
  let i = "#table".length;
  while (i < rawCall.length && /\s/.test(rawCall[i])) i++;
  if (rawCall[i] !== "(") return null;
  const top = splitArgSpans(rawCall, i);
  if (!top) return null;

  const cells: Span[] = [];
  for (const span of top.spans) {
    const text = rawCall.slice(span.from, span.to);
    if (NAMED_ARG_RE.test(text)) continue;
    if (text.startsWith("table.header")) {
      let j = span.from + "table.header".length;
      while (j < span.to && /\s/.test(rawCall[j])) j++;
      if (rawCall[j] === "(") {
        const inner = splitArgSpans(rawCall, j);
        if (inner) cells.push(...inner.spans);
      } else {
        while (j < span.to && rawCall[j] === "[") {
          const close = findMatchingBracket(rawCall, j);
          if (close < 0) break;
          cells.push({ from: j, to: close + 1 });
          j = close + 1;
          while (j < span.to && /\s/.test(rawCall[j])) j++;
        }
      }
      continue;
    }
    if (text.startsWith("[")) cells.push(span);
  }
  return cells.map((s) => ({ from: base + s.from, to: base + s.to }));
}

/* ------------------------------ mutations -------------------------------- */

function cloneModel(m: TableModel): TableModel {
  return {
    ...m,
    rows: m.rows.map((r) => [...r]),
    extraNamed: m.extraNamed.map((a) => ({ ...a })),
  };
}

/** Tuple `columns: (auto, 1fr, …)` → its elements, or null when the spec
 * isn't a tuple we can safely edit (e.g. a variable reference). */
function columnSpecParts(model: TableModel): string[] | null {
  const t = model.columnsRaw.trim();
  if (!t.startsWith("(") || !t.endsWith(")")) return null;
  const parts = parseFuncCallArgs(t.slice(1, -1)).positional;
  return parts.length === model.columns ? parts : null;
}

/** Insert an empty row AFTER `atRow` (null → append at the end). */
export function insertRow(
  model: TableModel,
  atRow: number | null,
): TableModel {
  const m = cloneModel(model);
  const empty = Array<string>(m.columns).fill("");
  const idx = atRow == null ? m.rows.length - 1 : Math.min(atRow, m.rows.length - 1);
  m.rows.splice(idx + 1, 0, empty);
  return m;
}

/** Delete the row at `atRow` (null → last row). Deleting the header row
 * clears `hasHeader`. Returns null when it's the only row. */
export function deleteRow(
  model: TableModel,
  atRow: number | null,
): TableModel | null {
  if (model.rows.length <= 1) return null;
  const m = cloneModel(model);
  const idx =
    atRow == null ? m.rows.length - 1 : Math.min(atRow, m.rows.length - 1);
  m.rows.splice(idx, 1);
  if (m.hasHeader && idx === 0) m.hasHeader = false;
  return m;
}

/** Insert a column AFTER `atCol` (null → append). Integer specs increment;
 * tuple specs gain an `auto` element. Returns null for un-editable specs. */
export function insertColumn(
  model: TableModel,
  atCol: number | null,
): TableModel | null {
  const m = cloneModel(model);
  const idx = atCol == null ? m.columns - 1 : Math.min(atCol, m.columns - 1);
  if (m.columnsEditable) {
    m.columnsRaw = String(m.columns + 1);
  } else {
    const parts = columnSpecParts(m);
    if (!parts) return null;
    parts.splice(idx + 1, 0, "auto");
    m.columnsRaw = `(${parts.join(", ")})`;
  }
  m.columns += 1;
  m.rows.forEach((row) => row.splice(idx + 1, 0, ""));
  return m;
}

/** Delete the column at `atCol` (null → last). Returns null when only one
 * column remains or the spec can't be edited. */
export function deleteColumn(
  model: TableModel,
  atCol: number | null,
): TableModel | null {
  if (model.columns <= 1) return null;
  const m = cloneModel(model);
  const idx =
    atCol == null ? m.columns - 1 : Math.min(atCol, m.columns - 1);
  if (m.columnsEditable) {
    m.columnsRaw = String(m.columns - 1);
  } else {
    const parts = columnSpecParts(m);
    if (!parts) return null;
    parts.splice(idx, 1);
    m.columnsRaw = `(${parts.join(", ")})`;
  }
  m.columns -= 1;
  m.rows.forEach((row) => row.splice(idx, 1));
  return m;
}

/* ---------------------------- toolbar actions ---------------------------- */

export type TableAction = "addRow" | "deleteRow" | "addColumn" | "deleteColumn";

/**
 * Apply a row/column action to the table under the cursor. Recomputes the
 * context from the live state (toolbar visibility events may be stale by the
 * time the user clicks). One action = one undo step.
 */
export function applyTableAction(
  view: EditorView,
  action: TableAction,
): boolean {
  if (view.state.readOnly) return false;
  const ctx = findTableAt(view.state, view.state.selection.main.head);
  if (!ctx?.model) return false;

  let next: TableModel | null = null;
  switch (action) {
    case "addRow":
      next = insertRow(ctx.model, ctx.rowIndex);
      break;
    case "deleteRow":
      next = deleteRow(ctx.model, ctx.rowIndex);
      break;
    case "addColumn":
      next = insertColumn(ctx.model, ctx.colIndex);
      break;
    case "deleteColumn":
      next = deleteColumn(ctx.model, ctx.colIndex);
      break;
  }
  if (!next) return false;

  const source = serializeTable(next);
  view.dispatch({
    changes: { from: ctx.from, to: ctx.to, insert: source },
    selection: { anchor: ctx.from + source.length },
    userEvent: "input.tableAction",
  });
  view.focus();
  return true;
}

/* ------------------------- toolbar context events ------------------------ */

export interface TableContextSummary {
  hasTable: boolean;
  /** True when the table round-trips → quick actions + dialog are available. */
  canQuickEdit: boolean;
}

export const TABLE_CONTEXT_EVENT = "editor:tableContext";

/**
 * updateListener broadcasting whether the cursor sits inside a `#table` call.
 * The toolbar only uses this for visibility — actions re-resolve the context
 * from the live state on click, so a stale event can never corrupt text.
 */
export function tableContextNotifier(): Extension {
  let last: TableContextSummary = { hasTable: false, canQuickEdit: false };
  let raf = 0;
  return EditorView.updateListener.of((update) => {
    if (!update.selectionSet && !update.docChanged) return;
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      raf = 0;
      const state = update.view.state;
      const ctx = findTableAt(state, state.selection.main.head);
      const summary: TableContextSummary = {
        hasTable: ctx != null,
        canQuickEdit: ctx?.model != null && !state.readOnly,
      };
      if (
        summary.hasTable === last.hasTable &&
        summary.canQuickEdit === last.canQuickEdit
      ) {
        return;
      }
      last = summary;
      window.dispatchEvent(
        new CustomEvent<TableContextSummary>(TABLE_CONTEXT_EVENT, {
          detail: summary,
        }),
      );
    });
  });
}
