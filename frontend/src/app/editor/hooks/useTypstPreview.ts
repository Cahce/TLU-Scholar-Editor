import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "../state/editorStore";
import type { TypstPreviewClient } from "../services/TypstPreviewClient";
import { getTypstPreviewClient } from "../services/typstPreviewInstance";
import { recomputeSyncMap } from "../services/TypstSourceMapService";
import type { EditorDiagnostic } from "../types/diagnostics";
import type { SvgMode } from "../state/previewSettings";
import {
  createCompilePathMapping,
  restoreDiagnosticPaths,
} from "../utils/compilePathMapping";
import { nextEma } from "../utils/adaptiveDebounce";
import { contentHash } from "../services/workerSessionState";

interface UseTypstPreviewOptions {
  /**
   * Controls the SVG compile pipeline:
   *   - 'off'         → don't compile SVG (saves CPU when the user never opens
   *                     the Canvas(SVG) tab).
   *   - 'full'        → compile a complete SVG every keystroke.
   *   - 'incremental' → worker keeps a compile + render session alive and
   *                     reuses it between keystrokes (Phase 2).
   * Default: 'off' to preserve current behaviour.
   */
  svgMode?: SvgMode;
  /**
   * Whether the paged PDF compile runs each cycle. The workspace passes
   * false while the user looks at the Canvas(SVG) tab (and the detached PDF
   * popup is closed) so typing doesn't pay for a PDF nobody is watching —
   * spec typing-latency-and-follow-preview FT-2. Switching back to a PDF
   * surface triggers one immediate on-demand compile. Default: true.
   */
  pdfEnabled?: boolean;
}

/**
 * Hook for managing Typst preview compilation.
 * Debounces preview updates and manages worker lifecycle.
 *
 * Returns `pdfData` (raw bytes for instant client-side download), `pdfUrl`
 * (stable blob URL — ideal for `pdfjs.getDocument()`), and optionally
 * `svgString` (when `enableSvg` is set). The blob URL is automatically
 * revoked when a newer compile replaces it, on error, and on hook unmount.
 */
