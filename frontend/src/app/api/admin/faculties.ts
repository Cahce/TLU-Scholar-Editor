import { apiClient } from "../client";
import type {
  Faculty,
  CreateFacultyRequest,
  UpdateFacultyRequest,
  ListFacultiesQuery,
  Paginated,
  ImportResult,
} from "../../types/admin";

export async function listFaculties(query?: ListFacultiesQuery): Promise<Paginated<Faculty>> {
  return apiClient.get<Paginated<Faculty>>("/admin/faculties", { params: query });
}

export async function getFaculty(id: string): Promise<Faculty> {
  return apiClient.get<Faculty>(`/admin/faculties/${id}`);
}

export async function createFaculty(body: CreateFacultyRequest): Promise<Faculty> {
  return apiClient.post<Faculty>("/admin/faculties", body);
}

export async function updateFaculty(id: string, body: UpdateFacultyRequest): Promise<Faculty> {
  return apiClient.put<Faculty>(`/admin/faculties/${id}`, body);
}

export async function deleteFaculty(id: string): Promise<void> {
  return apiClient.delete<void>(`/admin/faculties/${id}`);
}

export async function importFaculties(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient.post<ImportResult>("/admin/faculties/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export async function downloadFacultiesTemplate(
  format: "xlsx" | "csv" = "xlsx",
): Promise<Blob> {
  return apiClient.get<Blob>("/admin/faculties/import/template", {
    params: { format },
    responseType: "blob",
  });
}
