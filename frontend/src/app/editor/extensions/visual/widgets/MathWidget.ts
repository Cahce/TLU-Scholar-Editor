import { WidgetType, type EditorView } from "@codemirror/view";

import {
  peekMathSvg,
  renderMathSvg,
} from "../../../services/TypstMathRenderer";
import {
  attachJumpToSource,
  makeEditButton,
  widgetIgnoreEvent,
} from "../widget-utils";

/**
 * Visual-mode math widget.
 *
 * Renders the equation with the REAL Typst compiler (SVG via the shared
 * worker, through `TypstMathRenderer`) rather than a Typst→LaTeX→KaTeX
 * approximation. KaTeX could only translate a small subset of Typst math and
 * silently mangled Typst-only tokens (`plus.minus`, `mat`, `dif`, `arrow.r`,
 * …) into literal text — feeding the source to Typst itself fixes that and
 * matches exactly what the PDF/preview will show.
 *
 * Mirrors the cache-first pattern used by `MathLiveExtension`'s preview widget.
 */
export class MathWidget extends WidgetType {
  private destroyed = false;

  constructor(
    readonly raw: string,
    readonly isBlock: boolean,
    readonly sourcePos: number,
    readonly nodeFrom: number,
    readonly nodeTo: number,
  ) {
    super();
  }

  eq(other: MathWidget): boolean {
    return (
      other.raw === this.raw &&
      other.isBlock === this.isBlock &&
      other.sourcePos === this.sourcePos &&
      other.nodeFrom === this.nodeFrom &&
      other.nodeTo === this.nodeTo
    );
  }

  toDOM(view: EditorView): HTMLElement {
    this.destroyed = false;
    const wrapper = document.createElement(this.isBlock ? "div" : "span");
    wrapper.className = this.isBlock
      ? "cm-typst-math cm-typst-math-block"
      : "cm-typst-math cm-typst-math-inline";
    wrapper.setAttribute("aria-label", `Math: ${this.raw}`);
    wrapper.setAttribute("tabindex", "-1");

    const target = document.createElement(this.isBlock ? "div" : "span");
    target.className = "cm-typst-math-render";
    wrapper.appendChild(target);

    const kind = this.isBlock ? "display" : "inline";
    const cached = peekMathSvg(this.raw, kind);
    if (cached) {
      target.innerHTML = cached;
    } else {
      // Show the raw source until the compile resolves, then swap in the SVG.
      target.textContent = this.raw;
      void renderMathSvg(this.raw, kind).then(
        (svg) => {
          if (this.destroyed) return;
          if (svg) {
            target.innerHTML = svg;
            target.classList.remove("cm-typst-math-error");
          } else {
            // Malformed math → keep raw text + error styling (no crash).
            target.classList.add("cm-typst-math-error");
          }
        },
        () => {
          if (this.destroyed) return;
          target.classList.add("cm-typst-math-error");
        },
      );
    }

    // Pencil edit overlay — only meaningful on block math (inline is small).
    if (this.isBlock) {
      const editBtn = makeEditButton(view, "Sửa công thức", () => {
        window.dispatchEvent(
          new CustomEvent("editor:editMath", {
            detail: {
              from: this.nodeFrom,
              to: this.nodeTo,
              raw: this.raw,
              isBlock: this.isBlock,
            },
          }),
        );
      });
      if (editBtn) wrapper.appendChild(editBtn);
    }

    attachJumpToSource(wrapper, view, this.sourcePos, {
      from: this.nodeFrom,
      to: this.nodeTo,
    });
    return wrapper;
  }

  ignoreEvent(event: Event): boolean {
    return widgetIgnoreEvent(event);
  }

  destroy(): void {
    this.destroyed = true;
  }
}
