import type { Permission, User } from "../types/api";

/**
 * Client-side RBAC check. Permission values are backend-authoritative
 * (received via login / `/auth/me`); this only reads what the backend granted.
 */
export function userCan(user: User | null, permission: Permission): boolean {
  return !!user && user.permissions.includes(permission);
}
