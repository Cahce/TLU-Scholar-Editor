import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useEditorStore } from "../state/editorStore";
import { EDITOR_COMMANDS, MENU_LAYOUT } from "./registry";
import type { EditorCommand, EditorCommandCtx, MenuLayout } from "./types";

/**
 * Imperative handlers the registry needs but that live in ProjectWorkspace
 * (URL state, export hooks, modal toggles, sidebar mode).
 */
export interface EditorCommandHandlers {
  templateId: string | null;
  navigate: (to: string) => void;
  exportPdf: () => void;
  exportZip: () => void;
  openWordCount: () => void;
  openShortcuts: () => void;
  openPublish: () => void;
  popupPdf: () => void;
  setSidebarMode: (mode: string) => void;
  openIssues: () => void;
  openAbout: () => void;
}

export interface UseEditorCommandsResult {
  commands: Record<string, EditorCommand>;
  layout: MenuLayout;
  ctx: EditorCommandCtx;
  /** Run a command by id, surfacing thrown/rejected errors as a toast. */
  run: (id: string) => void;
}

export function useEditorCommands(
  handlers: EditorCommandHandlers,
): UseEditorCommandsResult {
  const readOnly = useEditorStore((s) => s.readOnly);
  const projectId = useEditorStore((s) => s.projectId);
  const activePath = useEditorStore((s) => s.activePath);
  const activeDirty = useEditorStore((s) =>
    s.activePath ? s.drafts[s.activePath]?.dirty ?? false : false,
  );
  const activeSaving = useEditorStore((s) =>
    s.activePath ? s.drafts[s.activePath]?.saving ?? false : false,
  );
  const anyDirty = useEditorStore((s) =>
    Object.values(s.drafts).some((d) => d.dirty),
  );

  const {
    templateId,
    navigate,
    exportPdf,
    exportZip,
    openWordCount,
    openShortcuts,
    openPublish,
    popupPdf,
    setSidebarMode,
    openIssues,
    openAbout,
  } = handlers;

  const ctx = useMemo<EditorCommandCtx>(
    () => ({
      readOnly,
      templateId,
      projectId,
      activePath,
      activeDirty,
      activeSaving,
      anyDirty,
      isTypstActive: activePath?.endsWith(".typ") ?? false,
      // Snapshot of the live CodeMirror view (mutated imperatively in
      // EditorPane). `run` re-reads the live ref so actions stay correct even
      // if this enable-state flag is momentarily stale.
      hasEditorView:
        useEditorStore.getState().editorViewRef.current != null,
      navigate,
      exportPdf,
      exportZip,
      openWordCount,
      openShortcuts,
      openPublish,
      popupPdf,
      setSidebarMode,
      openIssues,
      openAbout,
    }),
    [
      readOnly,
      templateId,
      projectId,
      activePath,
      activeDirty,
      activeSaving,
      anyDirty,
      navigate,
      exportPdf,
      exportZip,
      openWordCount,
      openShortcuts,
      openPublish,
      popupPdf,
      setSidebarMode,
      openIssues,
      openAbout,
    ],
  );

  const run = useCallback(
    (id: string) => {
      const cmd = EDITOR_COMMANDS[id];
      if (!cmd) return;
      try {
        const result = cmd.run(ctx);
        if (result instanceof Promise) {
          result.catch((err) =>
            toast.error(
              err instanceof Error ? err.message : "Thao tác thất bại",
            ),
          );
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Thao tác thất bại");
      }
    },
    [ctx],
  );

  return { commands: EDITOR_COMMANDS, layout: MENU_LAYOUT, ctx, run };
}
