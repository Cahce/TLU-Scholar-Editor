import { WidgetType } from "@codemirror/view";

import { widgetIgnoreEvent } from "../widget-utils";

/**
 * Simple decorative widgets for list / enum / term markers. They don't
 * need their own click handlers — mouseup is the only event CM6 handles,
 * which positions the cursor naturally next to the marker.
 */
export class ListBulletWidget extends WidgetType {
  constructor(readonly symbol: string) {
    super();
  }

  eq(other: ListBulletWidget): boolean {
    return other.symbol === this.symbol;
  }

  toDOM(): HTMLElement {
    const el = document.createElement("span");
    el.className = "cm-typst-list-bullet";
    el.setAttribute("aria-hidden", "true");
    el.textContent = this.symbol;
    return el;
  }

  ignoreEvent(event: Event): boolean {
    return widgetIgnoreEvent(event);
  }
}

export class EnumNumberWidget extends WidgetType {
  constructor(readonly number: number) {
    super();
  }

  eq(other: EnumNumberWidget): boolean {
    return other.number === this.number;
  }

  toDOM(): HTMLElement {
    const el = document.createElement("span");
    el.className = "cm-typst-enum-number";
    el.setAttribute("aria-hidden", "true");
    el.textContent = `${this.number}.`;
    return el;
  }

  ignoreEvent(event: Event): boolean {
    return widgetIgnoreEvent(event);
  }
}
