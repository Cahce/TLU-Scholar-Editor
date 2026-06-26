import { useState } from "react";
import {
  GraduationCap,
  UserCheck,
  UserX,
  FolderKanban,
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
import { useMajors } from "../../../hooks/admin/useMajors";
import { useClasses } from "../../../hooks/admin/useClasses";
import { useStudents } from "../../../hooks/admin/useStudents";
import { useAdminStats } from "../../../hooks/useAdminStats";
import { useAdminProjectStats } from "../../../hooks/admin/useAdminProjectStats";
import {
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  unlinkStudentAccount,
  importStudents,
  downloadStudentsTemplate,
  linkStudentAccount,
} from "../../../api/admin/students";
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
import { STUDENT_DOMAIN, validateEmailForRole } from "../_shared/email";
import { adminToast } from "../_shared/toast";
import type { CreateStudentRequest, Student } from "../../../types/admin";
import { GENDER_OPTIONS } from "../../../lib/gender";

export function AdminStudents() {
  // Search, filter, and pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [facultyFilter, setFacultyFilter] = useState<string>("");
  const [majorFilter, setMajorFilter] = useState<string>("");
  const [classFilter, setClassFilter] = useState<string>("");
  const [hasAccountFilter, setHasAccountFilter] = useState<string>("");
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

  // Fetch classes for dropdown (lazy - only when major is selected)
  const { data: classesData } = useClasses({ 
    majorId: majorFilter || undefined,
    pageSize: 100 
  });
  const classes = classesData?.items ?? [];

  // Fetch students from API
  const { data, loading, error, refetch } = useStudents({
    search: searchQuery,
    facultyId: facultyFilter || undefined,
    majorId: majorFilter || undefined,
    classId: classFilter || undefined,
    hasAccount: hasAccountFilter ? (hasAccountFilter as "true" | "false") : undefined,
    page,
    pageSize,
  });

  const students = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // Total student-owned projects (for the "Tổng project" stat card)
  const { data: projectStats } = useAdminProjectStats("student");

  // Calculate stats from API data
  // Whole-dataset counts (all records, not just the current page).
  const stats = useAdminStats(
    listStudents,
    { total: {}, linked: { hasAccount: "true" }, unlinked: { hasAccount: "false" } },
    [data],
  );
  const totalStudents = stats.total ?? 0;
  const activeStudents = stats.linked ?? 0;
  const inactiveStudents = stats.unlinked ?? 0;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formStudentCode, setFormStudentCode] = useState("");
  const [formFullName, setFormFullName] = useState("");
  const [formClassId, setFormClassId] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formGender, setFormGender] = useState<"" | "male" | "female" | "other">("");
  const [formDateOfBirth, setFormDateOfBirth] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form cascade state for modal
  const [formFacultyId, setFormFacultyId] = useState("");
  const [formMajorId, setFormMajorId] = useState("");

  // Fetch majors for modal (lazy - only when faculty is selected in modal)
  const { data: modalMajorsData } = useMajors({ 
    facultyId: formFacultyId || undefined,
    pageSize: 100 
  });
  const modalMajors = modalMajorsData?.items ?? [];

  // Fetch classes for modal (lazy - only when major is selected in modal)
  const { data: modalClassesData } = useClasses({ 
    majorId: formMajorId || undefined,
    pageSize: 100 
  });
  const modalClasses = modalClassesData?.items ?? [];

  // Account picker state (Add mode + Edit-when-unlinked)
  const [accountMode, setAccountMode] = useState<"none" | "link" | "create">("none");
  const [accountLinkId, setAccountLinkId] = useState("");
  const [accountLinkSearch, setAccountLinkSearch] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");

  const { data: unlinkedAccountsData, refetch: refetchUnlinkedAccounts } = useAccounts({
    role: "student",
    hasLink: "false",
    pageSize: 100,
  });
  const unlinkedAccounts = unlinkedAccountsData?.items ?? [];
  const filteredUnlinkedAccounts = accountLinkSearch.trim()
    ? unlinkedAccounts.filter((acc) =>
        acc.email.toLowerCase().includes(accountLinkSearch.trim().toLowerCase()),
      )
    : unlinkedAccounts;

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [isImportOpen, setIsImportOpen] = useState(false);

  const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);
  const [studentToUnlink, setStudentToUnlink] = useState<Student | null>(null);
  const [unlinking, setUnlinking] = useState(false);

  const handleOpenAdd = () => {
    void refetchUnlinkedAccounts();
    setModalMode("add");
    setSelectedStudent(null);
    setFormStudentCode("");
    setFormFullName("");
    setFormClassId("");
    setFormPhone("");
    setFormGender("");
    setFormDateOfBirth("");
    setFormAddress("");
    setFormFacultyId("");
    setFormMajorId("");
    setAccountMode("none");
    setAccountLinkId("");
    setAccountLinkSearch("");
    setAccountEmail("");
    setAccountPassword("");
    setErrors({});
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    // Refresh the unlinked-account list before opening: an account that was
    // just unlinked on this page becomes available immediately for re-link.
    void refetchUnlinkedAccounts();
    setModalMode("edit");
    setSelectedStudent(student);
    setFormStudentCode(student.studentCode);
    setFormFullName(student.fullName);
    setFormClassId(student.classId);
    setFormPhone(student.phone ?? "");
    setFormGender(student.gender ?? "");
    setFormDateOfBirth(student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : "");
    setFormAddress(student.address ?? "");

    // Derive faculty and major from student's nested data
    setFormMajorId(student.major?.id ?? "");
    setFormFacultyId(student.faculty?.id ?? "");

    setAccountMode("none");
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
    if (!formStudentCode.trim()) next.studentCode = "Mã sinh viên không được để trống";
    if (!formFullName.trim()) next.fullName = "Họ và tên không được để trống";
    if (!formFacultyId) next.facultyId = "Vui lòng chọn khoa";
    if (!formMajorId) next.majorId = "Vui lòng chọn ngành";
    if (!formClassId) next.classId = "Vui lòng chọn lớp";

    const studentUnlinked = modalMode === "edit" && !selectedStudent?.accountId;
    const showAccountPicker = modalMode === "add" || studentUnlinked;
    if (showAccountPicker) {
      if (accountMode === "link" && !accountLinkId) {
        next.accountLinkId = "Vui lòng chọn tài khoản để liên kết";
      }
      if (accountMode === "create") {
        const v = validateEmailForRole(accountEmail.trim(), "student");
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
    const studentUnlinked = modalMode === "edit" && !selectedStudent?.accountId;

    setSubmitting(true);
    try {
      const payload: CreateStudentRequest = {
        studentCode: formStudentCode.trim(),
        fullName: formFullName.trim(),
        classId: formClassId,
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
        await createStudent(payload);
        if (accountMode === "none") {
          adminToast.created("sinh viên", formStudentCode.trim());
        } else {
          adminToast.createdWithAccount("sinh viên", formStudentCode.trim());
        }
      } else if (selectedStudent) {
        const { account: _unused, ...updatePayload } = payload;
        void _unused;
        await updateStudent(selectedStudent.id, updatePayload);
        if (studentUnlinked && accountMode === "link") {
          await linkStudentAccount(selectedStudent.id, { accountId: accountLinkId });
          adminToast.updated("sinh viên", formStudentCode.trim());
          adminToast.linkedAccount(`sinh viên ${formStudentCode.trim()}`);
        } else if (studentUnlinked && accountMode === "create") {
          await createAccount({
            email: accountEmail.trim(),
            password: accountPassword,
            role: "student",
            linkTo: { type: "student", id: selectedStudent.id },
          });
          adminToast.updated("sinh viên", formStudentCode.trim());
          adminToast.linkedAccount(`sinh viên ${formStudentCode.trim()}`);
        } else {
          adminToast.updated("sinh viên", formStudentCode.trim());
        }
      }
      setIsModalOpen(false);
      await Promise.all([refetch(), refetchUnlinkedAccounts()]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Có lỗi xảy ra";
      setSubmitError(message);
      adminToast.error(
        modalMode === "add" ? "Thêm sinh viên" : "Cập nhật sinh viên",
        err,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (student: Student) => {
    setStudentToDelete(student);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!studentToDelete) return;

    setDeleting(true);
    try {
      await deleteStudent(studentToDelete.id);
      adminToast.deleted("sinh viên", studentToDelete.studentCode);
      setIsDeleteModalOpen(false);
      setStudentToDelete(null);
      await Promise.all([refetch(), refetchUnlinkedAccounts()]);
    } catch (err) {
      adminToast.error("Xóa sinh viên", err);
    } finally {
      setDeleting(false);
    }
  };

  const confirmUnlink = (student: Student) => {
    setStudentToUnlink(student);
    setIsUnlinkModalOpen(true);
  };

  const handleUnlink = async () => {
    if (!studentToUnlink) return;

    setUnlinking(true);
    try {
      await unlinkStudentAccount(studentToUnlink.id);
      adminToast.unlinkedAccount(`sinh viên ${studentToUnlink.studentCode}`);
      setIsUnlinkModalOpen(false);
      setStudentToUnlink(null);
      // The just-unlinked account becomes hasLink=false; refresh both the
      // student row table and the unlinked-account picker cache.
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

  // Helper to get major name by ID
  const getMajorName = (majorId: string) => {
    const major = majors.find(m => m.id === majorId);
    return major?.name ?? "—";
  };

  // Helper to get class name by ID
  const getClassName = (classId: string) => {
    const cls = classes.find(c => c.id === classId);
    return cls?.name ?? "—";
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quản lý sinh viên</h1>
          <p className="text-slate-500 mt-1 text-sm">Quản lý tài khoản và thông tin sinh viên</p>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
        
        {/* Stat Card 1: Tổng số sinh viên */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 text-[#007bff] flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Tổng số sinh viên</p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1">{totalStudents}</h4>
          </div>
        </div>

        {/* Stat Card 2: Sinh viên hoạt động */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Đã liên kết tài khoản</p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1">{activeStudents}</h4>
          </div>
        </div>

        {/* Stat Card 3: Sinh viên bị khóa */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Chưa liên kết</p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1">{inactiveStudents}</h4>
          </div>
        </div>

        {/* Stat Card 4: Tổng project */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Tổng project</p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1">{projectStats?.total ?? "—"}</h4>
          </div>
        </div>
      </div>

      {/* Student Management Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col gap-4 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
            <div className="relative w-full sm:max-w-md shrink-0 flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input 
                type="text" 
                placeholder="Tìm kiếm theo tên hoặc mã sinh viên..." 
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
                  setClassFilter("");
                  setPage(1);
                }}
                options={[{ id: "", name: "Tất cả", code: "" }, ...faculties]}
                getOptionValue={(f) => f.id}
                getOptionLabel={(f) => (f.id ? f.name : "Khoa: Tất cả")}
                getOptionSubLabel={(f) => (f.code ? `Mã: ${f.code}` : undefined)}
                placeholder="Khoa: Tất cả"
              />
            </div>

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
                disabled={!facultyFilter}
              />
            </div>

            <div className="min-w-[140px]">
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
              <p className="text-slate-900 font-medium mb-2">Không thể tải danh sách sinh viên</p>
              <p className="text-slate-500 text-sm mb-4">{error}</p>
              <Button onClick={() => refetch()} variant="outline">
                Thử lại
              </Button>
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <GraduationCap className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-900 font-medium mb-2">Chưa có sinh viên nào</p>
              <p className="text-slate-500 text-sm mb-4">
                {searchQuery || facultyFilter || majorFilter || classFilter || hasAccountFilter ? "Không tìm thấy kết quả phù hợp" : "Hãy thêm sinh viên đầu tiên"}
              </p>
              {!searchQuery && !facultyFilter && !majorFilter && !classFilter && !hasAccountFilter && (
                <Button onClick={handleOpenAdd} className="bg-[#007bff] hover:bg-[#0056b3]">
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm sinh viên
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-white text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-6 py-4">Họ và tên</th>
                  <th className="px-6 py-4">Mã SV</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Khoa</th>
                  <th className="px-6 py-4">Ngành</th>
                  <th className="px-6 py-4">Tên lớp</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => {
                  const hasAccount = student.accountId !== null;
                  const cls = classes.find(c => c.id === student.classId);
                  const major = majors.find(m => m.id === cls?.majorId);

                  return (
                    <tr key={student.id} className="hover:bg-blue-50/30 transition-colors group bg-white">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-slate-900 group-hover:text-[#007bff] transition-colors cursor-pointer">
                          {student.fullName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600 whitespace-nowrap">
                        {student.studentCode}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {student.account?.email ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {major ? getFacultyName(major.facultyId) : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {cls ? getMajorName(cls.majorId) : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600 whitespace-nowrap">
                        {getClassName(student.classId)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${hasAccount ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                          {hasAccount ? "Đã liên kết" : "Chưa liên kết"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-1.5">
                          <button 
                            onClick={() => handleOpenEdit(student)}
                            className="w-8 h-8 rounded text-slate-400 hover:text-[#007bff] hover:bg-blue-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#007bff]/20"
                            title="Chỉnh sửa sinh viên"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {hasAccount && (
                            <button 
                              onClick={() => confirmUnlink(student)}
                              className="w-8 h-8 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                              title="Hủy liên kết tài khoản"
                            >
                              <Unlink className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={() => confirmDelete(student)}
                            className="w-8 h-8 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                            title="Xóa sinh viên"
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
            Hiển thị <span className="font-medium text-slate-900">{students.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> đến <span className="font-medium text-slate-900">{Math.min(page * pageSize, total)}</span> trong số <span className="font-medium text-slate-900">{total}</span> kết quả
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
        title={modalMode === "add" ? "Thêm sinh viên" : "Chỉnh sửa sinh viên"}
        size="lg"
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel={modalMode === "add" ? "Lưu" : "Lưu thay đổi"}
        submitError={submitError}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Mã sinh viên" required error={errors.studentCode} htmlFor="s-code">
            <TextInput
              id="s-code"
              value={formStudentCode}
              onChange={(e) => setFormStudentCode(e.target.value)}
              placeholder="VD: 2251172560"
              invalid={Boolean(errors.studentCode)}
            />
          </FormField>
          <FormField label="Họ và tên" required error={errors.fullName} htmlFor="s-name">
            <TextInput
              id="s-name"
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
                setFormMajorId("");
                setFormClassId("");
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
          <FormField label="Ngành" required error={errors.majorId}>
            <SearchableSelect
              value={formMajorId}
              onChange={(v) => {
                setFormMajorId(v);
                setFormClassId("");
              }}
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
          <FormField label="Lớp" required error={errors.classId}>
            <SearchableSelect
              value={formClassId}
              onChange={setFormClassId}
              options={modalClasses}
              getOptionValue={(c) => c.id}
              getOptionLabel={(c) => c.name}
              getOptionSubLabel={(c) => `Mã: ${c.code}`}
              placeholder={formMajorId ? "-- Chọn lớp --" : "Chọn ngành trước"}
              searchPlaceholder="Gõ tên hoặc mã lớp..."
              hasError={Boolean(errors.classId)}
              disabled={!formMajorId}
            />
          </FormField>
          <FormField label="Số điện thoại" htmlFor="s-phone">
            <TextInput
              id="s-phone"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              placeholder="VD: 0987654321"
            />
          </FormField>
          <FormField label="Giới tính" htmlFor="s-gender">
            <NativeSelect
              id="s-gender"
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
          <FormField label="Ngày sinh" htmlFor="s-dob">
            <DateInput
              id="s-dob"
              value={formDateOfBirth}
              onChange={(e) => setFormDateOfBirth(e.target.value)}
            />
          </FormField>
          <FormField label="Địa chỉ" htmlFor="s-address" className="md:col-span-2">
            <TextInput
              id="s-address"
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              placeholder="VD: Số 1 Đại Cồ Việt, Hà Nội"
            />
          </FormField>
        </div>

        {modalMode === "edit" && selectedStudent?.accountId && selectedStudent?.account && (
          <FormSection title="Tài khoản đã liên kết">
            <div className="flex flex-col gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 sm:flex-row sm:items-center sm:gap-3">
              <span className="font-medium">{selectedStudent.account.email}</span>
              <span className="text-xs sm:ml-auto">
                Trạng thái: {selectedStudent.account.isActive ? "Hoạt động" : "Tạm khóa"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Để hủy liên kết, bấm nút "Hủy liên kết tài khoản" ở hàng sinh viên trong danh sách.
            </p>
          </FormSection>
        )}

        {(modalMode === "add" ||
          (modalMode === "edit" && !selectedStudent?.accountId)) && (
          <FormSection title="Tài khoản đăng nhập">
            <PillToggleGroup
              options={[
                { value: "none", label: "Không liên kết" },
                { value: "link", label: "Liên kết tài khoản có sẵn" },
                { value: "create", label: "Tạo tài khoản mới" },
              ]}
              value={accountMode}
              onChange={setAccountMode}
              ariaLabel="Chế độ tài khoản đăng nhập"
              className="mb-3"
            />

            {accountMode === "link" && (
              <FormField
                label="Chọn tài khoản sinh viên chưa liên kết"
                required
                error={errors.accountLinkId}
              >
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
                      ? "Không có tài khoản sinh viên chưa liên kết"
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
                  helper={`Tên miền yêu cầu: *${STUDENT_DOMAIN}`}
                  htmlFor="s-acc-email"
                >
                  <TextInput
                    id="s-acc-email"
                    type="email"
                    autoComplete="off"
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    placeholder={`VD: 2251172560${STUDENT_DOMAIN}`}
                    invalid={Boolean(errors.accountEmail)}
                  />
                </FormField>
                <FormField
                  label="Mật khẩu"
                  required
                  error={errors.accountPassword}
                  helper="Tối thiểu 8 ký tự"
                  htmlFor="s-acc-pwd"
                >
                  <TextInput
                    id="s-acc-pwd"
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
        )}
      </AdminFormModal>

      {/* Import Dialog */}
      <ImportDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={() => refetch()}
        title="Nhập sinh viên từ file"
        resourceLabel="sinh viên"
        importFn={importStudents}
        downloadTemplateFn={downloadStudentsTemplate}
        templateFilename="sinh_vien_mau.xlsx"
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Xác nhận xóa sinh viên"
        description={
          studentToDelete ? (
            <>
              Bạn có chắc chắn muốn xóa sinh viên <b>{studentToDelete.fullName}</b> (mã{" "}
              <b>{studentToDelete.studentCode}</b>)? Hành động này không thể hoàn tác.
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
          studentToUnlink ? (
            <>
              Bạn có chắc chắn muốn hủy liên kết tài khoản{" "}
              <b>{studentToUnlink.account?.email ?? ""}</b> khỏi sinh viên{" "}
              <b>{studentToUnlink.fullName}</b>?
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