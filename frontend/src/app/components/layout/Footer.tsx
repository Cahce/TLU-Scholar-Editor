import { Link } from "react-router";

export function Footer() {
  return (
    <footer className="h-14 bg-white border-t border-slate-200 flex items-center px-4 lg:px-6 shrink-0 mt-auto">
      <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-2 text-xs text-slate-500">
        <p>© 2026 Trường Đại học Thủy Lợi. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <Link to="/support" className="hover:text-slate-900 transition-colors">
            Hỗ trợ
          </Link>
          <span className="w-1 h-1 bg-slate-300 rounded-full" />
          <span>Phiên bản 1.0</span>
        </div>
      </div>
    </footer>
  );
}