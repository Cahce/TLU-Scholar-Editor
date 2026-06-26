/**
 * Nguồn sự thật DUY NHẤT cho phiên bản Typst tương thích với trình soạn thảo.
 *
 * Đã xác minh: toolchain `@myriaddreamin/typst.ts@0.7.0` (frontend) và
 * `@myriaddreamin/typst-ts-node-compiler@0.7.0-rc2` (backend) đóng gói Typst
 * upstream **v0.14.2** (release notes Myriad-Dreamin/typst.ts: "Bumped typst to
 * v0.14.2"). Khi nâng cấp toolchain, chỉ cần sửa các hằng số dưới đây.
 */

/** Dòng phiên bản hiển thị trên badge, ví dụ "0.14.x". */
export const TYPST_VERSION = "0.14.x";

/** Phiên bản Typst chính xác đang bundle. */
export const TYPST_VERSION_EXACT = "0.14.2";

/** Tài liệu chính thức của Typst. */
export const TYPST_DOCS_URL = "https://typst.app/docs/";

/** Nhãn badge: "Tương thích Typst v0.14.x". */
export const TYPST_COMPAT_LABEL = `Tương thích Typst v${TYPST_VERSION}`;
