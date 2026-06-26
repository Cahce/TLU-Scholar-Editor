import { apiClient } from "../client";
import type {
  AdminProjectDetail,
  AdminProjectListResponse,
  AdminProjectStats,
  ListAdminProjectsQuery,
  ProjectOwnerRole,
} from "../../types/adminProjects";

/** List all projects (admin oversight) with filters + pagination. */
export async function listAdminProjects(
  query: ListAdminProjectsQuery,
): Promise<AdminProjectListResponse> {
  return apiClient.get<never, AdminProjectListResponse>("/admin/projects", {
    params: query,
  });
}

/** Aggregate project stats; optional ownerRole scopes the totals. */
export async function getAdminProjectStats(
  ownerRole?: ProjectOwnerRole,
): Promise<AdminProjectStats> {
  return apiClient.get<never, AdminProjectStats>("/admin/projects/stats", {
    params: ownerRole ? { ownerRole } : {},
  });
}

/** Project detail (owner context + file summary). */
export async function getAdminProject(id: string): Promise<AdminProjectDetail> {
  return apiClient.get<never, AdminProjectDetail>(`/admin/projects/${id}`);
}

/**
 * Download the project source as a .zip Blob.
 *
 * Uses `apiClient.request` with `responseType: 'blob'`; the response
 * interceptor unwraps to `response.data`, which is the Blob.
 */
export async function exportAdminProject(id: string): Promise<Blob> {
  const blob = await apiClient.request<Blob>({
    method: "GET",
    url: `/admin/projects/${id}/export`,
    responseType: "blob",
  });
  return blob as unknown as Blob;
}

/**
 * Download the compiled PDF Blob.
 *
 * Backend compiles on demand if no cached artifact exists (Overleaf-style),
 * so this can take several seconds — use a longer timeout than the default
 * 15s. The artifact is then persisted server-side for instant later downloads.
 */
export async function downloadAdminProjectPdf(id: string): Promise<Blob> {
  const blob = await apiClient.request<Blob>({
    method: "GET",
    url: `/admin/projects/${id}/artifact`,
    responseType: "blob",
    timeout: 90000,
  });
  return blob as unknown as Blob;
}
