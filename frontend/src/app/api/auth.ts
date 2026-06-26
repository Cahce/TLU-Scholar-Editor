import { apiClient } from "./client";
import { useAuthStore } from "../stores/authStore";
import type {
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  CurrentUserResponse,
  MessageResponse,
  UserWithProfileResponse,
} from "../types/api";

/**
 * Login with email and password
 * Stores accessToken and user in auth store on success
 */
export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<never, LoginResponse>(
    "/auth/login",
    data,
  );

  // Store both tokens + user in the auth store
  useAuthStore
    .getState()
    .setTokens(response.accessToken, response.refreshToken, response.user);

  return response;
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<CurrentUserResponse> {
  return apiClient.get<never, CurrentUserResponse>("/auth/me");
}

/**
 * Get user information by email (includes student/teacher profile)
 */
export async function getUserByEmail(
  email: string,
): Promise<UserWithProfileResponse> {
  return apiClient.get<never, UserWithProfileResponse>(
    `/auth/user/${encodeURIComponent(email)}`,
  );
}

/**
 * Change the current user's password.
 * On success the backend clears the `mustChangePassword` flag.
 */
export function changePassword(
  data: ChangePasswordRequest,
): Promise<MessageResponse> {
  return apiClient.post<never, MessageResponse>("/auth/change-password", data);
}

/**
 * Logout current user
 * Calls backend logout endpoint, then clears auth store
 */
export async function logout(): Promise<void> {
  const refreshToken = useAuthStore.getState().getRefreshToken();
  try {
    // Send the refresh token so the backend can revoke the whole session family.
    await apiClient.post<never, MessageResponse>("/auth/logout", { refreshToken });
  } catch (error) {
    // Even if backend logout fails, clear local auth state
    console.error("Logout error:", error);
  } finally {
    useAuthStore.getState().clearAuth();
  }
}
