import { useCallback } from "react";
import { useAuthStore } from "../stores/authStore";
import type { Permission } from "../types/api";

/**
 * Read-only view of the authenticated identity for UI code.
 * Role and permissions come from the auth store (backend-authoritative).
 */
export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const can = useCallback(
    (permission: Permission) => !!user && user.permissions.includes(permission),
    [user],
  );

  return {
    user,
    role: user?.role ?? null,
    isAuthenticated,
    can,
  };
}
