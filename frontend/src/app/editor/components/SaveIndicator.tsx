import { useEditorStore } from "../state/editorStore";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Loader2, Check, AlertCircle, Clock } from "lucide-react";

interface SaveIndicatorProps {
  path: string;
}

export function SaveIndicator({ path }: SaveIndicatorProps): JSX.Element {
  const draft = useEditorStore((s) => s.drafts[path]);

  if (!draft) return <></>;

  const { dirty, saving, lastSavedAt, saveError } = draft;

  if (saveError) {
    return (
      <div className="absolute right-3 top-3 z-10">
        <div className="flex items-center gap-1.5 rounded bg-red-50 px-2 py-1 text-xs text-red-700 shadow-sm border border-red-100">
          <AlertCircle className="h-3 w-3" />
          <span>Lưu thất bại</span>
        </div>
      </div>
    );
  }

  if (saving) {
    return (
      <div className="absolute right-3 top-3 z-10">
        <div className="flex items-center gap-1.5 rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 shadow-sm border border-blue-100">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Đang lưu...</span>
        </div>
      </div>
    );
  }

  if (dirty) {
    return (
      <div className="absolute right-3 top-3 z-10">
        <div className="flex items-center gap-1.5 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700 shadow-sm border border-amber-100">
          <Clock className="h-3 w-3" />
          <span>Chưa lưu</span>
        </div>
      </div>
    );
  }

  if (lastSavedAt) {
    const timeAgo = formatDistanceToNow(new Date(lastSavedAt), {
      addSuffix: true,
      locale: vi,
    });

    return (
      <div className="absolute right-3 top-3 z-10">
        <div className="flex items-center gap-1.5 rounded bg-green-50 px-2 py-1 text-xs text-green-700 shadow-sm border border-green-100">
          <Check className="h-3 w-3" />
          <span>Đã lưu {timeAgo}</span>
        </div>
      </div>
    );
  }

  return <></>;
}
