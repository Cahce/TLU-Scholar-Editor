import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist";
import { getPdfjs } from "../lib/pdfjsLoader";
import {
  ArrowLeftToLine,
  ChevronDown,
  ExternalLink,
  Loader2,
  Minus,
  Plus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { PdfRenderer } from "./PdfRenderer";
import {
  useTypstSync,
  type FollowTarget,
  type SyncHighlight,
} from "../hooks/useTypstSync";
import type { FrameLoc } from "../services/TypstSourceMapService";
import { patchSvgContainer } from "../services/SvgDomPatcher";
import { computeFollowScrollTop } from "../utils/previewScroll";

export type PreviewFormat = "pdf" | "canvas-pdf" | "canvas-svg";

type ZoomMode = "preset" | "fit-width" | "fit-height" | "fit-page";

interface ZoomState {
  mode: ZoomMode;
  value: number; // percentage (25..500)
}

interface ViewportMetrics {
  width: number;
  height: number;
}

interface CanvasSlot {
  canvas: HTMLCanvasElement;
  renderTask: RenderTask | null;
}

interface PreviewPaneProps {
  pdfUrl: string | null;
  svgString: string | null;
  /** True when `svgString` is a fresh full document (first incremental frame
   * or full mode) — the SVG view replaces page DOM instead of patching it. */
  svgIsFirstFrame?: boolean;
  isCompiling: boolean;
  error: string | null;
  activeFormat: PreviewFormat;
  onFormatChange: (format: PreviewFormat) => void;
  popupOpen: boolean;
  onPopupOpen: () => void;
  onPopupClose: () => void;
  /** Suggested filename for the PDF tab's download button (slugified project title). */
  downloadFileName?: string;
}

const ZOOM_STEP = 25; // percent
const ZOOM_MIN = 25;
const ZOOM_MAX = 500;
const ZOOM_PRESETS: number[] = [25, 50, 75, 100, 125, 150, 175, 200, 250, 300, 400, 500];

function clampZoom(value: number): number {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, value));
}

function snapToStep(value: number, direction: "in" | "out"): number {
  // Snap to the next/previous multiple of ZOOM_STEP so users always land on
  // 25/50/75/100... regardless of where fit-width put them.
  if (direction === "in") {
    return clampZoom(Math.floor(value / ZOOM_STEP) * ZOOM_STEP + ZOOM_STEP);
  }
  return clampZoom(Math.ceil(value / ZOOM_STEP) * ZOOM_STEP - ZOOM_STEP);
}

function getZoomLabel(zoom: ZoomState): string {
  if (zoom.mode === "preset") {
    return `${zoom.value}%`;
  }

  if (zoom.mode === "fit-height") {
    return "Vừa chiều cao";
  }

  if (zoom.mode === "fit-page") {
    return "Vừa trang";
  }

  return "Vừa chiều rộng";
}

function getFitWidthScale(
  viewport: ViewportMetrics,
  availableWidth: number,
): number {
  return Math.max(availableWidth / viewport.width, 0.1);
}

function getLogicalScale(
  viewport: ViewportMetrics,
  availableWidth: number,
  availableHeight: number,
  zoom: ZoomState,
): number {
  const fitWidthScale = getFitWidthScale(viewport, availableWidth);

  if (zoom.mode === "preset") {
    return fitWidthScale * (zoom.value / 100);
  }

  if (zoom.mode === "fit-height") {
    return Math.max(availableHeight / viewport.height, 0.1);
  }

  if (zoom.mode === "fit-page") {
    return Math.max(
      Math.min(
        availableWidth / viewport.width,
        availableHeight / viewport.height,
      ),
      0.1,
    );
  }

  return fitWidthScale;
}

