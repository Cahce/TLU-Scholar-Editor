import { Link } from "react-router";
import { Globe, MousePointerClick, Network, Plug, ShieldCheck, TriangleAlert, Quote } from "lucide-react";
import { HelpLayout, type HelpSection } from "../components/HelpLayout";
import { CodeBlock } from "../components/CodeBlock";
import { Callout } from "../components/Callout";

const C = "rounded bg-slate-100 px-1 py-0.5 font-mono text-[13px]";

const SECTIONS: HelpSection[] = [
  {
    id: "tong-quan",
    label: "Thu thập từ web là gì",
    icon: Globe,
    content: (
      <>
        <p>
          <strong>Thu thập từ web</strong> (web-to-cite) cho phép dán một <strong>URL</strong> trang web
          hoặc một <strong>mã định danh</strong> (DOI / arXiv / PMID / ISBN) để hệ thống tự lấy thông tin
          trích dẫn và lưu vào file <code className={C}>.bib</code> — không cần gõ tay.
        </p>
        <p>
          Mở bảng <strong>Tài liệu tham khảo</strong> → mục <strong>Thu thập từ web</strong>. Tính năng
          này dùng "connector" (translation-server của Zotero) ở phía hệ thống.
        </p>
        <Callout tone="info" title="Phân biệt với Zotero Connector">
          "Thu thập từ web" chạy <strong>ngay trong app</strong>. Còn{" "}
          <Link to="/huong-dan/zotero" className="font-medium text-[#007bff] hover:underline">Zotero Connector</Link>{" "}
          là tiện ích trình duyệt lưu bài vào thư viện Zotero rồi đồng bộ về sau.
        </Callout>
      </>
    ),
  },
  {
    id: "cac-buoc",
    label: "Các bước",
    icon: MousePointerClick,
    content: (
      <>
        <ol className="list-decimal pl-5 space-y-1.5 marker:text-slate-400">
          <li>Dán URL hoặc mã định danh vào ô ("Dán URL bài báo, DOI hoặc arXiv ID...").</li>
          <li><strong>Xem trước</strong> thông tin (tiêu đề, tác giả, năm…) hệ thống nhận diện được.</li>
          <li>Chọn nơi lưu: <strong>Lưu vào .bib của dự án</strong> và/hoặc <strong>Lưu vào thư viện Zotero</strong>.</li>
          <li>Lưu → nhận <strong>khoá trích dẫn</strong> để dùng với <code>@khoa</code>.</li>
        </ol>
      </>
    ),
  },
  {
    id: "ma-tran-connector",
    label: "Loại nào cần connector?",
    icon: Network,
    content: (
      <>
        <p>
          DOI và arXiv hoạt động <strong>kể cả khi connector tạm tắt</strong> (hệ thống tự tra qua
          OpenAlex). Các loại còn lại cần connector đang chạy:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left font-semibold px-3 py-2 border-b border-slate-200">Loại đầu vào</th>
                <th className="text-left font-semibold px-3 py-2 border-b border-slate-200">Cần connector?</th>
                <th className="text-left font-semibold px-3 py-2 border-b border-slate-200">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              <tr><td className="px-3 py-2 border-b border-slate-100"><strong>DOI</strong> (vd 10.1038/…)</td><td className="px-3 py-2 border-b border-slate-100">Không</td><td className="px-3 py-2 border-b border-slate-100">Tự dùng OpenAlex nếu connector tắt.</td></tr>
              <tr><td className="px-3 py-2 border-b border-slate-100"><strong>arXiv</strong> (vd 2106.14881)</td><td className="px-3 py-2 border-b border-slate-100">Không</td><td className="px-3 py-2 border-b border-slate-100">Tự dùng OpenAlex nếu connector tắt.</td></tr>
              <tr><td className="px-3 py-2 border-b border-slate-100"><strong>URL</strong> trang web</td><td className="px-3 py-2 border-b border-slate-100"><strong>Có</strong></td><td className="px-3 py-2 border-b border-slate-100">Chỉ connector đọc được trang web bất kỳ.</td></tr>
              <tr><td className="px-3 py-2 border-b border-slate-100"><strong>PMID</strong> (PubMed)</td><td className="px-3 py-2 border-b border-slate-100"><strong>Có</strong></td><td className="px-3 py-2 border-b border-slate-100">Không có nguồn thay thế.</td></tr>
              <tr><td className="px-3 py-2"><strong>ISBN</strong> (sách)</td><td className="px-3 py-2"><strong>Có</strong></td><td className="px-3 py-2">Không có nguồn thay thế.</td></tr>
            </tbody>
          </table>
        </div>
        <Callout tone="tip">Đơn giản nhất: nếu có <strong>DOI</strong>, hãy dán DOI — luôn dùng được.</Callout>
      </>
    ),
  },
  {
    id: "khi-connector-tat",
    label: "Khi connector chưa sẵn sàng",
    icon: Plug,
    content: (
      <>
        <p>Nếu thấy báo connector chưa sẵn sàng (thường với URL/PMID/ISBN), bạn có thể:</p>
        <ul className="list-disc pl-5 space-y-1.5 marker:text-slate-400">
          <li>Dùng <strong>DOI</strong> hoặc <strong>arXiv</strong> của tài liệu (chạy không cần connector).</li>
          <li>Tìm tài liệu qua <Link to="/huong-dan/openalex" className="text-[#007bff] hover:underline">OpenAlex</Link> rồi Lưu vào .bib.</li>
          <li>Thêm thủ công bằng nút <strong>Thêm</strong> trong bảng Tài liệu tham khảo.</li>
        </ul>
        <Callout tone="info" title="Dành cho quản trị">
          Connector (translation-server) được hệ thống <strong>tự khởi động</strong> cùng máy chủ
          (<code className={C}>npm run dev</code>/<code className={C}>start</code>). Cách cài đặt nằm ở
          spec <code className={C}>zotero-translation-server-autostart-fix</code> — người dùng cuối không cần tự cài.
        </Callout>
      </>
    ),
  },
  {
    id: "luu-zotero",
    label: "Lưu đồng thời lên Zotero",
    icon: ShieldCheck,
    content: (
      <p>
        Bật <strong>Lưu vào thư viện Zotero</strong> để vừa lưu vào <code className={C}>.bib</code> vừa
        đẩy lên thư viện Zotero của bạn. Cần đã <Link to="/huong-dan/zotero" className="text-[#007bff] hover:underline">kết nối Zotero</Link>
        {" "}bằng API key có bật <strong>quyền ghi (write)</strong>; nếu key chỉ có quyền đọc, hệ thống báo
        "API key Zotero của bạn không có quyền ghi (write)".
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
            <tr><td className="px-3 py-2 border-b border-slate-100">Connector chưa sẵn sàng</td><td className="px-3 py-2 border-b border-slate-100">Dùng DOI/arXiv, hoặc tìm qua OpenAlex.</td></tr>
            <tr><td className="px-3 py-2 border-b border-slate-100">Không nhận diện được trang/mã</td><td className="px-3 py-2 border-b border-slate-100">Thử DOI của bài, hoặc thêm thủ công.</td></tr>
            <tr><td className="px-3 py-2 border-b border-slate-100">Trùng tài liệu</td><td className="px-3 py-2 border-b border-slate-100">Hệ thống báo "đã có" kèm khoá hiện có — dùng lại khoá đó.</td></tr>
            <tr><td className="px-3 py-2">Lưu lên Zotero bị từ chối</td><td className="px-3 py-2">Key thiếu quyền ghi → tạo key có <strong>Allow write access</strong>.</td></tr>
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
          code={`Phương pháp được mô tả trong @paper2023.

#bibliography("bibliography.bib", style: "ieee")`}
          caption="Dùng khoá trích dẫn nhận được sau khi thu thập."
        />
        <p className="text-sm text-slate-500">
          Xem thêm: <Link to="/huong-dan/trich-dan" className="text-[#007bff] hover:underline">Trích dẫn &amp; tài liệu tham khảo</Link>.
        </p>
      </>
    ),
  },
];

export function WebCapture() {
  return (
    <HelpLayout
      title="Tải trích dẫn từ web (Zotero connector)"
      description="Dán URL hoặc DOI/arXiv/PMID/ISBN để tạo trích dẫn ngay; DOI/arXiv chạy kể cả khi connector tắt."
      sections={SECTIONS}
    />
  );
}
