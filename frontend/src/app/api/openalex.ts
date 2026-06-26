/**
 * OpenAlex API Client
 * 
 * API client functions for OpenAlex integration endpoints.
 * All endpoints are under /api/v1/openalex/*
 */

import { apiClient } from "./client";
import type {
  OpenAlexSearchQuery,
  OpenAlexWork,
  OpenAlexImportBody,
  ImportResponse,
} from "../types/bibliography";

/**
 * Search OpenAlex works
 * GET /openalex/works
 * 
 * @param q Search query parameters
 */
export async function search(q: OpenAlexSearchQuery): Promise<{
  works: OpenAlexWork[];
  total: number;
  page: number;
  perPage: number;
}> {
  return apiClient.get<
    never,
    { works: OpenAlexWork[]; total: number; page: number; perPage: number }
  >("/openalex/works", {
    params: q,
  });
}

/**
 * Get a single OpenAlex work by ID
 * GET /openalex/works/:openAlexId
 * 
 * @param openAlexId OpenAlex work ID (e.g., "W2741809807")
 */
export async function getById(
  openAlexId: string
): Promise<{ work: OpenAlexWork }> {
  return apiClient.get<never, { work: OpenAlexWork }>(
    `/openalex/works/${openAlexId}`
  );
}

/**
 * Import OpenAlex works to project .bib file
 * POST /openalex/projects/:projectId/import
 * 
 * @param projectId Project ID
 * @param body Import request body
 */
export async function importToProject(
  projectId: string,
  body: OpenAlexImportBody
): Promise<ImportResponse> {
  return apiClient.post<never, ImportResponse>(
    `/openalex/projects/${projectId}/import`,
    body
  );
}
