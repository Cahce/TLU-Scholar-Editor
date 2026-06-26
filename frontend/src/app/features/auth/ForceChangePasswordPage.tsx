import { useState } from "react";
import { AlertCircle, KeyRound, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { BrandLogo } from "../../components/BrandLogo";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { changePassword, logout } from "../../api/auth";
import { ApiError } from "../../api/client";
import { useAuthStore } from "../../stores/authStore";
import { dashboardPathForRole } from "../../auth/redirect";
import { VMSG } from "../../lib/validation";

/**
 * Forced password change. The route guard sends users here while
 * `user.mustChangePassword` is true and blocks every other authenticated route
 * until the password is changed. On success the backend clears the flag; we
 * mirror that in the store and send the user to their dashboard.
 */
export function ForceChangePasswordPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!oldPassword || !newPassword || !confirmNewPassword) {
      setError(VMSG.allFieldsRequired);
      return;
    }
    if (newPassword.length < 6) {
      setError(VMSG.minLength("Mật khẩu mới", 6));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError(VMSG.passwordMismatch);
      return;
    }
    if (newPassword === oldPassword) {
      setError(VMSG.passwordSameAsOld);
      return;
    }

    setLoading(true);
    try {
      await changePassword({ oldPassword, newPassword, confirmNewPassword });

      // Mirror the backend clearing `mustChangePassword`.
      const current = useAuthStore.getState().user;
      if (current) {
        setUser({ ...current, mustChangePassword: false });
        navigate(dashboardPathForRole(current.role), { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Không thể đổi mật khẩu. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8fafc]">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2 justify-center">
          <BrandLogo size={36} />
          <span className="text-lg font-semibold text-slate-900">
            TLU Scholar Editor
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <div className="mb-6">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6 text-[#007bff]" />
            </div>
            <h1 className="text-2xl text-slate-900 mb-2">Đổi mật khẩu</h1>
            <p className="text-sm text-slate-600">
              Bạn cần đổi mật khẩu trước khi tiếp tục sử dụng hệ thống
              {user?.email ? ` (${user.email})` : ""}.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="oldPassword" className="text-slate-700">
                Mật khẩu hiện tại
              </Label>
              <Input
                id="oldPassword"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                disabled={loading}
                className="h-11"
                autoComplete="current-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-slate-700">
                Mật khẩu mới
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                className="h-11"
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword" className="text-slate-700">
                Xác nhận mật khẩu mới
              </Label>
              <Input
                id="confirmNewPassword"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                disabled={loading}
                className="h-11"
                autoComplete="new-password"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#007bff] hover:bg-[#0056b3] text-white"
            >
              <KeyRound className="w-4 h-4 mr-2" />
              {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-200 text-center">
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={loading}
              className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-60"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
