// API Types for Backend Integration

export type UserRole = "admin" | "student" | "teacher";

/** Mirrors backend Prisma enum `Gender`. UI maps to Vietnamese labels. */
export type Gender = "male" | "female" | "other";

/**
 * RBAC permissions. Mirror of backend `shared/auth/Permissions.ts`.
 * Values are backend-authoritative (received via login / `/auth/me`);
 * this union exists for type-safety only.
 */
export type Permission =
  | "admin:access"
  | "users:manage"
  | "students:manage"
  | "teachers:manage"
  | "academic:manage"
  | "templates:manage"
  | "admin:projects:oversee"
  | "projects:create"
  | "projects:read"
  | "projects:edit"
  | "editor:access"
  | "advising:view";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  /** Backend-authoritative permission list derived from role. */
  permissions: Permission[];
  /** When true, the user must change their password before using the app. */
  mustChangePassword: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface CurrentUserResponse {
  user: User;
}

export interface MessageResponse {
  message: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface FacultySummary {
  id: string;
  name: string;
}

export interface DepartmentSummary {
  id: string;
  name: string;
  faculty: FacultySummary;
}

export interface MajorSummary {
  id: string;
  name: string;
  faculty: FacultySummary;
}

export interface ClassSummary {
  id: string;
  name: string;
  major: MajorSummary;
}

export interface TeacherProfileResponse {
  teacher: {
    // From the User record (always present when this object is returned)
    accountId: string;
    email: string;
    role: "teacher";
    isActive: boolean;
    createdAt: string;
    updatedAt: string;

    // Whether the User has a linked Teacher profile in the DB. When false,
    // teacher-specific fields below are null.
    profileLinked: boolean;

    // From the linked Teacher record (null when profileLinked is false)
    id: string | null;
    teacherCode: string | null;
    fullName: string | null;
    department: DepartmentSummary | null;
    academicRank: string | null;
    academicDegree: string | null;
    phone: string | null;
    gender: Gender | null;
    dateOfBirth: string | null;
    address: string | null;
  };
}

export interface StudentProfileResponse {
  student: {
    // From the User record (always present when this object is returned)
    accountId: string;
    email: string;
    role: "student";
    isActive: boolean;
    createdAt: string;
    updatedAt: string;

    // Whether the User has a linked Student profile in the DB. When false,
    // student-specific fields below are null.
    profileLinked: boolean;

    // From the linked Student record (null when profileLinked is false)
    id: string | null;
    studentCode: string | null;
    fullName: string | null;
    phone: string | null;
    gender: Gender | null;
    dateOfBirth: string | null;
    address: string | null;
    class: ClassSummary | null;
  };
}

/**
 * Self-service personal-info update (PUT /auth/me/profile). Only these personal
 * fields are editable by the user; identity/academic fields are admin-managed.
 * `null` clears a field.
 */
export interface UpdateMyProfileRequest {
  gender?: Gender | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  address?: string | null;
}

// ============================================
// Auth — Get User By Email
// ============================================
// Matches backend GET /api/v1/auth/user/:email response shape.

export interface UserFacultyWithCode {
  id: string;
  name: string;
  code: string;
}

export interface UserDepartmentWithCode {
  id: string;
  name: string;
  code: string;
  faculty: UserFacultyWithCode;
}

export interface UserMajorWithCode {
  id: string;
  name: string;
  code: string;
  faculty: UserFacultyWithCode;
}

export interface UserClassWithMajor {
  id: string;
  name: string;
  code: string;
  major: UserMajorWithCode;
}

export interface UserStudentProfile {
  id: string;
  studentCode: string;
  fullName: string;
  phone: string | null;
  gender: Gender | null;
  dateOfBirth: string | null;
  address: string | null;
  class: UserClassWithMajor;
}

export interface UserTeacherProfile {
  id: string;
  teacherCode: string;
  fullName: string;
  phone: string | null;
  gender: Gender | null;
  dateOfBirth: string | null;
  address: string | null;
  academicRank: string;
  academicDegree: string;
  department: UserDepartmentWithCode;
}

export interface UserWithProfileResponse {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  studentProfile?: UserStudentProfile;
  teacherProfile?: UserTeacherProfile;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

// ============================================
// Projects Types
// ============================================

export type TemplateCategory =
  | "thesis"
  | "report"
  | "proposal"
  | "paper"
  | "presentation"
  | "other";

/** Mirror of backend `ProjectAccessLevel`. */
export type ProjectAccessLevel =
  | "owner"
  | "editor"
  | "viewer"
  | "advisor"
  | "adminOversight";

/**
 * Caller's capabilities on a project. Returned by the project **detail**
 * endpoint (`GET /projects/:id`) so the workspace can render read-only vs
 * editable. Backend remains the authoritative enforcer of every mutation —
 * these flags are advisory for the UI only.
 */
export interface ProjectAccess {
  level: ProjectAccessLevel;
  canEdit: boolean;
  canDelete: boolean;
  canManageSettings: boolean;
  canCompileOfficial: boolean;
}

export interface Project {
  id: string;
  title: string;
  category: TemplateCategory;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
  lastEditedAt: string | null;
  /** Present on the detail endpoint; absent on list/create/update responses. */
  access?: ProjectAccess;
}

export interface CreateProjectRequest {
  title: string;
  category: TemplateCategory;
  templateVersionId?: string;
}

export interface UpdateProjectRequest {
  title?: string;
  category?: TemplateCategory;
}

export interface ProjectListResponse {
  projects: Project[];
}

// ============================================
// Project Files Types
// ============================================

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

export interface FileListResponse {
  files: ProjectFile[];
}

export interface CreateFileRequest {
  path: string;
  kind: FileKind;
  content: string;
  mimeType?: string;
}

export interface UpdateFileRequest {
  content: string;
}

export interface RenameFileRequest {
  newPath: string;
}

// ============================================
// Project Settings Types
// ============================================

export interface ProjectSettings {
  projectId: string;
  mainPath: string;
  compileOptions: Record<string, unknown>;
  zoteroConfig: Record<string, unknown> | null;
  openalexConfig: Record<string, unknown> | null;
  updatedAt: string;
}

export interface ProjectSettingsResponse {
  settings: ProjectSettings;
}

export interface UpdateProjectSettingsRequest {
  mainPath?: string;
  compileOptions?: Record<string, unknown>;
  zoteroConfig?: Record<string, unknown> | null;
  openalexConfig?: Record<string, unknown> | null;
}

// ============================================
// Compile Types
// ============================================

export interface CompileDiagnostic {
  severity: "error" | "warning" | "hint" | "info";
  message: string;
  file?: string;
  range?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  hints?: string[];
}

export interface CompileJobResponse {
  id: string;
  projectId: string;
  entryPath: string;
  status: "queued" | "running" | "success" | "failed";
  diagnostics: CompileDiagnostic[];
  latestArtifactId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnqueueCompileRequest {
  entryPath?: string;
  format?: "pdf";
  engine?: "node";
}
