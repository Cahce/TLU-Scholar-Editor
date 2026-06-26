import { useEffect, useState } from "react";
import { cn } from "../../../components/ui/utils";

export interface TocItem {
  id: string;
  label: string;
  /** Mục con (thụt lề, font mono) — vd một định nghĩa con. */
  sub?: boolean;
}

/**
 * Mục lục "Trong trang này" (kiểu typst.app/docs): danh sách neo tới các mục
 * trong trang + scroll-spy đánh dấu mục đang xem. Sticky bên phải nội dung.
 */
export function OnThisPage({ items, className }: { items: TocItem[]; className?: string }) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    if (items.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "0px 0px -75% 0px", threshold: 0 },
    );
    for (const it of items) {
      const el = document.getElementById(it.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  const nav = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  if (items.length === 0) return null;

  return (
    <aside className={className}>
      <nav className="sticky top-0 max-h-[calc(100vh-7rem)] overflow-y-auto pb-8" aria-label="Trong trang này">
        <p className="pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Trong trang này
        </p>
        <ul className="border-l border-slate-200">
          {items.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => nav(it.id)}
                aria-current={active === it.id ? "true" : undefined}
                className={cn(
                  "block w-full -ml-px truncate border-l-2 py-1 text-left text-sm transition-colors",
                  it.sub ? "pl-5" : "pl-3",
                  active === it.id
                    ? "border-[#007bff] text-[#007bff] font-medium"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900",
                )}
              >
                {it.sub ? <code className="font-mono text-[12px]">{it.label}</code> : it.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
