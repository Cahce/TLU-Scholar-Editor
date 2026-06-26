import { useEffect, useState } from "react";
import { AlertCircle, Loader2, X } from "lucide-react";
import { Button } from "./ui/button";
import { DateInput, NativeSelect, TextInput } from "./admin/FormControls";
import { GENDER_OPTIONS } from "../lib/gender";
import { getApiErrorMessage } from "../lib/apiError";
import type { Gender, UpdateMyProfileRequest } from "../types/api";

export interface PersonalInfoInitial {
  gender: Gender | null;
  /** ISO date string (or null); only the yyyy-mm-dd part is used. */
  dateOfBirth: string | null;
  phone: string | null;
  address: string | null;
}

interface EditPersonalInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initial: PersonalInfoInitial;
  /** Persist the change. Should throw on failure so the modal shows the error. */
  onSave: (data: UpdateMyProfileRequest) => Promise<void>;
}

/**
 * Shared modal for a student/teacher to edit their own personal info
 * (gender / date of birth / phone / address). Used by both profile pages.
 * Identity and academic fields stay admin-managed and are not shown here.
 */
export function EditPersonalInfoModal({
  isOpen,
  onClose,
  initial,
  onSave,
}: EditPersonalInfoModalProps) {
  const [gender, setGender] = useState<"" | Gender>("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Re-seed the form from the latest profile values each time it opens.
  useEffect(() => {
    if (!isOpen) return;
    setGender(initial.gender ?? "");
    setDateOfBirth(initial.dateOfBirth ? initial.dateOfBirth.slice(0, 10) : "");
    setPhone(initial.phone ?? "");
    setAddress(initial.address ?? "");
    setError("");
  }, [isOpen, initial.gender, initial.dateOfBirth, initial.phone, initial.address]);

  if (!isOpen) return null;

  const close = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await onSave({
        gender: gender || null,
        dateOfBirth: dateOfBirth || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Không thể cập nhật hồ sơ. Vui lòng thử lại."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={close}
      />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">
            Chỉnh sửa thông tin cá nhân
          </h3>
          <button
            onClick={close}
            disabled={submitting}
            className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <p className="text-sm text-slate-500 mb-5">
            Bạn có thể cập nhật giới tính, ngày sinh, số điện thoại và địa chỉ.
            Mã số, họ tên và thông tin học tập do quản trị viên quản lý.
          </p>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="pi-gender"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Giới tính
              </label>
              <NativeSelect
                id="pi-gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as "" | Gender)}
                disabled={submitting}
              >
                <option value="">-- Chọn giới tính --</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div>
              <label
                htmlFor="pi-dob"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Ngày sinh
              </label>
              <DateInput
                id="pi-dob"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="pi-phone"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Số điện thoại
              </label>
              <TextInput
                id="pi-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="VD: 0987654321"
                disabled={submitting}
              />
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="pi-address"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Địa chỉ
              </label>
              <TextInput
                id="pi-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="VD: Số 1 Đại Cồ Việt, Hà Nội"
                disabled={submitting}
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={close}
            disabled={submitting}
            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Hủy
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="bg-[#007bff] hover:bg-[#0056b3] text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang lưu...
              </>
            ) : (
              "Lưu thay đổi"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
