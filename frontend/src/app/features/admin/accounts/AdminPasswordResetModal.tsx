import { useState, useEffect } from "react";
import { AdminFormModal } from "../../../components/admin/AdminFormModal";
import { FormField } from "../../../components/admin/FormField";
import { TextInput } from "../../../components/admin/FormControls";
import { VMSG } from "../../../lib/validation";

interface AdminPasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string | null;
  accountName: string | null;
  onSave: (id: string, newPass: string) => Promise<void>;
  submitError?: string | null;
}

export function AdminPasswordResetModal({
  isOpen,
  onClose,
  accountId,
  accountName,
  onSave,
  submitError,
}: AdminPasswordResetModalProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setConfirmPassword("");
      setErrors({});
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    const next: Record<string, string> = {};
    if (!password) next.password = VMSG.required("Mật khẩu mới");
    else if (password.length < 8) next.password = VMSG.passwordMin(8);
    if (!confirmPassword) next.confirmPassword = VMSG.passwordConfirmRequired;
    if (password && confirmPassword && password !== confirmPassword) {
      next.confirmPassword = VMSG.passwordMismatch;
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    if (!accountId) return;
    setErrors({});
    setSubmitting(true);
    try {
      await onSave(accountId, password);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminFormModal
      isOpen={isOpen}
      onClose={onClose}
      title="Đặt lại mật khẩu"
      size="sm"
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel="Lưu"
      submitError={submitError}
    >
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
        Nhập mật khẩu mới cho tài khoản{" "}
        <span className="font-semibold">{accountName}</span>.
      </div>

      <div className="space-y-4">
        <FormField
          label="Mật khẩu mới"
          required
          error={errors.password}
          htmlFor="reset-pwd"
        >
          <TextInput
            id="reset-pwd"
            type="password"
            autoComplete="new-password"
            placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={Boolean(errors.password)}
          />
        </FormField>

        <FormField
          label="Xác nhận mật khẩu mới"
          required
          error={errors.confirmPassword}
          htmlFor="reset-pwd2"
        >
          <TextInput
            id="reset-pwd2"
            type="password"
            autoComplete="new-password"
            placeholder="Nhập lại mật khẩu mới"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            invalid={Boolean(errors.confirmPassword)}
          />
        </FormField>
      </div>
    </AdminFormModal>
  );
}
