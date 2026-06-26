import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  FolderKanban,
  Search,
  Eye,
  ExternalLink,
  FileArchive,
  FileText,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  BookUser,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { SearchableSelect } from "../../../components/admin/SearchableSelect";
import { useMajors } from "../../../hooks/admin/useMajors";
import { useClasses } from "../../../hooks/admin/useClasses";
import { useDepartments } from "../../../hooks/admin/useDepartments";
import { useAdminProjects } from "../../../hooks/admin/useAdminProjects";
import { useAdminProjectStats } from "../../../hooks/admin/useAdminProjectStats";
import {
  exportAdminProject,
  downloadAdminProjectPdf,
} from "../../../api/admin/projects";
import { downloadBlob, defaultExportFilename, sanitizeFilename } from "../../../utils/download";
import { adminToast } from "../_shared/toast";
import {
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  type ProjectOwnerRole,
  type TemplateCategory,
  type ListAdminProjectsQuery,
} from "../../../types/adminProjects";
import { AdminProjectDetailModal } from "./AdminProjectDetailModal";

const PAGE_SIZE = 10;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("vi-VN");
}

export function AdminProjects() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ProjectOwnerRole>("student");

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<TemplateCategory | "">("");
  const [majorFilter, setMajorFilter] = useState(""); // student tab
  const [classFilter, setClassFilter] = useState(""); // student tab
  const [departmentFilter, setDepartmentFilter] = useState(""); // teacher tab
  const [createdFromDate, setCreatedFromDate] = useState("");
  const [createdToDate, setCreatedToDate] = useState("");
  const [page, setPage] = useState(1);

  // Detail + downloads
  const [detailId, setDetailId] = useState<string | null>(null);
  const [downloadingZipId, setDownloadingZipId] = useState<string | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

  // Debounce search → reset to page 1
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Academic-unit filter sources
  const { data: majorsData } = useMajors({ pageSize: 100 });
  const majors = majorsData?.items ?? [];
  const { data: classesData } = useClasses({
    majorId: majorFilter || undefined,
    pageSize: 100,
  });
  const classes = classesData?.items ?? [];
  const { data: departmentsData } = useDepartments({ pageSize: 100 });
  const departments = departmentsData?.items ?? [];

  const isStudentTab = activeTab === "student";

  const query: ListAdminProjectsQuery = {
    ownerRole: activeTab,
    category: category || undefined,
    search: debouncedSearch.trim() || undefined,
    majorId: isStudentTab ? majorFilter || undefined : undefined,
    classId: isStudentTab ? classFilter || undefined : undefined,
    departmentId: !isStudentTab ? departmentFilter || undefined : undefined,
    createdFrom: createdFromDate
      ? new Date(`${createdFromDate}T00:00:00`).toISOString()
      : undefined,
    createdTo: createdToDate
      ? new Date(`${createdToDate}T23:59:59.999`).toISOString()
      : undefined,
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, loading, error, refetch } = useAdminProjects(query);
  const { data: stats } = useAdminProjectStats(activeTab);

  const projects = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const hasActiveFilter =
    Boolean(debouncedSearch) ||
    Boolean(category) ||
    Boolean(majorFilter) ||
    Boolean(classFilter) ||
    Boolean(departmentFilter) ||
    Boolean(createdFromDate) ||
    Boolean(createdToDate);

  function resetFilters() {
    setCategory("");
    setMajorFilter("");
    setClassFilter("");
    setDepartmentFilter("");
    setCreatedFromDate("");
    setCreatedToDate("");
    setSearchInput("");
    setDebouncedSearch("");
    setPage(1);
  }

  function switchTab(tab: ProjectOwnerRole) {
    if (tab === activeTab) return;
    setActiveTab(tab);
    // Unit filters are tab-specific — clear so they don't bleed across tabs.
    setMajorFilter("");
    setClassFilter("");
    setDepartmentFilter("");
    setPage(1);
  }

  async function handleDownloadZip(p: { id: string; title: string }) {
    setDownloadingZipId(p.id);
    try {
      const blob = await exportAdminProject(p.id);
      downloadBlob(blob, defaultExportFilename(p.title));
    } catch (err) {
      adminToast.error("Tải dự án", err);
    } finally {
      setDownloadingZipId(null);
    }
  }

  async function handleDownloadPdf(p: { id: string; title: string; hasPdf: boolean }) {
    setDownloadingPdfId(p.id);
    // No cached artifact → backend compiles on demand (can take a few seconds).
    if (!p.hasPdf) {
      adminToast.info("Đang biên dịch PDF, vui lòng đợi...");
    }
    try {
      const blob = await downloadAdminProjectPdf(p.id);
      downloadBlob(blob, `${sanitizeFilename(p.title)}.pdf`);
    } catch (err) {
      const status =
        err && typeof err === "object" && "status" in err
          ? (err as { status?: number }).status
          : undefined;
      const backendMsg =
        err && typeof err === "object" && "message" in err
          ? (err as { message?: string }).message
          : undefined;
      const msg =
        status === 408
          ? "Biên dịch PDF quá thời gian (kiểm tra worker biên dịch)."
          : status === 422
            ? backendMsg || "Dự án có lỗi biên dịch nên không tạo được PDF."
            : "Không tải được PDF.";
      adminToast.error("Tải PDF", msg);
    } finally {
      setDownloadingPdfId(null);
    }
  }

  function openInWorkspace(id: string) {
    // Read-only ("view") session — no editing allowed.
    navigate(`/workspace/${id}?view=1`);
  }

  const roleLabel = isStudentTab ? "sinh viên" : "giảng viên";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quản lý dự án</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Xem và tải về tất cả dự án của sinh viên và giảng viên
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
        <StatCard
          icon={<FolderKanban className="w-6 h-6" />}
          tone="blue"
          label={`Tổng dự án ${roleLabel}`}
          value={stats?.total ?? "—"}
        />
        <StatCard
          icon={<FileText className="w-6 h-6" />}
          tone="purple"
          label="Luận văn"
          value={stats?.byCategory.thesis ?? "—"}
        />
        <StatCard
          icon={<FileText className="w-6 h-6" />}
          tone="emerald"
          label="Báo cáo"
          value={stats?.byCategory.report ?? "—"}
        />
        <StatCard
          icon={<FileText className="w-6 h-6" />}
          tone="slate"
          label="Khác"
          value={stats?.byCategory.other ?? "—"}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <TabButton
          active={isStudentTab}
          onClick={() => switchTab("student")}
          icon={<GraduationCap className="w-4 h-4" />}
          label="Dự án sinh viên"
        />
        <TabButton
          active={!isStudentTab}
          onClick={() => switchTab("teacher")}
          icon={<BookUser className="w-4 h-4" />}
          label="Dự án giảng viên"
        />
      </div>

      {/* Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col gap-4 bg-slate-50/50">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Tìm theo tên dự án, tên/mã/email chủ sở hữu..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 h-10 bg-white border-slate-200 focus:ring-[#007bff]"
            />
          </div>

          <div className="flex flex-wrap items-end gap-3 w-full">
            <div className="min-w-[170px]">
              <SearchableSelect
                value={category}
                onChange={(v) => {
                  setCategory(v as TemplateCategory | "");
                  setPage(1);
                }}
                options={[{ value: "", label: "Loại: Tất cả" }, ...CATEGORY_OPTIONS]}
                getOptionValue={(o) => o.value}
                getOptionLabel={(o) => o.label}
                placeholder="Loại: Tất cả"
              />
            </div>

            {/* Academic-unit filter — depends on the active tab. */}
            {isStudentTab ? (
              <>
                <div className="min-w-[180px]">
                  <SearchableSelect
                    value={majorFilter}
                    onChange={(v) => {
                      setMajorFilter(v);
                      setClassFilter("");
                      setPage(1);
                    }}
                    options={[{ id: "", name: "Tất cả", code: "" }, ...majors]}
                    getOptionValue={(m) => m.id}
                    getOptionLabel={(m) => (m.id ? m.name : "Ngành: Tất cả")}
                    getOptionSubLabel={(m) => (m.code ? `Mã: ${m.code}` : undefined)}
                    placeholder="Ngành: Tất cả"
                  />
                </div>
                <div className="min-w-[160px]">
                  <SearchableSelect
                    value={classFilter}
                    onChange={(v) => {
                      setClassFilter(v);
                      setPage(1);
                    }}
                    options={[{ id: "", name: "Tất cả", code: "" }, ...classes]}
                    getOptionValue={(c) => c.id}
                    getOptionLabel={(c) => (c.id ? c.name : "Lớp: Tất cả")}
                    getOptionSubLabel={(c) => (c.code ? `Mã: ${c.code}` : undefined)}
                    placeholder="Lớp: Tất cả"
                    disabled={!majorFilter}
                  />
                </div>
              </>
            ) : (
              <div className="min-w-[200px]">
                <SearchableSelect
                  value={departmentFilter}
                  onChange={(v) => {
                    setDepartmentFilter(v);
                    setPage(1);
                  }}
                  options={[{ id: "", name: "Tất cả", code: "" }, ...departments]}
                  getOptionValue={(d) => d.id}
                  getOptionLabel={(d) => (d.id ? d.name : "Bộ môn: Tất cả")}
                  getOptionSubLabel={(d) => (d.code ? `Mã: ${d.code}` : undefined)}
                  placeholder="Bộ môn: Tất cả"
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">Từ ngày (tạo)</label>
              <Input
                type="date"
                value={createdFromDate}
                onChange={(e) => {
                  setCreatedFromDate(e.target.value);
                  setPage(1);
                }}
                className="h-10 bg-white border-slate-200"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">Đến ngày (tạo)</label>
              <Input
                type="date"
                value={createdToDate}
                onChange={(e) => {
                  setCreatedToDate(e.target.value);
                  setPage(1);
                }}
                className="h-10 bg-white border-slate-200"
              />
            </div>

            {hasActiveFilter && (
              <Button
                variant="outline"
                onClick={resetFilters}
                className="h-10 bg-white border-slate-200 text-slate-600"
              >
                Xóa lọc
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-[#007bff] animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <p className="text-slate-900 font-medium mb-2">Không thể tải danh sách dự án</p>
              <p className="text-slate-500 text-sm mb-4">{error}</p>
              <Button onClick={() => refetch()} variant="outline">
                Thử lại
              </Button>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <FolderKanban className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-900 font-medium mb-2">Chưa có dự án nào</p>
              <p className="text-slate-500 text-sm">
                {hasActiveFilter
                  ? "Không tìm thấy kết quả phù hợp"
                  : `Chưa có dự án của ${roleLabel}`}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-white text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-6 py-4">Tên dự án</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Loại</th>
                  <th className="px-6 py-4 text-center">File</th>
                  <th className="px-6 py-4">Ngày tạo</th>
                  <th className="px-6 py-4">Cập nhật</th>
                  <th className="px-6 py-4 text-center">PDF</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-blue-50/30 transition-colors group bg-white">
                    <td className="px-6 py-4 max-w-[260px]">
                      <span className="font-medium text-slate-900 line-clamp-1" title={p.title}>
                        {p.title}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {p.owner?.email ?? "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border bg-blue-50 text-[#007bff] border-blue-200">
                        {CATEGORY_LABELS[p.category]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 text-center">{p.fileCount}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {formatDate(p.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {formatDate(p.updatedAt)}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                          p.hasPdf
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                        }`}
                      >
                        {p.hasPdf ? "Có" : "Chưa"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setDetailId(p.id)}
                          className="w-8 h-8 rounded text-slate-400 hover:text-[#007bff] hover:bg-blue-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#007bff]/20"
                          title="Xem chi tiết"
                          aria-label="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openInWorkspace(p.id)}
                          className="w-8 h-8 rounded text-slate-400 hover:text-[#007bff] hover:bg-blue-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#007bff]/20"
                          title="Mở trong trình soạn thảo (chỉ xem)"
                          aria-label="Mở trong trình soạn thảo (chỉ xem)"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadZip(p)}
                          disabled={downloadingZipId === p.id}
                          className="w-8 h-8 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                          title="Tải mã nguồn .zip"
                          aria-label="Tải mã nguồn .zip"
                        >
                          {downloadingZipId === p.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <FileArchive className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(p)}
                          disabled={downloadingPdfId === p.id}
                          className="w-8 h-8 rounded text-slate-400 hover:text-[#007bff] hover:bg-blue-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#007bff]/20 disabled:opacity-40 disabled:cursor-not-allowed"
                          title={p.hasPdf ? "Tải PDF biên dịch" : "Tải PDF (biên dịch nếu chưa có)"}
                          aria-label="Tải PDF biên dịch"
                        >
                          {downloadingPdfId === p.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-white">
          <p className="text-sm text-slate-500 hidden sm:block">
            Hiển thị{" "}
            <span className="font-medium text-slate-900">
              {projects.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}
            </span>{" "}
            đến{" "}
            <span className="font-medium text-slate-900">
              {Math.min(page * PAGE_SIZE, total)}
            </span>{" "}
            trong số <span className="font-medium text-slate-900">{total}</span> kết quả
          </p>
          <div className="flex items-center gap-1 w-full sm:w-auto justify-center sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 text-slate-600 border-slate-200"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 bg-blue-50 text-[#007bff] border-blue-200 font-medium"
            >
              {page}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 text-slate-600 border-slate-200 hover:bg-slate-50"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Sau
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      <AdminProjectDetailModal
        projectId={detailId}
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        onDownloadZip={handleDownloadZip}
        onDownloadPdf={handleDownloadPdf}
        onOpenWorkspace={openInWorkspace}
        downloadingZipId={downloadingZipId}
        downloadingPdfId={downloadingPdfId}
      />
    </div>
  );
}

function StatCard({
  icon,
  tone,
  label,
  value,
}: {
  icon: React.ReactNode;
  tone: "blue" | "purple" | "emerald" | "slate";
  label: string;
  value: number | string;
}) {
  const tones: Record<string, string> = {
    blue: "bg-blue-50 border-blue-100 text-[#007bff]",
    purple: "bg-purple-50 border-purple-100 text-purple-600",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-600",
    slate: "bg-slate-100 border-slate-200 text-slate-600",
  };
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
      <div
        className={`w-12 h-12 rounded-lg border flex items-center justify-center shrink-0 ${tones[tone]}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <h4 className="text-2xl font-bold text-slate-900 mt-1">{value}</h4>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "border-[#007bff] text-[#007bff]"
          : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      {label}
    </button>
  );
}
