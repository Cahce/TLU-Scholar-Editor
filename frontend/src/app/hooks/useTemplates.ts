import { useCallback } from "react";
import { listTemplates } from "../api/templates";
import type { ListTemplatesQuery } from "../types/templates";
import { useAsyncData } from "./useAsyncData";

export function useTemplates(query?: ListTemplatesQuery) {
  return useAsyncData(
    useCallback(
      () => listTemplates(query),
      [
        query?.search,
        query?.category,
        query?.isOfficial,
        query?.isActive,
        query?.page,
        query?.pageSize,
      ],
    ),
  );
}
