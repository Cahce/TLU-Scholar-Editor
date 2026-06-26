import { useEffect, useMemo } from "react";
import { Link, useLocation, useParams } from "react-router";
import { ChevronRight, FileQuestion } from "lucide-react";
import { Button } from "../../components/ui/button";
import { getFn } from "./reference";
import { FunctionDetail } from "./components/FunctionDetail";
import { OnThisPage, type TocItem } from "./components/OnThisPage";

export function ReferenceFnPage() {
  const { category, fn } = useParams<{ category: string; fn: string }>();
  const found = getFn(category, fn);
  const { hash } = useLocation();

  // Cuộn tới định nghĩa con khi điều hướng kèm #<member.slug>.
  useEffect(() => {
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
    return () => window.clearTimeout(t);
  }, [hash, category, fn]);

  const refFn = found?.fn;
  const toc = useMemo<TocItem[]>(() => {
    if (!refFn) return [];
    const items: TocItem[] = [
      { id: "tom-tat", label: "Tóm tắt" },
      { id: "chu-ky", label: "Chữ ký" },
      { id: "tham-so", label: "Tham số" },
    ];
    if (refFn.examples?.length || refFn.snapshotId) items.push({ id: "vi-du", label: "Ví dụ" });
    if (refFn.paramExamples?.length) items.push({ id: "vi-du-tham-so", label: "Ví dụ tham số" });
    if (refFn.members?.length) {
      items.push({ id: "dinh-nghia-con", label: "Định nghĩa con" });
      for (const m of refFn.members) items.push({ id: m.slug, label: m.name, sub: true });
    }
    return items;
  }, [refFn]);

  if (!found) {
    return (
      <div className="w-full max-w-2xl mx-auto pb-12">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <span className="mx-auto mb-4 w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
            <FileQuestion className="w-6 h-6" />
          </span>
          <h1 className="text-lg font-semibold text-slate-900">Không tìm thấy mục tra cứu</h1>
          <Button asChild className="mt-5 bg-[#007bff] hover:bg-[#0056b3] text-white">
            <Link to="/huong-dan/tra-cuu">Về Tra cứu Typst</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { category: cat } = found;

  return (
    <div className="w-full pb-12">
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 flex-wrap" aria-label="Đường dẫn">
        <Link to="/huong-dan" className="hover:text-[#007bff]">Trung tâm trợ giúp</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <Link to="/huong-dan/tra-cuu" className="hover:text-[#007bff]">Tra cứu Typst</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <Link to={`/huong-dan/tra-cuu/${cat.slug}`} className="hover:text-[#007bff]">{cat.title}</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-slate-700 font-medium font-mono">{refFn!.name}</span>
      </nav>

      <div className="xl:flex xl:gap-8">
        <div className="min-w-0 xl:flex-1">
          <FunctionDetail fn={refFn!} />
        </div>
        <OnThisPage items={toc} className="hidden xl:block xl:w-52 xl:shrink-0" />
      </div>
    </div>
  );
}
