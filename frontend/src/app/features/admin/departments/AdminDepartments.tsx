import { useState } from "react";
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Upload,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { useFaculties } from "../../../hooks/admin/useFaculties";
import { useDepartments } from "../../../hooks/admin/useDepartments";
import {
  createDepartment,
  updateDepartment,
  deleteDepartment,
  importDepartments,
  downloadDepartmentsTemplate,
} from "../../../api/admin/departments";
import { ImportDialog } from "../../../components/admin/ImportDialog";
import { AdminFormModal } from "../../../components/admin/AdminFormModal";
import { FormField } from "../../../components/admin/FormField";
import { TextInput } from "../../../components/admin/FormControls";
import { SearchableSelect } from "../../../components/admin/SearchableSelect";
import { ConfirmDialog } from "../../../components/admin/ConfirmDialog";
import { adminToast } from "../_shared/toast";
import type { Department, Faculty } from "../../../types/admin";

export function AdminDepartments() {
  // Search, filter, and pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [facultyFilter, setFacultyFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Fetch faculties for dropdown (with large pageSize to get all)
  const { data: facultiesData } = useFaculties({ pageSize: 100 });
  const faculties = facultiesData?.items ?? [];

  // Fetch departments from API
  const { data, loading, error, refetch } = useDepartments({
    search: searchQuery,
    facultyId: facultyFilter || undefined,
    page,
    pageSize,
  });

  const departments = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formFacultyId, setFormFacultyId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [isImportOpen, setIsImportOpen] = useState(false);

  const handleOpenAdd = () => {
    setModalMode("add");
    setSelectedDepartment(null);
    setFormCode("");
    setFormName("");
    setFormFacultyId("");
    setErrors({});
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setModalMode("edit");
    setSelectedDepartment(dept);
    setFormCode(dept.code);
    setFormName(dept.name);
    setFormFacultyId(dept.facultyId);
    setErrors({});
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!formCode.trim()) next.code = "Mã bộ môn không được để trống";
    if (!formName.trim()) next.name = "Tên bộ môn không được để trống";
    if (!formFacultyId) next.facultyId = "Vui lòng chọn khoa";
    return next;
  };

  const handleSubmit = async () => {
    const next = validate();
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (modalMode === "add") {
        await createDepartment({
          code: formCode.trim(),
          name: formName.trim(),
          facultyId: formFacultyId,
        });
        adminToast.created("bộ môn", formCode.trim());
      } else if (selectedDepartment) {
        await updateDepartment(selectedDepartment.id, {
          code: formCode.trim(),
          name: formName.trim(),
          facultyId: formFacultyId,
        });
        adminToast.updated("bộ môn", formCode.trim());
      }
      setIsModalOpen(false);
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Có lỗi xảy ra";
      setSubmitError(message);
      adminToast.error(modalMode === "add" ? "Thêm bộ môn" : "Cập nhật bộ môn", err);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (dept: Department) => {
    setDeptToDelete(dept);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deptToDelete) return;

    setDeleting(true);
    try {
      await deleteDepartment(deptToDelete.id);
      adminToast.deleted("bộ môn", deptToDelete.code);
      setIsDeleteModalOpen(false);
      setDeptToDelete(null);
      await refetch();
    } catch (err) {
      adminToast.error("Xóa bộ môn", err);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Helper to get faculty name by ID
  const getFacultyName = (facultyId: string) => {
    const faculty = faculties.find(f => f.id === facultyId);
    return faculty?.name ?? "—";
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quản lý bộ môn</h1>
          <p className="text-slate-500 mt-1 text-sm">Quản lý danh sách bộ môn trong hệ thống</p>
        </div>
      </div>

      {/* Main Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col gap-4 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
            <div className="relative w-full sm:max-w-md shrink-0 flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input 
                type="text" 
                placeholder="Tìm kiếm bộ môn..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 h-10 bg-white border-slate-200 focus:ring-[#007bff]"
              />
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
              <Button
                variant="outline"
                onClick={() => setIsImportOpen(true)}
                className="bg-white border-slate-200 text-slate-700 shadow-sm h-10 flex-1 sm:flex-none"
              >
                <Upload className="w-4 h-4 mr-2" />
                Thêm theo file
              </Button>
              <Button onClick={handleOpenAdd} className="bg-[#007bff] hover:bg-[#0056b3] text-white shadow-sm h-10 flex-1 sm:flex-none">
                <Plus className="w-4 h-4 mr-2" />
                Thêm mới
              </Button>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full">
            <div className="min-w-[180px]">
              <SearchableSelect
                value={facultyFilter}
                onChange={(v) => {
                  setFacultyFilter(v);
                  setPage(1);
                }}
                options={[{ id: "", name: "Tất cả", code: "" }, ...faculties]}
                getOptionValue={(f) => f.id}
                getOptionLabel={(f) => (f.id ? f.name : "Khoa: Tất cả")}
                getOptionSubLabel={(f) => (f.code ? `Mã: ${f.code}` : undefined)}
                placeholder="Khoa: Tất cả"
                searchPlaceholder="Gõ tên hoặc mã khoa..."
              />
            </div>
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
              <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
              <p className="text-slate-900 font-medium mb-2">Không thể tải danh sách bộ môn</p>
              <p className="text-slate-500 text-sm mb-4">{error}</p>
              <Button onClick={() => refetch()} variant="outline">
                Thử lại
              </Button>
            </div>
          ) : departments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <Building2 className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-900 font-medium mb-2">Chưa có bộ môn nào</p>
              <p className="text-slate-500 text-sm mb-4">
                {searchQuery || facultyFilter ? "Không tìm thấy kết quả phù hợp" : "Hãy thêm bộ môn đầu tiên"}
              </p>
              {!searchQuery && !facultyFilter && (
                <Button onClick={handleOpenAdd} className="bg-[#007bff] hover:bg-[#0056b3]">
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm bộ môn
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-white text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-6 py-4">Mã bộ môn</th>
                  <th className="px-6 py-4">Tên bộ môn</th>
                  <th className="px-6 py-4">Khoa</th>
                  <th className="px-6 py-4">Cập nhật lần cuối</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map((dept) => {
                  return (
                    <tr key={dept.id} className="hover:bg-blue-50/30 transition-colors group bg-white">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-slate-900 group-hover:text-[#007bff] transition-colors cursor-pointer">
                          {dept.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 whitespace-nowrap font-medium">
                        {dept.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {getFacultyName(dept.facultyId)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                        {formatDate(dept.updatedAt)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-1.5">
                          <button 
                            onClick={() => handleOpenEdit(dept)}
                            className="w-8 h-8 rounded text-slate-400 hover:text-[#007bff] hover:bg-blue-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#007bff]/20"
                            title="Chỉnh sửa bộ môn"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => confirmDelete(dept)}
                            className="w-8 h-8 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                            title="Xóa bộ môn"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-white">
          <p className="text-sm text-slate-500 hidden sm:block">
            Hiển thị <span className="font-medium text-slate-900">{departments.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> đến <span className="font-medium text-slate-900">{Math.min(page * pageSize, total)}</span> trong số <span className="font-medium text-slate-900">{total}</span> kết quả
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
            <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-blue-50 text-[#007bff] border-blue-200 font-medium">
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
      
      {/* Add/Edit Modal */}
      <AdminFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === "add" ? "Thêm bộ môn" : "Chỉnh sửa bộ môn"}
        size="sm"
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel={modalMode === "add" ? "Lưu" : "Lưu thay đổi"}
        submitError={submitError}
      >
        <FormField label="Mã bộ môn" required error={errors.code} htmlFor="dept-code">
          <TextInput
            id="dept-code"
            value={formCode}
            onChange={(e) => setFormCode(e.target.value)}
            placeholder="VD: KTPM"
            invalid={Boolean(errors.code)}
          />
        </FormField>
        <FormField label="Tên bộ môn" required error={errors.name} htmlFor="dept-name">
          <TextInput
            id="dept-name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="VD: Kỹ thuật phần mềm"
            invalid={Boolean(errors.name)}
          />
        </FormField>
        <FormField label="Trực thuộc khoa" required error={errors.facultyId}>
          <SearchableSelect
            value={formFacultyId}
            onChange={setFormFacultyId}
            options={faculties}
            getOptionValue={(f) => f.id}
            getOptionLabel={(f) => f.name}
            getOptionSubLabel={(f) => `Mã: ${f.code}`}
            placeholder="-- Chọn khoa --"
            searchPlaceholder="Gõ tên hoặc mã khoa..."
            hasError={Boolean(errors.facultyId)}
          />
        </FormField>
      </AdminFormModal>

      {/* Import Dialog */}
      <ImportDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={() => refetch()}
        title="Nhập bộ môn từ file"
        resourceLabel="bộ môn"
        importFn={importDepartments}
        downloadTemplateFn={downloadDepartmentsTemplate}
        templateFilename="bo_mon_mau.xlsx"
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Xác nhận xóa"
        description={
          deptToDelete ? (
            <>
              Bạn có chắc chắn muốn xóa bộ môn <b>{deptToDelete.name}</b> (mã{" "}
              <b>{deptToDelete.code}</b>)? Hành động này không thể hoàn tác.
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