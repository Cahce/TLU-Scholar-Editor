import { useMemo, useState } from "react";
import {
  Users,
  GraduationCap,
  UserCog,
  UserX,
  Plus,
  Search,
  Edit2,
  Lock,
  Key,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Upload,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { AdminAccountModal, type AccountSubmitPayload } from "./AdminAccountModal";
import { AdminPasswordResetModal } from "./AdminPasswordResetModal";
import { useAccounts } from "../../../hooks/admin/useAccounts";
import { useAdminStats } from "../../../hooks/useAdminStats";
import {
  listAccounts,
  createAccount,
  updateAccount,
  resetAccountPassword,
  importAccounts,
  downloadAccountsTemplate,
} from "../../../api/admin/accounts";
import { createTeacher, linkTeacherAccount } from "../../../api/admin/teachers";
import { createStudent, linkStudentAccount } from "../../../api/admin/students";
import { ImportDialog } from "../../../components/admin/ImportDialog";
import { SearchableSelect } from "../../../components/admin/SearchableSelect";
import { adminToast } from "../_shared/toast";
import { ROLE_BADGE_CLASSES } from "../../../lib/roleBadge";
import type { Account, ListAccountsQuery, UserRole } from "../../../types/admin";

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Quản trị",
  teacher: "Giảng viên",
  student: "Sinh viên",
};

// Canonical role colors shared with the header chip (admin = slate, teacher =
// blue, student = purple) so a color always maps to the same role app-wide.
const ROLE_COLORS = ROLE_BADGE_CLASSES;

