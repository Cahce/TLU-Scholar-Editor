import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { Eye } from "lucide-react";
import { useEditorBootstrap } from "../../editor/hooks/useEditorBootstrap";
import { useTypstPreview } from "../../editor/hooks/useTypstPreview";
import { useEditorStore } from "../../editor/state/editorStore";
import { FileTreePanel } from "../../editor/components/FileTreePanel";
import { FileViewer } from "../../editor/components/FileViewer";
import { InsertToolbar } from "../../editor/components/InsertToolbar";
import { EditorErrorBoundary } from "../../editor/components/EditorErrorBoundary";
import { PreviewPane, type PreviewFormat } from "../../editor/components/PreviewPane";
import { PdfPopupService } from "../../editor/services/PdfPopupService";
import { EditableProjectTitle } from "../../editor/components/EditableProjectTitle";
import { EditorTabs } from "../../editor/components/EditorTabs";
import { FigureEditDialog } from "../../editor/components/FigureEditDialog";
import { MathEditDialog } from "../../editor/components/MathEditDialog";
import { TableEditDialog } from "../../editor/components/TableEditDialog";
import {
  getSvgMode,
  subscribeSettings,
  type SvgMode,
} from "../../editor/state/previewSettings";
import { IssuesPanel } from "../../editor/components/IssuesPanel";
import { getDiagnosticSummary } from "../../editor/state/selectors";
import { useIssueNavigation } from "../../editor/hooks/useIssueNavigation";
import { SearchPanel } from "../../editor/components/SearchPanel";
import { OutlinePanel } from "../../editor/components/OutlinePanel";
import { EditorSettingsPanel } from "../../editor/components/EditorSettingsPanel";
import { ExportButton } from "../../editor/components/ExportButton";
import { WordCountModal } from "../../editor/components/WordCountModal";
import { ZoteroPanel } from "../../editor/components/bibliography/ZoteroPanel";
import { OpenAlexPanel } from "../../editor/components/bibliography/OpenAlexPanel";
import { CapturePanel } from "../../editor/components/bibliography/CapturePanel";
import { BibliographyPanel } from "../../editor/components/bibliography/BibliographyPanel";
import { EditorMenuBar } from "../../editor/components/EditorMenuBar";
import { EditorOverflowMenu } from "../../editor/components/EditorOverflowMenu";
import { KeyboardShortcutsModal } from "../../editor/components/KeyboardShortcutsModal";
import { AboutDialog } from "../../editor/components/AboutDialog";
import { useEditorCommands } from "../../editor/commands/useEditorCommands";
import { useExportCompile } from "../../editor/hooks/useExportCompile";
import {
  FolderOpen,
  Search,
  ListTree,
  Library,
  AlertTriangle,
  AlertCircle,
  Settings,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Archive,
  Save,
  BookmarkPlus,
} from "lucide-react";
import { ZoteroIcon } from "../../editor/components/icons/ZoteroIcon";
import { OpenAlexIcon } from "../../editor/components/icons/OpenAlexIcon";
import { toast } from "sonner";
import { exportProject } from "../../api/projects";
import { publishTemplateVersionFromSource } from "../../api/templates";
import { ApiError } from "../../api/client";
import {
  defaultExportFilename,
  downloadBlob,
  downloadUrl,
} from "../../utils/download";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";


type SidebarMode = 'files' | 'search' | 'outline' | 'bibliography' | 'issues' | 'settings' | 'zotero' | 'openalex' | 'capture';

const SIDEBAR_TITLES: Record<SidebarMode, string> = {
  files: "Khám phá tệp",
  search: "Tìm kiếm",
  outline: "Dàn ý",
  bibliography: "Tài liệu tham khảo",
  issues: "Lỗi và cảnh báo",
  settings: "Cài đặt",
  zotero: "Zotero",
  openalex: "OpenAlex",
  capture: "Thu thập tài liệu",
};

// Accepts `v1.0.0` or `1.0.0` — mirrors the backend version validation.
const TEMPLATE_VERSION_REGEX = /^v?\d+\.\d+\.\d+$/;

