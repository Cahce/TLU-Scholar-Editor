import { Hash } from "lucide-react";
import type { ReferenceCategory } from "./types";

const DOC = "https://typst.app/docs/reference/introspection/";

export const introspection: ReferenceCategory = {
  slug: "introspection",
  title: "Tự quan sát (Introspection)",
  icon: Hash,
  summary: "Bộ đếm, trạng thái dùng chung, vị trí và truy vấn phần tử — cho phép các phần tài liệu 'trao đổi' với nhau. Hầu hết cần từ khoá context.",
  docUrl: DOC,
  fns: [
    {
      name: "counter",
      slug: "counter",
      kind: "function",
      signature: 'counter(key)  ·  .step() .update() .get() .at() .display() .final()',
      summary: "Đếm qua trang, tiêu đề, hình, hoặc bộ đếm tuỳ biến.",
      docUrl: `${DOC}counter/`,
      snapshotId: "introspection-counter",
      params: [
        { name: "key", type: "str | function | label | selector", positional: true, desc: 'Đối tượng đếm: tên tuỳ biến, page, hoặc selector (vd heading).' },
        { name: ".step(level)", type: "method", desc: "Tăng bộ đếm (theo cấp)." },
        { name: ".update(value | fn)", type: "method", desc: "Đặt/biến đổi giá trị." },
        { name: ".get() · .at(loc) · .final()", type: "method", desc: "Đọc giá trị hiện tại / tại vị trí / cuối tài liệu (cần context)." },
        { name: ".display(numbering)", type: "method", desc: "Hiển thị giá trị theo kiểu đánh số." },
      ],
      examples: [`#let c = counter("muc")
#c.step()
#context c.get().first()  // 1`],
    },
    {
      name: "state",
      slug: "state",
      kind: "function",
      signature: "state(key, init)  ·  .update() .get() .at() .final()",
      summary: "Quản lý phần có trạng thái của tài liệu (lưu và cập nhật giá trị theo vị trí).",
      docUrl: `${DOC}state/`,
      snapshotId: "introspection-state",
      params: [
        { name: "key", type: "str", positional: true, desc: "Khoá định danh trạng thái." },
        { name: "init", type: "any", positional: true, desc: "Giá trị khởi tạo." },
        { name: ".update(value | fn)", type: "method", desc: "Cập nhật trạng thái tại vị trí hiện tại." },
        { name: ".get() · .at(loc) · .final()", type: "method", desc: "Đọc giá trị (cần context)." },
      ],
      examples: [`#let s = state("ten", "TLU")
#context s.get()  // "TLU"`],
    },
    {
      name: "here",
      slug: "here",
      kind: "function",
      signature: "here()",
      summary: "Trả về vị trí hiện tại trong tài liệu (chỉ dùng trong context).",
      docUrl: `${DOC}here/`,
      snapshotId: "introspection-here",
      params: [],
      examples: [`#context here().page()  // số trang hiện tại`],
    },
    {
      name: "locate",
      slug: "locate",
      kind: "function",
      signature: "locate(selector)",
      summary: "Xác định vị trí của một phần tử qua selector (cần context).",
      docUrl: `${DOC}locate/`,
      params: [{ name: "selector", type: "label | selector | location", positional: true, desc: "Phần tử cần định vị." }],
      examples: [`#context locate(<intro>).page()`],
    },
    {
      name: "location",
      slug: "location",
      kind: "type",
      signature: "location  ·  .page() .position() .page-numbering()",
      summary: "Định danh duy nhất một phần tử: trang và toạ độ của nó.",
      docUrl: `${DOC}location/`,
      params: [
        { name: ".page()", type: "method", desc: "Số trang chứa phần tử." },
        { name: ".position()", type: "method", desc: "Toạ độ (x, y) trên trang." },
      ],
      examples: [`#context here().position()`],
    },
    {
      name: "query",
      slug: "query",
      kind: "function",
      signature: "query(target)",
      summary: "Tìm các phần tử trong tài liệu theo selector để truy xuất thông tin (cần context).",
      docUrl: `${DOC}query/`,
      snapshotId: "introspection-query",
      params: [{ name: "target", type: "selector | label", positional: true, desc: "Bộ chọn phần tử cần tìm." }],
      examples: [`#context query(heading).len()  // số tiêu đề`],
    },
    {
      name: "metadata",
      slug: "metadata",
      kind: "function",
      signature: "metadata(value)",
      summary: "Đưa một giá trị vào hệ thống truy vấn mà không tạo nội dung hiển thị.",
      docUrl: `${DOC}metadata/`,
      params: [{ name: "value", type: "any", positional: true, desc: "Dữ liệu ẩn để query lấy về sau." }],
      examples: [`#metadata("v1.0") <ver>`],
    },
  ],
};
