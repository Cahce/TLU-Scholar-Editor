import { AlertCircle, AlertTriangle, ArrowDown, ArrowUp, Info, Lightbulb } from "lucide-react";
import { useEditorStore } from "../state/editorStore";
import { useIssueNavigation } from "../hooks/useIssueNavigation";
import type { EditorDiagnostic, DiagnosticSeverity } from "../types/diagnostics";

const SEVERITY_ICON: Record<DiagnosticSeverity, React.ReactNode> = {
  error: <AlertCircle className="size-4 text-red-600" />,
  warning: <AlertTriangle className="size-4 text-amber-600" />,
  hint: <Lightbulb className="size-4 text-sky-600" />,
  info: <Info className="size-4 text-slate-500" />,
};

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Extract a short code snippet around the diagnostic's column position.
 * Mirrors typst.app's preview: keeps the snippet narrow (≤ 36 chars) and
 * prepends/appends ellipsis when truncated. Returns empty string if the
 * source line can't be located.
 */
function codeSnippet(source: string, line: number, column: number): string {
  const lines = source.split("\n");
  const raw = lines[line - 1];
  if (raw == null) return "";

  const trimmed = raw.replace(/\t/g, "  ");
  const col = Math.max(0, Math.min(column - 1, trimmed.length));

  const WINDOW = 36;
  const half = Math.floor(WINDOW / 2);
  let start = Math.max(0, col - half);
  let end = Math.min(trimmed.length, start + WINDOW);
  if (end - start < WINDOW) {
    start = Math.max(0, end - WINDOW);
  }

  const prefix = start > 0 ? "…" : "";
  const suffix = end < trimmed.length ? "…" : "";
  return `${prefix}${trimmed.slice(start, end).trimEnd()}${suffix}`;
}

function pluralizeIssue(count: number, severity: DiagnosticSeverity): string {
  if (severity === "error") {
    return count === 1 ? "1 lỗi biên dịch" : `${count} lỗi biên dịch`;
  }
  if (severity === "warning") {
    return count === 1 ? "1 cảnh báo" : `${count} cảnh báo`;
  }
  return count === 1 ? "1 gợi ý" : `${count} gợi ý`;
}

