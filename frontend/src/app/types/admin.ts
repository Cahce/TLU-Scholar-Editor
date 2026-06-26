/**
 * Admin CRUD Integration Types
 * 
 * These types mirror backend DTOs from:
 * - backend/src/modules/admin/delivery/http/Faculty/Dto.ts
 * - backend/src/modules/admin/delivery/http/Department/Dto.ts
 * - backend/src/modules/admin/delivery/http/Major/Dto.ts
 * - backend/src/modules/admin/delivery/http/Class/Dto.ts
 * - backend/src/modules/admin/delivery/http/TeacherManagement/Dto.ts
 * - backend/src/modules/admin/delivery/http/StudentManagement/Dto.ts
 */

/**
 * =========================
 * Generic Types
 * =========================
 */

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BaseListQuery {
  search?: string;
  page?: number;
  pageSize?: number;
}

/** Mirrors backend Prisma enum `Gender`. UI maps to Vietnamese labels. */
export type Gender = "male" | "female" | "other";

/**
 * =========================
 * Faculty
 * =========================
 */

export interface Faculty {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFacultyRequest {
  name: string;
  code: string;
}

export interface UpdateFacultyRequest {
  name?: string;
  code?: string;
}

export type ListFacultiesQuery = BaseListQuery;

/**
 * =========================
 * Department
 * =========================
 */

export interface Department {
  id: string;
  name: string;
  code: string;
  facultyId: string;
  faculty?: Pick<Faculty, "id" | "name" | "code">;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentRequest {
  name: string;
  code: string;
  facultyId: string;
}

export interface UpdateDepartmentRequest {
  name?: string;
  code?: string;
  facultyId?: string;
}

export interface ListDepartmentsQuery extends BaseListQuery {
  facultyId?: string;
}

/**
 * =========================
 * Major
 * =========================
 */

export interface Major {
  id: string;
  name: string;
  code: string;
  facultyId: string;
  faculty?: Pick<Faculty, "id" | "name" | "code">;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMajorRequest {
  name: string;
  code: string;
  facultyId: string;
}

export interface UpdateMajorRequest {
  name?: string;
  code?: string;
  facultyId?: string;
}

export interface ListMajorsQuery extends BaseListQuery {
  facultyId?: string;
}

/**
 * =========================
 * Class
 * =========================
 */

export interface Class {
  id: string;
  name: string;
  code: string;
  majorId: string;
  major?: Pick<Major, "id" | "name" | "code">;
  faculty?: Pick<Faculty, "id" | "name" | "code">;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClassRequest {
  name: string;
  code: string;
  majorId: string;
}

export interface UpdateClassRequest {
  name?: string;
  code?: string;
  majorId?: string;
}

export interface ListClassesQuery extends BaseListQuery {
  majorId?: string;
  facultyId?: string;
}

/**
 * =========================
 * Teacher
 * =========================
 */

export interface Teacher {
  id: string;
  accountId: string | null;
  teacherCode: string;
  fullName: string;
  departmentId: string;
  academicRank: string;
  academicDegree: string;
  phone: string | null;
  gender: Gender | null;
  dateOfBirth: string | null;
  address: string | null;
  department?: {
    id: string;
    name: string;
    code: string;
    facultyId: string;
  };
  faculty?: Pick<Faculty, "id" | "name" | "code">;
  account?: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Inline account specification accepted by Create Teacher / Create Student
 * endpoints. Mirrors backend AccountInlineSchema in
 * backend/src/modules/admin/delivery/http/{TeacherManagement,StudentManagement}/Dto.ts.
 */
export type AccountInline =
  | { mode: "none" }
  | { mode: "link"; accountId: string }
  | { mode: "create"; email: string; password: string };

export interface CreateTeacherRequest {
  teacherCode: string;
  fullName: string;
  departmentId: string;
  academicRank: string;
  academicDegree: string;
  phone?: string;
  gender?: Gender;
  dateOfBirth?: string;
  address?: string;
  /** @deprecated Use `account: { mode: "link", accountId }` instead. */
  accountId?: string;
  account?: AccountInline;
}

export interface UpdateTeacherRequest {
  teacherCode?: string;
  fullName?: string;
  departmentId?: string;
  academicRank?: string;
  academicDegree?: string;
  phone?: string;
  gender?: Gender | null;
  dateOfBirth?: string | null;
  address?: string | null;
}

export interface ListTeachersQuery extends BaseListQuery {
  departmentId?: string;
  facultyId?: string;
  hasAccount?: "true" | "false";
}

export interface LinkAccountRequest {
  accountId: string;
}

/**
 * =========================
 * Student
 * =========================
 */

export interface Student {
  id: string;
  accountId: string | null;
  studentCode: string;
  fullName: string;
  classId: string;
  phone: string | null;
  gender: Gender | null;
  dateOfBirth: string | null;
  address: string | null;
  class?: {
    id: string;
    name: string;
    code: string;
    majorId: string;
  };
  major?: {
    id: string;
    name: string;
    code: string;
    facultyId: string;
  };
  faculty?: Pick<Faculty, "id" | "name" | "code">;
  account?: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentRequest {
  studentCode: string;
  fullName: string;
  classId: string;
  phone?: string;
  gender?: Gender;
  dateOfBirth?: string;
  address?: string;
  /** @deprecated Use `account: { mode: "link", accountId }` instead. */
  accountId?: string;
  account?: AccountInline;
}

export interface UpdateStudentRequest {
  studentCode?: string;
  fullName?: string;
  classId?: string;
  phone?: string;
  gender?: Gender | null;
  dateOfBirth?: string | null;
  address?: string | null;
}

export interface ListStudentsQuery extends BaseListQuery {
  classId?: string;
  majorId?: string;
  facultyId?: string;
  hasAccount?: "true" | "false";
}

/**
 * =========================
 * Account
 * =========================
 * Mirrors backend/src/modules/admin/delivery/http/Account/Dto.ts
 * and backend/src/modules/admin/domain/AccountManagement/Types.ts
 */

export type UserRole = "admin" | "teacher" | "student";

export interface AccountLink {
  type: "teacher" | "student";
  id: string;
  fullName: string;
  code: string;
}

export interface Account {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  link: AccountLink | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountRequest {
  email: string;
  password: string;
  role: UserRole;
  isActive?: boolean;
  linkTo?: {
    type: "teacher" | "student";
    id: string;
  };
}

export interface UpdateAccountRequest {
  email?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface ResetAccountPasswordRequest {
  newPassword: string;
}

export interface ListAccountsQuery extends BaseListQuery {
  role?: UserRole;
  isActive?: "true" | "false";
  hasLink?: "true" | "false";
}

/**
 * =========================
 * Import
 * =========================
 * Mirrors backend ImportResult in
 * backend/src/modules/admin/application/import/ImportTypes.ts.
 */

export interface ImportErrorRow {
  row: number;
  code: string;
  message: string;
}

export interface ImportGeneratedPassword {
  row: number;
  email: string;
  password: string;
}

export interface ImportResult {
  total: number;
  created: number;
  skipped: number;
  failed: number;
  errors: ImportErrorRow[];
  generatedPasswords?: ImportGeneratedPassword[];
}
