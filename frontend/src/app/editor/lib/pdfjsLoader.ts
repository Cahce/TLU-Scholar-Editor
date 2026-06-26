// Use the local Vite-bundled worker (matches both reference repos:
// typst-online-editor uses CDN, texlyre uses ?url import; we follow texlyre's
// approach for offline reliability).
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

type PdfjsModule = typeof import("pdfjs-dist");

let pdfjsPromise: Promise<PdfjsModule> | null = null;

/**
 * Lazily import pdfjs-dist and configure its global worker exactly once.
 *
 * Pattern adapted from
 * `references/typst-online-editor/src/lib/pdf/pdfjs.ts` — guarantees the
 * 1.2 MB pdf.worker.min.mjs is fetched a single time per tab, regardless of
 * how many components await the module.
 */
export function getPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((mod) => {
      if (!mod.GlobalWorkerOptions.workerSrc) {
        mod.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
      }
      return mod;
    });
  }
  return pdfjsPromise;
}
