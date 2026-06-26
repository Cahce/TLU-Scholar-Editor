/**
 * useInsertCitation Hook
 * 
 * Provides a function to insert citations into the editor.
 */

import { useCallback } from "react";
import { useEditorStore } from "../state/editorStore";
import { BibliographyService } from "../services/BibliographyService";
import type {
  BibDuplicateGroup,
  DuplicateResolutionAction,
} from "../services/BibDuplicateService";

let bibliographyService: BibliographyService | null = null;

function getBibliographyService(): BibliographyService {
  if (!bibliographyService) {
    const store = useEditorStore.getState();
    bibliographyService = new BibliographyService(
      () => store.editorViewRef.current
    );
  }
  return bibliographyService;
}

export function useInsertCitation() {
  return useCallback((key: string) => {
    const service = getBibliographyService();
    return service.insertCitation(key);
  }, []);
}

/**
 * Set the citation style of the `#bibliography(...)` call in the active editor.
 * Returns "ok" | "no-call" | "no-view" so the caller can show a precise toast.
 */
export function useSetBibliographyStyle() {
  return useCallback((style: string) => {
    const service = getBibliographyService();
    return service.setBibliographyStyle(style);
  }, []);
}

/**
 * Append a freshly-built BibTeX entry to the end of the currently active
 * bibliography file. These hooks act on the active CodeMirror view; the sidebar
 * "Tài liệu tham khảo" panel manages a *selected* (not necessarily active) file
 * via the path-targeted `useBibFileMutations` instead.
 */
export function useAppendBibEntry() {
  return useCallback((entrySource: string) => {
    const service = getBibliographyService();
    return service.appendEntry(entrySource);
  }, []);
}

export function useReplaceBibEntry() {
  return useCallback((key: string, entrySource: string) => {
    const service = getBibliographyService();
    return service.replaceEntry(key, entrySource);
  }, []);
}

export function useReplaceBibEntryAtIndex() {
  return useCallback((index: number, entrySource: string) => {
    const service = getBibliographyService();
    return service.replaceEntryAtIndex(index, entrySource);
  }, []);
}

export function useRemoveBibEntries() {
  return useCallback((keys: string[]) => {
    const service = getBibliographyService();
    return service.removeEntries(keys);
  }, []);
}

export function useRemoveBibEntriesByIndex() {
  return useCallback((indexes: number[]) => {
    const service = getBibliographyService();
    return service.removeEntriesByIndex(indexes);
  }, []);
}

export function useApplyDuplicateResolution() {
  return useCallback(
    (
      group: BibDuplicateGroup,
      action: DuplicateResolutionAction,
      options?: { selectedKeys?: string[] }
    ) => {
      const service = getBibliographyService();
      return service.applyDuplicateResolution(group, action, options);
    },
    []
  );
}
