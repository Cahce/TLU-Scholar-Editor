import { useState } from "react";
import { Outlet } from "react-router";
import { Menu } from "lucide-react";
import { HelpSidebar } from "./components/HelpSidebar";

/**
 * Khung Trung tâm trợ giúp kiểu typst.app/docs: sidebar điều hướng bên trái
 * (Tổng quan + Hướng dẫn + Thư viện) sticky trên desktop / drawer trên mobile,
 * vùng nội dung (Outlet) ở giữa. Cột "Trong trang này" do từng trang tự render.
 */
export function HelpDocsLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex gap-6 lg:gap-8">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-0 max-h-[calc(100vh-7rem)] overflow-y-auto pb-8 pr-1">
          <HelpSidebar />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="lg:hidden mb-4">
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Menu className="h-4 w-4" />
            Mục lục tài liệu
          </button>
          {mobileOpen && (
            <div className="mt-2 max-h-[60vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <HelpSidebar onNavigate={() => setMobileOpen(false)} />
            </div>
          )}
        </div>

        <Outlet />
      </div>
    </div>
  );
}
