import { Link } from "react-router";
import { KeyRound, Library, ListChecks, Plug, RefreshCw, TriangleAlert, Quote } from "lucide-react";
import { HelpLayout, type HelpSection } from "../components/HelpLayout";
import { CodeBlock } from "../components/CodeBlock";
import { Callout } from "../components/Callout";

const C = "rounded bg-slate-100 px-1 py-0.5 font-mono text-[13px]";

const SECTIONS: HelpSection[] = [
  {
    id: "tong-quan",
    label: "Zotero là gì & khi nào dùng",
    icon: Library,
    content: (
      <>
        <p>
          <strong>Zotero</strong> là phần mềm quản lý tài liệu tham khảo miễn phí. Nếu bạn đã có
          thư viện Zotero, hãy <strong>kết nối</strong> rồi <strong>đồng bộ</strong> tài liệu thẳng
          vào file <code className={C}>.bib</code> của dự án — không phải gõ tay từng nguồn.
        </p>
        <p>
          Mở bảng <strong>Tài liệu tham khảo</strong> trong workspace, chọn tab <strong>Zotero</strong>.
          Cần một tài khoản <a className="text-[#007bff] hover:underline" href="https://www.zotero.org" target="_blank" rel="noopener noreferrer">zotero.org</a> (miễn phí).
        </p>
      </>
    ),
  },
  {
    id: "lay-api-key",
    label: "Bước 1 — Lấy API key",
    icon: KeyRound,
    content: (
      <>
        <ol className="list-decimal pl-5 space-y-1.5 marker:text-slate-400">
          <li>Đăng nhập zotero.org, vào <a className="text-[#007bff] hover:underline" href="https://www.zotero.org/settings/keys" target="_blank" rel="noopener noreferrer">zotero.org/settings/keys</a>.</li>
          <li>Bấm <em>Create new private key</em>.</li>
          <li>Bật <strong>Allow library access</strong> (đọc thư viện) — đủ để đồng bộ vào <code className={C}>.bib</code>.</li>
          <li>Bật thêm <strong>Allow write access</strong> nếu sau này muốn <em>lưu ngược</em> tài liệu lên Zotero (dùng ở "Thu thập từ web").</li>
          <li>Lưu key và sao chép chuỗi key.</li>
        </ol>
        <Callout tone="warning" title="Bảo mật API key">
          API key giống mật khẩu — <strong>không chia sẻ</strong>. Hệ thống lưu key đã <strong>mã hoá</strong>
          và chỉ hiển thị trạng thái "đã kết nối", không bao giờ hiện lại key.
        </Callout>
      </>
    ),
  },
  {
    id: "ket-noi",
    label: "Bước 2 — Kết nối thư viện",
    icon: Plug,
    content: (
      <>
        <ol className="list-decimal pl-5 space-y-1.5 marker:text-slate-400">
          <li>Trong tab Zotero, dán key vào ô <strong>API Key</strong> ("Dán API key từ Zotero").</li>
          <li>Hệ thống tải danh sách <strong>thư viện</strong> truy cập được; chọn ở mục <strong>Chọn thư viện</strong>.</li>
          <li>Bấm <strong>Kết nối</strong>.</li>
        </ol>
        <p>
          Thư viện có hai loại: <strong>cá nhân</strong> (của riêng bạn) và <strong>nhóm</strong>
          (group — chia sẻ chung). Nếu chỉ có thư viện cá nhân, hệ thống tự chọn giúp.
        </p>
        <Callout tone="info">
          Mỗi tài khoản giữ <strong>một</strong> kết nối Zotero. Muốn đổi key/thư viện: bấm
          <strong> Ngắt kết nối</strong> rồi kết nối lại.
        </Callout>
      </>
    ),
  },
  {
    id: "dong-bo",
    label: "Bước 3 — Đồng bộ vào .bib",
    icon: RefreshCw,
    content: (
      <>
        <p>Sau khi kết nối, tab Zotero có 3 thẻ:</p>
        <ul className="list-disc pl-5 space-y-1.5 marker:text-slate-400">
          <li><strong>Bộ sưu tập</strong> — duyệt theo collection của thư viện.</li>
          <li><strong>Tài liệu</strong> — danh sách tài liệu để chọn.</li>
          <li><strong>Mới thêm</strong> — tài liệu vừa lưu bằng Zotero Connector (xem mục dưới).</li>
        </ul>
        <p>
          Chọn collection/tài liệu cần lấy → bấm <strong>Đồng bộ</strong> → hộp thoại
          <strong> "Đồng bộ vào thư mục tham khảo"</strong>: chọn file đích và kiểu đồng bộ.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left font-semibold px-3 py-2 border-b border-slate-200">Tuỳ chọn</th>
                <th className="text-left font-semibold px-3 py-2 border-b border-slate-200">Ý nghĩa</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              <tr><td className="px-3 py-2 border-b border-slate-100"><strong>File đích</strong></td><td className="px-3 py-2 border-b border-slate-100"><code className={C}>.bib</code> (BibTeX) hoặc <code className={C}>.yml</code>/<code className={C}>.yaml</code> (Hayagriva — Typst đọc trực tiếp).</td></tr>
              <tr><td className="px-3 py-2 border-b border-slate-100"><strong>Toàn bộ</strong> (full)</td><td className="px-3 py-2 border-b border-slate-100">Lấy lại tất cả mục đã chọn — phù hợp lần đầu.</td></tr>
              <tr><td className="px-3 py-2 border-b border-slate-100"><strong>Chỉ mục mới/đổi</strong> (incremental)</td><td className="px-3 py-2 border-b border-slate-100">Chỉ cập nhật phần thay đổi — nhanh hơn cho lần sau.</td></tr>
              <tr><td className="px-3 py-2"><strong>Khi trùng khoá</strong></td><td className="px-3 py-2"><strong>Bỏ qua</strong> (giữ mục cũ) · <strong>Ghi đè</strong> · <strong>Đổi tên</strong> khoá mới.</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          Sau khi đồng bộ, mỗi tài liệu có một <strong>khoá trích dẫn</strong> để dùng với <code>@khoa</code>.
          Lịch sử đồng bộ hiển thị trạng thái (<em>đang chạy / thành công / thất bại</em>) và số mục đã đồng bộ.
        </p>
      </>
    ),
  },
  {
    id: "zotero-connector",
    label: "Zotero Connector (tiện ích trình duyệt)",
    icon: Plug,
    content: (
      <>
        <p>
          <strong>Zotero Connector</strong> là tiện ích trình duyệt chính thức của Zotero. Khi đọc một
          bài báo trên web, bấm nút Connector để <strong>lưu vào thư viện Zotero</strong> của bạn.
        </p>
        <ol className="list-decimal pl-5 space-y-1.5 marker:text-slate-400">
          <li>Cài Zotero Connector cho Chrome/Edge/Firefox (từ zotero.org/download).</li>
          <li>Trên trang bài báo, bấm biểu tượng Connector để lưu vào thư viện Zotero.</li>
          <li>Về workspace → tab <strong>Mới thêm</strong> → bấm <strong>Làm mới</strong> để thấy tài liệu vừa lưu.</li>
          <li>Chọn và <strong>Đồng bộ</strong> vào <code className={C}>.bib</code> như trên.</li>
        </ol>
        <Callout tone="tip">
          Muốn lấy trích dẫn ngay trong app mà không cần tiện ích? Dùng{" "}
          <Link to="/huong-dan/web-capture" className="font-medium text-[#007bff] hover:underline">Thu thập từ web</Link>{" "}
          (dán URL/DOI/arXiv).
        </Callout>
      </>
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
            <tr><td className="px-3 py-2 border-b border-slate-100">Báo API key sai / không xác thực được</td><td className="px-3 py-2 border-b border-slate-100">Key sai hoặc đã thu hồi → tạo key mới ở zotero.org/settings/keys rồi kết nối lại.</td></tr>
            <tr><td className="px-3 py-2 border-b border-slate-100">Không truy cập được thư viện đã chọn</td><td className="px-3 py-2 border-b border-slate-100">Kiểm tra key có quyền với thư viện <strong>nhóm</strong> đó không.</td></tr>
            <tr><td className="px-3 py-2 border-b border-slate-100">Không lưu ngược lên Zotero được</td><td className="px-3 py-2 border-b border-slate-100">Key thiếu quyền ghi → tạo key có bật <strong>Allow write access</strong>.</td></tr>
            <tr><td className="px-3 py-2 border-b border-slate-100">Thao tác bị chặn tạm thời</td><td className="px-3 py-2 border-b border-slate-100">Quá nhanh / quá giới hạn → chờ một lát rồi thử lại.</td></tr>
            <tr><td className="px-3 py-2">Đồng bộ thất bại</td><td className="px-3 py-2">Xem lịch sử đồng bộ; thử lại hoặc chọn file <code className={C}>.bib</code> khác.</td></tr>
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
        <p>Sau khi có mục trong <code className={C}>.bib</code>, chèn trích dẫn bằng khoá tương ứng:</p>
        <CodeBlock
          code={`Theo @nguyen2024, phương pháp này hiệu quả hơn.

#bibliography("refs.bib", style: "ieee")`}
          caption="@khoa để trích dẫn; #bibliography(...) in danh mục ở cuối tài liệu."
        />
        <p className="text-sm text-slate-500">
          Xem thêm: <Link to="/huong-dan/trich-dan" className="text-[#007bff] hover:underline">Trích dẫn &amp; tài liệu tham khảo</Link>.
        </p>
      </>
    ),
  },
];

export function Zotero() {
  return (
    <HelpLayout
      title="Kết nối & đồng bộ Zotero"
      description="Kết nối thư viện Zotero bằng API key và đồng bộ tài liệu vào file .bib/.yml của dự án; dùng Zotero Connector để lưu bài từ web."
      sections={SECTIONS}
    />
  );
}
