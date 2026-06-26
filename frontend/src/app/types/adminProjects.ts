/**
 * Admin Project Oversight types.
 *
 * Mirror of the backend HTTP contract in
 * backend/src/modules/projects/delivery/http/AdminProject/Dto.ts
 * (and compile/delivery/http/AdminRoutes.ts for the PDF download).
 */

import type { Paginated } from "./admin";

export type TemplateCategory =
  | "thesis"
  | "report"
  | "proposal"
  | "paper"
  | "presentation"
  | "other";

export type ProjectOwnerRole = "student" | "teacher";

/** Vietnamese labels for project categories. */
export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  thesis: "Luận văn",
  report: "Báo cáo",
  proposal: "Đề cương",
  paper: "Bài báo",
  presentation: "Trình chiếu",
  other: "Khác",
};

export const CATEGORY_OPTIONS: { value: TemplateCategory; label: string }[] = (
  Object.keys(CATEGORY_LABELS) as TemplateCategory[]
).map((value) => ({ value, label: CATEGORY_LABELS[value] }));

export interface AdminProjectOwner {
  userId: string;
  email: string;
  role: "admin" | "student" | "teacher";
  isActive: boolean;
  displayName: string | null;
  code: string | null;
  faculty: { id: string; name: string; code: string } | null;
  unit: string | null;
}

export interface AdminProjectListItem {
  id: string;
  title: string;
  category: TemplateCategory;
  createdAt: string;
  updatedAt: string;
  lastEditedAt: string | null;
  fileCount: number;
  hasPdf: boolean;
  owner: AdminProjectOwner | null;
}

export type AdminProjectListResponse = Paginated<AdminProjectListItem>;

export interface AdminProjectFileSummary {
  path: string;
  kind: string;
  sizeBytes: number | null;
  updatedAt: string;
}

export interface AdminProjectDetail extends AdminProjectListItem {
  mainPath: string | null;
  totalSizeBytes: number;
  latestArtifact: { id: string; createdAt: string; sizeBytes: number | null } | null;
  files: AdminProjectFileSummary[];
}

export interface AdminProjectStats {
  total: number;
  byRole: { student: number; teacher: number };
  byCategory: Record<TemplateCategory, number>;
}

export interface ListAdminProjectsQuery {
  ownerRole?: ProjectOwnerRole;
  category?: TemplateCategory;
  search?: string;
  facultyId?: string;
  /** Student owners: filter by major. */
  majorId?: string;
  /** Student owners: filter by class. */
  classId?: string;
  /** Teacher owners: filter by department. */
  departmentId?: string;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  sort?: "updatedAt" | "createdAt" | "title";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}
