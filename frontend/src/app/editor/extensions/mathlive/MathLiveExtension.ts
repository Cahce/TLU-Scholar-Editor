/**
 * Inline math preview extension.
 *
 * When the editor cursor enters a `$ … $` region we show a floating tooltip
 * with the **actual Typst-rendered SVG** of the equation — the same compiler
 * that produces the main PDF/SVG preview, just fed a tiny fragment.
 *
 * This replaces the original MathLive (LaTeX) preview because Typst math
 * syntax (`integral_a^b`, `dif`, `mat(…)`) does not round-trip through
 * MathLive cleanly. Rendering with Typst itself is always accurate and
 * matches the document's final output 1:1.
 *
 * UX details:
 *   - The preview is a CodeMirror TOOLTIP (overlay layer), not an inline
 *     widget. The old widget was inserted into the text flow at the end of
 *     the math content, which pushed the closing `$` of multi-line block
 *     equations onto a broken-looking line of its own. The tooltip floats
 *     below the equation without touching document layout at all.
 *   - Anchored at the END of the math region, shown below (flips above when
 *     out of space). `pointer-events: none` so clicks pass straight through
 *     to whatever text is underneath.
 *   - First render is async (worker compile); we show the raw source as a
 *     placeholder until the SVG arrives. Subsequent renders of the same
 *     content are instant via the renderer's LRU cache.
 *   - Compartment-toggled so Settings can enable/disable live.
 */

import {
  Compartment,
  StateEffect,
  StateField,
  type EditorState,
  type Extension,
} from "@codemirror/state";
import { EditorView, showTooltip, type Tooltip } from "@codemirror/view";

import { findMathRegionAt, findMathRegions, type MathRegion } from "./MathDetector";
import {
  peekMathSvg,
  renderMathSvg,
} from "../../services/TypstMathRenderer";
import "./styles.css";

// ---------------------------------------------------------------------------
// State: cached math regions for the active doc.
// ---------------------------------------------------------------------------
const setRegionsEffect = StateEffect.define<MathRegion[]>();

const regionsField = StateField.define<MathRegion[]>({
  create: (state) => findMathRegions(state.doc.toString()),
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setRegionsEffect)) return e.value;
    }
    if (tr.docChanged) return findMathRegions(tr.state.doc.toString());
    return value;
  },
});

// ---------------------------------------------------------------------------
// Preview DOM — Typst-rendered SVG pill (shared by the tooltip).
// ---------------------------------------------------------------------------
function buildPreviewDom(region: MathRegion): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = `cm-mathlive-preview cm-mathlive-preview--${region.kind}`;
  wrapper.title = "Bản xem trước được biên dịch bằng Typst";

  // Best-effort synchronous render if the cache already has it (cursor
  // bouncing back into a recently-viewed equation).
  const cached = peekMathSvg(region.content, region.kind);
  if (cached) {
    wrapper.innerHTML = cached;
    wrapper.dataset.state = "ready";
  } else {
    // Placeholder shows the raw source so the user can read SOMETHING
    // immediately, then we swap in the SVG when compile finishes.
    const placeholder = document.createElement("span");
    placeholder.className = "cm-mathlive-preview__placeholder";
    placeholder.textContent = region.content.trim() || "…";
    wrapper.appendChild(placeholder);
    wrapper.dataset.state = "loading";

    void renderMathSvg(region.content, region.kind).then(
      (svg) => {
        if (svg) {
          wrapper.innerHTML = svg;
          wrapper.dataset.state = "ready";
        } else {
          // Compile failed (malformed math). Mark as error but keep
          // the source text visible — better than going blank.
          wrapper.dataset.state = "error";
        }
      },
      () => {
        wrapper.dataset.state = "error";
      },
    );
  }

  return wrapper;
}

// ---------------------------------------------------------------------------
// Tooltip field: pinned below the end of the cursor's containing region.
// ---------------------------------------------------------------------------
interface PreviewTooltipState {
  key: string | null;
  tooltip: Tooltip | null;
}

function computeTooltip(state: EditorState): PreviewTooltipState {
  const regions = state.field(regionsField, false) ?? [];
  const region = findMathRegionAt(regions, state.selection.main.head);
  if (!region) return { key: null, tooltip: null };
  const key = `${region.from}:${region.to}:${region.content}:${region.kind}`;
  return {
    key,
    tooltip: {
      pos: region.to,
      above: false,
      strictSide: false,
      arrow: false,
      create: () => ({ dom: buildPreviewDom(region), offset: { x: 0, y: 6 } }),
    },
  };
}

const mathPreviewTooltip = StateField.define<PreviewTooltipState>({
  create: (state) => computeTooltip(state),
  update(value, tr) {
    if (
      !tr.docChanged &&
      tr.startState.selection.eq(tr.state.selection) &&
      !tr.effects.some((e) => e.is(setRegionsEffect))
    ) {
      return value;
    }
    const next = computeTooltip(tr.state);
    // Reuse the existing tooltip object while the region is unchanged so the
    // overlay DOM isn't torn down on every cursor move within the equation.
    if (next.key !== null && next.key === value.key) return value;
    return next;
  },
  provide: (f) => showTooltip.from(f, (v) => v.tooltip),
});

// ---------------------------------------------------------------------------
// Compartment-toggled extension entry.
// ---------------------------------------------------------------------------
export const mathliveCompartment = new Compartment();

const previewExtensions: Extension[] = [regionsField, mathPreviewTooltip];

export function mathliveExtension(initialEnabled: boolean): Extension {
  return mathliveCompartment.of(initialEnabled ? previewExtensions : []);
}

export function setMathliveEnabled(view: EditorView, enabled: boolean): void {
  view.dispatch({
    effects: mathliveCompartment.reconfigure(enabled ? previewExtensions : []),
  });
}
