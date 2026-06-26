import type { ReactNode } from "react";
import type { Permission } from "../../types/api";
import { usePermission } from "../../hooks/usePermission";

interface CanProps {
  /** Permission required to render `children`. */
  permission: Permission;
  children: ReactNode;
  /** Optional content rendered when the permission is missing. */
  fallback?: ReactNode;
}

/**
 * Conditionally renders UI based on the current user's RBAC permissions.
 *
 * @example
 * <Can permission="users:manage">
 *   <Button>Quản lý tài khoản</Button>
 * </Can>
 */
export function Can({ permission, children, fallback = null }: CanProps) {
  const allowed = usePermission(permission);
  return <>{allowed ? children : fallback}</>;
}