export function ProjectWorkspace() {
  const navigate = useNavigate();
  const { id: projectId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  // Admin "view in workspace": `/workspace/:id?view=1` is a read-only *seed*.
  // The authoritative read-only flag (`readOnly` below, read from the editor
  // store) ALSO reflects the backend access level resolved during bootstrap —
  // so an admin opening a project they do not own is read-only even without
  // `?view=1`. The backend independently rejects every write with 403.
  const urlReadOnly = searchParams.get("view") === "1";
  const readOnly = useEditorStore((s) => s.readOnly);
  // Template authoring: `/workspace/:id?templateId=...` lets an admin edit a
  // template's source project and publish a version from it.
  const templateId = searchParams.get("templateId");
  // Bookmarklet entry: `/workspace/:id?capture=<url>` opens the "Thu thập" panel
  // pre-filled with the page URL.
  const captureUrlParam = searchParams.get("capture");

  // Bootstrap editor state — must be called unconditionally (before any early return).
  // Seed with the stable URL value; passing the derived store `readOnly` here
  // would re-trigger bootstrap when it flips after the project loads (loop).
  const shouldBootstrap = !!(projectId && projectId !== "new");
  useEditorBootstrap(shouldBootstrap ? projectId : null, urlReadOnly);

  const [activeMode, setActiveMode] = useState<SidebarMode>('files');
  // Keep the Zotero panel mounted once first opened so its connection,
  // collection list, selected collection, and item-list pagination survive a
  // round-trip through other sidebar modes (Files, Search, etc.). Without
  // this the panel unmounts on every tab switch and re-fetches `/zotero/
  // connections/me` + `/zotero/collections`, and the user loses their
  // selected collection / current page — the same symptom the user described
  // as "phải kết nối lại khi di chuyển sang chức năng khác".
  const [zoteroEverOpened, setZoteroEverOpened] = useState(false);
  // Single preview surface (typst.app-style): the in-pane preview is always the
  // fast incremental Canvas (SVG). The PDF/Canvas(PDF) tabs were removed — PDF
  // is produced only on demand (detached popup + Export), never per keystroke.
  const [previewFormat, setPreviewFormat] = useState<PreviewFormat>('canvas-svg');
  const [popupOpen, setPopupOpen] = useState(false);
  const [svgMode, setSvgModeState] = useState<SvgMode>(() => getSvgMode());
  const [wordCountOpen, setWordCountOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);

  // Bookmarklet deep-link: open the capture panel when the URL carries
  // ?capture=<page-url>.
  useEffect(() => {
    if (captureUrlParam && !readOnly) {
      setActiveMode('capture');
    }
  }, [captureUrlParam, readOnly]);

  // Template authoring: "Lưu thành phiên bản mẫu" dialog state.
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishVersion, setPublishVersion] = useState("v1.0.0");
  const [publishChangelog, setPublishChangelog] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const handleExportZip = async (): Promise<void> => {
    if (!projectId || projectId === "new" || exportingZip) return;
    setExportingZip(true);
    try {
      const { blob } = await exportProject(projectId);
      downloadBlob(blob, defaultExportFilename(project?.title ?? "project"));
      toast.success("Đã tạo bản sao lưu .zip");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Tạo bản sao lưu thất bại";
      toast.error(message);
    } finally {
      setExportingZip(false);
    }
  };

  // Publish the current source-project files as a new template version.
  const handlePublishTemplateVersion = async (): Promise<void> => {
    if (!templateId || publishing) return;
    const trimmed = publishVersion.trim();
    if (!TEMPLATE_VERSION_REGEX.test(trimmed)) {
      setPublishError("Định dạng phải là v1.0.0 hoặc 1.0.0");
      return;
    }
    setPublishError(null);
    setPublishing(true);
    try {
      await publishTemplateVersionFromSource(templateId, {
        versionNumber: trimmed,
        changelog: publishChangelog.trim() || undefined,
      });
      toast.success("Đã lưu phiên bản mẫu", {
        description: `Phiên bản ${trimmed} đã được tạo.`,
      });
      setPublishOpen(false);
      navigate("/admin/templates");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Không thể lưu phiên bản mẫu";
      setPublishError(message);
      toast.error(message);
    } finally {
      setPublishing(false);
    }
  };

  // Open the Word Count modal in response to a global event. Lets the
  // OutlinePanel (and any future trigger) request the modal without
  // prop-drilling.
  useEffect(() => {
    const handler = (): void => setWordCountOpen(true);
    window.addEventListener("editor:openWordCount", handler);
    return () => window.removeEventListener("editor:openWordCount", handler);
  }, []);

  // Re-read svgMode setting when the user toggles it in EditorSettingsPanel
  // (which fires the custom event via setSvgMode → broadcastChange).
  useEffect(() => {
    return subscribeSettings(() => setSvgModeState(getSvgMode()));
  }, []);

  // Read real data from the Zustand editor store
  const project    = useEditorStore((s) => s.project);
  const activePath = useEditorStore((s) => s.activePath);
  const previewPath = useEditorStore((s) => s.previewPath);
  const mainPath = useEditorStore((s) => s.settings?.mainPath ?? null);
  const setPreviewPath = useEditorStore((s) => s.setPreviewPath);
  const storeLoading    = useEditorStore((s) => s.loading);
  const bootstrapError  = useEditorStore((s) => s.bootstrapError);
  // Surfaced on the issues sidebar button so the user notices compile problems
  // without having to peek into the panel. `getDiagnosticSummary` is memoized on
  // the diagnostics array reference, so this selector returns a STABLE object
  // while diagnostics are unchanged → Zustand's `Object.is` check skips the
  // re-render unless diagnostics actually change.
  const diagnosticSummary = useEditorStore((s) =>
    getDiagnosticSummary(s.diagnostics),
  );
  const issueErrorCount = diagnosticSummary.errorCount;
  const issueWarningCount = diagnosticSummary.warningCount;
  // Badge shows the most-severe tier's count (errors win over warnings).
  const issueBadgeCount = issueErrorCount > 0 ? issueErrorCount : issueWarningCount;
  const issueBadgeLabel = issueBadgeCount > 99 ? "99+" : String(issueBadgeCount);

  // One-shot attention pulse when problems first appear (0 → >0). CSS-only, so
  // it never steals editor focus; `motion-safe:` respects prefers-reduced-motion.
  const [issuePulse, setIssuePulse] = useState(false);
  const prevIssueTotalRef = useRef(0);
  useEffect(() => {
    const total = issueErrorCount + issueWarningCount;
    const prev = prevIssueTotalRef.current;
    prevIssueTotalRef.current = total;
    if (prev === 0 && total > 0) {
      setIssuePulse(true);
      const t = window.setTimeout(() => setIssuePulse(false), 1200);
      return () => window.clearTimeout(t);
    }
  }, [issueErrorCount, issueWarningCount]);

  const {
    goNext: goNextIssue,
    goPrev: goPrevIssue,
    count: navigableIssueCount,
  } = useIssueNavigation();

  // Compile preview at the workspace level so the same blob URL feeds both
  // the PreviewPane (for rendering) and the ExportButton (for instant
  // client-side download). Hoisting the hook also guarantees a single
  // TypstPreviewClient/Worker is alive across the workspace lifetime.
  //
  // Single preview is the incremental Canvas (SVG); the user's setting
  // ('off' | 'full' | 'incremental') now controls that one surface directly.
  // 'off' = no live preview at all (max performance / user opt-out).
  const effectiveSvgMode: SvgMode = svgMode;
  // PDF is no longer a live per-keystroke surface. It compiles ONLY when the
  // detached popup is open (the on-demand "see the exact PDF" window). Export
  // uses its own server-side path (ExportButton falls back when pdfUrl is
  // stale/null), so typing never pays for a paged compile.
  const needPdf = popupOpen;
  const {
    pdfData,
    pdfUrl,
    svgString,
    svgIsFirstFrame,
    pdfStale,
    isCompiling: previewCompiling,
    error: previewError,
  } = useTypstPreview({ svgMode: effectiveSvgMode, pdfEnabled: needPdf });

  // ── Popup service (lazy, per project) ──────────────────────────────────────
  const popupServiceRef = useRef<PdfPopupService | null>(null);

  useEffect(() => {
    if (!projectId || projectId === 'new') return;
    const service = new PdfPopupService(projectId);
    popupServiceRef.current = service;

    const unsubscribe = service.onMessage((msg) => {
      if (msg.type === 'window-closed') {
        setPopupOpen(false);
      }
    });

    return () => {
      unsubscribe();
      service.dispose();
      popupServiceRef.current = null;
    };
  }, [projectId]);

  // Push fresh PDF bytes to the popup whenever a new compile lands.
  useEffect(() => {
    const service = popupServiceRef.current;
    if (!service || !popupOpen || !pdfData) return;
    service.pushUpdate(pdfData, project?.title ?? null);
  }, [pdfData, popupOpen, project?.title]);

  const handlePopupOpen = () => {
    const service = popupServiceRef.current;
    if (!service) return;
    const win = service.open(pdfData ?? null, project?.title ?? null);
    if (win) setPopupOpen(true);
  };

  const handlePopupClose = () => {
    popupServiceRef.current?.close();
    setPopupOpen(false);
  };

  // PDF export for the top-bar menu / ⋮ overflow. Uses its own
  // useExportCompile instance (the standalone ExportButton keeps its own
  // fast-path instance); surface this instance's errors as a toast since it
  // isn't rendered as a button.
  const { exportPdf: runMenuExportPdf, error: menuExportError } =
    useExportCompile();
  useEffect(() => {
    if (menuExportError) toast.error(menuExportError);
  }, [menuExportError]);

  // Slugified PDF filename, shared by the preview download button, the
  // standalone ExportButton, and the menu/⋮ fast-path export below.
  const downloadFileName = useMemo(() => {
    const raw = project?.title?.trim() ?? "";
    if (!raw) return "document.pdf";
    const slug =
      raw
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase() || "document";
    return `${slug}.pdf`;
  }, [project?.title]);

  // Fast-path PDF export for the menu / ⋮: if a fresh preview PDF blob exists,
  // download it instantly (no server round-trip); otherwise fall back to the
  // server compile. Mirrors the standalone ExportButton behaviour.
  const handleMenuExportPdf = (): void => {
    if (!pdfStale && pdfUrl) {
      downloadUrl(pdfUrl, downloadFileName);
      return;
    }
    void runMenuExportPdf();
  };

  // Command-registry context for the top-bar menus (Tệp/Chỉnh sửa/Xem/Trợ
  // giúp) and the ⋮ overflow menu. One source of truth — see editor/commands.
  const menu = useEditorCommands({
    templateId,
    navigate,
    exportPdf: handleMenuExportPdf,
    exportZip: handleExportZip,
    openWordCount: () => setWordCountOpen(true),
    openShortcuts: () => setShortcutsOpen(true),
    openPublish: () => {
      setPublishError(null);
      setPublishOpen(true);
    },
    popupPdf: handlePopupOpen,
    setSidebarMode: (mode) => setActiveMode(mode as SidebarMode),
    openIssues: () => setActiveMode("issues"),
    openAbout: () => setAboutOpen(true),
  });

  // F1 → open the keyboard shortcuts cheatsheet (works regardless of focus).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "F1") return;
      e.preventDefault();
      setShortcutsOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Ctrl+F / Ctrl+H → switch sidebar to "search" + relay focus event.
  // Two-stage: switch mode first (so SearchPanel mounts), then forward the
  // focus detail with a microtask delay so the input ref is attached.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { focus?: "find" | "replace" } | undefined;
      setActiveMode("search");
      // Defer one tick so SearchPanel can mount + attach refs.
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("search:focus", {
            detail: { focus: detail?.focus ?? "find" },
          }),
        );
      }, 30);
    };
    window.addEventListener("workspace:openSearch", handler);
    return () => window.removeEventListener("workspace:openSearch", handler);
  }, []);

  // PreviewErrorBanner → switch sidebar to "issues" so the user can read the
  // full diagnostic list right after they clicked the inline error.
  useEffect(() => {
    const handler = () => setActiveMode("issues");
    window.addEventListener("workspace:openIssues", handler);
    return () => window.removeEventListener("workspace:openIssues", handler);
  }, []);

  // F8 / Shift+F8 — jump to next / previous compile issue (VS Code convention).
  // Registered here (always mounted) so it works regardless of the open sidebar
  // panel or editor focus. Function keys are safe to handle even inside inputs,
  // but we skip text fields to avoid surprising rename/search dialogs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "F8" || e.ctrlKey || e.altKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      ) {
        return;
      }
      if (navigableIssueCount === 0) return;
      e.preventDefault();
      if (e.shiftKey) goPrevIssue();
      else goNextIssue();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNextIssue, goPrevIssue, navigableIssueCount]);

  // ── Invalid route ──────────────────────────────────────────────────────────
  if (!projectId || projectId === "new") {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Dự án không tồn tại</h1>
          <p className="text-slate-600 mb-6">ID dự án không hợp lệ hoặc chưa được tạo.</p>
          <button
            onClick={() => navigate("/student")}
            className="px-4 py-2 bg-[#007bff] text-white rounded-md hover:bg-[#0069d9] transition-colors"
          >
            Quay lại trang tổng quan
          </button>
        </div>
      </div>
    );
  }

  // ── Bootstrap loading ──────────────────────────────────────────────────────
  if (storeLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#007bff] animate-spin mx-auto mb-4" />
          <p className="text-slate-600 text-[15px]">Đang tải dự án...</p>
        </div>
      </div>
    );
  }

  // ── Bootstrap error ────────────────────────────────────────────────────────
  if (bootstrapError) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Không thể tải dự án</h1>
          <p className="text-slate-600 mb-6">{bootstrapError}</p>
          <button
            onClick={() => navigate("/student")}
            className="px-4 py-2 bg-[#007bff] text-white rounded-md hover:bg-[#0069d9] transition-colors"
          >
            Quay lại trang tổng quan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 text-slate-900 overflow-hidden font-sans">
      
      {/* 1. Top application bar */}
      <header className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-3 shrink-0 select-none shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              navigate(
                templateId
                  ? "/admin/templates"
                  : readOnly
                    ? "/admin/projects"
                    : "/student",
              )
            }
            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#007bff]/30"
            title="Quay lại"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="whitespace-nowrap border-r border-slate-200 px-2 text-base font-semibold tracking-tight text-[#007bff] lg:text-lg">
            TLU Scholar Editor
          </div>
          
          <EditorMenuBar menu={menu} />
        </div>

        {/* Center Breadcrumb */}
        <div className="hidden lg:flex items-center text-sm absolute left-1/2 -translate-x-1/2 max-w-sm truncate">
          {projectId && projectId !== "new" && !readOnly ? (
            <EditableProjectTitle
              projectId={projectId}
              title={project?.title ?? projectId}
              onUpdate={(newTitle) => {
                // Sync the editor store so any other component reading
                // `project.title` (export filename, popup name, etc.) picks
                // up the rename immediately without waiting for a refetch.
                if (project) {
                  useEditorStore.setState({ project: { ...project, title: newTitle } });
                }
              }}
            />
          ) : (
            <span className="text-slate-500 truncate max-w-[200px]">
              {project?.title ?? projectId}
            </span>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 mx-1 shrink-0" />
          <span className="font-medium text-slate-900 truncate">{activePath ?? 'main.typ'}</span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {readOnly && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200">
              <Eye className="w-3.5 h-3.5" />
              Chế độ chỉ xem
            </span>
          )}
          {templateId && (
            <button
              onClick={() => {
                setPublishError(null);
                setPublishOpen(true);
              }}
              disabled={!projectId || projectId === "new"}
              title="Đóng gói nội dung hiện tại thành một phiên bản mẫu"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[#007bff] rounded-md hover:bg-[#0069d9] transition-colors focus:outline-none focus:ring-2 focus:ring-[#007bff]/30 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Lưu thành phiên bản mẫu</span>
              <span className="sm:hidden">Lưu mẫu</span>
            </button>
          )}
          {/* Official export (PDF / .zip) — hidden in read-only oversight. The
              backend denies admins these anyway (.zip export + official
              compile both require write access); admins use the dedicated
              /admin/projects artifact endpoint for the official PDF. */}
          {!readOnly && (
            <>
              {/* Nút "Chia sẻ" tạm ẩn cho đến khi backend hỗ trợ chia sẻ project */}
              <div className="hidden sm:block">
                {/* Stale PDF (skipped while on the SVG tab) → hand the button
                    null so it routes through the server-side export path. */}
                <ExportButton pdfUrl={pdfStale ? null : pdfUrl} />
              </div>
              <button
                onClick={handleExportZip}
                disabled={exportingZip || !projectId || projectId === "new"}
                title="Tải xuống dự án dưới dạng .zip"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-all focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Archive className="w-4 h-4 text-slate-500" />
                {exportingZip ? "Đang tạo..." : ".zip"}
              </button>
            </>
          )}
          <EditorOverflowMenu menu={menu} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        
        {/* 2. Slim left global navigation rail */}
        <aside className="w-14 bg-white border-r border-slate-200 flex flex-col items-center py-4 gap-2 shrink-0 z-10">
          <button 
            onClick={() => setActiveMode('files')}
            title="Tệp dự án"
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors focus:outline-none ${activeMode === 'files' ? 'text-[#007bff] bg-blue-50 border border-blue-100/50 shadow-sm' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            <FolderOpen className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveMode('search')}
            title="Tìm kiếm"
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors focus:outline-none ${activeMode === 'search' ? 'text-[#007bff] bg-blue-50 border border-blue-100/50 shadow-sm' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            <Search className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveMode('outline')}
            title="Dàn ý"
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors focus:outline-none ${activeMode === 'outline' ? 'text-[#007bff] bg-blue-50 border border-blue-100/50 shadow-sm' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            <ListTree className="w-5 h-5" />
          </button>

          {/* Bibliography Integration — hidden in read-only (these panels
              write citations into project .bib files). */}
          {!readOnly && (
            <>
              <button
                onClick={() => setActiveMode('bibliography')}
                title="Tài liệu tham khảo — Quản lý .bib & kiểu trích dẫn"
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors focus:outline-none ${activeMode === 'bibliography' ? 'text-[#007bff] bg-blue-50 border border-blue-100/50 shadow-sm' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
              >
                <Library className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setActiveMode('zotero');
                  setZoteroEverOpened(true);
                }}
                title="Zotero — Thư viện tham khảo"
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors focus:outline-none ${activeMode === 'zotero' ? 'text-[#007bff] bg-blue-50 border border-blue-100/50 shadow-sm' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
              >
                <ZoteroIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActiveMode('openalex')}
                title="OpenAlex — Tìm tài liệu học thuật"
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors focus:outline-none ${activeMode === 'openalex' ? 'text-[#007bff] bg-blue-50 border border-blue-100/50 shadow-sm' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
              >
                <OpenAlexIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActiveMode('capture')}
                title="Thu thập tài liệu — Trích dẫn bài báo từ web"
                aria-label="Thu thập tài liệu từ web"
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors focus:outline-none ${activeMode === 'capture' ? 'text-[#007bff] bg-blue-50 border border-blue-100/50 shadow-sm' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
              >
                <BookmarkPlus className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Divider */}
          <div className="w-6 h-px bg-slate-100 my-1 shrink-0" />
          
          <button
            onClick={() => setActiveMode('issues')}
            title={
              issueErrorCount > 0
                ? `${issueErrorCount} lỗi biên dịch${issueWarningCount > 0 ? ` · ${issueWarningCount} cảnh báo` : ''} — bấm để xem chi tiết`
                : issueWarningCount > 0
                  ? `${issueWarningCount} cảnh báo — bấm để xem chi tiết`
                  : 'Lỗi và cảnh báo'
            }
            aria-label={
              issueErrorCount > 0
                ? `Có ${issueErrorCount} lỗi biên dịch — mở bảng lỗi để xem chi tiết`
                : issueWarningCount > 0
                  ? `Có ${issueWarningCount} cảnh báo — mở bảng lỗi để xem chi tiết`
                  : 'Lỗi và cảnh báo'
            }
            className={`relative w-10 h-10 flex items-center justify-center rounded-xl transition-colors focus:outline-none ${
              activeMode === 'issues'
                ? 'text-[#007bff] bg-blue-50 border border-blue-100/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
            {issueBadgeCount > 0 && (
              <span
                className={`absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 flex items-center justify-center rounded-full text-[10px] font-semibold leading-none text-white ring-2 ring-white ${
                  issueErrorCount > 0 ? 'bg-red-500' : 'bg-amber-500'
                } ${issuePulse ? 'motion-safe:animate-pulse' : ''}`}
                aria-hidden="true"
              >
                {issueBadgeLabel}
              </span>
            )}
          </button>
          
          <div className="mt-auto flex flex-col gap-2">
            <button
              onClick={() => setActiveMode('settings')}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors focus:outline-none ${activeMode === 'settings' ? 'text-[#007bff] bg-blue-50 border border-blue-100/50 shadow-sm' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
              title="Cài đặt"
            >
              <Settings className="w-5 h-5" />
            </button>
            <a
              href="/huong-dan"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors focus:outline-none"
              title="Hướng dẫn (mở tab mới)"
              aria-label="Mở Trung tâm trợ giúp trong tab mới"
            >
              <HelpCircle className="w-5 h-5" />
            </a>
          </div>
        </aside>

        {/* Resizable Panels Wrapper */}
        <PanelGroup direction="horizontal" className="h-full min-h-0 w-full flex-1">
          
          {/* 3. Collapsible multi-mode sidebar */}
          <Panel defaultSize={20} minSize={15} maxSize={35} collapsible className="bg-[#f8fafc] flex min-w-0 flex-col border-r border-slate-200">
            <div className="h-10 border-b border-slate-200 flex items-center px-4 shrink-0 bg-white">
              <span className="text-[13px] font-semibold text-slate-700 tracking-wide uppercase">{SIDEBAR_TITLES[activeMode]}</span>
            </div>
            
            {/* Mode 1: Tệp dự án — toolbar is now owned by FileTreePanel */}
            {activeMode === 'files' && (
              <div className="flex-1 flex flex-col min-h-0">
                <FileTreePanel />
              </div>
            )}

            {/* Mode 2: Tìm kiếm */}
            {activeMode === 'search' && <SearchPanel />}

            {/* Mode 3: Outline */}
            {activeMode === 'outline' && <OutlinePanel />}

            {/* Mode: Tài liệu tham khảo (.bib manager + citation style) */}
            {activeMode === 'bibliography' && projectId && (
              <BibliographyPanel projectId={projectId} />
            )}

            {/* Mode 4: Lỗi và cảnh báo */}
            {activeMode === 'issues' && (
              <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                <IssuesPanel />
              </div>
            )}

            {/* Mode 5: Cài đặt trình soạn thảo */}
            {activeMode === 'settings' && <EditorSettingsPanel />}

            {/* Mode 6: Zotero — kept mounted after first open so the cached
                connection / collections / current selection survive when the
                user toggles back from another sidebar mode. `display: none`
                preserves child state without keeping it in the layout flow. */}
            {zoteroEverOpened && projectId && (
              <div
                className={
                  activeMode === 'zotero'
                    ? 'flex-1 min-h-0 flex flex-col'
                    : 'hidden'
                }
              >
                <ZoteroPanel projectId={projectId} />
              </div>
            )}

            {/* Mode 7: OpenAlex */}
            {activeMode === 'openalex' && projectId && <OpenAlexPanel projectId={projectId} />}

            {/* Mode 8: Thu thập tài liệu (web capture + cite) */}
            {activeMode === 'capture' && projectId && (
              <CapturePanel projectId={projectId} initialUrl={captureUrlParam ?? undefined} />
            )}

          </Panel>

          <PanelResizeHandle className="w-1.5 bg-transparent hover:bg-[#007bff]/20 active:bg-[#007bff]/50 cursor-col-resize transition-colors flex items-center justify-center relative after:content-[''] after:absolute after:w-px after:h-full after:bg-slate-200" />

          {/* 4. Main code editor pane */}
          <Panel defaultSize={42} minSize={25} className="bg-white flex min-h-0 min-w-0 flex-col">
            {/* Editor Toolbar — real Typst insert commands. Self-gates on
                read-only/file-kind: hidden for editable text in read-only, and
                shown as a slim info bar (with the metadata toggle) for binary
                files like PDF / image / SVG / font. */}
            <InsertToolbar />

            {/* Real CodeMirror editor — subscribes to Zustand editor store */}
            <EditorTabs />
            <div className="flex-1 min-h-0 overflow-hidden">
              <EditorErrorBoundary>
                <FileViewer />
              </EditorErrorBoundary>
            </div>
          </Panel>

          <PanelResizeHandle className="w-1.5 bg-transparent hover:bg-[#007bff]/20 active:bg-[#007bff]/50 cursor-col-resize transition-colors flex items-center justify-center relative after:content-[''] after:absolute after:w-px after:h-full after:bg-slate-200" />

          {/* 5. Live preview pane */}
          <Panel defaultSize={38} minSize={25} className="flex min-h-0 min-w-0 flex-col bg-[#f1f5f9]">
            <div className="h-10 border-b border-slate-200 bg-white flex items-center justify-between px-3 shrink-0">
              <span className="text-[13px] font-semibold text-slate-700 tracking-wide uppercase">Xem trước</span>
              {previewPath &&
                (previewPath === mainPath ? (
                  <span
                    className="px-2 py-0.5 rounded bg-blue-50 text-[#007bff] text-[11px] font-medium border border-blue-100 truncate max-w-[180px]"
                    title={previewPath}
                  >
                    {previewPath}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[11px] font-medium border border-amber-200 truncate max-w-[150px]"
                      title={`Đang xem trước tệp khác (không phải tệp chính): ${previewPath}`}
                    >
                      {previewPath}
                    </span>
                    {mainPath && (
                      <button
                        type="button"
                        onClick={() => setPreviewPath(mainPath)}
                        className="shrink-0 rounded px-1 text-[11px] font-medium text-[#007bff] hover:text-[#0056b3] hover:underline focus:outline-none focus:ring-2 focus:ring-[#007bff]/30"
                        title={`Quay lại tệp chính: ${mainPath}`}
                      >
                        Quay lại tệp chính
                      </button>
                    )}
                  </span>
                ))}
            </div>
            {/* Real preview — driven by Typst WASM worker (PDF + SVG) */}
            <div className="min-h-0 flex-1 overflow-hidden">
              <PreviewPane
                pdfUrl={pdfUrl}
                svgString={svgString}
                svgIsFirstFrame={svgIsFirstFrame}
                isCompiling={previewCompiling}
                error={previewError}
                activeFormat={previewFormat}
                onFormatChange={setPreviewFormat}
                popupOpen={popupOpen}
                onPopupOpen={handlePopupOpen}
                onPopupClose={handlePopupClose}
                downloadFileName={downloadFileName}
              />
            </div>
          </Panel>

        </PanelGroup>
      </div>
      <FigureEditDialog />
      <MathEditDialog />
      <TableEditDialog />
      <WordCountModal open={wordCountOpen} onOpenChange={setWordCountOpen} />
      <KeyboardShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />

      {/* Template authoring: publish the source project as a new version. */}
      {templateId && publishOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={publishing ? undefined : () => setPublishOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                Lưu thành phiên bản mẫu
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Đóng gói nội dung hiện tại của project thành một phiên bản mẫu mới.
              </p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                  Số phiên bản <span className="text-red-500">*</span>
                </label>
                <input
                  value={publishVersion}
                  onChange={(e) => setPublishVersion(e.target.value)}
                  placeholder="v1.0.0"
                  disabled={publishing}
                  className="w-full h-10 text-sm border border-slate-200 rounded-md px-3 bg-white text-slate-700 outline-none focus:border-[#007bff] focus:ring-1 focus:ring-[#007bff] disabled:bg-slate-50"
                />
                {publishError && (
                  <p className="text-xs text-rose-600 mt-1">{publishError}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                  Ghi chú thay đổi
                </label>
                <textarea
                  value={publishChangelog}
                  onChange={(e) => setPublishChangelog(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  disabled={publishing}
                  placeholder="Mô tả các thay đổi trong phiên bản này..."
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-700 outline-none focus:border-[#007bff] focus:ring-1 focus:ring-[#007bff] resize-y disabled:bg-slate-50"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setPublishOpen(false)}
                disabled={publishing}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={() => void handlePublishTemplateVersion()}
                disabled={publishing}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#007bff] rounded-md hover:bg-[#0069d9] disabled:opacity-60"
              >
                {publishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  "Lưu phiên bản"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
