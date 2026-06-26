/**
 * Editor command registry — the SINGLE source of truth for the workspace
 * top-bar menus (Tệp / Chỉnh sửa / Xem / Trợ giúp / ⋮) and the "Phím tắt"
 * modal.
 *
 * IMPORTANT — shortcuts here are DISPLAY ONLY. The real key handling lives in
 * `EditorPane.tsx` (keydown listener) and the CodeMirror `defaultKeymap` /
 * `historyKeymap`. Only commands whose keys are ACTUALLY bound there get a
 * `shortcut` so the menu never advertises a key that does nothing. If you
 * change a binding in EditorPane, update the matching `shortcut` here too.
 */
import {
  undo,
  redo,
  selectAll,
  toggleComment,
  indentMore,
  indentLess,
} from "@codemirror/commands";
import type { EditorView } from "@codemirror/view";
import { toast } from "sonner";
import {
  Save,
  SaveAll,
  FilePlus,
  FolderPlus,
  Upload,
  Star,
  FileDown,
  Archive,
  ArrowLeft,
  Undo2,
  Redo2,
  TextSelect,
  Search,
  Replace,
  MessageSquare,
  IndentIncrease,
  IndentDecrease,
  Wand2,
  Pencil,
  Sigma,
  AlertTriangle,
  ExternalLink,
  HelpCircle,
  Keyboard,
  PackagePlus,
  Scissors,
  Copy,
  ClipboardPaste,
  ListTree,
  Settings,
  Info,
} from "lucide-react";
import { useEditorStore } from "../state/editorStore";
import type { EditorCommand, EditorCommandCtx, ExtraShortcut, MenuLayout } from "./types";

/** Run a CodeMirror command against the live active view, then refocus it. */
function withView(fn: (v: EditorView) => unknown): void {
  const view = useEditorStore.getState().editorViewRef.current;
  if (!view) return;
  fn(view);
  view.focus();
}

function getView(): EditorView | null {
  return useEditorStore.getState().editorViewRef.current;
}

// Clipboard commands. CodeMirror has no Cut/Copy/Paste command, and Vim mode
// remaps Ctrl+V to Visual-Block — so these menu items are the reliable path.
// navigator.clipboard can reject (permission / insecure context); we surface a
// Vietnamese hint instead of letting the raw error bubble.
async function copySelection(): Promise<void> {
  const view = getView();
  if (!view) return;
  const { from, to } = view.state.selection.main;
  if (from === to) return; // nothing selected
  try {
    await navigator.clipboard.writeText(view.state.sliceDoc(from, to));
  } catch {
    toast.error("Không truy cập được clipboard. Dùng Ctrl+C để sao chép.");
  }
}

async function cutSelection(): Promise<void> {
  const view = getView();
  if (!view) return;
  const { from, to } = view.state.selection.main;
  if (from === to) return;
  try {
    await navigator.clipboard.writeText(view.state.sliceDoc(from, to));
    view.dispatch(view.state.replaceSelection(""));
    view.focus();
  } catch {
    toast.error("Không truy cập được clipboard. Dùng Ctrl+X để cắt.");
  }
}

async function pasteClipboard(): Promise<void> {
  const view = getView();
  if (!view) return;
  try {
    const text = await navigator.clipboard.readText();
    if (!text) return;
    view.dispatch(view.state.replaceSelection(text));
    view.focus();
  } catch {
    toast.error("Không truy cập được clipboard. Dùng Ctrl+V để dán.");
  }
}

function backTarget(c: EditorCommandCtx): string {
  if (c.templateId) return "/admin/templates";
  if (c.readOnly) return "/admin/projects";
  return "/student";
}

function dispatchSearch(focus: "find" | "replace"): void {
  window.dispatchEvent(
    new CustomEvent("workspace:openSearch", { detail: { focus } }),
  );
}

