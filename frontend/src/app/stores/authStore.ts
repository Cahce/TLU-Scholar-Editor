import { create } from "zustand";
import type { Permission, User } from "../types/api";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

/**
 * Guarantee the invariant every consumer relies on: a `User` always carries a
 * `permissions` array. The backend derives permissions from role and includes
 * them on login / `/auth/me`, but if a response ever omits the field (older
 * server build, partial deploy) the route guards and `hasPermission` would
 * otherwise throw `Cannot read properties of undefined (reading 'includes')`
 * and crash the whole app. Defaulting to `[]` degrades safely (no permissions
 * granted) instead. Permissions are backend-authoritative — never re-derived
 * from role on the client.
 */
export function normalizeUser(user: User): User {
  return user.permissions ? user : { ...user, permissions: [] };
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  /**
   * Set both tokens (and optionally the user) — used by login and by the silent
   * refresh flow. The user is preserved when omitted.
   */
  setTokens: (accessToken: string, refreshToken: string, user?: User) => void;
  /**
   * Set/refresh the access token + user without touching the refresh token.
   * Kept for callers that only re-hydrate the user (e.g. `/auth/me`).
   */
  setAuth: (accessToken: string, user: User) => void;
  /** Set/refresh the current user (e.g. after /auth/me) without changing tokens. */
  setUser: (user: User) => void;
  clearAuth: () => void;
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  /** True if the current user's role grants the given permission (backend-authoritative). */
  hasPermission: (permission: Permission) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
  refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
  user: null,
  isAuthenticated: !!localStorage.getItem(ACCESS_TOKEN_KEY),

  setTokens: (accessToken: string, refreshToken: string, user?: User) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    set((state) => ({
      accessToken,
      refreshToken,
      user: user ? normalizeUser(user) : state.user,
      isAuthenticated: true,
    }));
  },

  setAuth: (accessToken: string, user: User) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    set({
      accessToken,
      user: normalizeUser(user),
      isAuthenticated: true,
    });
  },

  setUser: (user: User) => {
    set({ user: normalizeUser(user), isAuthenticated: true });
  },

  clearAuth: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    });
  },

  getAccessToken: () => {
    return get().accessToken;
  },

  getRefreshToken: () => {
    return get().refreshToken;
  },

  hasPermission: (permission: Permission) => {
    const user = get().user;
    return !!user && user.permissions.includes(permission);
  },
}));
