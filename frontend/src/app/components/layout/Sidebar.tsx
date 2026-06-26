import { useLocation, Link } from "react-router";
import { useState, useEffect } from "react";
import { 
  FolderKanban, 
  PlusSquare, 
  FileText, 
  History, 
  Settings,
  User,
  Users,
  GraduationCap,
  LayoutTemplate,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Building2,
  Book,
  ChevronDown,
  Library,
  UsersRound,
  Folder,
  LayoutDashboard,
  BookUser,
  Plus
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

type Role = "student" | "teacher" | "admin";

interface SidebarProps {
  role: Role;
  onCloseMobile?: () => void;
}

type MenuItemType = "primary" | "divider" | "link" | "group";

interface MenuItem {
  type?: MenuItemType;
  label?: string;
  icon?: any;
  path?: string;
  children?: MenuItem[];
}

const MENU_ITEMS: Record<Role, MenuItem[]> = {
  student: [
    { type: "primary", label: "Tạo project mới", icon: Plus, path: "/student/new" },
    { type: "divider" },
    { type: "link", label: "Bảng điều khiển", icon: LayoutDashboard, path: "/student" },
    { type: "link", label: "Lịch sử chỉnh sửa", icon: History, path: "/student/history" },
    { type: "divider" },
    { type: "link", label: "Hồ sơ cá nhân", icon: User, path: "/student/profile" },
    { type: "link", label: "Cài đặt", icon: Settings, path: "/student/settings" },
  ],
  teacher: [
    { type: "primary", label: "Tạo project mới", icon: Plus, path: "/teacher/new" },
    { type: "divider" },
    { type: "link", label: "Tất cả project", icon: Library, path: "/teacher/all" },
    { type: "link", label: "Project của tôi", icon: Folder, path: "/teacher" },
    { type: "link", label: "Project được chia sẻ", icon: Users, path: "/teacher/shared" },
    { type: "link", label: "Đồ án tốt nghiệp", icon: GraduationCap, path: "/teacher/thesis" },
    { type: "divider" },
    { type: "link", label: "Lịch sử chỉnh sửa", icon: History, path: "/teacher/history" },
    { type: "link", label: "Hồ sơ cá nhân", icon: User, path: "/teacher/profile" },
    { type: "link", label: "Cài đặt", icon: Settings, path: "/teacher/settings" },
  ],
  admin: [
    { type: "link", label: "Tổng quan", icon: LayoutDashboard, path: "/admin/overview" },
    { type: "divider" },
    { type: "link", label: "Quản lý tài khoản", icon: Users, path: "/admin/accounts" },
    { type: "link", label: "Sinh viên", icon: GraduationCap, path: "/admin/students" },
    { type: "link", label: "Giảng viên", icon: BookUser, path: "/admin/teachers" },
    { type: "divider" },
    { type: "link", label: "Quản lý dự án", icon: FolderKanban, path: "/admin/projects" },
    { type: "divider" },
    { type: "link", label: "Khoa", icon: Building2, path: "/admin/faculties" },
    { type: "link", label: "Bộ môn", icon: Library, path: "/admin/departments" },
    { type: "link", label: "Ngành", icon: Book, path: "/admin/majors" },
    { type: "link", label: "Lớp", icon: UsersRound, path: "/admin/classes" },
    { type: "divider" },
    { type: "link", label: "Mẫu tài liệu", icon: LayoutTemplate, path: "/admin/templates" },
  ]
};

export function Sidebar({ role, onCloseMobile }: SidebarProps) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  
  const items = MENU_ITEMS[role] || MENU_ITEMS.student;

  // Auto-expand groups if a child is active
  useEffect(() => {
    if (!isCollapsed) {
      const newExpanded = { ...expandedGroups };
      let changed = false;
      items.forEach(item => {
        if (item.children && item.label) {
          const isChildActive = item.children.some(child => location.pathname === child.path);
          if (isChildActive && !newExpanded[item.label]) {
            newExpanded[item.label] = true;
            changed = true;
          }
        }
      });
      if (changed) {
        setExpandedGroups(newExpanded);
      }
    }
  }, [location.pathname, isCollapsed, items]);

  const toggleGroup = (label: string) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setExpandedGroups(prev => ({ ...prev, [label]: true }));
    } else {
      setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
    }
  };

  return (
    <aside 
      className={cn(
        "h-full bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 transition-all duration-300 relative group z-10",
        isCollapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Collapse Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-6 w-7 h-7 bg-white border border-slate-200 rounded-full items-center justify-center text-slate-500 hover:text-[#007bff] hover:border-[#007bff] hover:bg-blue-50 shadow-sm transition-all hidden md:flex z-20"
        title={isCollapsed ? "Mở rộng" : "Thu gọn"}
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4 ml-0.5" /> : <ChevronLeft className="w-4 h-4 mr-0.5" />}
      </button>

      <div className={cn("flex-1 py-5 overflow-y-auto overflow-x-hidden", isCollapsed ? "px-3" : "px-4")}>
        {items.map((item, index) => {
          if (item.type === "divider") {
            return (
              <div 
                key={`divider-${index}`} 
                className={cn("h-px bg-slate-200 my-3", isCollapsed ? "mx-2" : "mx-2")} 
              />
            );
          }

          if (item.type === "primary") {
            const Icon = item.icon;
            return (
              <Link
                key={item.path || `primary-${index}`}
                to={item.path!}
                onClick={onCloseMobile}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap overflow-hidden group shadow-sm bg-[#007bff] hover:bg-[#0069d9] text-white mb-2",
                  isCollapsed ? "justify-center w-11 h-11 mx-auto" : "gap-3 px-4 py-3 mx-1 mt-1"
                )}
              >
                <Icon className={cn("shrink-0 text-white", isCollapsed ? "w-5 h-5" : "w-5 h-5")} />
                <span className={cn(
                  "transition-all duration-300", 
                  isCollapsed ? "opacity-0 w-0 hidden" : "opacity-100 w-auto"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          }

          const Icon = item.icon;

          if (item.children && item.label) {
            const isAnyChildActive = item.children.some(child => location.pathname === child.path);
            const isExpanded = expandedGroups[item.label];

            return (
              <div key={item.label} className="flex flex-col mb-1">
                <button
                  onClick={() => toggleGroup(item.label!)}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center justify-between rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap overflow-hidden group cursor-pointer w-full focus:outline-none",
                    isCollapsed ? "justify-center w-11 h-11 mx-auto" : "px-3 py-2.5",
                    (isAnyChildActive && isCollapsed)
                      ? "bg-blue-50 text-[#007bff]" 
                      : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                  )}
                >
                  <div className={cn("flex items-center", isCollapsed ? "" : "gap-3")}>
                    <Icon className={cn("shrink-0", isCollapsed ? "w-5 h-5" : "w-5 h-5", (isAnyChildActive && isCollapsed) ? "text-[#007bff]" : "text-slate-400 group-hover:text-slate-600")} />
                    <span className={cn(
                      "transition-all duration-300", 
                      isCollapsed ? "opacity-0 w-0 hidden" : "opacity-100 w-auto"
                    )}>
                      {item.label}
                    </span>
                  </div>
                  {!isCollapsed && (
                    <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0", isExpanded ? "rotate-180" : "")} />
                  )}
                </button>
                
                {/* Children */}
                <div 
                  className={cn(
                    "overflow-hidden transition-all duration-200",
                    (!isCollapsed && isExpanded) ? "max-h-40 opacity-100 mt-1" : "max-h-0 opacity-0 mt-0"
                  )}
                >
                  <div className="space-y-1 pl-11 pr-0 pb-1">
                    {item.children.map(child => {
                      const isChildActive = location.pathname === child.path;
                      return (
                        <Link
                          key={child.path}
                          to={child.path!}
                          onClick={onCloseMobile}
                          className={cn(
                            "block rounded-lg text-sm font-medium transition-all duration-200 py-2 px-3",
                            isChildActive 
                              ? "bg-blue-50 text-[#007bff] hover:bg-blue-100" 
                              : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-900"
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          }

          // Normal single item rendering
          if (!item.path) return null;

          const isActive = location.pathname === item.path || (location.pathname === `/${role}` && item.path === `/${role}`);
          
          return (
            <div key={item.path} className="mb-1 last:mb-0">
              <Link
                to={item.path}
                onClick={onCloseMobile}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap overflow-hidden group",
                  isCollapsed ? "justify-center w-11 h-11 mx-auto" : "gap-3 px-3 py-2.5",
                  isActive 
                    ? "bg-blue-50 text-[#007bff] hover:bg-blue-100" 
                    : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                )}
              >
                {Icon && <Icon className={cn("shrink-0", isCollapsed ? "w-5 h-5" : "w-5 h-5", isActive ? "text-[#007bff]" : "text-slate-400 group-hover:text-slate-600")} />}
                <span className={cn(
                  "transition-all duration-300", 
                  isCollapsed ? "opacity-0 w-0 hidden" : "opacity-100 w-auto"
                )}>
                  {item.label}
                </span>
              </Link>
            </div>
          );
        })}
      </div>
      
      {/* Help Center / Bottom Area */}
      <div className={cn("p-4 border-t border-slate-200 transition-all bg-slate-50", isCollapsed ? "flex justify-center" : "")}>
        {isCollapsed ? (
          <Link
            to="/huong-dan"
            onClick={onCloseMobile}
            title="Trung tâm trợ giúp"
            className="w-11 h-11 flex items-center justify-center text-slate-500 hover:text-[#007bff] hover:bg-blue-50 rounded-xl transition-colors"
          >
            <HelpCircle className="w-5 h-5" />
          </Link>
        ) : (
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <HelpCircle className="w-4 h-4 text-[#007bff]" />
              <p className="text-sm font-bold text-slate-900">Cần hỗ trợ?</p>
            </div>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">Xem tài liệu hướng dẫn hoặc liên hệ Admin.</p>
            <Link
              to="/huong-dan"
              onClick={onCloseMobile}
              className="block w-full text-center text-xs font-semibold text-[#007bff] bg-blue-50 hover:bg-blue-100 py-2.5 rounded-lg transition-colors border border-blue-100"
            >
              Trung tâm trợ giúp
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}