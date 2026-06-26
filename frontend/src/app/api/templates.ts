import { apiClient } from "./client";
import type {
  CreateTemplateRequest,
  CreateVersionFormData,
  DeleteTemplateResponse,
  ListPublicTemplatesResponse,
  ListTemplatesQuery,
  ListTemplatesResponse,
  ListVersionsResponse,
  PublicTemplate,
  Template,
  TemplateVersion,
  UpdateTemplateRequest,
  UpdateTemplateVersionRequest,
} from "../types/templates";

function buildListParams(query: ListTemplatesQuery | undefined) {
  if (!query) return undefined;
  const params: Record<string, string | number> = {};
  if (query.search) params.search = query.search;
  if (query.category) params.category = query.category;
  if (query.isOfficial !== undefined) params.isOfficial = query.isOfficial ? "true" : "false";
  if (query.isActive !== undefined) params.isActive = query.isActive ? "true" : "false";
  if (query.page !== undefined) params.page = query.page;
  if (query.pageSize !== undefined) params.pageSize = query.pageSize;
  return params;
}

export async function listTemplates(
  query?: ListTemplatesQuery,
): Promise<ListTemplatesResponse> {
  return apiClient.get<never, ListTemplatesResponse>("/admin/templates", {
    params: buildListParams(query),
  });
}

export async function getTemplate(id: string): Promise<Template> {
  return apiClient.get<never, Template>(`/admin/templates/${id}`);
}

export async function createTemplate(
  data: CreateTemplateRequest,
): Promise<Template> {
  return apiClient.post<never, Template>("/admin/templates", data);
}

export async function updateTemplate(
  id: string,
  data: UpdateTemplateRequest,
): Promise<Template> {
  return apiClient.patch<never, Template>(`/admin/templates/${id}`, data);
}

export async function deleteTemplate(id: string): Promise<DeleteTemplateResponse> {
  return apiClient.delete<never, DeleteTemplateResponse>(`/admin/templates/${id}`);
}

export async function listTemplateVersions(
  templateId: string,
): Promise<ListVersionsResponse> {
  return apiClient.get<never, ListVersionsResponse>(
    `/admin/templates/${templateId}/versions`,
  );
}

export async function createTemplateVersion(
  templateId: string,
  data: CreateVersionFormData,
): Promise<TemplateVersion> {
  const formData = new FormData();
  formData.append("versionNumber", data.versionNumber);
  if (data.changelog) {
    formData.append("changelog", data.changelog);
  }
  formData.append("file", data.file);

  return apiClient.post<never, TemplateVersion>(
    `/admin/templates/${templateId}/versions`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
}

/**
 * Patch a template version's metadata. Accepts any combination of
 * `changelog` (string | null to clear) and `isActive` — at least one field
 * must be present, otherwise the backend returns 400.
 */
export async function updateTemplateVersion(
  templateId: string,
  versionId: string,
  patch: UpdateTemplateVersionRequest,
): Promise<TemplateVersion> {
  return apiClient.patch<UpdateTemplateVersionRequest, TemplateVersion>(
    `/admin/templates/${templateId}/versions/${versionId}`,
    patch,
  );
}

/**
 * @deprecated Use `updateTemplateVersion(templateId, versionId, { isActive: false })`.
 *
 * Kept as a thin wrapper so existing call sites (and tests) don't break in
 * the same change set that introduces the broader PATCH. New code should
 * call `updateTemplateVersion` directly.
 */
export async function deactivateTemplateVersion(
  templateId: string,
  versionId: string,
): Promise<TemplateVersion> {
  return updateTemplateVersion(templateId, versionId, { isActive: false });
}

/**
 * Download a version's archive as a .zip Blob. The backend always re-bundles
 * the stored directory, so the response is consistent for both single-`.typ`
 * and multi-file uploads.
 *
 * Filename hint is taken from the response `Content-Disposition` header when
 * present, otherwise the caller should fall back to a derived name (template
 * name + version number).
 */
export async function downloadTemplateVersionFile(
  templateId: string,
  versionId: string,
): Promise<{ blob: Blob; filename: string | null }> {
  const response = await apiClient.request<Blob>({
    method: "GET",
    url: `/admin/templates/${templateId}/versions/${versionId}/file`,
    responseType: "blob",
  });
  // Our axios response interceptor unwraps to `response.data` for JSON, but
  // for blob it returns the Blob directly. Header is lost through the
  // interceptor; let the caller pick a filename.
  return { blob: response as unknown as Blob, filename: null };
}

/**
 * Create (or reuse) the template's editable "source project" — the admin-owned
 * working copy authored in the workspace. `seed: 'blank'` scaffolds an empty
 * project; `seed: 'latest'` seeds from the template's latest active version.
 * Returns the source project id to navigate to
 * `/workspace/:sourceProjectId?templateId=:id`.
 */
export async function createTemplateSourceProject(
  templateId: string,
  data: { seed: "blank" | "latest" },
): Promise<{ sourceProjectId: string }> {
  return apiClient.post<{ seed: string }, { sourceProjectId: string }>(
    `/admin/templates/${templateId}/source-project`,
    data,
  );
}

/**
 * Create the template's source project seeded from an uploaded .zip, then the
 * caller navigates to the workspace to review/edit before publishing.
 */
export async function importTemplateSourceProject(
  templateId: string,
  file: File,
): Promise<{ sourceProjectId: string }> {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient.post<never, { sourceProjectId: string }>(
    `/admin/templates/${templateId}/source-project/import`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
}

/**
 * Publish a new template version by snapshotting the current files of the
 * template's source project. Called from the workspace authoring mode.
 */
export async function publishTemplateVersionFromSource(
  templateId: string,
  data: { versionNumber: string; changelog?: string | null },
): Promise<TemplateVersion> {
  return apiClient.post<typeof data, TemplateVersion>(
    `/admin/templates/${templateId}/versions/from-source`,
    data,
  );
}

export async function listPublicTemplates(): Promise<ListPublicTemplatesResponse> {
  return apiClient.get<never, ListPublicTemplatesResponse>("/templates");
}

export async function getPublicTemplate(id: string): Promise<PublicTemplate> {
  return apiClient.get<never, PublicTemplate>(`/templates/${id}`);
}
