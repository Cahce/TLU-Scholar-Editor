import { useEffect, useState } from "react";
import {
  FolderKanban,
  GraduationCap,
  LayoutTemplate,
  Loader2,
  Users,
} from "lucide-react";
import { useTeachers } from "../../../hooks/admin/useTeachers";
import { useStudents } from "../../../hooks/admin/useStudents";
import { listProjects } from "../../../api/projects";
import { listTemplates } from "../../../api/templates";

interface StatCardProps {
  label: string;
  value: number | null;
  loading: boolean;
  icon: React.ReactNode;
  tone: "emerald" | "blue" | "purple" | "amber";
}

const TONE_CLASSES: Record<StatCardProps["tone"], { bg: string; border: string; text: string }> = {
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    text: "text-emerald-600",
  },
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-100",
    text: "text-[#007bff]",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-100",
    text: "text-purple-600",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-100",
    text: "text-amber-600",
  },
};

function StatCard({ label, value, loading, icon, tone }: StatCardProps) {
  const tc = TONE_CLASSES[tone];
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
      <div
        className={`w-12 h-12 rounded-lg ${tc.bg} border ${tc.border} ${tc.text} flex items-center justify-center shrink-0`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <h4 className="text-2xl font-bold text-slate-900 mt-1">
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-slate-400 inline-block" />
          ) : value === null ? (
            "—"
          ) : (
            value.toLocaleString("vi-VN")
          )}
        </h4>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  // Teachers and Students use existing paginated hooks — fetch pageSize=1
  // and read `total` for the canonical count.
  const { data: teachersData, loading: teachersLoading } = useTeachers({
    page: 1,
    pageSize: 1,
  });
  const { data: studentsData, loading: studentsLoading } = useStudents({
    page: 1,
    pageSize: 1,
  });

  // Projects and templates don't have dedicated admin-scoped hooks; query
  // directly via the existing API clients.
  const [projectCount, setProjectCount] = useState<number | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [templateCount, setTemplateCount] = useState<number | null>(null);
  const [templateLoading, setTemplateLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await listProjects();
        if (!cancelled) setProjectCount(res.projects?.length ?? 0);
      } catch {
        if (!cancelled) setProjectCount(null);
      } finally {
        if (!cancelled) setProjectLoading(false);
      }
    })();
    void (async () => {
      try {
        const res = await listTemplates({ page: 1, pageSize: 1 });
        if (!cancelled) setTemplateCount(res.total ?? 0);
      } catch {
        if (!cancelled) setTemplateCount(null);
      } finally {
        if (!cancelled) setTemplateLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Tổng quan (Admin)
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Quản lý và giám sát hoạt động hệ thống TLU Scholar Editor
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
        <StatCard
          label="Tổng số giảng viên"
          value={teachersData?.total ?? null}
          loading={teachersLoading}
          icon={<Users className="w-6 h-6" />}
          tone="emerald"
        />
        <StatCard
          label="Tổng số sinh viên"
          value={studentsData?.total ?? null}
          loading={studentsLoading}
          icon={<GraduationCap className="w-6 h-6" />}
          tone="blue"
        />
        <StatCard
          label="Dự án đã được tạo"
          value={projectCount}
          loading={projectLoading}
          icon={<FolderKanban className="w-6 h-6" />}
          tone="purple"
        />
        <StatCard
          label="Tổng số tài liệu mẫu"
          value={templateCount}
          loading={templateLoading}
          icon={<LayoutTemplate className="w-6 h-6" />}
          tone="amber"
        />
      </div>
    </div>
  );
}
