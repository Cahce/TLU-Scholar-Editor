// =============================================================================
// FileTreePanel — file explorer with full keyboard / DnD support.
//
// UX patterns adapted from:
//   - VS Code's explorer view (`vs/workbench/contrib/files/browser/views/explorerView`)
//     — focus-context shortcuts, optimistic UI, F2 rename, Ctrl+A select-all.
//   - Kiro / Antigravity (Anthropic IDE-style products) — minimal chrome,
//     subtle multi-select cues, batch-confirm dialogs for destructive ops.
//   - GitHub web file tree — single-click open, double-click N/A (web).
//
// Keyboard shortcuts (scoped to the panel via `data-file-tree-panel`
// markers + a `mousedown/focusin` listener that tracks "focus context",
// so we don't hijack Ctrl+Z while the user is editing in CodeMirror):
//   - Ctrl/Cmd+A          → select all visible rows
//   - Ctrl/Cmd+Z          → undo last file operation (rename / create / delete)
//   - F2                  → rename single selection
//   - Delete / Backspace  → delete selection (confirm if > 1)
//   - Enter               → open active file / toggle folder
//   - Esc                 → clear selection + cancel any active drag
//
// Optimistic move (eliminates flicker on drag-drop):
//   `useFileMutations.renameFile` updates the store BEFORE awaiting the
//   backend. UI repaints immediately. Backend success reconciles metadata;
//   backend failure rolls back to the pre-move snapshot. Same pattern VS
//   Code uses for renames inside its workspace explorer.
//
// Drag & drop:
//   HTML5 native DnD for mouse + custom `useTouchDrag` hook for touch.
//   `react-dnd` + `react-dnd-html5-backend` are installed but unused —
//   migrate if scope grows beyond what native handles cleanly (drop-between
//   indicator lines, virtualized 1000+ row trees).
//
// Future polish library options:
//   - `react-arborist` — tree with built-in DnD + drop indicators
//   - `react-complex-tree` — headless, more configurable
// =============================================================================

import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  FileImage,
  Book,
  File,
  Folder,
  FolderOpen,
  FilePlus,
  FolderPlus,
  Edit,
  Trash2,
  MoreVertical,
  Eye,
  Upload,
  Shapes,
  Type,
  Settings2,
  AlignLeft,
  FileType,
  Download,
  AlertCircle,
  AlertTriangle,
  FolderOpen as FolderOpenIcon,
} from "lucide-react";
import { getFileContent } from "../../api/projectFiles";
import { downloadFile } from "../../lib/downloadFile";
import { useEditorStore } from "../state/editorStore";
import {
  selectFileTree,
  flattenVisibleTree,
  getDiagnosticSummary,
  type FileSeverity,
} from "../state/selectors";
import { useFileMutations } from "../hooks/useFileMutations";
import { useTouchDrag } from "../hooks/useTouchDrag";
import { ApiEditorStorageService } from "../services/ApiEditorStorageService";

// Module-scope storage instance for direct calls that need to bypass the
// mutation hooks' undo-stack pushing (e.g. handleUndo executing inverse ops).
const rawStorage = new ApiEditorStorageService();
import type { FileTreeNode, FileKind } from "../types/editor";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../../components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";

/* ─── Icons ──────────────────────────────────────────────────────────────── */

