import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useParams } from "react-router";
import { Asterisk, BookMarked, ChevronRight, Search, X } from "lucide-react";
import { cn } from "../../../components/ui/utils";
import { HELP_TOPICS, normalizeText } from "../helpContent";
import { REFERENCE } from "../reference";
import { SYMBOL_TOTAL } from "../reference/symbolMeta";

const SECTION_LABEL = "px-3 pb-1.5 pt-4 text-xs font-semibold uppercase tracking-wider text-slate-400";

/**
 * Sidebar điều hướng toàn Trung tâm trợ giúp (kiểu typst.app/docs): ô lọc +
 * Tổng quan + nhóm "Hướng dẫn" (các chủ đề) + nhóm "Thư viện" (danh mục tra cứu
 * mở ra danh sách hàm + ký hiệu). Tự mở nhóm đang xem, tô sáng mục hiện tại.
 */
export function HelpSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { category: activeCat, fn: activeFn } = useParams<{
    topic: string;
    category: string;
    fn: string;
  }>();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    activeCat ? { [activeCat]: true } : {},
  );

  useEffect(() => {
    if (activeCat) setExpanded((e) => (e[activeCat] ? e : { ...e, [activeCat]: true }));
  }, [activeCat]);

  const q = normalizeText(query);
  const topics = useMemo(
    () => (q ? HELP_TOPICS.filter((t) => normalizeText(`${t.title} ${t.summary}`).includes(q)) : HELP_TOPICS),
    [q],
  );
  const groups = useMemo(() => {
    if (!q) return REFERENCE.map((cat) => ({ cat, fns: cat.fns }));
    return REFERENCE.map((cat) => {
      const catMatch = normalizeText(`${cat.title} ${cat.slug}`).includes(q);
      const fns = catMatch ? cat.fns : cat.fns.filter((f) => normalizeText(f.name).includes(q));
      return { cat, fns };
    }).filter((g) => g.fns.length > 0);
  }, [q]);
  const showSymbols = !q || normalizeText("ky hieu symbols").includes(q);

  const isOpen = (slug: string) => (q ? true : !!expanded[slug]);
  const toggle = (slug: string) => setExpanded((e) => ({ ...e, [slug]: !e[slug] }));
  const item = (active: boolean) =>
    cn(
      "rounded-lg px-3 py-1.5 transition-colors",
      active ? "bg-blue-50 font-medium text-[#007bff]" : "text-slate-700 hover:bg-slate-100",
    );

  return (
    <div className="text-sm">
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Lọc chủ đề, hàm…"
          aria-label="Lọc tài liệu"
          className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Xoá lọc"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <NavLink
        to="/huong-dan"
        end
        onClick={onNavigate}
        className={({ isActive }) => cn("block", item(isActive))}
      >
        Tổng quan
      </NavLink>

      {topics.length > 0 && (
        <>
          <p className={SECTION_LABEL}>Hướng dẫn</p>
          <ul className="space-y-0.5">
            {topics.map((t) => (
              <li key={t.slug}>
                <NavLink
                  to={`/huong-dan/${t.slug}`}
                  onClick={onNavigate}
                  className={({ isActive }) => cn("flex items-start gap-2", item(isActive))}
                >
                  <t.icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0">{t.title}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </>
      )}

      {(groups.length > 0 || showSymbols) && (
        <>
          <p className={SECTION_LABEL}>Thư viện (Tra cứu)</p>
          <NavLink
            to="/huong-dan/tra-cuu"
            end
            onClick={onNavigate}
            className={({ isActive }) => cn("flex items-center gap-2", item(isActive))}
          >
            <BookMarked className="h-4 w-4 shrink-0" />
            <span className="truncate">Tất cả danh mục</span>
          </NavLink>

          <ul className="mt-0.5 space-y-0.5">
            {groups.map(({ cat, fns }) => {
              const open = isOpen(cat.slug);
              const catActive = activeCat === cat.slug;
              return (
                <li key={cat.slug}>
                  <div
                    className={cn(
                      "group flex items-center rounded-lg",
                      catActive && !activeFn ? "bg-blue-50" : "hover:bg-slate-100",
                    )}
                  >
                    <Link
                      to={`/huong-dan/tra-cuu/${cat.slug}`}
                      onClick={onNavigate}
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-2 px-2.5 py-1.5",
                        catActive ? "font-medium text-[#007bff]" : "text-slate-700",
                      )}
                    >
                      <cat.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{cat.title}</span>
                      <span className="ml-auto shrink-0 text-[11px] text-slate-400">{fns.length}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggle(cat.slug)}
                      aria-label={open ? "Thu gọn" : "Mở rộng"}
                      aria-expanded={open}
                      className="shrink-0 p-1.5 text-slate-400 hover:text-slate-700"
                    >
                      <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
                    </button>
                  </div>

                  {open && (
                    <ul className="mb-1 ml-3 mt-0.5 border-l border-slate-200">
                      {fns.map((f) => (
                        <li key={f.slug}>
                          <NavLink
                            to={`/huong-dan/tra-cuu/${cat.slug}/${f.slug}`}
                            onClick={onNavigate}
                            className={({ isActive }) =>
                              cn(
                                "-ml-px block truncate border-l-2 py-1 pl-3 pr-2 font-mono text-[13px] transition-colors",
                                isActive
                                  ? "border-[#007bff] bg-blue-50/60 font-medium text-[#007bff]"
                                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900",
                              )
                            }
                          >
                            {f.name}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>

          {showSymbols && (
            <NavLink
              to="/huong-dan/tra-cuu/symbols"
              onClick={onNavigate}
              className={({ isActive }) => cn("mt-0.5 flex items-center gap-2", item(isActive))}
            >
              <Asterisk className="h-4 w-4 shrink-0" />
              <span className="truncate">Ký hiệu (Symbols)</span>
              <span className="ml-auto shrink-0 text-[11px] text-slate-400">{SYMBOL_TOTAL}</span>
            </NavLink>
          )}
        </>
      )}

      {topics.length === 0 && groups.length === 0 && !showSymbols && (
        <p className="px-3 py-3 text-sm text-slate-400">Không có kết quả.</p>
      )}
    </div>
  );
}
