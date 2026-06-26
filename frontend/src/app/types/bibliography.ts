/**
 * Bibliography Types
 * 
 * TypeScript types derived 1-1 from backend Zod schemas.
 * DO NOT invent fields - these must match backend DTOs exactly.
 * 
 * Backend sources:
 * - backend/src/modules/bibliography/delivery/http/Dto.ts
 * - backend/src/modules/zotero/delivery/http/Dto.ts
 * - backend/src/modules/openalex/delivery/http/Dto.ts
 */

// ============================================================================
// Bibliography Types
// ============================================================================

export type BibliographyConflictMode = "skip" | "replace" | "rename";
export type DuplicateMatchReason = "key" | "doi" | "title_author_year";
export type DuplicateResolutionAction =
  | "keep_first"
  | "keep_last"
  | "merge_fields"
  | "rename"
  | "delete_selected";

export interface BibliographyEntryDto {
  key: string;
  type:
    | "article"
    | "book"
    | "incollection"
    | "inproceedings"
    | "phdthesis"
    | "mastersthesis"
    | "techreport"
    | "misc";
  fields: Record<string, string>;
}

export interface DuplicateEntryDto {
  key: string;
  type: BibliographyEntryDto["type"];
  title: string | null;
  author: string | null;
  year: string | null;
  doi: string | null;
  index: number;
  source: "existing" | "candidate";
}

export interface DuplicateGroupDto {
  groupId: string;
  reasons: DuplicateMatchReason[];
  entries: DuplicateEntryDto[];
}

export interface CheckDuplicatesBody {
  targetBibPath: string;
  candidates?: BibliographyEntryDto[];
  matchBy?: DuplicateMatchReason[];
}

export interface CheckDuplicatesResponse {
  groups: DuplicateGroupDto[];
  existingCount: number;
  candidateCount: number;
}

// ============================================================================
// Zotero Types
// ============================================================================

/**
 * Zotero library type enum
 */
export type ZoteroLibraryType = "user" | "group";

/**
 * Zotero sync type enum
 */
export type ZoteroSyncType = "full" | "incremental";

/**
 * Zotero sync status enum
 */
export type ZoteroSyncStatus = "pending" | "running" | "success" | "failed";

/**
 * Connect Zotero Request Body
 *
 * libraryId / libraryType are optional. When omitted, the backend resolves the
 * personal library from the API key via GET /keys/current.
 */
export interface ConnectZoteroBody {
  apiKey: string;
  libraryId?: string;
  libraryType?: ZoteroLibraryType;
}

/**
 * Verify Zotero API Key Request Body
 */
export interface VerifyZoteroBody {
  apiKey: string;
}

/**
 * Zotero library summary (returned by verify).
 */
export interface ZoteroLibrarySummary {
  id: string;
  name: string;
  type: ZoteroLibraryType;
}

/**
 * Verify Zotero API Key Response.
 */
export interface VerifyZoteroResponse {
  userId: string;
  username: string;
  displayName?: string;
  libraries: ZoteroLibrarySummary[];
}

/**
 * Zotero Connection DTO
 */
export interface ZoteroConnection {
  id: string;
  libraryId: string;
  libraryType: ZoteroLibraryType;
  connectedAt: string;
  lastSyncedAt: string | null;
  hasApiKey: true;
}

/**
 * Zotero Collection DTO
 */
export interface ZoteroCollection {
  key: string;
  name: string;
  parentKey: string | null;
  numItems: number;
}

/**
 * Zotero Creator DTO
 */
export interface ZoteroCreator {
  creatorType: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

/**
 * Zotero Item DTO
 */
export interface ZoteroItem {
  key: string;
  itemType: string;
  title: string | null;
  creators: ZoteroCreator[];
  date: string | null;
  publicationTitle: string | null;
  doi: string | null;
  url: string | null;
  abstractNote: string | null;
}

/**
 * Sync To Bib File Request Body
 */
export interface ZoteroSyncBody {
  collectionKeys?: string[];
  itemKeys?: string[];
  targetBibPath: string;
  syncType: ZoteroSyncType;
  conflictMode?: BibliographyConflictMode;
}

/**
 * Sync To Bib File Response
 *
 * `entries` lets the caller map each Zotero item key back to the citation key
 * the backend actually wrote, so `#cite(<...>)` references the right entry
 * (citation keys are generated server-side via author+year+title, not from
 * the Zotero item key).
 */
export interface ZoteroSyncResponse {
  syncLogId: string;
  itemsSynced: number;
  entries: Array<{ zoteroItemKey: string; citationKey: string }>;
}

/**
 * Zotero Sync Log DTO
 */
export interface ZoteroSyncLog {
  id: string;
  syncType: ZoteroSyncType;
  status: ZoteroSyncStatus;
  itemsSynced: number;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
}

// ============================================================================
// OpenAlex Types
// ============================================================================

/**
 * OpenAlex Author DTO
 */
export interface OpenAlexAuthor {
  name: string;
  position: string;
}

/**
 * OpenAlex Work DTO
 */
export interface OpenAlexWork {
  id: string;
  doi: string | null;
  title: string | null;
  year: number | null;
  type: string;
  authors: OpenAlexAuthor[];
  journal: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  isOA: boolean;
  oaUrl: string | null;
  landingUrl: string | null;
  abstract: string | null;
  citedByCount: number;
}

/**
 * Search Works Query Parameters
 */
export interface OpenAlexSearchQuery {
  search: string;
  yearFrom?: number;
  yearTo?: number;
  isOA?: boolean;
  type?: string;
  perPage?: number;
  page?: number;
}

/**
 * Search Works Response
 */
export interface OpenAlexSearchResponse {
  works: OpenAlexWork[];
  meta: {
    count: number;
    page: number;
    perPage: number;
  };
}

/**
 * Import To Bib File Request Body
 */
export interface OpenAlexImportBody {
  openAlexIds: string[];
  targetBibPath: string;
  conflictMode?: BibliographyConflictMode;
}

/**
 * Import Response - detailed status for each work
 */
export interface ImportResponse {
  imported: Array<{
    openAlexId: string;
    citationKey: string;
  }>;
  skippedDuplicate: Array<{
    openAlexId: string;
    existingKey: string;
  }>;
  failed: Array<{
    openAlexId: string;
    errorMessage: string;
  }>;
}

// ============================================================================
// Capture Types (web capture + cite)
// Backend source: backend/src/modules/capture/delivery/http/Dto.ts
// ============================================================================

/**
 * A captured reference (preview shape returned by /capture/resolve).
 * Reuses ZoteroCreator for creators.
 */
export interface CaptureItem {
  itemType: string;
  title: string | null;
  creators: ZoteroCreator[];
  date: string | null;
  publicationTitle: string | null;
  doi: string | null;
  url: string | null;
  abstractNote: string | null;
}

/** Response of POST /capture/resolve */
export interface ResolveCaptureResponse {
  items: CaptureItem[];
}

/**
 * Request body of POST /capture/projects/:projectId/save.
 * Exactly one of url/identifier; at least one save target (enforced server-side).
 */
export interface SaveCaptureBody {
  url?: string;
  identifier?: string;
  targetBibPath?: string;
  saveToBib: boolean;
  saveToZotero: boolean;
  conflictMode?: BibliographyConflictMode;
}

/** Response of POST /capture/projects/:projectId/save */
export interface SaveCaptureResponse {
  citationKey: string;
  bibSaved: boolean;
  zoteroItemKey: string | null;
  skippedDuplicate: { existingKey: string } | null;
}
