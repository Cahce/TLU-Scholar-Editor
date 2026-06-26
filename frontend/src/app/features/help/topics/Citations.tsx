import { Link } from "react-router";
import { FileText, Library, Quote } from "lucide-react";
import { HelpLayout, type HelpSection } from "../components/HelpLayout";
import { CodeBlock } from "../components/CodeBlock";
import { Callout } from "../components/Callout";

const SECTIONS: HelpSection[] = [
  {
    id: "tao-bib",
    label: "Tạo file tài liệu tham khảo (.bib)",
    icon: FileText,
    content: (
      <>
        <p>
          Lưu các nguồn tham khảo vào một file <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[13px]">.bib</code>{" "}
          (định dạng BibTeX). Mỗi nguồn có một <strong>khoá trích dẫn</strong> (citation key) duy
          nhất để tham chiếu trong tài liệu.
        </p>
        <CodeBlock
          language="BibTeX"
          code={`@article{nguyen2024,
  author  = {Nguyễn Văn A and Trần Thị B},
  title   = {Một phương pháp mới cho bài toán X},
  journal = {Tạp chí Khoa học},
  year    = {2024},
}`}
          caption="nguyen2024 là khoá trích dẫn — dùng để tham chiếu nguồn này trong file .typ."
        />
      </>
    ),
  },
  {
    id: "trich-dan",
    label: "Trích dẫn trong Typst",
    icon: Quote,
    content: (
      <>
        <p>
          Trích dẫn bằng <code>@khoa</code> hoặc <code>#cite(&lt;khoa&gt;)</code>, và in danh mục
          tham khảo bằng <code>#bibliography()</code>.
        </p>
        <CodeBlock
          code={`Theo nghiên cứu @nguyen2024, phương pháp này hiệu quả hơn.

#bibliography("refs.bib", style: "ieee")`}
          caption='Đổi style thành "apa", "ieee", "chicago-author-date"... theo yêu cầu của đơn vị.'
        />
        <Callout tone="tip">
          Đặt <code>#bibliography(...)</code> ở cuối tài liệu. Danh mục chỉ liệt kê những nguồn thực
          sự được trích dẫn (trừ khi cấu hình khác).
        </Callout>
      </>
    ),
  },
  {
    id: "cong-cu",
    label: "Công cụ trong workspace",
    icon: Library,
    content: (
      <>
        <p>
          Không cần gõ tay từng mục — workspace có sẵn các công cụ dựng file <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[13px]">.bib</code>{" "}
          tự động trong bảng <strong>Tài liệu tham khảo</strong>.
        </p>
        <ul className="list-disc pl-5 space-y-1.5 marker:text-slate-400">
          <li>
            <Link to="/huong-dan/zotero" className="font-medium text-[#007bff] hover:underline">Zotero</Link>: kết nối thư viện Zotero rồi đồng bộ tài liệu vào file
            <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[13px]">.bib</code> của dự án.
          </li>
          <li>
            <Link to="/huong-dan/openalex" className="font-medium text-[#007bff] hover:underline">OpenAlex</Link>: tìm bài báo khoa học (không cần tài khoản) và lưu trực tiếp vào{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[13px]">.bib</code>; hệ thống tránh lưu trùng.
          </li>
          <li>
            <Link to="/huong-dan/web-capture" className="font-medium text-[#007bff] hover:underline">Thu thập từ web</Link> (web-to-cite): dán URL hoặc DOI/arXiv để lấy trích dẫn ngay.
          </li>
        </ul>
        <Callout tone="tip" title="Mới bắt đầu?">
          Theo <Link to="/huong-dan/bat-dau-trich-dan" className="font-medium text-[#007bff] hover:underline">Bắt đầu với công cụ trích dẫn</Link>{" "}
          để có trích dẫn đầu tiên trong vài bước; mỗi công cụ có hướng dẫn chi tiết riêng ở trên.
        </Callout>
      </>
    ),
  },
];

export function Citations() {
  return (
    <HelpLayout
      title="Trích dẫn & tài liệu tham khảo"
      description="Tạo file .bib, trích dẫn trong Typst và dùng các công cụ Zotero / OpenAlex / web capture có sẵn trong workspace."
      sections={SECTIONS}
    />
  );
}
