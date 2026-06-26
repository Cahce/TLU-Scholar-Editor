import { redirect } from "react-router";
import { apiClient } from "../api/client";
import { useAuthStore, normalizeUser } from "../stores/authStore";
import type { CurrentUserResponse, User } from "../types/api";

/**
 * Validate the current session against the backend and (re)hydrate the user.
 *
 * Used by route guards when a token exists but the user is not in the store
 * (e.g. after a reload or a deep-link). On success the store user/permissions
 * are refreshed. On any auth failure (401 / revoked / inactive) the auth state
 * is cleared and the caller is redirected to the login page.
 *
 * Uses `skipAuthRedirect` so the global 401 interceptor does NOT hard-redirect,
 * letting the guard perform a clean SPA redirect.
 */
export async function validateSession(): Promise<User> {
  try {
    const res = await apiClient.get<never, CurrentUserResponse>("/auth/me", {
      skipAuthRedirect: true,
    });
    const user = normalizeUser(res.user);
    useAuthStore.getState().setUser(user);
    return user;
  } catch {
    useAuthStore.getState().clearAuth();
    throw redirect("/");
  }
}

/**
 * Like {@link validateSession} but swallows failures and returns `null`
 * instead of throwing a redirect. Used by the login route loader so the login
 * form can still render when the stored token is invalid.
 */
export async function tryValidate(): Promise<User | null> {
  try {
    const res = await apiClient.get<never, CurrentUserResponse>("/auth/me", {
      skipAuthRedirect: true,
    });
    const user = normalizeUser(res.user);
    useAuthStore.getState().setUser(user);
    return user;
  } catch {
    useAuthStore.getState().clearAuth();
    return null;
  }
}
