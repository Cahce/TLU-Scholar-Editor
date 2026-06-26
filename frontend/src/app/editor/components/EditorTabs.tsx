import { useCallback } from "react";
import {
  AlertCircle,
  AlertTriangle,
  AlignLeft,
  Book,
  File,
  FileImage,
  FileText,
  FileType,
  Folder,
  Settings2,
  Shapes,
  Type,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../../components/ui/context-menu";
import { useEditorStore } from "../state/editorStore";
import { getDiagnosticSummary, type FileSeverity } from "../state/selectors";
import type { FileKind } from "../types/editor";
import { EditorModeSwitch } from "./EditorModeSwitch";

/** Tooltip text for a tab's diagnostic badge. */
const SEVERITY_TITLE: Record<FileSeverity, string> = {
  error: "Có lỗi biên dịch",
  warning: "Có cảnh báo",
  hint: "Có gợi ý",
};

// Mirror of FileTreePanel.FILE_ICONS so each tab gets the same visual cue as
// its row in the tree. Kept in-file to avoid prematurely extracting a shared
// helper — refactor when a third callsite appears.
const KIND_ICON: Record<FileKind | "folder", React.ComponentType<{ className?: string }>> = {
  typst: FileText,
  bib: Book,
  image: FileImage,
  data: File,
  other: File,
  vector: Shapes,
  font: Type,
  markdown: FileText,
  config: Settings2,
  text: AlignLeft,
  pdf: FileType,
  folder: Folder,
};

function basenameOf(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? path : path.slice(idx + 1);
}

/**
 * Tab bar shown above the editor. Each entry in `openTabs` becomes a tab; the
 * active tab is highlighted. Closing a tab whose draft is dirty prompts the
 * user; right-click exposes Close / Close others / Close right / Close all.
 */
export function EditorTabs(): JSX.Element | null {
  const openTabs = useEditorStore((s) => s.openTabs);
  const activePath = useEditorStore((s) => s.activePath);
  const files = useEditorStore((s) => s.files);
  const drafts = useEditorStore((s) => s.drafts);
  // Memoized map (stable identity while diagnostics unchanged) → severity badge per tab.
  const severityByFile = useEditorStore(
    (s) => getDiagnosticSummary(s.diagnostics).severityByFile,
  );
  const setActivePath = useEditorStore((s) => s.setActivePath);
  const saveDraftNow = useEditorStore((s) => s.saveDraftNow);
  const closeTab = useEditorStore((s) => s.closeTab);
  const closeOtherTabs = useEditorStore((s) => s.closeOtherTabs);
  const closeTabsToRight = useEditorStore((s) => s.closeTabsToRight);
  const closeAllTabs = useEditorStore((s) => s.closeAllTabs);
  const visualMode = useEditorStore((s) =>
    activePath ? s.visualModeByPath[activePath] ?? "code" : "code",
  );
  const setEditorMode = useEditorStore((s) => s.setEditorMode);
  const activeKind = activePath ? files[activePath]?.kind : undefined;
  const visualEligible = activeKind === "typst";
  const disabledReason = !activePath
    ? "Mở một tệp .typ để dùng Visual editor"
    : !visualEligible
      ? "Visual editor chỉ khả dụng cho tệp .typ"
      : undefined;

  const handleCloseTab = useCallback(
    async (path: string) => {
      const draft = drafts[path];
      if (draft?.dirty && !draft.saving) {
        const choice = window.confirm(
          `Tệp "${basenameOf(path)}" có thay đổi chưa lưu.\n\n` +
          `[OK] Lưu trước khi đóng.\n` +
          `[Hủy] Hủy đóng (giữ tab).`,
        );
        if (!choice) return;
        try {
          await saveDraftNow(path);
        } catch {
          toast.error("Không thể lưu — tab vẫn mở.");
          return;
        }
      }
      await closeTab(path);
    },
    [drafts, saveDraftNow, closeTab],
  );

  // Close-all variants need similar dirty handling. Simplified: bail if ANY
  // affected tab is dirty and let the user save manually. Keeps confirm UX
  // predictable (no per-tab dialog spam).
  const closeBulk = useCallback(
    async (
      action: "others" | "right" | "all",
      pivot: string,
    ) => {
      const targets =
        action === "others"
          ? openTabs.filter((p) => p !== pivot)
          : action === "right"
            ? openTabs.slice(openTabs.indexOf(pivot) + 1)
            : openTabs;
      const dirtyTargets = targets.filter((p) => drafts[p]?.dirty);
      if (dirtyTargets.length > 0) {
        toast.warning(
          `${dirtyTargets.length} tệp chưa lưu — vui lòng lưu thủ công trước khi đóng nhóm.`,
        );
        return;
      }
      if (action === "others") await closeOtherTabs(pivot);
      else if (action === "right") await closeTabsToRight(pivot);
      else await closeAllTabs();
    },
    [openTabs, drafts, closeOtherTabs, closeTabsToRight, closeAllTabs],
  );

  if (openTabs.length === 0) return null;

  return (
    <div className="flex shrink-0 items-stretch border-b border-slate-200 bg-slate-50">
      <div
        role="tablist"
        className="flex flex-1 overflow-x-auto scrollbar-hide"
      >
        {openTabs.map((path) => {
        const isActive = path === activePath;
        const isDirty = drafts[path]?.dirty ?? false;
        const file = files[path];
        const Icon = KIND_ICON[file?.kind ?? "other"];
        const name = basenameOf(path);
        const sev = severityByFile.get(path);

        return (
          <ContextMenu key={path}>
            <ContextMenuTrigger asChild>
              <div
                role="tab"
                tabIndex={isActive ? 0 : -1}
                aria-selected={isActive}
                onClick={() => {
                  if (!isActive) void setActivePath(path);
                }}
                onMouseDown={(e) => {
                  // Middle-click → close (browser-tab convention).
                  if (e.button === 1) {
                    e.preventDefault();
                    void handleCloseTab(path);
                  }
                }}
                className={`group relative flex shrink-0 cursor-pointer items-center gap-1.5 border-r border-slate-200 px-2.5 py-1.5 text-xs transition-colors ${
                  isActive
                    ? "bg-white text-slate-900"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
                title={path}
              >
                <Icon className="size-3.5 shrink-0 text-slate-400" />
                <span className="max-w-[160px] truncate">
                  {name}
                  {isDirty ? <span className="ml-0.5 text-[#007bff]">•</span> : null}
                </span>
                {sev ? (
                  <span
                    className="shrink-0"
                    title={SEVERITY_TITLE[sev]}
                    aria-hidden="true"
                  >
                    {sev === "error" ? (
                      <AlertCircle className="size-3 text-red-500" />
                    ) : sev === "warning" ? (
                      <AlertTriangle className="size-3 text-amber-500" />
                    ) : (
                      <span className="block size-1.5 rounded-full bg-sky-500" />
                    )}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleCloseTab(path);
                  }}
                  className="ml-1 rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-300 hover:text-slate-700"
                  aria-label={`Đóng ${name}`}
                  title="Đóng (Ctrl+W)"
                >
                  <X className="size-3" />
                </button>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => void handleCloseTab(path)}>
                Đóng
              </ContextMenuItem>
              <ContextMenuItem
                disabled={openTabs.length <= 1}
                onClick={() => void closeBulk("others", path)}
              >
                Đóng các tab khác
              </ContextMenuItem>
              <ContextMenuItem
                disabled={openTabs.indexOf(path) === openTabs.length - 1}
                onClick={() => void closeBulk("right", path)}
              >
                Đóng các tab bên phải
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => void closeBulk("all", path)}>
                Đóng tất cả
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
        })}
      </div>
      <div className="flex shrink-0 items-center px-2">
        <EditorModeSwitch
          mode={visualMode}
          disabled={!visualEligible}
          disabledReason={disabledReason}
          onChange={(m) => activePath && setEditorMode(activePath, m)}
        />
      </div>
    </div>
  );
}
