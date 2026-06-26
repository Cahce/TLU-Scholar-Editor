import type { LucideIcon } from "lucide-react";

/**
 * Runtime context for editor menu commands. Built once per render by
 * `useEditorCommands` from the editor store + workspace handlers, and read by
 * each command's `isVisible` / `isEnabled` / `run`.
 *
 * NOTE: `hasEditorView` is a render-time snapshot of whether a CodeMirror view
 * is mounted. Editor commands re-read the live view ref inside `run` (see
 * `withView` in registry.ts), so the actual action is always fresh even if this
 * flag is momentarily stale.
 */
export interface EditorCommandCtx {
  readOnly: boolean;
  templateId: string | null;
  projectId: string | null;
  activePath: string | null;
  /** Active file's draft has unsaved edits. */
  activeDirty: boolean;
  /** Active file's draft is currently being saved. */
  activeSaving: boolean;
  /** Any open draft has unsaved edits (drives "Lưu tất cả"). */
  anyDirty: boolean;
  /** Active file is a `.typ` file. */
  isTypstActive: boolean;
  /** A CodeMirror view is mounted (snapshot — see note above). */
  hasEditorView: boolean;

  // Imperative handlers supplied by ProjectWorkspace.
  navigate: (to: string) => void;
  exportPdf: () => void;
  exportZip: () => void;
  openWordCount: () => void;
  openShortcuts: () => void;
  openPublish: () => void;
  popupPdf: () => void;
  /** Switch the left sidebar mode (e.g. to 'files' before a file-tree op). */
  setSidebarMode: (mode: string) => void;
  /** Switch the sidebar to the issues/diagnostics panel. */
  openIssues: () => void;
  /** Open the "Giới thiệu" (About) dialog. */
  openAbout: () => void;
}

export interface EditorCommand {
  id: string;
  /** Vietnamese menu label. */
  label: string;
  icon?: LucideIcon;
  /** Keyboard shortcut hint — DISPLAY ONLY. The real binding lives in
   *  EditorPane/CodeMirror; keep the two in sync (see registry.ts header). */
  shortcut?: string;
  /** `editor` = needs the active CodeMirror view; `global` = always runnable. */
  scope: "global" | "editor";
  /** Default `true`. Hidden entirely when false (use for readOnly/template). */
  isVisible?: (c: EditorCommandCtx) => boolean;
  /** Default `true`. Shown but greyed when false. */
  isEnabled?: (c: EditorCommandCtx) => boolean;
  run: (c: EditorCommandCtx) => void | Promise<void>;
}

/** A menu is an ordered list of command ids, separators, and special blocks. */
export type MenuEntry =
  | { sep: true }
  | { id: string }
  | { submenu: "helpTopics" };

export interface MenuLayout {
  file: MenuEntry[];
  edit: MenuEntry[];
  view: MenuEntry[];
  help: MenuEntry[];
  overflow: MenuEntry[];
}

/** A shortcut shown in the "Phím tắt" modal but not exposed as a menu item. */
export interface ExtraShortcut {
  label: string;
  keys: string;
  group: "file" | "edit" | "nav" | "format";
}
