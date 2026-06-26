import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Edit2,
  FileBadge,
  History,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { ConfirmDialog } from "../../../components/admin/ConfirmDialog";
import { deleteTemplate } from "../../../api/templates";
import { adminToast } from "../_shared/toast";
import { useTemplates } from "../../../hooks/useTemplates";
import type { Template, TemplateCategory } from "../../../types/templates";
import { TemplateFormDialog } from "./TemplateFormDialog";
import { TemplateVersionsDialog } from "./TemplateVersionsDialog";

const CATEGORY_OPTIONS: Array<{ value: TemplateCategory | "all"; label: string }> = [
  { value: "all", label: "Tất cả phân loại" },
  { value: "thesis", label: "Luận văn / Khóa luận" },
  { value: "report", label: "Báo cáo" },
  { value: "proposal", label: "Đề xuất" },
  { value: "paper", label: "Bài báo" },
  { value: "presentation", label: "Trình chiếu" },
  { value: "other", label: "Khác" },
];

const CATEGORY_LABEL: Record<TemplateCategory, string> = {
  thesis: "Luận văn / Khóa luận",
  report: "Báo cáo",
  proposal: "Đề xuất",
  paper: "Bài báo",
  presentation: "Trình chiếu",
  other: "Khác",
};

const CATEGORY_BADGE: Record<TemplateCategory, string> = {
  thesis: "bg-purple-50 text-purple-700 border-purple-200",
  report: "bg-emerald-50 text-emerald-700 border-emerald-200",
  proposal: "bg-amber-50 text-amber-700 border-amber-200",
  paper: "bg-blue-50 text-blue-700 border-blue-200",
  presentation: "bg-pink-50 text-pink-700 border-pink-200",
  other: "bg-slate-50 text-slate-700 border-slate-200",
};

