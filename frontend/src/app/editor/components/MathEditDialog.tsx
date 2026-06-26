import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { cn } from "../../components/ui/utils";
import { useEditorStore } from "../state/editorStore";
import {
  peekMathSvg,
  renderMathSvg,
} from "../services/TypstMathRenderer";
import { convertTexSnippet } from "../extensions/paste/latex-detect";
import { toast } from "sonner";

export interface MathEditDetail {
  from: number;
  to: number;
  raw: string;
  isBlock: boolean;
}

// Common Typst math snippets surfaced as a palette of insertable buttons.
// Caret in the snippet is marked with `|` — `insertSnippet` strips it and
// positions the cursor there after insertion.
const MATH_SNIPPETS: { group: string; items: { label: string; snippet: string }[] }[] =
  [
    {
      group: "Greek",
      items: [
        { label: "α", snippet: "alpha" },
        { label: "β", snippet: "beta" },
        { label: "γ", snippet: "gamma" },
        { label: "δ", snippet: "delta" },
        { label: "θ", snippet: "theta" },
        { label: "λ", snippet: "lambda" },
        { label: "μ", snippet: "mu" },
        { label: "π", snippet: "pi" },
        { label: "σ", snippet: "sigma" },
        { label: "φ", snippet: "phi" },
        { label: "ω", snippet: "omega" },
      ],
    },
    {
      group: "Cấu trúc",
      items: [
        { label: "a/b", snippet: "frac(|, )" },
        { label: "√x", snippet: "sqrt(|)" },
        { label: "x²", snippet: "|^2" },
        { label: "xₙ", snippet: "|_n" },
        { label: "Σ", snippet: "sum_(i=1)^n |" },
        { label: "∫", snippet: "integral_a^b |" },
        { label: "lim", snippet: "lim_(x -> infinity) |" },
        { label: "(  )", snippet: "(|)" },
        { label: "vec", snippet: "vec(|)" },
      ],
    },
    {
      group: "Quan hệ",
      items: [
        { label: "≤", snippet: "<=" },
        { label: "≥", snippet: ">=" },
        { label: "≠", snippet: "!=" },
        { label: "≈", snippet: "approx" },
        { label: "→", snippet: "arrow.r" },
        { label: "∞", snippet: "infinity" },
        { label: "±", snippet: "+-" },
        { label: "·", snippet: "dot" },
        { label: "×", snippet: "times" },
      ],
    },
  ];

