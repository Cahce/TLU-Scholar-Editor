import type { TemplateCategory } from "./api";

export type { TemplateCategory };

export interface Template {
  id: string;
  name: string;
  description: string | null;
  category: TemplateCategory;
  isOfficial: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /**
   * Number of projects currently using this template (any version). Returned
   * by admin list/detail endpoints. Defaults to 0 when absent.
   */
  usageCount?: number;
  /**
   * Id of the template's editable "source project" (admin authoring copy), or
   * null if it has none yet. Returned by admin list/detail endpoints. Used to
   * open the workspace at `/workspace/:sourceProjectId?templateId=:id`.
   */
  sourceProjectId?: string | null;
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  versionNumber: string;
  changelog: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface PublicTemplateLatestVersion {
  id: string;
  versionNumber: string;
  createdAt: string;
}

export interface PublicTemplate {
  id: string;
  name: string;
  description: string | null;
  category: TemplateCategory;
  isOfficial: boolean;
  createdAt: string;
  updatedAt: string;
  latestVersion: PublicTemplateLatestVersion | null;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  category: TemplateCategory;
  isOfficial?: boolean;
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string | null;
  category?: TemplateCategory;
  isOfficial?: boolean;
  isActive?: boolean;
}

export interface ListTemplatesQuery {
  search?: string;
  category?: TemplateCategory;
  isOfficial?: boolean;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ListTemplatesResponse {
  items: Template[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListVersionsResponse {
  versions: TemplateVersion[];
}

export interface ListPublicTemplatesResponse {
  templates: PublicTemplate[];
}

export interface CreateVersionFormData {
  versionNumber: string;
  changelog?: string;
  file: File;
}

/**
 * Payload for `PATCH /admin/templates/:id/versions/:versionId`.
 *
 * At least one field must be present — the backend enforces this via Zod
 * `.refine()`. Pass `changelog: null` to clear the existing note.
 */
export interface UpdateTemplateVersionRequest {
  changelog?: string | null;
  isActive?: boolean;
}

export interface DeleteTemplateResponse {
  message: string;
}