export function useTypstPreview(options: UseTypstPreviewOptions = {}): {
  pdfData: Uint8Array<ArrayBuffer> | null;
  pdfUrl: string | null;
  svgString: string | null;
  /**
   * True the first time SVG content lands after switching into incremental
   * mode (or after a session reset). Consumers can use this to choose between
   * "replace DOM" vs "patch DOM" — currently unused but already plumbed so
   * the Phase 2 DOM-patching can opt in without API churn.
   */
  svgIsFirstFrame: boolean;
  /** True while PDF compiles are being skipped (PDF surfaces hidden) — the
   * held pdfData/pdfUrl no longer reflect the latest edits. */
  pdfStale: boolean;
  isCompiling: boolean;
  error: string | null;
} {
  const { svgMode = "off", pdfEnabled = true } = options;

  const previewPath = useEditorStore((s) => s.previewPath);
  const files = useEditorStore((s) => s.files);
  const drafts = useEditorStore((s) => s.drafts);
  const setDiagnostics = useEditorStore((s) => s.setDiagnostics);
  const ensureDraftLoaded = useEditorStore((s) => s.ensureDraftLoaded);
  // NOTE: do NOT subscribe to `diagnostics` here — reading it reactively would
  // add it to the compilation effect's dependency list, causing an infinite loop:
  //   compile → setDiagnostics → diagnostics changes → effect re-runs → compile …
  // Instead, read the current value from the store imperatively inside the async
  // callback, where no React dependency tracking occurs.
  const getServerDiagnostics = () =>
    useEditorStore.getState().diagnostics.filter((d) => d.source === 'server');

  const [pdfData, setPdfData] = useState<Uint8Array<ArrayBuffer> | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [svgString, setSvgString] = useState<string | null>(null);
  const [svgIsFirstFrame, setSvgIsFirstFrame] = useState(true);
  const [pdfStale, setPdfStale] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<TypstPreviewClient | null>(null);
  const timerRef = useRef<number | null>(null);
  const compileSeqRef = useRef(0);
  const lastUrlRef = useRef<string | null>(null);
  // Adaptive debounce (FT-1): EMA of recent compile-cycle durations. Refs so
  // measurement never re-triggers the compile effect.
  const compileEmaRef = useRef<number | null>(null);
  const pdfStaleRef = useRef(false);
  const prevPdfEnabledRef = useRef(pdfEnabled);
  // Cheap fingerprint of the last PDF bytes we published. When a recompile
  // yields the same fingerprint (e.g. user typed a comment-only change), we
  // skip publishing a new blob URL so the PdfRenderer's <Document> doesn't
  // unmount + remount — which would otherwise reset scroll + flicker the page.
  // Pattern adapted from references/texlyre/extras/renderers/pdf/PdfRenderer.tsx:145.
  const lastPdfHashRef = useRef<string>("");
  // KC-G (spec: typst-preview-keystroke-cost): timestamp of the last heading
  // sync-map recompute. That recompute runs a SECOND full paged compile and
  // re-uploads the whole project (incl. images) — far too costly to do every
  // keystroke. Throttle it so a fast typing burst pays it at most ~once/sec;
  // reset to 0 on preview-file switch so the new file maps immediately.
  const lastSyncMapAtRef = useRef(0);
  // Fingerprint (path+contentHash of every compile file, plus preview/root) of
  // the last SUCCESSFUL compile. If the next cycle's fingerprint matches, the
  // content didn't actually change (e.g. the effect re-ran because autosave
  // mutated file metadata) — skip the whole compile+render instead of paying
  // ~190ms for an identical frame. Spec: typst-preview-keystroke-cost.
  const lastCompiledKeyRef = useRef<string>("");
  // "Live as you type" scheduler state (spec: typst-preview-keystroke-cost).
  // inFlightRef: a compile is currently running. pendingRef: content changed
  // and a compile is owed. cycleRef/tickRef/scheduleRef hold the latest compile
  // closure + the leading-edge, in-flight-aware scheduler (see the trigger
  // effect for the model).
  const inFlightRef = useRef(false);
  const pendingRef = useRef(false);
  // Did the last compile cycle fail? If so, don't let the no-op fingerprint
  // skip swallow the next cycle — we must recompile to clear the error banner
  // (e.g. user broke the doc then undid back to a previously-good frame).
  const lastCycleFailedRef = useRef(false);
  // Live across the component's life; flipped false on unmount so a compile that
  // resolves afterwards doesn't publish a blob URL (leak) or setState.
  const mountedRef = useRef(true);
  const cycleRef = useRef<() => Promise<void>>(async () => {});
  const tickRef = useRef<() => void>(() => {});
  const scheduleRef = useRef<(() => void) | null>(null);

  const revokeCurrentUrl = () => {
    if (lastUrlRef.current) {
      URL.revokeObjectURL(lastUrlRef.current);
      lastUrlRef.current = null;
    }
  };

  function pdfFingerprint(bytes: Uint8Array): string {
    // FNV-1a over the FULL byte range. The previous "head + tail + length"
    // sample was catastrophically bad for PDF: the format pins the leading
    // `%PDF-1.x` header and the trailing `startxref / %%EOF` block, so two
    // PDFs with completely different page content but the same byte length
    // would collide — yielding a "stale preview" symptom whenever the user
    // edited the middle of a same-sized document.
    //
    // FNV-1a is non-cryptographic but ample for "did anything change?" use,
    // and runs at ~500 MB/s in V8 — well under 1 ms for typical 200KB PDFs.
    const len = bytes.byteLength;
    if (len === 0) return "0";
    let h = 0x811c9dc5; // FNV offset basis (32-bit)
    for (let i = 0; i < len; i++) {
      h ^= bytes[i];
      h = Math.imul(h, 0x01000193); // FNV prime, wraps to int32
    }
    return `${len}|${(h >>> 0).toString(16)}`;
  }

  // Initialize client on mount.
  // We share a singleton TypstPreviewClient with the math preview widget so
  // both consumers reuse the same WASM-backed worker — see
  // `typstPreviewInstance.ts`. We DO NOT dispose it on unmount because other
  // subscribers (the math widget) may still be using it; the worker lives
  // for the page lifetime.
  // Leading-edge delay before the FIRST compile of a typing burst. Small,
  // because the in-flight gate (not this delay) is what prevents backlog: the
  // next compile only starts after the previous finishes.
  const SCHEDULE_LEAD_MS = 150;

  // Stable scheduler: arm a single leading-edge timer iff nothing is scheduled
  // or running. Reassigned `tickRef` below always calls the LATEST cycle.
  if (!scheduleRef.current) {
    scheduleRef.current = () => {
      if (inFlightRef.current || timerRef.current != null) return;
      timerRef.current = window.setTimeout(() => tickRef.current(), SCHEDULE_LEAD_MS);
    };
  }
  tickRef.current = () => {
    timerRef.current = null;
    if (!pendingRef.current || inFlightRef.current) return;
    pendingRef.current = false;
    inFlightRef.current = true;
    // `Promise.resolve().then(...)` so even a SYNCHRONOUS throw from the cycle
    // still routes through `.finally` and resets `inFlightRef` — otherwise a
    // throw before the first await would freeze the preview permanently.
    void Promise.resolve()
      .then(() => cycleRef.current())
      .catch(() => {})
      .finally(() => {
        inFlightRef.current = false;
        // Edits arrived while compiling → compile the latest content now.
        if (pendingRef.current) scheduleRef.current?.();
      });
  };

  useEffect(() => {
    mountedRef.current = true;
    clientRef.current = getTypstPreviewClient();

    return () => {
      // Don't dispose — shared instance.
      mountedRef.current = false;
      clientRef.current = null;
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      revokeCurrentUrl();
    };
  }, []);

  // Trigger preview compilation when preview path or content changes.
  //
  // "Live as you type" model (spec: typst-preview-keystroke-cost), like
  // typst.app — replaces the old "wait for a 750ms pause" debounce:
  //   - Each edit marks dirty and (leading-edge) arms a compile ~SCHEDULE_LEAD_MS
  //     later; it does NOT reset on every keystroke, so the first frame lands
  //     shortly after you START typing, not after you stop.
  //   - Only ONE compile runs at a time; edits made WHILE it runs re-fire a
  //     single follow-up on the latest content when it finishes. So the preview
  //     keeps moving during continuous typing — no backlog, no overlapping
  //     wasted compiles. (The WASM compile time itself remains the floor.)
  useEffect(() => {
    if (!previewPath || !clientRef.current) return;

    const draft = drafts[previewPath];
    const file = files[previewPath];

    if (!draft && !file?.textContent) {
      void ensureDraftLoaded(previewPath).catch(() => {});
      return;
    }

    // Reassign the cycle every render so the leading timer / re-fire always run
    // against the LATEST content + settings closure (previewPath, svgMode,
    // pdfEnabled, draft/file).
    cycleRef.current = async () => {
      const client = clientRef.current;
      if (!client) return;

      const currentSeq = ++compileSeqRef.current;

      setIsCompiling(true);
      setError(null);

      const cycleStart = performance.now();
      let activeDiagnosticPathMap: Record<string, string> | undefined;

      // Single publishing point for worker diagnostics (FT-2/AC-2.2): the
      // PDF compile publishes when it runs; otherwise the SVG compile owns
      // it. Exactly one branch publishes per cycle.
      const publishDiagnostics = (
        workerDiags: EditorDiagnostic[],
        pathMap: Record<string, string> | undefined,
      ): void => {
        const mapped = restoreDiagnosticPaths(workerDiags, pathMap);
        setDiagnostics([...getServerDiagnostics(), ...mapped]);
      };

      try {
        const compileFiles: Record<string, string | Uint8Array> = {};

        // First pass: collect binary files that we need bytes for but haven't
        // fetched yet (e.g. after a reload — bootstrap's listFiles returns
        // metadata only). Fetch them in parallel via the storage service so
        // `#image()` / font references resolve on the first post-reload compile.
        const BINARY_KINDS: ReadonlySet<string> = new Set([
          'image', 'vector', 'font', 'pdf',
        ]);
        const missingBinary = Object.values(files).filter(
          (f) => BINARY_KINDS.has(f.kind) && !f.binaryContent,
        );
        if (missingBinary.length > 0) {
          await Promise.all(
            missingBinary.map(async (f) => {
              try {
                const fresh = await useEditorStore
                  .getState()
                  .ensureBinaryLoaded?.(f.path);
                if (fresh) {
                  // ensureBinaryLoaded itself updates the store; nothing more
                  // to do — the next iteration of Object.entries(files) will
                  // see the populated binaryContent.
                }
              } catch (err) {
                console.warn('[useTypstPreview] Failed to load binary', f.path, err);
              }
            }),
          );
        }

        // Typst resolves includes, bibliographies, data files, and local
        // package files against the project VFS, not just the currently-open
        // editor tabs. TeXlyre/Tinymist feed the whole project snapshot into
        // the compiler; mirror that here by lazily loading missing text files
        // before building the compile map. This keeps first-preview behavior
        // correct for freshly imported multi-file zips.
        const beforeTextLoadState = useEditorStore.getState();
        const missingText = Object.values(beforeTextLoadState.files).filter(
          (f) =>
            !BINARY_KINDS.has(f.kind) &&
            f.textContent == null &&
            !beforeTextLoadState.drafts[f.path],
        );
        if (missingText.length > 0) {
          await Promise.all(
            missingText.map(async (f) => {
              try {
                await useEditorStore.getState().ensureDraftLoaded(f.path);
              } catch (err) {
                console.warn('[useTypstPreview] Failed to load text file', f.path, err);
              }
            }),
          );
        }

        // Re-read files map after potential binary fetch above so we see the
        // freshly-populated `binaryContent` and text drafts.
        const refreshedState = useEditorStore.getState();
        const refreshedFiles = refreshedState.files;
        const refreshedDrafts = refreshedState.drafts;
        for (const [path, fileData] of Object.entries(refreshedFiles)) {
          // Binary files (uploaded image / font / pdf) — pass raw bytes if
          // we have them. Without binaryContent, the compiler can't resolve
          // `#image("logo.png")` etc.
          if (fileData.binaryContent) {
            compileFiles[path] = fileData.binaryContent;
            continue;
          }
          const draftData = refreshedDrafts[path];
          if (draftData) {
            compileFiles[path] = draftData.content;
          } else if (fileData.textContent != null) {
            compileFiles[path] = fileData.textContent;
          }
        }

        if (draft) {
          compileFiles[previewPath] = draft.content;
        } else if (file?.textContent != null) {
          compileFiles[previewPath] = file.textContent;
        }

        const compileMapping = createCompilePathMapping(compileFiles, previewPath);
        activeDiagnosticPathMap = compileMapping.diagnosticPathMap;

        // Skip no-op cycles: if the full content fingerprint is identical to
        // the last SUCCESSFUL compile, nothing changed (the effect re-ran for a
        // non-content reason — autosave metadata, a sibling state update). The
        // preview already shows this exact frame, so don't recompile/re-render.
        const compileKey =
          `${previewPath}|${compileMapping.root ?? ""}|${compileMapping.mainFile}|` +
          Object.entries(compileMapping.files)
            .map(([p, c]) => `${p}:${contentHash(c)}`)
            .sort()
            .join(",");
        if (
          compileKey === lastCompiledKeyRef.current &&
          !lastCycleFailedRef.current
        ) {
          if (import.meta.env.DEV) {
            console.debug("[useTypstPreview] skip — content unchanged");
          }
          setIsCompiling(false);
          return;
        }

        console.log(
          `[useTypstPreview] Compile starting for ${previewPath} as ${compileMapping.mainFile}, root=${compileMapping.root}, files=${Object.keys(compileMapping.files).length}, rebase=${compileMapping.appliedRootPrefix ?? 'none'} (svgMode=${svgMode})`,
        );

        if (pdfEnabled) {
          const result = await client.compilePdf(
            compileMapping.files,
            compileMapping.mainFile,
            { root: compileMapping.root },
          );

          if (currentSeq !== compileSeqRef.current) {
            console.log('[useTypstPreview] Compilation superseded by newer request');
            return;
          }

          console.log(
            `[useTypstPreview] PDF compile resolved — bytes: ${result.pdf.byteLength}`,
          );

          const newHash = pdfFingerprint(result.pdf);
          const contentChanged = newHash !== lastPdfHashRef.current;

          if (contentChanged) {
            // Bytes differ → publish a fresh blob URL. Revoke the previous one
            // first so the old PDF can be garbage-collected. Bail if unmounted
            // mid-compile so we don't create a URL the cleanup already passed.
            if (!mountedRef.current) return;
            revokeCurrentUrl();
            const blob = new Blob([result.pdf], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            lastUrlRef.current = url;
            lastPdfHashRef.current = newHash;

            setPdfData(result.pdf);
            setPdfUrl(url);
          }
          // Identical bytes → keep pdfUrl unchanged so the PdfRenderer's
          // <Document> stays mounted (no scroll reset, no page-1 jump).
          setError(null);
          pdfStaleRef.current = false;
          setPdfStale(false);

          publishDiagnostics(result.diagnostics, compileMapping.diagnosticPathMap);
        } else {
          // PDF surfaces hidden (SVG tab active, popup closed) — skip the
          // paged compile entirely; keep the last good pdfData/pdfUrl on hand
          // but flag them stale (AC-2.6). Diagnostics come from the SVG
          // compile below.
          pdfStaleRef.current = true;
          setPdfStale(true);
        }

        // SVG compile follows the PDF compile (best-effort). Failure here
        // does not invalidate the PDF that's already on screen.
        if (svgMode === "full") {
          try {
            const svgResult = await client.compileSvg(
              compileMapping.files,
              compileMapping.mainFile,
              { root: compileMapping.root },
            );
            if (currentSeq !== compileSeqRef.current) return;
            setSvgString(svgResult.svg);
            setSvgIsFirstFrame(true); // Full mode: every result replaces the DOM.
            if (!pdfEnabled) {
              publishDiagnostics(svgResult.diagnostics, compileMapping.diagnosticPathMap);
            }
          } catch (svgErr) {
            if (currentSeq !== compileSeqRef.current) return;
            // SVG was the only compile this cycle → surface the failure via
            // the outer catch (keep-last-frame + diagnostics publishing).
            if (!pdfEnabled) throw svgErr;
            console.warn('[useTypstPreview] SVG compile failed:', svgErr);
            setSvgString(null);
          }
        } else if (svgMode === "incremental") {
          try {
            const svgResult = await client.compileSvgIncremental(
              compileMapping.files,
              compileMapping.mainFile,
              { root: compileMapping.root },
            );
            if (currentSeq !== compileSeqRef.current) return;
            setSvgString(svgResult.svg);
            setSvgIsFirstFrame(svgResult.isFirstFrame);
            if (!pdfEnabled) {
              publishDiagnostics(svgResult.diagnostics, compileMapping.diagnosticPathMap);
            }
          } catch (svgErr) {
            if (currentSeq !== compileSeqRef.current) return;
            console.warn('[useTypstPreview] Incremental SVG failed, falling back to full:', svgErr);
            // Graceful fallback: try the full path so the user still sees SVG.
            try {
              const fb = await client.compileSvg(
                compileMapping.files,
                compileMapping.mainFile,
                { root: compileMapping.root },
              );
              if (currentSeq !== compileSeqRef.current) return;
              setSvgString(fb.svg);
              setSvgIsFirstFrame(true);
              if (!pdfEnabled) {
                publishDiagnostics(fb.diagnostics, compileMapping.diagnosticPathMap);
              }
            } catch (fbErr) {
              if (currentSeq !== compileSeqRef.current) return;
              if (!pdfEnabled) throw fbErr;
              setSvgString(null);
            }
          }
        }

        // Phase 4 source mapping: refresh heading-level sync map. Fire-and-
        // forget — sync is a soft feature so failures must not affect the
        // preview pipeline. The service publishes via a singleton store that
        // useTypstSync subscribes to.
        //
        // KC-G: this runs a SECOND full paged compile in the worker and
        // re-uploads the whole project. Throttle it so a fast typing burst
        // doesn't double the compile cost (and re-send images) every
        // keystroke. Heading positions can lag a layout shift by up to this
        // window; the map self-heals on the next compile past the gate. The
        // preview itself is unaffected — it updates every cycle as before.
        const SYNC_MAP_MIN_INTERVAL_MS = 800;
        const mainSource = compileMapping.files[compileMapping.mainFile];
        const nowMs = performance.now();
        if (
          typeof mainSource === 'string' &&
          nowMs - lastSyncMapAtRef.current >= SYNC_MAP_MIN_INTERVAL_MS
        ) {
          lastSyncMapAtRef.current = nowMs;
          void recomputeSyncMap(
            client,
            compileMapping.files,
            compileMapping.mainFile,
            mainSource,
            compileMapping.root,
            compileMapping.diagnosticPathMap,
          );
        }

        // This frame is now on screen — remember its fingerprint so an
        // identical follow-up cycle is skipped above.
        lastCompiledKeyRef.current = compileKey;
        lastCycleFailedRef.current = false;

        // FT-1: feed this cycle's duration into the EMA driving the next
        // debounce. Only successful cycles update it — a one-off failure
        // shouldn't whiplash the cadence. CAP the sample so the one-off COLD
        // compile (worker init can take seconds) doesn't poison the EMA and pin
        // the debounce at its 750ms ceiling for the first dozen keystrokes.
        const cycleMs = performance.now() - cycleStart;
        compileEmaRef.current = nextEma(compileEmaRef.current, Math.min(cycleMs, 1200));
        if (import.meta.env.DEV) {
          console.log(
            `[useTypstPreview] cycle=${Math.round(cycleMs)}ms ema=${Math.round(
              compileEmaRef.current,
            )}ms lead=${SCHEDULE_LEAD_MS}ms pdf=${pdfEnabled}`,
          );
        }
      } catch (err) {
        if (currentSeq !== compileSeqRef.current) {
          return;
        }
        // Mark failed so the no-op fingerprint skip won't swallow the next
        // cycle — we must recompile to clear this error when content returns to
        // a previously-good state.
        lastCycleFailedRef.current = true;

        const errorMessage = err instanceof Error ? err.message : 'Preview compilation failed';
        setError(errorMessage);
        // PRESERVE the last successful pdfData / pdfUrl / svgString. Typst.app
        // and myriad-dreamin/typst.ts both keep the previous good frame on
        // screen while a non-blocking banner explains the current error — so
        // the user can read their document while fixing the issue. The banner
        // is driven by `error` + the diagnostics from the store.
        //
        // Force the next successful compile to publish a fresh URL even if its
        // bytes hash matches the still-displayed preview (e.g. user undoes the
        // broken edit and we land back on identical bytes).
        lastPdfHashRef.current = "";

        const clientDiagnostics: EditorDiagnostic[] = restoreDiagnosticPaths(
          (err as any).diagnostics ?? [],
          activeDiagnosticPathMap,
        );
        // Fallback: if the worker rejected without structured diagnostics
        // (rare — happens for non-parse failures like worker crashes), at
        // least surface the error message as a single diagnostic so the
        // Issues panel doesn't go silent.
        if (clientDiagnostics.length === 0 && errorMessage) {
          clientDiagnostics.push({
            source: 'client',
            severity: 'error',
            message: errorMessage,
            file: previewPath,
          });
        }
        setDiagnostics([...getServerDiagnostics(), ...clientDiagnostics]);

        console.error(
          `[useTypstPreview] Compile failed — ${clientDiagnostics.length} diagnostics, message:`,
          errorMessage,
          err,
        );
      } finally {
        if (currentSeq === compileSeqRef.current) {
          setIsCompiling(false);
        }
      }
    };

    // Mark dirty + schedule. FT-2/AC-2.3: when a PDF surface turns back on with
    // a stale PDF, compile immediately (the user is waiting on it).
    const pdfTurnedOn = pdfEnabled && !prevPdfEnabledRef.current;
    prevPdfEnabledRef.current = pdfEnabled;
    pendingRef.current = true;
    if (pdfTurnedOn && pdfStaleRef.current && !inFlightRef.current) {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      tickRef.current();
    } else {
      scheduleRef.current?.();
    }
    // No teardown: the leading-edge timer + in-flight refs intentionally persist
    // across re-renders (a keystroke must NOT reset a pending/running compile).
    // The mount effect's cleanup clears the timer on unmount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewPath, drafts, files, svgMode, pdfEnabled, setDiagnostics, ensureDraftLoaded]);

  // Switching mode at runtime should reset the first-frame marker so the next
  // landing render is treated as a "fresh" frame regardless of prior state.
  useEffect(() => {
    setSvgIsFirstFrame(true);
  }, [svgMode]);

  // KC-G: switching the previewed file invalidates the throttle gate so the
  // new file's heading sync map is rebuilt on its first compile, not up to a
  // throttle-window later.
  useEffect(() => {
    lastSyncMapAtRef.current = 0;
  }, [previewPath]);

  return {
    pdfData,
    pdfUrl,
    svgString,
    svgIsFirstFrame,
    pdfStale,
    isCompiling,
    error,
  };
}
