import { create } from "zustand";
import type { EditorView } from "@codemirror/view";
import type {
  ProjectFile,
  ProjectSummary,
  ProjectSettings,
  EditorFileDraft,
} from "../types/editor";
import type { EditorDiagnostic } from "../types/diagnostics";
import type { EditorMode } from "../types/visual";
import { getProject } from "../../api/projects";
import { getProjectSettings, updateProjectSettings } from "../../api/projectSettings";
import { listFiles } from "../../api/projectFiles";
import {
  clearDraftInIDB,
  hydrateDraftsFromIDB,
  loadTabStateFromIDB,
  saveTabStateToIDB,
} from "./persistence";
import {
  clearStoredMode,
  getStoredMode,
  setStoredMode,
} from "./editorModeStorage";
import { ApiEditorStorageService } from "../services/ApiEditorStorageService";

const storage = new ApiEditorStorageService();
const DEFAULT_EDITOR_FONT_SIZE = 16;
const MAX_UNDO = 30;

// Binary file kinds — these are served as raw byte streams by the backend and
// don't have a text draft. Routing them through `ensureDraftLoaded` would set
// up an empty CodeMirror draft and pollute the autosave/IDB layer.
const BINARY_KINDS = new Set<ProjectFile["kind"]>([
  "image",
  "vector",
  "font",
  "pdf",
]);
function isBinaryKind(k: ProjectFile["kind"] | undefined): boolean {
  return !!k && BINARY_KINDS.has(k);
}

/**
 * Reversible file-tree action. Each member captures enough state to invert
 * the operation through standard `useFileMutations` calls.
 *
 *   - rename: re-rename `to → from` to undo a move/rename.
 *   - delete: re-create the file with its prior text content / kind. Note
 *     that binary file deletes are NOT pushed onto the stack — we don't
 *     hold the bytes after delete, and re-uploading is the user's
 *     responsibility (Phase 2 limitation, matching VS Code which also
 *     doesn't restore deleted binaries via Ctrl+Z).
 *   - create: delete the file.
 */
export type FileUndoAction =
  | { type: "rename"; from: string; to: string }
  | {
      type: "delete";
      path: string;
      kind: ProjectFile["kind"];
      textContent: string | null;
    }
  | { type: "create"; path: string };

// Debounce tab state writes so quick switching doesn't hammer IDB.
let persistTabsTimer: number | null = null;
function schedulePersistTabs(getState: () => EditorState): void {
  if (typeof window === "undefined") return;
  if (persistTabsTimer !== null) window.clearTimeout(persistTabsTimer);
  persistTabsTimer = window.setTimeout(() => {
    persistTabsTimer = null;
    const s = getState();
    if (!s.projectId) return;
    void saveTabStateToIDB(s.projectId, {
      openTabs: s.openTabs,
      activePath: s.activePath,
    });
  }, 500);
}

function getInitialEditorFontSize(): number {
  if (typeof window === "undefined") {
    return DEFAULT_EDITOR_FONT_SIZE;
  }

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem("tlu-editor-font-size");
  } catch {
    return DEFAULT_EDITOR_FONT_SIZE;
  }

  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_EDITOR_FONT_SIZE;

  if (!Number.isFinite(parsed)) {
    return DEFAULT_EDITOR_FONT_SIZE;
  }

  return Math.min(Math.max(parsed, 12), 24);
}

// Whether the metadata panel under a binary preview starts visible. Persisted
// as "1"/"0"; anything other than the explicit "0" opt-out defaults to shown.
function getInitialBinaryInfoVisible(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem("tlu-binary-info-visible") !== "0";
  } catch {
    return true;
  }
}

export interface CompileJobView {
  jobId: string;
  status: "queued" | "running" | "success" | "failed";
  startedAt: string;
  diagnostics: EditorDiagnostic[];
  artifactReady: boolean;
}

