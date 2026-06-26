import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "../../../components/ui/utils";

export interface HelpSection {
  id: string;
  label: string;
  icon: LucideIcon;
  content: ReactNode;
}

interface HelpLayoutProps {
  title: string;
  description?: ReactNode;
  /** Badge phía tiêu đề, ví dụ <VersionBadge />. */
  badge?: ReactNode;
  /** Hành động phụ bên phải tiêu đề, ví dụ nút "Tài liệu Typst". */
  action?: ReactNode;
  sections: HelpSection[];
}

/**
 * Khung trang tài liệu: breadcrumb + tiêu đề + mục lục sticky (xl) / pill cuộn
 * ngang (mobile) + scroll-spy. Mỗi section render trong một thẻ có header icon.
 */
export function HelpLayout({ title, description, badge, action, sections }: HelpLayoutProps) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 0 },
    );
    sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  const handleNav = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="w-full pb-12">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-slate-500" aria-label="Đường dẫn">
        <Link to="/huong-dan" className="hover:text-[#007bff] transition-colors">
          Trung tâm trợ giúp
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-slate-700 font-medium">{title}</span>
      </nav>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
            {badge}
          </div>
          {description && (
            <p className="text-slate-500 mt-1.5 text-[15px] max-w-2xl">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {/* Mục lục dạng pill (mobile / tablet) */}
      {sections.length > 1 && (
        <div className="xl:hidden -mx-1 mb-5 flex gap-2 overflow-x-auto pb-2">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => handleNav(section.id)}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-blue-200 hover:text-[#007bff] transition-colors"
            >
              <section.icon className="w-3.5 h-3.5" />
              {section.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_256px] gap-8 items-start">
        {/* Nội dung */}
        <div className="space-y-6 min-w-0">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/60">
                  <span className="w-8 h-8 rounded-lg bg-blue-50 text-[#007bff] flex items-center justify-center shrink-0">
                    <section.icon className="w-4 h-4" />
                  </span>
                  <h2 className="text-lg font-semibold text-slate-900">{section.label}</h2>
                </div>
                <div className="p-5 sm:p-6 space-y-4 text-[15px] leading-relaxed text-slate-700">
                  {section.content}
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* Mục lục sticky (desktop) */}
        {sections.length > 1 && (
          <aside className="hidden xl:block">
            <nav className="sticky top-0 space-y-1" aria-label="Mục lục trang">
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Nội dung
              </p>
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => handleNav(section.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-left transition-colors",
                    active === section.id
                      ? "bg-blue-50 text-[#007bff] font-medium"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                  aria-current={active === section.id ? "true" : undefined}
                >
                  <section.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{section.label}</span>
                </button>
              ))}
            </nav>
          </aside>
        )}
      </div>
    </div>
  );
}
