import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronDown, HelpCircle, Menu } from "lucide-react";
import { Button } from "../ui/button";
import { BrandLogo } from "../BrandLogo";
import { useAuthStore } from "../../stores/authStore";
import { logout } from "../../api/auth";
import { ROLE_BADGE_CLASSES } from "../../lib/roleBadge";

interface HeaderProps {
  role: "student" | "teacher" | "admin";
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

const ROLE_LABELS = {
  student: "Sinh viên",
  teacher: "Giảng viên",
  admin: "Quản trị viên",
};

// Shared canonical role colors — keep in sync with the rest of the app
// (admin = slate, teacher = blue, student = purple).
const ROLE_COLORS = ROLE_BADGE_CLASSES;

export function Header({ role, onMenuClick, showMenuButton = true }: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();
  const authUser = useAuthStore((state) => state.user);
  const displayName = authUser?.email ?? ROLE_LABELS[role];

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      navigate("/", { replace: true });
    }
  };

  return (
    <header className="h-[72px] bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shrink-0 z-10">
      <div className="flex items-center gap-3">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-slate-500"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}
        <Link to={`/${role}`} className="flex items-center gap-2 group">
          <BrandLogo size={36} />
          <span className="text-lg font-semibold text-slate-900 hidden sm:block">
            TLU Scholar Editor
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-1">
        <Link
          to="/huong-dan"
          aria-label="Hướng dẫn"
          title="Hướng dẫn"
          className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg text-slate-500 hover:text-[#007bff] hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#007bff] focus:ring-offset-2"
        >
          <HelpCircle className="w-5 h-5" />
        </Link>
        <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          className="flex items-center gap-3 px-3 py-1.5 rounded-lg border border-transparent hover:bg-slate-50 hover:border-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-[#007bff] focus:ring-offset-2"
        >
          <div className="text-right sm:text-left flex flex-col justify-center items-end sm:items-start">
            <p className="text-sm font-semibold text-slate-900 leading-tight mb-1">
              {displayName}
            </p>
            <span
              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${ROLE_COLORS[role]} leading-none uppercase tracking-wider`}
            >
              {ROLE_LABELS[role]}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
        </button>

        {showDropdown && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
            <div className="px-4 py-2 border-b border-slate-100 sm:hidden">
              <p className="text-sm font-medium text-slate-900">{displayName}</p>
              <p className="text-xs text-slate-500 mt-0.5">{ROLE_LABELS[role]}</p>
            </div>
            <Link
              to="/huong-dan"
              className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            >
              Hướng dẫn
            </Link>
            <div className="h-px bg-slate-100 my-2" />
            {role !== "admin" && (
              <>
                <Link
                  to={`/${role}/profile`}
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                >
                  Hồ sơ cá nhân
                </Link>
                <div className="h-px bg-slate-100 my-2" />
              </>
            )}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium disabled:opacity-60"
            >
              {loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
            </button>
          </div>
        )}
        </div>
      </div>
    </header>
  );
}
