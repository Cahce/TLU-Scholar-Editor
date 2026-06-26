/**
 * Canonical role badge styling.
 *
 * Single source of truth for the colors used on role badges across the app
 * (header user chip, admin account table, …). Centralized so the three roles
 * stay visually distinct everywhere — previously the header used purple for
 * `admin` while the accounts table used purple for `student`, so the same
 * color meant two different roles depending on the screen.
 *
 * Hues are chosen to be distinct from each other and from the status badges
 * (emerald = active, rose = inactive):
 *   - admin   → slate (neutral/authoritative gray)
 *   - teacher → blue
 *   - student → purple
 */

import type { UserRole } from "../types/api";

export const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  admin: "bg-slate-100 text-slate-700 border-slate-200",
  teacher: "bg-blue-50 text-blue-700 border-blue-200",
  student: "bg-purple-50 text-purple-700 border-purple-200",
};
