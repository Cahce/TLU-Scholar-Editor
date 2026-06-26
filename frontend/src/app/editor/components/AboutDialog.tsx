import { BrandLogo } from "../../components/BrandLogo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Kept in sync by hand. App version mirrors package.json; the Typst engine
// version is the one bundled by typst.ts (see the help "Cú pháp Typst" topic).
const APP_VERSION = "0.0.1";
const TYPST_ENGINE = "Typst v0.14.2 (typst.ts 0.7.0)";

function InfoRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}

/** "Giới thiệu" dialog — opened from Trợ giúp → Giới thiệu. */
export function AboutDialog({ open, onOpenChange }: AboutDialogProps): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrandLogo size={32} rounded="rounded-md" />
            TLU Scholar Editor
          </DialogTitle>
          <DialogDescription>
            Trình soạn thảo và quản lý tài liệu học thuật Typst của Trường Đại học
            Thuỷ Lợi.
          </DialogDescription>
        </DialogHeader>

        <dl className="space-y-2 rounded-md border border-slate-200 bg-white p-3 shadow-sm">
          <InfoRow label="Phiên bản ứng dụng" value={APP_VERSION} />
          <InfoRow label="Bộ máy biên dịch" value={TYPST_ENGINE} />
        </dl>

        <p className="text-xs text-slate-500">
          Cần trợ giúp? Mở{" "}
          <a
            href="/huong-dan"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#007bff] hover:underline"
          >
            Trung tâm trợ giúp
          </a>
          .
        </p>
      </DialogContent>
    </Dialog>
  );
}
