/**
 * Capture API Client
 *
 * "Read a paper on the web → cite into the project" endpoints under
 * /api/v1/capture/*. Resolve previews metadata via the backend translation
 * server; save writes to the project .bib and/or the user's Zotero library.
 */

import { apiClient } from "./client";
import type {
  ResolveCaptureResponse,
  SaveCaptureBody,
  SaveCaptureResponse,
} from "../types/bibliography";

/**
 * Preview reference metadata for a URL or identifier (no persistence).
 * POST /capture/resolve
 */
export async function resolveReference(body: {
  url?: string;
  identifier?: string;
}): Promise<ResolveCaptureResponse> {
  return apiClient.post<never, ResolveCaptureResponse>(
    "/capture/resolve",
    body
  );
}

/**
 * Resolve + save a reference into a project (.bib and/or Zotero library).
 * POST /capture/projects/:projectId/save
 */
export async function captureToProject(
  projectId: string,
  body: SaveCaptureBody
): Promise<SaveCaptureResponse> {
  return apiClient.post<never, SaveCaptureResponse>(
    `/capture/projects/${projectId}/save`,
    body
  );
}
