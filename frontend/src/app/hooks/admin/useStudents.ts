import { useCallback } from "react";
import { listStudents } from "../../api/admin/students";
import { useAsyncData } from "../useAsyncData";
import type { ListStudentsQuery } from "../../types/admin";

export function useStudents(query?: ListStudentsQuery) {
  return useAsyncData(
    useCallback(() => listStudents(query), [
      query?.search,
      query?.classId,
      query?.majorId,
      query?.facultyId,
      query?.hasAccount,
      query?.page,
      query?.pageSize,
    ])
  );
}
