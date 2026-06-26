/**
 * Reusable client-side field validators.
 *
 * Each returns a {@link ValidationResult} ({ ok } | { ok:false; code; message })
 * with a Vietnamese message from {@link VMSG}. These pre-empt obvious errors
 * before a network call; the backend remains the source of truth for
 * server-side validation.
 *
 * Role/domain-aware email checks (TLU staff/student domains) live in
 * `features/admin/_shared/email.ts` and are re-exported from this module's
 * `index.ts` so there is one import surface.
 */
import { VMSG } from "./messages";
import type { ValidationResult } from "./types";

// Same pattern used by the admin email helper — keep them in sync.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ok: ValidationResult = { ok: true };

/** Non-empty (after trim). */
export function validateRequired(value: string, label?: string): ValidationResult {
  return value.trim()
    ? ok
    : { ok: false, code: "REQUIRED", message: VMSG.required(label) };
}

/** Required + basic email shape. */
export function validateEmail(value: string): ValidationResult {
  if (!value.trim()) {
    return { ok: false, code: "EMAIL_REQUIRED", message: VMSG.emailRequired };
  }
  return EMAIL_REGEX.test(value.trim())
    ? ok
    : { ok: false, code: "EMAIL_INVALID", message: VMSG.emailInvalid };
}

/** Required + minimum length (defaults to the password "required" wording). */
export function validatePassword(value: string, min = 6): ValidationResult {
  if (!value) {
    return { ok: false, code: "PASSWORD_REQUIRED", message: VMSG.passwordRequired };
  }
  return value.length >= min
    ? ok
    : { ok: false, code: "PASSWORD_TOO_SHORT", message: VMSG.passwordMin(min) };
}

/** Confirm field equals the source field. */
export function validateMatch(
  value: string,
  other: string,
  message: string = VMSG.passwordMismatch,
): ValidationResult {
  return value === other ? ok : { ok: false, code: "MISMATCH", message };
}

/** Length floor for an arbitrary field. */
export function validateMinLength(
  value: string,
  min: number,
  label: string,
): ValidationResult {
  return value.length >= min
    ? ok
    : { ok: false, code: "MIN_LENGTH", message: VMSG.minLength(label, min) };
}

/** Length ceiling for an arbitrary field. */
export function validateMaxLength(
  value: string,
  max: number,
  label: string,
): ValidationResult {
  return value.length <= max
    ? ok
    : { ok: false, code: "MAX_LENGTH", message: VMSG.maxLength(label, max) };
}