const FILE_ICONS: Record<FileKind | "folder", React.ComponentType<{ className?: string }>> = {
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

/** Tooltip / SR text for a file row's diagnostic badge. */
const SEVERITY_TITLE: Record<FileSeverity, string> = {
  error: "Có lỗi biên dịch",
  warning: "Có cảnh báo",
  hint: "Có gợi ý",
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function kindFromPath(filename: string): FileKind {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  
  // Typst source
  if (ext === 'typ') return 'typst';
  
  // Bibliography
  if (ext === 'bib') return 'bib';
  
  // Raster images
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image';
  
  // Vector graphics
  if (ext === 'svg') return 'vector';
  
  // Fonts
  if (['ttf', 'otf', 'woff', 'woff2'].includes(ext)) return 'font';
  
  // Markdown
  if (ext === 'md') return 'markdown';
  
  // Configuration files
  if (['toml', 'yaml', 'yml', 'json'].includes(ext)) return 'config';
  
  // Data files (incl. CSL citation styles — XML data fed to #bibliography(style:),
  // mapped to 'data' so it is a compilation input without a new FileKind enum)
  if (['csv', 'tsv', 'xml', 'csl'].includes(ext)) return 'data';
  
  // Plain text
  if (ext === 'txt') return 'text';
  
  // PDF
  if (ext === 'pdf') return 'pdf';
  
  return 'other';
}

/* ─── FileTreeItem ───────────────────────────────────────────────────────── */

interface FileTreeItemProps {
  node: FileTreeNode;
  level: number;
  activePath: string | null;
  previewPath: string | null;
  mainPath: string | null;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onSelectFile: (path: string) => void;
  onPreviewFile: (path: string) => void;
  onSetMainFile: (path: string) => void;
  onRenameFile: (path: string, name: string) => void;
  onDeleteFile: (path: string, name: string) => void;
  onDownloadFile: (path: string) => void;
  onNewFileInFolder: (folderPath: string) => void;
  onDeleteFolder: (folderPath: string, name: string) => void;
  // Drag & drop wiring — drilled all the way down so any descendant row
  // can both initiate a drag (file OR folder) and accept a drop on folders.
  draggingPaths: ReadonlySet<string>;
  dropTargetPath: string | null;
  selectedPaths: ReadonlySet<string>;
  onRowDragStart: (path: string, isFolder: boolean) => string[];
  onDragEndFile: () => void;
  onFolderDragOver: (path: string) => void;
  onFolderDragLeave: () => void;
  onFolderDrop: (sourcePaths: string[], targetFolder: string) => void;
  onRowClick: (path: string, e: React.MouseEvent) => void;
  // Touch drag: parent calls `getTouchRowProps(path)` and the result is
  // spread on the row div. Distinct from mouse drag handlers — both
  // coexist on the same element via separate event channels.
  getTouchRowProps: (path: string) => {
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
  };
}

function FileTreeItem({
  node,
  level,
  activePath,
  previewPath,
  mainPath,
  expandedFolders,
  onToggleFolder,
  onSelectFile,
  onPreviewFile,
  onSetMainFile,
  onRenameFile,
  onDeleteFile,
  onDownloadFile,
  onNewFileInFolder,
  onDeleteFolder,
  draggingPaths,
  dropTargetPath,
  selectedPaths,
  onRowDragStart,
  onDragEndFile,
  onFolderDragOver,
  onFolderDragLeave,
  onFolderDrop,
  onRowClick,
  getTouchRowProps,
}: FileTreeItemProps): JSX.Element {
  const readOnly = useEditorStore((s) => s.readOnly);
  // Per-row subscription: returns this file's badge tier (a primitive string),
  // so the row re-renders only when ITS own severity changes — not on every
  // diagnostics update elsewhere in the project.
  const severity = useEditorStore((s) =>
    node.kind === "folder"
      ? undefined
      : getDiagnosticSummary(s.diagnostics).severityByFile.get(node.path),
  );
  const isFolder = node.kind === "folder";
  const isExpanded = expandedFolders.has(node.path);
  const isActive = activePath === node.path;
  const isPreviewTarget = previewPath === node.path;
  const isMainFile = mainPath === node.path;
  const canPreview = node.kind === "typst";
  const isDragging = draggingPaths.has(node.path);
  const isDropTarget = isFolder && dropTargetPath === node.path;
  const isSelected = selectedPaths.has(node.path);
  const Icon = isFolder
    ? isExpanded
      ? FolderOpen
      : Folder
    : FILE_ICONS[node.kind];

  // Both files and folders can be drag sources (Phase 2: folder subtree).
  // Folder rows additionally accept drops.
  const dragSourceProps = {
    draggable: !readOnly,
    onDragStart: (e: React.DragEvent<HTMLDivElement>) => {
      // Resolve the actual payload (this path alone, or the multi-selection
      // if the row is part of it). Returned by the parent's handler so it
      // can update selection state and decide payload in one place.
      const paths = onRowDragStart(node.path, isFolder);
      // Use both `text/paths` (JSON array — Phase 2 primary), `text/path`
      // (Phase 1 single path BC), and `text/plain` (Firefox requirement).
      e.dataTransfer.setData("text/paths", JSON.stringify(paths));
      e.dataTransfer.setData("text/path", paths[0] ?? node.path);
      e.dataTransfer.setData("text/plain", paths[0] ?? node.path);
      e.dataTransfer.effectAllowed = "move";
    },
    onDragEnd: () => onDragEndFile(),
  };

  const dropTargetProps = isFolder
    ? {
        onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
          // Only accept if there's an active drag — prevents accidental
          // highlight when user drags external file onto the tree.
          if (draggingPaths.size === 0) return;
          // Don't accept drop into self (a dragged folder onto itself).
          if (draggingPaths.has(node.path)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          if (dropTargetPath !== node.path) onFolderDragOver(node.path);
        },
        onDragLeave: () => onFolderDragLeave(),
        onDrop: (e: React.DragEvent<HTMLDivElement>) => {
          e.preventDefault();
          // Try multi-path payload first; fall back to single-path string
          // for compatibility with external drops / older callers.
          let paths: string[] = [];
          try {
            const raw = e.dataTransfer.getData("text/paths");
            if (raw) paths = JSON.parse(raw);
          } catch {
            /* fall through */
          }
          if (paths.length === 0) {
            const single =
              e.dataTransfer.getData("text/path") ||
              e.dataTransfer.getData("text/plain");
            if (single) paths = [single];
          }
          void onFolderDrop(paths, node.path);
        },
      }
    : {};

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div>
          <div
            data-path={node.path}
            className={`flex items-center gap-2 min-h-[32px] mx-1 rounded-md cursor-pointer transition-colors group ${
              isActive
                ? "bg-blue-100/60 text-[#007bff] font-medium"
                : isDropTarget
                  ? "bg-blue-50 ring-2 ring-[#007bff]/50"
                  : isSelected
                    // Stronger contrast than the active state's subtle tint —
                    // multi-selection must read as "explicitly chosen" even
                    // when mixed with folder rows that have an amber icon.
                    ? "bg-blue-100 text-[#007bff] ring-1 ring-[#007bff]/40"
                    : "hover:bg-slate-200/50 text-slate-600"
            } ${isDragging ? "opacity-40" : ""}`}
            style={{ paddingLeft: `${level * 14 + 8}px`, paddingRight: "8px" }}
            onClick={(e) => {
              // Delegate to parent so it can decide between
              // multi-select toggling vs single-row activation. Parent then
              // calls back into onToggleFolder/onSelectFile as needed.
              onRowClick(node.path, e);
              // If the click was a plain click (no modifier), preserve
              // Phase 1 behavior: folder → toggle, file → activate.
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                if (isFolder) onToggleFolder(node.path);
                else onSelectFile(node.path);
              }
            }}
            {...dragSourceProps}
            {...dropTargetProps}
            {...getTouchRowProps(node.path)}
          >
            {isFolder ? (
              isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )
            ) : (
              <div className="w-3.5 shrink-0" />
            )}
            <Icon
              className={`w-4 h-4 shrink-0 ${
                // Selected state wins over kind-specific tint so folder
                // selection is visually unambiguous (otherwise amber icon
                // on blue background looks like an unselected folder).
                isSelected && !isActive
                  ? "text-[#007bff]"
                  : isFolder
                    ? "text-amber-400"
                    : isActive
                      ? "text-[#007bff]"
                      : "text-slate-400"
              }`}
            />
            <span className="truncate select-none text-[13px]">{node.name}</span>
            {severity ? (
              <span
                className="shrink-0"
                title={SEVERITY_TITLE[severity]}
                aria-hidden="true"
              >
                {severity === "error" ? (
                  <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                ) : severity === "warning" ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <span className="block w-1.5 h-1.5 rounded-full bg-sky-500" />
                )}
              </span>
            ) : null}
            {!isFolder && canPreview ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onSetMainFile(node.path);
                }}
                className={`ml-auto flex h-7 w-7 items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#007bff]/30 ${
                  isMainFile
                    ? "bg-blue-100 text-[#007bff]"
                    : "text-slate-400 opacity-0 hover:bg-slate-200 hover:text-slate-700 group-hover:opacity-100 focus:opacity-100"
                }`}
                title={
                  isMainFile
                    ? "Tệp chính (xem trước mặc định)"
                    : "Đặt làm tệp chính"
                }
                aria-label={
                  isMainFile
                    ? `Tệp chính: ${node.name}`
                    : `Đặt ${node.name} làm tệp chính`
                }
              >
                <Eye className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {isFolder && isExpanded && node.children && (
            <div>
              {node.children.map((child) => (
                <FileTreeItem
                  key={child.path}
                  node={child}
                  level={level + 1}
                  activePath={activePath}
                  previewPath={previewPath}
                  mainPath={mainPath}
                  expandedFolders={expandedFolders}
                  onToggleFolder={onToggleFolder}
                  onSelectFile={onSelectFile}
                  onPreviewFile={onPreviewFile}
                  onSetMainFile={onSetMainFile}
                  onRenameFile={onRenameFile}
                  onDeleteFile={onDeleteFile}
                  onDownloadFile={onDownloadFile}
                  onNewFileInFolder={onNewFileInFolder}
                  onDeleteFolder={onDeleteFolder}
                  draggingPaths={draggingPaths}
                  dropTargetPath={dropTargetPath}
                  selectedPaths={selectedPaths}
                  onRowDragStart={onRowDragStart}
                  onDragEndFile={onDragEndFile}
                  onFolderDragOver={onFolderDragOver}
                  onFolderDragLeave={onFolderDragLeave}
                  onFolderDrop={onFolderDrop}
                  onRowClick={onRowClick}
                  getTouchRowProps={getTouchRowProps}
                />
              ))}
            </div>
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48">
        {isFolder ? (
          readOnly ? (
            <ContextMenuItem disabled>Chế độ chỉ xem</ContextMenuItem>
          ) : (
            <>
              <ContextMenuItem onClick={() => onNewFileInFolder(node.path)}>
                <FilePlus className="w-4 h-4 mr-2 text-slate-500" />
                Tệp mới trong thư mục
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => onDeleteFolder(node.path, node.name)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Xóa thư mục
              </ContextMenuItem>
            </>
          )
        ) : (
          <>
            {canPreview && (
              <>
                <ContextMenuItem
                  onClick={() => onSetMainFile(node.path)}
                  disabled={isMainFile}
                >
                  <Eye className="w-4 h-4 mr-2 text-[#007bff]" />
                  {isMainFile ? "Tệp chính hiện tại" : "Đặt làm tệp chính"}
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onPreviewFile(node.path)}>
                  <Eye className="w-4 h-4 mr-2 text-slate-500" />
                  {isPreviewTarget ? "Đang xem trước" : "Xem trước tạm thời"}
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            )}
            <ContextMenuItem onClick={() => onSelectFile(node.path)}>
              <FolderOpenIcon className="w-4 h-4 mr-2 text-slate-500" />
              Mở
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onDownloadFile(node.path)}>
              <Download className="w-4 h-4 mr-2 text-slate-500" />
              Tải xuống
            </ContextMenuItem>
            {!readOnly && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => onRenameFile(node.path, node.name)}>
                  <Edit className="w-4 h-4 mr-2 text-slate-500" />
                  Đổi tên
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => onDeleteFile(node.path, node.name)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Xóa tệp
                </ContextMenuItem>
              </>
            )}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

