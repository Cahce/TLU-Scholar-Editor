import { FileType } from "lucide-react";
import type { ReferenceCategory } from "./types";

const DOC = "https://typst.app/docs/reference/pdf/";
const A11Y = "Tính năng trợ năng THỬ NGHIỆM — cần bật cờ tính năng a11y-extras; có thể đổi/loại bỏ ở bản sau.";

export const pdf: ReferenceCategory = {
  slug: "pdf",
  title: "Xuất PDF (PDF)",
  icon: FileType,
  summary: "Các hàm liên quan đầu ra PDF: đánh dấu nội dung trang trí, đính kèm tệp và hỗ trợ trợ năng bảng (thử nghiệm). Gọi qua tiền tố pdf.",
  docUrl: DOC,
  fns: [
    {
      name: "pdf.artifact",
      slug: "artifact",
      kind: "function",
      signature: "pdf.artifact(kind, body)",
      summary: "Đánh dấu nội dung là 'artifact' (trang trí, không mang nghĩa) — bị bỏ qua khi trích xuất/đọc màn hình.",
      docUrl: `${DOC}artifact/`,
      params: [
        { name: "kind", type: "str", default: '"other"', settable: true, desc: 'Loại artifact: "page", "pagination", "layout", "other".' },
        { name: "body", type: "content", positional: true, desc: "Nội dung được đánh dấu là artifact." },
      ],
      examples: [`#pdf.artifact[Đường kẻ trang trí]`],
    },
    {
      name: "pdf.embed",
      slug: "embed",
      kind: "function",
      signature: "pdf.embed(path, relationship, mime-type, description)",
      summary: "Đính kèm một tệp vào PDF đầu ra (vd file dữ liệu nguồn).",
      docUrl: `${DOC}embed/`,
      params: [
        { name: "path", type: "str | bytes", positional: true, desc: "Đường dẫn (hoặc dữ liệu) tệp cần đính kèm." },
        { name: "relationship", type: "none | str", default: "none", settable: true, desc: "Quan hệ của tệp với tài liệu (PDF/A)." },
        { name: "mime-type", type: "none | str", default: "none", settable: true, desc: "Kiểu MIME của tệp." },
        { name: "description", type: "none | str", default: "none", settable: true, desc: "Mô tả tệp đính kèm." },
      ],
      examples: [`#pdf.embed("du-lieu.csv")`],
    },
    {
      name: "pdf.data-cell",
      slug: "data-cell",
      kind: "function",
      signature: "pdf.data-cell(body)",
      summary: "Đánh dấu rõ một ô là ô dữ liệu (data cell) trong bảng — hỗ trợ trợ năng.",
      docUrl: `${DOC}data-cell/`,
      versionNote: A11Y,
      params: [{ name: "body", type: "content", positional: true, desc: "Nội dung ô dữ liệu." }],
      examples: [`#pdf.data-cell[9.0]`],
    },
    {
      name: "pdf.header-cell",
      slug: "header-cell",
      kind: "function",
      signature: "pdf.header-cell(level, scope, body)",
      summary: "Đánh dấu rõ một ô là ô tiêu đề (header cell) trong bảng — hỗ trợ trợ năng.",
      docUrl: `${DOC}header-cell/`,
      versionNote: A11Y,
      params: [
        { name: "level", type: "int", default: "1", settable: true, desc: "Cấp tiêu đề của ô." },
        { name: "scope", type: "str", default: '"col"', settable: true, desc: 'Phạm vi: "col", "row", "both".' },
        { name: "body", type: "content", positional: true, desc: "Nội dung ô tiêu đề." },
      ],
      examples: [`#pdf.header-cell[Họ và tên]`],
    },
    {
      name: "pdf.table-summary",
      slug: "table-summary",
      kind: "function",
      signature: "pdf.table-summary(summary, body)",
      summary: "Cung cấp bản tóm tắt mục đích/cấu trúc cho một bảng phức tạp — hỗ trợ trợ năng.",
      docUrl: `${DOC}table-summary/`,
      versionNote: A11Y,
      params: [
        { name: "summary", type: "str", settable: true, desc: "Tóm tắt cấu trúc bảng cho screen reader." },
        { name: "body", type: "content", positional: true, desc: "Bảng được mô tả." },
      ],
      examples: [`#pdf.table-summary(summary: "Bảng điểm theo môn", table(...))`],
    },
  ],
};
