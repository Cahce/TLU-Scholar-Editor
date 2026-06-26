import { useCallback } from "react";
import { useEditorStore } from "../state/editorStore";
import { ApiEditorStorageService } from "../services/ApiEditorStorageService";
import type { CreateFileInput } from "../services/EditorStorageService";
import type { FileKind, ProjectFile } from "../types/editor";

const storage = new ApiEditorStorageService();

export interface FileMutations {
  createFile: (path: string, kind: FileKind, textContent?: string) => Promise<void>;
  uploadBinaryFile: (path: string, file: Blob | File, kind?: FileKind) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Atomic store mutation for "rename" (which doubles as "move" since the
 * backend doesn't distinguish). Returns the inverse operation needed to
 * undo this (or `null` if nothing changed).
 */
function applyRenameInStore(oldPath: string, newPath: string, fileFromServer?: ProjectFile): void {
  useEditorStore.setState((s) => {
    const existing = s.files[oldPath];
    if (!existing) return s;
    const { [oldPath]: _o, ...restFiles } = s.files;
    const { [oldPath]: oldDraft, ...restDrafts } = s.drafts;
    // If the server returned an updated file (post-backend), prefer its
    // metadata (sha256, updatedAt, etc.). Pre-backend, we synthesise a
    // ProjectFile with the new path so the optimistic UI reflects it.
    const renamed: ProjectFile = fileFromServer
      ? { ...existing, ...fileFromServer, path: newPath }
      : { ...existing, path: newPath, updatedAt: new Date().toISOString() };
    return {
      files: { ...restFiles, [newPath]: renamed },
      drafts: oldDraft
        ? { ...restDrafts, [newPath]: { ...oldDraft, path: newPath } }
        : restDrafts,
      openTabs: s.openTabs.map((p) => (p === oldPath ? newPath : p)),
      activePath: s.activePath === oldPath ? newPath : s.activePath,
      previewPath: s.previewPath === oldPath ? newPath : s.previewPath,
    };
  });
}

/** Thrown by every mutation when the workspace is in read-only mode. */
const READ_ONLY_ERROR = "Chế độ chỉ xem: không thể chỉnh sửa dự án";

export function useFileMutations(): FileMutations {
  const projectId = useEditorStore((s) => s.projectId);
  const readOnly = useEditorStore((s) => s.readOnly);
  const upsertFile = useEditorStore((s) => s.upsertFile);
  const removeFile = useEditorStore((s) => s.removeFile);
  const refreshFileList = useEditorStore((s) => s.refreshFileList);
  const pushUndo = useEditorStore((s) => s.pushUndo);

  const uploadBinaryFile = useCallback(
    async (path: string, file: Blob | File, kind?: FileKind): Promise<void> => {
      if (readOnly) throw new Error(READ_ONLY_ERROR);
      if (!projectId) throw new Error("No project loaded");
      const created = await storage.uploadBinaryFile(projectId, path, file, kind);
      const bytes = new Uint8Array(await file.arrayBuffer());
      upsertFile({ ...created, binaryContent: bytes });
      pushUndo({ type: "create", path: created.path });
      void refreshFileList();
    },
    [projectId, readOnly, upsertFile, refreshFileList, pushUndo],
  );

  const createFile = useCallback(
    async (path: string, kind: FileKind, textContent?: string): Promise<void> => {
      if (readOnly) throw new Error(READ_ONLY_ERROR);
      if (!projectId) throw new Error("No project loaded");

      const input: CreateFileInput = { path, kind, textContent };
      const file = await storage.createFile(projectId, input);
      upsertFile(file);
      pushUndo({ type: "create", path: file.path });
      void refreshFileList();
    },
    [projectId, readOnly, upsertFile, refreshFileList, pushUndo],
  );

  /**
   * Optimistic rename / move. The UI updates BEFORE the backend confirms,
   * which is what eliminates the "drag → wait → flicker" sequence the user
   * sees with the naïve await-then-update flow. Pattern adapted from VS
   * Code's explorer (and most modern file managers — Finder, Nautilus,
   * Kiro): show the move immediately, reconcile on success, rollback on
   * failure with a toast.
   *
   * Implementation steps:
   *   1. Snapshot the pre-rename state needed to rollback.
   *   2. Apply the rename in the store synchronously → UI repaints with
   *      the file at its new location.
   *   3. Call the backend. On success, merge any server-returned metadata
   *      (lastEditedAt, sha256, ...) into the optimistic row.
   *   4. On failure, restore the snapshot and re-throw so the caller can
   *      show an error toast.
   */
  const renameFile = useCallback(
    async (oldPath: string, newPath: string): Promise<void> => {
      if (readOnly) throw new Error(READ_ONLY_ERROR);
      if (!projectId) throw new Error("No project loaded");

      // 1. Snapshot.
      const snapshot = {
        files: useEditorStore.getState().files,
        drafts: useEditorStore.getState().drafts,
        openTabs: useEditorStore.getState().openTabs,
        activePath: useEditorStore.getState().activePath,
        previewPath: useEditorStore.getState().previewPath,
      };

      // 2. Optimistic update.
      applyRenameInStore(oldPath, newPath);

      try {
        // 3. Backend.
        const file = await storage.renameFile(projectId, oldPath, newPath);
        // Reconcile: merge server fields into the optimistic row without
        // disturbing tabs / activePath etc.
        useEditorStore.setState((s) => {
          const current = s.files[newPath];
          if (!current) return s;
          return {
            files: { ...s.files, [newPath]: { ...current, ...file } },
          };
        });
        pushUndo({ type: "rename", from: oldPath, to: newPath });
      } catch (err) {
        // 4. Rollback.
        useEditorStore.setState(snapshot);
        throw err;
      }
    },
    [projectId, readOnly, pushUndo],
  );

  const deleteFile = useCallback(
    async (path: string): Promise<void> => {
      if (readOnly) throw new Error(READ_ONLY_ERROR);
      if (!projectId) throw new Error("No project loaded");

      // Capture metadata for potential Ctrl+Z restore. Skipped for binary
      // files — we don't keep the bytes around long enough to recreate them.
      const file = useEditorStore.getState().files[path];
      const snapshot =
        file && file.binaryContent == null
          ? {
              type: "delete" as const,
              path,
              kind: file.kind,
              textContent: file.textContent,
            }
          : null;

      await storage.deleteFile(projectId, path);
      removeFile(path);
      if (snapshot) pushUndo(snapshot);
    },
    [projectId, readOnly, removeFile, pushUndo],
  );

  return {
    createFile,
    uploadBinaryFile,
    renameFile,
    deleteFile,
    isLoading: false,
    error: null,
  };
}
