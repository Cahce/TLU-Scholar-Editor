import type { ReactNode } from "react";
import { Link } from "react-router";
import { ClipboardCheck, Compass, Library, Search, Globe, Quote, ArrowRight } from "lucide-react";
import { HelpLayout, type HelpSection } from "../components/HelpLayout";
import { CodeBlock } from "../components/CodeBlock";
import { Callout } from "../components/Callout";

const C = "rounded bg-slate-100 px-1 py-0.5 font-mono text-[13px]";

function MoreLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-sm font-medium text-[#007bff] hover:underline">
      {children} <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}

const SECTIONS: HelpSection[] = [
  {
    id: "truoc-khi-bat-dau",
    label: "Trước khi bắt đầu",
    icon: ClipboardCheck,
    content: (
      <>
        <p>Để thêm trích dẫn, bạn cần:</p>
        <ul className="list-disc pl-5 space-y-1.5 marker:text-slate-400">
          <li>Một <strong>dự án</strong> đang mở trong workspace.</li>
          <li>Một file tài liệu tham khảo <code className={C}>.bib</code> (nếu chưa có, tạo file mới
            tên <code className={C}>refs.bib</code> trong cây tệp — hoặc các công cụ bên dưới sẽ tạo giúp).</li>
          <li>Mở bảng <strong>Tài liệu tham khảo</strong> ở workspace.</li>
          <li>Riêng Zotero: cần tài khoản <a className="text-[#007bff] hover:underline" href="https://www.zotero.org" target="_blank" rel="noopener noreferrer">zotero.org</a> (miễn phí).</li>
        </ul>
      </>
    ),
  },
  {
    id: "chon-cong-cu",
    label: "Dùng công cụ nào?",
    icon: Compass,
    content: (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left font-semibold px-3 py-2 border-b border-slate-200">Tình huống của bạn</th>
              <th className="text-left font-semibold px-3 py-2 border-b border-slate-200">Dùng</th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            <tr><td className="px-3 py-2 border-b border-slate-100">Đã có thư viện Zotero</td><td className="px-3 py-2 border-b border-slate-100"><strong>Zotero</strong></td></tr>
            <tr><td className="px-3 py-2 border-b border-slate-100">Cần tìm bài báo theo chủ đề</td><td className="px-3 py-2 border-b border-slate-100"><strong>OpenAlex</strong></td></tr>
            <tr><td className="px-3 py-2">Đã có sẵn link/DOI một bài cụ thể</td><td className="px-3 py-2"><strong>Thu thập từ web</strong></td></tr>
          </tbody>
        </table>
      </div>
    ),
  },
  {
    id: "zotero-3-buoc",
    label: "Zotero trong 3 bước",
    icon: Library,
    content: (
      <>
        <ol className="list-decimal pl-5 space-y-1.5 marker:text-slate-400">
          <li>Tạo <strong>API key</strong> tại <a className="text-[#007bff] hover:underline" href="https://www.zotero.org/settings/keys" target="_blank" rel="noopener noreferrer">zotero.org/settings/keys</a> (bật <em>Allow library access</em>).</li>
          <li>Tab <strong>Zotero</strong> → dán key → chọn thư viện → <strong>Kết nối</strong>.</li>
          <li>Chọn tài liệu → <strong>Đồng bộ</strong> (chọn "Toàn bộ" cho lần đầu) vào <code className={C}>refs.bib</code>.</li>
        </ol>
        <Callout tone="warning">Không chia sẻ API key; hệ thống lưu đã mã hoá.</Callout>
        <MoreLink to="/huong-dan/zotero">Xem chi tiết Zotero</MoreLink>
      </>
    ),
  },
  {
    id: "openalex-3-buoc",
    label: "OpenAlex trong 3 bước",
    icon: Search,
    content: (
      <>
        <Callout tone="tip">OpenAlex <strong>không cần tài khoản</strong> — bắt đầu ngay.</Callout>
        <ol className="list-decimal pl-5 space-y-1.5 marker:text-slate-400">
          <li>Tab <strong>OpenAlex</strong> → gõ từ khoá tìm.</li>
          <li>Chọn tài liệu phù hợp trong kết quả.</li>
          <li>Bấm <strong>Lưu vào .bib</strong> → chọn file đích.</li>
        </ol>
        <MoreLink to="/huong-dan/openalex">Xem chi tiết OpenAlex</MoreLink>
      </>
    ),
  },
  {
    id: "webcapture-3-buoc",
    label: "Thu thập từ web trong 3 bước",
    icon: Globe,
    content: (
      <>
        <ol className="list-decimal pl-5 space-y-1.5 marker:text-slate-400">
          <li>Mục <strong>Thu thập từ web</strong> → dán <strong>DOI</strong> (đơn giản nhất) hoặc URL.</li>
          <li>Xem trước thông tin nhận diện được.</li>
          <li>Bật <strong>Lưu vào .bib của dự án</strong> → Lưu.</li>
        </ol>
        <Callout tone="info">DOI/arXiv dùng được ngay; URL/PMID/ISBN cần "connector" do hệ thống bật. Nếu báo chưa sẵn sàng → dùng DOI hoặc OpenAlex.</Callout>
        <MoreLink to="/huong-dan/web-capture">Xem chi tiết Thu thập từ web</MoreLink>
      </>
    ),
  },
  {
    id: "trich-dan-lan-dau",
    label: "Trích dẫn lần đầu",
    icon: Quote,
    content: (
      <>
        <p>
          Sau khi có mục trong <code className={C}>.bib</code>, mỗi nguồn có một <strong>khoá trích dẫn</strong>.
          Chèn vào tài liệu và in danh mục ở cuối:
        </p>
        <CodeBlock
          code={`Theo @nguyen2024, kết quả cho thấy ...

#bibliography("refs.bib", style: "ieee")`}
          caption="@khoa để trích dẫn; #bibliography(...) in danh mục. Đổi style: ieee/apa/chicago-author-date."
        />
        <p className="text-sm text-slate-500">
          Xem thêm: <Link to="/huong-dan/trich-dan" className="text-[#007bff] hover:underline">Trích dẫn &amp; tài liệu tham khảo</Link>{" "}
          · <Link to="/huong-dan/cu-phap-typst" className="text-[#007bff] hover:underline">Cú pháp Typst</Link>.
        </p>
      </>
    ),
  },
];

export function CitationQuickstart() {
  return (
    <HelpLayout
      title="Bắt đầu với công cụ trích dẫn"
      description="Đường ngắn nhất để có trích dẫn đầu tiên — chọn Zotero, OpenAlex hoặc Thu thập từ web và làm theo 3 bước."
      sections={SECTIONS}
    />
  );
}