export function MathEditDialog(): JSX.Element {
  const [detail, setDetail] = useState<MathEditDetail | null>(null);
  const [raw, setRaw] = useState("");
  const [isBlock, setIsBlock] = useState(true);
  const [previewState, setPreviewState] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const previewRef = useRef<HTMLDivElement | null>(null);
  const previewToken = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editorViewRef = useEditorStore((s) => s.editorViewRef);

  useEffect(() => {
    function onEdit(ev: Event) {
      // Second line of defense — read-only must never open a mutating dialog.
      if (useEditorStore.getState().readOnly) return;
      const d = (ev as CustomEvent<MathEditDetail>).detail;
      setDetail(d);
      setRaw(d.raw);
      setIsBlock(d.isBlock);
    }
    window.addEventListener("editor:editMath", onEdit);
    return () => window.removeEventListener("editor:editMath", onEdit);
  }, []);

  // Preview through the REAL Typst compiler (same path as MathWidget) so the
  // dialog matches the document 1:1 — `mat(…)`, `dif`, `integral_a^b` render
  // correctly instead of the old Typst→LaTeX→KaTeX approximation. Debounced
  // 300ms with a token guard against stale async results.
  useEffect(() => {
    if (!detail || !previewRef.current) return;
    const target = previewRef.current;
    const trimmed = raw.trim();
    const kind = isBlock ? "display" : "inline";
    const token = ++previewToken.current;

    if (!trimmed) {
      target.innerHTML = "";
      setPreviewState("idle");
      return;
    }

    const cached = peekMathSvg(trimmed, kind);
    if (cached) {
      target.innerHTML = cached;
      setPreviewState("idle");
      return;
    }

    setPreviewState("loading");
    const timer = window.setTimeout(() => {
      void renderMathSvg(trimmed, kind).then(
        (svg) => {
          if (token !== previewToken.current) return;
          if (svg) {
            target.innerHTML = svg;
            setPreviewState("idle");
          } else {
            target.textContent = trimmed;
            setPreviewState("error");
          }
        },
        () => {
          if (token !== previewToken.current) return;
          target.textContent = trimmed;
          setPreviewState("error");
        },
      );
    }, 300);
    return () => window.clearTimeout(timer);
  }, [raw, isBlock, detail]);

  function insertSnippet(snippet: string): void {
    const ta = textareaRef.current;
    const caretIdx = snippet.indexOf("|");
    const cleaned = caretIdx >= 0 ? snippet.replace("|", "") : snippet;
    if (!ta) {
      setRaw((prev) => prev + cleaned);
      return;
    }
    const start = ta.selectionStart ?? raw.length;
    const end = ta.selectionEnd ?? raw.length;
    const next = raw.slice(0, start) + cleaned + raw.slice(end);
    setRaw(next);
    // Restore caret inside the snippet on the next paint so React's state
    // update has committed.
    requestAnimationFrame(() => {
      const caret =
        caretIdx >= 0 ? start + caretIdx : start + cleaned.length;
      ta.focus();
      ta.setSelectionRange(caret, caret);
    });
  }

  if (!detail) return <></>;

  function handleSave() {
    if (!detail) return;
    const view = editorViewRef.current;
    if (!view) {
      setDetail(null);
      return;
    }
    const trimmed = raw.trim();
    const source = isBlock ? `$ ${trimmed} $` : `$${trimmed}$`;
    view.dispatch({
      changes: { from: detail.from, to: detail.to, insert: source },
      selection: { anchor: detail.from + source.length },
      // Distinct userEvent so history never merges the dialog save with
      // surrounding typing — one Ctrl+Z restores the pre-dialog state.
      userEvent: "input.dialog.math",
    });
    view.focus();
    setDetail(null);
  }

  return (
    <Dialog open={detail != null} onOpenChange={(open) => !open && setDetail(null)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sửa công thức toán</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="math-source">Mã nguồn Typst (không kèm dấu $)</Label>
              {/\\[a-zA-Z]+/.test(raw) && (
                <button
                  type="button"
                  onClick={() => {
                    void convertTexSnippet(raw).then((out) => {
                      if (out) setRaw(out);
                      else toast.error("Không chuyển đổi được công thức LaTeX này");
                    });
                  }}
                  className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Chuyển từ LaTeX
                </button>
              )}
            </div>
            <textarea
              id="math-source"
              ref={textareaRef}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={4}
              autoFocus
              spellCheck={false}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="x^2 + y^2 = r^2"
            />
          </div>

          <div className="space-y-2">
            <Label>Chèn nhanh</Label>
            <div className="space-y-2">
              {MATH_SNIPPETS.map((group) => (
                <div key={group.group} className="space-y-1">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    {group.group}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {group.items.map((item) => (
                      <button
                        key={item.snippet}
                        type="button"
                        onClick={() => insertSnippet(item.snippet)}
                        title={item.snippet.replace("|", "")}
                        className="min-w-[2.25rem] rounded border border-slate-200 bg-white px-2 py-1 text-sm font-mono text-slate-700 hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Kiểu hiển thị</Label>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setIsBlock(false)}
                className={cn(
                  "flex-1 rounded-md border px-3 py-1.5 text-sm transition-colors",
                  !isBlock
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                )}
                aria-pressed={!isBlock}
              >
                Trong dòng
              </button>
              <button
                type="button"
                onClick={() => setIsBlock(true)}
                className={cn(
                  "flex-1 rounded-md border px-3 py-1.5 text-sm transition-colors",
                  isBlock
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                )}
                aria-pressed={isBlock}
              >
                Khối (display)
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Xem trước</Label>
              {previewState === "loading" && (
                <span className="text-xs text-slate-500">Đang biên dịch…</span>
              )}
            </div>
            <div
              ref={previewRef}
              aria-live="polite"
              className="min-h-[3rem] rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-center [&_svg]:inline-block [&_svg]:max-w-full"
            />
            {previewState === "error" && (
              <p className="text-xs text-red-600">
                Không biên dịch được công thức — kiểm tra cú pháp Typst.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setDetail(null)}
            className="gap-1"
          >
            <X className="size-4" />
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            disabled={!raw.trim()}
            className="gap-1"
          >
            <Check className="size-4" />
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