interface EditorState {
  projectId: string | null;
  project: ProjectSummary | null;
  settings: ProjectSettings | null;
  files: Record<string, ProjectFile>;
  drafts: Record<string, EditorFileDraft>;
  activePath: string | null;
  previewPath: string | null;
  diagnostics: EditorDiagnostic[];
  compileJob: CompileJobView | null;
  loading: boolean;
  bootstrapError: string | null;
  /**
   * Read-only mode (admin "view in workspace"). When true, all mutation paths
   * (autosave, file create/rename/delete/upload, CodeMirror editing) are
   * disabled so an admin can inspect a project without altering it.
   */
  readOnly: boolean;
  editorFontSize: number;
  /**
   * Whether the metadata/info panel under a binary preview (PDF / image / SVG /
   * font) is shown. Toggled from the editor toolbar; persisted to localStorage
   * so the choice survives reloads. Default `true`.
   */
  binaryInfoVisible: boolean;
  editorViewRef: { current: EditorView | null };
  /**
   * Editor line currently considered "active" for outline scroll-spy.
   * Updated by EditorPane on viewport scroll / cursor change (debounced).
   * `null` when no file is open or auto-highlight is disabled.
   */
  activeOutlineLine: number | null;
  /** Paths of files currently open as tabs, in display order. */
  openTabs: string[];
  /**
   * Undo stack for file-tree operations (rename / delete / create).
   * Capped at MAX_UNDO entries; older actions are dropped. Pattern adapted
   * from VS Code's `IFileService` undo support — each entry stores enough
   * data to invert the operation. Persistence (across reloads) is
   * intentionally NOT supported: undo only applies to the current session.
   */
  undoStack: FileUndoAction[];
  /**
   * Per-file editor mode (Code vs Visual). Hydrated from localStorage on
   * first access; mutated via `setEditorMode`/`toggleEditorMode`. Files not
   * present here default to 'code'.
   */
  visualModeByPath: Record<string, EditorMode>;
  /**
   * Pending file-tree operation requested from OUTSIDE the FileTreePanel
   * (e.g. the top-bar "Tệp" menu: Tệp mới / Thư mục mới / Tải tệp lên).
   * FileTreePanel consumes it via an effect. We use a store flag instead of a
   * CustomEvent so the request survives the panel not being mounted yet when
   * the menu first switches the sidebar to the Files mode (avoids a race where
   * the event fires before the listener is attached).
   */
  pendingFileTreeOp: "newFile" | "newFolder" | "upload" | null;

  bootstrap: (projectId: string, readOnly?: boolean) => Promise<void>;
  setActivePath: (path: string) => Promise<void>;
  setPreviewPath: (path: string) => void;
  /**
   * Persist `path` as the project's main file (`ProjectSettings.mainPath`) and
   * point the live preview at it. Throws on API failure with the prior settings
   * left unchanged, so the caller can surface an error toast.
   */
  setMainFile: (path: string) => Promise<void>;
  ensureDraftLoaded: (path: string) => Promise<void>;
  /**
   * Lazy-load raw bytes for a binary file (image/font/pdf). No-op if bytes
   * are already cached. Used by `useTypstPreview` before compile to make
   * `#image("logo.png")` resolvable on the first post-reload compile.
   * Returns the populated ProjectFile, or null if not found / not binary.
   */
  ensureBinaryLoaded: (path: string) => Promise<ProjectFile | null>;
  /**
   * Re-fetch the project's file list and merge into the store. Defensive
   * sync used after mutations to guarantee the file tree reflects backend
   * state, even if a `upsertFile`/`removeFile` somehow missed a subscriber.
   * Cheap (single GET, < 50ms) and idempotent.
   */
  refreshFileList: () => Promise<void>;

