/**
 * TableEditDialog
 *
 * Interactive grid editor for Typst `#table(...)` (spec: visual-editor-overleaf,
 * Phase 2 / R2). Opened from the visual-editor table widget's pencil via the
 * `editor:editTable` event. Edits a grid (cell text, add/remove rows + columns,
 * header toggle) and serializes back to `#table(...)`, writing through the
 * active CodeMirror view so undo + autosave keep working.
 *
 * Follows the established FigureEditDialog/MathEditDialog pattern (React dialog
 * + editorViewRef dispatch) rather than in-canvas contenteditable — safer with
 * CodeMirror's document model. Merge-cells (colspan) is a later iteration.
 */

import { useEffect, useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useEditorStore } from "../state/editorStore";
import {
  serializeTable,
  type TableEditDetail,
  type TableModel,
  type TableNamedArg,
} from "../extensions/visual/table-serialize";

interface DialogState {
  from: number;
  to: number;
  columnsEditable: boolean;
  columnsRaw: string;
}

export function TableEditDialog(): JSX.Element {
  const [state, setState] = useState<DialogState | null>(null);
  const [rows, setRows] = useState<string[][]>([]);
  const [columns, setColumns] = useState(0);
  const [hasHeader, setHasHeader] = useState(false);
  const [extraNamed, setExtraNamed] = useState<TableNamedArg[]>([]);
  const editorViewRef = useEditorStore((s) => s.editorViewRef);

  useEffect(() => {
    function onEdit(ev: Event) {
      // Second line of defense: widgets hide the pencil in read-only mode,
      // but any stray event must not open a mutating dialog either.
      if (useEditorStore.getState().readOnly) return;
      const d = (ev as CustomEvent<TableEditDetail>).detail;
      setState({
        from: d.from,
        to: d.to,
        columnsEditable: d.model.columnsEditable,
        columnsRaw: d.model.columnsRaw,
      });
      setRows(d.model.rows.map((r) => [...r]));
      setColumns(d.model.columns);
      setHasHeader(d.model.hasHeader);
      setExtraNamed(d.model.extraNamed);
    }
    window.addEventListener("editor:editTable", onEdit);
    return () => window.removeEventListener("editor:editTable", onEdit);
  }, []);

  if (!state) return <></>;

  const setCell = (r: number, c: number, value: string) => {
    setRows((prev) =>
      prev.map((row, ri) =>
        ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : row,
      ),
    );
  };

  const addRow = () => setRows((prev) => [...prev, Array(columns).fill("")]);

  const removeRow = (r: number) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((_, ri) => ri !== r) : prev));
  };

  const addColumn = () => {
    if (!state.columnsEditable) return;
    setColumns((c) => c + 1);
    setRows((prev) => prev.map((row) => [...row, ""]));
  };

  const removeColumn = (c: number) => {
    if (!state.columnsEditable || columns <= 1) return;
    setColumns((n) => n - 1);
    setRows((prev) => prev.map((row) => row.filter((_, ci) => ci !== c)));
  };

  const handleSave = () => {
    const view = editorViewRef.current;
    if (!view) {
      setState(null);
      return;
    }
    const model: TableModel = {
      columnsRaw: state.columnsEditable ? String(columns) : state.columnsRaw,
      columnsEditable: state.columnsEditable,
      columns,
      hasHeader,
      rows,
      extraNamed,
    };
    const source = serializeTable(model);
    view.dispatch({
      changes: { from: state.from, to: state.to, insert: source },
      selection: { anchor: state.from + source.length },
      // One dialog save = one undo step, never merged with adjacent typing.
      userEvent: "input.dialog.table",
    });
    view.focus();
    setState(null);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && setState(null)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sửa bảng</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={hasHeader}
                onChange={(e) => setHasHeader(e.target.checked)}
              />
              Hàng đầu là tiêu đề
            </label>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={addRow} className="gap-1">
                <Plus className="size-4" /> Thêm hàng
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={addColumn}
                disabled={!state.columnsEditable}
                title={
                  state.columnsEditable
                    ? "Thêm cột"
                    : "Bảng dùng cấu hình cột tuỳ chỉnh — không thể thêm/xoá cột tự động"
                }
                className="gap-1"
              >
                <Plus className="size-4" /> Thêm cột
              </Button>
            </div>
          </div>

          <div className="max-h-[55vh] overflow-auto rounded-md border border-slate-200">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {Array.from({ length: columns }).map((_, c) => (
                    <th
                      key={c}
                      className="border-b border-slate-200 bg-slate-50 px-2 py-1 text-left text-[11px] font-medium text-slate-500"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>Cột {c + 1}</span>
                        {state.columnsEditable && columns > 1 && (
                          <button
                            type="button"
                            onClick={() => removeColumn(c)}
                            className="rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600 focus:outline-none"
                            aria-label={`Xoá cột ${c + 1}`}
                            title={`Xoá cột ${c + 1}`}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="w-8 border-b border-slate-200 bg-slate-50" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, r) => (
                  <tr key={r} className={hasHeader && r === 0 ? "bg-blue-50/40" : ""}>
                    {row.map((cell, c) => (
                      <td key={c} className="border-b border-slate-100 p-1 align-top">
                        <Input
                          value={cell}
                          onChange={(e) => setCell(r, c, e.target.value)}
                          aria-label={`Ô hàng ${r + 1} cột ${c + 1}`}
                          className={`h-8 text-sm ${
                            hasHeader && r === 0 ? "font-semibold" : ""
                          }`}
                        />
                      </td>
                    ))}
                    <td className="border-b border-slate-100 p-1 text-center align-middle">
                      <button
                        type="button"
                        onClick={() => removeRow(r)}
                        disabled={rows.length <= 1}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Xoá hàng ${r + 1}`}
                        title={`Xoá hàng ${r + 1}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!state.columnsEditable && (
            <p className="text-xs text-amber-600">
              Bảng dùng cấu hình cột tuỳ chỉnh (vd. <code>columns: (auto, 1fr)</code>); giữ nguyên
              số cột, chỉ sửa nội dung và hàng.
            </p>
          )}
          <p className="text-xs text-slate-500">
            Nội dung ô là mã Typst (có thể dùng <code>*đậm*</code>, <code>$x^2$</code>, …).
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setState(null)} className="gap-1">
            <X className="size-4" /> Huỷ
          </Button>
          <Button onClick={handleSave} className="gap-1">
            <Check className="size-4" /> Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
