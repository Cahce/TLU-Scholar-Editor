/**
 * Client-side validation toolkit.
 *
 * - `VMSG`            — Vietnamese message catalog (single source of wording)
 * - validators        — reusable field validators returning `ValidationResult`
 * - email role checks — TLU staff/student domain rules (re-exported from the
 *                       existing admin helper so there is one import surface)
 */
export { VMSG } from "./messages";
export type { ValidationResult, FieldErrors } from "./types";
export { messageOf } from "./types";
export {
  validateRequired,
  validateEmail,
  validatePassword,
  validateMatch,
  validateMinLength,
  validateMaxLength,
} from "./validators";

// Role/domain-aware email validation already lived under admin/_shared; surface
// it here too without forcing existing importers to change.
export {
  validateEmailForRole,
  inferRoleFromEmail,
  STUDENT_DOMAIN,
  STAFF_DOMAIN,
  type EmailValidationResult,
} from "../../features/admin/_shared/email";
