import { apiClient } from "../client";
import type {
  Department,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  ListDepartmentsQuery,
  Paginated,
  ImportResult,
} from "../../types/admin";

export async function listDepartments(query?: ListDepartmentsQuery): Promise<Paginated<Department>> {
  return apiClient.get<Paginated<Department>>("/admin/departments", { params: query });
}

export async function getDepartment(id: string): Promise<Department> {
  return apiClient.get<Department>(`/admin/departments/${id}`);
}

export async function createDepartment(body: CreateDepartmentRequest): Promise<Department> {
  return apiClient.post<Department>("/admin/departments", body);
}

export async function updateDepartment(id: string, body: UpdateDepartmentRequest): Promise<Department> {
  return apiClient.put<Department>(`/admin/departments/${id}`, body);
}

export async function deleteDepartment(id: string): Promise<void> {
  return apiClient.delete<void>(`/admin/departments/${id}`);
}

export async function importDepartments(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient.post<ImportResult>("/admin/departments/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export async function downloadDepartmentsTemplate(
  format: "xlsx" | "csv" = "xlsx",
): Promise<Blob> {
  return apiClient.get<Blob>("/admin/departments/import/template", {
    params: { format },
    responseType: "blob",
  });
}
