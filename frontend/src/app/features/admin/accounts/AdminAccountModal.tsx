import { useEffect, useMemo, useState } from "react";
import { Link2, UserPlus } from "lucide-react";
import { AdminFormModal } from "../../../components/admin/AdminFormModal";
import { FormField } from "../../../components/admin/FormField";
import { TextInput } from "../../../components/admin/FormControls";
import { FormSection } from "../../../components/admin/FormSection";
import { PillToggleGroup } from "../../../components/admin/PillToggleGroup";
import { SearchableSelect } from "../../../components/admin/SearchableSelect";
import type { Account, UserRole } from "../../../types/admin";
import { listTeachers } from "../../../api/admin/teachers";
import { listStudents } from "../../../api/admin/students";
import { useFaculties } from "../../../hooks/admin/useFaculties";
import { useDepartments } from "../../../hooks/admin/useDepartments";
import { useMajors } from "../../../hooks/admin/useMajors";
import { useClasses } from "../../../hooks/admin/useClasses";
import {
  inferRoleFromEmail,
  validateEmailForRole,
  STAFF_DOMAIN,
  STUDENT_DOMAIN,
} from "../_shared/email";
import { VMSG } from "../../../lib/validation";

export type AccountModalMode = "add" | "edit";

export type CreateProfilePayload =
  | {
      type: "teacher";
      teacherCode: string;
      fullName: string;
      departmentId: string;
      academicRank: string;
      academicDegree: string;
      phone?: string;
    }
  | {
      type: "student";
      studentCode: string;
      fullName: string;
      classId: string;
      phone?: string;
    };

export interface AccountSubmitPayload {
  email: string;
  role: UserRole;
  password?: string;
  isActive?: boolean;
  // Mutually exclusive — only one set at a time.
  linkTo?: { type: "teacher" | "student"; id: string };
  createProfile?: CreateProfilePayload;
}

interface AdminAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: AccountModalMode;
  initialData?: Account | null;
  onSubmit: (payload: AccountSubmitPayload) => Promise<void>;
  submitError?: string | null;
}

interface LinkOption {
  id: string;
  fullName: string;
  code: string;
}

type LinkMode = "none" | "link" | "create";

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: "student", label: "Sinh viên" },
  { value: "teacher", label: "Giảng viên" },
  { value: "admin", label: "Quản trị" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Hoạt động" },
  { value: "inactive", label: "Tạm khóa" },
];

const TEACHER_RANK_OPTIONS = [
  { value: "Không", label: "Không" },
  { value: "Giáo sư", label: "Giáo sư" },
  { value: "Phó Giáo sư", label: "Phó Giáo sư" },
];

const TEACHER_DEGREE_OPTIONS = [
  { value: "Cử nhân", label: "Cử nhân / Kỹ sư" },
  { value: "Thạc sĩ", label: "Thạc sĩ" },
  { value: "Tiến sĩ", label: "Tiến sĩ" },
  { value: "Tiến sĩ khoa học", label: "Tiến sĩ khoa học" },
];

