import { Download, Loader2 } from "lucide-react";
import { useExportCompile } from "../hooks/useExportCompile";
import { useEffect } from "react";
import { toast } from "sonner";
import { useEditorStore } from "../state/editorStore";
import { downloadUrl } from "../../utils/download";

interface ExportButtonProps {
  /**
   * Blob URL of the most recently compiled preview PDF (from
   * `useTypstPreview`). When provided, the button downloads this URL
   * immediately on click — no server round-trip. Falls back to the
   * server-side compile job when null.
   */
  pdfUrl?: string | null;
}

// Slugify a project title for use as a filename. Strips diacritics, replaces
// whitespace/separators with '-', drops non-word characters, lowercases.
// Falls back to "document" when the input is empty.
function slugifyProjectTitle(title: string | null | undefined): string {
  const raw = title?.trim() ?? "";
  if (!raw) return "document";

  const slug = raw
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return slug || "document";
}

function getExportFilename(projectTitle: string | null | undefined): string {
  return `${slugifyProjectTitle(projectTitle)}.pdf`;
}

/**
 * ExportButton - Server-side PDF export button (with client-side fast path)
 *
 * Fast path: when a fresh preview blob URL exists, download it directly so
 * the user gets the PDF instantly without re-running compile on the server.
 * Slow path: falls back to enqueueing a compile job + polling the artifact.
 */
export function ExportButton({ pdfUrl }: ExportButtonProps): JSX.Element {
  const { exporting, error, exportPdf } = useExportCompile();
  const mainPath = useEditorStore((s) => s.settings?.mainPath);
  const projectTitle = useEditorStore((s) => s.project?.title);

  // Show error toast when export fails
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleClick = () => {
    if (pdfUrl) {
      // Fast path — preview already produced a fresh PDF blob.
      downloadUrl(pdfUrl, getExportFilename(projectTitle));
      return;
    }
    // Fallback — server-side compile job.
    void exportPdf();
  };

  return (
    <button
      onClick={handleClick}
      disabled={exporting}
      className="flex items-center gap-2 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      title={
        exporting
          ? "Đang xuất PDF..."
          : pdfUrl
            ? "Tải xuống bản xem trước hiện tại"
            : mainPath
              ? `Xuất PDF từ ${mainPath}`
              : "Xuất PDF"
      }
    >
      {exporting ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          <span>Đang xuất...</span>
        </>
      ) : (
        <>
          <Download className="size-4" />
          <span>Xuất PDF</span>
        </>
      )}
    </button>
  );
}
