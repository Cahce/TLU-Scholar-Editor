/**
 * Email/role helpers used by admin add-forms.
 *
 * Mirrors backend EnvEmailPolicy in
 * backend/src/modules/admin/domain/AccountManagement/Policies.ts so the
 * client side warns the user before submit instead of after a server round-trip.
 */

export type UserRole = "admin" | "teacher" | "student";

export const STUDENT_DOMAIN = "@e.tlu.edu.vn";
export const STAFF_DOMAIN = "@tlu.edu.vn";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EmailValidationResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

/**
 * Detect the most plausible role for a given email by its domain suffix.
 * Returns null when the email is empty/malformed or doesn't match the known
 * TLU domains (caller may keep the user's current role choice in that case).
 *
 * Note: `STAFF_DOMAIN` is a suffix of `STUDENT_DOMAIN`, so the student check
 * must run first.
 */
export function inferRoleFromEmail(email: string): UserRole | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalized)) return null;
  if (normalized.endsWith(STUDENT_DOMAIN)) return "student";
  if (normalized.endsWith(STAFF_DOMAIN)) return "teacher";
  return null;
}

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "quản trị viên",
  teacher: "giảng viên",
  student: "sinh viên",
};

/**
 * Validate an email against a target role. Message wording matches backend
 * EnvEmailPolicy exactly so the same text surfaces whether the check runs
 * client-side or server-side.
 */
export function validateEmailForRole(
  email: string,
  role: UserRole,
): EmailValidationResult {
  if (!EMAIL_REGEX.test(email)) {
    return {
      ok: false,
      code: "INVALID_EMAIL_FORMAT",
      message: "Email không đúng định dạng",
    };
  }
  const normalized = email.toLowerCase().trim();
  if (role === "student") {
    if (!normalized.endsWith(STUDENT_DOMAIN)) {
      return {
        ok: false,
        code: "INVALID_EMAIL_DOMAIN",
        message: `Email không đúng định dạng cho vai trò sinh viên. Yêu cầu: *${STUDENT_DOMAIN}`,
      };
    }
    return { ok: true };
  }
  // teacher and admin both require the staff domain.
  if (!normalized.endsWith(STAFF_DOMAIN) || normalized.endsWith(STUDENT_DOMAIN)) {
    return {
      ok: false,
      code: "INVALID_EMAIL_DOMAIN",
      message: `Email không đúng định dạng cho vai trò ${ROLE_LABEL[role]}. Yêu cầu: *${STAFF_DOMAIN}`,
    };
  }
  return { ok: true };
}
