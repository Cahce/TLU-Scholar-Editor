import { Link } from "react-router";
import { FileDown, FolderTree, PanelsTopLeft, PenLine, Wrench } from "lucide-react";
import { HelpLayout, type HelpSection } from "../components/HelpLayout";
import { Callout } from "../components/Callout";

const SECTIONS: HelpSection[] = [
  {
    id: "tong-quan-editor",
    label: "Tổng quan giao diện",
    icon: PanelsTopLeft,
    content: (
      <>
        <p>
          Trình soạn thảo (workspace) chia làm ba khu vực: thanh công cụ panel bên trái, khung soạn
          thảo ở giữa, và khung Preview (PDF) bên phải.
        </p>
        <ul className="list-disc pl-5 space-y-1.5 marker:text-slate-400">
          <li>
            <strong>Thanh panel trái</strong>: chuyển giữa các bảng — Tệp, Tìm kiếm, Mục lục, Tài
            liệu tham khảo, Lỗi biên dịch, Thiết lập.
          </li>
          <li>
            <strong>Khung soạn thảo</strong>: nơi gõ mã Typst, có tô màu cú pháp và nhiều tab.
          </li>
          <li>
            <strong>Khung Preview</strong>: hiển thị bản PDF sau khi biên dịch.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "quan-ly-file",
    label: "Quản lý tệp",
    icon: FolderTree,
    content: (
      <>
        <p>
          Mở bảng <strong>Tệp</strong> để xem cây thư mục của project. Mỗi project có một file chính
          (thường là <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[13px]">main.typ</code>)
          làm điểm biên dịch.
        </p>
        <ul className="list-disc pl-5 space-y-1.5 marker:text-slate-400">
          <li>Tạo, đổi tên, xoá file và thư mục ngay trong cây thư mục.</li>
          <li>
            <strong>Tải lên</strong> ảnh, font (.ttf), file dữ liệu hoặc <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[13px]">.bib</code>{" "}
            để dùng trong tài liệu.
          </li>
          <li>Tham chiếu file theo đường dẫn tương đối đúng với vị trí trong cây thư mục.</li>
        </ul>
      </>
    ),
  },
  {
    id: "soan-thao",
    label: "Soạn thảo & chèn nhanh",
    icon: PenLine,
    content: (
      <>
        <ul className="list-disc pl-5 space-y-1.5 marker:text-slate-400">
          <li>
            <strong>Nhiều tab</strong>: mở song song nhiều file, chuyển nhanh giữa các tab.
          </li>
          <li>
            <strong>Thanh chèn nhanh</strong>: chèn công thức <strong>toán</strong>, <strong>hình</strong>,{" "}
            <strong>bảng</strong>, màu sắc và ký tự đặc biệt mà không cần nhớ cú pháp.
          </li>
          <li>
            <strong>Tự động lưu (autosave)</strong>: thay đổi được lưu sau khi bạn ngừng gõ; chỉ báo
            trạng thái cho biết <em>đang lưu / đã lưu / lỗi lưu</em>.
          </li>
        </ul>
        <Callout tone="tip" title="Mẹo gõ tiếng Việt & cú pháp">
          Cú pháp Typst và cách gõ tiếng Việt xem chi tiết ở{" "}
          <Link to="/huong-dan/cu-phap-typst" className="font-medium text-[#007bff] hover:underline">
            Cú pháp Typst &amp; gõ tiếng Việt
          </Link>
          .
        </Callout>
      </>
    ),
  },
  {
    id: "bien-dich-xuat",
    label: "Biên dịch, Preview & Xuất PDF",
    icon: FileDown,
    content: (
      <>
        <ul className="list-disc pl-5 space-y-1.5 marker:text-slate-400">
          <li>
            <strong>Biên dịch &amp; Preview</strong>: hệ thống biên dịch tài liệu và cập nhật bản
            xem trước PDF ở khung bên phải.
          </li>
          <li>
            <strong>Xuất PDF</strong>: tạo bản PDF chính thức để tải về (biên dịch phía máy chủ,
            phù hợp tài liệu lớn / bản nộp cuối).
          </li>
          <li>
            <strong>Cửa sổ Preview tách rời</strong>: mở bản xem trước trong một cửa sổ riêng để
            vừa viết vừa theo dõi kết quả trên màn hình rộng.
          </li>
        </ul>
        <Callout tone="info" title="Preview nhanh vs Xuất PDF">
          Khung Preview cho phản hồi nhanh trong lúc soạn. Với tài liệu lớn hoặc bản nộp cuối, hãy
          dùng <strong>Xuất PDF</strong> để có kết quả đầy đủ và ổn định.
        </Callout>
      </>
    ),
  },
  {
    id: "cong-cu-ho-tro",
    label: "Công cụ hỗ trợ",
    icon: Wrench,
    content: (
      <>
        <ul className="list-disc pl-5 space-y-1.5 marker:text-slate-400">
          <li>
            <strong>Mục lục</strong>: liệt kê các tiêu đề trong tài liệu, nhấp để nhảy nhanh tới
            phần tương ứng.
          </li>
          <li>
            <strong>Tìm &amp; thay thế</strong>: tìm trong tài liệu, hỗ trợ biểu thức chính quy
            (regex).
          </li>
          <li>
            <strong>Lỗi biên dịch (Issues)</strong>: hiển thị cảnh báo và lỗi khi biên dịch, kèm vị
            trí để sửa.
          </li>
          <li>
            <strong>Thiết lập</strong>: tuỳ chỉnh trình soạn thảo theo nhu cầu cá nhân.
          </li>
        </ul>
        <Callout tone="info">
          Bảng <strong>Tài liệu tham khảo</strong> (Zotero, OpenAlex, web capture) được hướng dẫn
          riêng ở{" "}
          <Link to="/huong-dan/trich-dan" className="font-medium text-[#007bff] hover:underline">
            Trích dẫn &amp; tài liệu tham khảo
          </Link>
          .
        </Callout>
      </>
    ),
  },
];

export function EditorGuide() {
  return (
    <HelpLayout
      title="Trình soạn thảo (editor)"
      description="Cách dùng workspace: quản lý tệp, soạn thảo, biên dịch & Preview, Xuất PDF và các công cụ hỗ trợ."
      sections={SECTIONS}
    />
  );
}
