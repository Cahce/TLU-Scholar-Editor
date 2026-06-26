import { describe, expect, it } from "vitest";

import { getDiagnosticSummary } from "../selectors";
import type { EditorDiagnostic } from "../../types/diagnostics";

function diag(
  severity: EditorDiagnostic["severity"],
  file: string | undefined,
  line: number | undefined,
  message = "msg",
): EditorDiagnostic {
  return {
    source: "client",
    severity,
    message,
    file,
    range:
      line == null
        ? undefined
        : { start: { line, column: 1 }, end: { line, column: 2 } },
  };
}

describe("getDiagnosticSummary", () => {
  it("returns zeros for an empty list", () => {
    const s = getDiagnosticSummary([]);
    expect(s.errorCount).toBe(0);
    expect(s.warningCount).toBe(0);
    expect(s.hintCount).toBe(0);
    expect(s.total).toBe(0);
    expect(s.orderedIssues).toEqual([]);
    expect(s.firstErrorLocation).toBeNull();
    expect(s.severityByFile.size).toBe(0);
    expect(s.byFile.size).toBe(0);
  });

  it("counts errors, warnings, and folds info into hint", () => {
    const s = getDiagnosticSummary([
      diag("error", "a.typ", 1),
      diag("warning", "a.typ", 2),
      diag("hint", "b.typ", 3),
      diag("info", "b.typ", 4),
    ]);
    expect(s.errorCount).toBe(1);
    expect(s.warningCount).toBe(1);
    expect(s.hintCount).toBe(2); // hint + info
    expect(s.total).toBe(4);
  });

  it("computes max severity per file (error beats warning)", () => {
    const s = getDiagnosticSummary([
      diag("warning", "a.typ", 1),
      diag("error", "a.typ", 9),
      diag("info", "b.typ", 1),
    ]);
    expect(s.severityByFile.get("a.typ")).toBe("error");
    expect(s.severityByFile.get("b.typ")).toBe("hint");
  });

  it("orders navigable issues by severity, then file, then line", () => {
    const s = getDiagnosticSummary([
      diag("warning", "b.typ", 5),
      diag("error", "b.typ", 10),
      diag("error", "a.typ", 2),
      diag("hint", "a.typ", 1),
    ]);
    expect(
      s.orderedIssues.map((i) => `${i.severity}:${i.file}:${i.range.start.line}`),
    ).toEqual([
      "error:a.typ:2",
      "error:b.typ:10",
      "warning:b.typ:5",
      "hint:a.typ:1",
    ]);
    expect(s.firstErrorLocation).not.toBeNull();
    expect(s.firstErrorLocation?.file).toBe("a.typ");
    expect(s.firstErrorLocation?.range.start.line).toBe(2);
  });

  it("excludes file-less and range-less diagnostics from navigation/badges", () => {
    const s = getDiagnosticSummary([
      diag("error", undefined, 1), // no file
      diag("error", "a.typ", undefined), // no range
    ]);
    expect(s.errorCount).toBe(2); // still counted globally
    expect(s.orderedIssues).toEqual([]); // not navigable
    expect(s.firstErrorLocation).toBeNull();
    // The range-less diagnostic still marks its file's badge.
    expect(s.severityByFile.get("a.typ")).toBe("error");
    expect(s.byFile.has("a.typ")).toBe(true);
  });

  it("is memoized on the array reference", () => {
    const list = [diag("error", "a.typ", 1)];
    expect(getDiagnosticSummary(list)).toBe(getDiagnosticSummary(list));
    // A different array with equal contents is a cache miss (new object).
    expect(getDiagnosticSummary([...list])).not.toBe(getDiagnosticSummary(list));
  });
});