export function AdminAccountModal({
  isOpen,
  onClose,
  mode,
  initialData,
  onSubmit,
  submitError,
}: AdminAccountModalProps) {
  const [role, setRole] = useState<UserRole>("student");
  const [roleTouched, setRoleTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Link picker state (Add mode + Edit-when-unlinked, or Edit "Đổi liên kết").
  const [linkMode, setLinkMode] = useState<LinkMode>("none");
  const [linkId, setLinkId] = useState("");
  const [linkOptions, setLinkOptions] = useState<LinkOption[]>([]);

  // Create-new-profile state.
  const [newCode, setNewCode] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newFacultyId, setNewFacultyId] = useState("");
  const [newDepartmentId, setNewDepartmentId] = useState("");
  const [newMajorId, setNewMajorId] = useState("");
  const [newClassId, setNewClassId] = useState("");
  const [newAcademicRank, setNewAcademicRank] = useState("");
  const [newAcademicDegree, setNewAcademicDegree] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const { data: facultiesData } = useFaculties({ pageSize: 100 });
  const faculties = facultiesData?.items ?? [];

  const { data: departmentsData } = useDepartments({
    facultyId: newFacultyId || undefined,
    pageSize: 100,
  });
  const departments = departmentsData?.items ?? [];

  const { data: majorsData } = useMajors({
    facultyId: newFacultyId || undefined,
    pageSize: 100,
  });
  const majors = majorsData?.items ?? [];

  const { data: classesData } = useClasses({
    majorId: newMajorId || undefined,
    pageSize: 100,
  });
  const classes = classesData?.items ?? [];

  useEffect(() => {
    if (!isOpen) return;
    if (mode === "edit" && initialData) {
      setRole(initialData.role);
      setEmail(initialData.email);
      setIsActive(initialData.isActive);
    } else {
      setRole("student");
      setEmail("");
      setIsActive(true);
    }
    setRoleTouched(false);
    setPassword("");
    setConfirmPassword("");
    setErrors({});
    setLinkMode("none");
    setLinkId("");
    setLinkOptions([]);
    setNewCode("");
    setNewFullName("");
    setNewFacultyId("");
    setNewDepartmentId("");
    setNewMajorId("");
    setNewClassId("");
    setNewAcademicRank("");
    setNewAcademicDegree("");
    setNewPhone("");
  }, [isOpen, mode, initialData]);

  // Email-driven role inference for Add mode (until user manually changes role).
  useEffect(() => {
    if (mode !== "add" || roleTouched) return;
    const inferred = inferRoleFromEmail(email);
    if (inferred && inferred !== role) {
      setRole(inferred);
      setLinkMode("none");
      setLinkId("");
    }
  }, [email, mode, role, roleTouched]);

  const emailValidation = useMemo(() => {
    if (!email) return null;
    return validateEmailForRole(email.trim(), role);
  }, [email, role]);

  // Fetch unlinked profiles for the SearchableSelect option list.
  useEffect(() => {
    if (!isOpen) return;
    if (linkMode !== "link") {
      setLinkOptions([]);
      return;
    }
    if (role !== "teacher" && role !== "student") return;
    if (!emailValidation || !emailValidation.ok) return;
    let cancelled = false;
    const targetType: "teacher" | "student" = role;
    const fetchOptions = async () => {
      try {
        const page =
          targetType === "teacher"
            ? await listTeachers({ hasAccount: "false", pageSize: 50 })
            : await listStudents({ hasAccount: "false", pageSize: 50 });
        if (cancelled) return;
        const items =
          targetType === "teacher"
            ? page.items.map((t) => ({
                id: t.id,
                fullName: t.fullName,
                code: t.teacherCode,
              }))
            : page.items.map((s) => ({
                id: s.id,
                fullName: s.fullName,
                code: s.studentCode,
              }));
        setLinkOptions(items);
      } catch {
        if (!cancelled) setLinkOptions([]);
      }
    };
    void fetchOptions();
    return () => {
      cancelled = true;
    };
  }, [role, emailValidation, linkMode, isOpen]);

  const canShowLinkSection =
    (role === "teacher" || role === "student") &&
    emailValidation?.ok === true &&
    // Edit-mode: only show link section if account is currently unlinked.
    !(mode === "edit" && initialData?.link);

  const handleRoleChange = (next: UserRole) => {
    setRoleTouched(true);
    setRole(next);
    setLinkMode("none");
    setLinkId("");
  };

  const linkLabel = role === "teacher" ? "giảng viên" : "sinh viên";

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      next.email = VMSG.required("Email");
    } else if (mode === "add") {
      const v = validateEmailForRole(trimmedEmail, role);
      if (!v.ok) next.email = v.message;
    }
    if (mode === "add") {
      if (!password) next.password = VMSG.required("Mật khẩu");
      else if (password.length < 8) next.password = VMSG.passwordMin(8);
      if (password !== confirmPassword)
        next.confirmPassword = VMSG.passwordMismatch;
    }
    if (canShowLinkSection && linkMode === "link" && !linkId) {
      next.linkId = "Vui lòng chọn hồ sơ để liên kết";
    }
    if (canShowLinkSection && linkMode === "create") {
      if (!newCode.trim()) {
        next.newCode =
          role === "teacher"
            ? "Mã giảng viên không được để trống"
            : "Mã sinh viên không được để trống";
      }
      if (!newFullName.trim()) next.newFullName = "Họ và tên không được để trống";
      if (!newFacultyId) next.newFacultyId = "Vui lòng chọn khoa";
      if (role === "teacher") {
        if (!newDepartmentId) next.newDepartmentId = "Vui lòng chọn bộ môn";
        if (!newAcademicRank) next.newAcademicRank = "Vui lòng chọn học hàm";
        if (!newAcademicDegree) next.newAcademicDegree = "Vui lòng chọn học vị";
      } else {
        if (!newMajorId) next.newMajorId = "Vui lòng chọn ngành";
        if (!newClassId) next.newClassId = "Vui lòng chọn lớp";
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
    setSubmitting(true);
    try {
      const trimmedEmail = email.trim();
      const payload: AccountSubmitPayload = {
        email: trimmedEmail,
        role,
        ...(mode === "add" ? { password } : { isActive }),
      };
      if (canShowLinkSection && linkMode === "link" && linkId) {
        payload.linkTo = { type: role as "teacher" | "student", id: linkId };
      } else if (canShowLinkSection && linkMode === "create") {
        payload.createProfile =
          role === "teacher"
            ? {
                type: "teacher",
                teacherCode: newCode.trim(),
                fullName: newFullName.trim(),
                departmentId: newDepartmentId,
                academicRank: newAcademicRank,
                academicDegree: newAcademicDegree,
                phone: newPhone.trim() || undefined,
              }
            : {
                type: "student",
                studentCode: newCode.trim(),
                fullName: newFullName.trim(),
                classId: newClassId,
                phone: newPhone.trim() || undefined,
              };
      }
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  };

  const domainHint =
    role === "student"
      ? `Tên miền sinh viên: *${STUDENT_DOMAIN}`
      : role === "teacher"
        ? `Tên miền giảng viên: *${STAFF_DOMAIN}`
        : `Tên miền quản trị: *${STAFF_DOMAIN}`;

  const inferredHint =
    mode === "add" && !roleTouched && inferRoleFromEmail(email)
      ? "Tự suy luận từ email. Có thể đổi vai trò thủ công."
      : undefined;

  return (
    <AdminFormModal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "add" ? "Thêm tài khoản" : "Chỉnh sửa tài khoản"}
      size="lg"
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel={mode === "add" ? "Lưu" : "Lưu thay đổi"}
      submitError={submitError}
    >
      <FormSection title="Thông tin tài khoản">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <FormField
            label="Email đăng nhập"
            required
            error={
              errors.email ??
              (mode === "add" && emailValidation && !emailValidation.ok
                ? emailValidation.message
                : undefined)
            }
            helper={mode === "add" ? domainHint : undefined}
            htmlFor="acc-email"
          >
            <TextInput
              id="acc-email"
              type="email"
              autoComplete="off"
              placeholder={
                role === "student"
                  ? "VD: 2251172560@e.tlu.edu.vn"
                  : "VD: nguyenvanan@tlu.edu.vn"
              }
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              invalid={Boolean(errors.email)}
            />
          </FormField>

          <FormField label="Vai trò" required helper={inferredHint}>
            <SearchableSelect
              value={role}
              onChange={(v) => handleRoleChange(v as UserRole)}
              options={ROLE_OPTIONS}
              getOptionValue={(o) => o.value}
              getOptionLabel={(o) => o.label}
              placeholder="-- Chọn vai trò --"
            />
          </FormField>

          {mode === "add" && (
            <>
              <FormField
                label="Mật khẩu"
                required
                error={errors.password}
                htmlFor="acc-pwd"
              >
                <TextInput
                  id="acc-pwd"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Tối thiểu 8 ký tự"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  invalid={Boolean(errors.password)}
                />
              </FormField>
              <FormField
                label="Xác nhận mật khẩu"
                required
                error={errors.confirmPassword}
                htmlFor="acc-pwd2"
              >
                <TextInput
                  id="acc-pwd2"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Nhập lại mật khẩu"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  invalid={Boolean(errors.confirmPassword)}
                />
              </FormField>
            </>
          )}

          {mode === "edit" && (
            <FormField label="Trạng thái" className="md:col-span-2">
              <SearchableSelect
                value={isActive ? "active" : "inactive"}
                onChange={(v) => setIsActive(v === "active")}
                options={STATUS_OPTIONS}
                getOptionValue={(o) => o.value}
                getOptionLabel={(o) => o.label}
              />
            </FormField>
          )}
        </div>
      </FormSection>

      {mode === "edit" && initialData?.link && (
        <FormSection title="Hồ sơ đã liên kết" icon={Link2}>
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span className="font-mono text-xs bg-white border border-emerald-300 px-2 py-0.5 rounded">
              {initialData.link.code}
            </span>
            <span className="font-medium">{initialData.link.fullName}</span>
            <span className="text-xs ml-auto">
              {initialData.link.type === "teacher" ? "Giảng viên" : "Sinh viên"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Để hủy liên kết, vào trang{" "}
            {initialData.link.type === "teacher" ? "Giảng viên" : "Sinh viên"} và bấm
            "Hủy liên kết tài khoản".
          </p>
        </FormSection>
      )}

      {canShowLinkSection && (
        <FormSection title={`Liên kết hồ sơ ${linkLabel}`} icon={Link2}>
          <PillToggleGroup
            options={[
              { value: "none", label: "Không liên kết" },
              { value: "link", label: `Liên kết ${linkLabel} đã có` },
              { value: "create", label: `Thêm ${linkLabel} mới`, icon: UserPlus },
            ]}
            value={linkMode}
            onChange={(m) => {
              setLinkMode(m);
              setLinkId("");
              setErrors((prev) => {
                const next = { ...prev };
                delete next.linkId;
                delete next.newCode;
                delete next.newFullName;
                delete next.newClassId;
                delete next.newDepartmentId;
                delete next.newAcademicRank;
                delete next.newAcademicDegree;
                delete next.newFacultyId;
                delete next.newMajorId;
                return next;
              });
            }}
            ariaLabel={`Chế độ liên kết hồ sơ ${linkLabel}`}
            className="mb-4"
          />

          {linkMode === "link" && (
            <FormField label={`Chọn ${linkLabel} chưa có tài khoản`} required error={errors.linkId}>
              <SearchableSelect
                value={linkId}
                onChange={setLinkId}
                options={linkOptions}
                getOptionValue={(o) => o.id}
                getOptionLabel={(o) => `${o.code} — ${o.fullName}`}
                getOptionSubLabel={(o) => o.fullName}
                placeholder={`-- Chọn ${linkLabel} --`}
                searchPlaceholder={`Gõ tên hoặc mã ${linkLabel}...`}
                emptyMessage={`Không có ${linkLabel} chưa có tài khoản phù hợp`}
                hasError={Boolean(errors.linkId)}
              />
            </FormField>
          )}

          {linkMode === "create" && (
            <div className="space-y-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-xs text-slate-600">
                Tài khoản và hồ sơ {linkLabel} sẽ được tạo cùng một thao tác.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label={role === "teacher" ? "Mã giảng viên" : "Mã sinh viên"}
                  required
                  error={errors.newCode}
                  htmlFor="new-code"
                >
                  <TextInput
                    id="new-code"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder={role === "teacher" ? "VD: GV001" : "VD: 2251172560"}
                    invalid={Boolean(errors.newCode)}
                  />
                </FormField>
                <FormField
                  label="Họ và tên"
                  required
                  error={errors.newFullName}
                  htmlFor="new-name"
                >
                  <TextInput
                    id="new-name"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="VD: Nguyễn Văn An"
                    invalid={Boolean(errors.newFullName)}
                  />
                </FormField>

                <FormField label="Khoa" required error={errors.newFacultyId}>
                  <SearchableSelect
                    value={newFacultyId}
                    onChange={(v) => {
                      setNewFacultyId(v);
                      setNewDepartmentId("");
                      setNewMajorId("");
                      setNewClassId("");
                    }}
                    options={faculties}
                    getOptionValue={(f) => f.id}
                    getOptionLabel={(f) => f.name}
                    getOptionSubLabel={(f) => `Mã: ${f.code}`}
                    placeholder="-- Chọn khoa --"
                    searchPlaceholder="Gõ tên hoặc mã khoa..."
                    hasError={Boolean(errors.newFacultyId)}
                  />
                </FormField>

                {role === "teacher" ? (
                  <>
                    <FormField label="Bộ môn" required error={errors.newDepartmentId}>
                      <SearchableSelect
                        value={newDepartmentId}
                        onChange={setNewDepartmentId}
                        options={departments}
                        getOptionValue={(d) => d.id}
                        getOptionLabel={(d) => d.name}
                        getOptionSubLabel={(d) => `Mã: ${d.code}`}
                        placeholder={newFacultyId ? "-- Chọn bộ môn --" : "Chọn khoa trước"}
                        searchPlaceholder="Gõ tên hoặc mã bộ môn..."
                        hasError={Boolean(errors.newDepartmentId)}
                        disabled={!newFacultyId}
                      />
                    </FormField>
                    <FormField label="Học hàm" required error={errors.newAcademicRank}>
                      <SearchableSelect
                        value={newAcademicRank}
                        onChange={setNewAcademicRank}
                        options={TEACHER_RANK_OPTIONS}
                        getOptionValue={(o) => o.value}
                        getOptionLabel={(o) => o.label}
                        placeholder="-- Chọn học hàm --"
                        hasError={Boolean(errors.newAcademicRank)}
                      />
                    </FormField>
                    <FormField label="Học vị" required error={errors.newAcademicDegree}>
                      <SearchableSelect
                        value={newAcademicDegree}
                        onChange={setNewAcademicDegree}
                        options={TEACHER_DEGREE_OPTIONS}
                        getOptionValue={(o) => o.value}
                        getOptionLabel={(o) => o.label}
                        placeholder="-- Chọn học vị --"
                        hasError={Boolean(errors.newAcademicDegree)}
                      />
                    </FormField>
                  </>
                ) : (
                  <>
                    <FormField label="Ngành" required error={errors.newMajorId}>
                      <SearchableSelect
                        value={newMajorId}
                        onChange={(v) => {
                          setNewMajorId(v);
                          setNewClassId("");
                        }}
                        options={majors}
                        getOptionValue={(m) => m.id}
                        getOptionLabel={(m) => m.name}
                        getOptionSubLabel={(m) => `Mã: ${m.code}`}
                        placeholder={newFacultyId ? "-- Chọn ngành --" : "Chọn khoa trước"}
                        searchPlaceholder="Gõ tên hoặc mã ngành..."
                        hasError={Boolean(errors.newMajorId)}
                        disabled={!newFacultyId}
                      />
                    </FormField>
                    <FormField label="Lớp" required error={errors.newClassId}>
                      <SearchableSelect
                        value={newClassId}
                        onChange={setNewClassId}
                        options={classes}
                        getOptionValue={(c) => c.id}
                        getOptionLabel={(c) => c.name}
                        getOptionSubLabel={(c) => `Mã: ${c.code}`}
                        placeholder={newMajorId ? "-- Chọn lớp --" : "Chọn ngành trước"}
                        searchPlaceholder="Gõ tên hoặc mã lớp..."
                        hasError={Boolean(errors.newClassId)}
                        disabled={!newMajorId}
                      />
                    </FormField>
                  </>
                )}

                <FormField
                  label="Số điện thoại"
                  helper="(tùy chọn)"
                  htmlFor="new-phone"
                  className="md:col-span-2"
                >
                  <TextInput
                    id="new-phone"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="VD: 0987654321"
                  />
                </FormField>
              </div>
            </div>
          )}
        </FormSection>
      )}

      {!canShowLinkSection && mode === "add" && !(initialData?.link) && (
        <p className="text-xs text-slate-500">
          Hồ sơ chi tiết giảng viên / sinh viên có thể được liên kết hoặc tạo mới sau khi
          email hợp lệ.
        </p>
      )}
    </AdminFormModal>
  );
}

