import { apiClient } from "../client";
import type {
  Account,
  CreateAccountRequest,
  UpdateAccountRequest,
  ResetAccountPasswordRequest,
  ListAccountsQuery,
  Paginated,
  ImportResult,
} from "../../types/admin";

export async function listAccounts(query?: ListAccountsQuery): Promise<Paginated<Account>> {
  return apiClient.get<Paginated<Account>>("/admin/accounts", { params: query });
}

export async function getAccount(id: string): Promise<Account> {
  return apiClient.get<Account>(`/admin/accounts/${id}`);
}

export async function createAccount(body: CreateAccountRequest): Promise<Account> {
  return apiClient.post<Account>("/admin/accounts", body);
}

export async function updateAccount(id: string, body: UpdateAccountRequest): Promise<Account> {
  return apiClient.patch<Account>(`/admin/accounts/${id}`, body);
}

export async function deleteAccount(id: string): Promise<void> {
  return apiClient.delete<void>(`/admin/accounts/${id}`);
}

export async function resetAccountPassword(
  id: string,
  body: ResetAccountPasswordRequest
): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>(`/admin/accounts/${id}/reset-password`, body);
}

export async function importAccounts(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient.post<ImportResult>("/admin/accounts/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export async function downloadAccountsTemplate(
  format: "xlsx" | "csv" = "xlsx",
): Promise<Blob> {
  return apiClient.get<Blob>("/admin/accounts/import/template", {
    params: { format },
    responseType: "blob",
  });
}
