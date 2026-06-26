import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { cn } from "../../components/ui/utils";
import { useEditorStore } from "../state/editorStore";

export interface FigureEditDetail {
  kind: "figure" | "image";
  from: number;
  to: number;
  imagePath: string | null;
  caption: string;
  width: number | null;
}

/**
 * Insert-mode payload. `from === to` and we treat the dialog as a create
 * form rather than an edit form. Default to figure kind for the toolbar
 * insert button.
 */
export interface FigureInsertDetail {
  insertPos: number;
}

const WIDTH_PRESETS: { value: number; label: string }[] = [
  { value: 0.25, label: "¼" },
  { value: 0.5, label: "½" },
  { value: 0.75, label: "¾" },
  { value: 1, label: "Full" },
];

function nearestPreset(width: number | null): number {
  if (width == null) return 1;
  let best = WIDTH_PRESETS[0].value;
  let bestDelta = Math.abs(best - width);
  for (const preset of WIDTH_PRESETS) {
    const delta = Math.abs(preset.value - width);
    if (delta < bestDelta) {
      best = preset.value;
      bestDelta = delta;
    }
  }
  return best;
}

function buildFigureSource(opts: {
  imagePath: string;
  width: number;
  includeCaption: boolean;
  caption: string;
}): string {
  const widthStr =
    opts.width >= 1
      ? ""
      : `, width: ${Math.round(opts.width * 100)}%`;
  if (opts.includeCaption) {
    return `#figure(\n  image("${opts.imagePath}"${widthStr}),\n  caption: [${opts.caption}],\n)`;
  }
  return `#figure(\n  image("${opts.imagePath}"${widthStr}),\n)`;
}

function buildImageSource(opts: {
  imagePath: string;
  width: number;
}): string {
  const widthStr =
    opts.width >= 1
      ? ""
      : `, width: ${Math.round(opts.width * 100)}%`;
  return `#image("${opts.imagePath}"${widthStr})`;
}

type DialogState =
  | { mode: "edit"; detail: FigureEditDetail }
  | { mode: "insert"; insertPos: number }
  | null;

