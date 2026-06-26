/**
 * useOpenAlexSearch Hook
 * 
 * Manages OpenAlex search with debouncing.
 */

import { useCallback, useState, useEffect } from "react";
import * as openalexApi from "../api/openalex";
import { useAsyncData } from "./useAsyncData";
import type { OpenAlexSearchQuery } from "../types/bibliography";

/**
 * Simple debounce hook
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useOpenAlexSearch() {
  const [query, setQuery] = useState<OpenAlexSearchQuery>({
    search: "",
    perPage: 25,
    page: 1,
  });

  const debouncedQuery = useDebounce(query, 400);

  const fetcher = useCallback(() => {
    if (!debouncedQuery.search.trim()) {
      return Promise.resolve({
        works: [],
        meta: { count: 0, page: 1, perPage: 25 },
      });
    }
    return openalexApi.search(debouncedQuery);
  }, [debouncedQuery]);

  const { data, loading, error, refetch } = useAsyncData(fetcher);

  return {
    works: data?.works ?? [],
    meta: data?.meta,
    loading,
    error,
    query,
    setQuery,
    refetch,
  };
}
