import { ArrowRight, BookOpen, ExternalLink } from "lucide-react";
import { HelpLayout, type HelpSection } from "../components/HelpLayout";
import { VersionBadge } from "../components/VersionBadge";

const RESOURCES: { label: string; desc: string; url: string }[] = [
  {
    label: "Tài liệu chính thức",
    desc: "Toàn bộ tài liệu tham khảo của Typst.",
    url: "https://typst.app/docs/",
  },
  {
    label: "Hướng dẫn nhập môn",
    desc: "Bài hướng dẫn từng bước cho người mới.",
    url: "https://typst.app/docs/tutorial/",
  },
  {
    label: "Tra cứu cú pháp",
    desc: "Bảng tổng hợp toàn bộ cú pháp markup.",
    url: "https://typst.app/docs/reference/syntax/",
  },
  {
    label: "Danh sách ký hiệu",
    desc: "Ký hiệu toán học và biểu tượng dùng được.",
    url: "https://typst.app/docs/reference/symbols/sym/",
  },
  {
    label: "Kho gói mở rộng",
    desc: "Typst Universe: template và package cộng đồng.",
    url: "https://typst.app/universe/",
  },
];

const SECTIONS: HelpSection[] = [
  {
    id: "lien-ket",
    label: "Liên kết chính thức",
    icon: ExternalLink,
    content: (
      <>
        <p>
          Khi cần tra cứu sâu hơn, tham khảo các trang chính thức của Typst dưới đây (mở trong tab
          mới).
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {RESOURCES.map((res) => (
            <a
              key={res.url}
              href={res.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 hover:border-blue-200 hover:bg-blue-50/40 transition-colors"
            >
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-[#007bff] flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <span className="truncate">{res.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#007bff] group-hover:translate-x-0.5 transition-all shrink-0" />
                </span>
                <span className="block text-sm text-slate-500 mt-0.5">{res.desc}</span>
              </span>
            </a>
          ))}
        </div>
      </>
    ),
  },
];

export function Resources() {
  return (
    <HelpLayout
      title="Tài nguyên Typst"
      description="Liên kết tới tài liệu Typst chính thức để tra cứu chuyên sâu."
      badge={<VersionBadge />}
      sections={SECTIONS}
    />
  );
}
