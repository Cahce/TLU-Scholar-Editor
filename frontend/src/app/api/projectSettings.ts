import { apiClient } from "./client";
import type {
  ProjectSettingsResponse,
  UpdateProjectSettingsRequest,
} from "../types/api";

/**
 * Get project settings
 * Returns settings with mainPath, compileOptions, zoteroConfig
 */
export async function getProjectSettings(
  projectId: string,
): Promise<ProjectSettingsResponse> {
  return apiClient.get<never, ProjectSettingsResponse>(
    `/projects/${projectId}/settings`,
  );
}

/**
 * Update project settings
 * Partial update - only provided fields are updated
 */
export async function updateProjectSettings(
  projectId: string,
  data: UpdateProjectSettingsRequest,
): Promise<ProjectSettingsResponse> {
  return apiClient.put<never, ProjectSettingsResponse>(
    `/projects/${projectId}/settings`,
    data,
  );
}
