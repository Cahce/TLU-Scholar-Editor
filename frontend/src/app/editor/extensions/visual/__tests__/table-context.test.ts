import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import { ensureSyntaxTree } from "@codemirror/language";
import { typst } from "codemirror-lang-typst";

import {
  deleteColumn,
  deleteRow,
  findTableAt,
  insertColumn,
  insertRow,
} from "../table-context";
import { serializeTable, type TableModel } from "../table-serialize";

function stateWith(doc: string): EditorState {
  const state = EditorState.create({ doc, extensions: [typst()] });
  // Force a full parse — findTableAt walks the tree from the cursor.
  ensureSyntaxTree(state, state.doc.length, 5_000);
  return state;
}

const SIMPLE = [
  "#table(",
  "  columns: 3,",
  "  table.header([H1], [H2], [H3]),",
  "  [Cell 1], [Cell 2], [Cell 3],",
  "  [Cell 4], [Cell 5], [Cell 6],",
  ")",
].join("\n");

describe("findTableAt", () => {
  it("resolves a #table around a cursor inside a body cell", () => {
    const doc = `Trước\n${SIMPLE}\nSau`;
    const pos = doc.indexOf("Cell 5") + 2;
    const ctx = findTableAt(stateWith(doc), pos);
    expect(ctx).not.toBeNull();
    expect(ctx!.from).toBe(doc.indexOf("#table"));
    expect(doc.slice(ctx!.from, ctx!.to).endsWith(")")).toBe(true);
    expect(ctx!.model).not.toBeNull();
    expect(ctx!.model!.columns).toBe(3);
    expect(ctx!.model!.hasHeader).toBe(true);
    // Header = row 0 → "Cell 5" is row 2, col 1.
    expect(ctx!.rowIndex).toBe(2);
    expect(ctx!.colIndex).toBe(1);
  });

  it("maps a cursor inside a bracket-form header cell", () => {
    const doc = "#table(\n  columns: 2,\n  table.header[A][B],\n  [c], [d],\n)";
    const pos = doc.indexOf("[B]") + 1;
    const ctx = findTableAt(stateWith(doc), pos);
    expect(ctx?.rowIndex).toBe(0);
    expect(ctx?.colIndex).toBe(1);
  });

  it("returns null row/col when the cursor is on a named arg", () => {
    const pos = SIMPLE.indexOf("columns") + 2;
    const ctx = findTableAt(stateWith(SIMPLE), pos);
    expect(ctx).not.toBeNull();
    expect(ctx!.rowIndex).toBeNull();
    expect(ctx!.colIndex).toBeNull();
  });

  it("returns null outside any table", () => {
    const doc = `Một đoạn văn\n${SIMPLE}`;
    expect(findTableAt(stateWith(doc), 3)).toBeNull();
  });

  it("skips bare table(...) calls nested in #figure", () => {
    const doc = '#figure(\n  table(columns: 2, [a], [b]),\n  caption: [x],\n)';
    const pos = doc.indexOf("[a]") + 1;
    expect(findTableAt(stateWith(doc), pos)).toBeNull();
  });

  it("keeps hasTable but no model for complex tables (colspan)", () => {
    const doc =
      "#table(\n  columns: 2,\n  table.cell(colspan: 2)[span],\n  [a], [b],\n)";
    const ctx = findTableAt(stateWith(doc), doc.indexOf("[a]") + 1);
    expect(ctx).not.toBeNull();
    expect(ctx!.model).toBeNull();
  });
});

describe("row/column mutations", () => {
  const model = (): TableModel => ({
    columnsRaw: "2",
    columnsEditable: true,
    columns: 2,
    hasHeader: true,
    rows: [
      ["H1", "H2"],
      ["a", "b"],
      ["c", "d"],
    ],
    extraNamed: [{ name: "align", value: "center" }],
  });

  it("insertRow adds an empty row after the target", () => {
    const next = insertRow(model(), 1);
    expect(next.rows).toEqual([
      ["H1", "H2"],
      ["a", "b"],
      ["", ""],
      ["c", "d"],
    ]);
  });

  it("insertRow(null) appends at the end", () => {
    const next = insertRow(model(), null);
    expect(next.rows.at(-1)).toEqual(["", ""]);
    expect(next.rows).toHaveLength(4);
  });

  it("deleteRow removes the target; header deletion clears hasHeader", () => {
    const body = deleteRow(model(), 2)!;
    expect(body.rows).toEqual([
      ["H1", "H2"],
      ["a", "b"],
    ]);
    expect(body.hasHeader).toBe(true);

    const header = deleteRow(model(), 0)!;
    expect(header.hasHeader).toBe(false);
    expect(header.rows[0]).toEqual(["a", "b"]);
  });

  it("deleteRow refuses to remove the only row", () => {
    const single: TableModel = { ...model(), hasHeader: false, rows: [["x", "y"]] };
    expect(deleteRow(single, 0)).toBeNull();
  });

  it("insertColumn after target updates count + every row", () => {
    const next = insertColumn(model(), 0)!;
    expect(next.columns).toBe(3);
    expect(next.columnsRaw).toBe("3");
    expect(next.rows[1]).toEqual(["a", "", "b"]);
  });

  it("insertColumn on a tuple spec splices in `auto`", () => {
    const tuple: TableModel = {
      ...model(),
      columnsRaw: "(auto, 1fr)",
      columnsEditable: false,
    };
    const next = insertColumn(tuple, 0)!;
    expect(next.columnsRaw).toBe("(auto, auto, 1fr)");
    expect(next.columns).toBe(3);
    // serializeTable must keep the tuple verbatim (non-editable spec).
    expect(serializeTable(next)).toContain("columns: (auto, auto, 1fr),");
  });

  it("deleteColumn removes the target tuple element and cells", () => {
    const tuple: TableModel = {
      ...model(),
      columnsRaw: "(auto, 1fr)",
      columnsEditable: false,
    };
    const next = deleteColumn(tuple, 1)!;
    expect(next.columnsRaw).toBe("(auto)");
    expect(next.columns).toBe(1);
    expect(next.rows[1]).toEqual(["a"]);
  });

  it("deleteColumn refuses when only one column remains", () => {
    const one: TableModel = {
      ...model(),
      columns: 1,
      columnsRaw: "1",
      rows: [["x"], ["y"]],
    };
    expect(deleteColumn(one, 0)).toBeNull();
  });

  it("mutations preserve extra named args through serialization", () => {
    const next = insertRow(model(), null);
    expect(serializeTable(next)).toContain("align: center,");
  });
});
