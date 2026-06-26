/**
 * useBibFileMutations
 *
 * Path-targeted BibTeX mutations for the consolidated "Tài liệu tham khảo"
 * panel. Unlike `BibliographyService` (which edits the *active* CodeMirror
 * view), these operate on a specific `.bib` file by string, so the panel can
 * add / edit / delete / de-duplicate entries in the selected reference file
 * even when that file is not the one open in the editor.
 *
 * Each mutation:
 *   1. Reads the file's current content from the store (draft → file cache).
 *   2. Computes the new source with the pure helpers in `BibDuplicateService`.
 *   3. Writes it back via `setContent` (marks the draft dirty; if the file is
 *      also open in the editor, CodeMirror's controlled `value` re-syncs — the
 *      same mechanism `reloadFileFromServer` relies on).
 *   4. Persists immediately with `saveDraftNow`. `useAutosave` is mounted only
 *      for the ACTIVE path (see `EditorPane`), so a non-active reference file
 *      would otherwise stay dirty and never save.
 *
 * BibTeX (`.bib`) only — structured Hayagriva YAML editing is not supported
 * (this matches the behaviour of the former `BibEditorHint`).
 */

import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useEditorStore } from "../state/editorStore";
import {
  applyChangesToSource,
  buildDuplicateResolutionChanges,
  parseBibEntriesWithRanges,
  type BibDuplicateGroup,
  type DuplicateResolutionAction,
} from "../services/BibDuplicateService";

export interface BibFileMutations {
  /** Append a freshly-built entry to the end of the file. */
  appendEntry: (entrySource: string) => Promise<boolean>;
  /** Replace the entry at `index` (document order) with new source. */
  replaceEntryAtIndex: (index: number, entrySource: string) => Promise<boolean>;
  /** Remove every entry whose `index` is in the list. */
  removeEntriesByIndex: (indexes: number[]) => Promise<boolean>;
  /** Apply a duplicate-group resolution (keep first/last, merge, rename, …). */
  applyDuplicateResolution: (
    group: BibDuplicateGroup,
    action: DuplicateResolutionAction,
    options?: { selectedKeys?: string[] },
  ) => Promise<boolean>;
}

function readContent(path: string): string {
  const s = useEditorStore.getState();
  return s.drafts[path]?.content ?? s.files[path]?.textContent ?? "";
}

/**
 * Apply `next` to the file at `path` and persist it. Ensures a draft exists
 * first (so `setContent` is not a no-op). Returns false (and toasts) when the
 * server save fails — the local draft is preserved either way.
 */
async function writeContent(path: string, next: string): Promise<boolean> {
  const store = useEditorStore.getState();
  if (!store.drafts[path]) {
    await store.ensureDraftLoaded(path).catch(() => {});
  }
  const s2 = useEditorStore.getState();
  if (!s2.drafts[path]) return false;
  s2.setContent(path, next);
  try {
    await s2.saveDraftNow(path);
    return true;
  } catch {
    // `saveDraftNow` already records the draft error state; surface a toast so
    // the user knows the change is not yet on the server (draft is kept).
    toast.error("Không lưu được thay đổi lên máy chủ. Bản nháp đã được giữ lại.");
    return false;
  }
}

/** Preserve the trailing blank line(s) an entry had after replacing it. */
function trailingBreak(source: string): string {
  if (source.endsWith("\n\n")) return "\n\n";
  if (source.endsWith("\n")) return "\n";
  return "";
}

export function useBibFileMutations(path: string | null): BibFileMutations {
  const appendEntry = useCallback(
    async (entrySource: string) => {
      if (!path) return false;
      const trimmed = entrySource.trim();
      if (!trimmed) return false;
      const current = readContent(path);
      let prefix = "";
      if (current.length > 0) {
        if (current.endsWith("\n\n")) prefix = "";
        else if (current.endsWith("\n")) prefix = "\n";
        else prefix = "\n\n";
      }
      return writeContent(path, `${current}${prefix}${trimmed}\n`);
    },
    [path],
  );

  const replaceEntryAtIndex = useCallback(
    async (index: number, entrySource: string) => {
      if (!path) return false;
      const current = readContent(path);
      const entry = parseBibEntriesWithRanges(current).entries.find(
        (e) => e.index === index,
      );
      if (!entry) return false;
      const next = applyChangesToSource(current, [
        {
          from: entry.range.from,
          to: entry.range.to,
          insert: `${entrySource.trim()}${trailingBreak(entry.source)}`,
        },
      ]);
      return writeContent(path, next);
    },
    [path],
  );

  const removeEntriesByIndex = useCallback(
    async (indexes: number[]) => {
      if (!path || indexes.length === 0) return false;
      const current = readContent(path);
      const indexSet = new Set(indexes);
      const entries = parseBibEntriesWithRanges(current).entries.filter((e) =>
        indexSet.has(e.index),
      );
      if (entries.length === 0) return false;
      const next = applyChangesToSource(
        current,
        entries.map((e) => ({ from: e.range.from, to: e.range.to, insert: "" })),
      );
      return writeContent(path, next);
    },
    [path],
  );

  const applyDuplicateResolution = useCallback(
    async (
      group: BibDuplicateGroup,
      action: DuplicateResolutionAction,
      options: { selectedKeys?: string[] } = {},
    ) => {
      if (!path) return false;
      const current = readContent(path);
      const changes = buildDuplicateResolutionChanges(
        current,
        group,
        action,
        options,
      );
      if (changes.length === 0) return false;
      return writeContent(path, applyChangesToSource(current, changes));
    },
    [path],
  );

  return useMemo(
    () => ({
      appendEntry,
      replaceEntryAtIndex,
      removeEntriesByIndex,
      applyDuplicateResolution,
    }),
    [appendEntry, replaceEntryAtIndex, removeEntriesByIndex, applyDuplicateResolution],
  );
}
