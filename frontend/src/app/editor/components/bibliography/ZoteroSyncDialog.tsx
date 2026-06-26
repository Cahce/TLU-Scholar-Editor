/**
 * ZoteroSyncDialog Component
 * 
 * Dialog for syncing Zotero items to .bib file.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { toast } from "sonner";
import { useBibTargetPath } from "../../hooks/useBibTargetPath";
import { detectBibFormat, formatLabel, isBibPath } from "../../lib/bibFormat";
import type { ZoteroSyncBody } from "../../../types/bibliography";

interface ZoteroSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemKeys: string[];
  onSync: (body: ZoteroSyncBody) => Promise<void>;
}

export function ZoteroSyncDialog({
  open,
  onOpenChange,
  itemKeys,
  onSync,
}: ZoteroSyncDialogProps) {
  const { suggestedPath } = useBibTargetPath();
  const [targetPath, setTargetPath] = useState(suggestedPath);
  const [syncType, setSyncType] = useState<"full" | "incremental">("full");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!isBibPath(targetPath)) {
      toast.error("Đường dẫn phải kết thúc bằng .bib, .yml, hoặc .yaml");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSync({
        itemKeys,
        targetBibPath: targetPath,
        syncType,
      });
      toast.success(`Đã đồng bộ ${itemKeys.length} tài liệu`);
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể đồng bộ";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đồng bộ vào thư mục tham khảo</DialogTitle>
          <DialogDescription>
            Đồng bộ {itemKeys.length} tài liệu đã chọn vào file bibliography
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="targetPath">Đường dẫn file thư mục tham khảo</Label>
            <input
              id="targetPath"
              type="text"
              value={targetPath}
              onChange={(e) => setTargetPath(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#007bff]"
              placeholder="bibliography.bib"
            />
            {targetPath && (
              <p className="text-xs text-slate-500">
                {isBibPath(targetPath)
                  ? `Định dạng: ${formatLabel(detectBibFormat(targetPath)!)}`
                  : "Hỗ trợ .bib (BibTeX) hoặc .yml/.yaml (Hayagriva)"}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Loại đồng bộ</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="full"
                  checked={syncType === "full"}
                  onChange={(e) => setSyncType(e.target.value as "full")}
                  className="w-4 h-4 text-[#007bff] focus:ring-[#007bff]"
                />
                <span className="text-sm text-slate-700">Toàn bộ</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="incremental"
                  checked={syncType === "incremental"}
                  onChange={(e) => setSyncType(e.target.value as "incremental")}
                  className="w-4 h-4 text-[#007bff] focus:ring-[#007bff]"
                />
                <span className="text-sm text-slate-700">Tăng dần</span>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Đang đồng bộ..." : "Đồng bộ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