export const EDITOR_COMMANDS: Record<string, EditorCommand> = {
  // ── Tệp (File) ──────────────────────────────────────────────────────────
  "file.save": {
    id: "file.save",
    label: "Lưu",
    icon: Save,
    shortcut: "Ctrl+S",
    scope: "global",
    isVisible: (c) => !c.readOnly,
    isEnabled: (c) => !!c.activePath && c.activeDirty && !c.activeSaving,
    run: (c) => {
      if (!c.activePath) return;
      void useEditorStore
        .getState()
        .saveDraftNow(c.activePath)
        .catch((err) =>
          toast.error(err instanceof Error ? err.message : "Lưu thất bại"),
        );
    },
  },
  "file.saveAll": {
    id: "file.saveAll",
    label: "Lưu tất cả",
    icon: SaveAll,
    scope: "global",
    isVisible: (c) => !c.readOnly,
    isEnabled: (c) => c.anyDirty,
    run: () => {
      void useEditorStore
        .getState()
        .flushDirtyDrafts()
        .then(() => toast.success("Đã lưu tất cả"))
        .catch((err) =>
          toast.error(err instanceof Error ? err.message : "Lưu tất cả thất bại"),
        );
    },
  },
  "file.new": {
    id: "file.new",
    label: "Tệp mới",
    icon: FilePlus,
    scope: "global",
    isVisible: (c) => !c.readOnly,
    run: (c) => {
      c.setSidebarMode("files");
      useEditorStore.getState().requestFileTreeOp("newFile");
    },
  },
  "file.newFolder": {
    id: "file.newFolder",
    label: "Thư mục mới",
    icon: FolderPlus,
    scope: "global",
    isVisible: (c) => !c.readOnly,
    run: (c) => {
      c.setSidebarMode("files");
      useEditorStore.getState().requestFileTreeOp("newFolder");
    },
  },
  "file.upload": {
    id: "file.upload",
    label: "Tải tệp lên",
    icon: Upload,
    scope: "global",
    isVisible: (c) => !c.readOnly,
    run: (c) => {
      c.setSidebarMode("files");
      useEditorStore.getState().requestFileTreeOp("upload");
    },
  },
  "file.setMain": {
    id: "file.setMain",
    label: "Đặt làm tệp chính",
    icon: Star,
    scope: "global",
    isVisible: (c) => !c.readOnly,
    isEnabled: (c) => c.isTypstActive,
    run: async (c) => {
      if (!c.activePath) return;
      try {
        await useEditorStore.getState().setMainFile(c.activePath);
        toast.success("Đã đặt làm tệp chính");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Không thể đặt tệp chính");
      }
    },
  },
  "file.exportPdf": {
    id: "file.exportPdf",
    label: "Xuất PDF",
    icon: FileDown,
    scope: "global",
    isVisible: (c) => !c.readOnly,
    isEnabled: (c) => !!c.projectId,
    run: (c) => c.exportPdf(),
  },
  "file.exportZip": {
    id: "file.exportZip",
    label: "Tải xuống bản sao lưu (.zip)",
    icon: Archive,
    scope: "global",
    isVisible: (c) => !c.readOnly,
    isEnabled: (c) => !!c.projectId,
    run: (c) => c.exportZip(),
  },
  "file.close": {
    id: "file.close",
    label: "Đóng & quay lại",
    icon: ArrowLeft,
    scope: "global",
    run: (c) => c.navigate(backTarget(c)),
  },

  // ── Chỉnh sửa (Edit) ────────────────────────────────────────────────────
  "edit.undo": {
    id: "edit.undo",
    label: "Hoàn tác",
    icon: Undo2,
    shortcut: "Ctrl+Z",
    scope: "editor",
    isEnabled: (c) => !c.readOnly && c.hasEditorView,
    run: () => withView(undo),
  },
  "edit.redo": {
    id: "edit.redo",
    label: "Làm lại",
    icon: Redo2,
    shortcut: "Ctrl+Y",
    scope: "editor",
    isEnabled: (c) => !c.readOnly && c.hasEditorView,
    run: () => withView(redo),
  },
  "edit.cut": {
    id: "edit.cut",
    label: "Cắt",
    icon: Scissors,
    shortcut: "Ctrl+X",
    scope: "editor",
    isEnabled: (c) => !c.readOnly && c.hasEditorView,
    run: () => cutSelection(),
  },
  "edit.copy": {
    id: "edit.copy",
    label: "Sao chép",
    icon: Copy,
    shortcut: "Ctrl+C",
    scope: "editor",
    isEnabled: (c) => c.hasEditorView,
    run: () => copySelection(),
  },
  "edit.paste": {
    id: "edit.paste",
    label: "Dán",
    icon: ClipboardPaste,
    shortcut: "Ctrl+V",
    scope: "editor",
    isEnabled: (c) => !c.readOnly && c.hasEditorView,
    run: () => pasteClipboard(),
  },
  "edit.selectAll": {
    id: "edit.selectAll",
    label: "Chọn tất cả",
    icon: TextSelect,
    shortcut: "Ctrl+A",
    scope: "editor",
    isEnabled: (c) => c.hasEditorView,
    run: () => withView(selectAll),
  },
  "edit.find": {
    id: "edit.find",
    label: "Tìm kiếm",
    icon: Search,
    shortcut: "Ctrl+F",
    scope: "global",
    run: () => dispatchSearch("find"),
  },
  "edit.replace": {
    id: "edit.replace",
    label: "Thay thế",
    icon: Replace,
    shortcut: "Ctrl+H",
    scope: "global",
    isVisible: (c) => !c.readOnly,
    run: () => dispatchSearch("replace"),
  },
  "edit.comment": {
    id: "edit.comment",
    label: "Chú thích / Bỏ chú thích",
    icon: MessageSquare,
    shortcut: "Ctrl+/",
    scope: "editor",
    isEnabled: (c) => !c.readOnly && c.hasEditorView,
    run: () => withView(toggleComment),
  },
  "edit.indentMore": {
    id: "edit.indentMore",
    label: "Thụt lề",
    icon: IndentIncrease,
    shortcut: "Ctrl+]",
    scope: "editor",
    isEnabled: (c) => !c.readOnly && c.hasEditorView,
    run: () => withView(indentMore),
  },
  "edit.indentLess": {
    id: "edit.indentLess",
    label: "Giảm thụt lề",
    icon: IndentDecrease,
    shortcut: "Ctrl+[",
    scope: "editor",
    isEnabled: (c) => !c.readOnly && c.hasEditorView,
    run: () => withView(indentLess),
  },
  "edit.format": {
    id: "edit.format",
    label: "Định dạng tài liệu",
    icon: Wand2,
    shortcut: "Shift+Alt+F",
    scope: "editor",
    isEnabled: (c) => !c.readOnly && c.isTypstActive && c.hasEditorView,
    run: () => window.dispatchEvent(new CustomEvent("editor:format")),
  },
  "edit.renameProject": {
    id: "edit.renameProject",
    label: "Đổi tên dự án",
    icon: Pencil,
    scope: "global",
    isVisible: (c) => !c.readOnly && !c.templateId,
    run: () => window.dispatchEvent(new CustomEvent("editor:renameProject")),
  },

  // ── Xem (View) ──────────────────────────────────────────────────────────
  "view.wordCount": {
    id: "view.wordCount",
    label: "Đếm từ",
    icon: Sigma,
    scope: "global",
    run: (c) => c.openWordCount(),
  },
  "view.issues": {
    id: "view.issues",
    label: "Lỗi & cảnh báo",
    icon: AlertTriangle,
    scope: "global",
    run: (c) => c.openIssues(),
  },
  "view.popupPdf": {
    id: "view.popupPdf",
    label: "Mở PDF ở cửa sổ riêng",
    icon: ExternalLink,
    scope: "global",
    run: (c) => c.popupPdf(),
  },
  "view.outline": {
    id: "view.outline",
    label: "Dàn ý",
    icon: ListTree,
    scope: "global",
    run: (c) => c.setSidebarMode("outline"),
  },
  "view.settings": {
    id: "view.settings",
    label: "Cài đặt trình soạn thảo",
    icon: Settings,
    scope: "global",
    run: (c) => c.setSidebarMode("settings"),
  },

  // ── Trợ giúp (Help) ─────────────────────────────────────────────────────
  "help.center": {
    id: "help.center",
    label: "Trung tâm trợ giúp",
    icon: HelpCircle,
    scope: "global",
    run: () => window.open("/huong-dan", "_blank", "noopener,noreferrer"),
  },
  "help.shortcuts": {
    id: "help.shortcuts",
    label: "Phím tắt",
    icon: Keyboard,
    shortcut: "F1",
    scope: "global",
    run: (c) => c.openShortcuts(),
  },
  "help.about": {
    id: "help.about",
    label: "Giới thiệu",
    icon: Info,
    scope: "global",
    run: (c) => c.openAbout(),
  },

  // ── ⋮ Overflow only ─────────────────────────────────────────────────────
  "overflow.publish": {
    id: "overflow.publish",
    label: "Lưu thành phiên bản mẫu",
    icon: PackagePlus,
    scope: "global",
    isVisible: (c) => !!c.templateId,
    isEnabled: (c) => !!c.projectId,
    run: (c) => c.openPublish(),
  },
};

