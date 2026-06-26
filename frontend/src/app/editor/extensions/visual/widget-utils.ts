import type { EditorView } from "@codemirror/view";

/**
 * Inline SVG used for the pencil overlay on figure / image / math widgets.
 * Inlined (vs imported from lucide-react) because widget DOM is built
 * outside React and we want to avoid loading a React render path per click.
 * The fill is EXPLICIT (not currentColor) so the glyph stays visible even if
 * some ancestor resets `color` — users reported an "empty circle" button.
 */
const PENCIL_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="#334155" aria-hidden="true">' +
  '<path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z"></path>' +
  "</svg>";

export const EDIT_BUTTON_CLASS = "cm-typst-edit-button";

/**
 * Build a pencil-icon edit button for a widget. The handler is invoked on
 * click with no further plumbing — caller decides what dialog to open.
 * Returns null in read-only mode (viewers must not see edit affordances) —
 * callers append conditionally.
 *
 * Critical UX detail: we stopPropagation on mousedown / mouseup / click so
 * CodeMirror never sees these events. Without this, CM6's mouseup handler
 * would position the cursor at the click location (often *inside* the
 * widget range), the selection-aware decoration field would notice and
 * reveal the source, and the user would see a one-frame source flash
 * before the dialog opens.
 */
export function makeEditButton(
  view: EditorView,
  ariaLabel: string,
  handler: () => void,
): HTMLButtonElement | null {
  if (view.state.readOnly) return null;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = EDIT_BUTTON_CLASS;
  btn.setAttribute("aria-label", ariaLabel);
  btn.title = ariaLabel;
  btn.innerHTML = PENCIL_SVG;
  const stop = (e: Event) => e.stopPropagation();
  btn.addEventListener("mousedown", stop);
  btn.addEventListener("mouseup", stop);
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    handler();
  });
  return btn;
}

/**
 * Universal widget event policy: tell CodeMirror to IGNORE every DOM event
 * on the widget. The widget owns its own listeners (mousedown for cursor
 * jumps, click on the edit button, etc.) and CM6 must not also process
 * mouseup — if it did, it would dispatch its own selection at the
 * click-coords-derived position, which races our explicit
 * `view.dispatch({ selection: ... })` and intermittently destroys the
 * widget DOM before our click handler runs.
 *
 * Returning `true` means "CM6 ignore"; default CM6 behaviour for widgets
 * is also true, so this is the conservative choice.
 */
export function widgetIgnoreEvent(): boolean {
  return true;
}

/**
 * Position the cursor inside the widget's source range when the user clicks
 * the widget body. We use `mousedown` rather than `click` because the chain
 * is:
 *
 *   mousedown → dispatch(selection) → StateField rebuilds → widget hidden
 *             → DOM destroyed → mouseup → click (target detached, may not fire)
 *
 * Using `mousedown` guarantees our handler runs while the widget DOM is
 * still attached. `preventDefault` blocks the browser's text-selection
 * behaviour; `stopPropagation` keeps the event from reaching CM6's
 * listeners which would also try to position the cursor.
 *
 * When `range` is given, a second pass on the next frame maps the CLICK
 * COORDINATES onto the now-revealed source text (clamped into the range), so
 * the cursor lands where the user actually clicked instead of always at the
 * start — they can immediately type at that spot. Clicking anywhere outside
 * the revealed lines re-renders the widget (selection-driven rebuild).
 */
export function attachJumpToSource(
  el: HTMLElement,
  view: EditorView,
  pos: number,
  range?: { from: number; to: number },
): void {
  el.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    if (e.defaultPrevented) return;
    e.preventDefault();
    e.stopPropagation();
    const { clientX, clientY } = e;
    view.dispatch({ selection: { anchor: pos } });
    view.focus();
    if (!range) return;
    // The reveal happened synchronously above; after layout settles, map the
    // original click point to a source offset. Clamp into the widget's range:
    // tall widgets collapse to much shorter source, so an unclamped position
    // could land OUTSIDE and instantly re-widgetize.
    requestAnimationFrame(() => {
      const mapped = view.posAtCoords({ x: clientX, y: clientY });
      if (mapped == null) return;
      const clamped = Math.max(range.from, Math.min(mapped, range.to));
      if (clamped === pos) return;
      view.dispatch({ selection: { anchor: clamped } });
    });
  });
}

