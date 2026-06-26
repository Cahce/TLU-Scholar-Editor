import { syntaxTree } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { EditorView, WidgetType } from "@codemirror/view";

import { NODE } from "../typst-node-names";
import { attachJumpToSource, widgetIgnoreEvent } from "../widget-utils";

// External-link icon, inline SVG (widget DOM is built outside React).
const EXTERNAL_LINK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" ' +
  'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
  'stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M15 3h6v6"/><path d="M10 14 21 3"/>' +
  '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';

const MAX_LABEL_LEN = 40;

/** Only ever open http(s)/mailto — anything else renders but never opens. */
export function safeLinkUrl(url: string): string | null {
  const trimmed = url.trim();
  return /^(https?:|mailto:)/i.test(trimmed) ? trimmed : null;
}

function shorten(text: string): string {
  return text.length > MAX_LABEL_LEN
    ? `${text.slice(0, MAX_LABEL_LEN - 1)}…`
    : text;
}

function openUrl(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * `#link("url")[label]` rendered as a link chip (spec: visual-editor-aux-polish,
 * US-5). Plain click reveals the source for editing — consistent with every
 * other widget; Ctrl/Cmd+click opens the URL in a new tab.
 */
export class LinkWidget extends WidgetType {
  constructor(
    readonly url: string,
    readonly label: string | null,
    readonly sourcePos: number,
  ) {
    super();
  }

  eq(other: LinkWidget): boolean {
    return (
      other.url === this.url &&
      other.label === this.label &&
      other.sourcePos === this.sourcePos
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const el = document.createElement("a");
    el.className = "cm-typst-chip cm-typst-link-chip";
    el.setAttribute("role", "link");
    const safe = safeLinkUrl(this.url);
    const display = this.label?.trim() || shorten(this.url);
    el.setAttribute("aria-label", `Liên kết: ${display}`);
    el.title = safe
      ? `${this.url} — Ctrl+click để mở, click để sửa`
      : `${this.url} — click để sửa`;
    el.tabIndex = 0;
    el.innerHTML = EXTERNAL_LINK_SVG;
    const span = document.createElement("span");
    span.className = "cm-typst-chip-text";
    span.textContent = display;
    el.appendChild(span);

    if (safe) {
      // Ctrl/Cmd+mousedown opens; registered BEFORE attachJumpToSource so we
      // can claim the event (both listen on mousedown; jump checks
      // defaultPrevented).
      el.addEventListener("mousedown", (ev) => {
        if (ev.button !== 0 || !(ev.ctrlKey || ev.metaKey)) return;
        ev.preventDefault();
        ev.stopPropagation();
        openUrl(safe);
      });
    }
    attachJumpToSource(el, view, this.sourcePos);
    return el;
  }

  ignoreEvent(event: Event): boolean {
    return widgetIgnoreEvent(event);
  }
}

/**
 * Ctrl/Cmd+click on a bare autolink (grammar node `Link`, styled by
 * mark-decorations) opens it in a new tab. Resolves the URL from the syntax
 * tree at the click position, so it needs no per-decoration DOM wiring.
 */
export function linkClickExtension(): Extension {
  return EditorView.domEventHandlers({
    mousedown: (event, view) => {
      if (event.button !== 0 || !(event.ctrlKey || event.metaKey)) return false;
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos == null) return false;
      let node: ReturnType<ReturnType<typeof syntaxTree>["resolveInner"]> | null =
        syntaxTree(view.state).resolveInner(pos, 0);
      while (node) {
        if (node.name === NODE.Link) {
          const url = safeLinkUrl(
            view.state.doc.sliceString(node.from, node.to),
          );
          if (!url) return false;
          event.preventDefault();
          openUrl(url);
          return true;
        }
        node = node.parent;
      }
      return false;
    },
  });
}
