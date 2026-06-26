import { redirect, type LoaderFunctionArgs } from "react-router";
import { useAuthStore } from "../stores/authStore";
import type { Permission, User, UserRole } from "../types/api";
import { validateSession, tryValidate } from "./session";
import { dashboardPathForRole } from "./redirect";

const FORCE_CHANGE_PASSWORD_PATH = "/doi-mat-khau";

/** Build the login URL, preserving the intended destination via `?redirect=`. */
function loginRedirectUrl(request: Request): string {
  const url = new URL(request.url);
  const dest = url.pathname + url.search;
  if (dest === "/" || dest === "") return "/";
  return `/?redirect=${encodeURIComponent(dest)}`;
}

/**
 * Core authentication guard.
 * - No token → redirect to login (keeping intended destination).
 * - Token but no user (reload / deep-link) → validate via `/auth/me`.
 * - `mustChangePassword` → force the change-password page.
 * Returns the authenticated user.
 */
export async function requireAuth(request: Request): Promise<User> {
  const store = useAuthStore.getState();
  const token = store.getAccessToken();

  if (!token) {
    throw redirect(loginRedirectUrl(request));
  }

  let user = store.user;
  if (!user) {
    user = await validateSession(); // sets store or throws redirect("/")
  }

  // Force the password change before allowing any other authenticated route.
  if (user.mustChangePassword) {
    const pathname = new URL(request.url).pathname;
    if (pathname !== FORCE_CHANGE_PASSWORD_PATH) {
      throw redirect(FORCE_CHANGE_PASSWORD_PATH);
    }
  }

  return user;
}

/** Require the user's role to be one of `roles`, else redirect to their dashboard. */
export function requireRole(roles: UserRole[]) {
  return async ({ request }: LoaderFunctionArgs): Promise<User> => {
    const user = await requireAuth(request);
    if (!roles.includes(user.role)) {
      throw redirect(dashboardPathForRole(user.role));
    }
    return user;
  };
}

/** Require a specific permission, else redirect to the user's dashboard. */
export function requirePermission(permission: Permission) {
  return async ({ request }: LoaderFunctionArgs): Promise<User> => {
    const user = await requireAuth(request);
    if (!user.permissions.includes(permission)) {
      throw redirect(dashboardPathForRole(user.role));
    }
    return user;
  };
}

/**
 * Require at least one of `permissions`, else redirect to the user's dashboard.
 * Used by the workspace route so admins (who have `templates:manage` but not
 * `editor:access`) can open the editor for template authoring. Per-project
 * access is still enforced by the backend ownership policy.
 */
export function requireAnyPermission(permissions: Permission[]) {
  return async ({ request }: LoaderFunctionArgs): Promise<User> => {
    const user = await requireAuth(request);
    if (!permissions.some((p) => user.permissions.includes(p))) {
      throw redirect(dashboardPathForRole(user.role));
    }
    return user;
  };
}

/**
 * Login route loader: if the user is already authenticated, redirect away from
 * the login page (to the force-change-password page or their dashboard).
 * Returns `null` (render the login form) when there is no valid session.
 */
export async function redirectIfAuthenticated(): Promise<null> {
  const store = useAuthStore.getState();
  if (!store.getAccessToken()) return null;

  const user = store.user ?? (await tryValidate());
  if (!user) return null;

  if (user.mustChangePassword) {
    throw redirect(FORCE_CHANGE_PASSWORD_PATH);
  }
  throw redirect(dashboardPathForRole(user.role));
}