export function FigureEditDialog(): JSX.Element {
  const [state, setState] = useState<DialogState>(null);
  const [imagePath, setImagePath] = useState("");
  const [caption, setCaption] = useState("");
  const [includeCaption, setIncludeCaption] = useState(true);
  const [width, setWidth] = useState<number>(1);
  const editorViewRef = useEditorStore((s) => s.editorViewRef);
  const files = useEditorStore((s) => s.files);

  // Surface available image files in the project so users can pick instead
  // of typing the path. Mirrors Overleaf's file picker for figures.
  const imageFileOptions = useMemo(
    () =>
      Object.values(files)
        .filter(
          (f) =>
            f.kind === "image" ||
            f.kind === "vector" ||
            (f.mimeType?.startsWith("image/") ?? false),
        )
        .map((f) => f.path)
        .sort(),
    [files],
  );

  useEffect(() => {
    function onEdit(ev: Event) {
      // Second line of defense — read-only must never open a mutating dialog.
      if (useEditorStore.getState().readOnly) return;
      const d = (ev as CustomEvent<FigureEditDetail>).detail;
      setState({ mode: "edit", detail: d });
      setImagePath(d.imagePath ?? "");
      setCaption(d.caption ?? "");
      setIncludeCaption(d.kind === "figure" && d.caption.length > 0);
      setWidth(nearestPreset(d.width));
    }
    function onInsert(ev: Event) {
      if (useEditorStore.getState().readOnly) return;
      const d = (ev as CustomEvent<FigureInsertDetail>).detail;
      setState({ mode: "insert", insertPos: d.insertPos });
      setImagePath("");
      setCaption("");
      setIncludeCaption(true);
      setWidth(0.8);
    }
    window.addEventListener("editor:editFigure", onEdit);
    window.addEventListener("editor:insertFigure", onInsert);
    return () => {
      window.removeEventListener("editor:editFigure", onEdit);
      window.removeEventListener("editor:insertFigure", onInsert);
    };
  }, []);

  // Drag-to-resize from the image widget commits straight to source (no dialog
  // shown) — reuses the same builders so it behaves like saving with a new
  // width. Width-only change; other args are rebuilt from the carried fields.
  useEffect(() => {
    function onResize(ev: Event) {
      if (useEditorStore.getState().readOnly) return;
      const d = (ev as CustomEvent<FigureEditDetail>).detail;
      const view = editorViewRef.current;
      if (!view || !d.imagePath) return;
      const w = d.width ?? 1;
      const source =
        d.kind === "figure"
          ? buildFigureSource({
              imagePath: d.imagePath,
              width: w,
              includeCaption: (d.caption?.length ?? 0) > 0,
              caption: d.caption ?? "",
            })
          : buildImageSource({ imagePath: d.imagePath, width: w });
      view.dispatch({
        changes: { from: d.from, to: d.to, insert: source },
        userEvent: "input.resizeFigure",
      });
    }
    window.addEventListener("editor:resizeFigure", onResize);
    return () => window.removeEventListener("editor:resizeFigure", onResize);
  }, [editorViewRef]);

  if (!state) return <></>;

  const isInsert = state.mode === "insert";
  const isFigure = isInsert ? true : state.detail.kind === "figure";

  function handleSave() {
    if (!state) return;
    const view = editorViewRef.current;
    if (!view) {
      setState(null);
      return;
    }
    const source = isFigure
      ? buildFigureSource({
          imagePath,
          width,
          includeCaption,
          caption,
        })
      : buildImageSource({ imagePath, width });
    if (state.mode === "edit") {
      view.dispatch({
        changes: { from: state.detail.from, to: state.detail.to, insert: source },
        selection: { anchor: state.detail.from + source.length },
        userEvent: "input.dialog.figure",
      });
    } else {
      const line = view.state.doc.lineAt(state.insertPos);
      const atLineStart = state.insertPos === line.from;
      // For block-level inserts, ensure we don't fuse onto an existing line.
      const lead = atLineStart || line.text.length === 0 ? "" : "\n";
      const trail = "\n";
      const inserted = `${lead}${source}${trail}`;
      view.dispatch({
        changes: {
          from: state.insertPos,
          to: state.insertPos,
          insert: inserted,
        },
        selection: { anchor: state.insertPos + inserted.length },
        userEvent: "input.dialog.figure",
      });
    }
    view.focus();
    setState(null);
  }

  return (
    <Dialog open={state != null} onOpenChange={(open) => !open && setState(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isInsert
              ? "Chèn figure"
              : isFigure
                ? "Sửa figure"
                : "Sửa image"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="figure-path">Đường dẫn tệp ảnh</Label>
            <Input
              id="figure-path"
              value={imagePath}
              onChange={(e) => setImagePath(e.target.value)}
              placeholder="vd: hinh1.png"
              autoFocus
              list="figure-path-options"
            />
            {imageFileOptions.length > 0 ? (
              <datalist id="figure-path-options">
                {imageFileOptions.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            ) : null}
            {imageFileOptions.length > 0 ? (
              <p className="text-xs text-slate-500">
                Gợi ý từ dự án: {imageFileOptions.slice(0, 3).join(", ")}
                {imageFileOptions.length > 3 ? "…" : ""}
              </p>
            ) : null}
          </div>

          {isFigure ? (
            <>
              <div className="flex items-start gap-2">
                <input
                  id="figure-include-caption"
                  type="checkbox"
                  className="mt-1"
                  checked={includeCaption}
                  onChange={(e) => setIncludeCaption(e.target.checked)}
                />
                <div className="flex-1">
                  <Label
                    htmlFor="figure-include-caption"
                    className="cursor-pointer"
                  >
                    Hiển thị chú thích (caption)
                  </Label>
                  {includeCaption ? (
                    <Input
                      className="mt-1.5"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Nhập chú thích..."
                    />
                  ) : null}
                </div>
              </div>
            </>
          ) : null}

          <div className="space-y-1.5">
            <Label>Độ rộng ảnh</Label>
            <div className="flex gap-1.5">
              {WIDTH_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setWidth(preset.value)}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-1.5 text-sm transition-colors",
                    width === preset.value
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  )}
                  aria-pressed={width === preset.value}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setState(null)}
            className="gap-1"
          >
            <X className="size-4" />
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            disabled={!imagePath.trim()}
            className="gap-1"
          >
            <Check className="size-4" />
            {isInsert ? "Chèn" : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