const ACTIVE_BADGE = "bg-emerald-50 text-emerald-700 border-emerald-200";
const INACTIVE_BADGE = "bg-rose-50 text-rose-700 border-rose-200";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function AdminAccounts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | UserRole>("");
  const [statusFilter, setStatusFilter] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const query = useMemo<ListAccountsQuery>(
    () => ({
      search: searchQuery.trim() || undefined,
      role: roleFilter || undefined,
      isActive: statusFilter || undefined,
      page,
      pageSize,
    }),
    [searchQuery, roleFilter, statusFilter, page]
  );

  const { data, loading, error, refetch } = useAccounts(query);

  const accounts = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedPasswordAccount, setSelectedPasswordAccount] = useState<Account | null>(null);
  const [pwdModalError, setPwdModalError] = useState<string | null>(null);

  const [isImportOpen, setIsImportOpen] = useState(false);

  const handleOpenAdd = () => {
    setModalMode("add");
    setSelectedAccount(null);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (account: Account) => {
    setModalMode("edit");
    setSelectedAccount(account);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (payload: AccountSubmitPayload) => {
    setModalError(null);
    try {
      if (modalMode === "add") {
        if (!payload.password) {
          setModalError("Thiếu mật khẩu");
          return;
        }
        if (payload.createProfile) {
          // Create teacher/student WITH a new account inline — one atomic call.
          if (payload.createProfile.type === "teacher") {
            await createTeacher({
              teacherCode: payload.createProfile.teacherCode,
              fullName: payload.createProfile.fullName,
              departmentId: payload.createProfile.departmentId,
              academicRank: payload.createProfile.academicRank,
              academicDegree: payload.createProfile.academicDegree,
              phone: payload.createProfile.phone,
              account: {
                mode: "create",
                email: payload.email,
                password: payload.password,
              },
            });
            adminToast.createdWithAccount("giảng viên", payload.createProfile.fullName);
          } else {
            await createStudent({
              studentCode: payload.createProfile.studentCode,
              fullName: payload.createProfile.fullName,
              classId: payload.createProfile.classId,
              phone: payload.createProfile.phone,
              account: {
                mode: "create",
                email: payload.email,
                password: payload.password,
              },
            });
            adminToast.createdWithAccount("sinh viên", payload.createProfile.fullName);
          }
        } else {
          await createAccount({
            email: payload.email,
            password: payload.password,
            role: payload.role,
            ...(payload.linkTo ? { linkTo: payload.linkTo } : {}),
          });
          if (payload.linkTo) {
            adminToast.created("tài khoản", payload.email);
            adminToast.linkedAccount(
              payload.linkTo.type === "teacher" ? "giảng viên" : "sinh viên",
            );
          } else {
            adminToast.created("tài khoản", payload.email);
          }
        }
      } else if (selectedAccount) {
        await updateAccount(selectedAccount.id, {
          email: payload.email !== selectedAccount.email ? payload.email : undefined,
          role: payload.role !== selectedAccount.role ? payload.role : undefined,
          isActive:
            payload.isActive !== undefined && payload.isActive !== selectedAccount.isActive
              ? payload.isActive
              : undefined,
        });
        // After update, optionally link to an existing profile or create a new one.
        if (payload.linkTo) {
          if (payload.linkTo.type === "teacher") {
            await linkTeacherAccount(payload.linkTo.id, { accountId: selectedAccount.id });
          } else {
            await linkStudentAccount(payload.linkTo.id, { accountId: selectedAccount.id });
          }
          adminToast.updated("tài khoản", payload.email);
          adminToast.linkedAccount(
            payload.linkTo.type === "teacher" ? "giảng viên" : "sinh viên",
          );
        } else if (payload.createProfile) {
          if (payload.createProfile.type === "teacher") {
            await createTeacher({
              teacherCode: payload.createProfile.teacherCode,
              fullName: payload.createProfile.fullName,
              departmentId: payload.createProfile.departmentId,
              academicRank: payload.createProfile.academicRank,
              academicDegree: payload.createProfile.academicDegree,
              phone: payload.createProfile.phone,
              account: { mode: "link", accountId: selectedAccount.id },
            });
            adminToast.updated("tài khoản", payload.email);
            adminToast.created("giảng viên", payload.createProfile.fullName);
          } else {
            await createStudent({
              studentCode: payload.createProfile.studentCode,
              fullName: payload.createProfile.fullName,
              classId: payload.createProfile.classId,
              phone: payload.createProfile.phone,
              account: { mode: "link", accountId: selectedAccount.id },
            });
            adminToast.updated("tài khoản", payload.email);
            adminToast.created("sinh viên", payload.createProfile.fullName);
          }
        } else {
          adminToast.updated("tài khoản", payload.email);
        }
      }
      setIsModalOpen(false);
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Có lỗi xảy ra";
      setModalError(message);
      adminToast.error(modalMode === "add" ? "Thêm tài khoản" : "Cập nhật tài khoản", err);
    }
  };

  const handleToggleLock = async (account: Account) => {
    try {
      await updateAccount(account.id, { isActive: !account.isActive });
      if (account.isActive) {
        adminToast.success(`Đã khóa tài khoản "${account.email}"`);
      } else {
        adminToast.success(`Đã mở khóa tài khoản "${account.email}"`);
      }
      await refetch();
    } catch (err) {
      adminToast.error("Đổi trạng thái tài khoản", err);
    }
  };

  const handleOpenPasswordReset = (account: Account) => {
    setSelectedPasswordAccount(account);
    setPwdModalError(null);
    setIsPasswordModalOpen(true);
  };

  const handleResetPassword = async (id: string, newPassword: string) => {
    setPwdModalError(null);
    try {
      await resetAccountPassword(id, { newPassword });
      adminToast.success("Đặt lại mật khẩu thành công");
      setIsPasswordModalOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể đặt lại mật khẩu";
      setPwdModalError(message);
      adminToast.error("Đặt lại mật khẩu", err);
    }
  };

  // Whole-dataset counts (all records, not just the current page).
  const stats = useAdminStats(
    listAccounts,
    {
      total: {},
      teachers: { role: "teacher" },
      students: { role: "student" },
      locked: { isActive: "false" },
    },
    [data],
  );
  const totalAccounts = stats.total ?? 0;
  const teacherCount = stats.teachers ?? 0;
  const studentCount = stats.students ?? 0;
  const lockedCount = stats.locked ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quản lý tài khoản</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Quản lý tài khoản người dùng trong hệ thống
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
        <StatCard
          icon={<Users className="w-6 h-6" />}
          label="Tổng tài khoản"
          value={totalAccounts}
          tone="slate"
        />
        <StatCard
          icon={<UserCog className="w-6 h-6" />}
          label="Giảng viên"
          value={teacherCount}
          tone="blue"
        />
        <StatCard
          icon={<GraduationCap className="w-6 h-6" />}
          label="Sinh viên"
          value={studentCount}
          tone="purple"
        />
        <StatCard
          icon={<UserX className="w-6 h-6" />}
          label="Tài khoản đang khóa"
          value={lockedCount}
          tone="rose"
        />
      </div>

      {/* Account list */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col gap-4 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
            <div className="relative w-full sm:max-w-md shrink-0 flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Tìm kiếm theo email..."
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
              <Button
                onClick={handleOpenAdd}
                className="bg-[#007bff] hover:bg-[#0056b3] text-white shadow-sm h-10 flex-1 sm:flex-none"
              >
                <Plus className="w-4 h-4 mr-2" />
                Thêm mới
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full">
            <div className="min-w-[160px]">
              <SearchableSelect
                value={roleFilter}
                onChange={(v) => {
                  setRoleFilter((v as "" | UserRole) || "");
                  setPage(1);
                }}
                options={[
                  { value: "", label: "Vai trò: Tất cả" },
                  { value: "admin", label: "Quản trị" },
                  { value: "teacher", label: "Giảng viên" },
                  { value: "student", label: "Sinh viên" },
                ]}
                getOptionValue={(o) => o.value}
                getOptionLabel={(o) => o.label}
                placeholder="Vai trò: Tất cả"
                searchPlaceholder="Gõ vai trò..."
              />
            </div>

            <div className="min-w-[160px]">
              <SearchableSelect
                value={statusFilter}
                onChange={(v) => {
                  setStatusFilter(v as "" | "true" | "false");
                  setPage(1);
                }}
                options={[
                  { value: "", label: "Trạng thái: Tất cả" },
                  { value: "true", label: "Hoạt động" },
                  { value: "false", label: "Tạm khóa" },
                ]}
                getOptionValue={(o) => o.value}
                getOptionLabel={(o) => o.label}
                placeholder="Trạng thái: Tất cả"
                searchPlaceholder="Gõ trạng thái..."
              />
            </div>
          </div>
        </div>

        {/* Body states */}
        <div className="overflow-x-auto min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Đang tải...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-rose-600 gap-2">
              <AlertCircle className="w-6 h-6" />
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={refetch}>
                Thử lại
              </Button>
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              Không có tài khoản nào.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-white text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Vai trò</th>
                  <th className="px-6 py-4">Liên kết</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4">Ngày tạo</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.map((account) => (
                  <tr
                    key={account.id}
                    className="hover:bg-blue-50/30 transition-colors group bg-white"
                  >
                    <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap font-medium">
                      {account.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${ROLE_COLORS[account.role]}`}
                      >
                        {ROLE_LABEL[account.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {account.link ? (
                        <span>
                          {account.link.fullName}{" "}
                          <span className="text-slate-400">({account.link.code})</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">Chưa liên kết</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${account.isActive ? ACTIVE_BADGE : INACTIVE_BADGE}`}
                      >
                        {account.isActive ? "Hoạt động" : "Tạm khóa"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                      {formatDate(account.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(account)}
                          className="w-8 h-8 rounded text-slate-400 hover:text-[#007bff] hover:bg-blue-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#007bff]/20"
                          title="Chỉnh sửa tài khoản"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleLock(account)}
                          className={`w-8 h-8 rounded text-slate-400 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 ${account.isActive ? "hover:text-rose-600 hover:bg-rose-50 focus:ring-rose-500/20" : "hover:text-emerald-600 hover:bg-emerald-50 focus:ring-emerald-500/20"}`}
                          title={account.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                        >
                          {account.isActive ? (
                            <Lock className="w-4 h-4" />
                          ) : (
                            <Unlock className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleOpenPasswordReset(account)}
                          className="w-8 h-8 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                          title="Đặt lại mật khẩu"
                        >
                          <Key className="w-4 h-4" />
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
            Tổng <span className="font-medium text-slate-900">{total}</span> tài khoản • Trang{" "}
            <span className="font-medium text-slate-900">{page}</span>/
            <span className="font-medium text-slate-900">{totalPages}</span>
          </p>
          <div className="flex items-center gap-1 w-full sm:w-auto justify-center sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 text-slate-600 border-slate-200"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 text-slate-600 border-slate-200"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Sau
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      <AdminAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        initialData={selectedAccount}
        onSubmit={handleSubmit}
        submitError={modalError}
      />

      <AdminPasswordResetModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        accountId={selectedPasswordAccount?.id ?? null}
        accountName={selectedPasswordAccount?.email ?? null}
        onSave={handleResetPassword}
        submitError={pwdModalError}
      />

      <ImportDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={() => refetch()}
        title="Nhập tài khoản từ file"
        resourceLabel="tài khoản"
        importFn={importAccounts}
        downloadTemplateFn={downloadAccountsTemplate}
        templateFilename="tai_khoan_mau.xlsx"
      />
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "slate" | "blue" | "purple" | "rose";
}

function StatCard({ icon, label, value, tone }: StatCardProps) {
  const toneClasses: Record<string, string> = {
    slate: "bg-slate-50 border-slate-200 text-slate-600",
    blue: "bg-blue-50 border-blue-100 text-[#007bff]",
    purple: "bg-purple-50 border-purple-100 text-purple-600",
    rose: "bg-rose-50 border-rose-100 text-rose-600",
  };
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
      <div
        className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 border ${toneClasses[tone]}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <h4 className="text-2xl font-bold text-slate-900 mt-1">{value.toLocaleString("vi-VN")}</h4>
      </div>
    </div>
  );
}
