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
import {
  createFaculty,
  updateFaculty,
  deleteFaculty,
  importFaculties,
  downloadFacultiesTemplate,
} from "../../../api/admin/faculties";
import { ImportDialog } from "../../../components/admin/ImportDialog";
import { AdminFormModal } from "../../../components/admin/AdminFormModal";
import { FormField } from "../../../components/admin/FormField";
import { TextInput } from "../../../components/admin/FormControls";
import { ConfirmDialog } from "../../../components/admin/ConfirmDialog";
import { adminToast } from "../_shared/toast";
import type { Faculty } from "../../../types/admin";

export function AdminFaculties() {
  // Search and pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Fetch faculties from API
  const { data, loading, error, refetch } = useFaculties({
    search: searchQuery,
    page,
    pageSize,
  });

  const faculties = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [facultyToDelete, setFacultyToDelete] = useState<Faculty | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [isImportOpen, setIsImportOpen] = useState(false);

  const handleOpenAdd = () => {
    setModalMode("add");
    setSelectedFaculty(null);
    setFormCode("");
    setFormName("");
    setErrors({});
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (faculty: Faculty) => {
    setModalMode("edit");
    setSelectedFaculty(faculty);
    setFormCode(faculty.code);
    setFormName(faculty.name);
    setErrors({});
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!formCode.trim()) next.code = "Mã khoa không được để trống";
    if (!formName.trim()) next.name = "Tên khoa không được để trống";
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
        await createFaculty({ code: formCode.trim(), name: formName.trim() });
        adminToast.created("khoa", formCode.trim());
      } else if (selectedFaculty) {
        await updateFaculty(selectedFaculty.id, {
          code: formCode.trim(),
          name: formName.trim(),
        });
        adminToast.updated("khoa", formCode.trim());
      }
      setIsModalOpen(false);
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Có lỗi xảy ra";
      setSubmitError(message);
      adminToast.error(modalMode === "add" ? "Thêm khoa" : "Cập nhật khoa", err);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (faculty: Faculty) => {
    setFacultyToDelete(faculty);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!facultyToDelete) return;

    setDeleting(true);
    try {
      await deleteFaculty(facultyToDelete.id);
      adminToast.deleted("khoa", facultyToDelete.code);
      setIsDeleteModalOpen(false);
      setFacultyToDelete(null);
      await refetch();
    } catch (err) {
      adminToast.error("Xóa khoa", err);
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

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quản lý khoa</h1>
          <p className="text-slate-500 mt-1 text-sm">Quản lý danh sách khoa trong hệ thống</p>
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
                placeholder="Tìm kiếm khoa..." 
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
              <p className="text-slate-900 font-medium mb-2">Không thể tải danh sách khoa</p>
              <p className="text-slate-500 text-sm mb-4">{error}</p>
              <Button onClick={() => refetch()} variant="outline">
                Thử lại
              </Button>
            </div>
          ) : faculties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <Building2 className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-900 font-medium mb-2">Chưa có khoa nào</p>
              <p className="text-slate-500 text-sm mb-4">
                {searchQuery ? "Không tìm thấy kết quả phù hợp" : "Hãy thêm khoa đầu tiên"}
              </p>
              {!searchQuery && (
                <Button onClick={handleOpenAdd} className="bg-[#007bff] hover:bg-[#0056b3]">
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm khoa
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-white text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-6 py-4">Mã khoa</th>
                  <th className="px-6 py-4">Tên khoa</th>
                  <th className="px-6 py-4">Cập nhật lần cuối</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {faculties.map((faculty) => {
                  return (
                    <tr key={faculty.id} className="hover:bg-blue-50/30 transition-colors group bg-white">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-slate-900 group-hover:text-[#007bff] transition-colors cursor-pointer">
                          {faculty.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 whitespace-nowrap font-medium">
                        {faculty.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                        {formatDate(faculty.updatedAt)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-1.5">
                          <button 
                            onClick={() => handleOpenEdit(faculty)}
                            className="w-8 h-8 rounded text-slate-400 hover:text-[#007bff] hover:bg-blue-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#007bff]/20"
                            title="Chỉnh sửa khoa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => confirmDelete(faculty)}
                            className="w-8 h-8 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                            title="Xóa khoa"
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
            Hiển thị <span className="font-medium text-slate-900">{faculties.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> đến <span className="font-medium text-slate-900">{Math.min(page * pageSize, total)}</span> trong số <span className="font-medium text-slate-900">{total}</span> kết quả
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
        title={modalMode === "add" ? "Thêm khoa" : "Chỉnh sửa khoa"}
        size="sm"
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel={modalMode === "add" ? "Lưu" : "Lưu thay đổi"}
        submitError={submitError}
      >
        <FormField label="Mã khoa" required error={errors.code} htmlFor="faculty-code">
          <TextInput
            id="faculty-code"
            value={formCode}
            onChange={(e) => setFormCode(e.target.value)}
            placeholder="VD: CNTT"
            invalid={Boolean(errors.code)}
          />
        </FormField>
        <FormField label="Tên khoa" required error={errors.name} htmlFor="faculty-name">
          <TextInput
            id="faculty-name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="VD: Công nghệ Thông tin"
            invalid={Boolean(errors.name)}
          />
        </FormField>
      </AdminFormModal>

      {/* Import Dialog */}
      <ImportDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={() => refetch()}
        title="Nhập khoa từ file"
        resourceLabel="khoa"
        importFn={importFaculties}
        downloadTemplateFn={downloadFacultiesTemplate}
        templateFilename="khoa_mau.xlsx"
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Xác nhận xóa"
        description={
          facultyToDelete ? (
            <>
              Bạn có chắc chắn muốn xóa khoa <b>{facultyToDelete.name}</b> (mã{" "}
              <b>{facultyToDelete.code}</b>)? Hành động này không thể hoàn tác.
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