/**
 * Shared result type for client-side field validators.
 *
 * Mirrors the shape already used by `features/admin/_shared/email.ts` so the two
 * converge on one contract: a validator either passes (`ok: true`) or fails with
 * a stable machine `code` plus a ready-to-render Vietnamese `message`.
 */
export type ValidationResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

/** Map of field name → Vietnamese error message (empty/omitted = no error). */
export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;

/** Convenience: turn a {@link ValidationResult} into a message string ("" when ok). */
export function messageOf(result: ValidationResult): string {
  return result.ok ? "" : result.message;
}
