import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { FrameLoc } from "../services/TypstSourceMapService";
import type { FollowTarget } from "../hooks/useTypstSync";
import { computeFollowScrollTop } from "../utils/previewScroll";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Maximize,
  Minimize,
  Minus,
  MoveHorizontal,
  MoveVertical,
  Plus,
  ScrollText,
  FileText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

// ---------------------------------------------------------------------------
// pdf.js worker setup
// ---------------------------------------------------------------------------
// CRITICAL: the pdfjs API version (used by react-pdf internally) MUST match
// the worker version. We pin `pdfjs-dist` to the SAME version that react-pdf
// bundles internally (currently 5.4.296 for react-pdf@10.4.1) — see
// package.json. The `?url` form ensures Vite emits the worker file as a static
// asset and gives us its hashed URL deterministically, matching the pattern in
// `editor/lib/pdfjsLoader.ts`.
//
// If you bump `react-pdf`, also bump `pdfjs-dist` in package.json to whatever
// version the new react-pdf ships internally (check
// `node_modules/react-pdf/package.json` → dependencies.pdfjs-dist). A
// mismatch surfaces at runtime as:
//   "UnknownErrorException: The API version "X" does not match the Worker version "Y"."
// ---------------------------------------------------------------------------
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// ---------------------------------------------------------------------------
// Zoom: 25% step, [25 .. 500]. Same presets as Canvas(PDF) tab for consistency.
// ---------------------------------------------------------------------------
const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 5.0;
const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0, 5.0];

type FitMode = "manual" | "fit-width" | "fit-height";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function snapZoomIn(scale: number): number {
  // Snap to next multiple of ZOOM_STEP — e.g. 1.13 → 1.25, 1.25 → 1.50.
  const next = Math.floor(scale / ZOOM_STEP) * ZOOM_STEP + ZOOM_STEP;
  return clamp(next, ZOOM_MIN, ZOOM_MAX);
}

function snapZoomOut(scale: number): number {
  const prev = Math.ceil(scale / ZOOM_STEP) * ZOOM_STEP - ZOOM_STEP;
  return clamp(prev, ZOOM_MIN, ZOOM_MAX);
}

interface PdfRendererProps {
  /** Blob URL of the most recently compiled PDF (from useTypstPreview). */
  pdfUrl: string;
  /** Filename used for the download button. */
  fileName?: string;
  /**
   * Reverse sync: called with a click's document-point location so the editor
   * can jump to the matching source. Optional — omitted in non-sync contexts
   * (e.g. admin PDF viewing).
   */
  onContentClick?: (frame: FrameLoc) => void;
  /**
   * Follow-typing scroll target (spec: typing-latency-and-follow-preview
   * FT-6). When a new typingTick arrives, the viewer scrolls so the edited
   * region is visible. Optional — omitted in non-editor contexts.
   */
  followTarget?: FollowTarget | null;
}

interface PageDims {
  width: number;
  height: number;
}

