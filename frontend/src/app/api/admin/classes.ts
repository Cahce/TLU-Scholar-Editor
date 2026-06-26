import { apiClient } from "../client";
import type {
  Class,
  CreateClassRequest,
  UpdateClassRequest,
  ListClassesQuery,
  Paginated,
  ImportResult,
} from "../../types/admin";

export async function listClasses(query?: ListClassesQuery): Promise<Paginated<Class>> {
  return apiClient.get<Paginated<Class>>("/admin/classes", { params: query });
}

export async function getClass(id: string): Promise<Class> {
  return apiClient.get<Class>(`/admin/classes/${id}`);
}

export async function createClass(body: CreateClassRequest): Promise<Class> {
  return apiClient.post<Class>("/admin/classes", body);
}

export async function updateClass(id: string, body: UpdateClassRequest): Promise<Class> {
  return apiClient.put<Class>(`/admin/classes/${id}`, body);
}

export async function deleteClass(id: string): Promise<void> {
  return apiClient.delete<void>(`/admin/classes/${id}`);
}

export async function importClasses(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient.post<ImportResult>("/admin/classes/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export async function downloadClassesTemplate(
  format: "xlsx" | "csv" = "xlsx",
): Promise<Blob> {
  return apiClient.get<Blob>("/admin/classes/import/template", {
    params: { format },
    responseType: "blob",
  });
}
