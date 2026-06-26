import { ApiError } from "../api/client";

export function getApiErrorMessage(
  error: unknown,
  fallback = "Không thể tải dữ liệu từ máy chủ. Vui lòng thử lại sau.",
): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
