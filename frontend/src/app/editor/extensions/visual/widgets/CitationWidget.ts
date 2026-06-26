import { WidgetType, type EditorView } from "@codemirror/view";

import { attachJumpToSource, widgetIgnoreEvent } from "../widget-utils";

// Inline SVGs (built outside React) — coloured via `currentColor` so they
// follow the chip's theme. Sized to sit inline with the chip label text.
// Open-book icon for `@key` references. Deliberately NOT an at-sign: `@`
// reads as a link/mention and clashes with the Link affordance.
// Distinct from Link (🔗) / Reference bookmark (🔖) / Label tag (🏷) / Quote.
const BOOK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" ' +
  'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
  'stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>' +
  '<path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>';

// Book-with-bookmark icon for `#cite(...)` calls so the two citation forms
// are visually distinguishable at a glance (user request: same key may
// appear via both syntaxes in one document).
const BOOK_MARKED_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" ' +
  'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
  'stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>' +
  '<polyline points="10 2 10 10 13 7 16 10 16 2"/></svg>';

const TAG_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" ' +
  'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
  'stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 ' +
  '8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/>' +
  '<circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" stroke="none"/></svg>';

function appendLabelText(host: HTMLElement, text: string): void {
  const span = document.createElement("span");
  span.className = "cm-typst-chip-text";
  span.textContent = text;
  host.appendChild(span);
}

/** How the citation is written in the source — affects icon + tooltip only. */
export type CitationVariant = "ref" | "call";

/**
 * Citation chip for both syntaxes: `@key` (variant "ref", open book) and
 * `#cite(<key>, …)` (variant "call", bookmarked book). Clicking highlights
 * the matching entry in the Bibliography panel (via `editor:focusCitation`)
 * and reveals the raw source so the key can be edited.
 */
export class CitationWidget extends WidgetType {
  constructor(
    readonly citeKey: string,
    readonly sourcePos: number,
    readonly variant: CitationVariant = "ref",
  ) {
    super();
  }

  eq(other: CitationWidget): boolean {
    return (
      other.citeKey === this.citeKey &&
      other.sourcePos === this.sourcePos &&
      other.variant === this.variant
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const el = document.createElement("a");
    el.className = "cm-typst-chip cm-typst-cite-chip";
    el.setAttribute("role", "link");
    const sourceForm =
      this.variant === "call" ? `#cite(<${this.citeKey}>)` : `@${this.citeKey}`;
    el.setAttribute("aria-label", `Trích dẫn: ${sourceForm}`);
    el.title = `Trích dẫn ${sourceForm} — bấm để xem trong Tài liệu tham khảo`;
    el.tabIndex = 0;
    el.innerHTML = this.variant === "call" ? BOOK_MARKED_SVG : BOOK_SVG;
    appendLabelText(el, this.citeKey);

    // `mousedown` (not `click`): the StateField hides this widget as soon as
    // our dispatch lands the cursor inside the range, so a later `click`
    // would never fire (DOM already gone).
    el.addEventListener("mousedown", (ev) => {
      if (ev.button !== 0) return;
      ev.preventDefault();
      ev.stopPropagation();
      window.dispatchEvent(
        new CustomEvent("editor:focusCitation", {
          detail: { citeKey: this.citeKey },
        }),
      );
      view.dispatch({ selection: { anchor: this.sourcePos } });
      view.focus();
    });
    return el;
  }

  ignoreEvent(event: Event): boolean {
    return widgetIgnoreEvent(event);
  }
}

/**
 * `<name>` label rendered as a tag chip. It's an anchor element, not free
 * text — clicking reveals the raw `<name>` source so the user edits the name
 * deliberately rather than typing into it like ordinary prose.
 */
export class LabelWidget extends WidgetType {
  constructor(
    readonly name: string,
    readonly sourcePos: number,
  ) {
    super();
  }

  eq(other: LabelWidget): boolean {
    return other.name === this.name && other.sourcePos === this.sourcePos;
  }

  toDOM(view: EditorView): HTMLElement {
    const el = document.createElement("a");
    el.className = "cm-typst-chip cm-typst-label-chip";
    el.setAttribute("role", "link");
    el.setAttribute("aria-label", `Nhãn: ${this.name}`);
    el.title = `Nhãn ${this.name} — bấm để sửa`;
    el.tabIndex = 0;
    el.innerHTML = TAG_SVG;
    appendLabelText(el, this.name);
    attachJumpToSource(el, view, this.sourcePos);
    return el;
  }

  ignoreEvent(event: Event): boolean {
    return widgetIgnoreEvent(event);
  }
}
