import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { Download, FileText, Loader2 } from "lucide-react";
import type { PopupMessage } from "../services/PdfPopupService";

/**
 * Standalone popup PDF viewer. Mounted at /preview-popup/:projectId.
 * Receives PDF bytes from the parent workspace window over a BroadcastChannel
 * named `tlu-preview-${projectId}` and renders them in an embedded viewer.
 */
export function PopoutViewerWindow(): JSX.Element {
  const { projectId } = useParams<{ projectId: string }>();
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const lastUrlRef = useRef<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const channel = new BroadcastChannel(`tlu-preview-${projectId}`);

    const handler = (event: MessageEvent) => {
      const msg = event.data as PopupMessage;
      if (msg.type === 'pdf-update') {
        setPdfData(msg.pdf);
        setProjectName(msg.projectName ?? null);
      } else if (msg.type === 'pdf-clear') {
        setPdfData(null);
      }
    };
    channel.addEventListener('message', handler);

    // Tell the parent we're ready so it can push the latest payload.
    channel.postMessage({ type: 'window-ready', timestamp: Date.now() });

    const handleBeforeUnload = () => {
      channel.postMessage({ type: 'window-closed', timestamp: Date.now() });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      channel.removeEventListener('message', handler);
      channel.close();
    };
  }, [projectId]);

  // Manage the embed blob URL so it's revoked when superseded or on unmount.
  useEffect(() => {
    if (!pdfData) {
      if (lastUrlRef.current) {
        URL.revokeObjectURL(lastUrlRef.current);
        lastUrlRef.current = null;
      }
      setPdfUrl(null);
      return;
    }
    const blob = new Blob([pdfData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
    lastUrlRef.current = url;
    setPdfUrl(url);
    return () => {
      if (lastUrlRef.current === url) {
        URL.revokeObjectURL(url);
        lastUrlRef.current = null;
      }
    };
  }, [pdfData]);

  const downloadName = useMemo(() => {
    const raw = projectName?.trim();
    if (!raw) return 'document.pdf';
    const slug = raw
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_-]+/g, '-')
      .toLowerCase();
    return `${slug || 'document'}.pdf`;
  }, [projectName]);

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  useEffect(() => {
    document.title = projectName
      ? `${projectName} — Xem trước PDF`
      : 'Xem trước PDF — TLU Scholar Editor';
  }, [projectName]);

  return (
    <div className="flex h-screen w-full flex-col bg-slate-100 text-slate-900">
      <header className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-4 shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-[#007bff]" />
          <div className="text-sm font-semibold text-slate-700">
            {projectName ?? 'Xem trước PDF'}
          </div>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!pdfUrl}
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="size-4" />
          Tải PDF
        </button>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden bg-slate-200">
        {pdfUrl ? (
          <iframe
            key={pdfUrl}
            src={pdfUrl}
            title="Xem trước PDF"
            className="h-full w-full border-0"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="size-6 animate-spin text-slate-400" />
            <div className="text-sm">Đang chờ bản dựng từ cửa sổ chính...</div>
          </div>
        )}
      </main>
    </div>
  );
}
