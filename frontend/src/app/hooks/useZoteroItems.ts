/**
 * useZoteroItems Hook
 * 
 * Fetches Zotero items with pagination support.
 */

import { useCallback, useState } from "react";
import * as zoteroApi from "../api/zotero";
import { useAsyncData } from "./useAsyncData";

export function useZoteroItems(collectionKey: string | null) {
  const [start, setStart] = useState(0);
  const limit = 50;

  const fetcher = useCallback(() => {
    if (!collectionKey) {
      return Promise.resolve({ items: [], total: 0 });
    }
    return zoteroApi.listItems({ collectionKey, start, limit });
  }, [collectionKey, start]);

  const { data, loading, error, refetch } = useAsyncData(fetcher);

  const setPage = useCallback((page: number) => {
    setStart(page * limit);
  }, []);

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    loading,
    error,
    page: Math.floor(start / limit),
    setPage,
    refetch,
  };
}
