import { WidgetType, type EditorView } from "@codemirror/view";

import { useEditorStore } from "../../../state/editorStore";
import {
  extractFuncCall,
  parseFuncCallArgs,
  unquoteString,
  unwrapContent,
} from "../func-call-args";
import {
  attachJumpToSource,
  makeEditButton,
  makeResizeHandle,
  widgetIgnoreEvent,
} from "../widget-utils";
import {
  chunkRows,
  type TableEditDetail,
  type TableModel,
} from "../table-serialize";
import { CitationWidget } from "./CitationWidget";
import { ChemWidget } from "./ChemWidget";
import { LinkWidget } from "./LinkWidget";

interface CachedBlob {
  url: string;
  bytes: Uint8Array;
}

const imageBlobCache = new Map<string, CachedBlob>();

function cacheKey(projectId: string, path: string): string {
  return `${projectId}::${path}`;
}

/**
 * Resolve an image path to a blob URL, caching by content identity. When
 * the file's `binaryContent` reference changes (e.g., user re-uploads the
 * same path), the stale URL is revoked and a fresh one minted — without
 * this guard the cache would grow unbounded and serve stale data.
 */
async function resolveImageBlobUrl(path: string): Promise<string | null> {
  try {
    const state = useEditorStore.getState();
    const projectId = state.projectId;
    if (!projectId) return null;
    const key = cacheKey(projectId, path);

    const existing = state.files[path];
    let file = existing;
    if (!file?.binaryContent) {
      file = (await state.ensureBinaryLoaded(path)) ?? undefined;
    }
    if (!file?.binaryContent) return null;

    const cached = imageBlobCache.get(key);
    if (cached && cached.bytes === file.binaryContent) return cached.url;
    if (cached) URL.revokeObjectURL(cached.url);

    const mime = file.mimeType ?? guessMime(path);
    // Slice() so the Blob owns an independent backing buffer — the cached
    // ProjectFile.binaryContent may be mutated or replaced behind us.
    const buf = file.binaryContent.slice();
    const url = URL.createObjectURL(new Blob([buf], { type: mime }));
    imageBlobCache.set(key, { url, bytes: file.binaryContent });
    return url;
  } catch {
    return null;
  }
}

