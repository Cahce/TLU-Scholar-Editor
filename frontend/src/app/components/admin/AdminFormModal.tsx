import { useId } from "react";
import { AlertCircle, Loader2, Save, X } from "lucide-react";
import { Button } from "../ui/button";
import { ModalShell, type ModalSize } from "./ModalShell";

export interface AdminFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: ModalSize;
  /**
   * Called when the user clicks Submit. Form-submit semantics (`<form onSubmit>`)
   * are wired internally so the standard "Enter to submit" UX works.
   */
  onSubmit: () => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
  submitDisabled?: boolean;
  submitError?: string | null;
  /** Hides the Save icon (useful for destructive variants) */
  hideSaveIcon?: boolean;
  children: React.ReactNode;
}

export function AdminFormModal({
  isOpen,
  onClose,
  title,
  description,
  size = "md",
  onSubmit,
  submitting,
  submitLabel = "Lưu thay đổi",
  submitDisabled,
  submitError,
  hideSaveIcon,
  children,
}: AdminFormModalProps) {
  const titleId = useId();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || submitDisabled) return;
    void onSubmit();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size={size}
      dismissable={!submitting}
      labelledBy={titleId}
    >
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <h2 id={titleId} className="text-xl font-bold text-slate-900 truncate">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-slate-500 mt-0.5">{description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* noValidate: every admin modal validates in JS and renders Vietnamese
          inline errors; this suppresses the browser's native English bubble. */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex-1 flex flex-col min-h-0"
      >
        <div className="flex-1 overflow-y-auto p-6 md:px-8 space-y-6">
          {submitError && (
            <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 text-sm text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}
          {children}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-end gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 min-w-[100px] shadow-sm"
          >
            Hủy
          </Button>
          <Button
            type="submit"
            disabled={submitting || submitDisabled}
            className="bg-[#007bff] hover:bg-[#0056b3] text-white min-w-[140px] shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                {!hideSaveIcon && <Save className="w-4 h-4 mr-2" />}
                {submitLabel}
              </>
            )}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
