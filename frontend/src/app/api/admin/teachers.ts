import { apiClient } from "../client";
import type {
  Teacher,
  CreateTeacherRequest,
  UpdateTeacherRequest,
  ListTeachersQuery,
  LinkAccountRequest,
  Paginated,
  ImportResult,
} from "../../types/admin";

export async function listTeachers(query?: ListTeachersQuery): Promise<Paginated<Teacher>> {
  return apiClient.get<Paginated<Teacher>>("/admin/teachers", { params: query });
}

export async function getTeacher(id: string): Promise<Teacher> {
  return apiClient.get<Teacher>(`/admin/teachers/${id}`);
}

export async function createTeacher(body: CreateTeacherRequest): Promise<Teacher> {
  return apiClient.post<Teacher>("/admin/teachers", body);
}

export async function updateTeacher(id: string, body: UpdateTeacherRequest): Promise<Teacher> {
  return apiClient.put<Teacher>(`/admin/teachers/${id}`, body);
}

export async function deleteTeacher(id: string): Promise<void> {
  return apiClient.delete<void>(`/admin/teachers/${id}`);
}

export async function linkTeacherAccount(id: string, body: LinkAccountRequest): Promise<Teacher> {
  return apiClient.post<Teacher>(`/admin/teachers/${id}/link-account`, body);
}

export async function unlinkTeacherAccount(id: string): Promise<Teacher> {
  return apiClient.delete<Teacher>(`/admin/teachers/${id}/unlink-account`);
}

export async function importTeachers(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient.post<ImportResult>("/admin/teachers/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export async function downloadTeachersTemplate(
  format: "xlsx" | "csv" = "xlsx",
): Promise<Blob> {
  return apiClient.get<Blob>("/admin/teachers/import/template", {
    params: { format },
    responseType: "blob",
  });
}
