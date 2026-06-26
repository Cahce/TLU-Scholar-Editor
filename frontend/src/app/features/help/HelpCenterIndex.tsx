import { Link } from "react-router";
import { ArrowRight, BookOpen, ExternalLink } from "lucide-react";
import { Button } from "../../components/ui/button";
import { HELP_TOPICS } from "./helpContent";
import { HelpSearch } from "./components/HelpSearch";
import { VersionBadge } from "./components/VersionBadge";
import { TYPST_DOCS_URL } from "./typstVersion";

export function HelpCenterIndex() {
  return (
    <div className="w-full pb-12">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[#007bff] mb-1.5">
            <BookOpen className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Trung tâm trợ giúp</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Tài liệu &amp; hướng dẫn
            </h1>
            <VersionBadge />
          </div>
          <p className="text-slate-500 mt-1.5 text-[15px] max-w-2xl">
            Hướng dẫn sử dụng TLU Scholar Editor và học cú pháp Typst, gõ tiếng Việt — đúng với phiên
            bản hệ thống đang dùng.
          </p>
        </div>
        <Button asChild className="bg-[#007bff] hover:bg-[#0056b3] text-white shrink-0">
          <a href={TYPST_DOCS_URL} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4 mr-2" />
            Tài liệu Typst
          </a>
        </Button>
      </div>

      {/* Tìm kiếm */}
      <div className="mb-8 max-w-2xl">
        <HelpSearch />
      </div>

      {/* Lưới chủ đề */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {HELP_TOPICS.map((topic) => (
          <Link
            key={topic.slug}
            to={`/huong-dan/${topic.slug}`}
            className="group bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-blue-200 hover:shadow-md transition-all flex flex-col"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="w-10 h-10 rounded-lg bg-blue-50 text-[#007bff] flex items-center justify-center shrink-0">
                <topic.icon className="w-5 h-5" />
              </span>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#007bff] group-hover:translate-x-0.5 transition-all" />
            </div>
            <h2 className="text-[15px] font-semibold text-slate-900 mb-1">{topic.title}</h2>
            <p className="text-sm text-slate-500 leading-relaxed">{topic.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
