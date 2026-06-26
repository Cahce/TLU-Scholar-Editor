import { WidgetType, type EditorView } from "@codemirror/view";

import {
  peekChemSvg,
  renderChemSvg,
} from "../../../services/TypstMathRenderer";
import { attachJumpToSource, widgetIgnoreEvent } from "../widget-utils";

/**
 * Visual-mode widget for `#ce("…")` chemical formulae (whalogen — a Typst port
 * of LaTeX mhchem). Renders the formula with the REAL Typst compiler (SVG via
 * the shared worker, with whalogen imported in the snippet), mirroring the math
 * widget's cache-first async pattern. Click reveals the raw source for editing.
 */
export class ChemWidget extends WidgetType {
  private destroyed = false;

  constructor(
    readonly formula: string,
    readonly sourcePos: number,
  ) {
    super();
  }

  eq(other: ChemWidget): boolean {
    return other.formula === this.formula && other.sourcePos === this.sourcePos;
  }

  toDOM(view: EditorView): HTMLElement {
    this.destroyed = false;
    const el = document.createElement("span");
    el.className = "cm-typst-chem";
    el.setAttribute("aria-label", `Công thức hoá học: ${this.formula}`);

    const cached = peekChemSvg(this.formula);
    if (cached) {
      el.innerHTML = cached;
    } else {
      el.textContent = this.formula;
      void renderChemSvg(this.formula).then(
        (svg) => {
          if (this.destroyed) return;
          if (svg) {
            el.innerHTML = svg;
            el.classList.remove("cm-typst-chem-error");
          } else {
            el.classList.add("cm-typst-chem-error");
          }
        },
        () => {
          if (!this.destroyed) el.classList.add("cm-typst-chem-error");
        },
      );
    }

    attachJumpToSource(el, view, this.sourcePos);
    return el;
  }

  ignoreEvent(event: Event): boolean {
    return widgetIgnoreEvent(event);
  }

  destroy(): void {
    this.destroyed = true;
  }
}
