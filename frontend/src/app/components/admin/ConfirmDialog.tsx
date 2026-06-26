import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";
import { ModalShell } from "./ModalShell";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Xóa",
  cancelLabel = "Hủy",
  tone = "danger",
  loading,
}: ConfirmDialogProps) {
  return (
    <ModalShell isOpen={isOpen} onClose={onClose} size="sm" dismissable={!loading}>
      <div className="p-6 flex items-start gap-4">
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
            tone === "danger"
              ? "bg-rose-100 text-rose-600"
              : "bg-amber-100 text-amber-600",
          )}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <div className="text-sm text-slate-500 mt-1">{description}</div>
        </div>
      </div>
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={loading}
          className="bg-white border-slate-200 text-slate-700 hover:bg-slate-100 min-w-[100px]"
        >
          {cancelLabel}
        </Button>
        <Button
          type="button"
          onClick={() => void onConfirm()}
          disabled={loading}
          className={cn(
            "text-white border-transparent min-w-[120px]",
            tone === "danger"
              ? "bg-rose-600 hover:bg-rose-700"
              : "bg-[#007bff] hover:bg-[#0056b3]",
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Đang xử lý...
            </>
          ) : (
            confirmLabel
          )}
        </Button>
      </div>
    </ModalShell>
  );
}
