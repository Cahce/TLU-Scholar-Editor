import { useState } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Plus,
  Search,
  Edit2,
  Trash2,
  Unlink,
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
import { useTeachers } from "../../../hooks/admin/useTeachers";
import {
  listTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  unlinkTeacherAccount,
  importTeachers,
  downloadTeachersTemplate,
  linkTeacherAccount,
} from "../../../api/admin/teachers";
import { createAccount } from "../../../api/admin/accounts";
import { ImportDialog } from "../../../components/admin/ImportDialog";
import { AdminFormModal } from "../../../components/admin/AdminFormModal";
import { FormField } from "../../../components/admin/FormField";
import {
  DateInput,
  NativeSelect,
  TextInput,
} from "../../../components/admin/FormControls";
import { FormSection } from "../../../components/admin/FormSection";
import { PillToggleGroup } from "../../../components/admin/PillToggleGroup";
import { SearchableSelect } from "../../../components/admin/SearchableSelect";
import { ConfirmDialog } from "../../../components/admin/ConfirmDialog";
import { useAccounts } from "../../../hooks/admin/useAccounts";
import { useAdminStats } from "../../../hooks/useAdminStats";
import { STAFF_DOMAIN, validateEmailForRole } from "../_shared/email";
import { adminToast } from "../_shared/toast";
import type { CreateTeacherRequest, Teacher } from "../../../types/admin";
import { GENDER_OPTIONS } from "../../../lib/gender";

type TeacherAccountMode = "keep" | "none" | "link" | "create";

