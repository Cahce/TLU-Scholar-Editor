/**
 * useZoteroCollections Hook
 * 
 * Fetches Zotero collections for the connected account.
 */

import { useCallback } from "react";
import * as zoteroApi from "../api/zotero";
import { useAsyncData } from "./useAsyncData";

export function useZoteroCollections(enabled: boolean) {
  const fetcher = useCallback(() => {
    if (!enabled) {
      return Promise.resolve({ collections: [] });
    }
    return zoteroApi.listCollections();
  }, [enabled]);

  const { data, loading, error, refetch } = useAsyncData(fetcher);

  return {
    collections: data?.collections ?? [],
    loading,
    error,
    refetch,
  };
}
