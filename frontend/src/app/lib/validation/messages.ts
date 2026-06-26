/**
 * Central Vietnamese validation/message catalog.
 *
 * Single source of wording for client-side form validation so messages stay
 * consistent and are not re-typed per form. Keep strings concise and
 * professional per `guidelines/Guidelines.md` (Vietnamese Content Style).
 *
 * Functions are used for parameterized messages (field label, min length, …);
 * plain constants for fixed text.
 */
export const VMSG = {
  /** Generic "required" — `${label} không được để trống`. */
  required: (label = "Trường này"): string => `${label} không được để trống`,
  /** All fields of a small form are empty / partially filled. */
  allFieldsRequired: "Vui lòng điền đầy đủ các trường",

  // Email
  emailRequired: "Vui lòng nhập email",
  emailInvalid: "Email không hợp lệ",

  // Password
  passwordRequired: "Vui lòng nhập mật khẩu",
  passwordMin: (n: number): string => `Mật khẩu phải có ít nhất ${n} ký tự`,
  passwordConfirmRequired: "Vui lòng xác nhận mật khẩu",
  passwordMismatch: "Mật khẩu xác nhận không khớp",
  passwordSameAsOld: "Mật khẩu mới phải khác mật khẩu cũ",

  // Length
  minLength: (label: string, n: number): string =>
    `${label} phải có ít nhất ${n} ký tự`,
  maxLength: (label: string, n: number): string =>
    `${label} tối đa ${n} ký tự`,

  // Network / fallback
  serverUnreachable: "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.",
  genericError: "Đã có lỗi xảy ra. Vui lòng thử lại.",
} as const;
