/**
 * Table model <-> Typst `#table(...)` serialization for the interactive table
 * editor (spec: visual-editor-overleaf, Phase 2 / R2).
 *
 * The model is the editable grid surfaced in `TableEditDialog`. Parsing lives
 * in `FuncCallWidgets.buildTableWidget` (one place that already walks the call);
 * this module owns the reverse direction + shared types + small grid helpers.
 *
 * Safety: named args (align, stroke, fill, inset, …) and non-integer `columns`
 * specs (e.g. `(auto, 1fr)`) are preserved verbatim so styling is never lost.
 */

export interface TableNamedArg {
  name: string;
  /** Raw Typst value, preserved verbatim. */
  value: string;
}

/** Payload for the `editor:editTable` event consumed by `TableEditDialog`. */
export interface TableEditDetail {
  from: number;
  to: number;
  model: TableModel;
}

export interface TableModel {
  /** Original `columns:` text, e.g. "3" or "(auto, 1fr)". */
  columnsRaw: string;
  /** True when `columns` is a plain integer → column add/remove is safe. */
  columnsEditable: boolean;
  /** Column count. */
  columns: number;
  /** Whether the first row is a `table.header(...)` row. */
  hasHeader: boolean;
  /** Grid cells: rows[r][c] = inner content of `[...]` (verbatim Typst). */
  rows: string[][];
  /** Named args other than `columns`, preserved verbatim and re-emitted. */
  extraNamed: TableNamedArg[];
}

/** Group a flat cell list into rows of `columns`, padding the last row. */
export function chunkRows(cells: string[], columns: number): string[][] {
  if (columns <= 0) return [];
  const rows: string[][] = [];
  for (let i = 0; i < cells.length; i += columns) {
    const row = cells.slice(i, i + columns);
    while (row.length < columns) row.push("");
    rows.push(row);
  }
  return rows;
}

/** Serialize a TableModel back into Typst `#table(...)` source. */
export function serializeTable(model: TableModel): string {
  const lines: string[] = ["#table("];
  const cols = model.columnsEditable ? String(model.columns) : model.columnsRaw;
  lines.push(`  columns: ${cols},`);

  for (const arg of model.extraNamed) {
    lines.push(`  ${arg.name}: ${arg.value},`);
  }

  // Cells are wrapped in `[...]` verbatim. Typst content blocks may legally
  // contain nested `[...]` (and the arg parser tracks bracket depth), so we
  // must NOT escape — escaping would corrupt markup on each round-trip.
  const cell = (c: string): string => `[${c}]`;
  const rows = model.rows;
  let bodyStart = 0;

  if (model.hasHeader && rows.length > 0) {
    lines.push("  table.header(");
    lines.push(`    ${rows[0].map(cell).join(", ")},`);
    lines.push("  ),");
    bodyStart = 1;
  }

  for (let r = bodyStart; r < rows.length; r++) {
    lines.push(`  ${rows[r].map(cell).join(", ")},`);
  }

  lines.push(")");
  return lines.join("\n");
}
