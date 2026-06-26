/**
 * OpenAlexPanel Component
 * 
 * Main panel for OpenAlex integration.
 */

import { useState } from "react";
import { useOpenAlexSearch } from "../../../hooks/useOpenAlexSearch";
import { OpenAlexSearchBar } from "./OpenAlexSearchBar";
import { OpenAlexFilters } from "./OpenAlexFilters";
import { OpenAlexResultList } from "./OpenAlexResultList";
import * as openalexApi from "../../../api/openalex";
import { toast } from "sonner";
import { useBibTargetPath } from "../../hooks/useBibTargetPath";
import { detectBibFormat, formatLabel, isBibPath } from "../../lib/bibFormat";
import { useEditorStore } from "../../state/editorStore";
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

interface OpenAlexPanelProps {
  projectId: string;
}

export function OpenAlexPanel({ projectId }: OpenAlexPanelProps) {
  const { works, meta, loading, error, query, setQuery } = useOpenAlexSearch();
  const { suggestedPath } = useBibTargetPath();
  
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [workToSave, setWorkToSave] = useState<string | null>(null);
  const [targetPath, setTargetPath] = useState(suggestedPath);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (workId: string) => {
    setWorkToSave(workId);
    setSaveDialogOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!workToSave || !isBibPath(targetPath)) {
      toast.error("Đường dẫn phải kết thúc bằng .bib, .yml, hoặc .yaml");
      return;
    }

    setIsSaving(true);
    try {
      const result = await openalexApi.importToProject(projectId, {
        openAlexIds: [workToSave],
        targetBibPath: targetPath,
      });

      if (result.imported.length > 0) {
        toast.success(`Đã lưu vào ${targetPath}`);
        // Backend mutated the .bib on disk — refresh our store so the open
        // CodeMirror tab updates immediately and the next preview compile
        // sees the new entry. Without this the user sees stale content
        // until they switch tabs and the bibliography is missing from the
        // PDF preview until then.
        await useEditorStore
          .getState()
          .reloadFileFromServer(targetPath)
          .catch((err) =>
            console.warn("[OpenAlexPanel] post-save reload failed:", err),
          );
      } else if (result.skippedDuplicate.length > 0) {
        toast.info("Tài liệu đã tồn tại trong file .bib");
      } else if (result.failed.length > 0) {
        toast.error(result.failed[0].errorMessage);
      }

      setSaveDialogOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể lưu";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePageChange = (page: number) => {
    setQuery({ ...query, page });
  };

  return (
    <>
      <div className="flex-1 min-h-0 flex flex-col">
        <OpenAlexSearchBar
          value={query.search}
          onChange={(search) => setQuery({ ...query, search, page: 1 })}
        />

        <OpenAlexFilters query={query} onChange={setQuery} />

        {loading && (
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-sm text-slate-500">Đang tìm kiếm...</p>
          </div>
        )}

        {error && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-2">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && query.search.trim() === "" && (
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-sm text-slate-500">
              Nhập từ khóa để tìm kiếm tài liệu học thuật
            </p>
          </div>
        )}

        {!loading && !error && query.search.trim() !== "" && (
          <OpenAlexResultList
            works={works}
            meta={meta}
            onPageChange={handlePageChange}
            onSave={handleSave}
          />
        )}
      </div>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lưu vào thư mục tham khảo</DialogTitle>
            <DialogDescription>
              Chọn file .bib hoặc .yml để lưu tài liệu
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleConfirmSave} disabled={isSaving}>
              {isSaving ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
