/**
 * Format helpers for tinymist-style signature rendering.
 *
 * Tinymist renders function signatures with the FULL type union inlined —
 * e.g. `bibliography(sources: array, full: bool, style: "ieee" | "apa" |
 * "mla" | …)`. This module produces the equivalent layout from our
 * hand-curated `TypstFunction` data.
 *
 * The output is a structured tree of segments instead of a string so the
 * signature-help tooltip can wrap each parameter in its own `<span>`,
 * bold the active one, and let CSS handle line wrapping/ellipsis.
 *
 * Reference (tinymist):
 *   - `crates/tinymist-query/src/signature_help.rs` (label assembly)
 *   - `crates/tinymist-analysis/src/ty/describe.rs` (union expansion)
 */

import type { EnumValue, TypstFunction, TypstParam } from "./types";

/** How many enum values to inline before collapsing the rest into `| …`. */
const ENUM_PREVIEW_LIMIT = 6;

export interface SignatureSegment {
  /** Visible text. Already includes the trailing `,` / `)` etc. when
   * applicable; the renderer just glues segments together. */
  text: string;
  /** Index of the parameter this segment represents, when relevant. */
  paramIndex?: number;
  /** True when this segment is the active parameter — styled bold/colored. */
  active?: boolean;
  /** Logical role (used by CSS classes). */
  role: "name" | "open" | "param" | "comma" | "close" | "returns";
}

/** Build the segment list for `funcname(p1: T1, p2: T2, ...) → ret`. */
export function buildSignatureSegments(
  fn: TypstFunction,
  activeParam?: number,
): SignatureSegment[] {
  const segs: SignatureSegment[] = [];

  segs.push({ text: fn.name, role: "name" });
  segs.push({ text: "(", role: "open" });

  fn.params.forEach((p, i) => {
    if (i > 0) segs.push({ text: ", ", role: "comma" });
    segs.push({
      text: formatParam(p),
      paramIndex: i,
      active: activeParam === i,
      role: "param",
    });
  });

  segs.push({ text: ")", role: "close" });

  if (fn.returns) {
    segs.push({ text: ` → ${fn.returns}`, role: "returns" });
  }

  return segs;
}

/** Single-param label: `name: type` or `name: "v1" | "v2" | …` for enum
 * params. Matches what tinymist puts in `SignatureInformation.parameters[].label`. */
export function formatParam(p: TypstParam): string {
  const typeLabel = formatType(p);
  return `${p.name}: ${typeLabel}`;
}

function formatType(p: TypstParam): string {
  // When the parameter accepts a closed set of strings, inline that union
  // — exactly what tinymist's `describe()` does for `Ty::Union(Ty::Value)`.
  if (p.enumValues && p.enumValues.length > 0) {
    return formatEnumUnion(p.enumValues, p.detail);
  }
  return p.detail || "any";
}

function formatEnumUnion(values: EnumValue[], fallback: string): string {
  const strings = values
    .map((v) => (typeof v === "string" ? v : v.value))
    .filter(Boolean);

  if (strings.length === 0) return fallback || "any";

  const shown = strings.slice(0, ENUM_PREVIEW_LIMIT).map((s) => `"${s}"`);
  const tail = strings.length > ENUM_PREVIEW_LIMIT ? " | …" : "";
  return shown.join(" | ") + tail;
}

/** Render the segment list into a DOM node — used by both hover and
 * signature-help tooltips so the styling stays consistent. */
export function renderSignatureLine(
  fn: TypstFunction,
  activeParam?: number,
): HTMLElement {
  const root = document.createElement("div");
  root.className = "cm-sig-line";

  for (const seg of buildSignatureSegments(fn, activeParam)) {
    const el = document.createElement("span");
    el.className = `cm-sig-${seg.role}`;
    if (seg.active) el.classList.add("cm-sig-active");
    el.textContent = seg.text;
    root.appendChild(el);
  }

  return root;
}
