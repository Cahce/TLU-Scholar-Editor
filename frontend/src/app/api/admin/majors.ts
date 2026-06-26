import { apiClient } from "../client";
import type {
  Major,
  CreateMajorRequest,
  UpdateMajorRequest,
  ListMajorsQuery,
  Paginated,
  ImportResult,
} from "../../types/admin";

export async function listMajors(query?: ListMajorsQuery): Promise<Paginated<Major>> {
  return apiClient.get<Paginated<Major>>("/admin/majors", { params: query });
}

export async function getMajor(id: string): Promise<Major> {
  return apiClient.get<Major>(`/admin/majors/${id}`);
}

export async function createMajor(body: CreateMajorRequest): Promise<Major> {
  return apiClient.post<Major>("/admin/majors", body);
}

export async function updateMajor(id: string, body: UpdateMajorRequest): Promise<Major> {
  return apiClient.put<Major>(`/admin/majors/${id}`, body);
}

export async function deleteMajor(id: string): Promise<void> {
  return apiClient.delete<void>(`/admin/majors/${id}`);
}

export async function importMajors(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient.post<ImportResult>("/admin/majors/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export async function downloadMajorsTemplate(
  format: "xlsx" | "csv" = "xlsx",
): Promise<Blob> {
  return apiClient.get<Blob>("/admin/majors/import/template", {
    params: { format },
    responseType: "blob",
  });
}
