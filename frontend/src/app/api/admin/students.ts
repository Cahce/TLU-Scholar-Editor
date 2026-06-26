import { apiClient } from "../client";
import type {
  Student,
  CreateStudentRequest,
  UpdateStudentRequest,
  ListStudentsQuery,
  LinkAccountRequest,
  Paginated,
  ImportResult,
} from "../../types/admin";

export async function listStudents(query?: ListStudentsQuery): Promise<Paginated<Student>> {
  return apiClient.get<Paginated<Student>>("/admin/students", { params: query });
}

export async function getStudent(id: string): Promise<Student> {
  return apiClient.get<Student>(`/admin/students/${id}`);
}

export async function createStudent(body: CreateStudentRequest): Promise<Student> {
  return apiClient.post<Student>("/admin/students", body);
}

export async function updateStudent(id: string, body: UpdateStudentRequest): Promise<Student> {
  return apiClient.put<Student>(`/admin/students/${id}`, body);
}

export async function deleteStudent(id: string): Promise<void> {
  return apiClient.delete<void>(`/admin/students/${id}`);
}

export async function linkStudentAccount(id: string, body: LinkAccountRequest): Promise<Student> {
  return apiClient.post<Student>(`/admin/students/${id}/link-account`, body);
}

export async function unlinkStudentAccount(id: string): Promise<Student> {
  return apiClient.delete<Student>(`/admin/students/${id}/unlink-account`);
}

export async function importStudents(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient.post<ImportResult>("/admin/students/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export async function downloadStudentsTemplate(
  format: "xlsx" | "csv" = "xlsx",
): Promise<Blob> {
  return apiClient.get<Blob>("/admin/students/import/template", {
    params: { format },
    responseType: "blob",
  });
}
