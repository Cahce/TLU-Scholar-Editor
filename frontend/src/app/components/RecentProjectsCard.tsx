import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Clock, Loader2, Play } from "lucide-react";
import { Button } from "./ui/button";
import { listProjects } from "../api/projects";
import type { Project } from "../types/api";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN").format(date);
}

interface RecentProjectsCardProps {
  /** Where the "Xem tất cả" link points (the role dashboard, e.g. "/student"). */
  viewAllPath: string;
  /** Max number of projects to show. Defaults to 3. */
  limit?: number;
}

/**
 * Recent-projects widget shared by the student and teacher profile pages.
 *
 * Backend `GET /api/v1/projects` returns the projects owned by the
 * authenticated user for both roles (see TeacherDashboard), so a single
 * implementation keeps the two profiles in sync. Shows the most recently
 * updated projects and links into the workspace.
 */
export function RecentProjectsCard({ viewAllPath, limit = 3 }: RecentProjectsCardProps) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { projects: all } = await listProjects();
        if (cancelled) return;
        const top = [...all]
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          )
          .slice(0, limit);
        setProjects(top);
      } catch {
        if (!cancelled) setProjects([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#007bff]" />
          <h3 className="font-semibold text-slate-900 text-[15px]">Project gần đây</h3>
        </div>
        <Button
          variant="link"
          onClick={() => navigate(viewAllPath)}
          className="text-[#007bff] text-xs h-auto p-0 font-medium hover:text-[#0056b3]"
        >
          Xem tất cả
        </Button>
      </div>
      <div className="p-0">
        {loading ? (
          <div className="px-6 py-8 flex items-center justify-center gap-2 text-slate-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-[#007bff]" />
            Đang tải project...
          </div>
        ) : projects.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {projects.map((project) => (
              <li key={project.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                <div className="flex flex-col overflow-hidden pr-4">
                  <button
                    type="button"
                    onClick={() => navigate(`/workspace/${project.id}`)}
                    className="text-sm font-medium text-slate-900 truncate text-left group-hover:text-[#007bff] transition-colors focus:outline-none focus:text-[#007bff]"
                  >
                    {project.title}
                  </button>
                  <span className="text-xs text-slate-500 mt-0.5">
                    Cập nhật: {formatDate(project.updatedAt)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/workspace/${project.id}`)}
                  className="shrink-0 h-8 text-slate-500 hover:text-[#007bff] hover:bg-blue-50"
                >
                  <Play className="w-3.5 h-3.5 mr-1.5" />
                  Mở
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 py-8 text-center text-sm text-slate-500">
            Bạn chưa có project nào.
          </div>
        )}
      </div>
    </div>
  );
}