function guessMime(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

interface FigureEditPayload {
  kind: "figure" | "image";
  from: number;
  to: number;
  imagePath: string | null;
  caption: string;
  width: number | null;
}

function dispatchEditFigure(payload: FigureEditPayload): void {
  window.dispatchEvent(
    new CustomEvent("editor:editFigure", { detail: payload }),
  );
}

function dispatchEditTable(payload: TableEditDetail): void {
  window.dispatchEvent(
    new CustomEvent("editor:editTable", { detail: payload }),
  );
}

function dispatchResizeFigure(payload: FigureEditPayload): void {
  window.dispatchEvent(
    new CustomEvent("editor:resizeFigure", { detail: payload }),
  );
}

/* ----------------------------- ImageWidget -------------------------------- */

export class ImageWidget extends WidgetType {
  private destroyed = false;

  constructor(
    readonly path: string,
    readonly alt: string,
    readonly sourcePos: number,
    readonly callFrom: number,
    readonly callTo: number,
    readonly width: number | null,
  ) {
    super();
  }

  eq(other: ImageWidget): boolean {
    return (
      other.path === this.path &&
      other.alt === this.alt &&
      other.sourcePos === this.sourcePos &&
      other.callFrom === this.callFrom &&
      other.callTo === this.callTo &&
      other.width === this.width
    );
  }

  toDOM(view: EditorView): HTMLElement {
    this.destroyed = false;
    const wrapper = document.createElement("div");
    wrapper.className = "cm-typst-image-wrapper";
    wrapper.setAttribute("aria-label", `Image: ${this.path}`);

    const img = document.createElement("img");
    img.className = "cm-typst-image";
    img.alt = this.alt || this.path;
    img.loading = "lazy";
    img.draggable = false;
    if (this.width != null) {
      img.style.width = `${Math.round(this.width * 100)}%`;
    }
    img.addEventListener("error", () => {
      if (this.destroyed) return;
      if (img.parentNode === wrapper) wrapper.removeChild(img);
      renderFallback(wrapper, this.path);
    });
    wrapper.appendChild(img);

    const resizeHandle = makeResizeHandle(view, img, (fraction) =>
      dispatchResizeFigure({
        kind: "image",
        from: this.callFrom,
        to: this.callTo,
        imagePath: this.path,
        caption: "",
        width: fraction,
      }),
    );
    if (resizeHandle) wrapper.appendChild(resizeHandle);

    void resolveImageBlobUrl(this.path).then((url) => {
      if (this.destroyed) return;
      if (url) {
        img.src = url;
      } else {
        if (img.parentNode === wrapper) wrapper.removeChild(img);
        renderFallback(wrapper, this.path);
      }
    });

    const editBtn = makeEditButton(view, "Sửa hình ảnh", () =>
      dispatchEditFigure({
        kind: "image",
        from: this.callFrom,
        to: this.callTo,
        imagePath: this.path,
        caption: "",
        width: this.width,
      }),
    );
    if (editBtn) wrapper.appendChild(editBtn);

    attachJumpToSource(wrapper, view, this.sourcePos, {
      from: this.callFrom,
      to: this.callTo,
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

function renderFallback(wrapper: HTMLElement, path: string): void {
  wrapper.classList.add("cm-typst-image-fallback");
  const fallback = document.createElement("div");
  fallback.className = "cm-typst-funccall-fallback";
  fallback.textContent = `🖼 ${path}`;
  wrapper.appendChild(fallback);
}

/* ----------------------------- FigureWidget ------------------------------- */

export class FigureWidget extends WidgetType {
  private destroyed = false;

  constructor(
    readonly imagePath: string | null,
    readonly caption: string,
    readonly sourcePos: number,
    readonly callFrom: number,
    readonly callTo: number,
    readonly width: number | null,
  ) {
    super();
  }

  eq(other: FigureWidget): boolean {
    return (
      other.imagePath === this.imagePath &&
      other.caption === this.caption &&
      other.sourcePos === this.sourcePos &&
      other.callFrom === this.callFrom &&
      other.callTo === this.callTo &&
      other.width === this.width
    );
  }

  toDOM(view: EditorView): HTMLElement {
    this.destroyed = false;
    const fig = document.createElement("figure");
    fig.className = "cm-typst-figure";
    fig.setAttribute(
      "aria-label",
      `Figure${this.caption ? `: ${this.caption}` : ""}`,
    );

    if (this.imagePath) {
      const img = document.createElement("img");
      img.className = "cm-typst-image";
      img.alt = this.caption || this.imagePath;
      img.loading = "lazy";
      img.draggable = false;
      if (this.width != null) {
        img.style.width = `${Math.round(this.width * 100)}%`;
      }
      img.addEventListener("error", () => {
        if (this.destroyed) return;
        if (img.parentNode === fig) fig.removeChild(img);
        const ph = document.createElement("div");
        ph.className = "cm-typst-funccall-fallback";
        ph.textContent = `🖼 ${this.imagePath}`;
        fig.insertBefore(ph, fig.firstChild);
      });
      fig.appendChild(img);
      const resizeHandle = makeResizeHandle(view, img, (fraction) =>
        dispatchResizeFigure({
          kind: "figure",
          from: this.callFrom,
          to: this.callTo,
          imagePath: this.imagePath,
          caption: this.caption,
          width: fraction,
        }),
      );
      if (resizeHandle) fig.appendChild(resizeHandle);
      void resolveImageBlobUrl(this.imagePath).then((url) => {
        if (this.destroyed) return;
        if (url) img.src = url;
      });
    } else {
      const ph = document.createElement("div");
      ph.className = "cm-typst-funccall-fallback";
      ph.textContent = "Figure";
      fig.appendChild(ph);
    }

    if (this.caption) {
      const cap = document.createElement("figcaption");
      cap.className = "cm-typst-figure-caption";
      cap.textContent = this.caption;
      fig.appendChild(cap);
    }

    const editBtn = makeEditButton(view, "Sửa figure", () =>
      dispatchEditFigure({
        kind: "figure",
        from: this.callFrom,
        to: this.callTo,
        imagePath: this.imagePath,
        caption: this.caption,
        width: this.width,
      }),
    );
    if (editBtn) fig.appendChild(editBtn);

    attachJumpToSource(fig, view, this.sourcePos, {
      from: this.callFrom,
      to: this.callTo,
    });
    return fig;
  }

  ignoreEvent(event: Event): boolean {
    return widgetIgnoreEvent(event);
  }

  destroy(): void {
    this.destroyed = true;
  }
}

/* ------------------------------ TableWidget ------------------------------- */

export class TableWidget extends WidgetType {
  constructor(
    readonly columns: number,
    readonly cells: string[],
    readonly headerCount: number,
    readonly sourcePos: number,
    readonly callFrom: number,
    readonly callTo: number,
    /** Non-null only when the table can be safely round-tripped (editable). */
    readonly model: TableModel | null,
  ) {
    super();
  }

  eq(other: TableWidget): boolean {
    return (
      other.columns === this.columns &&
      other.headerCount === this.headerCount &&
      other.cells.length === this.cells.length &&
      other.sourcePos === this.sourcePos &&
      other.callFrom === this.callFrom &&
      other.callTo === this.callTo &&
      (other.model == null) === (this.model == null) &&
      other.cells.every((c, i) => c === this.cells[i])
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "cm-typst-table-wrapper";
    if (this.columns <= 0 || this.cells.length === 0) {
      const ph = document.createElement("div");
      ph.className = "cm-typst-funccall-fallback";
      ph.textContent = "Bảng (xem source để chỉnh)";
      wrap.appendChild(ph);
      attachJumpToSource(wrap, view, this.sourcePos);
      return wrap;
    }
    const table = document.createElement("table");
    table.className = "cm-typst-table";
    table.setAttribute("aria-label", "Table");

    // Distinguish header from body rows. `headerCount` carries how many
    // leading cells came from `table.header(...)` in the source (or 0 when
    // none was supplied — in which case we promote the first row to a
    // header to match Overleaf's tabular rendering default).
    const effectiveHeaderCount =
      this.headerCount > 0
        ? this.headerCount
        : Math.min(this.columns, this.cells.length);

    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");
    let row = document.createElement("tr");
    let inHeader = effectiveHeaderCount > 0;
    let headerCellsEmitted = 0;

    this.cells.forEach((cell, idx) => {
      const useTh = inHeader && headerCellsEmitted < effectiveHeaderCount;
      const cellEl = document.createElement(useTh ? "th" : "td");
      cellEl.textContent = cell;
      if (useTh) headerCellsEmitted++;
      row.appendChild(cellEl);
      if ((idx + 1) % this.columns === 0) {
        (inHeader ? thead : tbody).appendChild(row);
        row = document.createElement("tr");
        if (headerCellsEmitted >= effectiveHeaderCount) inHeader = false;
      }
    });
    if (row.children.length > 0) {
      (inHeader ? thead : tbody).appendChild(row);
    }
    if (thead.children.length > 0) table.appendChild(thead);
    if (tbody.children.length > 0) table.appendChild(tbody);

    wrap.appendChild(table);
    if (this.model) {
      const editBtn = makeEditButton(view, "Sửa bảng", () =>
        dispatchEditTable({
          from: this.callFrom,
          to: this.callTo,
          model: this.model as TableModel,
        }),
      );
      if (editBtn) wrap.appendChild(editBtn);
    } else {
      // Complex table (colspan/rowspan/cell formatting) — the dialog can't
      // round-trip it, so explain why and offer the source instead. This is
      // a viewing affordance: it stays available in read-only mode.
      const openBtn = document.createElement("button");
      openBtn.type = "button";
      openBtn.className = "cm-typst-open-source-button";
      openBtn.textContent = "Mở nguồn";
      openBtn.title =
        "Bảng phức tạp (gộp ô / định dạng riêng) — không sửa được bằng hộp thoại, bấm để mở mã nguồn";
      openBtn.setAttribute("aria-label", "Mở mã nguồn bảng");
      openBtn.addEventListener("mouseup", (e) => e.stopPropagation());
      openBtn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        view.dispatch({ selection: { anchor: this.sourcePos } });
        view.focus();
      });
      wrap.appendChild(openBtn);
    }
    attachJumpToSource(wrap, view, this.sourcePos, {
      from: this.callFrom,
      to: this.callTo,
    });
    return wrap;
  }

  ignoreEvent(event: Event): boolean {
    return widgetIgnoreEvent(event);
  }
}

/* ------------------------------ QuoteWidget ------------------------------- */

export class QuoteWidget extends WidgetType {
  constructor(
    readonly content: string,
    readonly attribution: string | null,
    readonly sourcePos: number,
  ) {
    super();
  }

  eq(other: QuoteWidget): boolean {
    return (
      other.content === this.content &&
      other.attribution === this.attribution &&
      other.sourcePos === this.sourcePos
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const bq = document.createElement("blockquote");
    bq.className = "cm-typst-quote";
    const p = document.createElement("p");
    p.textContent = this.content;
    bq.appendChild(p);
    if (this.attribution) {
      const cite = document.createElement("cite");
      cite.className = "cm-typst-quote-cite";
      cite.textContent = `— ${this.attribution}`;
      bq.appendChild(cite);
    }
    attachJumpToSource(bq, view, this.sourcePos);
    return bq;
  }

  ignoreEvent(event: Event): boolean {
    return widgetIgnoreEvent(event);
  }
}

/* ----------------------- FuncCall dispatch helpers ----------------------- */

export const FUNC_CALL_WHITELIST = new Set([
  "image",
  "figure",
  "table",
  "quote",
  "cite",
  "ce",
  "link",
]);

export interface FuncCallWidgetBuild {
  widget: WidgetType;
  block: boolean;
}

export function buildFuncCallWidget(
  funcName: string,
  rawCall: string,
  sourcePos: number,
  callFrom: number,
  callTo: number,
): FuncCallWidgetBuild | null {
  switch (funcName) {
    case "image":
      return buildImageWidget(rawCall, sourcePos, callFrom, callTo);
    case "figure":
      return buildFigureWidget(rawCall, sourcePos, callFrom, callTo);
    case "table":
      return buildTableWidget(rawCall, sourcePos, callFrom, callTo);
    case "quote":
      return buildQuoteWidget(rawCall, sourcePos);
    case "cite":
      return buildCiteWidget(rawCall, sourcePos);
    case "ce":
      return buildChemWidget(rawCall, sourcePos);
    case "link":
      return buildLinkWidget(rawCall, sourcePos);
    default:
      return null;
  }
}

function buildLinkWidget(
  rawCall: string,
  sourcePos: number,
): FuncCallWidgetBuild | null {
  const extracted = extractFuncCall(rawCall, "link");
  if (!extracted) return null;
  const args = parseFuncCallArgs(extracted.args);
  const first = args.positional[0];
  if (!first) return null;
  // Only string-literal destinations become chips; `#link(<label>)` and
  // computed destinations stay as raw source.
  const url = unquoteString(first);
  if (url == null) return null;
  // Label: trailing content block `#link("…")[label]` or second positional
  // `#link("…", [label])`.
  let label: string | null = null;
  const rest = extracted.rest.trim();
  if (rest.startsWith("[")) {
    label = unwrapContent(rest);
  } else if (args.positional[1]) {
    label = unwrapContent(args.positional[1]) ?? null;
  }
  return { widget: new LinkWidget(url, label, sourcePos), block: false };
}

function buildChemWidget(
  rawCall: string,
  sourcePos: number,
): FuncCallWidgetBuild | null {
  const extracted = extractFuncCall(rawCall, "ce");
  if (!extracted) return null;
  const args = parseFuncCallArgs(extracted.args);
  const first = args.positional[0];
  if (!first) return null;
  const formula = unquoteString(first.trim());
  if (formula == null) return null;
  return { widget: new ChemWidget(formula, sourcePos), block: false };
}

function buildCiteWidget(
  rawCall: string,
  sourcePos: number,
): FuncCallWidgetBuild | null {
  const extracted = extractFuncCall(rawCall, "cite");
  if (!extracted) return null;
  const args = parseFuncCallArgs(extracted.args);
  // Render every `#cite(<key>, …)` as a citation chip for a consistent look
  // with `@key` — including forms with a `supplement`/`form`. The extra args
  // stay in the source and are revealed when the chip is clicked.
  const first = args.positional[0]?.trim() ?? "";
  const m = first.match(/^<(.+)>$/);
  if (!m) return null;
  return { widget: new CitationWidget(m[1], sourcePos, "call"), block: false };
}

function buildImageWidget(
  rawCall: string,
  sourcePos: number,
  callFrom: number,
  callTo: number,
): FuncCallWidgetBuild | null {
  const extracted = extractFuncCall(rawCall, "image");
  if (!extracted) return null;
  const args = parseFuncCallArgs(extracted.args);
  const first = args.positional[0];
  if (!first) return null;
  const path = unquoteString(first);
  if (!path) return null;
  const alt = args.named["alt"]
    ? unquoteString(args.named["alt"]) ?? args.named["alt"]
    : "";
  const width = parseWidth(args.named["width"]);
  return {
    widget: new ImageWidget(path, alt, sourcePos, callFrom, callTo, width),
    block: true,
  };
}

function buildFigureWidget(
  rawCall: string,
  sourcePos: number,
  callFrom: number,
  callTo: number,
): FuncCallWidgetBuild | null {
  const extracted = extractFuncCall(rawCall, "figure");
  if (!extracted) return null;
  const args = parseFuncCallArgs(extracted.args);
  let imagePath: string | null = null;
  let imageWidth: number | null = null;
  const first = args.positional[0];
  if (first) {
    const nestedImage = extractFuncCall(first.trim(), "image");
    if (nestedImage) {
      const inner = parseFuncCallArgs(nestedImage.args);
      const innerFirst = inner.positional[0];
      if (innerFirst) imagePath = unquoteString(innerFirst);
      imageWidth = parseWidth(inner.named["width"]);
    }
  }
  let caption = "";
  if (args.named["caption"]) {
    caption = unwrapContent(args.named["caption"]) ?? args.named["caption"];
  }
  return {
    widget: new FigureWidget(
      imagePath,
      caption.trim(),
      sourcePos,
      callFrom,
      callTo,
      imageWidth,
    ),
    block: true,
  };
}

/**
 * Parse a `table.header[H1][H2][H3]` or `table.header(c1, c2, c3)` argument
 * into its individual cell contents. Returns null if `arg` isn't a
 * `table.header` call. Handles both Typst content-block syntax (`[...]`)
 * and tuple syntax (`(...)`).
 */
function parseTableHeaderArg(arg: string): string[] | null {
  const t = arg.trim();
  if (!t.startsWith("table.header")) return null;
  let i = "table.header".length;
  while (i < t.length && /\s/.test(t[i])) i++;

  if (t[i] === "(") {
    const close = findMatching(t, i, "(", ")");
    if (close < 0) return null;
    const args = parseFuncCallArgs(t.slice(i + 1, close));
    return args.positional.map((p) => (unwrapContent(p) ?? p).trim());
  }

  if (t[i] === "[") {
    const cells: string[] = [];
    while (i < t.length && t[i] === "[") {
      const close = findMatching(t, i, "[", "]");
      if (close < 0) return null;
      cells.push(t.slice(i + 1, close).trim());
      i = close + 1;
      while (i < t.length && /\s/.test(t[i])) i++;
    }
    return cells.length > 0 ? cells : null;
  }
  return null;
}

function findMatching(
  src: string,
  openIdx: number,
  open: string,
  close: string,
): number {
  let depth = 1;
  for (let j = openIdx + 1; j < src.length; j++) {
    const c = src[j];
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return j;
    }
  }
  return -1;
}

/** Parsed view of a `#table(...)` call — shared by the visual widget and the
 * toolbar's cursor-context table actions (`table-context.ts`). */
export interface ParsedTableCall {
  columns: number;
  cells: string[];
  headerCount: number;
  /** Non-null only when the table can round-trip through `serializeTable`. */
  model: TableModel | null;
}

export function parseTableCall(rawCall: string): ParsedTableCall | null {
  const extracted = extractFuncCall(rawCall, "table");
  if (!extracted) return null;
  const args = parseFuncCallArgs(extracted.args);
  const columnsRaw = (args.named["columns"] ?? "").trim();
  const columns = parseColumns(args.named["columns"]);
  const columnsEditable = /^\d+$/.test(columnsRaw);

  // Header cells: Typst lets users mark them explicitly via
  // `table.header[H1][H2][H3]` (most common) or `table.header(c1, c2, c3)`.
  // We surface those separately so the widget can render them in
  // <thead><th>. If no explicit header is found we promote the first row by
  // default — matches Overleaf's tabular default and most typographic
  // conventions for data tables.
  let headerCount = 0;
  const cells: string[] = [];
  // `simple` stays true only when every positional arg is a content cell
  // (`[...]`) or a `table.header`. Anything else (e.g. `table.cell(colspan:…)`,
  // spreads) means we can't losslessly serialize → keep the read-only widget.
  let simple = true;
  for (const positional of args.positional) {
    const headerCells = parseTableHeaderArg(positional);
    if (headerCells) {
      cells.push(...headerCells);
      headerCount += headerCells.length;
      continue;
    }
    const inner = unwrapContent(positional);
    if (inner != null) cells.push(inner.trim());
    else simple = false;
  }

  // Build an editable model only for tables we can round-trip safely: a known
  // column count, header is either absent or exactly one row, and all cells
  // are plain content. Named args (align/stroke/fill/…) are preserved verbatim.
  const hasHeader = headerCount > 0 && headerCount === columns;
  const headerOk = headerCount === 0 || hasHeader;
  let model: TableModel | null = null;
  if (simple && columns > 0 && headerOk) {
    model = {
      columnsRaw: columnsEditable ? String(columns) : columnsRaw,
      columnsEditable,
      columns,
      hasHeader,
      rows: chunkRows(cells, columns),
      extraNamed: Object.entries(args.named)
        .filter(([k]) => k !== "columns")
        .map(([name, value]) => ({ name, value: value.trim() })),
    };
  }

  return { columns, cells, headerCount, model };
}

function buildTableWidget(
  rawCall: string,
  sourcePos: number,
  callFrom: number,
  callTo: number,
): FuncCallWidgetBuild | null {
  const parsed = parseTableCall(rawCall);
  if (!parsed) return null;
  return {
    widget: new TableWidget(
      parsed.columns,
      parsed.cells,
      parsed.headerCount,
      sourcePos,
      callFrom,
      callTo,
      parsed.model,
    ),
    block: true,
  };
}

function parseColumns(raw: string | undefined): number {
  if (!raw) return 0;
  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10);
  if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
    const inner = trimmed.slice(1, -1);
    const parts = parseFuncCallArgs(inner);
    return parts.positional.length;
  }
  return 0;
}

/**
 * Parse a Typst `width:` argument like `50%`, `0.5fr`, `100pt` into a
 * fraction of full width (0..1). Returns null if it can't be normalised —
 * the edit dialog treats null as "full width".
 */
function parseWidth(raw: string | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const percentMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*%$/);
  if (percentMatch) return Number.parseFloat(percentMatch[1]) / 100;
  const fractionMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*fr$/);
  if (fractionMatch) {
    const f = Number.parseFloat(fractionMatch[1]);
    return Number.isFinite(f) ? Math.min(1, Math.max(0, f)) : null;
  }
  return null;
}

function buildQuoteWidget(
  rawCall: string,
  sourcePos: number,
): FuncCallWidgetBuild | null {
  const extracted = extractFuncCall(rawCall, "quote");
  if (!extracted) return null;
  const args = parseFuncCallArgs(extracted.args);
  let content = "";
  const first = args.positional[0];
  if (first) {
    const inner = unwrapContent(first);
    content = (inner ?? first).trim();
  }
  let attribution: string | null = null;
  if (args.named["attribution"]) {
    attribution =
      unquoteString(args.named["attribution"]) ?? args.named["attribution"];
  }
  return {
    widget: new QuoteWidget(content, attribution, sourcePos),
    block: true,
  };
}
