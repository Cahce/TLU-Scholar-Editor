import { useCallback } from "react";
import { listTeachers } from "../../api/admin/teachers";
import { useAsyncData } from "../useAsyncData";
import type { ListTeachersQuery } from "../../types/admin";

export function useTeachers(query?: ListTeachersQuery) {
  return useAsyncData(
    useCallback(() => listTeachers(query), [
      query?.search,
      query?.departmentId,
      query?.facultyId,
      query?.hasAccount,
      query?.page,
      query?.pageSize,
    ])
  );
}
