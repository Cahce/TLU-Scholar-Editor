import { useCallback } from "react";
import { listFaculties } from "../../api/admin/faculties";
import { useAsyncData } from "../useAsyncData";
import type { ListFacultiesQuery } from "../../types/admin";

export function useFaculties(query?: ListFacultiesQuery) {
  return useAsyncData(
    useCallback(() => listFaculties(query), [
      query?.search,
      query?.page,
      query?.pageSize,
    ])
  );
}
