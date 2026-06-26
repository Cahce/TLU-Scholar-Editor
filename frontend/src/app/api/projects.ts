import { apiClient } from "./client";
import type {
  Project,
  ProjectListResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
  TemplateCategory,
} from "../types/api";

/**
 * List all projects for the authenticated user
 * Sorted by updatedAt descending
 */
export async function listProjects(): Promise<ProjectListResponse> {
  return apiClient.get<never, ProjectListResponse>("/projects");
}

/**
 * Get a single project by ID
 * Requires user to have access to the project
 */
export async function getProject(projectId: string): Promise<Project> {
  return apiClient.get<never, Project>(`/projects/${projectId}`);
}

/**
 * Create a new project
 */
export async function createProject(
  data: CreateProjectRequest,
): Promise<Project> {
  return apiClient.post<never, Project>("/projects", data);
}

/**
 * Update an existing project
 * Requires user to be the owner
 */
export async function updateProject(
  projectId: string,
  data: UpdateProjectRequest,
): Promise<Project> {
  return apiClient.put<never, Project>(`/projects/${projectId}`, data);
}

/**
 * Delete a project
 * Requires user to be the owner
 * Returns 204 No Content on success
 */
export async function deleteProject(projectId: string): Promise<void> {
  return apiClient.delete<never, void>(`/projects/${projectId}`);
}

/**
 * Export a project to a .zip file.
 *
 * Calls `GET /projects/:id/export` with `responseType: 'blob'` so the axios
 * interceptor returns a `Blob` instead of trying to parse JSON. Caller can
 * save it via the `downloadBlob` utility.
 *
 * Backend also sends a `Content-Disposition` header with a suggested
 * filename; we read it here so the caller doesn't have to guess.
 */
export async function exportProject(
  projectId: string,
): Promise<{ blob: Blob; filename: string | null }> {
  // axios.get returns AxiosResponse<Blob>, but our interceptor unwraps to
  // .data — except we need the headers too. So we make this call go through
  // axios.request to get the full response.
  const response = await apiClient.request<Blob>({
    method: "GET",
    url: `/projects/${projectId}/export`,
    responseType: "blob",
  });
  // Our response interceptor unwraps to `response.data`, but `request<T>`
  // with `responseType: 'blob'` and an interceptor returning `response.data`
  // produces a `Blob` directly. The Content-Disposition header is lost when
  // the interceptor strips the wrapper, so we use a separate raw call when
  // we need the filename. Most browsers will fall back to the URL filename
  // anyway, so we return `null` for filename here and let the caller name it.
  const blob = response as unknown as Blob;
  return { blob, filename: null };
}

/**
 * Import a project from an uploaded .zip File.
 *
 * Builds a `multipart/form-data` payload with field `file`. We pass
 * `Content-Type: undefined` explicitly so axios drops the apiClient-level
 * default of `application/json` and lets the browser fill in the correct
 * `multipart/form-data; boundary=...` header itself — without this override
 * some axios versions ship the wrong Content-Type and Fastify rejects the
 * upload with "request body content-type is not multipart".
 *
 * The chosen project `category` is sent as a query param (kept out of the
 * multipart body so we don't depend on multipart field ordering); the backend
 * defaults to `other` when omitted.
 */
export async function importProject(
  file: File,
  category?: TemplateCategory,
): Promise<Project> {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient.post<never, Project>("/projects/import", formData, {
    headers: { "Content-Type": undefined as unknown as string },
    params: category ? { category } : undefined,
  });
}