/* ─── FileTreePanel ──────────────────────────────────────────────────────── */

export function FileTreePanel(): JSX.Element {
  const files = useEditorStore((s) => s.files);
  const activePath = useEditorStore((s) => s.activePath);
  const previewPath = useEditorStore((s) => s.previewPath);
  const setActivePath = useEditorStore((s) => s.setActivePath);
  const setPreviewPath = useEditorStore((s) => s.setPreviewPath);
  const setMainFile = useEditorStore((s) => s.setMainFile);
  const mainPath = useEditorStore((s) => s.settings?.mainPath ?? null);
  const ensureDraftLoaded = useEditorStore((s) => s.ensureDraftLoaded);
  const loading = useEditorStore((s) => s.loading);
  const readOnly = useEditorStore((s) => s.readOnly);
  // File-tree ops requested from the top-bar "Tệp" menu (see editorStore).
  const pendingFileTreeOp = useEditorStore((s) => s.pendingFileTreeOp);
  const consumeFileTreeOp = useEditorStore((s) => s.consumeFileTreeOp);

  const { createFile, uploadBinaryFile, renameFile, deleteFile } = useFileMutations();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const uploadInputRef = useRef<HTMLInputElement>(null);
  // Scroll container ref shared between the JSX `overflow-y-auto` div and
  // the touch-drag hook (needed for edge auto-scroll on mobile).
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Tracks whether focus / latest pointer interaction was inside the tree.
  // We can't use a single root ref because FileTreePanel returns a Fragment,
  // so instead the toolbar + scroll container are marked with
  // `data-file-tree-panel="true"` and the listener walks up from the event
  // target to look for that marker. Mirrors VS Code's `IContextKeyService`
  // approach of binding shortcuts to a "focus context" rather than a single
  // element.
  const [hasFocus, setHasFocus] = useState(false);

  // Derive the file tree EARLY (right after state declarations) because both
  // the keyboard-shortcut effect's deps array and the Shift+click range
  // selector read it. Putting the declaration further down — even though
  // effects only RUN after render — triggers a temporal-dead-zone
  // `ReferenceError` because deps arrays are evaluated DURING render.
  const fileTree = selectFileTree(files);

  // ── Drag & drop state (Phase 2) ──────────────────────────────────────────
  // `draggingPaths` = paths currently being dragged. Empty set = idle. A drag
  //   may carry 1+ paths (single file, folder subtree, or multi-selection).
  // `dropTargetPath` = the folder hovered over during a drag:
  //   - "<folder/path>" → hover that folder row
  //   - ""              → hover the root drop zone
  //   - null            → not over any valid drop target
  const [draggingPaths, setDraggingPaths] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  const [dropTargetPath, setDropTargetPath] = useState<string | null>(null);

  // ── Multi-select state ───────────────────────────────────────────────────
  // `selectedPaths` = rows the user has Ctrl/Shift+clicked. Empty = no
  // explicit selection (drag operates on the row under the pointer only).
  // `anchorPath` = pivot for Shift+click range selection.
  const [selectedPaths, setSelectedPaths] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  const [anchorPath, setAnchorPath] = useState<string | null>(null);

  const resetDnd = (): void => {
    setDraggingPaths(new Set());
    setDropTargetPath(null);
  };

  // ─── Multi-select click handler ────────────────────────────────────────────
  // Phase 1 behavior (plain click → open file / toggle folder) is preserved
  // inside FileTreeItem — this handler runs FIRST and only mutates selection
  // when a modifier key is held.
  const handleRowClick = (path: string, e: React.MouseEvent): void => {
    if (e.ctrlKey || e.metaKey) {
      // Toggle membership; do NOT change activePath. Anchor moves to last toggled.
      e.preventDefault();
      e.stopPropagation();
      setSelectedPaths((prev) => {
        const next = new Set(prev);
        if (next.has(path)) next.delete(path);
        else next.add(path);
        return next;
      });
      setAnchorPath(path);
      return;
    }

    if (e.shiftKey && anchorPath) {
      e.preventDefault();
      e.stopPropagation();
      // Range over the FLAT visible tree (matches what the user can see).
      const visible = flattenVisibleTree(fileTree, expandedFolders);
      const a = visible.indexOf(anchorPath);
      const b = visible.indexOf(path);
      if (a === -1 || b === -1) return;
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      setSelectedPaths(new Set(visible.slice(lo, hi + 1)));
      return;
    }

    // Plain click: clear selection (so subsequent drag operates on this row
    // only). Anchor updates to the clicked row.
    setSelectedPaths(new Set());
    setAnchorPath(path);
  };

  /**
   * Compute the actual drag payload when a row begins a drag.
   *   - If the row is part of an active multi-selection → drag the entire
   *     selection.
   *   - Else (plain row, no selection or different row) → drag just this row.
   *     We also clear the existing selection so the visual selection cue
   *     doesn't linger on rows that aren't being moved.
   */
  const handleRowDragStart = (path: string, _isFolder: boolean): string[] => {
    let payload: string[];
    if (selectedPaths.has(path) && selectedPaths.size > 1) {
      payload = Array.from(selectedPaths);
    } else {
      payload = [path];
      if (selectedPaths.size > 0) setSelectedPaths(new Set());
    }
    setDraggingPaths(new Set(payload));
    return payload;
  };

  /**
   * Expand a single source path into the concrete list of files that need
   * to be renamed:
   *   - file path → `[path]`
   *   - folder path → all files whose path starts with `<folder>/` plus the
   *     folder's `.keep` placeholder if any (so empty folders survive the
   *     move). Backend has no folder entity, so "moving a folder" is really
   *     "moving every descendant file".
   */
  function expandFolderPaths(sourcePath: string): string[] {
    const allFiles = useEditorStore.getState().files;
    // Direct hit = single file.
    if (allFiles[sourcePath]) return [sourcePath];
    // Otherwise treat sourcePath as a folder prefix.
    const prefix = sourcePath.endsWith("/") ? sourcePath : sourcePath + "/";
    return Object.keys(allFiles).filter((p) => p.startsWith(prefix));
  }

  /**
   * Compute the destination path for `oldPath` when its source root
   * (`sourceRoot` — file path or folder prefix) lands inside `targetFolder`.
   * Preserves relative depth: `chapters/intro.typ` with root `chapters` into
   * `archive/` → `archive/chapters/intro.typ`.
   */
  function computeNewPath(
    oldPath: string,
    sourceRoot: string,
    targetFolder: string,
  ): string {
    if (oldPath === sourceRoot) {
      // Direct file move: just put the filename under target.
      const filename = oldPath.split("/").pop() ?? oldPath;
      return targetFolder ? `${targetFolder}/${filename}` : filename;
    }
    // Folder move: keep the folder name + relative path under target.
    const sourceName = sourceRoot.split("/").pop() ?? sourceRoot;
    const relativePart = oldPath.slice(sourceRoot.length + 1); // strip "sourceRoot/"
    const tail = `${sourceName}/${relativePart}`;
    return targetFolder ? `${targetFolder}/${tail}` : tail;
  }

  /**
   * Move N files atomically (from the user's POV) into `targetFolder`. Each
   * source path may be a file or a folder root; folder roots are expanded to
   * their descendants. Conflicts are batched into one dialog.
   *
   * Partial-failure policy: continue on per-file error, surface a summary
   * toast. We DO NOT roll back successful renames — that would double the
   * failure surface, and "some files moved" is usually less surprising than
   * "everything reverted because of one corner case".
   */
  const handleMultiDrop = async (
    sourcePaths: string[],
    targetFolder: string,
  ): Promise<void> => {
    if (sourcePaths.length === 0) {
      resetDnd();
      return;
    }

    // Reject self-nest: target ∈ any source folder. Walking the prefix is
    // enough — if `target` starts with `chapters/`, drag of `chapters/` is
    // illegal.
    for (const src of sourcePaths) {
      const isFolder = !useEditorStore.getState().files[src];
      if (
        isFolder &&
        (targetFolder === src || targetFolder.startsWith(src + "/"))
      ) {
        toast.error("Không thể di chuyển thư mục vào trong chính nó");
        resetDnd();
        return;
      }
    }

    // Build the full per-file rename plan first so conflict detection and
    // user confirmation happen BEFORE any backend call.
    type Move = { oldPath: string; newPath: string };
    const allMoves: Move[] = [];
    for (const src of sourcePaths) {
      for (const oldPath of expandFolderPaths(src)) {
        const newPath = computeNewPath(oldPath, src, targetFolder);
        if (newPath === oldPath) continue; // drop onto current parent: no-op
        // Defense in depth against malformed path edge cases.
        if (newPath.includes("..")) {
          toast.error(`Đường dẫn không hợp lệ: ${newPath}`);
          resetDnd();
          return;
        }
        allMoves.push({ oldPath, newPath });
      }
    }

    if (allMoves.length === 0) {
      resetDnd();
      return;
    }

    // Bulk confirm for large moves (>5). Below the threshold we skip the
    // dialog to keep the single-file flow snappy.
    if (allMoves.length > 5) {
      const proceed = window.confirm(
        `Di chuyển ${allMoves.length} tệp vào "${targetFolder || "thư mục gốc"}"?`,
      );
      if (!proceed) {
        resetDnd();
        return;
      }
    }

    // Batch conflict detection: collect ALL collisions, present once.
    const storeFiles = useEditorStore.getState().files;
    const conflicts = allMoves.filter((m) => storeFiles[m.newPath]);
    if (conflicts.length > 0) {
      const list = conflicts
        .slice(0, 5)
        .map((c) => c.newPath)
        .join(", ");
      const more = conflicts.length > 5 ? ` (và ${conflicts.length - 5} tệp khác)` : "";
      const proceed = window.confirm(
        `${conflicts.length} tệp đã tồn tại: ${list}${more}.\n\nGhi đè tất cả?`,
      );
      if (!proceed) {
        resetDnd();
        return;
      }
      // Pre-delete to clear the path before rename.
      for (const c of conflicts) {
        try {
          await deleteFile(c.newPath);
        } catch (err) {
          toast.error(
            `Không thể xóa ${c.newPath}: ${err instanceof Error ? err.message : "lỗi"}`,
          );
          resetDnd();
          return;
        }
      }
    }

    // Execute the rename plan sequentially. Sequential matters for two
    // reasons: (1) backend has per-file `(projectId, path)` UNIQUE constraint
    // and parallel renames could race on intermediate states; (2) it gives
    // us deterministic partial-failure semantics.
    let done = 0;
    const failures: { path: string; message: string }[] = [];
    for (const move of allMoves) {
      try {
        await renameFile(move.oldPath, move.newPath);
        done++;
      } catch (err) {
        failures.push({
          path: move.oldPath,
          message: err instanceof Error ? err.message : "lỗi không xác định",
        });
      }
    }

    if (failures.length === 0) {
      // Tailor success message based on operation size.
      if (allMoves.length === 1) {
        const filename = allMoves[0].oldPath.split("/").pop() ?? allMoves[0].oldPath;
        toast.success(`Đã di chuyển ${filename} vào ${targetFolder || "thư mục gốc"}`);
      } else {
        toast.success(`Đã di chuyển ${done} tệp vào ${targetFolder || "thư mục gốc"}`);
      }
    } else {
      toast.error(
        `Đã di chuyển ${done}/${allMoves.length} tệp. ${failures.length} tệp lỗi (vd: ${failures[0].path}: ${failures[0].message}).`,
      );
    }

    resetDnd();
  };

  // Phase 1 single-file signature preserved as a thin shim so existing
  // call sites still work byte-identically.
  const handleDrop = (sourcePath: string, targetFolder: string): Promise<void> =>
    handleMultiDrop(sourcePath ? [sourcePath] : [], targetFolder);

  // ── Touch DnD ────────────────────────────────────────────────────────────
  // Parallel code path to HTML5 native mouse drag — same handleMultiDrop is
  // shared. The hook orchestrates long-press detection, ghost-following
  // position, hit-testing via `data-path`, and edge auto-scroll.
  const touchDrag = useTouchDrag({
    scrollContainerRef,
    onDragStart: (path) => {
      const isFolder = !useEditorStore.getState().files[path];
      const payload = handleRowDragStart(path, isFolder);
      // `handleRowDragStart` already calls `setDraggingPaths(new Set(payload))`
      // so the visual fade-out matches mouse drag.
      // Return value ignored — touch path doesn't use dataTransfer.
      void payload;
    },
    onDragOver: (target) => {
      // Only highlight valid folder targets; data-path matches BOTH files
      // and folders, so check via the store.
      if (!target) {
        setDropTargetPath(null);
        return;
      }
      const isFolder = !useEditorStore.getState().files[target];
      setDropTargetPath(isFolder ? target : null);
    },
    onDrop: (_src, target) => {
      // Drop only fires when there's a valid target (folder). Use the
      // current draggingPaths state because the touch path doesn't carry a
      // payload string like mouse dataTransfer.
      const paths = Array.from(draggingPaths);
      const isFolder = !useEditorStore.getState().files[target];
      if (isFolder && paths.length > 0) {
        void handleMultiDrop(paths, target);
      } else {
        resetDnd();
      }
    },
    onDragEnd: () => {
      // Hook calls onDragEnd whenever a touch sequence ends (success or
      // cancel). resetDnd is idempotent.
      resetDnd();
    },
  });

  // ── Focus tracking ─────────────────────────────────────────────────────
  // Tree-scoped keyboard shortcuts (Ctrl+A, Ctrl+Z, F2, Delete, Enter) only
  // fire when the explorer panel has focus. Otherwise we'd hijack the same
  // shortcuts in CodeMirror (Ctrl+Z undo) or the address bar (Ctrl+L).
  //
  // The approach mirrors VS Code's contextKey "filesExplorerFocus" — we
  // track focus via `mousedown` (pointer hits tree) and `focusin` events at
  // the document level, then check if the target is inside our panel.
  const hasFocusRef = useRef(false);
  useEffect(() => {
    const onDocPointer = (e: Event) => {
      const target = e.target as HTMLElement | null;
      // `closest` walks up from the event target. If any ancestor has our
      // marker attribute, focus is "inside the tree".
      const inside = !!target && !!target.closest?.('[data-file-tree-panel="true"]');
      setHasFocus(inside);
      hasFocusRef.current = inside;
    };
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("focusin", onDocPointer);
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("focusin", onDocPointer);
    };
  }, []);

  // ── Clipboard paste → upload ────────────────────────────────────────────
  // Pattern from VS Code's Explorer + Antigravity/Kiro: Ctrl+V on the file
  // tree creates real files for any file-shaped clipboard items (typically
  // pasted screenshots). Skips when the focus is inside an editable element
  // so paste-into-input/textarea keeps working normally.
  //
  // Ref-backed callback to avoid the stale-closure issue (handleUploadFiles
  // is redefined every render) AND the TDZ trap (handleUploadFiles is
  // declared further down — initializing the ref with it here would crash
  // with "Cannot access 'handleUploadFiles' before initialization"). The
  // ref starts as null and gets assigned below once the function exists.
  const handleUploadFilesRef = useRef<
    ((fl: FileList | File[] | null) => Promise<void>) | null
  >(null);
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!hasFocusRef.current) return;
      if (!handleUploadFilesRef.current) return;
      const active = document.activeElement as HTMLElement | null;
      // Don't hijack paste when the user is in any text-entry surface.
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.isContentEditable)
      ) {
        return;
      }
      const items = e.clipboardData?.items;
      if (!items) return;
      const collected: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.kind !== "file") continue;
        const raw = it.getAsFile();
        if (!raw) continue;
        // Rename pasted images so backend gets a unique, valid path.
        const name = namePastedFile(raw, collected.length);
        collected.push(new File([raw], name, { type: raw.type }));
      }
      if (collected.length === 0) return;
      e.preventDefault();
      void handleUploadFilesRef.current(collected);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  // ── Keyboard shortcuts (Ctrl+A / Ctrl+Z / F2 / Delete / Enter) ─────────
  // Patterns adapted from VS Code's explorer:
  //   - Ctrl+A: select all VISIBLE rows (respects collapsed folders, like
  //     VS Code's "Select All in Explorer").
  //   - Ctrl+Z: pop the undo stack and execute the inverse operation. If
  //     stack is empty, no-op (silent).
  //   - F2: rename the single selected file (no-op if 0 or >1 selected).
  //   - Delete / Backspace: delete selected (confirm if >1).
  //   - Enter: open the focused/selected file.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!hasFocus) return;
      // Never hijack typing in inputs (rename dialog, etc.).
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      // Read-only (admin view): swallow mutating shortcuts (rename / delete /
      // undo). Selection (Ctrl+A) and open (Enter) stay available.
      if (readOnly) {
        const isUndo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z";
        if (e.key === "F2" || e.key === "Delete" || e.key === "Backspace" || isUndo) {
          return;
        }
      }

      const mod = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd+A — select all visible.
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        const visible = flattenVisibleTree(fileTree, expandedFolders);
        setSelectedPaths(new Set(visible));
        if (visible.length > 0) setAnchorPath(visible[0]);
        return;
      }

      // Ctrl/Cmd+Z — undo. Shift+Z is conventionally redo; we don't
      // implement redo here (would need a separate `redoStack`), so silently
      // ignore Shift+Z to avoid confusing the user with a half-feature.
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        void handleUndo();
        return;
      }

      // F2 — rename single selection or active row.
      if (e.key === "F2") {
        e.preventDefault();
        const sel = Array.from(selectedPaths);
        let target: string | null = null;
        if (sel.length === 1) target = sel[0];
        else if (sel.length === 0 && activePath) target = activePath;
        if (!target) {
          toast.info("Chọn một tệp để đổi tên (F2)");
          return;
        }
        const name = target.split("/").pop() ?? target;
        openRenameFile(target, name);
        return;
      }

      // Delete / Backspace — delete selected.
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        const sel = Array.from(selectedPaths);
        if (sel.length === 0 && activePath) {
          // Single-row fallback when nothing's explicitly selected.
          const name = activePath.split("/").pop() ?? activePath;
          openDeleteFile(activePath, name);
          return;
        }
        if (sel.length === 1) {
          const name = sel[0].split("/").pop() ?? sel[0];
          openDeleteFile(sel[0], name);
          return;
        }
        if (sel.length > 1) {
          // Bulk delete: confirm once, then loop.
          if (!window.confirm(`Xóa ${sel.length} tệp đã chọn?`)) return;
          void (async () => {
            let done = 0;
            const failures: string[] = [];
            for (const p of sel) {
              try {
                await deleteFile(p);
                done++;
              } catch (err) {
                failures.push(p);
              }
            }
            if (failures.length === 0) {
              toast.success(`Đã xóa ${done} tệp`);
            } else {
              toast.error(`Đã xóa ${done}/${sel.length}, ${failures.length} lỗi`);
            }
            setSelectedPaths(new Set());
          })();
        }
        return;
      }

      // Enter — open active or single-selected file (folders toggle).
      if (e.key === "Enter") {
        const sel = Array.from(selectedPaths);
        const target = sel.length === 1 ? sel[0] : activePath;
        if (!target) return;
        e.preventDefault();
        const file = useEditorStore.getState().files[target];
        if (file) {
          void setActivePath(target);
        } else {
          // It's a folder — toggle expand.
          handleToggleFolder(target);
        }
        return;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFocus, selectedPaths, activePath, fileTree, expandedFolders, deleteFile, readOnly]);

  // ─── Undo ─────────────────────────────────────────────────────────────
  // Executes the inverse of the top undo-stack action. Pattern mirrors VS
  // Code: each action carries the data needed to reverse it. Failure surfaces
  // as a toast — undo doesn't push another undo, so a failed undo can't snowball.
  const handleUndo = async (): Promise<void> => {
    const action = useEditorStore.getState().popUndo();
    if (!action) {
      // Silent — feels less spammy than a "nothing to undo" toast.
      return;
    }
    // Capture projectId once for the entire reverse operation. Doing it via
    // a store read inside each branch avoids stale-closure issues if the
    // user switches projects mid-undo (rare but possible).
    const pid = useEditorStore.getState().projectId;
    try {
      if (action.type === "rename") {
        // Reverse the rename. Use rawStorage directly (NOT the optimistic
        // `renameFile`) because we don't want this reverse op pushed onto
        // the stack itself.
        if (!pid) throw new Error("No project loaded");
        const file = await rawStorage.renameFile(pid, action.to, action.from);
        useEditorStore.setState((s) => {
          const { [action.to]: _gone, ...restFiles } = s.files;
          const { [action.to]: oldDraft, ...restDrafts } = s.drafts;
          return {
            files: { ...restFiles, [action.from]: { ...file, path: action.from } },
            drafts: oldDraft
              ? { ...restDrafts, [action.from]: { ...oldDraft, path: action.from } }
              : restDrafts,
            openTabs: s.openTabs.map((p) => (p === action.to ? action.from : p)),
            activePath: s.activePath === action.to ? action.from : s.activePath,
            previewPath: s.previewPath === action.to ? action.from : s.previewPath,
          };
        });
        toast.success(`Đã hoàn tác: ${action.from.split("/").pop()}`);
      } else if (action.type === "create") {
        if (!pid) throw new Error("No project loaded");
        await rawStorage.deleteFile(pid, action.path);
        useEditorStore.getState().removeFile(action.path);
        toast.success(`Đã hoàn tác: xóa ${action.path.split("/").pop()}`);
      } else if (action.type === "delete") {
        if (!pid) throw new Error("No project loaded");
        const restored = await rawStorage.createFile(pid, {
          path: action.path,
          kind: action.kind,
          textContent: action.textContent ?? "",
        });
        useEditorStore.getState().upsertFile(restored);
        toast.success(`Đã hoàn tác: khôi phục ${action.path.split("/").pop()}`);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? `Không thể hoàn tác: ${err.message}` : "Không thể hoàn tác",
      );
    }
  };

  // Escape clears both DnD and multi-select state — common UX expectation.
  // HTML5 DnD natively cancels the drag operation on Escape but doesn't
  // reset our React state, leaving rows faded out until next render.
  useEffect(() => {
    const isDnding = draggingPaths.size > 0;
    const hasSelection = selectedPaths.size > 0;
    if (!isDnding && !hasSelection) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (isDnding) resetDnd();
      if (hasSelection) {
        setSelectedPaths(new Set());
        setAnchorPath(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [draggingPaths, selectedPaths]);

  // ── Dialog state ──────────────────────────────────────────────────────────
  type DialogKind = "newFile" | "newFolder" | "rename" | "deleteFile" | "deleteFolder" | null;
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [inputValue, setInputValue] = useState("");
  const [renameTarget, setRenameTarget] = useState<{ path: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ path: string; name: string } | null>(null);
  // For "new file in folder" and "new folder", we remember the parent path
  const [parentFolderPath, setParentFolderPath] = useState<string>("");

  // Note: `fileTree` is derived earlier in this function (right after state
  // declarations) because both the keyboard-shortcut effect's deps array and
  // the Shift+click range selector reference it.

  /* ── Folder toggling ────────────────────────────────────────────────────── */

  const handleToggleFolder = (path: string): void => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handlePreviewFile = async (path: string): Promise<void> => {
    try {
      await ensureDraftLoaded(path);
      setPreviewPath(path);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Không thể tải nội dung xem trước",
      );
    }
  };

  const handleSetMainFile = async (path: string): Promise<void> => {
    try {
      await ensureDraftLoaded(path).catch(() => {});
      await setMainFile(path);
      toast.success("Đã đặt làm tệp chính");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể đặt tệp chính",
      );
    }
  };

  const handleDownloadFile = async (path: string): Promise<void> => {
    const projectId = useEditorStore.getState().projectId;
    if (!projectId) {
      toast.error("Chưa mở project");
      return;
    }
    const basename = path.includes("/") ? path.slice(path.lastIndexOf("/") + 1) : path;
    try {
      const file = await getFileContent(projectId, path);
      // Binary files: blob from bytes. Text files: blob from textContent.
      const mime = file.mimeType ?? "application/octet-stream";
      const blob = file.binaryContent
        ? new Blob([file.binaryContent], { type: mime })
        : new Blob([file.textContent ?? ""], { type: mime });
      downloadFile(blob, basename);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể tải tệp",
      );
    }
  };

  /* ── Open dialogs ────────────────────────────────────────────────────────── */

  const openNewFile = (parentPath = ""): void => {
    setParentFolderPath(parentPath);
    setInputValue("");
    setDialog("newFile");
  };

  const openNewFolder = (): void => {
    setInputValue("");
    setDialog("newFolder");
  };

  const openRenameFile = (path: string, name: string): void => {
    setRenameTarget({ path, name });
    setInputValue(name);
    setDialog("rename");
  };

  const openDeleteFile = (path: string, name: string): void => {
    setDeleteTarget({ path, name });
    setDialog("deleteFile");
  };

  const openDeleteFolder = (folderPath: string, name: string): void => {
    setDeleteTarget({ path: folderPath, name });
    setDialog("deleteFolder");
  };

  const closeDialog = (): void => setDialog(null);

  // Consume a file-tree op requested from the top-bar "Tệp" menu. The store
  // flag (not a CustomEvent) is set AFTER the menu switches the sidebar to the
  // Files mode, so by the time this panel mounts + this effect runs, the flag
  // is still there and we open the matching dialog / file picker. readOnly is
  // already gated at the menu level, but we re-check defensively.
  useEffect(() => {
    if (!pendingFileTreeOp) return;
    const op = consumeFileTreeOp();
    if (readOnly || !op) return;
    if (op === "newFile") openNewFile();
    else if (op === "newFolder") openNewFolder();
    else if (op === "upload") uploadInputRef.current?.click();
    // openNewFile/openNewFolder are recreated each render but the early return
    // above makes re-runs harmless; depend only on the flag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFileTreeOp]);

  /* ── Confirm actions ─────────────────────────────────────────────────────── */

  const handleCreateFile = async (): Promise<void> => {
    const name = inputValue.trim();
    if (!name) { toast.error("Tên tệp không được để trống"); return; }

    const fullPath = parentFolderPath ? `${parentFolderPath}/${name}` : name;
    try {
      await createFile(fullPath, kindFromPath(name), "");
      // Auto-expand parent folder
      if (parentFolderPath) {
        setExpandedFolders((prev) => new Set(prev).add(parentFolderPath));
      }
      toast.success(`Đã tạo tệp ${name}`);
      closeDialog();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tạo tệp");
    }
  };

  const handleCreateFolder = async (): Promise<void> => {
    const folderName = inputValue.trim();
    if (!folderName) { toast.error("Tên thư mục không được để trống"); return; }

    // Folders are virtual — create a .keep placeholder to materialise the folder
    const placeholderPath = `${folderName}/.keep`;
    try {
      await createFile(placeholderPath, "other", "");
      setExpandedFolders((prev) => new Set(prev).add(folderName));
      toast.success(`Đã tạo thư mục ${folderName}`);
      closeDialog();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tạo thư mục");
    }
  };

  const handleRenameFile = async (): Promise<void> => {
    if (!renameTarget || !inputValue.trim()) { toast.error("Tên không được để trống"); return; }
    if (inputValue === renameTarget.name) { closeDialog(); return; }

    const segments = renameTarget.path.split("/");
    segments[segments.length - 1] = inputValue.trim();
    const newPath = segments.join("/");

    try {
      await renameFile(renameTarget.path, newPath);
      toast.success(`Đã đổi tên thành ${inputValue.trim()}`);
      closeDialog();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể đổi tên");
    }
  };

  const handleDeleteFile = async (): Promise<void> => {
    if (!deleteTarget) return;
    try {
      await deleteFile(deleteTarget.path);
      toast.success(`Đã xóa ${deleteTarget.name}`);
      closeDialog();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể xóa tệp");
    }
  };

  const handleDeleteFolder = async (): Promise<void> => {
    if (!deleteTarget) return;
    // Delete all files whose path starts with this folder prefix
    const prefix = deleteTarget.path + "/";
    const toDelete = Object.keys(files).filter((p) => p.startsWith(prefix));
    try {
      await Promise.all(toDelete.map((p) => deleteFile(p)));
      toast.success(`Đã xóa thư mục ${deleteTarget.name}`);
      closeDialog();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể xóa thư mục");
    }
  };

  /* ── Render ──────────────────────────────────────────────────────────────── */

  /**
   * Convert a raw filename into a backend-safe path. Backend's PathValidator
   * only accepts `[a-zA-Z0-9 _.\-/]` — Vietnamese diacritics, CJK, and other
   * Unicode characters get 400 INVALID_CHARS. Strip diacritics, replace
   * disallowed chars with `-`, collapse whitespace and dashes.
   */
  function sanitizeUploadPath(raw: string): string {
    const lastDot = raw.lastIndexOf(".");
    const stem = lastDot > 0 ? raw.slice(0, lastDot) : raw;
    const ext = lastDot > 0 ? raw.slice(lastDot) : "";

    const cleanStem = stem
      .normalize("NFKD")
      // Strip combining diacritical marks (decomposed form: "Đồ" -> "Đo" -> "Do").
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      // Anything outside the safe set becomes a single dash.
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-+|-+$/g, "");

    const cleanExt = ext
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9.]/g, "")
      .toLowerCase();

    const result = (cleanStem || "file") + cleanExt;
    return result;
  }

  /**
   * Build a `pasted-image-<timestamp>.<ext>` name for clipboard images that
   * arrive with empty / generic `.name` (Chrome on Windows hands us `"image.png"`,
   * Edge / Firefox often give empty string). The timestamp prevents collisions
   * when the user pastes several screenshots in a row.
   */
  function namePastedFile(file: File, index: number): string {
    const original = file.name?.trim();
    if (original && original.toLowerCase() !== "image.png") return original;
    const mime = file.type || "image/png";
    const extFromMime = mime.split("/")[1]?.split(";")[0] || "png";
    const stamp = new Date()
      .toISOString()
      .replace(/[-:T.]/g, "")
      .slice(0, 14);
    const suffix = index > 0 ? `-${index + 1}` : "";
    return `pasted-image-${stamp}${suffix}.${extFromMime}`;
  }

  const handleUploadFiles = async (fileList: FileList | File[] | null): Promise<void> => {
    const selectedFiles = Array.from(fileList ?? []);
    if (selectedFiles.length === 0) return;

    // Match backend MAX_UPLOAD_SIZE_BYTES default (10 MB). Backend will still
    // 413 if env override is lower; this is just for fast-fail UX.
    const MAX_BYTES = 10 * 1024 * 1024;
    // Binary kinds need the multipart upload path. Text-shaped kinds (typst,
    // bib, markdown, config, text) keep using the existing JSON endpoint.
    const BINARY_KINDS: ReadonlySet<FileKind> = new Set([
      "image",
      "vector",
      "font",
      "pdf",
    ]);

    const uploadedPaths: string[] = [];
    const errors: string[] = [];

    for (const file of selectedFiles) {
      if (file.size > MAX_BYTES) {
        errors.push(`${file.name}: quá lớn (giới hạn 10MB)`);
        continue;
      }
      // Sanitize once before EITHER upload path so backend PathValidator
      // doesn't reject Vietnamese / CJK filenames with 400.
      const safePath = sanitizeUploadPath(file.name);
      const detectedKind = kindFromPath(safePath);
      try {
        if (BINARY_KINDS.has(detectedKind)) {
          await uploadBinaryFile(safePath, file, detectedKind);
        } else {
          const content = await file.text();
          await createFile(safePath, detectedKind, content);
        }
        uploadedPaths.push(safePath);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Tải lên thất bại";
        errors.push(`${file.name}: ${msg}`);
      }
    }

    if (uploadedPaths.length > 0) {
      await setActivePath(uploadedPaths[0]);
      toast.success(`Đã tải lên ${uploadedPaths.length} tệp`);
    }
    for (const e of errors) toast.error(e);

    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }
  };

  // Wire the freshly-defined `handleUploadFiles` into the ref the paste
  // effect captured at mount. Runs every render so closures inside the
  // function (e.g. on `setActivePath`) stay current.
  handleUploadFilesRef.current = handleUploadFiles;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-slate-500">Đang tải...</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Toolbar ── */}
      <div
        data-file-tree-panel="true"
        className="px-2 py-1.5 border-b border-slate-200 flex items-center gap-0.5 bg-white shrink-0"
      >
        {readOnly ? (
          <span className="px-1.5 text-xs font-medium text-slate-400">Chế độ chỉ xem</span>
        ) : (
          <>
            <button
              onClick={() => openNewFile()}
              title="Tạo tệp mới"
              className="p-1.5 text-slate-500 hover:text-[#007bff] hover:bg-blue-50 rounded transition-colors focus:outline-none"
            >
              <FilePlus className="w-4 h-4" />
            </button>
            <button
              onClick={openNewFolder}
              title="Tạo thư mục mới"
              className="p-1.5 text-slate-500 hover:text-[#007bff] hover:bg-blue-50 rounded transition-colors focus:outline-none"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
            <button
              onClick={() => uploadInputRef.current?.click()}
              title="Tải tệp lên"
              className="p-1.5 text-slate-500 hover:text-[#007bff] hover:bg-blue-50 rounded transition-colors focus:outline-none"
            >
              <Upload className="w-4 h-4" />
            </button>
            <input
              ref={uploadInputRef}
              type="file"
              multiple
              accept=".typ,.bib,.txt,.md,.json,.csv,.yaml,.yml,.toml,.xml,.svg,.png,.jpg,.jpeg,.gif,.webp,.bmp,.tiff,.ico,.ttf,.otf,.woff,.woff2,.pdf"
              className="hidden"
              onChange={(event) => void handleUploadFiles(event.currentTarget.files)}
            />
          </>
        )}
        <div className="flex-1" />
        <button
          className="p-1.5 text-slate-400 hover:text-slate-700 rounded focus:outline-none"
          title="Tùy chọn"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* ── File tree ── */}
      {fileTree.length === 0 ? (
        <div
          data-file-tree-panel="true"
          className="flex-1 flex flex-col items-center justify-center p-4"
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(e) => {
            if (e.dataTransfer.files.length === 0) return;
            e.preventDefault();
            void handleUploadFiles(e.dataTransfer.files);
          }}
        >
          <p className="text-sm text-slate-500">Không có tệp nào</p>
          <p className="text-xs text-slate-400 mt-1">Kéo thả tệp vào đây hoặc dán ảnh (Ctrl+V)</p>
          <Button onClick={() => openNewFile()} size="sm" className="mt-4">
            <FilePlus className="w-4 h-4 mr-2" />
            Tạo tệp mới
          </Button>
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          data-file-tree-panel="true"
          className={`flex-1 overflow-y-auto py-1 ${
            draggingPaths.size > 0 && dropTargetPath === ""
              ? "bg-blue-50/50 ring-2 ring-inset ring-[#007bff]/30"
              : ""
          }`}
          onDragOver={(e) => {
            // External drag (Files from OS / browser download): we must
            // preventDefault to opt into the drop. Show a generic highlight.
            const hasExternalFiles = e.dataTransfer.types.includes("Files");
            if (hasExternalFiles) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
              if (dropTargetPath !== "") setDropTargetPath("");
              return;
            }
            // Internal drag (move): only highlight root when no folder row
            // already claimed the pointer.
            if (draggingPaths.size === 0) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (dropTargetPath !== "") setDropTargetPath("");
          }}
          onDragLeave={(e) => {
            // Only clear if the drag actually left the container — not when
            // moving between children.
            if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
            setDropTargetPath(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            // External file drop (OS file manager, browser download tray):
            // upload them via the same path as the toolbar "+" button.
            if (e.dataTransfer.files.length > 0) {
              setDropTargetPath(null);
              void handleUploadFiles(e.dataTransfer.files);
              return;
            }
            // Internal move: payload is a JSON array of paths.
            let paths: string[] = [];
            try {
              const raw = e.dataTransfer.getData("text/paths");
              if (raw) paths = JSON.parse(raw);
            } catch {
              /* fall through */
            }
            if (paths.length === 0) {
              const single =
                e.dataTransfer.getData("text/path") ||
                e.dataTransfer.getData("text/plain");
              if (single) paths = [single];
            }
            // Only treat as root drop if no folder row picked it up first.
            if (dropTargetPath === "" || dropTargetPath === null) {
              void handleMultiDrop(paths, "");
            }
          }}
        >
          {fileTree.map((node) => (
            <FileTreeItem
              key={node.path}
              node={node}
              level={0}
              activePath={activePath}
              previewPath={previewPath}
              mainPath={mainPath}
              expandedFolders={expandedFolders}
              onToggleFolder={handleToggleFolder}
              onSelectFile={(p) => void setActivePath(p)}
              onPreviewFile={(p) => void handlePreviewFile(p)}
              onSetMainFile={(p) => void handleSetMainFile(p)}
              onRenameFile={openRenameFile}
              onDeleteFile={openDeleteFile}
              onDownloadFile={(p) => void handleDownloadFile(p)}
              onNewFileInFolder={(folderPath) => openNewFile(folderPath)}
              onDeleteFolder={openDeleteFolder}
              draggingPaths={draggingPaths}
              dropTargetPath={dropTargetPath}
              selectedPaths={selectedPaths}
              onRowDragStart={handleRowDragStart}
              onDragEndFile={resetDnd}
              onFolderDragOver={setDropTargetPath}
              onFolderDragLeave={() => setDropTargetPath(null)}
              onFolderDrop={(paths, target) => void handleMultiDrop(paths, target)}
              onRowClick={handleRowClick}
              getTouchRowProps={touchDrag.rowProps}
            />
          ))}
        </div>
      )}

      {/* ── New File dialog ── */}
      <Dialog open={dialog === "newFile"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo tệp mới</DialogTitle>
            <DialogDescription>
              {parentFolderPath
                ? `Tạo tệp trong thư mục "${parentFolderPath}"`
                : "Nhập tên tệp (ví dụ: chapter1.typ)"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <Label htmlFor="new-file-name">Tên tệp</Label>
            {parentFolderPath && (
              <span className="text-xs text-slate-500 font-mono">{parentFolderPath}/</span>
            )}
            <Input
              id="new-file-name"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="main.typ"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") void handleCreateFile(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Hủy</Button>
            <Button onClick={() => void handleCreateFile()}>Tạo tệp</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New Folder dialog ── */}
      <Dialog open={dialog === "newFolder"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo thư mục mới</DialogTitle>
            <DialogDescription>Nhập tên thư mục</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <Label htmlFor="new-folder-name">Tên thư mục</Label>
            <Input
              id="new-folder-name"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="chapters"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") void handleCreateFolder(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Hủy</Button>
            <Button onClick={() => void handleCreateFolder()}>Tạo thư mục</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Rename dialog ── */}
      <Dialog open={dialog === "rename"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi tên tệp</DialogTitle>
            <DialogDescription>Nhập tên mới cho tệp</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <Label htmlFor="rename-value">Tên mới</Label>
            <Input
              id="rename-value"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") void handleRenameFile(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Hủy</Button>
            <Button onClick={() => void handleRenameFile()}>Đổi tên</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete File dialog ── */}
      <Dialog open={dialog === "deleteFile"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa tệp</DialogTitle>
            <DialogDescription>
              Xóa tệp <strong>{deleteTarget?.name}</strong>? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Hủy</Button>
            <Button variant="destructive" onClick={() => void handleDeleteFile()}>Xóa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Folder dialog ── */}
      <Dialog open={dialog === "deleteFolder"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa thư mục</DialogTitle>
            <DialogDescription>
              Xóa thư mục <strong>{deleteTarget?.name}</strong> và tất cả các tệp bên trong?
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Hủy</Button>
            <Button variant="destructive" onClick={() => void handleDeleteFolder()}>Xóa thư mục</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Touch-drag ghost — only shown during an active touch drag. Positioned
          fixed at the pointer so the user sees what they're dragging. Mouse
          drag has the browser's built-in drag image, so no ghost needed there. */}
      {touchDrag.isDragging && touchDrag.pointer && touchDrag.sourcePath ? (
        <div
          className="pointer-events-none fixed z-50 rounded-md border border-[#007bff] bg-white px-3 py-1.5 text-sm font-medium text-[#007bff] shadow-lg"
          style={{
            left: touchDrag.pointer.x + 12,
            top: touchDrag.pointer.y + 12,
            opacity: 0.9,
          }}
        >
          {draggingPaths.size > 1
            ? `${draggingPaths.size} tệp`
            : (touchDrag.sourcePath.split("/").pop() ?? touchDrag.sourcePath)}
        </div>
      ) : null}
    </>
  );
}
