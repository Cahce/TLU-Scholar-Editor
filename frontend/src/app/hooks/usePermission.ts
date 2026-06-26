import { useAuthStore } from "../stores/authStore";
import type { Permission } from "../types/api";

/**
 * Returns true if the current user has the given permission.
 * Re-renders only when the result changes.
 */
export function usePermission(permission: Permission): boolean {
  return useAuthStore(
    (state) => !!state.user && state.user.permissions.includes(permission),
  );
}
