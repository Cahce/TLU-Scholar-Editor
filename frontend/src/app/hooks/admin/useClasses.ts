import { useCallback } from "react";
import { listClasses } from "../../api/admin/classes";
import { useAsyncData } from "../useAsyncData";
import type { ListClassesQuery } from "../../types/admin";

export function useClasses(query?: ListClassesQuery) {
  return useAsyncData(
    useCallback(() => listClasses(query), [
      query?.search,
      query?.majorId,
      query?.facultyId,
      query?.page,
      query?.pageSize,
    ])
  );
}
