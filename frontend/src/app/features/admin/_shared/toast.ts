import { toast } from "sonner";

/**
 * Centralized toast wording for admin CRUD flows. Keeps messaging consistent
 * across faculties / departments / majors / classes / teachers / students / accounts.
 */

function extractMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err.length > 0) return err;
  return "Có lỗi xảy ra";
}

export const adminToast = {
  created(resource: string, name?: string, options?: { description?: string }) {
    return toast.success(
      name ? `Đã thêm ${resource} "${name}"` : `Đã thêm ${resource}`,
      options,
    );
  },
  updated(resource: string, name?: string, options?: { description?: string }) {
    return toast.success(
      name ? `Đã cập nhật ${resource} "${name}"` : `Đã cập nhật ${resource}`,
      options,
    );
  },
  deleted(resource: string, name?: string) {
    return toast.success(
      name ? `Đã xóa ${resource} "${name}"` : `Đã xóa ${resource}`,
    );
  },
  linkedAccount(resource: string) {
    return toast.success(`Đã liên kết tài khoản với ${resource}`);
  },
  unlinkedAccount(resource: string) {
    return toast.success(`Đã hủy liên kết tài khoản khỏi ${resource}`);
  },
  imported(resource: string, count: number) {
    return toast.success(`Đã nhập ${count} ${resource} từ file`);
  },
  createdWithAccount(resource: string, name?: string) {
    return toast.success(
      name
        ? `Đã thêm ${resource} "${name}" và tài khoản liên kết`
        : `Đã thêm ${resource} và tài khoản liên kết`,
    );
  },
  /** Generic success toast for flows the CRUD helpers don't cover. */
  success(message: string, options?: { description?: string }) {
    return toast.success(message, options);
  },
  /** Generic info toast. */
  info(message: string) {
    return toast(message);
  },
  /** Error toast with extracted backend message. */
  error(action: string, err: unknown) {
    return toast.error(`${action} thất bại: ${extractMessage(err)}`);
  },
  /** Plain error toast (no action prefix). */
  errorRaw(err: unknown) {
    return toast.error(extractMessage(err));
  },
};
