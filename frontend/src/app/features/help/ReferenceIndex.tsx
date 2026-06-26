import { Link } from "react-router";
import { ArrowRight, Asterisk, BookMarked, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "../../components/ui/button";
import { REFERENCE } from "./reference";
import { SYMBOL_TOTAL } from "./reference/symbolMeta";
import { ReferenceSearch } from "./components/ReferenceSearch";
import { VersionBadge } from "./components/VersionBadge";
import { TYPST_DOCS_URL } from "./typstVersion";

export function ReferenceIndex() {
  return (
    <div className="w-full pb-12">
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-slate-500" aria-label="Đường dẫn">
        <Link to="/huong-dan" className="hover:text-[#007bff] transition-colors">
          Trung tâm trợ giúp
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-slate-700 font-medium">Tra cứu Typst</span>
      </nav>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[#007bff] mb-1.5">
            <BookMarked className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Bộ tra cứu đầy đủ</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Tra cứu hàm &amp; tham số Typst
            </h1>
            <VersionBadge />
          </div>
          <p className="text-slate-500 mt-1.5 text-[15px] max-w-2xl">
            Mọi hàm/phần tử/kiểu của Typst kèm đầy đủ tham số (kiểu, mặc định, settable, positional),
            ví dụ và ảnh kết quả. Tìm theo tên hàm hoặc tên tham số.
          </p>
        </div>
        <Button asChild className="bg-[#007bff] hover:bg-[#0056b3] text-white shrink-0">
          <a href={`${TYPST_DOCS_URL}reference/`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4 mr-2" />
            Reference gốc
          </a>
        </Button>
      </div>

      <div className="mb-8 max-w-2xl">
        <ReferenceSearch />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REFERENCE.map((cat) => (
          <Link
            key={cat.slug}
            to={`/huong-dan/tra-cuu/${cat.slug}`}
            className="group bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-blue-200 hover:shadow-md transition-all flex flex-col"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="w-10 h-10 rounded-lg bg-blue-50 text-[#007bff] flex items-center justify-center shrink-0">
                <cat.icon className="w-5 h-5" />
              </span>
              <span className="text-xs font-medium text-slate-400">{cat.fns.length} mục</span>
            </div>
            <h2 className="text-[15px] font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
              {cat.title}
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#007bff] group-hover:translate-x-0.5 transition-all" />
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">{cat.summary}</p>
          </Link>
        ))}
        <Link
          to="/huong-dan/tra-cuu/symbols"
          className="group bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-blue-200 hover:shadow-md transition-all flex flex-col"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="w-10 h-10 rounded-lg bg-blue-50 text-[#007bff] flex items-center justify-center shrink-0">
              <Asterisk className="w-5 h-5" />
            </span>
            <span className="text-xs font-medium text-slate-400">{SYMBOL_TOTAL} ký hiệu</span>
          </div>
          <h2 className="text-[15px] font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
            Ký hiệu (Symbols)
            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#007bff] group-hover:translate-x-0.5 transition-all" />
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Bảng ký hiệu toán &amp; đặc biệt — tìm và sao chép tên dùng trong math mode.
          </p>
        </Link>
      </div>
    </div>
  );
}