// ---------------------------------------------------------------------------
// Canvas-PDF view (pdfjs) — handles its own document load + render lifecycle.
// ---------------------------------------------------------------------------
function CanvasPdfView({
  pdfUrl,
  zoom,
  onMetricsChange,
  setRenderError,
  onContentClick,
  followTarget,
}: {
  pdfUrl: string;
  zoom: ZoomState;
  onMetricsChange: (m: {
    viewport: ViewportMetrics;
    availableWidth: number;
    availableHeight: number;
  }) => void;
  setRenderError: (err: string | null) => void;
  onContentClick: (frame: FrameLoc) => void;
  followTarget: FollowTarget | null;
}): JSX.Element {
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const canvasRefs = useRef<Map<number, CanvasSlot>>(new Map());
  // Logical page size (pt) per page, captured during render so a click can be
  // converted into document-point coordinates for reverse sync (click-to-source).
  const pagePtSizes = useRef<Map<number, ViewportMetrics>>(new Map());
  // Follow-typing scroll (spec: typing-latency-and-follow-preview FT-6) —
  // same pause-on-manual-scroll contract as CanvasSvgView.
  const viewportElRef = useRef<HTMLDivElement | null>(null);
  const programmaticUntilRef = useRef(0);
  const userScrolledRef = useRef(false);
  const lastFollowTickRef = useRef(0);

  const updateContainerSize = useCallback((viewport: HTMLDivElement) => {
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    setContainerSize((prev) =>
      prev.width === width && prev.height === height
        ? prev
        : { width, height },
    );
  }, []);

  const setViewportRef = useCallback(
    (viewport: HTMLDivElement | null) => {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;

      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
      if (resizeTimerRef.current !== null) {
        clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = null;
      }

      viewportElRef.current = viewport;
      if (!viewport) return;

      updateContainerSize(viewport);
      resizeFrameRef.current = requestAnimationFrame(() => {
        resizeFrameRef.current = null;
        updateContainerSize(viewport);
      });

      // Debounce resize-driven re-renders: a panel-resize drag fires the
      // observer every frame, and each size change re-renders all PDF pages.
      // Coalesce into one update ~120ms after the drag settles.
      const observer = new ResizeObserver(() => {
        if (resizeTimerRef.current !== null) clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = setTimeout(() => {
          resizeTimerRef.current = null;
          updateContainerSize(viewport);
        }, 120);
      });
      observer.observe(viewport);
      resizeObserverRef.current = observer;
    },
    [updateContainerSize],
  );

  useEffect(() => {
    return () => {
      resizeObserverRef.current?.disconnect();
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
      }
      if (resizeTimerRef.current !== null) {
        clearTimeout(resizeTimerRef.current);
      }
    };
  }, []);

  // ---- LOAD pdf document ----
  useEffect(() => {
    let cancelled = false;
    let activeLoadingTask: PDFDocumentLoadingTask | null = null;
    let loadedDoc: PDFDocumentProxy | null = null;

    const loadPdf = async () => {
      try {
        const pdfjs = await getPdfjs();
        if (cancelled) return;

        const task = pdfjs.getDocument(pdfUrl);
        activeLoadingTask = task;

        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        const pdf = await Promise.race([
          task.promise,
          new Promise<never>((_, reject) => {
            timeoutId = setTimeout(
              () => reject(new Error("PDF load timeout (15s)")),
              15000,
            );
          }),
        ]);
        if (timeoutId !== null) clearTimeout(timeoutId);

        if (cancelled) {
          void pdf.destroy();
          return;
        }

        loadedDoc = pdf;
        setPdfDoc(pdf);
        setPageCount(pdf.numPages);
        setRenderError(null);
      } catch (err) {
        if (cancelled) return;
        console.error("[CanvasPdfView] PDF load error:", err);
        setRenderError(err instanceof Error ? err.message : "Không thể tải PDF");
        setPdfDoc(null);
        setPageCount(0);
      }
    };

    void loadPdf();

    return () => {
      cancelled = true;
      if (activeLoadingTask) {
        try {
          void activeLoadingTask.destroy();
        } catch {
          // Ignore.
        }
      }
      if (loadedDoc) {
        void loadedDoc.destroy();
      }
    };
  }, [pdfUrl, setRenderError]);

  // ---- RENDER pages ----
  //
  // Anti-flicker strategy: render each page into an OFF-SCREEN canvas first,
  // then `drawImage` the result onto the visible canvas. The visible canvas
  // never gets cleared during the brief "no content" window between
  // `canvas.width = ...` (which would erase pixels) and `await
  // renderTask.promise`. Result: while typing triggers recompile, the
  // previous page stays fully painted until the new render is ready, then
  // swaps in one frame instead of flashing white.
  useEffect(() => {
    if (!pdfDoc || !containerSize.width || !containerSize.height) return;

    const availableWidth = Math.max(containerSize.width - 32, 160);
    const availableHeight = Math.max(containerSize.height - 32, 160);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cancelled = false;

    canvasRefs.current.forEach((slot) => {
      if (slot.renderTask) {
        try {
          slot.renderTask.cancel();
        } catch {
          // Ignore.
        }
        slot.renderTask = null;
      }
    });

    const renderAllPages = async () => {
      try {
        for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber += 1) {
          if (cancelled) return;

          const slot = canvasRefs.current.get(pageNumber);
          if (!slot) continue;

          const page = await pdfDoc.getPage(pageNumber);
          if (cancelled) return;

          const baseViewport = page.getViewport({ scale: 1 });
          const pageMetrics: ViewportMetrics = {
            width: baseViewport.width,
            height: baseViewport.height,
          };
          pagePtSizes.current.set(pageNumber, pageMetrics);
          const logicalScale = getLogicalScale(
            pageMetrics,
            availableWidth,
            availableHeight,
            zoom,
          );
          const renderViewport = page.getViewport({ scale: logicalScale * dpr });

          if (pageNumber === 1) {
            onMetricsChange({
              viewport: pageMetrics,
              availableWidth,
              availableHeight,
            });
          }

          // Off-screen target. Setting width/height clears (only) the
          // off-screen canvas, leaving the visible one untouched.
          const offscreen = document.createElement("canvas");
          offscreen.width = renderViewport.width;
          offscreen.height = renderViewport.height;
          const offCtx = offscreen.getContext("2d");
          if (!offCtx) {
            throw new Error("Không thể khởi tạo vùng vẽ PDF");
          }

          const renderTask = page.render({
            canvasContext: offCtx,
            viewport: renderViewport,
          });
          slot.renderTask = renderTask;
          try {
            await renderTask.promise;
          } catch (renderErr) {
            const name = (renderErr as { name?: string })?.name;
            if (name === "RenderingCancelledException") {
              return;
            }
            throw renderErr;
          } finally {
            if (slot.renderTask === renderTask) {
              slot.renderTask = null;
            }
          }

          if (cancelled) return;

          // Atomic swap: resize visible canvas (clears it) and immediately
          // blit the freshly-rendered off-screen content in a single frame.
          // No `await` between these two steps — no flash window.
          const visible = slot.canvas;
          const visCtx = visible.getContext("2d");
          if (!visCtx) continue;
          visible.width = renderViewport.width;
          visible.height = renderViewport.height;
          visible.style.width = `${pageMetrics.width * logicalScale}px`;
          visible.style.height = `${pageMetrics.height * logicalScale}px`;
          visCtx.drawImage(offscreen, 0, 0);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("[CanvasPdfView] PDF rendering error:", err);
        setRenderError(err instanceof Error ? err.message : "Không thể hiển thị PDF");
      }
    };

    void renderAllPages();

    return () => {
      cancelled = true;
      canvasRefs.current.forEach((slot) => {
        if (slot.renderTask) {
          try {
            slot.renderTask.cancel();
          } catch {
            // Ignore.
          }
          slot.renderTask = null;
        }
      });
    };
  }, [pdfDoc, zoom, containerSize.width, containerSize.height, onMetricsChange, setRenderError]);

  const handleCanvasClick = (
    pageNumber: number,
    ev: React.MouseEvent<HTMLCanvasElement>,
  ): void => {
    const ptSize = pagePtSizes.current.get(pageNumber);
    if (!ptSize) return;
    const rect = ev.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const xPt = ((ev.clientX - rect.left) / rect.width) * ptSize.width;
    const yPt = ((ev.clientY - rect.top) / rect.height) * ptSize.height;
    onContentClick({ page: pageNumber, xPt, yPt });
  };

  const handleViewportScroll = (): void => {
    if (Date.now() < programmaticUntilRef.current) return;
    userScrolledRef.current = true;
  };

  // Follow-typing: scroll the viewport so the edited region's page band is
  // visible. Re-runs on new typing bursts and after pages re-render (doc /
  // zoom / container changes); the in-band check avoids jitter.
  useEffect(() => {
    if (!followTarget) return;
    const el = viewportElRef.current;
    if (!el) return;
    if (followTarget.typingTick !== lastFollowTickRef.current) {
      lastFollowTickRef.current = followTarget.typingTick;
      userScrolledRef.current = false;
    }
    if (userScrolledRef.current) return;
    const pageCanvas = canvasRefs.current.get(followTarget.page)?.canvas;
    if (!pageCanvas) return;
    const containerRect = el.getBoundingClientRect();
    const pageRect = pageCanvas.getBoundingClientRect();
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
  }, [pdfDoc, followTarget, zoom, containerSize]);

  return (
    <div
      ref={setViewportRef}
      onScroll={handleViewportScroll}
      className="min-h-0 flex-1 overflow-auto bg-slate-100"
    >
      <div className="min-h-full space-y-4 p-4">
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNumber) => (
          <canvas
            key={pageNumber}
            ref={(el) => {
              if (el) {
                const existing = canvasRefs.current.get(pageNumber);
                if (existing && existing.canvas === el) return;
                canvasRefs.current.set(pageNumber, {
                  canvas: el,
                  renderTask: null,
                });
              } else {
                const existing = canvasRefs.current.get(pageNumber);
                if (existing?.renderTask) {
                  try {
                    existing.renderTask.cancel();
                  } catch {
                    // Ignore.
                  }
                }
                canvasRefs.current.delete(pageNumber);
              }
            }}
            onClick={(e) => handleCanvasClick(pageNumber, e)}
            title="Nhấp để tới vị trí tương ứng trong mã nguồn"
            className="mx-auto block cursor-pointer bg-white shadow-lg"
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SVG view — renders a vector SVG string. Uses the CSS `zoom` property so the
// browser scales both visual size AND layout (so the overflow:auto container
// gives correct scrollbars at >100% zoom). `zoom` is supported in all evergreen
// browsers used by the target audience.
//
// Typst.ts emits ONE root <svg> whose height is the sum of all page heights;
// each page is a `<g class="typst-page" transform="translate(0, Y)">` group.
// To render each page as a separate white card (matching Canvas(PDF)), we
// split the SVG string into per-page self-contained SVGs and map them onto
// individual card divs. Pattern adapted from texlyre's
// `references/texlyre/extras/renderers/canvas/worker.ts` extractPages helper.
// ---------------------------------------------------------------------------

const SVG_ROOT_RE = /<svg\b[^>]*\swidth="([\d.]+)"[^>]*\sheight="([\d.]+)"[^>]*>/;
const SVG_PAGE_RE =
  /<g\b[^>]*\sclass="[^"]*\btypst-page\b[^"]*"[^>]*\stransform="translate\(\s*0\s*,\s*([\d.]+)\s*\)"[^>]*>/g;

function splitTypstSvgByPages(svg: string): string[] {
  try {
    const rootMatch = SVG_ROOT_RE.exec(svg);
    if (!rootMatch) return [svg];

    const rootWidth = rootMatch[1];
    const rootHeight = Number(rootMatch[2]);
    const headEnd = (rootMatch.index ?? 0) + rootMatch[0].length;
    const closingIdx = svg.lastIndexOf("</svg>");
    if (closingIdx < headEnd) return [svg];
    const inner = svg.slice(headEnd, closingIdx);

    // Find each page-group's opening tag + its absolute Y offset.
    SVG_PAGE_RE.lastIndex = 0;
    const openings: { start: number; tagEnd: number; offset: number }[] = [];
    let m: RegExpExecArray | null;
    while ((m = SVG_PAGE_RE.exec(inner)) !== null) {
      openings.push({
        start: m.index,
        tagEnd: m.index + m[0].length,
        offset: Number(m[1]),
      });
    }
    if (openings.length === 0) return [svg];

    // Carry top-level <defs> / <style> blocks (everything before the first
    // page group) into every page so glyph defs / CSS resolve in isolation.
    const sharedDefs = inner.slice(0, openings[0].start);

    // For each page, slice from its tag-end up to the start of the next page
    // (or end of inner for the last). The closing </g> of the page group is
    // included in that slice — we re-wrap with a fresh <g class="typst-page">.
    const pages: string[] = [];
    for (let i = 0; i < openings.length; i++) {
      const body = inner.slice(
        openings[i].tagEnd,
        i + 1 < openings.length ? openings[i + 1].start : inner.length,
      );
      const top = openings[i].offset;
      const bottom =
        i + 1 < openings.length ? openings[i + 1].offset : rootHeight;
      const height = Math.max(bottom - top, 1);
      pages.push(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${rootWidth}" height="${height}" viewBox="0 0 ${rootWidth} ${height}">` +
          sharedDefs +
          `<g class="typst-page">${body}` +
          // The original closing </g> for this page group is somewhere inside
          // `body` — leave it in place; the appended `</svg>` closes the new
          // root. If `body` happens to include trailing content past the
          // page's </g>, that's harmless for rendering.
          `</svg>`,
      );
    }
    return pages;
  } catch {
    return [svg];
  }
}

function CanvasSvgView({
  svg,
  svgIsFirstFrame,
  zoomPercent,
  highlightRegion,
  followTarget,
  onContentClick,
}: {
  svg: string;
  svgIsFirstFrame: boolean;
  zoomPercent: number;
  highlightRegion: SyncHighlight | null;
  followTarget: FollowTarget | null;
  onContentClick: (frame: FrameLoc, opts?: { text?: string }) => void;
}): JSX.Element {
  const pages = useMemo(() => splitTypstSvgByPages(svg), [svg]);
  // Per-page logical size (pt) parsed from each page SVG's viewBox. Height
  // feeds the forward-sync overlay; both dims size the virtualization
  // placeholder so off-screen (unmounted) pages reserve the exact box and the
  // scrollbar never jumps (spec: typst-preview-keystroke-cost KC-C).
  const pageDims = useMemo(() => pages.map((p) => parseSvgViewBox(p)), [pages]);
  const pageHeights = useMemo(
    () => pageDims.map((d) => d?.height ?? null),
    [pageDims],
  );

  // KC-C viewport virtualization: only pages in/near the viewport are mounted
  // and patched; the rest are height-reserved placeholders. This keeps the
  // per-keystroke DOM cost ~constant regardless of document length — the worker
  // still renders the whole document, but we stop patching every page's SVG on
  // the main thread each frame. Seed the first pages so the top paints before
  // the IntersectionObserver's first callback.
  const [visiblePages, setVisiblePages] = useState<Set<number>>(
    () => new Set([0, 1, 2]),
  );

  // ── Follow-typing scroll (spec: typing-latency-and-follow-preview FT-5) ──
  // Scrolls the canvas so the region being edited stays in view. Manual
  // scrolling pauses following until the NEXT typing burst (a new typingTick
  // re-arms it); our own smooth scroll is masked out via a time window so it
  // doesn't count as a manual scroll.
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const programmaticUntilRef = useRef(0);
  const userScrolledRef = useRef(false);
  const lastFollowTickRef = useRef(0);

  const handleContainerScroll = (): void => {
    if (Date.now() < programmaticUntilRef.current) return;
    userScrolledRef.current = true;
  };

  useEffect(() => {
    if (!followTarget) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    if (followTarget.typingTick !== lastFollowTickRef.current) {
      lastFollowTickRef.current = followTarget.typingTick;
      userScrolledRef.current = false;
    }
    if (userScrolledRef.current) return;
    const pageEl = container.querySelectorAll<HTMLElement>(
      ".cm-typst-svg-page",
    )[followTarget.page - 1];
    if (!pageEl) return;
    const containerRect = container.getBoundingClientRect();
    const pageRect = pageEl.getBoundingClientRect();
    const top = computeFollowScrollTop({
      containerScrollTop: container.scrollTop,
      containerHeight: container.clientHeight,
      pageTop: pageRect.top - containerRect.top + container.scrollTop,
      pageRenderedHeight: pageRect.height,
      yPt: followTarget.yPt,
      pageHeightPt: pageHeights[followTarget.page - 1] ?? null,
    });
    if (top == null) return;
    programmaticUntilRef.current = Date.now() + 800;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    container.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
    // Re-runs both when a new typing burst lands (tick) and when the fresh
    // frame is applied (svg) — the second pass corrects against the updated
    // layout and usually no-ops thanks to the in-band check.
  }, [svg, followTarget, pageHeights]);

  // KC-C: track which page wrappers are in (or near) the viewport so only those
  // are mounted/patched. Runs in a layout effect on page-COUNT or zoom change
  // (content-only frames reuse the same wrapper elements by key, so their
  // observation stays valid):
  //   1. A SYNCHRONOUS pass computes visibility from real geometry BEFORE paint
  //      — so a tall viewport mounts the right pages on the first frame (no
  //      blank-card flash) and indices for pages that no longer exist are
  //      pruned (avoids force-mounting tail pages when a doc shrinks then
  //      regrows during typing).
  //   2. An IntersectionObserver then maintains the set incrementally as the
  //      user scrolls. The pre-mount band is ~1.5 viewport-heights (screen px,
  //      so it stays ~constant in PAGES across CSS-zoom levels) — scrolling
  //      never reveals a blank and a reverse-sync click always hits a mounted
  //      <svg>.
  useLayoutEffect(() => {
    const root = scrollContainerRef.current;
    if (!root) return;
    const wrappers = Array.from(
      root.querySelectorAll<HTMLElement>(".cm-typst-svg-page"),
    );
    const margin = Math.max(1200, Math.round((root.clientHeight || 0) * 1.5));

    const computeVisible = (): Set<number> => {
      const rootRect = root.getBoundingClientRect();
      const lo = rootRect.top - margin;
      const hi = rootRect.bottom + margin;
      const next = new Set<number>();
      for (const el of wrappers) {
        const i = Number(el.dataset.pageIndex);
        if (Number.isNaN(i)) continue;
        const r = el.getBoundingClientRect();
        if (r.bottom >= lo && r.top <= hi) next.add(i);
      }
      return next;
    };
    setVisiblePages(computeVisible());

    if (typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        setVisiblePages((prev) => {
          let next: Set<number> | null = null;
          for (const e of entries) {
            const attr = (e.target as HTMLElement).dataset.pageIndex;
            if (attr == null) continue;
            const i = Number(attr);
            if (e.isIntersecting && !prev.has(i)) (next ??= new Set(prev)).add(i);
            else if (!e.isIntersecting && prev.has(i)) (next ??= new Set(prev)).delete(i);
          }
          return next ?? prev;
        });
      },
      { root, rootMargin: `${margin}px 0px ${margin}px 0px`, threshold: 0 },
    );
    wrappers.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [pages.length, zoomPercent]);

  // Always keep the follow-typing target page mounted so the band + scroll land
  // on real content even before the observer catches up after a jump.
  useEffect(() => {
    if (!followTarget) return;
    const i = followTarget.page - 1;
    setVisiblePages((prev) => (prev.has(i) ? prev : new Set(prev).add(i)));
  }, [followTarget]);

  /**
   * Convert a click on the page wrapper into Typst-output coordinates.
   * The injected SVG's `viewBox` (or `width`/`height` attribute) gives the
   * logical page size in pt; we use the wrapper's bounding box for pixels.
   */
  const handlePageClick = (
    pageIdx: number,
    ev: React.MouseEvent<HTMLDivElement>,
  ): void => {
    const wrapper = ev.currentTarget;
    const svgEl = wrapper.querySelector('svg');
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    if (rect.height <= 0 || rect.width <= 0) return;
    const localY = ev.clientY - rect.top;
    const localX = ev.clientX - rect.left;
    if (localY < 0 || localY > rect.height || localX < 0 || localX > rect.width) {
      return;
    }
    const size = parseSvgPtSize(svgEl);
    if (!size) return;
    const xPt = (localX / rect.width) * size.width;
    const yPt = (localY / rect.height) * size.height;

    // Precise sync: typst.ts renders each text run as a `.typst-text` group whose
    // `.tsel` overlay carries the plain text. If the click landed on a text run,
    // pass that text so useTypstSync can locate the exact source line instead of
    // only the section heading.
    // Use the whole visual line's text (not just the clicked glyph run) so the
    // source matcher has prose context — robust for citations/math/numbers.
    const runText = clickedLineText(svgEl, ev.target as Element, ev.clientX, ev.clientY);

    onContentClick(
      { page: pageIdx + 1, xPt, yPt },
      runText ? { text: runText } : undefined,
    );
  };

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleContainerScroll}
      className="min-h-0 flex-1 overflow-auto bg-slate-100"
    >
      <div
        className="min-h-full space-y-4 p-4"
        style={{ zoom: `${zoomPercent}%` }}
      >
        {pages.map((pageSvg, idx) => {
          const isHighlightPage =
            highlightRegion !== null && highlightRegion.page === idx + 1;
          const dims = pageDims[idx];
          const visible = visiblePages.has(idx);
          // Reserve the page's intrinsic box (px == pt for typst SVG) so an
          // unmounted placeholder holds exactly the same layout — no scroll
          // jump on mount/unmount. CSS `zoom` on the column scales it. Fallback
          // to A4 when the viewBox couldn't be parsed.
          const reserve = {
            width: dims?.width ?? 595,
            height: dims?.height ?? 842,
          };
          return (
            <div
              key={idx}
              data-page-index={idx}
              className="cm-typst-svg-page relative mx-auto block cursor-pointer bg-white shadow-lg"
              style={reserve}
              onClick={(e) => handlePageClick(idx, e)}
            >
              <SvgPageHost
                // Off-screen pages get a STABLE empty string so the memoized
                // host skips re-render entirely (KC-C: off-screen ≈ zero cost).
                pageSvg={visible ? pageSvg : ""}
                forceReplace={svgIsFirstFrame}
                visible={visible}
              />
              {isHighlightPage && (
                <SyncOverlay
                  yPt={highlightRegion!.yPt}
                  heightPt={highlightRegion!.heightPt}
                  pageHeightPt={pageHeights[idx]}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * One preview page rendered OUTSIDE React's reconciler: the host div is
 * filled imperatively so incremental frames can PATCH the live SVG DOM in
 * place (spec: typst-incremental-preview IP-10) instead of swapping
 * innerHTML — unchanged glyph groups keep their DOM nodes, which avoids
 * re-parse/re-paint of untouched content and keeps text selection stable.
 * Full frames (`forceReplace` — full mode or an incremental first frame /
 * session reset) replace wholesale, which is also the patcher's fallback.
 *
 * React renders the host div with NO children, so it never fights the
 * imperative updates; the effect re-runs only when the page string changes.
 */
const SvgPageHost = memo(function SvgPageHost({
  pageSvg,
  forceReplace,
  visible,
}: {
  pageSvg: string;
  forceReplace: boolean;
  /** KC-C: only mount/patch when in (or near) the viewport. */
  visible: boolean;
}): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  const forceRef = useRef(forceReplace);
  forceRef.current = forceReplace;
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  useLayoutEffect(() => {
    const host = ref.current;
    if (!host) return;
    // Off-screen: don't patch. Drop any content it held so the DOM stays small
    // (the parent reserves the page box, so this never shifts scroll). When it
    // scrolls back, the `!firstElementChild` branch re-fills from the latest
    // frame.
    if (!visibleRef.current) {
      if (host.firstElementChild) host.innerHTML = "";
      return;
    }
    if (forceRef.current || !host.firstElementChild) {
      host.innerHTML = pageSvg;
      return;
    }
    const t0 = performance.now();
    const stats = patchSvgContainer(host, pageSvg);
    if (import.meta.env.DEV) {
      console.debug(
        `[CanvasSvg] page ${stats.mode}: reused=${stats.reused} created=${stats.created} ` +
          `removed=${stats.removed} in ${Math.round(performance.now() - t0)}ms`,
      );
    }
  }, [pageSvg, visible]);

  // `[&>svg]:block` makes the injected SVG a block box (no inline descender
  // gap) so its height matches the parent's reserved page height exactly.
  return <div ref={ref} className="[&>svg]:block" />;
});

/**
 * Pull the logical page size (pt) from a rendered SVG element. typst.ts emits
 * both `viewBox="0 0 W H"` and explicit `width`/`height` attributes; we prefer
 * viewBox because it's unitless within the SVG's user space.
 */
function parseSvgPtSize(svg: SVGSVGElement): ViewportMetrics | null {
  const vb = svg.getAttribute('viewBox');
  if (vb) {
    const parts = vb.trim().split(/\s+/);
    if (parts.length === 4) {
      const w = parseFloat(parts[2]);
      const h = parseFloat(parts[3]);
      if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) {
        return { width: w, height: h };
      }
    }
  }
  const w = parseFloat(svg.getAttribute('width') ?? '');
  const h = parseFloat(svg.getAttribute('height') ?? '');
  if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) {
    return { width: w, height: h };
  }
  return null;
}

/**
 * Parse the logical page size (pt) from a per-page SVG *string* (used for the
 * overlay memo before the SVG is mounted). `splitTypstSvgByPages` always writes
 * `viewBox="0 0 W H"`, so a cheap regex suffices.
 */
function parseSvgViewBox(svgString: string): ViewportMetrics | null {
  const m = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svgString);
  if (!m) return null;
  const w = parseFloat(m[1]);
  const h = parseFloat(m[2]);
  if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) {
    return { width: w, height: h };
  }
  return null;
}

/**
 * Read the plain text of a typst.ts text-run group (`.typst-text` → `.tsel`).
 */
function runTextOf(el: Element | null): string {
  if (!el) return '';
  return (el.querySelector('.tsel')?.textContent ?? el.textContent ?? '').trim();
}

/**
 * Resolve a click into the TEXT OF THE WHOLE VISUAL LINE under (or nearest to)
 * the cursor, joined left-to-right.
 *
 * Why the line, not just the clicked glyph run: a single short run is ambiguous
 * — a citation renders as "[1]" (source is `@key`, so "[1]" only matches an
 * unrelated `[1]` table cell) and math renders as glyphs absent from source.
 * The surrounding line gives the source matcher enough prose to land correctly.
 * typst.ts only hit-tests glyph bboxes (`pointer-events: bounding-box`), so a
 * gap click has no element under it — we snap to the nearest run, then collect
 * its line. All `getBoundingClientRect` reads share one layout pass → cheap.
 */
function clickedLineText(
  pageSvg: Element,
  target: Element,
  clientX: number,
  clientY: number,
): string {
  const runs = Array.from(pageSvg.querySelectorAll('.typst-text')).map((el) => ({
    el,
    rect: el.getBoundingClientRect(),
  }));
  if (runs.length === 0) return '';

  let anchor: Element | null = target.closest?.('.typst-text') ?? null;
  if (!anchor) {
    let bestDist = Infinity;
    for (const { el, rect } of runs) {
      if (rect.width === 0 && rect.height === 0) continue;
      const dx = clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0;
      const dy = clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        anchor = el;
      }
    }
  }
  if (!anchor) return '';

  const ar = anchor.getBoundingClientRect();
  const midY = (ar.top + ar.bottom) / 2;
  const line = runs
    .filter(({ rect }) => rect.height > 0 && midY >= rect.top && midY <= rect.bottom)
    .sort((a, b) => a.rect.left - b.rect.left)
    .map(({ el }) => runTextOf(el))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return line || runTextOf(anchor);
}

/**
 * Yellow band overlay marking the cursor's current section in the preview.
 * Positioned absolutely over the SVG page wrapper; ignores pointer events so
 * clicks pass through to the underlying click handler.
 */
function SyncOverlay({
  yPt,
  heightPt,
  pageHeightPt,
}: {
  yPt: number;
  heightPt: number;
  /** Real page height (pt) from the SVG viewBox; null when unknown. */
  pageHeightPt: number | null;
}): JSX.Element | null {
  // Express the band position as a percentage of the page height so it lines up
  // at any zoom. Use the real page height parsed from the SVG viewBox; fall
  // back to A4 (842pt) only when the size is unknown.
  const pageH = pageHeightPt && pageHeightPt > 0 ? pageHeightPt : 842;
  const topPct = (yPt / pageH) * 100;
  const heightPct = (heightPt / pageH) * 100;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-0 right-0 rounded bg-yellow-300/40 transition-opacity"
      style={{ top: `${topPct}%`, height: `${heightPct}%` }}
    />
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function PreviewPane({
  pdfUrl,
  svgString,
  svgIsFirstFrame = true,
  isCompiling,
  error,
  activeFormat,
  onFormatChange,
  popupOpen,
  onPopupOpen,
  onPopupClose,
  downloadFileName,
}: PreviewPaneProps): JSX.Element {
  const [renderError, setRenderError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<ZoomState>({ mode: "preset", value: 100 });
  // Reverse sync (click preview → jump editor) + forward-sync highlight. Lifted
  // to the top so every preview mode (PDF / Canvas(PDF) / SVG) shares one
  // instance instead of each view subscribing independently.
  const { highlightRegion, followTarget, jumpFromPreviewClick } = useTypstSync();
  const firstPageMetricsRef = useRef<{
    viewport: ViewportMetrics;
    availableWidth: number;
    availableHeight: number;
  } | null>(null);

  const zoomLabel = useMemo(() => getZoomLabel(zoom), [zoom]);

  const handleMetricsChange = useCallback(
    (m: {
      viewport: ViewportMetrics;
      availableWidth: number;
      availableHeight: number;
    }) => {
      firstPageMetricsRef.current = m;
    },
    [],
  );

  const stepPresetZoom = (direction: "in" | "out") => {
    const metrics = firstPageMetricsRef.current;

    if (zoom.mode !== "preset" && metrics) {
      // Convert fit-* effective scale back to a percent, then snap to step.
      const effectiveScale = getLogicalScale(
        metrics.viewport,
        metrics.availableWidth,
        metrics.availableHeight,
        zoom,
      );
      const fitWidthScale = getFitWidthScale(
        metrics.viewport,
        metrics.availableWidth,
      );
      const effectivePercent = Math.round((effectiveScale / fitWidthScale) * 100);
      setZoom({ mode: "preset", value: snapToStep(effectivePercent, direction) });
      return;
    }

    setZoom((current) => ({
      mode: "preset",
      value:
        direction === "in"
          ? clampZoom(current.value + ZOOM_STEP)
          : clampZoom(current.value - ZOOM_STEP),
    }));
  };

  // Header — always rendered. Body switches based on popupOpen / format / state.
  const headerContent = (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2">
      {/* Single preview surface (typst.app-style). The PDF / Canvas(PDF) /
          Canvas(SVG) switcher was removed — the pane always shows the fast
          incremental Canvas (SVG); PDF is on-demand via the popup + Export. */}
      <div className="text-sm font-medium text-slate-700">Xem trước</div>

      <div className="flex items-center gap-2">
        {activeFormat !== "pdf" && (
          <div className="flex items-center rounded-md border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => stepPresetZoom("out")}
              className="flex h-9 w-9 items-center justify-center rounded-l-md text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007bff]/30"
              title="Thu nhỏ (-25%)"
              aria-label="Thu nhỏ"
            >
              <Minus className="h-4 w-4" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-9 min-w-[132px] items-center justify-center gap-2 border-x border-slate-200 px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#007bff]/30"
                  aria-label="Tùy chọn thu phóng"
                >
                  <span>{zoomLabel}</span>
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {activeFormat === "canvas-pdf" && (
                  <>
                    <DropdownMenuItem
                      onClick={() => setZoom({ mode: "fit-width", value: 100 })}
                    >
                      Vừa chiều rộng
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setZoom({ mode: "fit-height", value: 100 })}
                    >
                      Vừa chiều cao
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setZoom({ mode: "fit-page", value: 100 })}
                    >
                      Vừa trang
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {ZOOM_PRESETS.map((value) => (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => setZoom({ mode: "preset", value })}
                    className="justify-between"
                  >
                    <span>{value}%</span>
                    {zoom.mode === "preset" && zoom.value === value ? (
                      <span className="text-[#007bff]">*</span>
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              onClick={() => stepPresetZoom("in")}
              className="flex h-9 w-9 items-center justify-center rounded-r-md text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007bff]/30"
              title="Phóng to (+25%)"
              aria-label="Phóng to"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}

        {!popupOpen ? (
          <button
            type="button"
            onClick={onPopupOpen}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007bff]/30"
            title="Mở bản xem trước trong cửa sổ mới"
            aria-label="Mở popup xem trước"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onPopupClose}
            className="flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-[#007bff] shadow-sm transition-colors hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-[#007bff]/30"
            title="Đóng popup và hiển thị bản xem trước tại đây"
            aria-label="Đưa bản xem trước về cửa sổ chính"
          >
            <ArrowLeftToLine className="h-4 w-4" />
            Đưa về
          </button>
        )}
      </div>
    </div>
  );

  // Popup-open mode: hide preview body, show placeholder + "Đưa về" CTA.
  if (popupOpen) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-slate-100">
        {headerContent}
        <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-50 p-6">
          <div className="max-w-sm text-center">
            <ExternalLink className="mx-auto size-8 text-[#007bff]" />
            <div className="mt-3 text-sm font-medium text-slate-700">
              Bản xem trước đang ở cửa sổ riêng
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Đóng cửa sổ popup hoặc bấm "Đưa về" để hiển thị lại tại đây.
            </div>
            <button
              type="button"
              onClick={onPopupClose}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#007bff] px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#0069d9]"
            >
              <ArrowLeftToLine className="h-4 w-4" />
              Đưa về
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state (only on first compile — afterwards the previous output stays).
  if (isCompiling && !pdfUrl && !svgString) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-slate-100">
        {headerContent}
        <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-50 p-6">
          <div className="text-center">
            <Loader2 className="mx-auto size-8 animate-spin text-slate-400" />
            <div className="mt-3 text-sm font-medium text-slate-700">
              Đang tạo bản xem trước...
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Quá trình này có thể mất vài giây
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Errors are NEVER shown in the preview pane any more — they live in the
  // Issues panel exclusively. The preview either shows the last good output
  // or, if there's nothing to show yet, an empty hint. Render errors from
  // pdfjs (file corruption) still surface inline below as a small note,
  // because those aren't compilation errors and the Issues panel doesn't
  // cover them.
  if (!pdfUrl && !svgString) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-slate-100">
        {headerContent}
        <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-50 p-6">
          <div className="text-center">
            <div className="text-sm font-medium text-slate-700">
              Chưa có bản xem trước
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Chọn một tệp Typst để xem trước
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-100">
      {headerContent}

      {activeFormat === "pdf" && pdfUrl && (
        <div className="min-h-0 flex-1 overflow-hidden">
          <PdfRenderer
            pdfUrl={pdfUrl}
            fileName={downloadFileName}
            onContentClick={jumpFromPreviewClick}
            followTarget={followTarget}
          />
        </div>
      )}

      {activeFormat === "canvas-pdf" && pdfUrl && (
        <CanvasPdfView
          pdfUrl={pdfUrl}
          zoom={zoom}
          onMetricsChange={handleMetricsChange}
          setRenderError={setRenderError}
          onContentClick={jumpFromPreviewClick}
          followTarget={followTarget}
        />
      )}

      {activeFormat === "canvas-svg" && (
        <>
          {svgString ? (
            <CanvasSvgView
              svg={svgString}
              svgIsFirstFrame={svgIsFirstFrame}
              zoomPercent={zoom.mode === "preset" ? zoom.value : 100}
              highlightRegion={highlightRegion}
              followTarget={followTarget}
              onContentClick={jumpFromPreviewClick}
            />
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-50 p-6">
              <div className="text-center">
                <Loader2 className="mx-auto size-6 animate-spin text-slate-400" />
                <div className="mt-3 text-sm text-slate-600">
                  Đang dựng SVG...
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