export function AdminTeachers() {
  // Search, filter, and pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [facultyFilter, setFacultyFilter] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [hasAccountFilter, setHasAccountFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Fetch faculties for dropdown (with large pageSize to get all)
  const { data: facultiesData } = useFaculties({ pageSize: 100 });
  const faculties = facultiesData?.items ?? [];

  // Fetch departments for dropdown (lazy - only when faculty is selected)
  const { data: departmentsData } = useDepartments({ 
    facultyId: facultyFilter || undefined,
    pageSize: 100 
  });
  const departments = departmentsData?.items ?? [];

  // Fetch teachers from API
  const { data, loading, error, refetch } = useTeachers({
    search: searchQuery,
    facultyId: facultyFilter || undefined,
    departmentId: departmentFilter || undefined,
    hasAccount: hasAccountFilter ? (hasAccountFilter as "true" | "false") : undefined,
    page,
    pageSize,
  });

  const teachers = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // Whole-dataset counts (all records, not just the current page).
  const stats = useAdminStats(
    listTeachers,
    { total: {}, linked: { hasAccount: "true" }, unlinked: { hasAccount: "false" } },
    [data],
  );
  const totalTeachers = stats.total ?? 0;
  const activeTeachers = stats.linked ?? 0;
  const inactiveTeachers = stats.unlinked ?? 0;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formTeacherCode, setFormTeacherCode] = useState("");
  const [formFullName, setFormFullName] = useState("");
  const [formFacultyId, setFormFacultyId] = useState("");
  const [formDepartmentId, setFormDepartmentId] = useState("");
  const [formAcademicRank, setFormAcademicRank] = useState("");
  const [formAcademicDegree, setFormAcademicDegree] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formGender, setFormGender] = useState<"" | "male" | "female" | "other">("");
  const [formDateOfBirth, setFormDateOfBirth] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Modal-scoped departments cascade off formFacultyId.
  const { data: modalDepartmentsData } = useDepartments({
    facultyId: formFacultyId || undefined,
    pageSize: 100,
  });
  const modalDepartments = modalDepartmentsData?.items ?? [];

  const ACADEMIC_RANK_OPTIONS = [
    { value: "Không", label: "Không" },
    { value: "Giáo sư", label: "Giáo sư" },
    { value: "Phó Giáo sư", label: "Phó Giáo sư" },
  ];
  const ACADEMIC_DEGREE_OPTIONS = [
    { value: "Cử nhân", label: "Cử nhân / Kỹ sư" },
    { value: "Thạc sĩ", label: "Thạc sĩ" },
    { value: "Tiến sĩ", label: "Tiến sĩ" },
    { value: "Tiến sĩ khoa học", label: "Tiến sĩ khoa học" },
  ];

  // Account picker state (Add mode + Edit mode)
  const [accountMode, setAccountMode] = useState<TeacherAccountMode>("none");
  const [accountLinkId, setAccountLinkId] = useState("");
  const [accountLinkSearch, setAccountLinkSearch] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");

  // Pull unlinked teacher accounts for the link picker.
  const { data: unlinkedAccountsData, refetch: refetchUnlinkedAccounts } = useAccounts({
    role: "teacher",
    hasLink: "false",
    pageSize: 100,
  });
  const unlinkedAccounts = unlinkedAccountsData?.items ?? [];
  const filteredUnlinkedAccounts = accountLinkSearch.trim()
    ? unlinkedAccounts.filter((acc) =>
        acc.email.toLowerCase().includes(accountLinkSearch.trim().toLowerCase()),
      )
    : unlinkedAccounts;
  const selectedLinkAccount =
    unlinkedAccounts.find((acc) => acc.id === accountLinkId) ?? null;
  const hasCurrentAccount =
    modalMode === "edit" && Boolean(selectedTeacher?.accountId);
  const accountModeOptions: Array<{ value: TeacherAccountMode; label: string }> = hasCurrentAccount
    ? [
        { value: "keep", label: "Giữ tài khoản hiện tại" },
        { value: "link", label: "Đổi sang tài khoản có sẵn" },
        { value: "create", label: "Tạo tài khoản mới" },
        { value: "none", label: "Hủy liên kết" },
      ]
    : [
        { value: "none", label: "Không liên kết" },
        { value: "link", label: "Liên kết tài khoản có sẵn" },
        { value: "create", label: "Tạo tài khoản mới" },
      ];

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [isImportOpen, setIsImportOpen] = useState(false);

  const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);
  const [teacherToUnlink, setTeacherToUnlink] = useState<Teacher | null>(null);
  const [unlinking, setUnlinking] = useState(false);

  const handleOpenAdd = () => {
    void refetchUnlinkedAccounts();
    setModalMode("add");
    setSelectedTeacher(null);
    setFormTeacherCode("");
    setFormFullName("");
    setFormFacultyId("");
    setFormDepartmentId("");
    setFormAcademicRank("");
    setFormAcademicDegree("");
    setFormPhone("");
    setFormGender("");
    setFormDateOfBirth("");
    setFormAddress("");
    setAccountMode("none");
    setAccountLinkId("");
    setAccountLinkSearch("");
    setAccountEmail("");
    setAccountPassword("");
    setErrors({});
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (teacher: Teacher) => {
    // Refresh the unlinked-account list before opening: an account just
    // unlinked on this page becomes immediately available for re-link.
    void refetchUnlinkedAccounts();
    setModalMode("edit");
    setSelectedTeacher(teacher);
    setFormTeacherCode(teacher.teacherCode);
    setFormFullName(teacher.fullName);
    setFormFacultyId(teacher.department?.facultyId ?? "");
    setFormDepartmentId(teacher.departmentId);
    setFormAcademicRank(teacher.academicRank);
    setFormAcademicDegree(teacher.academicDegree);
    setFormPhone(teacher.phone ?? "");
    setFormGender(teacher.gender ?? "");
    setFormDateOfBirth(teacher.dateOfBirth ? teacher.dateOfBirth.slice(0, 10) : "");
    setFormAddress(teacher.address ?? "");
    setAccountMode(teacher.accountId ? "keep" : "none");
    setAccountLinkId("");
    setAccountLinkSearch("");
    setAccountEmail("");
    setAccountPassword("");
    setErrors({});
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!formTeacherCode.trim()) next.teacherCode = "Mã giảng viên không được để trống";
    if (!formFullName.trim()) next.fullName = "Họ và tên không được để trống";
    if (!formFacultyId) next.facultyId = "Vui lòng chọn khoa";
    if (!formDepartmentId) next.departmentId = "Vui lòng chọn bộ môn";
    if (!formAcademicRank) next.academicRank = "Vui lòng chọn học hàm";
    if (!formAcademicDegree) next.academicDegree = "Vui lòng chọn học vị";

    const shouldValidateAccount =
      modalMode === "add" || (modalMode === "edit" && accountMode !== "keep");
    if (shouldValidateAccount) {
      if (accountMode === "link" && !accountLinkId) {
        next.accountLinkId = "Vui lòng chọn tài khoản để liên kết";
      }
      if (accountMode === "create") {
        const v = validateEmailForRole(accountEmail.trim(), "teacher");
        if (!v.ok) next.accountEmail = v.message;
        if (accountPassword.length < 8)
          next.accountPassword = "Mật khẩu tối thiểu 8 ký tự";
      }
    }
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
      const payload: CreateTeacherRequest = {
        teacherCode: formTeacherCode.trim(),
        fullName: formFullName.trim(),
        departmentId: formDepartmentId,
        academicRank: formAcademicRank,
        academicDegree: formAcademicDegree,
        phone: formPhone.trim() || undefined,
        gender: formGender || undefined,
        dateOfBirth: formDateOfBirth || undefined,
        address: formAddress.trim() || undefined,
      };

      if (modalMode === "add") {
        if (accountMode === "link") {
          payload.account = { mode: "link", accountId: accountLinkId };
        } else if (accountMode === "create") {
          payload.account = {
            mode: "create",
            email: accountEmail.trim(),
            password: accountPassword,
          };
        } else {
          payload.account = { mode: "none" };
        }
        await createTeacher(payload);
        if (accountMode === "none") {
          adminToast.created("giảng viên", formTeacherCode.trim());
        } else {
          adminToast.createdWithAccount("giảng viên", formTeacherCode.trim());
        }
      } else if (selectedTeacher) {
        const { account: _unused, ...updatePayload } = payload;
        void _unused;
        await updateTeacher(selectedTeacher.id, updatePayload);

        const hadLinkedAccount = Boolean(selectedTeacher.accountId);
        if (accountMode === "link") {
          if (hadLinkedAccount && selectedTeacher.accountId !== accountLinkId) {
            await unlinkTeacherAccount(selectedTeacher.id);
          }
          await linkTeacherAccount(selectedTeacher.id, { accountId: accountLinkId });
          adminToast.updated("giảng viên", formTeacherCode.trim());
          adminToast.linkedAccount(`giảng viên ${formTeacherCode.trim()}`);
        } else if (accountMode === "create") {
          await createAccount({
            email: accountEmail.trim(),
            password: accountPassword,
            role: "teacher",
            linkTo: { type: "teacher", id: selectedTeacher.id },
          });
          adminToast.updated("giảng viên", formTeacherCode.trim());
          adminToast.linkedAccount(`giảng viên ${formTeacherCode.trim()}`);
        } else if (accountMode === "none" && hadLinkedAccount) {
          await unlinkTeacherAccount(selectedTeacher.id);
          adminToast.unlinkedAccount(`giảng viên ${formTeacherCode.trim()}`);
        } else {
          adminToast.updated("giảng viên", formTeacherCode.trim());
        }
      }
      setIsModalOpen(false);
      await Promise.all([refetch(), refetchUnlinkedAccounts()]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Có lỗi xảy ra";
      setSubmitError(message);
      adminToast.error(
        modalMode === "add" ? "Thêm giảng viên" : "Cập nhật giảng viên",
        err,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (teacher: Teacher) => {
    setTeacherToDelete(teacher);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!teacherToDelete) return;

    setDeleting(true);
    try {
      await deleteTeacher(teacherToDelete.id);
      adminToast.deleted("giảng viên", teacherToDelete.teacherCode);
      setIsDeleteModalOpen(false);
      setTeacherToDelete(null);
      await Promise.all([refetch(), refetchUnlinkedAccounts()]);
    } catch (err) {
      adminToast.error("Xóa giảng viên", err);
    } finally {
      setDeleting(false);
    }
  };

  const confirmUnlink = (teacher: Teacher) => {
    setTeacherToUnlink(teacher);
    setIsUnlinkModalOpen(true);
  };

  const handleUnlink = async () => {
    if (!teacherToUnlink) return;

    setUnlinking(true);
    try {
      await unlinkTeacherAccount(teacherToUnlink.id);
      adminToast.unlinkedAccount(`giảng viên ${teacherToUnlink.teacherCode}`);
      setIsUnlinkModalOpen(false);
      setTeacherToUnlink(null);
      // The just-unlinked account becomes hasLink=false; refresh both the
      // teacher row table and the unlinked-account picker cache.
      await Promise.all([refetch(), refetchUnlinkedAccounts()]);
    } catch (err) {
      adminToast.error("Hủy liên kết tài khoản", err);
    } finally {
      setUnlinking(false);
    }
  };

  // Helper to get faculty name by ID
  const getFacultyName = (facultyId: string) => {
    const faculty = faculties.find(f => f.id === facultyId);
    return faculty?.name ?? "—";
  };

  // Helper to get department name by ID
  const getDepartmentName = (departmentId: string) => {
    const department = departments.find(d => d.id === departmentId);
    return department?.name ?? "—";
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quản lý giảng viên</h1>
          <p className="text-slate-500 mt-1 text-sm">Quản lý tài khoản và thông tin giảng viên</p>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 xl:gap-6">
        
        {/* Stat Card 1: Tổng số giảng viên */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 text-[#007bff] flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Tổng số giảng viên</p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1">{totalTeachers}</h4>
          </div>
        </div>

        {/* Stat Card 2: Giảng viên hoạt động */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Đã liên kết tài khoản</p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1">{activeTeachers}</h4>
          </div>
        </div>

        {/* Stat Card 3: Giảng viên bị khóa */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Chưa liên kết</p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1">{inactiveTeachers}</h4>
          </div>
        </div>
      </div>

      {/* Teacher Management Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col gap-4 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
            <div className="relative w-full sm:max-w-md shrink-0 flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input 
                type="text" 
                placeholder="Tìm kiếm giảng viên..." 
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
                  setDepartmentFilter("");
                  setPage(1);
                }}
                options={[{ id: "", name: "Tất cả", code: "" }, ...faculties]}
                getOptionValue={(f) => f.id}
                getOptionLabel={(f) => (f.id ? f.name : "Khoa: Tất cả")}
                getOptionSubLabel={(f) => (f.code ? `Mã: ${f.code}` : undefined)}
                placeholder="Khoa: Tất cả"
              />
            </div>

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
                disabled={!facultyFilter}
              />
            </div>

            <div className="min-w-[160px]">
              <SearchableSelect
                value={hasAccountFilter}
                onChange={(v) => {
                  setHasAccountFilter(v);
                  setPage(1);
                }}
                options={[
                  { value: "", label: "Trạng thái: Tất cả" },
                  { value: "true", label: "Đã liên kết" },
                  { value: "false", label: "Chưa liên kết" },
                ]}
                getOptionValue={(o) => o.value}
                getOptionLabel={(o) => o.label}
                placeholder="Trạng thái: Tất cả"
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
              <p className="text-slate-900 font-medium mb-2">Không thể tải danh sách giảng viên</p>
              <p className="text-slate-500 text-sm mb-4">{error}</p>
              <Button onClick={() => refetch()} variant="outline">
                Thử lại
              </Button>
            </div>
          ) : teachers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <Users className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-900 font-medium mb-2">Chưa có giảng viên nào</p>
              <p className="text-slate-500 text-sm mb-4">
                {searchQuery || facultyFilter || departmentFilter || hasAccountFilter ? "Không tìm thấy kết quả phù hợp" : "Hãy thêm giảng viên đầu tiên"}
              </p>
              {!searchQuery && !facultyFilter && !departmentFilter && !hasAccountFilter && (
                <Button onClick={handleOpenAdd} className="bg-[#007bff] hover:bg-[#0056b3]">
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm giảng viên
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-white text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-6 py-4">Họ và tên</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Khoa</th>
                  <th className="px-6 py-4">Bộ môn</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.map((teacher) => {
                  const hasAccount = teacher.accountId !== null;
                  const department = departments.find(d => d.id === teacher.departmentId);

                  return (
                    <tr key={teacher.id} className="hover:bg-blue-50/30 transition-colors group bg-white">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-slate-900 group-hover:text-[#007bff] transition-colors cursor-pointer">
                          {teacher.fullName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {teacher.account?.email ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {department ? getFacultyName(department.facultyId) : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {getDepartmentName(teacher.departmentId)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${hasAccount ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                          {hasAccount ? "Đã liên kết" : "Chưa liên kết"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-1.5">
                          <button 
                            onClick={() => handleOpenEdit(teacher)}
                            className="w-8 h-8 rounded text-slate-400 hover:text-[#007bff] hover:bg-blue-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#007bff]/20"
                            title="Chỉnh sửa giảng viên"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {hasAccount && (
                            <button 
                              onClick={() => confirmUnlink(teacher)}
                              className="w-8 h-8 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                              title="Hủy liên kết tài khoản"
                            >
                              <Unlink className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={() => confirmDelete(teacher)}
                            className="w-8 h-8 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                            title="Xóa giảng viên"
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
            Hiển thị <span className="font-medium text-slate-900">{teachers.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> đến <span className="font-medium text-slate-900">{Math.min(page * pageSize, total)}</span> trong số <span className="font-medium text-slate-900">{total}</span> kết quả
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
        title={modalMode === "add" ? "Thêm giảng viên" : "Chỉnh sửa giảng viên"}
        size="lg"
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel={modalMode === "add" ? "Lưu" : "Lưu thay đổi"}
        submitError={submitError}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Mã giảng viên" required error={errors.teacherCode} htmlFor="t-code">
            <TextInput
              id="t-code"
              value={formTeacherCode}
              onChange={(e) => setFormTeacherCode(e.target.value)}
              placeholder="VD: GV001"
              invalid={Boolean(errors.teacherCode)}
            />
          </FormField>
          <FormField label="Họ và tên" required error={errors.fullName} htmlFor="t-name">
            <TextInput
              id="t-name"
              value={formFullName}
              onChange={(e) => setFormFullName(e.target.value)}
              placeholder="VD: Nguyễn Văn An"
              invalid={Boolean(errors.fullName)}
            />
          </FormField>
          <FormField label="Khoa" required error={errors.facultyId}>
            <SearchableSelect
              value={formFacultyId}
              onChange={(v) => {
                setFormFacultyId(v);
                setFormDepartmentId("");
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
          <FormField label="Bộ môn" required error={errors.departmentId}>
            <SearchableSelect
              value={formDepartmentId}
              onChange={setFormDepartmentId}
              options={modalDepartments}
              getOptionValue={(d) => d.id}
              getOptionLabel={(d) => d.name}
              getOptionSubLabel={(d) => `Mã: ${d.code}`}
              placeholder={formFacultyId ? "-- Chọn bộ môn --" : "Chọn khoa trước"}
              searchPlaceholder="Gõ tên hoặc mã bộ môn..."
              hasError={Boolean(errors.departmentId)}
              disabled={!formFacultyId}
            />
          </FormField>
          <FormField label="Học hàm" required error={errors.academicRank}>
            <SearchableSelect
              value={formAcademicRank}
              onChange={setFormAcademicRank}
              options={ACADEMIC_RANK_OPTIONS}
              getOptionValue={(o) => o.value}
              getOptionLabel={(o) => o.label}
              placeholder="-- Chọn học hàm --"
              hasError={Boolean(errors.academicRank)}
            />
          </FormField>
          <FormField label="Học vị" required error={errors.academicDegree}>
            <SearchableSelect
              value={formAcademicDegree}
              onChange={setFormAcademicDegree}
              options={ACADEMIC_DEGREE_OPTIONS}
              getOptionValue={(o) => o.value}
              getOptionLabel={(o) => o.label}
              placeholder="-- Chọn học vị --"
              hasError={Boolean(errors.academicDegree)}
            />
          </FormField>
          <FormField label="Số điện thoại" htmlFor="t-phone">
            <TextInput
              id="t-phone"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              placeholder="VD: 0987654321"
            />
          </FormField>
          <FormField label="Giới tính" htmlFor="t-gender">
            <NativeSelect
              id="t-gender"
              value={formGender}
              onChange={(e) =>
                setFormGender(e.target.value as "" | "male" | "female" | "other")
              }
            >
              <option value="">-- Chọn giới tính --</option>
              {GENDER_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Ngày sinh" htmlFor="t-dob">
            <DateInput
              id="t-dob"
              value={formDateOfBirth}
              onChange={(e) => setFormDateOfBirth(e.target.value)}
            />
          </FormField>
          <FormField label="Địa chỉ" htmlFor="t-address">
            <TextInput
              id="t-address"
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              placeholder="VD: Số 1 Đại Cồ Việt, Hà Nội"
            />
          </FormField>
        </div>

        {/* Tài khoản đăng nhập */}
        <FormSection
          title={hasCurrentAccount ? "Tài khoản đã liên kết" : "Tài khoản đăng nhập"}
        >
          {hasCurrentAccount && selectedTeacher?.account && (
            <div className="mb-3 flex flex-col gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 sm:flex-row sm:items-center sm:gap-3">
              <span className="font-medium">{selectedTeacher.account.email}</span>
              <span className="text-xs sm:ml-auto">
                Trạng thái: {selectedTeacher.account.isActive ? "Hoạt động" : "Tạm khóa"}
              </span>
            </div>
          )}

          <PillToggleGroup
            options={accountModeOptions}
            value={accountMode}
            onChange={setAccountMode}
            ariaLabel="Chế độ tài khoản đăng nhập"
            className="mb-3"
          />

          {accountMode === "keep" && selectedTeacher?.account && (
            <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              Giữ nguyên tài khoản{" "}
              <span className="font-medium text-slate-900">
                {selectedTeacher.account.email}
              </span>{" "}
              sau khi lưu.
            </p>
          )}

          {accountMode === "none" && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {hasCurrentAccount
                ? "Tài khoản hiện tại sẽ được hủy liên kết sau khi lưu thay đổi."
                : "Giảng viên sẽ chưa có tài khoản đăng nhập sau khi lưu."}
            </p>
          )}

          {accountMode === "link" && (
            <FormField label="Chọn tài khoản giảng viên chưa liên kết" required error={errors.accountLinkId}>
              <SearchableSelect
                value={accountLinkId}
                onChange={setAccountLinkId}
                options={unlinkedAccounts}
                getOptionValue={(a) => a.id}
                getOptionLabel={(a) => a.email}
                getOptionSubLabel={(a) => (a.isActive ? "Hoạt động" : "Tạm khóa")}
                placeholder="-- Chọn tài khoản --"
                searchPlaceholder="Gõ email để tìm..."
                emptyMessage={
                  unlinkedAccounts.length === 0
                    ? "Không có tài khoản giảng viên chưa liên kết"
                    : "Không tìm thấy email phù hợp"
                }
                hasError={Boolean(errors.accountLinkId)}
              />
            </FormField>
          )}

          {accountMode === "create" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Email tài khoản"
                required
                error={errors.accountEmail}
                helper={`Tên miền yêu cầu: *${STAFF_DOMAIN}`}
                htmlFor="t-acc-email"
              >
                <TextInput
                  id="t-acc-email"
                  type="email"
                  autoComplete="off"
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  placeholder={`VD: nvan${STAFF_DOMAIN}`}
                  invalid={Boolean(errors.accountEmail)}
                />
              </FormField>
              <FormField
                label="Mật khẩu"
                required
                error={errors.accountPassword}
                helper="Tối thiểu 8 ký tự"
                htmlFor="t-acc-pwd"
              >
                <TextInput
                  id="t-acc-pwd"
                  type="password"
                  autoComplete="new-password"
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  invalid={Boolean(errors.accountPassword)}
                />
              </FormField>
            </div>
          )}
        </FormSection>
      </AdminFormModal>

      {/* Import Dialog */}
      <ImportDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={() => refetch()}
        title="Nhập giảng viên từ file"
        resourceLabel="giảng viên"
        importFn={importTeachers}
        downloadTemplateFn={downloadTeachersTemplate}
        templateFilename="giang_vien_mau.xlsx"
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Xác nhận xóa giảng viên"
        description={
          teacherToDelete ? (
            <>
              Bạn có chắc chắn muốn xóa giảng viên <b>{teacherToDelete.fullName}</b> (mã{" "}
              <b>{teacherToDelete.teacherCode}</b>)? Hành động này không thể hoàn tác.
            </>
          ) : (
            "Hành động này không thể hoàn tác."
          )
        }
        loading={deleting}
      />

      {/* Unlink Confirmation */}
      <ConfirmDialog
        isOpen={isUnlinkModalOpen}
        onClose={() => setIsUnlinkModalOpen(false)}
        onConfirm={handleUnlink}
        title="Hủy liên kết tài khoản"
        description={
          teacherToUnlink ? (
            <>
              Bạn có chắc chắn muốn hủy liên kết tài khoản{" "}
              <b>{teacherToUnlink.account?.email ?? ""}</b> khỏi giảng viên{" "}
              <b>{teacherToUnlink.fullName}</b>?
            </>
          ) : (
            "Hành động này có thể hoàn tác bằng cách liên kết lại."
          )
        }
        confirmLabel="Hủy liên kết"
        tone="default"
        loading={unlinking}
      />
    </div>
  );
}