export function PdfRenderer({
  pdfUrl,
  fileName,
  onContentClick,
  followTarget = null,
}: PdfRendererProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  // Captured natural dimensions of page 1 so fit-width/height can be recomputed
  // on container resize without waiting for another onLoadSuccess.
  const firstPageDimsRef = useRef<PageDims | null>(null);
  // Per-page logical size (pt) captured on page load, used to convert a click
  // into document-point coordinates for reverse sync (click-to-source).
  const pagePtSizes = useRef<Map<number, PageDims>>(new Map());

  // Continuously-updated snapshot of the user's last viewport state. We update
  // it on every native scroll event so that when a new pdfUrl arrives and the
  // <Document> remounts (children unmount → scrollHeight collapses → browser
  // resets scrollTop to 0), we still hold the LAST scroll position the user
  // was at, captured BEFORE the unmount-driven reset happened.
  //
  // The previous "save in useLayoutEffect on pdfUrl change" approach was racy:
  // by the time the effect ran, react-pdf had already cleared children and the
  // captured scrollTop was 0.
  const lastViewportRef = useRef<{ scrollTop: number; currentPage: number }>({
    scrollTop: 0,
    currentPage: 1,
  });
  // Set when pdfUrl changes — tells onDocumentLoadSuccess to restore.
  const pendingRestoreRef = useRef<{ scrollTop: number; currentPage: number } | null>(null);
  const prevPdfUrlRef = useRef<string | null>(null);

  // Follow-typing scroll (spec: typing-latency-and-follow-preview FT-6).
  // Programmatic scrolls (our follow scroll AND the post-compile restore)
  // are masked by a time window so they don't register as "user scrolled" —
  // a manual scroll pauses following until the next typing burst.
  const programmaticUntilRef = useRef(0);
  const userScrolledRef = useRef(false);
  const lastFollowTickRef = useRef(0);

  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInputValue, setPageInputValue] = useState("1");
  const [scale, setScale] = useState(1.0);
  // Default to fit-width: matches TeXlyre UX (pages fill the panel) and avoids
  // the blurry-when-browser-zooms-a-small-page effect from scale=1.0 + manual.
  // Effect at L137-150 recomputes scale once page dimensions land.
  const [fitMode, setFitMode] = useState<FitMode>("fit-width");
  const [scrollView, setScrollView] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Device pixel ratio for sharp rendering on Retina / HiDPI displays. Cap at 2
  // so canvas size doesn't explode on 3x/4x screens (no perceptible benefit
  // beyond 2 for rasterized PDF, but 4× the canvas memory).
  const dpr = useMemo(
    () => Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2),
    [],
  );

  // -------------------------------------------------------------------------
  // Container size tracking (for fit-width / fit-height recompute on resize)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const apply = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      setContainerSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height },
      );
    };
    // First measure synchronously so fit-width is correct on mount.
    apply();
    // A panel-resize drag fires the observer on every animation frame; each
    // size change recomputes the fit-width scale, which re-rasterizes every
    // page via react-pdf — the cause of the resize jank. Coalesce into a single
    // update ~120ms after the drag settles so we re-render once, not per frame.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const observer = new ResizeObserver(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(apply, 120);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Recompute scale whenever fit mode or container changes.
  useEffect(() => {
    if (fitMode === "manual") return;
    const dims = firstPageDimsRef.current;
    if (!dims || !containerSize.width || !containerSize.height) return;
    const padding = 32; // matches p-4 on page wrappers
    const availableW = Math.max(containerSize.width - padding, 100);
    const availableH = Math.max(containerSize.height - padding, 100);
    const next =
      fitMode === "fit-width"
        ? availableW / dims.width
        : availableH / dims.height;
    setScale(clamp(next, ZOOM_MIN, ZOOM_MAX));
  }, [fitMode, containerSize.width, containerSize.height]);

  // -------------------------------------------------------------------------
  // Document load
  // -------------------------------------------------------------------------
  // react-pdf treats the `file` prop reactively, but it's safest to memoize so
  // we don't trigger reloads on every parent render.
  const documentFile = useMemo(() => ({ url: pdfUrl }), [pdfUrl]);

  const handleDocumentLoadSuccess = useCallback(
    async (pdf: PDFDocumentProxy) => {
      setNumPages(pdf.numPages);
      setError(null);
      setIsLoading(false);

      // Capture page 1 dimensions for fit modes.
      try {
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        firstPageDimsRef.current = {
          width: viewport.width,
          height: viewport.height,
        };
      } catch (err) {
        console.warn("[PdfRenderer] Failed to read page 1 dims:", err);
      }

      // Restore the user's previous viewport state if we stashed one when
      // pdfUrl changed. Two cases:
      //   1. New PDF has at least the saved page → keep page + scrollTop.
      //   2. New PDF is shorter → clamp page to numPages, drop scroll.
      const pending = pendingRestoreRef.current;
      pendingRestoreRef.current = null;
      if (pending) {
        const restorePage = clamp(pending.currentPage, 1, pdf.numPages);
        setCurrentPage(restorePage);
        // Use two rAFs to wait for react-pdf to mount the page wrappers and
        // for the canvas elements to settle their final height. Without this,
        // scrollTop would be set against the still-empty scroll area.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const el = scrollAreaRef.current;
            // Restore is programmatic — don't let it count as a user scroll
            // (which would pause follow-typing until the next keystroke).
            programmaticUntilRef.current = Date.now() + 300;
            if (el && pending.currentPage === restorePage) {
              el.scrollTop = pending.scrollTop;
            } else if (el) {
              // Page was clamped → scroll to the (new) clamped page instead.
              pageRefs.current
                .get(restorePage)
                ?.scrollIntoView({ behavior: "auto", block: "start" });
            }
          });
        });
      } else {
        // First compile (no previous state to restore) — just clamp.
        setCurrentPage((p) => clamp(p, 1, pdf.numPages));
      }
    },
    [],
  );

  const handleDocumentLoadError = useCallback((err: Error) => {
    console.error("[PdfRenderer] Document load error:", err);
    setError(err.message || "Không thể tải PDF");
    setIsLoading(false);
  }, []);

  // Mirror the live scroll position into a ref. Native scroll events fire
  // continuously and bypass React's render cycle entirely, so by the time
  // <Document> remounts on a new pdfUrl we always have a fresh snapshot.
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const onScroll = () => {
      // Manual scrolling pauses follow-typing until the next keystroke;
      // programmatic scrolls (follow / restore) are masked by the window.
      if (Date.now() >= programmaticUntilRef.current) {
        userScrolledRef.current = true;
      }
      lastViewportRef.current = {
        scrollTop: el.scrollTop,
        currentPage,
      };
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [currentPage]);

  // Follow-typing: scroll so the edited region (page + yPt from the sync
  // map) is visible. Re-runs on a new typing burst, after a fresh PDF lands,
  // and on zoom changes; the in-band check in computeFollowScrollTop keeps
  // it from jittering when the target is already visible.
  useEffect(() => {
    if (!followTarget) return;
    const el = scrollAreaRef.current;
    if (!el) return;
    if (followTarget.typingTick !== lastFollowTickRef.current) {
      lastFollowTickRef.current = followTarget.typingTick;
      userScrolledRef.current = false;
    }
    if (userScrolledRef.current) return;
    const pageEl = pageRefs.current.get(followTarget.page);
    if (!pageEl) return;
    const containerRect = el.getBoundingClientRect();
    const pageRect = pageEl.getBoundingClientRect();
    const top = computeFollowScrollTop({
      containerScrollTop: el.scrollTop,
      containerHeight: el.clientHeight,
      pageTop: pageRect.top - containerRect.top + el.scrollTop,
      pageRenderedHeight: pageRect.height,
      yPt: followTarget.yPt,
      pageHeightPt: pagePtSizes.current.get(followTarget.page)?.height ?? null,
    });
    if (top == null) return;
    programmaticUntilRef.current = Date.now() + 800;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    el.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
  }, [pdfUrl, followTarget, scale]);

  // Whenever pdfUrl actually changes, take the lastViewportRef snapshot and
  // queue a restore. Using lastViewportRef (continuously updated) rather than
  // reading scrollTop here avoids the race where the new Document has already
  // detached children and reset scrollTop to 0 before this effect fires.
  useLayoutEffect(() => {
    if (prevPdfUrlRef.current && pdfUrl && prevPdfUrlRef.current !== pdfUrl) {
      pendingRestoreRef.current = { ...lastViewportRef.current };
    }
    prevPdfUrlRef.current = pdfUrl;
  }, [pdfUrl]);

  // Smooth swap when pdfUrl changes (new compile):
  //   - Clear `error` immediately (don't show stale error during reload).
  //   - DEFER `isLoading=true` by ~200ms. If react-pdf finishes loading the
  //     fresh PDF before the timer fires (typical for cached / small docs),
  //     `handleDocumentLoadSuccess` clears the timer and the user never sees
  //     a loading spinner → no flicker when typing.
  //   - First compile (numPages === 0): show loading immediately because
  //     there's nothing prior to display.
  useEffect(() => {
    setError(null);
    if (numPages === 0) {
      setIsLoading(true);
      return;
    }
    const handle = window.setTimeout(() => setIsLoading(true), 200);
    return () => window.clearTimeout(handle);
  }, [pdfUrl, numPages]);

  // Keep page input synced with currentPage when the user isn't editing.
  useEffect(() => {
    setPageInputValue(String(currentPage));
  }, [currentPage]);

  // -------------------------------------------------------------------------
  // Scroll-view: track current page via IntersectionObserver
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!scrollView || numPages === 0) return;
    const root = scrollAreaRef.current;
    if (!root) return;

    // Track which page has the largest intersection ratio = "current".
    const ratios = new Map<number, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const pageAttr = entry.target.getAttribute("data-page-number");
          if (!pageAttr) continue;
          ratios.set(Number(pageAttr), entry.intersectionRatio);
        }
        let bestPage = currentPage;
        let bestRatio = -1;
        for (const [page, ratio] of ratios.entries()) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestPage = page;
          }
        }
        if (bestPage !== currentPage) {
          setCurrentPage(bestPage);
        }
      },
      {
        root,
        threshold: [0, 0.25, 0.5, 0.75, 1.0],
      },
    );

    for (const el of pageRefs.current.values()) {
      observer.observe(el);
    }

    return () => observer.disconnect();
    // currentPage intentionally omitted — including it would re-create the observer on every scroll tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollView, numPages]);

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  const goToPage = useCallback(
    (page: number) => {
      const target = clamp(page, 1, numPages);
      setCurrentPage(target);
      if (scrollView) {
        const el = pageRefs.current.get(target);
        if (el && scrollAreaRef.current) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    },
    [numPages, scrollView],
  );

  const goPrev = useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage]);
  const goNext = useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage]);

  const handlePageInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPageInputValue(e.target.value);
  };

  const handlePageInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const parsed = parseInt(pageInputValue, 10);
      if (!Number.isNaN(parsed)) {
        goToPage(parsed);
      } else {
        setPageInputValue(String(currentPage));
      }
      (e.currentTarget as HTMLInputElement).blur();
    } else if (e.key === "Escape") {
      setPageInputValue(String(currentPage));
      (e.currentTarget as HTMLInputElement).blur();
    }
  };

  const handlePageInputBlur = () => {
    const parsed = parseInt(pageInputValue, 10);
    if (Number.isNaN(parsed)) {
      setPageInputValue(String(currentPage));
    } else {
      goToPage(parsed);
    }
  };

  // -------------------------------------------------------------------------
  // Zoom
  // -------------------------------------------------------------------------
  const zoomIn = useCallback(() => {
    setFitMode("manual");
    setScale((s) => snapZoomIn(s));
  }, []);

  const zoomOut = useCallback(() => {
    setFitMode("manual");
    setScale((s) => snapZoomOut(s));
  }, []);

  const setExactZoom = useCallback((value: number) => {
    setFitMode("manual");
    setScale(clamp(value, ZOOM_MIN, ZOOM_MAX));
  }, []);

  const zoomLabel = useMemo(() => {
    if (fitMode === "fit-width") return "Vừa rộng";
    if (fitMode === "fit-height") return "Vừa cao";
    return `${Math.round(scale * 100)}%`;
  }, [fitMode, scale]);

  // -------------------------------------------------------------------------
  // Fullscreen
  // -------------------------------------------------------------------------
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch((err) => {
        console.error("[PdfRenderer] Failed to enter fullscreen:", err);
      });
    } else {
      document.exitFullscreen().catch(() => {
        // ignore
      });
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // -------------------------------------------------------------------------
  // Download
  // -------------------------------------------------------------------------
  const handleDownload = useCallback(() => {
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = fileName?.trim() || "document.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [pdfUrl, fileName]);

  // -------------------------------------------------------------------------
  // Keyboard shortcuts (only when focus is inside this container or fullscreen)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const handler = (event: globalThis.KeyboardEvent) => {
      const focusInside =
        !!document.fullscreenElement ||
        containerRef.current?.contains(document.activeElement);
      if (!focusInside) return;
      // Don't hijack typing in the page-number input.
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      switch (event.key) {
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          event.preventDefault();
          goPrev();
          break;
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
        case " ":
          event.preventDefault();
          goNext();
          break;
        case "Home":
          event.preventDefault();
          goToPage(1);
          break;
        case "End":
          event.preventDefault();
          goToPage(numPages);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goPrev, goNext, goToPage, numPages]);

  // -------------------------------------------------------------------------
  // Page register helpers (used by <div ref> on each <Page>)
  // -------------------------------------------------------------------------
  const setPageRef = useCallback(
    (pageNum: number) => (el: HTMLDivElement | null) => {
      if (el) pageRefs.current.set(pageNum, el);
      else pageRefs.current.delete(pageNum);
    },
    [],
  );

  // Capture each page's logical pt size as it loads (react-pdf hands us the
  // pdf.js page proxy, which exposes getViewport).
  const handlePageLoadSuccess = useCallback(
    (page: {
      pageNumber: number;
      getViewport: (o: { scale: number }) => { width: number; height: number };
    }) => {
      try {
        const vp = page.getViewport({ scale: 1 });
        pagePtSizes.current.set(page.pageNumber, {
          width: vp.width,
          height: vp.height,
        });
      } catch {
        // Ignore — reverse sync simply won't fire for this page.
      }
    },
    [],
  );

  // Reverse sync: translate a click on a page wrapper into document-point
  // coordinates and hand them to the parent (which jumps the editor).
  const handlePageClick = useCallback(
    (pageNum: number, ev: MouseEvent<HTMLDivElement>) => {
      if (!onContentClick) return;
      // Don't hijack clicks on hyperlinks / annotations.
      if ((ev.target as HTMLElement | null)?.closest("a")) return;
      const ptSize = pagePtSizes.current.get(pageNum);
      if (!ptSize) return;
      const rect = ev.currentTarget.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const xPt = ((ev.clientX - rect.left) / rect.width) * ptSize.width;
      const yPt = ((ev.clientY - rect.top) / rect.height) * ptSize.height;
      onContentClick({ page: pageNum, xPt, yPt });
    },
    [onContentClick],
  );

  // -------------------------------------------------------------------------
  // Render — Document/Page tree from react-pdf
  // -------------------------------------------------------------------------
  const documentChildren = (() => {
    if (numPages === 0) return null;

    if (scrollView) {
      return Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
        <div
          key={pageNum}
          ref={setPageRef(pageNum)}
          data-page-number={pageNum}
          onClick={(e) => handlePageClick(pageNum, e)}
          title={onContentClick ? "Nhấp để tới vị trí tương ứng trong mã nguồn" : undefined}
          className={`mx-auto my-2 bg-white shadow-md${onContentClick ? " cursor-pointer" : ""}`}
        >
          <Page
            pageNumber={pageNum}
            scale={scale}
            devicePixelRatio={dpr}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            onLoadSuccess={handlePageLoadSuccess}
          />
        </div>
      ));
    }

    return (
      <div
        ref={setPageRef(currentPage)}
        data-page-number={currentPage}
        onClick={(e) => handlePageClick(currentPage, e)}
        title={onContentClick ? "Nhấp để tới vị trí tương ứng trong mã nguồn" : undefined}
        className={`mx-auto bg-white shadow-md${onContentClick ? " cursor-pointer" : ""}`}
      >
        <Page
          pageNumber={currentPage}
          scale={scale}
          devicePixelRatio={dpr}
          renderTextLayer={true}
          renderAnnotationLayer={true}
          onLoadSuccess={handlePageLoadSuccess}
        />
      </div>
    );
  })();

  return (
    <div
      ref={containerRef}
      className="flex h-full min-h-0 flex-col bg-slate-100"
      tabIndex={-1}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-2 py-1.5 shadow-sm">
        {/* Left: page navigation */}
        <div className="flex items-center gap-1">
          <div className="flex items-center rounded-md border border-slate-200 bg-white">
            <button
              type="button"
              onClick={goPrev}
              disabled={isLoading || currentPage <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-l-md text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#007bff]/30"
              title="Trang trước"
              aria-label="Trang trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1 border-x border-slate-200 px-2 py-1 text-xs text-slate-700">
              <input
                type="number"
                min={1}
                max={numPages || 1}
                value={pageInputValue}
                onChange={handlePageInputChange}
                onKeyDown={handlePageInputKeyDown}
                onBlur={handlePageInputBlur}
                disabled={isLoading || numPages === 0}
                className="w-10 rounded border border-slate-200 bg-white px-1 text-center text-xs focus:border-[#007bff] focus:outline-none"
                aria-label="Trang hiện tại"
              />
              <span className="text-slate-400">/</span>
              <span className="min-w-[1.25rem] text-center font-medium">{numPages || "—"}</span>
            </div>
            <button
              type="button"
              onClick={goNext}
              disabled={isLoading || currentPage >= numPages}
              className="flex h-8 w-8 items-center justify-center rounded-r-md text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#007bff]/30"
              title="Trang sau"
              aria-label="Trang sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Center: zoom & fit */}
        <div className="flex items-center gap-1">
          <div className="flex items-center rounded-md border border-slate-200 bg-white">
            <button
              type="button"
              onClick={zoomOut}
              disabled={isLoading}
              className="flex h-8 w-8 items-center justify-center rounded-l-md text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#007bff]/30"
              title="Thu nhỏ (-25%)"
              aria-label="Thu nhỏ"
            >
              <Minus className="h-4 w-4" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={isLoading}
                  className="flex h-8 min-w-[100px] items-center justify-center gap-1 border-x border-slate-200 px-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#007bff]/30"
                  aria-label="Chọn mức zoom"
                >
                  <span>{zoomLabel}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => setFitMode("fit-width")}>
                  Vừa chiều rộng
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFitMode("fit-height")}>
                  Vừa chiều cao
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {ZOOM_PRESETS.map((value) => (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => setExactZoom(value)}
                    className="justify-between"
                  >
                    <span>{Math.round(value * 100)}%</span>
                    {fitMode === "manual" && Math.abs(scale - value) < 0.001 ? (
                      <span className="text-[#007bff]">✓</span>
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              onClick={zoomIn}
              disabled={isLoading}
              className="flex h-8 w-8 items-center justify-center rounded-r-md text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#007bff]/30"
              title="Phóng to (+25%)"
              aria-label="Phóng to"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setFitMode("fit-width")}
            disabled={isLoading}
            className={`flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#007bff]/30 ${
              fitMode === "fit-width" ? "bg-blue-50 text-[#007bff]" : ""
            }`}
            title="Vừa chiều rộng"
            aria-label="Vừa chiều rộng"
          >
            <MoveHorizontal className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setFitMode("fit-height")}
            disabled={isLoading}
            className={`flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#007bff]/30 ${
              fitMode === "fit-height" ? "bg-blue-50 text-[#007bff]" : ""
            }`}
            title="Vừa chiều cao"
            aria-label="Vừa chiều cao"
          >
            <MoveVertical className="h-4 w-4" />
          </button>
        </div>

        {/* Right: view mode, fullscreen, download */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setScrollView((v) => !v)}
            disabled={isLoading}
            className={`flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#007bff]/30 ${
              scrollView ? "bg-blue-50 text-[#007bff]" : ""
            }`}
            title={scrollView ? "Đang xem cuộn (chuyển sang xem 1 trang)" : "Đang xem 1 trang (chuyển sang xem cuộn)"}
            aria-label="Đổi chế độ xem"
          >
            {scrollView ? <ScrollText className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            disabled={isLoading}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#007bff]/30"
            title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            aria-label="Toàn màn hình"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isLoading || !pdfUrl}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#007bff]/30"
            title={`Tải PDF${fileName ? ` (${fileName})` : ""}`}
            aria-label="Tải PDF"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* PDF viewport */}
      <div ref={scrollAreaRef} className="relative min-h-0 flex-1 overflow-auto bg-slate-200">
        {error ? (
          <div className="flex h-full items-center justify-center p-6">
            <div className="max-w-md text-center">
              <AlertCircle className="mx-auto size-8 text-red-500" />
              <div className="mt-3 text-sm font-medium text-slate-700">Không thể tải PDF</div>
              <div className="mt-2 text-xs text-slate-600">{error}</div>
            </div>
          </div>
        ) : (
          <>
            <Document
              file={documentFile}
              onLoadSuccess={handleDocumentLoadSuccess}
              onLoadError={handleDocumentLoadError}
              // `loading={null}` keeps react-pdf's internal swap silent: while
              // a new compile loads, nothing flashes in (no spinner, no text).
              // The first-compile spinner is owned by our own overlay below
              // (which only shows when there's no prior PDF to display).
              loading={null}
              error={
                <div className="flex h-full items-center justify-center p-6 text-sm text-red-600">
                  Không thể tải PDF
                </div>
              }
              className="flex min-h-full flex-col p-3"
            >
              {documentChildren}
            </Document>

            {/* First-compile overlay only — subsequent reloads stay quiet so
                the user doesn't see a flash on every keystroke. */}
            {isLoading && numPages === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-200/80 p-6">
                <div className="text-center">
                  <Loader2 className="mx-auto size-6 animate-spin text-slate-400" />
                  <div className="mt-2 text-xs text-slate-500">Đang tải PDF...</div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
