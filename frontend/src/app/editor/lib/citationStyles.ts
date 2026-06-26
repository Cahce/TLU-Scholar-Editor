/**
 * Citation styles for `#bibliography(style: …)`.
 *
 * Typst's `style:` argument accepts either a built-in style name OR a path to a
 * project `.csl` (Citation Style Language) file. This module exposes the
 * curated list of common built-in names plus a `.csl` path detector so the
 * bibliography panel can offer both in one picker.
 *
 * Note: Typst does NOT use LaTeX `.cls` class files — custom styles are `.csl`.
 */

export interface CitationStyleOption {
  /** Value written into the source `style:` argument. */
  value: string;
  /** Human label shown in the picker. */
  label: string;
}

/**
 * Common built-in Typst citation styles. Not exhaustive — Typst ships many more
 * and the user can still hand-write any value in source; this is the curated
 * shortlist surfaced in the UI.
 */
export const BUILTIN_CITATION_STYLES: CitationStyleOption[] = [
  { value: "ieee", label: "IEEE" },
  { value: "apa", label: "APA" },
  { value: "mla", label: "MLA" },
  { value: "chicago-author-date", label: "Chicago (tác giả – năm)" },
  { value: "chicago-notes", label: "Chicago (ghi chú)" },
  { value: "vancouver", label: "Vancouver" },
  { value: "harvard-cite-them-right", label: "Harvard" },
  { value: "council-of-science-editors", label: "CSE" },
];

/** True when the path points at a CSL citation-style file. */
export function isCslPath(path: string): boolean {
  return path.toLowerCase().endsWith(".csl");
}

/** True when `value` is one of the curated built-in style names. */
export function isBuiltinStyle(value: string): boolean {
  return BUILTIN_CITATION_STYLES.some((s) => s.value === value);
}
