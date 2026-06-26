import { useState } from "react";
import { Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useEditorStore } from "../state/editorStore";
import { format as typstyleFormat } from "../services/TypstyleService";

/**
 * Toolbar button that formats the active Typst buffer with typstyle.
 * Disabled for non-Typst files. Routes the formatted text through a single
 * CodeMirror replace transaction so the existing autosave pipeline picks it
 * up identically to a normal user edit.
 */
export function ToolbarFormatButton(): JSX.Element {
  const activePath = useEditorStore((s) => s.activePath);
  const editorViewRef = useEditorStore((s) => s.editorViewRef);
  const [busy, setBusy] = useState(false);

  const isTypst = !!activePath && activePath.endsWith(".typ");

  const handleClick = async (): Promise<void> => {
    const view = editorViewRef.current;
    if (!view || !isTypst || busy) return;

    setBusy(true);
    try {
      const source = view.state.doc.toString();
      const formatted = await typstyleFormat(source);

      if (formatted === source) {
        toast.success("Mã đã đúng định dạng");
        return;
      }

      // Preserve cursor: clamp the head/anchor positions to the new doc length.
      const currentSelection = view.state.selection;
      const newLength = formatted.length;
      const clampedSelection = currentSelection.ranges.map((range) => ({
        anchor: Math.min(range.anchor, newLength),
        head: Math.min(range.head, newLength),
      }));

      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: formatted },
        selection: { ranges: clampedSelection },
      });
      toast.success("Đã định dạng tài liệu");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không thể định dạng tài liệu";
      toast.error(`Định dạng thất bại: ${message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={!isTypst || busy}
      title={isTypst ? "Định dạng tài liệu (Shift+Alt+F)" : "Chỉ áp dụng cho tệp .typ"}
      aria-label="Định dạng tài liệu"
      className="rounded p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Wand2 className={`size-4 ${busy ? "animate-pulse" : ""}`} />
    </button>
  );
}
