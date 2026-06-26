/**
 * Bibliography Format Detection (frontend mirror of
 * backend/src/modules/bibliography/domain/BibliographyPath.ts).
 *
 * Path-based: extension only, never reads file content. Used for UI logic
 * (sync dialog validation, target auto-detect) and for tagging which
 * format a bibliography file uses. The actual parse/serialize lives in
 * backend (Zotero/OpenAlex sync) and in tinymist-wasm (citation
 * autocomplete in the editor).
 */

export type BibFormat = "bibtex" | "hayagriva";

export function detectBibFormat(path: string): BibFormat | null {
  const ext = path.toLowerCase().split(".").pop() ?? "";
  if (ext === "bib") return "bibtex";
  if (ext === "yml" || ext === "yaml") return "hayagriva";
  return null;
}

export function isBibPath(path: string): boolean {
  return detectBibFormat(path) !== null;
}

export function formatLabel(fmt: BibFormat): string {
  return fmt === "bibtex" ? "BibTeX" : "Hayagriva YAML";
}
