/**
 * Chemistry helpers for the Typst editor.
 *
 * Typst has no `\ce{}` (that's LaTeX/mhchem); chemistry is done with the
 * `whalogen` package: `#import "@preview/whalogen:0.3.0": ce` then `#ce("…")`.
 * Shared by the insert toolbar, the chemistry autocomplete source, and the
 * visual-editor chem widget renderer.
 */

import type { EditorView } from "@codemirror/view";

export const WHALOGEN_IMPORT = '#import "@preview/whalogen:0.3.0": ce';

/**
 * Ensure the document imports whalogen so `#ce(...)` compiles in the real
 * PDF/SVG preview (analogous to `\usepackage{mhchem}` in LaTeX). No-op when
 * already present; otherwise prepends the import line at the top of the file.
 */
export function ensureWhalogenImport(view: EditorView): void {
  if (view.state.doc.toString().includes("@preview/whalogen")) return;
  view.dispatch({ changes: { from: 0, insert: `${WHALOGEN_IMPORT}\n` } });
}

export interface ChemEntry {
  label: string;
  detail?: string;
}

/** Common compounds offered while typing inside `#ce("…")`. */
export const COMMON_CHEM_FORMULAS: ChemEntry[] = [
  { label: "H2O", detail: "Nước" },
  { label: "H2O2", detail: "Hiđro peoxit" },
  { label: "O2", detail: "Oxi" },
  { label: "N2", detail: "Nitơ" },
  { label: "H2", detail: "Hiđro" },
  { label: "CO2", detail: "Cacbon đioxit" },
  { label: "CO", detail: "Cacbon monoxit" },
  { label: "NaCl", detail: "Muối ăn" },
  { label: "H2SO4", detail: "Axit sunfuric" },
  { label: "HCl", detail: "Axit clohiđric" },
  { label: "HNO3", detail: "Axit nitric" },
  { label: "H3PO4", detail: "Axit photphoric" },
  { label: "NaOH", detail: "Natri hiđroxit" },
  { label: "Ca(OH)2", detail: "Canxi hiđroxit" },
  { label: "NH3", detail: "Amoniac" },
  { label: "CH4", detail: "Metan" },
  { label: "C2H5OH", detail: "Etanol" },
  { label: "C6H12O6", detail: "Glucozơ" },
  { label: "CaCO3", detail: "Canxi cacbonat" },
  { label: "Fe2O3", detail: "Sắt(III) oxit" },
];

/** mhchem/whalogen reaction operators, used inside the `#ce("…")` string. */
export const CHEM_OPERATORS: ChemEntry[] = [
  { label: "->", detail: "Phản ứng (tạo thành)" },
  { label: "<=>", detail: "Cân bằng thuận nghịch" },
  { label: "<->", detail: "Mũi tên hai chiều" },
];
