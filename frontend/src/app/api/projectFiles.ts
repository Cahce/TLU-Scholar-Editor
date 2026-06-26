import { apiClient, ApiError, authorizedFetch } from "./client";
import type {
  ProjectFile,
  FileListResponse,
  CreateFileRequest,
  UpdateFileRequest,
  RenameFileRequest,
  FileKind,
} from "../types/api";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1";

/**
 * Encode file path for URL
 * Splits path by "/" and encodes each segment
 */
function encodeFilePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

/**
 * Backend serializes the content field as `content`.
 * Frontend types (both api.ts and editor/types/editor.ts) name it `textContent`.
 * This helper normalises any single-file response so both names are present.
 */
function normaliseFileResponse(raw: Record<string, unknown>): ProjectFile {
  return {
    ...raw,
    // keep textContent if already present; otherwise pull from 'content'
    textContent: (raw["textContent"] as string | null | undefined) ?? (raw["content"] as string | null) ?? null,
  } as unknown as ProjectFile;
}

/**
 * List all files in a project
 * Sorted by path ascending
 */
export async function listFiles(projectId: string): Promise<FileListResponse> {
  return apiClient.get<never, FileListResponse>(
    `/projects/${projectId}/files`,
  );
}

/**
 * Map a MIME type back to our FileKind union. Matches the server-side
 * `FileKindPolicy` mapping but inverted (we only need it for the rare case
 * where the backend sends a binary file without echoing the kind in headers).
 */
function kindFromMime(mime: string): FileKind {
  const lower = mime.toLowerCase();
  if (lower.startsWith("image/svg")) return "vector";
  if (lower.startsWith("image/")) return "image";
  if (lower.startsWith("font/") || lower.includes("font")) return "font";
  if (lower === "application/pdf") return "pdf";
  return "data";
}

/**
 * Get file content by path. Dual-mode:
 *   - Text files: server returns JSON `{ ..., content }` → normalised to
 *     `textContent`.
 *   - Binary files: server streams raw bytes with file's `Content-Type`. We
 *     construct a `ProjectFile`-shaped object with `binaryContent` populated.
 *
 * We use raw fetch here (not the shared axios client) because the axios
 * response interceptor unconditionally returns `response.data`, losing the
 * Content-Type header we need to discriminate text vs binary.
 */
export async function getFileContent(
  projectId: string,
  path: string,
): Promise<ProjectFile> {
  const encodedPath = encodeFilePath(path);
  const url = `${API_BASE_URL}/projects/${projectId}/files/${encodedPath}`;

  // authorizedFetch injects the Bearer token and handles silent refresh / 401.
  const response = await authorizedFetch(url);

  if (!response.ok) {
    // Try to parse JSON error body; fall back to status text.
    let code = "HTTP_ERROR";
    let message = response.statusText;
    try {
      const body = await response.json();
      code = body?.error?.code ?? code;
      message = body?.error?.message ?? message;
    } catch {
      /* non-JSON body — keep defaults */
    }
    throw new ApiError(response.status, code, message);
  }

  const contentType = response.headers.get("content-type") ?? "";

  // Text path: server sent JSON; normalise.
  if (contentType.includes("application/json")) {
    const parsed = (await response.json()) as Record<string, unknown>;
    return normaliseFileResponse(parsed);
  }

  // Binary path: read raw bytes + synthesise ProjectFile from response
  // headers. The backend ships id / timestamps / storageKey via
  // `X-File-Id`, `X-Last-Edited-At`, `X-Created-At`, `X-Updated-At`,
  // `X-Storage-Key` (see backend Routes.ts binary branch). These must be
  // listed in CORS `exposedHeaders` on the backend — otherwise the browser
  // hides them from JS and the viewer's "Last changed" row falls back to "—".
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const etag = response.headers.get("etag") ?? undefined;
  const headerLastEditedAt = response.headers.get("x-last-edited-at");
  const headerCreatedAt = response.headers.get("x-created-at");
  const headerUpdatedAt = response.headers.get("x-updated-at");
  const headerFileId = response.headers.get("x-file-id");
  const headerStorageKey = response.headers.get("x-storage-key");
  return {
    id: headerFileId ?? "",
    projectId,
    path,
    kind: kindFromMime(contentType),
    textContent: null,
    binaryContent: bytes,
    storageKey: headerStorageKey || null,
    mimeType: contentType.split(";")[0] || null,
    sizeBytes: bytes.byteLength,
    sha256: etag ? etag.replace(/"/g, "") : null,
    lastEditedAt: headerLastEditedAt || null,
    createdAt: headerCreatedAt ?? "",
    updatedAt: headerUpdatedAt ?? "",
  };
}

/**
 * Upload a binary file (image / font / PDF) via the multipart endpoint.
 * Backend stores bytes in object storage and returns ProjectFile metadata
 * (no content payload). The caller is responsible for storing the resulting
 * `ProjectFile` in the editor store + triggering a tree refresh.
 */
export async function uploadBinaryFile(
  projectId: string,
  path: string,
  file: Blob | File,
  kind?: FileKind,
): Promise<ProjectFile> {
  const form = new FormData();
  // Order matters: most browsers preserve FormData insertion order on the
  // wire. Append `path` and `kind` BEFORE `file` so the server's multipart
  // iterator sees the text fields first and doesn't have to buffer the
  // entire file in memory waiting for them.
  form.append("path", path);
  if (kind) form.append("kind", kind);
  form.append("file", file);

  // Let axios set the multipart boundary automatically — don't override
  // Content-Type or the request will be rejected.
  const raw = await apiClient.post<never, Record<string, unknown>>(
    `/projects/${projectId}/files:upload`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return normaliseFileResponse(raw);
}

/**
 * Update file content (text files only)
 * Returns updated file metadata
 */
export async function putFileContent(
  projectId: string,
  path: string,
  content: string,
): Promise<ProjectFile> {
  const encodedPath = encodeFilePath(path);
  const raw = await apiClient.put<never, Record<string, unknown>>(
    `/projects/${projectId}/files/${encodedPath}`,
    { content },
  );
  return normaliseFileResponse(raw);
}

/**
 * Create a new file
 */
export async function createFile(
  projectId: string,
  data: CreateFileRequest,
): Promise<ProjectFile> {
  const raw = await apiClient.post<never, Record<string, unknown>>(
    `/projects/${projectId}/files`,
    data,
  );
  return normaliseFileResponse(raw);
}

/**
 * Rename a file
 * Uses query parameter for old path to avoid encoding issues
 */
export async function renameFile(
  projectId: string,
  oldPath: string,
  newPath: string,
): Promise<ProjectFile> {
  const raw = await apiClient.patch<never, Record<string, unknown>>(
    `/projects/${projectId}/files:rename?path=${encodeURIComponent(oldPath)}`,
    { newPath },
  );
  return normaliseFileResponse(raw);
}

/**
 * Delete a file
 * Returns 204 No Content on success
 */
export async function deleteFile(
  projectId: string,
  path: string,
): Promise<void> {
  const encodedPath = encodeFilePath(path);
  return apiClient.delete<never, void>(
    `/projects/${projectId}/files/${encodedPath}`,
  );
}
