import { Link } from "react-router";
import { Search, SlidersHorizontal, FileText, Download, CopyCheck, TriangleAlert, Quote } from "lucide-react";
import { HelpLayout, type HelpSection } from "../components/HelpLayout";
import { CodeBlock } from "../components/CodeBlock";
import { Callout } from "../components/Callout";

const C = "rounded bg-slate-100 px-1 py-0.5 font-mono text-[13px]";

const SECTIONS: HelpSection[] = [
  {
    id: "tong-quan",
    label: "OpenAlex là gì",
    icon: Search,
    content: (
      <>
        <p>
          <strong>OpenAlex</strong> là cơ sở dữ liệu học thuật <strong>mở, miễn phí</strong> (hàng trăm
          triệu bài báo, sách, luận án). Bạn có thể tìm tài liệu theo chủ đề và lưu thẳng vào file
          <code className={C}>.bib</code> của dự án — <strong>không cần tài khoản hay API key</strong>.
        </p>
        <p>Mở bảng <strong>Tài liệu tham khảo</strong> → tab <strong>OpenAlex</strong>.</p>
      </>
    ),
  },
  {
    id: "tim-kiem",
    label: "Tìm kiếm",
    icon: SlidersHorizontal,
    content: (
      <>
        <ol className="list-decimal pl-5 space-y-1.5 marker:text-slate-400">
          <li>Gõ từ khoá vào ô tìm ("Tìm bài báo, sách, luận án...").</li>
          <li>Mở <strong>Bộ lọc</strong> để thu hẹp:
            <ul className="list-disc pl-5 mt-1 space-y-1 marker:text-slate-300">
              <li><strong>Khoảng năm</strong> (từ … đến …).</li>
              <li><strong>Loại tài liệu</strong>: Bài báo · Sách · Chương sách · Luận án · Bài hội nghị.</li>
              <li><strong>Open Access</strong>: chỉ tài liệu đọc mở.</li>
            </ul>
          </li>
        </ol>
        <Callout tone="tip">Từ khoá tiếng Anh thường cho kết quả tốt hơn vì dữ liệu OpenAlex chủ yếu bằng tiếng Anh.</Callout>
      </>
    ),
  },
  {
    id: "doc-ket-qua",
    label: "Đọc kết quả",
    icon: FileText,
    content: (
      <>
        <p>Mỗi kết quả hiển thị:</p>
        <ul className="list-disc pl-5 space-y-1.5 marker:text-slate-400">
          <li><strong>Tiêu đề, tác giả, năm, tạp chí/nguồn</strong>.</li>
          <li><strong>DOI</strong> — mã định danh số của tài liệu.</li>
          <li><strong>Số lượt trích dẫn</strong> — tài liệu được trích dẫn bao nhiêu lần (tham khảo độ ảnh hưởng).</li>
          <li><strong>Open Access</strong> — nếu có, kèm liên kết bản PDF đọc mở.</li>
          <li><strong>Tóm tắt</strong> (nếu có).</li>
        </ul>
      </>
    ),
  },
  {
    id: "nhap-bib",
    label: "Lưu vào .bib",
    icon: Download,
    content: (
      <>
        <ol className="list-decimal pl-5 space-y-1.5 marker:text-slate-400">
          <li>Ở tài liệu muốn lấy, bấm <strong>Lưu vào .bib</strong>.</li>
          <li>Hộp thoại <strong>"Lưu vào thư mục tham khảo"</strong>: nhập <strong>đường dẫn file</strong>
            (vd <code className={C}>bibliography.bib</code>) và cách xử lý khi trùng khoá
            (<strong>bỏ qua / ghi đè / đổi tên</strong>).</li>
          <li>Hệ thống tự sinh <strong>khoá trích dẫn</strong> cho mỗi mục.</li>
        </ol>
        <p>Kết quả nhập được báo theo 3 nhóm:</p>
        <ul className="list-disc pl-5 space-y-1.5 marker:text-slate-400">
          <li><strong>Đã nhập</strong> — kèm khoá trích dẫn để dùng ngay.</li>
          <li><strong>Trùng — bỏ qua</strong> — đã có trong file (kèm khoá hiện có).</li>
          <li><strong>Thất bại</strong> — kèm lý do (mạng/dữ liệu).</li>
        </ul>
      </>
    ),
  },
  {
    id: "chong-trung",
    label: "Chống trùng lặp",
    icon: CopyCheck,
    content: (
      <p>
        Nếu một tài liệu <strong>đã được nhập trước đó</strong> vào đúng file <code className={C}>.bib</code>,
        nút <strong>Lưu vào .bib</strong> sẽ bị vô hiệu (hoặc báo trùng) để tránh lưu hai lần. Muốn cập
        nhật bản ghi, chọn chế độ <strong>ghi đè</strong> khi lưu.
      </p>
    ),
  },
  {
    id: "khac-phuc-loi",
    label: "Khắc phục lỗi",
    icon: TriangleAlert,
    content: (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left font-semibold px-3 py-2 border-b border-slate-200">Hiện tượng</th>
              <th className="text-left font-semibold px-3 py-2 border-b border-slate-200">Cách xử lý</th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            <tr><td className="px-3 py-2 border-b border-slate-100">Không có kết quả</td><td className="px-3 py-2 border-b border-slate-100">Đổi từ khoá, bớt bộ lọc, hoặc thử từ khoá tiếng Anh.</td></tr>
            <tr><td className="px-3 py-2 border-b border-slate-100">Tìm bị chặn tạm thời</td><td className="px-3 py-2 border-b border-slate-100">Quá nhiều yêu cầu → chờ một lát rồi thử lại.</td></tr>
            <tr><td className="px-3 py-2 border-b border-slate-100">Máy chủ OpenAlex tạm lỗi</td><td className="px-3 py-2 border-b border-slate-100">Thử lại sau ít phút.</td></tr>
            <tr><td className="px-3 py-2">Hết thời gian chờ</td><td className="px-3 py-2">Kiểm tra kết nối mạng và thử lại.</td></tr>
          </tbody>
        </table>
      </div>
    ),
  },
  {
    id: "dung-trong-tai-lieu",
    label: "Dùng trong tài liệu",
    icon: Quote,
    content: (
      <>
        <CodeBlock
          code={`Vấn đề này đã được nghiên cứu rộng rãi @smith2020.

#bibliography("bibliography.bib", style: "ieee")`}
          caption="Dùng khoá trích dẫn vừa nhập với @khoa; in danh mục bằng #bibliography(...)."
        />
        <p className="text-sm text-slate-500">
          Xem thêm: <Link to="/huong-dan/trich-dan" className="text-[#007bff] hover:underline">Trích dẫn &amp; tài liệu tham khảo</Link>.
        </p>
      </>
    ),
  },
];

export function OpenAlex() {
  return (
    <HelpLayout
      title="Tìm & nhập tài liệu (OpenAlex)"
      description="Tìm bài báo học thuật mở và lưu trực tiếp vào file .bib — không cần tài khoản hay API key."
      sections={SECTIONS}
    />
  );
}