export function IssuesPanel(): JSX.Element {
  const { goNext, goPrev, count: navCount } = useIssueNavigation();
  const diagnostics = useEditorStore((s) => s.diagnostics);
  const setActivePath = useEditorStore((s) => s.setActivePath);
  const previewPath = useEditorStore((s) => s.previewPath);
  const activePath = useEditorStore((s) => s.activePath);
  const setPreviewPath = useEditorStore((s) => s.setPreviewPath);
  const ensureDraftLoaded = useEditorStore((s) => s.ensureDraftLoaded);
  const drafts = useEditorStore((s) => s.drafts);
  const files = useEditorStore((s) => s.files);
  const activeIsTypst = useEditorStore((s) =>
    activePath ? s.files[activePath]?.kind === "typst" : false,
  );

  // Source for code snippets: draft (live edits) wins over saved file content.
  const sourceOf = (path: string): string =>
    drafts[path]?.content ?? files[path]?.textContent ?? "";

  // Group by file so users can scan multi-file projects at a glance.
  const byFile = new Map<string, EditorDiagnostic[]>();
  for (const d of diagnostics) {
    const key = d.file ?? "(tệp không xác định)";
    if (!byFile.has(key)) byFile.set(key, []);
    byFile.get(key)!.push(d);
  }

  const errorCount = diagnostics.filter((d) => d.severity === "error").length;
  const warningCount = diagnostics.filter((d) => d.severity === "warning").length;
  const hintCount = diagnostics.filter(
    (d) => d.severity === "hint" || d.severity === "info",
  ).length;

  if (diagnostics.length === 0) {
    const canRetargetPreview =
      activePath && activeIsTypst && activePath !== previewPath;
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3">
        <div className="text-center text-slate-500">
          <p className="text-sm">Không có lỗi</p>
          {previewPath ? (
            <p className="text-xs mt-1">
              Tệp đang xem trước:{" "}
              <span className="font-mono text-slate-700">{previewPath}</span>
            </p>
          ) : (
            <p className="text-xs mt-1">Chưa chọn tệp xem trước</p>
          )}
        </div>
        {canRetargetPreview && (
          <button
            type="button"
            onClick={async () => {
              await ensureDraftLoaded(activePath).catch(() => {});
              setPreviewPath(activePath);
            }}
            className="text-xs px-3 py-1.5 rounded border border-blue-200 bg-blue-50 text-[#007bff] hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#007bff]/30"
          >
            Đặt {activePath} làm tệp xem trước
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-y-auto bg-slate-50/40">
      {/* Section header — typst.app's "Improve" card shows the engine name
          ("Typst") on the left and a tinted count pill on the right. Same
          pattern here: one pill per severity that's actually present, so
          warnings + hints don't take up space until there's something to
          report. Sticky so the header stays visible while the user scrolls
          through a long list of cards. */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 px-3 py-2.5 bg-white border-b border-slate-200">
        <h3 className="text-[13px] font-semibold text-slate-900">Typst</h3>
        <div className="flex items-center gap-1.5">
          {navCount > 0 && (
            <div className="mr-1 flex items-center">
              <button
                type="button"
                onClick={goPrev}
                title="Lỗi trước (Shift+F8)"
                aria-label="Đi tới lỗi trước"
                className="flex h-6 w-6 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#007bff]/30"
              >
                <ArrowUp className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={goNext}
                title="Lỗi tiếp theo (F8)"
                aria-label="Đi tới lỗi tiếp theo"
                className="flex h-6 w-6 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#007bff]/30"
              >
                <ArrowDown className="size-3.5" />
              </button>
            </div>
          )}
          {errorCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 border border-red-100">
              <AlertCircle className="size-3" />
              {pluralizeIssue(errorCount, "error")}
            </span>
          )}
          {warningCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-100">
              <AlertTriangle className="size-3" />
              {pluralizeIssue(warningCount, "warning")}
            </span>
          )}
          {hintCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 border border-sky-100">
              <Lightbulb className="size-3" />
              {pluralizeIssue(hintCount, "hint")}
            </span>
          )}
        </div>
      </header>

      <div className="p-3 flex flex-col gap-3">
        {[...byFile.entries()].map(([file, list]) => {
          const source = sourceOf(file);
          return (
            <section key={file} className="flex flex-col gap-2">
              <p
                className="px-1 text-[11px] font-medium text-slate-500 uppercase tracking-wide truncate"
                title={file}
              >
                {file}
              </p>
              <ul className="flex flex-col gap-2">
                {list.map((d, i) => {
                  const snippet =
                    d.range && source
                      ? codeSnippet(source, d.range.start.line, d.range.start.column)
                      : "";
                  const hints = d.hints ?? [];
                  return (
                    <li key={`${file}-${i}`}>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!d.file || !d.range) return;
                          await setActivePath(d.file);
                          window.dispatchEvent(
                            new CustomEvent("editor:jumpTo", {
                              detail: {
                                line: d.range.start.line,
                                column: d.range.start.column,
                              },
                            }),
                          );
                        }}
                        className="group w-full text-left rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#007bff]/30"
                      >
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 shrink-0">
                            {SEVERITY_ICON[d.severity]}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                              <span className="text-[13px] font-medium leading-snug text-slate-900">
                                {capitalize(d.message)}
                              </span>
                              {d.range && (
                                <span className="text-[11px] text-slate-500 shrink-0">
                                  (dòng {d.range.start.line})
                                </span>
                              )}
                            </div>
                            {snippet && (
                              <div className="mt-1.5 rounded-md bg-slate-100/80 px-2 py-1 font-mono text-[11.5px] text-slate-700 truncate">
                                {snippet}
                              </div>
                            )}
                            {hints.length > 0 && (
                              <div className="mt-1.5 flex items-start gap-1 text-[11.5px] text-sky-700">
                                <Lightbulb className="size-3 mt-0.5 shrink-0" />
                                <span className="flex-1">
                                  {hints.join(" · ")}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
