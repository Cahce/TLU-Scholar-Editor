import { useCallback } from "react";
import { listDepartments } from "../../api/admin/departments";
import { useAsyncData } from "../useAsyncData";
import type { ListDepartmentsQuery } from "../../types/admin";

export function useDepartments(query?: ListDepartmentsQuery) {
  return useAsyncData(
    useCallback(() => listDepartments(query), [
      query?.search,
      query?.facultyId,
      query?.page,
      query?.pageSize,
    ])
  );
}
