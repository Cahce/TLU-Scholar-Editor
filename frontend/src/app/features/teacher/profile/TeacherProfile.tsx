import {
  AlertCircle,
  BookOpen,
  Briefcase,
  Calendar,
  Info,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Shield,
  User,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { RecentProjectsCard } from "../../../components/RecentProjectsCard";
import { EditPersonalInfoModal } from "../../../components/EditPersonalInfoModal";
import { useTeacherProfile } from "../../../hooks/useTeacherProfile";
import { updateMyProfile } from "../../../api/profile";
import { genderLabel } from "../../../lib/gender";

function formatDate(value: string | null | undefined): string {
  if (!value) return "Chưa cập nhật";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";

  return new Intl.DateTimeFormat("vi-VN").format(date);
}

const NOT_UPDATED = "Chưa cập nhật";

function Field({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-slate-500 mb-1.5">{label}</dt>
      <dd className="text-sm font-medium text-slate-900 flex items-center gap-1.5 min-h-[38px]">
        {icon}
        <span>{value}</span>
      </dd>
    </div>
  );
}

export function TeacherProfile() {
  const { teacher, loading, error, refetch } = useTeacherProfile();
  const [isEditOpen, setIsEditOpen] = useState(false);

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto flex flex-col flex-1 pb-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Hồ sơ cá nhân
          </h1>
          <p className="text-slate-500 mt-1.5 text-[15px]">
            Đang tải thông tin hồ sơ giảng viên
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex items-center gap-3 text-slate-600">
          <Loader2 className="w-5 h-5 animate-spin text-[#007bff]" />
          <span>Đang tải hồ sơ...</span>
        </div>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="w-full max-w-5xl mx-auto flex flex-col flex-1 pb-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Hồ sơ cá nhân
          </h1>
          <p className="text-slate-500 mt-1.5 text-[15px]">
            Thông tin tài khoản và hồ sơ giảng viên
          </p>
        </div>

        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h2 className="font-semibold text-slate-900">Không thể tải hồ sơ</h2>
              <p className="text-sm text-slate-600 mt-1">
                {error || "Không tìm thấy hồ sơ giảng viên."}
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

  const phone = teacher.phone ?? NOT_UPDATED;
  const genderText = genderLabel(teacher.gender);
  const dateOfBirth = formatDate(teacher.dateOfBirth);
  const address = teacher.address || NOT_UPDATED;
  const createdAt = formatDate(teacher.createdAt);
  const updatedAt = formatDate(teacher.updatedAt);
  const displayName = teacher.fullName || teacher.email;
  const teacherCode = teacher.teacherCode || NOT_UPDATED;
  const academicRank = teacher.academicRank || NOT_UPDATED;
  const academicDegree = teacher.academicDegree || NOT_UPDATED;
  const facultyName = teacher.department?.faculty.name || NOT_UPDATED;
  const departmentName = teacher.department?.name || NOT_UPDATED;
  const statusLabel = teacher.isActive ? "Đang hoạt động" : "Tạm khóa";
  const statusClass = teacher.isActive
    ? "text-emerald-600"
    : "text-slate-500";

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col flex-1 pb-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Hồ sơ cá nhân
        </h1>
        <p className="text-slate-500 mt-1.5 text-[15px]">
          Thông tin tài khoản và hồ sơ giảng viên
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {!teacher.profileLinked && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold">
                Tài khoản chưa được liên kết với hồ sơ giảng viên
              </p>
              <p className="text-amber-800 mt-0.5">
                Vui lòng liên hệ quản trị viên để cập nhật mã giảng viên, khoa,
                bộ môn và thông tin chuyên môn.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-start justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900">{displayName}</h2>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mt-3">
              <div className="flex items-center gap-2 text-slate-600">
                <Briefcase className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium">MGV: {teacherCode}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium">{teacher.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 rounded uppercase tracking-wider leading-none">
                  Giảng viên
                </span>
                <span
                  className={`px-2.5 py-1 text-[11px] font-semibold border rounded uppercase tracking-wider leading-none ${
                    teacher.isActive
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  {statusLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-4 sm:mt-0 shrink-0">
            {teacher.profileLinked && (
              <Button
                onClick={() => setIsEditOpen(true)}
                className="w-full sm:w-auto bg-[#007bff] hover:bg-[#0056b3] text-white"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Chỉnh sửa hồ sơ
              </Button>
            )}
            <Button
              variant="outline"
              disabled
              className="w-full sm:w-auto border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
            >
              <Lock className="w-4 h-4 mr-2" />
              Đổi mật khẩu
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                <User className="w-5 h-5 text-[#007bff]" />
                <h3 className="font-semibold text-slate-900 text-[15px]">
                  Thông tin cá nhân
                </h3>
              </div>
              <div className="p-6">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                  <Field label="Giới tính" value={genderText} />
                  <Field
                    label="Ngày sinh"
                    value={dateOfBirth}
                    icon={<Calendar className="w-3.5 h-3.5 text-slate-400" />}
                  />
                  <Field
                    label="Số điện thoại"
                    value={phone}
                    icon={<Phone className="w-3.5 h-3.5 text-slate-400" />}
                  />
                  <Field
                    label="Email liên hệ"
                    value={teacher.email}
                    icon={<Mail className="w-3.5 h-3.5 text-slate-400" />}
                  />
                  <Field
                    label="Địa chỉ"
                    value={address}
                    icon={<MapPin className="w-3.5 h-3.5 text-slate-400" />}
                    className="sm:col-span-2"
                  />
                </dl>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                <BookOpen className="w-5 h-5 text-[#007bff]" />
                <h3 className="font-semibold text-slate-900 text-[15px]">
                  Thông tin chuyên môn
                </h3>
              </div>
              <div className="p-6">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                  <Field label="Mã giảng viên" value={teacherCode} />
                  <Field label="Trạng thái công tác" value={statusLabel} />
                  <Field label="Học hàm" value={academicRank} />
                  <Field label="Học vị" value={academicDegree} />
                  <Field label="Khoa / Viện / Trung tâm" value={facultyName} />
                  <Field label="Bộ môn" value={departmentName} />
                </dl>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden opacity-90">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                <Shield className="w-5 h-5 text-slate-400" />
                <h3 className="font-semibold text-slate-700 text-[15px]">
                  Tài khoản hệ thống{" "}
                  <span className="text-xs font-normal text-slate-400 ml-2">
                    (Chỉ đọc)
                  </span>
                </h3>
              </div>
              <div className="p-6">
                <dl className="space-y-5">
                  <Field label="Email đăng nhập" value={teacher.email} />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Vai trò" value="Giảng viên" />
                    <div>
                      <dt className="text-xs font-medium text-slate-500 mb-1.5">
                        Trạng thái tài khoản
                      </dt>
                      <dd
                        className={`text-sm font-medium flex items-center min-h-[38px] ${statusClass}`}
                      >
                        {statusLabel}
                      </dd>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field
                      label="Ngày tạo tài khoản"
                      value={createdAt}
                      icon={<Calendar className="w-3.5 h-3.5 text-slate-400" />}
                    />
                    <Field
                      label="Cập nhật gần nhất"
                      value={updatedAt}
                      icon={<Calendar className="w-3.5 h-3.5 text-slate-400" />}
                    />
                  </div>
                </dl>
              </div>
            </div>

            <RecentProjectsCard viewAllPath="/teacher" />
          </div>
        </div>
      </div>

      <EditPersonalInfoModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        initial={{
          gender: teacher.gender,
          dateOfBirth: teacher.dateOfBirth,
          phone: teacher.phone,
          address: teacher.address,
        }}
        onSave={async (data) => {
          await updateMyProfile(data);
          await refetch();
          toast.success("Cập nhật hồ sơ thành công");
        }}
      />
    </div>
  );
}
