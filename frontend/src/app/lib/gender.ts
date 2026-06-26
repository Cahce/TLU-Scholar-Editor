import type { Gender } from "../types/api";

const GENDER_LABELS: Record<Gender, string> = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
};

/** Vietnamese label for a backend gender enum value. */
export function genderLabel(
  value: Gender | null | undefined,
  fallback = "Chưa cập nhật",
): string {
  if (!value) return fallback;
  return GENDER_LABELS[value] ?? fallback;
}

/** Options for gender <select> controls in admin add/edit forms. */
export const GENDER_OPTIONS: Array<{ value: Gender; label: string }> = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
  { value: "other", label: "Khác" },
];
