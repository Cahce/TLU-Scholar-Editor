import { useCallback } from "react";
import { listAdminProjects } from "../../api/admin/projects";
import { useAsyncData } from "../useAsyncData";
import type { ListAdminProjectsQuery } from "../../types/adminProjects";

export function useAdminProjects(query: ListAdminProjectsQuery) {
  return useAsyncData(
    useCallback(() => listAdminProjects(query), [
      query.ownerRole,
      query.category,
      query.search,
      query.facultyId,
      query.majorId,
      query.classId,
      query.departmentId,
      query.createdFrom,
      query.createdTo,
      query.updatedFrom,
      query.updatedTo,
      query.sort,
      query.order,
      query.page,
      query.pageSize,
    ]),
  );
}
