/**
 * CapturePanel
 *
 * "Read a paper on the web → cite into the project". The user pastes a paper
 * URL or DOI/arXiv ID (or arrives via the bookmarklet with ?capture=), previews
 * the resolved metadata, then saves it to the project `.bib` and/or their
 * Zotero library and inserts `#cite(<key>)` at the cursor.
 */

import { useState } from "react";
import { ClipboardPaste, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import * as captureApi from "../../../api/capture";
import { ApiError } from "../../../api/client";
import type { CaptureItem } from "../../../types/bibliography";
import { useBibTargetPath } from "../../hooks/useBibTargetPath";
import { useInsertCitation } from "../../hooks/useInsertCitation";
import { isBibPath } from "../../lib/bibFormat";
import { useEditorStore } from "../../state/editorStore";
import { TargetBibPicker } from "./TargetBibPicker";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";

interface CapturePanelProps {
  projectId: string;
  initialUrl?: string;
}

const ERROR_VN: Record<string, string> = {
  TRANSLATION_UNAVAILABLE:
    "Dịch vụ trích xuất metadata tạm thời không khả dụng. Hãy kiểm tra translation-server.",
  TRANSLATION_NO_RESULT: "Không nhận diện được tài liệu từ liên kết/định danh này.",
  CAPTURE_INVALID_INPUT: "Dữ liệu thu thập không hợp lệ.",
  ZOTERO_WRITE_FORBIDDEN: "API key Zotero của bạn không có quyền ghi (write).",
  ZOTERO_NOT_CONNECTED: "Bạn chưa kết nối Zotero.",
  ZOTERO_SYNC_FAILED: "Không thể lưu vào thư viện Zotero.",
  PROJECT_FORBIDDEN: "Bạn không có quyền truy cập dự án này.",
};

function vnError(err: unknown): string {
  if (err instanceof ApiError) return ERROR_VN[err.code] ?? err.message;
  return err instanceof Error ? err.message : "Đã xảy ra lỗi không mong muốn";
}

function looksLikeUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function authorsLine(item: CaptureItem): string {
  const names = item.creators
    .map((c) => c.name ?? [c.lastName, c.firstName].filter(Boolean).join(", "))
    .filter((n) => n && n.length > 0);
  if (names.length === 0) return "";
  if (names.length <= 3) return names.join("; ");
  return `${names.slice(0, 3).join("; ")} và ${names.length - 3} tác giả khác`;
}

export function CapturePanel({ projectId, initialUrl }: CapturePanelProps) {
  const { suggestedPath } = useBibTargetPath();
  const insertCitation = useInsertCitation();

  const [input, setInput] = useState(initialUrl ?? "");
  const [preview, setPreview] = useState<CaptureItem | null>(null);
  const [phase, setPhase] = useState<"idle" | "resolving" | "saving">("idle");
  const [targetPath, setTargetPath] = useState(suggestedPath);
  const [saveToBib, setSaveToBib] = useState(true);
  const [saveToZotero, setSaveToZotero] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const bookmarklet = `javascript:(function(){window.open('${origin}/workspace/${projectId}?capture='+encodeURIComponent(location.href),'_blank');})();`;

  const buildSource = () => {
    const trimmed = input.trim();
    return looksLikeUrl(trimmed) ? { url: trimmed } : { identifier: trimmed };
  };

  const handlePreview = async () => {
    if (!input.trim()) {
      toast.error("Hãy nhập liên kết bài báo hoặc DOI/arXiv ID");
      return;
    }
    setPhase("resolving");
    setPreview(null);
    try {
      const { items } = await captureApi.resolveReference(buildSource());
      if (items.length === 0) {
        toast.info("Không tìm thấy tài liệu");
      } else {
        setPreview(items[0]);
      }
    } catch (err) {
      toast.error(vnError(err));
    } finally {
      setPhase("idle");
    }
  };

  const handleSave = async () => {
    if (!input.trim()) return;
    if (!saveToBib && !saveToZotero) {
      toast.error("Chọn ít nhất một nơi lưu (.bib hoặc thư viện Zotero)");
      return;
    }
    if (saveToBib && !isBibPath(targetPath)) {
      toast.error("Đường dẫn phải kết thúc bằng .bib, .yml hoặc .yaml");
      return;
    }
    setPhase("saving");
    try {
      const result = await captureApi.captureToProject(projectId, {
        ...buildSource(),
        targetBibPath: targetPath,
        saveToBib,
        saveToZotero,
      });

      // Refresh the .bib in the store so an open tab + the next preview compile
      // pick up the new entry immediately (no F5).
      if (result.bibSaved) {
        await useEditorStore
          .getState()
          .reloadFileFromServer(targetPath)
          .catch((e) => console.warn("[CapturePanel] reload failed:", e));
      }

      if (result.skippedDuplicate) {
        toast.info(
          `Tài liệu đã có trong ${targetPath} với key ${result.skippedDuplicate.existingKey}`
        );
      } else if (result.bibSaved) {
        toast.success(`Đã lưu vào ${targetPath}`);
      }
      if (result.zoteroItemKey) {
        toast.success("Đã lưu vào thư viện Zotero");
      }

      // Insert #cite only when the key exists in a .bib (newly saved or duplicate).
      if (result.bibSaved || result.skippedDuplicate) {
        const ok = insertCitation(result.citationKey);
        if (ok) {
          toast.success(`Đã chèn #cite(<${result.citationKey}>)`);
        } else {
          toast.message("Đặt con trỏ trong một tệp .typ rồi chèn lại", {
            description: `Key: ${result.citationKey}`,
          });
        }
      } else if (saveToZotero) {
        toast.message(
          "Đã lưu vào Zotero. Bật 'Lưu vào .bib' để chèn trích dẫn vào tài liệu."
        );
      }
    } catch (err) {
      toast.error(vnError(err));
    } finally {
      setPhase("idle");
    }
  };

  const busy = phase !== "idle";

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
      {/* Input */}
      <section className="border-b border-slate-200 p-3 space-y-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <ClipboardPaste className="h-3.5 w-3.5" />
          Thu thập từ web
        </h3>
        <label htmlFor="capture-input" className="sr-only">
          Liên kết bài báo hoặc DOI
        </label>
        <Input
          id="capture-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handlePreview();
          }}
          placeholder="Dán URL bài báo, DOI hoặc arXiv ID..."
          className="h-9"
        />
        <Button
          size="sm"
          className="h-9 w-full"
          onClick={() => void handlePreview()}
          disabled={busy}
        >
          {phase === "resolving" ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              Đang lấy dữ liệu...
            </>
          ) : (
            "Xem trước"
          )}
        </Button>
        <p className="text-[11px] leading-relaxed text-slate-500">
          Đang đọc một bài báo? Dán liên kết hoặc DOI để lấy metadata sạch rồi
          trích dẫn vào dự án.
        </p>
      </section>

      {/* Bookmarklet */}
      <section className="border-b border-slate-200 p-3">
        <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Bookmarklet
        </h3>
        {/* href is set imperatively so React doesn't strip the javascript: URL. */}
        <a
          ref={(el) => {
            if (el) el.setAttribute("href", bookmarklet);
          }}
          draggable
          onClick={(e) => e.preventDefault()}
          title="Kéo nút này lên thanh dấu trang của trình duyệt"
          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[13px] font-medium text-[#007bff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007bff]/40"
        >
          <Sparkles className="h-4 w-4" />
          Trích dẫn vào TLU Scholar
        </a>
        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
          Kéo nút trên lên thanh dấu trang. Khi đang đọc một bài báo, bấm vào để
          mở dự án này và tự điền liên kết trang đó.
        </p>
      </section>

      {/* Preview + save */}
      {preview ? (
        <section className="flex-1 space-y-3 p-3">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-[13px] font-semibold leading-snug text-slate-800">
              {preview.title ?? "(không có tiêu đề)"}
            </p>
            <p className="mt-1 text-[12px] text-slate-600">
              {authorsLine(preview) || "—"}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {[preview.date, preview.publicationTitle]
                .filter(Boolean)
                .join(" · ") || preview.itemType}
            </p>
            {preview.doi && (
              <p className="mt-1 truncate text-[11px] text-slate-400">
                DOI: {preview.doi}
              </p>
            )}
            {preview.abstractNote && (
              <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-slate-500">
                {preview.abstractNote}
              </p>
            )}
          </div>

          <TargetBibPicker value={targetPath} onChange={setTargetPath} />

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-[13px] text-slate-700">
              <input
                type="checkbox"
                checked={saveToBib}
                onChange={(e) => setSaveToBib(e.target.checked)}
                className="h-4 w-4 accent-[#007bff]"
              />
              Lưu vào .bib của dự án
            </label>
            <label className="flex items-center gap-2 text-[13px] text-slate-700">
              <input
                type="checkbox"
                checked={saveToZotero}
                onChange={(e) => setSaveToZotero(e.target.checked)}
                className="h-4 w-4 accent-[#007bff]"
              />
              Lưu vào thư viện Zotero
            </label>
          </div>

          <Button
            className="h-9 w-full"
            onClick={() => void handleSave()}
            disabled={busy}
          >
            {phase === "saving" ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              "Lưu & trích dẫn"
            )}
          </Button>
        </section>
      ) : (
        <div className="p-3">
          <p className="text-[12px] text-slate-500">
            Chưa có kết quả. Nhập liên kết/DOI rồi bấm “Xem trước”.
          </p>
        </div>
      )}
    </div>
  );
}