export const MENU_LAYOUT: MenuLayout = {
  file: [
    { id: "file.save" },
    { id: "file.saveAll" },
    { sep: true },
    { id: "file.new" },
    { id: "file.newFolder" },
    { id: "file.upload" },
    { sep: true },
    { id: "file.setMain" },
    { sep: true },
    { id: "file.exportPdf" },
    { id: "file.exportZip" },
    { sep: true },
    { id: "file.close" },
  ],
  edit: [
    { id: "edit.undo" },
    { id: "edit.redo" },
    { sep: true },
    { id: "edit.cut" },
    { id: "edit.copy" },
    { id: "edit.paste" },
    { id: "edit.selectAll" },
    { sep: true },
    { id: "edit.find" },
    { id: "edit.replace" },
    { sep: true },
    { id: "edit.comment" },
    { id: "edit.indentMore" },
    { id: "edit.indentLess" },
    { id: "edit.format" },
    { sep: true },
    { id: "edit.renameProject" },
  ],
  view: [
    { id: "view.wordCount" },
    { sep: true },
    { id: "view.issues" },
    { id: "view.outline" },
    { id: "view.popupPdf" },
    { id: "view.settings" },
  ],
  help: [
    { id: "help.center" },
    { submenu: "helpTopics" },
    { sep: true },
    { id: "help.shortcuts" },
    { id: "help.about" },
  ],
  overflow: [
    { id: "file.exportPdf" },
    { id: "file.exportZip" },
    { id: "overflow.publish" },
    { sep: true },
    { id: "view.wordCount" },
    { id: "edit.find" },
    { id: "view.issues" },
    { id: "view.popupPdf" },
    { sep: true },
    { id: "help.center" },
    { id: "file.close" },
  ],
};

/**
 * Shortcuts that ARE bound in EditorPane but aren't exposed as menu items.
 * Listed so the "Phím tắt" modal stays complete without re-typing keys in JSX.
 */
export const EXTRA_SHORTCUTS: ExtraShortcut[] = [
  { label: "Đậm", keys: "Ctrl+B", group: "format" },
  { label: "Nghiêng", keys: "Ctrl+I", group: "format" },
  { label: "Mã nội dòng (code)", keys: "Ctrl+`", group: "format" },
  { label: "Chuyển Mã ↔ Trực quan", keys: "Ctrl+Shift+V", group: "edit" },
  { label: "Đóng tab hiện tại", keys: "Ctrl+W", group: "nav" },
  { label: "Chuyển tab kế / trước", keys: "Ctrl+Tab / Ctrl+Shift+Tab", group: "nav" },
  { label: "Nhảy tới tab thứ N", keys: "Ctrl+1 … Ctrl+9", group: "nav" },
  { label: "Lỗi tiếp theo / trước đó", keys: "F8 / Shift+F8", group: "nav" },
];