const PAGE_SIZE = 20;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1,
  ).padStart(2, "0")}/${d.getFullYear()}`;
}

export function AdminTemplates() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | "all">(
    "all",
  );
  const [officialFilter, setOfficialFilter] = useState<"all" | "true" | "false">(
    "all",
  );
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");
  const [page, setPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const query = useMemo(
    () => ({
      search: search || undefined,
      category: categoryFilter === "all" ? undefined : categoryFilter,
      isOfficial: officialFilter === "all" ? undefined : officialFilter === "true",
      isActive: activeFilter === "all" ? undefined : activeFilter === "true",
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, categoryFilter, officialFilter, activeFilter, page],
  );

  const { data, loading, error, refetch } = useTemplates(query);
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const [versionsDialogOpen, setVersionsDialogOpen] = useState(false);
  const [versionsTemplate, setVersionsTemplate] = useState<Template | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setFormMode("create");
    setEditingTemplate(null);
    setFormDialogOpen(true);
  };

  const openEdit = (template: Template) => {
    setFormMode("edit");
    setEditingTemplate(template);
    setFormDialogOpen(true);
  };

  const openVersions = (template: Template) => {
    setVersionsTemplate(template);
    setVersionsDialogOpen(true);
  };

  const handleSaved = async (saved: Template, mode: "create" | "edit") => {
    setFormDialogOpen(false);
    await refetch();
    if (mode === "create") {
      // After creating template, immediately open versions dialog so admin can upload v1
      setVersionsTemplate(saved);
      setVersionsDialogOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTemplate(deleteTarget.id);
      adminToast.deleted("mẫu", deleteTarget.name);
      setDeleteTarget(null);
      await refetch();
    } catch (err) {
      adminToast.error("Xóa mẫu", err);
      // Keep modal open so admin sees the error context
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Mẫu tài liệu
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Quản lý mẫu Typst dùng chung và các phiên bản tải lên cho sinh viên.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col gap-4 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
            <div className="relative w-full sm:max-w-md shrink-0 flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm theo tên hoặc mô tả mẫu..."
                className="w-full pl-9 h-10 bg-white border-slate-200 focus:ring-[#007bff]"
              />
            </div>
            <Button
              onClick={openCreate}
              className="bg-[#007bff] hover:bg-[#0056b3] text-white shadow-sm h-10 w-full sm:w-auto shrink-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Thêm mẫu mới
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full">
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value as TemplateCategory | "all");
                  setPage(1);
                }}
                className="appearance-none h-10 pl-3 pr-8 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-[#007bff]/20 focus:border-[#007bff] outline-none cursor-pointer min-w-[200px]"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={officialFilter}
                onChange={(e) => {
                  setOfficialFilter(e.target.value as "all" | "true" | "false");
                  setPage(1);
                }}
                className="appearance-none h-10 pl-3 pr-8 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-[#007bff]/20 focus:border-[#007bff] outline-none cursor-pointer min-w-[180px]"
              >
                <option value="all">Tất cả mẫu</option>
                <option value="true">Mẫu chính thức</option>
                <option value="false">Mẫu tùy chỉnh</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={activeFilter}
                onChange={(e) => {
                  setActiveFilter(e.target.value as "all" | "true" | "false");
                  setPage(1);
                }}
                className="appearance-none h-10 pl-3 pr-8 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-[#007bff]/20 focus:border-[#007bff] outline-none cursor-pointer min-w-[160px]"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="true">Đang dùng</option>
                <option value="false">Đã ẩn</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-white text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="px-6 py-4">Tên mẫu</th>
                <th className="px-6 py-4">Phân loại</th>
                <th className="px-6 py-4">Mẫu chính thức</th>
                <th className="px-6 py-4">Đang dùng</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4">Cập nhật</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <Loader2 className="w-8 h-8 text-[#007bff] animate-spin mb-3" />
                      <p className="text-sm">Đang tải danh sách mẫu...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-rose-600 gap-2">
                      <AlertCircle className="w-8 h-8" />
                      <p className="text-sm font-medium">{error}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void refetch()}
                        className="mt-2"
                      >
                        Thử lại
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <FileBadge className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-sm font-medium text-slate-900 mb-1">
                        Chưa có mẫu nào khớp bộ lọc
                      </p>
                      <p className="text-sm">
                        Bấm "Thêm mẫu mới" để bắt đầu hoặc đổi bộ lọc.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((template) => (
                  <tr
                    key={template.id}
                    className="hover:bg-blue-50/30 transition-colors group bg-white"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900 group-hover:text-[#007bff] transition-colors">
                          {template.name}
                        </span>
                        {template.description && (
                          <span className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                            {template.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${CATEGORY_BADGE[template.category]}`}
                      >
                        {CATEGORY_LABEL[template.category]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {template.isOfficial ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-[#007bff] border border-blue-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Chính thức
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Tùy chỉnh</span>
                      )}
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap"
                      title="Số project đang dùng phiên bản của mẫu này"
                    >
                      {(template.usageCount ?? 0) > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-[#007bff] border border-blue-200">
                          {template.usageCount} project
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {template.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Đang dùng
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          Đã ẩn
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {formatDate(template.updatedAt)}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openVersions(template)}
                          className="h-8 px-2 text-slate-600 hover:text-[#007bff] hover:bg-blue-50"
                          title="Quản lý phiên bản"
                        >
                          <History className="w-4 h-4 mr-1.5" />
                          <span className="text-xs font-medium">Phiên bản</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(template)}
                          className="h-8 px-2 text-slate-600 hover:text-[#007bff] hover:bg-blue-50"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-4 h-4 mr-1.5" />
                          <span className="text-xs font-medium">Sửa</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(template)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && !error && items.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="text-xs text-slate-500">
              Hiển thị {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, total)} trên {total} mẫu
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Trước
              </Button>
              <span className="text-xs text-slate-600 px-2">
                Trang {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </div>

      <TemplateFormDialog
        open={formDialogOpen}
        mode={formMode}
        template={editingTemplate}
        onClose={() => setFormDialogOpen(false)}
        onSaved={(t, mode) => void handleSaved(t, mode)}
        onOpenVersions={
          editingTemplate
            ? () => {
                // Close the form first so the two modals don't stack
                setFormDialogOpen(false);
                setVersionsTemplate(editingTemplate);
                setVersionsDialogOpen(true);
              }
            : undefined
        }
      />

      <TemplateVersionsDialog
        open={versionsDialogOpen}
        template={versionsTemplate}
        onClose={() => setVersionsDialogOpen(false)}
        onVersionsChanged={() => void refetch()}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xác nhận xóa mẫu"
        confirmLabel="Xóa mẫu"
        description={
          deleteTarget ? (
            <>
              <p>
                Mẫu <b>"{deleteTarget.name}"</b> sẽ bị xóa vĩnh viễn cùng tất cả
                phiên bản đã tải lên. Hành động này không thể hoàn tác.
              </p>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-2">
                Nếu mẫu đang được dùng bởi project nào đó, hệ thống sẽ từ chối
                xóa.
              </p>
            </>
          ) : (
            "Hành động này không thể hoàn tác."
          )
        }
        loading={deleting}
      />
    </div>
  );
}
