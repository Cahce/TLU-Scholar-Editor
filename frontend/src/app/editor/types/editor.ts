import type { ProjectAccess, TemplateCategory } from "../../types/api";

export interface ProjectSummary {
  id: string;
  title: string;
  category: TemplateCategory;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
  lastEditedAt: string | null;
  /** Caller capabilities from the detail endpoint (drives read-only mode). */
  access?: ProjectAccess;
}

export interface ProjectSettings {
  projectId: string;
  mainPath: string;
  compileOptions: Record<string, unknown>;
  zoteroConfig: Record<string, unknown> | null;
  updatedAt: string;
}

export type FileKind = "typst" | "bib" | "image" | "data" | "other" | "vector" | "font" | "markdown" | "config" | "text" | "pdf";

export interface ProjectFile {
  id: string;
  projectId: string;
  path: string;
  kind: FileKind;
  textContent: string | null;
  storageKey: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  sha256: string | null;
  lastEditedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /**
   * Raw bytes for binary files (images, fonts, PDFs). Populated on demand when
   * `getFileContent()` receives a non-JSON response. Null for text files.
   */
  binaryContent?: Uint8Array | null;
}

export interface EditorFileDraft {
  path: string;
  content: string;
  dirty: boolean;
  saving: boolean;
  lastSavedAt: string | null;
  saveError: string | null;
}

export interface FileTreeNode {
  path: string;
  name: string;
  kind: FileKind | "folder";
  children?: FileTreeNode[];
}