/**
 * Build a bottom-right drag handle that resizes an image's width. While
 * dragging we update `img.style.width` live (visual feedback only); on release
 * `onCommit` receives the final width as a fraction (0.1–1) of the container so
 * the caller can write it back into the `#image(width: …)` source.
 *
 * `mousedown` stops propagation so the wrapper's jump-to-source handler doesn't
 * fire (which would destroy the widget mid-drag). Move/up listeners live on
 * `document` so the drag survives the pointer leaving the small handle.
 *
 * Returns null in read-only mode — resizing writes back into the source.
 */
export function makeResizeHandle(
  view: EditorView,
  img: HTMLImageElement,
  onCommit: (widthFraction: number) => void,
): HTMLElement | null {
  if (view.state.readOnly) return null;
  const handle = document.createElement("span");
  handle.className = "cm-typst-resize-handle";
  handle.title = "Kéo hoặc dùng phím mũi tên (←/→) để chỉnh kích thước";
  // Keyboard path (AC-8.4): the handle is a slider — Tab to focus, arrows
  // adjust ±5% live, Enter commits to source, Esc reverts the preview.
  handle.tabIndex = 0;
  handle.setAttribute("role", "slider");
  handle.setAttribute("aria-label", "Chỉnh kích thước ảnh");
  handle.setAttribute("aria-valuemin", "10");
  handle.setAttribute("aria-valuemax", "100");
  handle.setAttribute("aria-orientation", "horizontal");

  // Image layout isn't ready at toDOM time, so the current fraction is read
  // lazily on focus / first keypress.
  const currentFraction = (): number => {
    const cw = img.parentElement?.getBoundingClientRect().width ?? 0;
    const iw = img.getBoundingClientRect().width;
    if (cw <= 0 || iw <= 0) return 1;
    return Math.min(1, Math.max(0.1, iw / cw));
  };
  const setAriaNow = (f: number): void => {
    handle.setAttribute("aria-valuenow", String(Math.round(f * 100)));
  };

  let pending: number | null = null;
  let originalWidth: string | null = null;
  const revert = (): void => {
    if (pending == null) return;
    if (originalWidth) img.style.width = originalWidth;
    else img.style.removeProperty("width");
    pending = null;
  };

  handle.addEventListener("focus", () => setAriaNow(currentFraction()));
  handle.addEventListener("blur", revert);
  handle.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      e.stopPropagation();
      if (pending == null) {
        pending = currentFraction();
        originalWidth = img.style.width || null;
      }
      const delta = e.key === "ArrowRight" ? 0.05 : -0.05;
      pending = Math.min(1, Math.max(0.1, pending + delta));
      img.style.width = `${Math.round(pending * 100)}%`;
      setAriaNow(pending);
    } else if (e.key === "Enter" && pending != null) {
      e.preventDefault();
      e.stopPropagation();
      const fraction = pending;
      pending = null;
      onCommit(fraction);
    } else if (e.key === "Escape" && pending != null) {
      e.preventDefault();
      e.stopPropagation();
      revert();
      setAriaNow(currentFraction());
    }
  });

  handle.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const container = img.parentElement;
    const containerWidth = container?.getBoundingClientRect().width ?? 0;
    const startWidth = img.getBoundingClientRect().width;
    if (containerWidth <= 0 || startWidth <= 0) return;
    const startX = e.clientX;
    let fraction = Math.min(1, Math.max(0.1, startWidth / containerWidth));

    const onMove = (ev: MouseEvent) => {
      const next = startWidth + (ev.clientX - startX);
      fraction = Math.min(1, Math.max(0.1, next / containerWidth));
      img.style.width = `${Math.round(fraction * 100)}%`;
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      onCommit(fraction);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });

  return handle;
}
