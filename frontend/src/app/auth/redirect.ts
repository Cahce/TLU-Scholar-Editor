import type { UserRole } from "../types/api";

/**
 * Validate a `?redirect=` destination. Only same-origin absolute paths are
 * allowed; this blocks open-redirect vectors like `//evil.com`,
 * `https://evil.com`, or `javascript:...`.
 */
export function safeRedirectParam(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Must be an internal path ("/..."), but not protocol-relative ("//...").
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

/** Default landing route for a role after login. */
export function dashboardPathForRole(role: UserRole): string {
  if (role === "admin") return "/admin/overview";
  if (role === "teacher") return "/teacher";
  return "/student";
}