  /**
   * Force-fetch a file's full content from the server and apply it to the
   * store, overwriting any cached version. Used after external mutations
   * (OpenAlex / Zotero "Save to .bib") to make sure:
   *   - The `files[path]` cache holds the new text — so `useTypstPreview`
   *     picks it up in the next compile cycle.
   *   - The `drafts[path]` (if loaded) is reset to the server state with
   *     `dirty: false` — so the CodeMirror view (controlled by
   *     `draft.content`) re-renders with the fresh text immediately.
   *
   * Drops on the floor for binary files (binary refresh is handled
   * separately by `ensureBinaryLoaded`).
   */
  reloadFileFromServer: (path: string) => Promise<void>;
  /** Push an undoable action onto the stack (drops oldest at MAX_UNDO cap). */
  pushUndo: (action: FileUndoAction) => void;
  /** Pop and return the most recent undo action without executing it. */
  popUndo: () => FileUndoAction | null;
  /** Clear the entire undo stack (used on project switch). */
  clearUndo: () => void;
  saveDraftNow: (path: string) => Promise<ProjectFile>;
  flushDirtyDrafts: () => Promise<void>;
  setContent: (path: string, content: string) => void;
  markSaving: (path: string) => void;
  markSaved: (path: string, savedAt: string) => void;
  markSaveError: (path: string, message: string) => void;
  upsertFile: (file: ProjectFile) => void;
  removeFile: (path: string) => void;
  setDiagnostics: (next: EditorDiagnostic[]) => void;
  setCompileJob: (job: CompileJobView | null) => void;
  setEditorFontSize: (fontSize: number) => void;
  /** Show/hide the binary-file metadata panel and persist the choice. */
  toggleBinaryInfo: () => void;
  setEditorView: (view: EditorView | null) => void;
  setActiveOutlineLine: (line: number | null) => void;
  /** Add a path to openTabs if not present. Does NOT change activePath. */
  openTab: (path: string) => void;
  /** Remove a tab; if it was active, focus the neighbour to the right (fallback left). */
  closeTab: (path: string) => Promise<void>;
  /** Close every tab except `keepPath`. */
  closeOtherTabs: (keepPath: string) => Promise<void>;
  /** Close all tabs strictly right of `pivotPath`. */
  closeTabsToRight: (pivotPath: string) => Promise<void>;
  /** Close every tab. */
  closeAllTabs: () => Promise<void>;
  /**
   * Set the editor mode for a specific file. Persists to localStorage so the
   * choice survives reloads. No-op (forces 'code') for non-typst files.
   */
  setEditorMode: (path: string, mode: EditorMode) => void;
  /** Flip the editor mode for `path`. Forces 'code' for non-typst files. */
  toggleEditorMode: (path: string) => void;
  /** Clear the persisted mode for `path` and reset state to 'code'. */
  resetEditorMode: (path: string) => void;
  /** Request a file-tree op from outside FileTreePanel (top-bar Tệp menu). */
  requestFileTreeOp: (op: "newFile" | "newFolder" | "upload") => void;
  /** Read + clear the pending file-tree op. Returns null when none pending. */
  consumeFileTreeOp: () => "newFile" | "newFolder" | "upload" | null;
}

function canUseVisualMode(kind: ProjectFile["kind"] | undefined): boolean {
  return kind === "typst";
}

