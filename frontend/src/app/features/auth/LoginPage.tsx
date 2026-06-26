import { useState } from "react";
import { FileText, Users, GitBranch, AlertCircle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { BrandLogo } from "../../components/BrandLogo";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";
import { useNavigate, useSearchParams } from "react-router";
import { login } from "../../api/auth";
import { ApiError } from "../../api/client";
import { dashboardPathForRole, safeRedirectParam } from "../../auth/redirect";
import { VMSG, validateEmail, validatePassword } from "../../lib/validation";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setErrors({ email: "", password: "" });
    setServerError("");

    // Client-side validation (centralized Vietnamese messages). The form sets
    // `noValidate`, so these run instead of the browser's native English bubble.
    const emailCheck = validateEmail(email);
    const passwordCheck = validatePassword(password, 6);
    const newErrors = {
      email: emailCheck.ok ? "" : emailCheck.message,
      password: passwordCheck.ok ? "" : passwordCheck.message,
    };

    if (newErrors.email || newErrors.password) {
      setErrors(newErrors);
      return;
    }

    // Call backend login API
    setLoading(true);
    try {
      const response = await login({ email, password });

      // Force password change before anything else.
      if (response.user.mustChangePassword) {
        navigate("/doi-mat-khau", { replace: true });
        return;
      }

      // Honor a sanitized intended destination, else go to the role dashboard.
      const redirectTo = safeRedirectParam(searchParams.get("redirect"));
      navigate(redirectTo ?? dashboardPathForRole(response.user.role), {
        replace: true,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setServerError(error.message);
      } else {
        setServerError(VMSG.serverUnreachable);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#007bff] to-[#0056b3] p-12 flex-col justify-between">
        <div className="flex-1 flex flex-col justify-center max-w-lg">
          {/* Logo trường */}
          <div className="mb-8">
            <BrandLogo size={64} tone="onColor" />
          </div>

          {/* Product name and description */}
          <h1 className="text-4xl text-white mb-4">
            TLU Scholar Editor
          </h1>
          <p className="text-lg text-white/90 mb-12">
            Hệ thống biên tập và quản lý tài liệu khoa học nội bộ
          </p>

          {/* Feature list */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white mb-1">
                  Soạn thảo tài liệu bằng Typst
                </h3>
                <p className="text-white/80 text-sm">
                  Trình soạn thảo hiện đại với cú pháp đơn giản và hiệu suất cao
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                <GitBranch className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white mb-1">
                  Quản lý tài liệu tập trung
                </h3>
                <p className="text-white/80 text-sm">
                  Lưu trữ và tổ chức tài liệu khoa học một cách có hệ thống
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white mb-1">
                  Hỗ trợ cộng tác học thuật
                </h3>
                <p className="text-white/80 text-sm">
                  Làm việc nhóm hiệu quả với các công cụ cộng tác thời gian thực
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-white/70 text-sm">
          © 2026 Trường Đại học Thủy Lợi. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <BrandLogo size={64} className="mx-auto mb-4" />
            <h1 className="text-2xl text-gray-900 mb-2">
              TLU Scholar Editor
            </h1>
            <p className="text-sm text-gray-600">
              Hệ thống biên tập và quản lý tài liệu khoa học nội bộ
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-2xl text-gray-900 mb-2">
                Đăng nhập hệ thống
              </h2>
              <p className="text-sm text-gray-600">
                Sử dụng tài khoản trường để truy cập nền tảng
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Server Error */}
              {serverError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <span className="text-sm text-red-700">{serverError}</span>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@tlu.edu.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  aria-invalid={!!errors.email}
                  className="h-11"
                />
                {errors.email && (
                  <div className="flex items-center gap-1.5 text-destructive text-sm mt-1.5">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.email}</span>
                  </div>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700">
                  Mật khẩu
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Nhập mật khẩu của bạn"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  aria-invalid={!!errors.password}
                  className="h-11"
                />
                {errors.password && (
                  <div className="flex items-center gap-1.5 text-destructive text-sm mt-1.5">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.password}</span>
                  </div>
                )}
              </div>

              {/* Remember me and Forgot password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    disabled={loading}
                  />
                  <Label 
                    htmlFor="remember" 
                    className="text-sm text-gray-700 cursor-pointer font-normal"
                  >
                    Ghi nhớ đăng nhập
                  </Label>
                </div>
                <a 
                  href="#forgot-password" 
                  className="text-sm text-[#007bff] hover:text-[#0056b3] transition-colors"
                >
                  Quên mật khẩu?
                </a>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-11 bg-[#007bff] hover:bg-[#0056b3] text-white"
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </Button>
            </form>

            {/* Support text */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-center text-sm text-gray-600">
                Gặp vấn đề khi đăng nhập?{" "}
                <a 
                  href="#support" 
                  className="text-[#007bff] hover:text-[#0056b3] transition-colors"
                >
                  Liên hệ hỗ trợ
                </a>
              </p>
            </div>
          </div>

          {/* Footer for mobile */}
          <div className="lg:hidden mt-8 text-center text-sm text-gray-500">
            © 2026 Trường Đại học Thủy Lợi
          </div>
        </div>
      </div>
    </div>
  );
}
