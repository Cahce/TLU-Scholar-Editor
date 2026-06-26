import type { LucideIcon } from "lucide-react";

/** Loại mục tra cứu (ranh giới function/element ở Typst khá nhòe). */
export type RefKind = "function" | "element" | "type" | "module" | "group";

/** Một tham số của hàm/phần tử Typst. */
export interface ReferenceParam {
  name: string;
  /** Kiểu đầy đủ, vd "auto | relative | fraction". */
  type: string;
  /** Giá trị mặc định, vd "auto", "0% + 5pt". */
  default?: string;
  /** Cấu hình được qua set rule. */
  settable?: boolean;
  /** Truyền theo vị trí (positional). */
  positional?: boolean;
  /** Mô tả tiếng Việt. */
  desc: string;
}

/** Ví dụ áp dụng một tham số: code + ảnh snapshot + chú thích. */
export interface ReferenceExample {
  /** Đoạn Typst (hiển thị + dùng sinh ảnh nếu có snapshotId). */
  code: string;
  /** Chú thích: tham số nào được minh hoạ. */
  caption?: string;
  /** Có → sinh ảnh /help-previews/ref/<snapshotId>.svg (qua manifest). */
  snapshotId?: string;
  /** Bề rộng trang khi render snapshot (mặc định "auto"). */
  width?: string;
}

/** Một hàm/phần tử/type trong tài liệu Typst. */
export interface ReferenceFn {
  name: string;
  /** Dùng cho route /:category/:fn. */
  slug: string;
  kind: RefKind;
  signature: string;
  summary: string;
  params: ReferenceParam[];
  /** Đoạn Typst mẫu (hiển thị qua CodeBlock). */
  examples?: string[];
  /** Id ảnh snapshot: /help-previews/ref/<snapshotId>.svg. */
  snapshotId?: string;
  /** Liên kết tài liệu gốc. */
  docUrl: string;
  /** Cảnh báo lệch phiên bản (vd "curve thay cho path"). */
  versionNote?: string;
  /** Định nghĩa con: table.cell, gradient.linear, curve.move, rgb... (đệ quy 1 cấp). */
  members?: ReferenceFn[];
  /** Ví dụ áp dụng TỪNG tham số (mỗi cái có ảnh riêng). */
  paramExamples?: ReferenceExample[];
}

/** Một nhóm (category) trong reference. */
export interface ReferenceCategory {
  slug: string;
  title: string;
  icon: LucideIcon;
  summary: string;
  docUrl: string;
  fns: ReferenceFn[];
}
