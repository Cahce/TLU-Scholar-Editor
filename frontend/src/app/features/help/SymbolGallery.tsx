import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ChevronRight, ExternalLink, Search, X } from "lucide-react";
import { toast } from "sonner";
import { normalizeText } from "./helpContent";
import { SYMBOL_BASE_COUNT, SYMBOL_COUNT, SYMBOL_GROUPS, type SymbolGroup } from "./reference/symbols";
import { VersionBadge } from "./components/VersionBadge";

export function SymbolGallery() {
  const [query, setQuery] = useState("");

  const groups: SymbolGroup[] = useMemo(() => {
    const q = normalizeText(query);
    if (!q) return SYMBOL_GROUPS;
    const items = SYMBOL_GROUPS.flatMap((g) => g.items).filter(
      (it) => normalizeText(it.name).includes(q) || it.glyph === query.trim(),
    );
    return items.length ? [{ title: `Kết quả (${items.length})`, items }] : [];
  }, [query]);

  const copy = async (name: string) => {
    try {
      await navigator.clipboard.writeText(name);
      toast.success(`Đã sao chép: ${name}`);
    } catch {
      toast.error("Trình duyệt không cho phép sao chép");
    }
  };

  return (
    <div className="w-full pb-12">
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 flex-wrap" aria-label="Đường dẫn">
        <Link to="/huong-dan" className="hover:text-[#007bff]">Trung tâm trợ giúp</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <Link to="/huong-dan/tra-cuu" className="hover:text-[#007bff]">Tra cứu Typst</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-slate-700 font-medium">Ký hiệu</span>
      </nav>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Ký hiệu (Symbols)</h1>
            <VersionBadge />
          </div>
          <p className="text-slate-500 mt-1.5 text-[15px] max-w-2xl">
            Toàn bộ <strong className="text-slate-700">{SYMBOL_COUNT}</strong> ký hiệu (gồm mọi biến
            thể) của mô-đun <code className="font-mono text-[13px]">sym</code> trong Typst v0.14.2,
            từ {SYMBOL_BASE_COUNT} tên gốc. Bấm một ký hiệu để sao chép tên dùng trong math mode (vd{" "}
            <code className="font-mono text-[13px]">arrow.r.double</code>).
          </p>
        </div>
        <a
          href="https://typst.app/docs/reference/symbols/sym/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#007bff] hover:underline shrink-0"
        >
          <ExternalLink className="w-4 h-4" />
          Bảng ký hiệu đầy đủ
        </a>
      </div>

      <div className="mb-8 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm ký hiệu theo tên (vd: alpha, arrow, subset...)"
          className="w-full h-11 pl-10 pr-10 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label="Xoá tìm kiếm"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Không tìm thấy ký hiệu cho <span className="font-medium text-slate-700">“{query}”</span>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.title}>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                {group.title}
              </h2>
              <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(104px,1fr))]">
                {group.items.map((it) => (
                  <button
                    key={it.name}
                    type="button"
                    onClick={() => void copy(it.name)}
                    title={`Sao chép: ${it.name}`}
                    className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-white py-3 px-2 hover:border-blue-200 hover:bg-blue-50/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007bff]"
                  >
                    <span className="text-2xl leading-none text-slate-900">{it.glyph}</span>
                    <span className="font-mono text-[11px] text-slate-500 truncate max-w-full">{it.name}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
