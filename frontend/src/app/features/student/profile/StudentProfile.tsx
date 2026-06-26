import { useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  Eye,
  EyeOff,
  GraduationCap,
  Info,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Shield,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { RecentProjectsCard } from "../../../components/RecentProjectsCard";
import { EditPersonalInfoModal } from "../../../components/EditPersonalInfoModal";
import { useStudentProfile } from "../../../hooks/useStudentProfile";
import { changePassword } from "../../../api/auth";
import { updateMyProfile } from "../../../api/profile";
import { getApiErrorMessage } from "../../../lib/apiError";
import { genderLabel } from "../../../lib/gender";

const NOT_UPDATED = "Chưa cập nhật";
const MIN_PASSWORD_LENGTH = 8;

function formatDate(value: string | null | undefined): string {
  if (!value) return NOT_UPDATED;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return NOT_UPDATED;

  return new Intl.DateTimeFormat("vi-VN").format(date);
}

export function StudentProfile() {
  const { student, loading, error, refetch } = useStudentProfile();

  // Change-password modal state
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Edit-personal-info modal
  const [isEditOpen, setIsEditOpen] = useState(false);

  const resetPasswordModal = () => {
    setIsPasswordOpen(false);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setPasswordError("");
  };

  const closePasswordModal = () => {
    if (submitting) return;
    resetPasswordModal();
  };

  const handlePasswordSubmit = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError("Vui lòng điền đầy đủ các trường mật khẩu.");
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`Mật khẩu mới phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu xác nhận không khớp với mật khẩu mới.");
      return;
    }

    setSubmitting(true);
    setPasswordError("");
    try {
      await changePassword({
        oldPassword,
        newPassword,
        confirmNewPassword: confirmPassword,
      });
      resetPasswordModal();
      toast.success("Đổi mật khẩu thành công");
    } catch (err) {
      setPasswordError(getApiErrorMessage(err, "Không thể đổi mật khẩu. Vui lòng thử lại."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto flex flex-col flex-1 pb-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Hồ sơ cá nhân
          </h1>
          <p className="text-slate-500 mt-1.5 text-[15px]">
            Đang tải thông tin hồ sơ sinh viên
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex items-center gap-3 text-slate-600">
          <Loader2 className="w-5 h-5 animate-spin text-[#007bff]" />
          <span>Đang tải hồ sơ...</span>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="w-full max-w-5xl mx-auto flex flex-col flex-1 pb-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Hồ sơ cá nhân
          </h1>
          <p className="text-slate-500 mt-1.5 text-[15px]">
            Thông tin tài khoản và hồ sơ học tập
          </p>
        </div>

        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h2 className="font-semibold text-slate-900">Không thể tải hồ sơ</h2>
              <p className="text-sm text-slate-600 mt-1">
                {error || "Không tìm thấy hồ sơ sinh viên."}
              </p>
              <Button
                onClick={() => void refetch()}
                className="mt-4 bg-[#007bff] hover:bg-[#0056b3] text-white"
              >
                Thử lại
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayName = student.fullName || student.email;
  const studentCode = student.studentCode || NOT_UPDATED;
  const phone = student.phone || NOT_UPDATED;
  const genderText = genderLabel(student.gender);
  const dateOfBirth = formatDate(student.dateOfBirth);
  const address = student.address || NOT_UPDATED;
  const className = student.class?.name || NOT_UPDATED;
  const majorName = student.class?.major.name || NOT_UPDATED;
  const facultyName = student.class?.major.faculty.name || NOT_UPDATED;
  const createdAt = formatDate(student.createdAt);
  const updatedAt = formatDate(student.updatedAt);
  const statusLabel = student.isActive ? "Đang hoạt động" : "Tạm khóa";

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col flex-1 pb-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Hồ sơ cá nhân</h1>
        <p className="text-slate-500 mt-1.5 text-[15px]">Thông tin tài khoản và hồ sơ học tập</p>
      </div>

      <div className="flex flex-col gap-6">
        {!student.profileLinked && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold">
                Tài khoản chưa được liên kết với hồ sơ sinh viên
              </p>
              <p className="text-amber-800 mt-0.5">
                Vui lòng liên hệ quản trị viên để cập nhật mã sinh viên, lớp,
                ngành và khoa.
              </p>
            </div>
          </div>
        )}

        {/* Section 1: Thông tin chung */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-start justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900">{displayName}</h2>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mt-3">
              <div className="flex items-center gap-2 text-slate-600">
                <GraduationCap className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium">MSV: {studentCode}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium">{student.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-[11px] font-semibold bg-blue-100 text-blue-700 border border-blue-200 rounded uppercase tracking-wider leading-none">Sinh viên</span>
                <span
                  className={`px-2.5 py-1 text-[11px] font-semibold border rounded uppercase tracking-wider leading-none ${
                    student.isActive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  {statusLabel}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-4 sm:mt-0 shrink-0">
            {student.profileLinked && (
              <Button onClick={() => setIsEditOpen(true)} className="w-full sm:w-auto bg-[#007bff] hover:bg-[#0056b3] text-white">
                <Pencil className="w-4 h-4 mr-2" />
                Chỉnh sửa hồ sơ
              </Button>
            )}
            <Button onClick={() => setIsPasswordOpen(true)} variant="outline" className="w-full sm:w-auto border-slate-200 text-slate-700 bg-white hover:bg-slate-50">
              <Lock className="w-4 h-4 mr-2" />
              Đổi mật khẩu
            </Button>
          </div>
        </div>

        {/* Main Grid for Sections 2, 3, 4, 5 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column */}
          <div className="flex flex-col gap-6">
            {/* Section 2: Thông tin cá nhân */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                <User className="w-5 h-5 text-[#007bff]" />
                <h3 className="font-semibold text-slate-900 text-[15px]">Thông tin cá nhân</h3>
              </div>
              <div className="p-6">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                  <div>
                    <dt className="text-xs font-medium text-slate-500 mb-1.5">Giới tính</dt>
                    <dd className="text-sm font-medium text-slate-900 flex items-center h-[38px]">{genderText}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 mb-1.5">Ngày sinh</dt>
                    <dd className="text-sm font-medium text-slate-900 flex items-center gap-1.5 h-[38px]">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {dateOfBirth}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 mb-1.5">Số điện thoại</dt>
                    <dd className="text-sm font-medium text-slate-900 flex items-center gap-1.5 h-[38px]">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {phone}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-slate-500 mb-1.5">Email liên hệ</dt>
                    <dd className="text-sm font-medium text-slate-900 flex items-center gap-1.5 h-[38px]">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {student.email}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-slate-500 mb-1.5">Địa chỉ</dt>
                    <dd className="text-sm font-medium text-slate-900 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <span>{address}</span>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Section 3: Thông tin học tập */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                <BookOpen className="w-5 h-5 text-[#007bff]" />
                <h3 className="font-semibold text-slate-900 text-[15px]">Thông tin học tập</h3>
              </div>
              <div className="p-6">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                  <div>
                    <dt className="text-xs font-medium text-slate-500 mb-1.5">Mã sinh viên</dt>
                    <dd className="text-sm font-medium text-slate-900 flex items-center h-[38px]">{studentCode}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 mb-1.5">Lớp</dt>
                    <dd className="text-sm font-medium text-slate-900 flex items-center h-[38px]">{className}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 mb-1.5">Khoa</dt>
                    <dd className="text-sm font-medium text-slate-900 flex items-center h-[38px]">{facultyName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 mb-1.5">Ngành</dt>
                    <dd className="text-sm font-medium text-slate-900 flex items-center h-[38px]">{majorName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 mb-1.5">Niên khóa</dt>
                    <dd className="text-sm font-medium text-slate-900 flex items-center h-[38px]">{NOT_UPDATED}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 mb-1.5">Giảng viên hướng dẫn</dt>
                    <dd className="text-sm font-medium text-slate-900 flex items-center h-[38px]">{NOT_UPDATED}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6">
            {/* Section 4: Tài khoản hệ thống */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden opacity-90">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                <Shield className="w-5 h-5 text-slate-400" />
                <h3 className="font-semibold text-slate-700 text-[15px]">Tài khoản hệ thống <span className="text-xs font-normal text-slate-400 ml-2">(Chỉ đọc)</span></h3>
              </div>
              <div className="p-6">
                <dl className="space-y-5">
                  <div>
                    <dt className="text-xs font-medium text-slate-500 mb-1">Email đăng nhập</dt>
                    <dd className="text-sm font-medium text-slate-900">{student.email}</dd>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-xs font-medium text-slate-500 mb-1">Vai trò</dt>
                      <dd className="text-sm font-medium text-slate-900">Sinh viên</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500 mb-1">Trạng thái tài khoản</dt>
                      <dd className={`text-sm font-medium ${student.isActive ? "text-emerald-600" : "text-slate-500"}`}>
                        {statusLabel}
                      </dd>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-xs font-medium text-slate-500 mb-1">Ngày tạo tài khoản</dt>
                      <dd className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {createdAt}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500 mb-1">Cập nhật gần nhất</dt>
                      <dd className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {updatedAt}
                      </dd>
                    </div>
                  </div>
                </dl>
              </div>
            </div>

            {/* Section 5: Project gần đây */}
            <RecentProjectsCard viewAllPath="/student" />
          </div>
        </div>
      </div>

      {/* Edit Personal Info Modal */}
      <EditPersonalInfoModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        initial={{
          gender: student.gender,
          dateOfBirth: student.dateOfBirth,
          phone: student.phone,
          address: student.address,
        }}
        onSave={async (data) => {
          await updateMyProfile(data);
          await refetch();
          toast.success("Cập nhật hồ sơ thành công");
        }}
      />

      {/* Change Password Modal */}
      {isPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={closePasswordModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Đổi mật khẩu</h3>
              <button onClick={closePasswordModal} className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50" disabled={submitting}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <p className="text-sm text-slate-500 mb-5">Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.</p>

              {passwordError && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Mật khẩu hiện tại <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showCurrent ? "text" : "password"}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      disabled={submitting}
                      className="w-full pl-3 pr-10 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50"
                      placeholder="Nhập mật khẩu hiện tại"
                    />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Mật khẩu mới <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={submitting}
                      className="w-full pl-3 pr-10 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50"
                      placeholder="Nhập mật khẩu mới"
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">Mật khẩu phải có ít nhất {MIN_PASSWORD_LENGTH} ký tự.</p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Xác nhận mật khẩu mới <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={submitting}
                      className="w-full pl-3 pr-10 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50"
                      placeholder="Nhập lại mật khẩu mới"
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <Button variant="outline" onClick={closePasswordModal} disabled={submitting} className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50">Hủy</Button>
              <Button onClick={() => void handlePasswordSubmit()} disabled={submitting} className="bg-[#007bff] hover:bg-[#0056b3] text-white">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang cập nhật...
                  </>
                ) : (
                  "Cập nhật mật khẩu"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
