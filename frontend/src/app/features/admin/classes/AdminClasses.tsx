import { useState } from "react";
import {
  UsersRound,
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
import { useMajors } from "../../../hooks/admin/useMajors";
import { useClasses } from "../../../hooks/admin/useClasses";
import {
  createClass,
  updateClass,
  deleteClass,
  importClasses,
  downloadClassesTemplate,
} from "../../../api/admin/classes";
import { ImportDialog } from "../../../components/admin/ImportDialog";
import { AdminFormModal } from "../../../components/admin/AdminFormModal";
import { FormField } from "../../../components/admin/FormField";
import { TextInput } from "../../../components/admin/FormControls";
import { SearchableSelect } from "../../../components/admin/SearchableSelect";
import { ConfirmDialog } from "../../../components/admin/ConfirmDialog";
import { adminToast } from "../_shared/toast";
import type { Class } from "../../../types/admin";

export function AdminClasses() {
  // Search, filter, and pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [facultyFilter, setFacultyFilter] = useState<string>("");
  const [majorFilter, setMajorFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Fetch faculties for dropdown (with large pageSize to get all)
  const { data: facultiesData } = useFaculties({ pageSize: 100 });
  const faculties = facultiesData?.items ?? [];

  // Fetch majors for dropdown (lazy - only when faculty is selected)
  const { data: majorsData } = useMajors({ 
    facultyId: facultyFilter || undefined,
    pageSize: 100 
  });
  const majors = majorsData?.items ?? [];

  // Fetch classes from API
  const { data, loading, error, refetch } = useClasses({
    search: searchQuery,
    facultyId: facultyFilter || undefined,
    majorId: majorFilter || undefined,
    page,
    pageSize,
  });

  const classes = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formFacultyId, setFormFacultyId] = useState("");
  const [formMajorId, setFormMajorId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch majors for modal (lazy - only when faculty is selected in modal)
  const { data: modalMajorsData } = useMajors({
    facultyId: formFacultyId || undefined,
    pageSize: 100,
  });
  const modalMajors = modalMajorsData?.items ?? [];

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<Class | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [isImportOpen, setIsImportOpen] = useState(false);

  const handleOpenAdd = () => {
    setModalMode("add");
    setSelectedClass(null);
    setFormCode("");
    setFormName("");
    setFormFacultyId("");
    setFormMajorId("");
    setErrors({});
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cls: Class) => {
    setModalMode("edit");
    setSelectedClass(cls);
    setFormCode(cls.code);
    setFormName(cls.name);
    // Find the major's facultyId
    const major = majors.find((m) => m.id === cls.majorId);
    setFormFacultyId(major?.facultyId ?? "");
    setFormMajorId(cls.majorId);
    setErrors({});
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!formCode.trim()) next.code = "Mã lớp không được để trống";
    if (!formName.trim()) next.name = "Tên lớp không được để trống";
    if (!formFacultyId) next.facultyId = "Vui lòng chọn khoa";
    if (!formMajorId) next.majorId = "Vui lòng chọn ngành";
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
        await createClass({
          code: formCode.trim(),
          name: formName.trim(),
          majorId: formMajorId,
        });
        adminToast.created("lớp", formCode.trim());
      } else if (selectedClass) {
        await updateClass(selectedClass.id, {
          code: formCode.trim(),
          name: formName.trim(),
          majorId: formMajorId,
        });
        adminToast.updated("lớp", formCode.trim());
      }
      setIsModalOpen(false);
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Có lỗi xảy ra";
      setSubmitError(message);
      adminToast.error(modalMode === "add" ? "Thêm lớp" : "Cập nhật lớp", err);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (cls: Class) => {
    setClassToDelete(cls);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!classToDelete) return;

    setDeleting(true);
    try {
      await deleteClass(classToDelete.id);
      adminToast.deleted("lớp", classToDelete.code);
      setIsDeleteModalOpen(false);
      setClassToDelete(null);
      await refetch();
    } catch (err) {
      adminToast.error("Xóa lớp", err);
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

  // Helper to get major name by ID
  const getMajorName = (majorId: string) => {
    const major = majors.find(m => m.id === majorId);
    return major?.name ?? "—";
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quản lý lớp</h1>
          <p className="text-slate-500 mt-1 text-sm">Quản lý danh sách lớp trong hệ thống</p>
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
                placeholder="Tìm kiếm lớp..." 
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
                  setMajorFilter("");
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

            <div className="min-w-[180px]">
              <SearchableSelect
                value={majorFilter}
                onChange={(v) => {
                  setMajorFilter(v);
                  setPage(1);
                }}
                options={[{ id: "", name: "Tất cả", code: "" }, ...majors]}
                getOptionValue={(m) => m.id}
                getOptionLabel={(m) => (m.id ? m.name : "Ngành: Tất cả")}
                getOptionSubLabel={(m) => (m.code ? `Mã: ${m.code}` : undefined)}
                placeholder="Ngành: Tất cả"
                searchPlaceholder="Gõ tên hoặc mã ngành..."
                disabled={!facultyFilter}
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
              <p className="text-slate-900 font-medium mb-2">Không thể tải danh sách lớp</p>
              <p className="text-slate-500 text-sm mb-4">{error}</p>
              <Button onClick={() => refetch()} variant="outline">
                Thử lại
              </Button>
            </div>
          ) : classes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <UsersRound className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-900 font-medium mb-2">Chưa có lớp nào</p>
              <p className="text-slate-500 text-sm mb-4">
                {searchQuery || facultyFilter || majorFilter ? "Không tìm thấy kết quả phù hợp" : "Hãy thêm lớp đầu tiên"}
              </p>
              {!searchQuery && !facultyFilter && !majorFilter && (
                <Button onClick={handleOpenAdd} className="bg-[#007bff] hover:bg-[#0056b3]">
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm lớp
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-white text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-6 py-4">Mã lớp</th>
                  <th className="px-6 py-4">Tên lớp</th>
                  <th className="px-6 py-4">Khoa</th>
                  <th className="px-6 py-4">Ngành</th>
                  <th className="px-6 py-4">Cập nhật lần cuối</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classes.map((cls) => {
                  const major = majors.find(m => m.id === cls.majorId);
                  return (
                    <tr key={cls.id} className="hover:bg-blue-50/30 transition-colors group bg-white">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-slate-900 group-hover:text-[#007bff] transition-colors cursor-pointer">
                          {cls.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 whitespace-nowrap font-medium">
                        {cls.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {major ? getFacultyName(major.facultyId) : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {getMajorName(cls.majorId)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                        {formatDate(cls.updatedAt)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-1.5">
                          <button 
                            onClick={() => handleOpenEdit(cls)}
                            className="w-8 h-8 rounded text-slate-400 hover:text-[#007bff] hover:bg-blue-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#007bff]/20"
                            title="Chỉnh sửa lớp"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => confirmDelete(cls)}
                            className="w-8 h-8 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                            title="Xóa lớp"
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
            Hiển thị <span className="font-medium text-slate-900">{classes.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> đến <span className="font-medium text-slate-900">{Math.min(page * pageSize, total)}</span> trong số <span className="font-medium text-slate-900">{total}</span> kết quả
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
        title={modalMode === "add" ? "Thêm lớp" : "Chỉnh sửa lớp"}
        size="md"
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel={modalMode === "add" ? "Lưu" : "Lưu thay đổi"}
        submitError={submitError}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Mã lớp" required error={errors.code} htmlFor="class-code">
            <TextInput
              id="class-code"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
              placeholder="VD: 62TH1"
              invalid={Boolean(errors.code)}
            />
          </FormField>
          <FormField label="Tên lớp" required error={errors.name} htmlFor="class-name">
            <TextInput
              id="class-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="VD: Tin học 1"
              invalid={Boolean(errors.name)}
            />
          </FormField>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Trực thuộc khoa" required error={errors.facultyId}>
            <SearchableSelect
              value={formFacultyId}
              onChange={(v) => {
                setFormFacultyId(v);
                setFormMajorId("");
              }}
              options={faculties}
              getOptionValue={(f) => f.id}
              getOptionLabel={(f) => f.name}
              getOptionSubLabel={(f) => `Mã: ${f.code}`}
              placeholder="-- Chọn khoa --"
              searchPlaceholder="Gõ tên hoặc mã khoa..."
              hasError={Boolean(errors.facultyId)}
            />
          </FormField>
          <FormField label="Ngành đào tạo" required error={errors.majorId}>
            <SearchableSelect
              value={formMajorId}
              onChange={setFormMajorId}
              options={modalMajors}
              getOptionValue={(m) => m.id}
              getOptionLabel={(m) => m.name}
              getOptionSubLabel={(m) => `Mã: ${m.code}`}
              placeholder={formFacultyId ? "-- Chọn ngành --" : "Chọn khoa trước"}
              searchPlaceholder="Gõ tên hoặc mã ngành..."
              hasError={Boolean(errors.majorId)}
              disabled={!formFacultyId}
            />
          </FormField>
        </div>
      </AdminFormModal>

      {/* Import Dialog */}
      <ImportDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={() => refetch()}
        title="Nhập lớp từ file"
        resourceLabel="lớp"
        importFn={importClasses}
        downloadTemplateFn={downloadClassesTemplate}
        templateFilename="lop_mau.xlsx"
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Xác nhận xóa"
        description={
          classToDelete ? (
            <>
              Bạn có chắc chắn muốn xóa lớp <b>{classToDelete.name}</b> (mã{" "}
              <b>{classToDelete.code}</b>)? Hành động này không thể hoàn tác.
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
