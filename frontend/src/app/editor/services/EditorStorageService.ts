import type { ProjectFile } from "../types/editor";

export interface CreateFileInput {
  path: string;
  kind: ProjectFile["kind"];
  textContent?: string;
}

export interface EditorStorageService {
  listFiles(projectId: string): Promise<ProjectFile[]>;
  getFile(projectId: string, path: string): Promise<ProjectFile>;
  saveFile(projectId: string, path: string, content: string): Promise<ProjectFile>;
  createFile(projectId: string, input: CreateFileInput): Promise<ProjectFile>;
  /**
   * Upload a binary blob (image / font / PDF) via multipart. Distinct from
   * `createFile` (which takes UTF-8 text); backend writes the bytes to blob
   * storage and returns the resulting ProjectFile metadata.
   */
  uploadBinaryFile(
    projectId: string,
    path: string,
    file: Blob | File,
    kind?: ProjectFile["kind"],
  ): Promise<ProjectFile>;
  renameFile(projectId: string, oldPath: string, newPath: string): Promise<ProjectFile>;
  deleteFile(projectId: string, path: string): Promise<void>;
}
