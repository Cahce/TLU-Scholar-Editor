import { useCallback } from "react";
import { listMajors } from "../../api/admin/majors";
import { useAsyncData } from "../useAsyncData";
import type { ListMajorsQuery } from "../../types/admin";

export function useMajors(query?: ListMajorsQuery) {
  return useAsyncData(
    useCallback(() => listMajors(query), [
      query?.search,
      query?.facultyId,
      query?.page,
      query?.pageSize,
    ])
  );
}
