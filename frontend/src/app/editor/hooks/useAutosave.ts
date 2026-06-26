import { useEffect, useRef } from "react";
import { EditorView } from "@codemirror/view";
import { completionStatus } from "@codemirror/autocomplete";
import { useEditorStore } from "../state/editorStore";
import { stashDraftToIDB } from "../state/persistence";
import { getFormatOnSave } from "../state/previewSettings";
import { format as typstyleFormat } from "../services/TypstyleService";

const DEBOUNCE_MS = 1500;

export function useAutosave(path: string | null): void {
  const draft = useEditorStore((s) => (path ? s.drafts[path] : null));
  const projectId = useEditorStore((s) => s.projectId);
  const readOnly = useEditorStore((s) => s.readOnly);
  const saveDraftNow = useEditorStore((s) => s.saveDraftNow);
  const setContent = useEditorStore((s) => s.setContent);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    // Read-only (admin view): never persist, even if a draft somehow goes dirty.
    if (readOnly) return;
    if (!path || !projectId || !draft || !draft.dirty) return;

    // Stash draft to IDB immediately so a refresh doesn't lose content
    void stashDraftToIDB(projectId, path, draft.content);

    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      try {
        // Optional format-on-save (typstyle). Only triggers for .typ files;
        // a format failure does NOT block the save — we still persist the
        // user's unformatted source so they never lose work.
        if (getFormatOnSave() && path.endsWith(".typ")) {
          try {
            const view = useEditorStore.getState().editorViewRef.current;
            // Defer formatting while the autocomplete popup is open. If we
            // reformat now, applying the change replaces the doc and the
            // popup's saved (from, to) ranges become stale — the user sees
            // their selection vanish and the cursor jump. Pick this up on
            // the next autosave tick instead.
            const popupActive = view ? completionStatus(view.state) !== null : false;
            const current = useEditorStore.getState().drafts[path]?.content;
            if (!popupActive && current != null) {
              const formatted = await typstyleFormat(current);
              if (formatted !== current) {
                applyFormattedContent(path, current, formatted, setContent);
              }
            }
          } catch (err) {
            // Surface to the console only; don't toast on every save and
            // don't block persistence.
            console.warn("[useAutosave] format-on-save failed:", err);
          }
        }
        await saveDraftNow(path);
      } catch {
        // saveDraftNow already updates the draft error state
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [path, projectId, readOnly, draft?.content, draft?.dirty, saveDraftNow, setContent]);
}

/**
 * Push a format-on-save result into the active editor without resetting the
 * user's cursor. Going through `setContent` flips the React `value` prop on
 * the CodeMirror wrapper, which then dispatches a `from:0,to:N` full-doc
 * replace — that change set collapses the selection to position 0 and
 * scrolls to the top of the file. Instead we:
 *   1. Snapshot the cursor's (line, column).
 *   2. Dispatch the format change directly through the view so CodeMirror's
 *      change machinery owns the doc update.
 *   3. Restore the cursor to the equivalent (line, column) in the formatted
 *      text and ask the view to keep it on screen.
 * The wrapper's own updateListener then propagates the new content back to
 * the store through the normal onChange path, so by the time React commits
 * the re-render `value === doc.toString()` and the value-sync effect is a
 * no-op.
 *
 * Falls back to `setContent` if the view isn't available or its doc no
 * longer matches `expected` (e.g. the user switched files mid-format). The
 * cursor jump in that edge case is preferable to silently dropping the
 * format result.
 */
function applyFormattedContent(
  path: string,
  expected: string,
  formatted: string,
  setContent: (path: string, content: string) => void,
): void {
  const view = useEditorStore.getState().editorViewRef.current;
  if (!view || view.state.doc.toString() !== expected) {
    setContent(path, formatted);
    return;
  }

  const head = view.state.selection.main.head;
  const cursorLine = view.state.doc.lineAt(head);
  const lineNumber = cursorLine.number;
  const column = head - cursorLine.from;

  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: formatted },
  });

  const newDoc = view.state.doc;
  const targetLine = Math.min(Math.max(lineNumber, 1), newDoc.lines);
  const newLine = newDoc.line(targetLine);
  const newPos = Math.min(newLine.from + column, newLine.to);

  view.dispatch({
    selection: { anchor: newPos },
    effects: EditorView.scrollIntoView(newPos, { y: "nearest" }),
  });
}
