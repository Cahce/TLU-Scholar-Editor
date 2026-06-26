import type { EditorStorageService, CreateFileInput } from "./EditorStorageService";
import type { FileKind, ProjectFile } from "../types/editor";
import {
  listFiles as apiList,
  getFileContent as apiGet,
  putFileContent as apiPut,
  createFile as apiCreate,
  renameFile as apiRename,
  deleteFile as apiDelete,
  uploadBinaryFile as apiUploadBinary,
} from "../../api/projectFiles";

export class ApiEditorStorageService implements EditorStorageService {
  async listFiles(projectId: string): Promise<ProjectFile[]> {
    const res = await apiList(projectId);
    return res.files;
  }

  getFile(projectId: string, path: string): Promise<ProjectFile> {
    return apiGet(projectId, path);
  }

  saveFile(projectId: string, path: string, content: string): Promise<ProjectFile> {
    return apiPut(projectId, path, content);
  }

  createFile(projectId: string, input: CreateFileInput): Promise<ProjectFile> {
    return apiCreate(projectId, {
      path: input.path,
      kind: input.kind,
      content: input.textContent ?? "",
    });
  }

  uploadBinaryFile(
    projectId: string,
    path: string,
    file: Blob | File,
    kind?: FileKind,
  ): Promise<ProjectFile> {
    return apiUploadBinary(projectId, path, file, kind);
  }

  renameFile(projectId: string, oldPath: string, newPath: string): Promise<ProjectFile> {
    return apiRename(projectId, oldPath, newPath);
  }

  deleteFile(projectId: string, path: string): Promise<void> {
    return apiDelete(projectId, path);
  }
}
