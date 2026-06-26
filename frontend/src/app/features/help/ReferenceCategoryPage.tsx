import { Link, useParams } from "react-router";
import { ArrowRight, ChevronRight, FileQuestion } from "lucide-react";
import { Button } from "../../components/ui/button";
import { getCategory } from "./reference";
import { VersionBadge } from "./components/VersionBadge";

const KIND_LABEL: Record<string, string> = {
  function: "Hàm",
  element: "Phần tử",
  type: "Kiểu",
  module: "Module",
  group: "Nhóm",
};

export function ReferenceCategoryPage() {
  const { category } = useParams<{ category: string }>();
  const cat = getCategory(category);

  if (!cat) {
    return (
      <div className="w-full max-w-2xl mx-auto pb-12">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <span className="mx-auto mb-4 w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
            <FileQuestion className="w-6 h-6" />
          </span>
          <h1 className="text-lg font-semibold text-slate-900">Không tìm thấy nhóm tra cứu</h1>
          <Button asChild className="mt-5 bg-[#007bff] hover:bg-[#0056b3] text-white">
            <Link to="/huong-dan/tra-cuu">Về Tra cứu Typst</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-12">
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 flex-wrap" aria-label="Đường dẫn">
        <Link to="/huong-dan" className="hover:text-[#007bff]">Trung tâm trợ giúp</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <Link to="/huong-dan/tra-cuu" className="hover:text-[#007bff]">Tra cứu Typst</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-slate-700 font-medium">{cat.title}</span>
      </nav>

      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{cat.title}</h1>
          <VersionBadge />
          <span className="text-sm text-slate-400">{cat.fns.length} mục</span>
        </div>
        <p className="text-slate-500 mt-1.5 text-[15px] max-w-2xl">{cat.summary}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cat.fns.map((fn) => (
          <Link
            key={fn.slug}
            to={`/huong-dan/tra-cuu/${cat.slug}/${fn.slug}`}
            className="group bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-blue-200 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <code className="font-mono text-[15px] font-semibold text-slate-900">{fn.name}</code>
              <span className="shrink-0 inline-flex items-center gap-1.5">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {KIND_LABEL[fn.kind] ?? fn.kind}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#007bff] group-hover:translate-x-0.5 transition-all" />
              </span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">{fn.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
