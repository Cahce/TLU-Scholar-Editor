/**
 * Zotero API Client
 * 
 * API client functions for Zotero integration endpoints.
 * All endpoints are under /api/v1/zotero/*
 */

import { apiClient } from "./client";
import type {
  ConnectZoteroBody,
  VerifyZoteroResponse,
  ZoteroConnection,
  ZoteroCollection,
  ZoteroItem,
  ZoteroSyncBody,
  ZoteroSyncLog,
  ZoteroSyncResponse,
} from "../types/bibliography";

/**
 * Verify a Zotero API key and list accessible libraries.
 * POST /zotero/connections/verify
 *
 * Does not store anything — used as the first step of the connect flow.
 */
export async function verify(apiKey: string): Promise<VerifyZoteroResponse> {
  return apiClient.post<never, VerifyZoteroResponse>(
    "/zotero/connections/verify",
    { apiKey }
  );
}

/**
 * Connect Zotero account
 * POST /zotero/connections
 */
export async function connect(
  body: ConnectZoteroBody
): Promise<{ connection: ZoteroConnection }> {
  return apiClient.post<never, { connection: ZoteroConnection }>(
    "/zotero/connections",
    body
  );
}

/**
 * Get my Zotero connection
 * GET /zotero/connections/me
 */
export async function getMyConnection(): Promise<{
  connection: ZoteroConnection | null;
}> {
  return apiClient.get<never, { connection: ZoteroConnection | null }>(
    "/zotero/connections/me"
  );
}

/**
 * Disconnect Zotero account
 * DELETE /zotero/connections/me
 */
export async function disconnect(): Promise<{ success: boolean }> {
  return apiClient.delete<never, { success: boolean }>(
    "/zotero/connections/me"
  );
}

/**
 * List Zotero collections
 * GET /zotero/collections
 */
export async function listCollections(): Promise<{
  collections: ZoteroCollection[];
}> {
  return apiClient.get<never, { collections: ZoteroCollection[] }>(
    "/zotero/collections"
  );
}

/**
 * List Zotero items
 * GET /zotero/items
 * 
 * @param q Query parameters
 * @param q.collectionKey Optional collection key to filter by
 * @param q.start Optional start index for pagination (default: 0)
 * @param q.limit Optional limit for pagination (default: 50)
 */
export async function listItems(q: {
  collectionKey?: string;
  start?: number;
  limit?: number;
  sort?: "dateAdded" | "dateModified" | "title" | "creator" | "date";
  direction?: "asc" | "desc";
}): Promise<{ items: ZoteroItem[]; total: number }> {
  return apiClient.get<never, { items: ZoteroItem[]; total: number }>(
    "/zotero/items",
    {
      params: q,
    }
  );
}

/**
 * Sync Zotero items to project .bib file
 * POST /zotero/projects/:projectId/sync
 * 
 * @param projectId Project ID
 * @param body Sync request body
 */
export async function sync(
  projectId: string,
  body: ZoteroSyncBody
): Promise<ZoteroSyncResponse> {
  return apiClient.post<never, ZoteroSyncResponse>(
    `/zotero/projects/${projectId}/sync`,
    body
  );
}

/**
 * Get sync logs for a project
 * GET /zotero/projects/:projectId/sync-logs
 * 
 * @param projectId Project ID
 * @param limit Optional limit (default: 20)
 */
export async function getSyncLogs(
  projectId: string,
  limit?: number
): Promise<{ logs: ZoteroSyncLog[] }> {
  return apiClient.get<never, { logs: ZoteroSyncLog[] }>(
    `/zotero/projects/${projectId}/sync-logs`,
    {
      params: { limit },
    }
  );
}
