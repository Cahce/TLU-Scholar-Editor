import { describe, it, expect } from "vitest";
import { chunkRows, serializeTable, type TableModel } from "../table-serialize";

describe("chunkRows", () => {
  it("groups cells into rows of `columns`", () => {
    expect(chunkRows(["a", "b", "c", "d"], 2)).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("pads a short final row with empty cells", () => {
    expect(chunkRows(["a", "b", "c"], 2)).toEqual([
      ["a", "b"],
      ["c", ""],
    ]);
  });

  it("returns [] for non-positive columns", () => {
    expect(chunkRows(["a"], 0)).toEqual([]);
  });
});

describe("serializeTable", () => {
  const base: TableModel = {
    columnsRaw: "2",
    columnsEditable: true,
    columns: 2,
    hasHeader: false,
    rows: [
      ["a", "b"],
      ["c", "d"],
    ],
    extraNamed: [],
  };

  it("serializes a simple grid", () => {
    expect(serializeTable(base)).toBe(
      ["#table(", "  columns: 2,", "  [a], [b],", "  [c], [d],", ")"].join("\n"),
    );
  });

  it("emits a table.header() row when hasHeader", () => {
    const out = serializeTable({ ...base, hasHeader: true });
    expect(out).toContain("table.header(");
    expect(out).toContain("[a], [b]");
    // body row after the header
    expect(out).toContain("  [c], [d],");
  });

  it("preserves a non-integer columns spec verbatim", () => {
    const out = serializeTable({
      ...base,
      columnsRaw: "(auto, 1fr)",
      columnsEditable: false,
    });
    expect(out).toContain("columns: (auto, 1fr),");
  });

  it("preserves extra named args verbatim", () => {
    const out = serializeTable({
      ...base,
      extraNamed: [
        { name: "align", value: "center" },
        { name: "stroke", value: "0.5pt" },
      ],
    });
    expect(out).toContain("  align: center,");
    expect(out).toContain("  stroke: 0.5pt,");
  });

  it("does not escape nested content blocks in cells", () => {
    const out = serializeTable({
      ...base,
      rows: [["*bold*", "$x^2$"]],
    });
    expect(out).toContain("[*bold*], [$x^2$]");
  });
});