export const useEditorStore = create<EditorState>((set, get) => ({
  projectId: null,
  project: null,
  settings: null,
  files: {},
  drafts: {},
  activePath: null,
  previewPath: null,
  diagnostics: [],
  compileJob: null,
  loading: true,
  bootstrapError: null,
  readOnly: false,
  editorFontSize: getInitialEditorFontSize(),
  binaryInfoVisible: getInitialBinaryInfoVisible(),
  editorViewRef: { current: null },
  activeOutlineLine: null,
  openTabs: [],
  undoStack: [],
  visualModeByPath: {},
  pendingFileTreeOp: null,

  // Real bootstrap implementation
  bootstrap: async (projectId, readOnly = false) => {
    set({
      loading: true,
      bootstrapError: null,
      projectId,
      readOnly,
      undoStack: [],
      visualModeByPath: {},
    });
    try {
      const [project, settingsResponse, fileListResponse] = await Promise.all([
        getProject(projectId),
        getProjectSettings(projectId),
        listFiles(projectId),
      ]);

      const files = Object.fromEntries(
        fileListResponse.files.map((f) => [f.path, f]),
      );
      const idbDrafts = await hydrateDraftsFromIDB(projectId);
      const savedTabState = await loadTabStateFromIDB(projectId);

      // Determine the effective main path:
      // 1. Use settings.mainPath if the file exists in the project
      // 2. Fall back to the first .typ file found
      // 3. Fall back to null (no preview)
      const configuredMain = settingsResponse.settings.mainPath;
      const effectiveMainPath =
        (configuredMain && files[configuredMain])
          ? configuredMain
          : Object.keys(files).find((p) => p.endsWith(".typ")) ?? null;

      // Restore tab list from IDB (filtering out files that no longer exist),
      // or seed with just the main file. The focused tab on open is the
      // project's main file — matching typst.app and the live preview target —
      // and we only fall back to the last IDB selection when no main file
      // exists. This keeps "open project" predictable: it always lands on the
      // document root rather than whichever fragment was last clicked.
      const restoredOpenTabs = savedTabState?.openTabs.filter((p) => files[p]) ?? [];
      const initialActive =
        effectiveMainPath ??
        (savedTabState?.activePath && files[savedTabState.activePath]
          ? savedTabState.activePath
          : null);
      const openTabs =
        restoredOpenTabs.length > 0
          ? restoredOpenTabs
          : effectiveMainPath
            ? [effectiveMainPath]
            : [];
      if (initialActive && !openTabs.includes(initialActive)) openTabs.unshift(initialActive);

      const visualModeByPath: Record<string, EditorMode> = {};
      for (const tab of openTabs) {
        if (canUseVisualMode(files[tab]?.kind)) {
          visualModeByPath[tab] = getStoredMode(projectId, tab);
        }
      }

      // Effective read-only: the URL `?view=1` seed OR a backend access level
      // that lacks edit capability (e.g. admin oversight on a project they do
      // not own). This makes read-only authoritative regardless of how the
      // workspace was reached — not just when `?view=1` is present. The backend
      // still rejects any write with 403; this only drives the UI. Unknown
      // capability defaults to read-only (least privilege).
      const effectiveReadOnly = readOnly || !(project.access?.canEdit ?? false);

      set({
        project,
        settings: settingsResponse.settings,
        files,
        drafts: idbDrafts,
        activePath: initialActive,
        previewPath: effectiveMainPath,
        openTabs,
        loading: false,
        readOnly: effectiveReadOnly,
        visualModeByPath,
      });

      // Pre-load the main file content immediately after bootstrap so the
      // preview can start compiling without waiting for user interaction.
      // Skip if an IDB draft is already available (loaded from persistence).
      if (effectiveMainPath && !idbDrafts[effectiveMainPath]) {
        void get().ensureDraftLoaded(effectiveMainPath).catch((err) => {
          console.warn("[Editor] Failed to pre-load main file:", err);
        });
      }

      // Also pre-load .bib files so the first preview compile after a page
      // reload (F5) sees their full text — otherwise the typst worker raises
      // "the document does not contain a bibliography" because the file
      // metadata is in the store but `textContent` is null until the user
      // opens that tab. Bibliography files are typically tiny (< 50 KB) and
      // always read by `#bibliography(...)`; eager-loading them avoids the
      // need for users to "click around" before the preview becomes valid.
      const bibPaths = Object.keys(files).filter((p) =>
        p.toLowerCase().endsWith(".bib"),
      );
      for (const bibPath of bibPaths) {
        if (idbDrafts[bibPath]) continue;
        void get().ensureDraftLoaded(bibPath).catch((err) => {
          console.warn("[Editor] Failed to pre-load bib file:", bibPath, err);
        });
      }
    } catch (err) {
      set({
        loading: false,
        bootstrapError:
          err instanceof Error ? err.message : "Bootstrap failed",
      });
    }
  },

  setActivePath: async (path) => {
    // Ensure the path is part of the tab list — this is the "click a file in
    // the tree → open it as a tab" entry point. If already open, focus only.
    const { openTabs, files, projectId, visualModeByPath } = get();
    if (!openTabs.includes(path)) {
      set({ openTabs: [...openTabs, path], activePath: path });
    } else {
      set({ activePath: path });
    }
    if (
      projectId &&
      canUseVisualMode(files[path]?.kind) &&
      visualModeByPath[path] == null
    ) {
      set({
        visualModeByPath: {
          ...get().visualModeByPath,
          [path]: getStoredMode(projectId, path),
        },
      });
    }
    schedulePersistTabs(get);
    // Binary files (image / svg / pdf / font) are loaded as raw bytes — they
    // never get a CodeMirror draft, so `useAutosave` correctly no-ops for them.
    if (isBinaryKind(files[path]?.kind)) {
      await get().ensureBinaryLoaded(path).catch(() => {});
    } else {
      await get().ensureDraftLoaded(path);
    }
  },

  setPreviewPath: (path) => set({ previewPath: path }),

  setMainFile: async (path) => {
    const { projectId, settings } = get();
    if (!projectId || settings?.mainPath === path) return;
    const response = await updateProjectSettings(projectId, { mainPath: path });
    set({ settings: response.settings, previewPath: response.settings.mainPath });
  },

  ensureBinaryLoaded: async (path) => {
    const { projectId, files } = get();
    const current = files[path];
    if (!current) return null;
    // Already cached — skip the round-trip.
    if (current.binaryContent) return current;
    if (!projectId) return null;
    // For binary files the storage service's `getFile` returns a ProjectFile
    // with `binaryContent` populated (see api/projectFiles.ts getFileContent
    // dual-mode). Falls back to text path silently for non-binary files.
    const fresh = await storage.getFile(projectId, path);
    set({ files: { ...get().files, [path]: fresh } });
    return fresh;
  },

  pushUndo: (action) => {
    set((s) => {
      const next = [...s.undoStack, action];
      // Trim from the head (oldest) when over cap. We push to the tail so
      // pop = LIFO. Splicing here is O(1) for the typical bound (30).
      while (next.length > MAX_UNDO) next.shift();
      return { undoStack: next };
    });
  },

  popUndo: () => {
    const stack = get().undoStack;
    if (stack.length === 0) return null;
    const top = stack[stack.length - 1];
    set({ undoStack: stack.slice(0, -1) });
    return top;
  },

  clearUndo: () => set({ undoStack: [] }),

  refreshFileList: async () => {
    const { projectId, files: localFiles } = get();
    if (!projectId) return;
    try {
      const res = await listFiles(projectId);
      const next: Record<string, ProjectFile> = {};
      for (const f of res.files) {
        // Preserve any already-fetched binary bytes so the next compile
        // doesn't have to re-download images.
        const existing = localFiles[f.path];
        next[f.path] = existing?.binaryContent
          ? { ...f, binaryContent: existing.binaryContent }
          : f;
      }
      set({ files: next });
    } catch (err) {
      // Non-fatal: callers use this as a safety net, the optimistic
      // upsertFile already populated the tree. Logging is enough.
      console.warn("[editorStore] refreshFileList failed:", err);
    }
  },

  reloadFileFromServer: async (path) => {
    const { projectId } = get();
    if (!projectId) return;
    let fresh: ProjectFile;
    try {
      fresh = await storage.getFile(projectId, path);
    } catch (err) {
      console.warn("[editorStore] reloadFileFromServer failed:", path, err);
      return;
    }
    // We mutate both maps in a single `set` so subscribers (CodeMirror
    // controlled `value`, `useTypstPreview` deps) see a consistent snapshot.
    set((state) => {
      const existingDraft = state.drafts[path];
      const nextDrafts = existingDraft
        ? {
            ...state.drafts,
            [path]: {
              ...existingDraft,
              content: fresh.textContent ?? "",
              dirty: false,
              saving: false,
              lastSavedAt: fresh.lastEditedAt,
              saveError: null,
            },
          }
        : state.drafts;
      return {
        files: {
          ...state.files,
          [path]: state.files[path]?.binaryContent
            ? { ...fresh, binaryContent: state.files[path].binaryContent }
            : fresh,
        },
        drafts: nextDrafts,
      };
    });
  },

  ensureDraftLoaded: async (path) => {
    const { projectId, files, drafts } = get();

    if (drafts[path]) {
      return;
    }

    if (files[path]?.textContent != null) {
      set({
        drafts: {
          ...drafts,
          [path]: {
            path,
            content: files[path].textContent ?? "",
            dirty: false,
            saving: false,
            lastSavedAt: files[path].lastEditedAt,
            saveError: null,
          },
        },
      });
      return;
    }

    if (!projectId) {
      throw new Error("No project loaded");
    }

    const file = await storage.getFile(projectId, path);
    set({
      files: { ...get().files, [path]: file },
      drafts: {
        ...get().drafts,
        [path]: {
          path,
          content: file.textContent ?? "",
          dirty: false,
          saving: false,
          lastSavedAt: file.lastEditedAt,
          saveError: null,
        },
      },
    });
  },

  saveDraftNow: async (path) => {
    const { projectId, drafts } = get();
    const draft = drafts[path];

    if (!projectId) {
      throw new Error("No project loaded");
    }

    if (!draft) {
      throw new Error(`Draft ${path} is not loaded`);
    }

    const contentToSave = draft.content;
    get().markSaving(path);

    try {
      const file = await storage.saveFile(projectId, path, contentToSave);
      const currentDraft = get().drafts[path];
      const hasNewerUnsavedContent =
        currentDraft != null && currentDraft.content !== contentToSave;

      set((state) => ({
        files: {
          ...state.files,
          [path]: {
            ...file,
            textContent: contentToSave,
          },
        },
        drafts: currentDraft
          ? {
              ...state.drafts,
              [path]: {
                ...currentDraft,
                saving: false,
                dirty: hasNewerUnsavedContent,
                lastSavedAt: file.lastEditedAt ?? new Date().toISOString(),
                saveError: null,
              },
            }
          : state.drafts,
      }));

      if (!hasNewerUnsavedContent) {
        await clearDraftInIDB(projectId, path);
      }

      return {
        ...file,
        textContent: contentToSave,
      };
    } catch (err) {
      get().markSaveError(
        path,
        err instanceof Error ? err.message : "Save failed",
      );
      throw err;
    }
  },

  flushDirtyDrafts: async () => {
    let attempt = 0;

    while (attempt < 3) {
      const dirtyPaths = Object.entries(get().drafts)
        .filter(([, draft]) => draft.dirty)
        .map(([path]) => path);

      if (dirtyPaths.length === 0) {
        return;
      }

      const results = await Promise.allSettled(
        dirtyPaths.map((path) => get().saveDraftNow(path)),
      );

      const failedPaths = results
        .map((result, index) =>
          result.status === "rejected" ? dirtyPaths[index] : null,
        )
        .filter((path): path is string => path != null);

      if (failedPaths.length > 0) {
        throw new Error(
          `Failed to save ${failedPaths.length} file(s): ${failedPaths.join(", ")}`,
        );
      }

      attempt += 1;
    }

    throw new Error("Some files kept changing while exporting. Please try again.");
  },

  setContent: (path, content) => {
    const draft = get().drafts[path];
    if (!draft) return;
    set({
      drafts: {
        ...get().drafts,
        [path]: { ...draft, content, dirty: true, saveError: null },
      },
    });
  },

  markSaving: (path) => {
    const d = get().drafts[path];
    if (!d) return;
    set({ drafts: { ...get().drafts, [path]: { ...d, saving: true } } });
  },

  markSaved: (path, savedAt) => {
    const d = get().drafts[path];
    if (!d) return;
    set({
      drafts: {
        ...get().drafts,
        [path]: {
          ...d,
          saving: false,
          dirty: false,
          lastSavedAt: savedAt,
          saveError: null,
        },
      },
      files: get().files[path]
        ? {
            ...get().files,
            [path]: {
              ...get().files[path],
              textContent: d.content,
              lastEditedAt: savedAt,
            },
          }
        : get().files,
    });
  },

  markSaveError: (path, message) => {
    const d = get().drafts[path];
    if (!d) return;
    set({
      drafts: { ...get().drafts, [path]: { ...d, saving: false, saveError: message } },
    });
  },

  upsertFile: (file) =>
    set((s) => ({ files: { ...s.files, [file.path]: file } })),

  removeFile: (path) => {
    set((s) => {
      const { [path]: _, ...rest } = s.files;
      const { [path]: __, ...restDrafts } = s.drafts;
      const { [path]: ___, ...restVisualModes } = s.visualModeByPath;
      const openTabs = s.openTabs.filter((p) => p !== path);
      let activePath = s.activePath;
      if (activePath === path) {
        // Find a sensible neighbour: prefer the next tab in display order,
        // else the last tab, else null.
        const removedIdx = s.openTabs.indexOf(path);
        activePath = openTabs[Math.min(removedIdx, openTabs.length - 1)] ?? null;
      }
      return {
        files: rest,
        drafts: restDrafts,
        openTabs,
        activePath,
        previewPath: s.previewPath === path ? null : s.previewPath,
        visualModeByPath: restVisualModes,
      };
    });
    schedulePersistTabs(get);
  },

  setDiagnostics: (next) => set({ diagnostics: next }),

  setCompileJob: (job) => set({ compileJob: job }),

  setEditorFontSize: (fontSize) => {
    const safeFontSize = Number.isFinite(fontSize)
      ? fontSize
      : DEFAULT_EDITOR_FONT_SIZE;
    const next = Math.min(Math.max(Math.round(safeFontSize), 12), 24);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("tlu-editor-font-size", String(next));
      } catch {
        // Ignore private-mode or storage permission failures.
      }
    }
    set({ editorFontSize: next });
  },

  toggleBinaryInfo: () => {
    const next = !get().binaryInfoVisible;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          "tlu-binary-info-visible",
          next ? "1" : "0",
        );
      } catch {
        // Ignore private-mode or storage permission failures.
      }
    }
    set({ binaryInfoVisible: next });
  },

  setEditorView: (view) => {
    get().editorViewRef.current = view;
  },

  setActiveOutlineLine: (line) => {
    // Cheap guard against redundant state churn — the EditorPane viewport
    // listener fires often and we don't want every keystroke to re-render
    // every store subscriber.
    if (get().activeOutlineLine !== line) set({ activeOutlineLine: line });
  },

  openTab: (path) => {
    const { openTabs } = get();
    if (openTabs.includes(path)) return;
    set({ openTabs: [...openTabs, path] });
    schedulePersistTabs(get);
  },

  closeTab: async (path) => {
    const { openTabs, activePath } = get();
    const idx = openTabs.indexOf(path);
    if (idx === -1) return;
    const newTabs = openTabs.filter((p) => p !== path);
    let newActive = activePath;
    if (activePath === path) {
      // Pick the neighbour to the right; fall back to the left; null if none.
      newActive = newTabs[Math.min(idx, newTabs.length - 1)] ?? null;
    }
    set({ openTabs: newTabs, activePath: newActive });
    if (newActive && newActive !== activePath) {
      const kind = get().files[newActive]?.kind;
      if (isBinaryKind(kind)) {
        await get().ensureBinaryLoaded(newActive).catch(() => {});
      } else {
        await get().ensureDraftLoaded(newActive).catch(() => {});
      }
    }
    schedulePersistTabs(get);
  },

  closeOtherTabs: async (keepPath) => {
    const { openTabs } = get();
    if (!openTabs.includes(keepPath)) return;
    set({ openTabs: [keepPath], activePath: keepPath });
    const kind = get().files[keepPath]?.kind;
    if (isBinaryKind(kind)) {
      await get().ensureBinaryLoaded(keepPath).catch(() => {});
    } else {
      await get().ensureDraftLoaded(keepPath).catch(() => {});
    }
    schedulePersistTabs(get);
  },

  closeTabsToRight: async (pivotPath) => {
    const { openTabs, activePath } = get();
    const idx = openTabs.indexOf(pivotPath);
    if (idx === -1) return;
    const newTabs = openTabs.slice(0, idx + 1);
    let newActive = activePath;
    if (activePath && !newTabs.includes(activePath)) {
      newActive = pivotPath;
    }
    set({ openTabs: newTabs, activePath: newActive });
    if (newActive && newActive !== activePath) {
      const kind = get().files[newActive]?.kind;
      if (isBinaryKind(kind)) {
        await get().ensureBinaryLoaded(newActive).catch(() => {});
      } else {
        await get().ensureDraftLoaded(newActive).catch(() => {});
      }
    }
    schedulePersistTabs(get);
  },

  closeAllTabs: async () => {
    set({ openTabs: [], activePath: null });
    schedulePersistTabs(get);
  },

  setEditorMode: (path, mode) => {
    const { projectId, files } = get();
    if (!projectId) return;
    const effective: EditorMode = canUseVisualMode(files[path]?.kind)
      ? mode
      : "code";
    setStoredMode(projectId, path, effective);
    set({
      visualModeByPath: {
        ...get().visualModeByPath,
        [path]: effective,
      },
    });
  },

  toggleEditorMode: (path) => {
    const current = get().visualModeByPath[path] ?? "code";
    get().setEditorMode(path, current === "code" ? "visual" : "code");
  },

  resetEditorMode: (path) => {
    const { projectId } = get();
    if (projectId) clearStoredMode(projectId, path);
    set({
      visualModeByPath: {
        ...get().visualModeByPath,
        [path]: "code",
      },
    });
  },

  requestFileTreeOp: (op) => set({ pendingFileTreeOp: op }),

  consumeFileTreeOp: () => {
    const op = get().pendingFileTreeOp;
    if (op !== null) set({ pendingFileTreeOp: null });
    return op;
  },
}));
