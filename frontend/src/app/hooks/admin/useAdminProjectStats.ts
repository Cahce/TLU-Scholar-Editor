import { useCallback } from "react";
import { getAdminProjectStats } from "../../api/admin/projects";
import { useAsyncData } from "../useAsyncData";
import type { ProjectOwnerRole } from "../../types/adminProjects";

export function useAdminProjectStats(ownerRole?: ProjectOwnerRole) {
  return useAsyncData(
    useCallback(() => getAdminProjectStats(ownerRole), [ownerRole]),
  );
}
