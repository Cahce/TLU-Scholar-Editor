import { PackageCheck } from "lucide-react";
import { cn } from "../../../components/ui/utils";
import { TYPST_COMPAT_LABEL } from "../typstVersion";

interface VersionBadgeProps {
  className?: string;
}

/** Badge hiển thị phiên bản Typst tương thích (đọc từ hằng số duy nhất). */
export function VersionBadge({ className }: VersionBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700",
        className,
      )}
      title="Phiên bản Typst mà trình soạn thảo đang sử dụng"
    >
      <PackageCheck className="w-3.5 h-3.5" />
      {TYPST_COMPAT_LABEL}
    </span>
  );
}
