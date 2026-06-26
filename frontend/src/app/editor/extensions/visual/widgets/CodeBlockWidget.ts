import { WidgetType, type EditorView } from "@codemirror/view";

import { attachJumpToSource, widgetIgnoreEvent } from "../widget-utils";

export class CodeBlockWidget extends WidgetType {
  constructor(
    readonly content: string,
    readonly lang: string | null,
    readonly sourcePos: number,
    readonly nodeFrom: number,
    readonly nodeTo: number,
  ) {
    super();
  }

  eq(other: CodeBlockWidget): boolean {
    return (
      other.content === this.content &&
      other.lang === this.lang &&
      other.sourcePos === this.sourcePos &&
      other.nodeFrom === this.nodeFrom &&
      other.nodeTo === this.nodeTo
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const pre = document.createElement("pre");
    pre.className = "cm-typst-code-block";
    pre.setAttribute(
      "aria-label",
      this.lang ? `Code block, language ${this.lang}` : "Code block",
    );
    if (this.lang) {
      const tag = document.createElement("span");
      tag.className = "cm-typst-code-block-lang";
      tag.textContent = this.lang;
      pre.appendChild(tag);
    }
    const code = document.createElement("code");
    if (this.lang) code.className = `language-${this.lang}`;
    code.textContent = this.content;
    pre.appendChild(code);

    attachJumpToSource(pre, view, this.sourcePos, {
      from: this.nodeFrom,
      to: this.nodeTo,
    });
    return pre;
  }

  ignoreEvent(event: Event): boolean {
    return widgetIgnoreEvent(event);
  }
}
