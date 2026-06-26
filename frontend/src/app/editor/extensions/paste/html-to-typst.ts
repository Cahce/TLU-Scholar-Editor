/**
 * Best-effort HTML → Typst markup conversion for rich-text paste
 * (spec: visual-editor-aux-polish, US-3).
 *
 * Concept borrowed from Overleaf's visual-editor paste-html pipeline
 * (architecture only — no code reuse, AGPL): walk the parsed DOM with a tag
 * whitelist, emit Typst markup, treat every unknown element as transparent
 * (render its children) so Word/Google-Docs wrapper soup degrades gracefully.
 * Images are skipped in v1 — pasting image FILES is handled separately by
 * PasteExtension's upload path.
 */

const HEADING_RE = /^h([1-6])$/;

/** Tags whose entire subtree is dropped. */
const DROP_TAGS = new Set([
  "script",
  "style",
  "head",
  "meta",
  "link",
  "title",
  "img",
  "svg",
  "iframe",
  "object",
  "noscript",
  "button",
  "input",
  "select",
  "textarea",
]);

interface WalkCtx {
  listDepth: number;
  /** Inside <pre> — keep whitespace verbatim, no escaping. */
  pre: boolean;
}

/**
 * Convert an HTML clipboard payload to Typst markup. Returns null when the
 * document has no usable content (caller falls back to plain text).
 */
export function htmlToTypst(html: string): string | null {
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(html, "text/html");
  } catch {
    return null;
  }
  const body = doc.body;
  if (!body) return null;
  const out = renderChildren(body, { listDepth: 0, pre: false });
  const cleaned = out
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

/** Escape characters that would otherwise be parsed as Typst markup. */
export function escapeTypstText(text: string): string {
  return text.replace(/[\\#*_$`@<>]/g, (ch) => `\\${ch}`);
}

/** Escape a Typst string literal (inside `"..."`). */
function escapeTypstString(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** Neutralise list/heading markers at the start of a block's first line. */
function escapeLineStart(block: string): string {
  return block.replace(/^([=\-+])(\s)/, "\\$1$2");
}

function renderChildren(el: Node, ctx: WalkCtx): string {
  let out = "";
  el.childNodes.forEach((child) => {
    out += renderNode(child, ctx);
  });
  return out;
}

function renderNode(node: Node, ctx: WalkCtx): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const raw = node.textContent ?? "";
    if (ctx.pre) return raw;
    // HTML collapses whitespace runs; mirror that so formatting newlines
    // between tags don't become Typst paragraph breaks.
    const collapsed = raw.replace(/\s+/g, " ");
    if (collapsed === " " || collapsed === "") return collapsed;
    return escapeTypstText(collapsed);
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  if (DROP_TAGS.has(tag)) return "";

  const heading = tag.match(HEADING_RE);
  if (heading) {
    const level = Number(heading[1]);
    const text = renderChildren(el, ctx).trim();
    if (!text) return "";
    return `\n\n${"=".repeat(level)} ${text}\n\n`;
  }

  switch (tag) {
    case "br":
      // Typst forced line break is a trailing backslash.
      return " \\\n";
    case "hr":
      return "\n\n#line(length: 100%)\n\n";
    case "p":
    case "div":
    case "section":
    case "article":
    case "header":
    case "footer":
    case "main": {
      const text = renderChildren(el, ctx).trim();
      if (!text) return "";
      return `\n\n${escapeLineStart(text)}\n\n`;
    }
    case "strong":
    case "b": {
      const text = renderChildren(el, ctx).trim();
      return text ? `*${text}*` : "";
    }
    case "em":
    case "i": {
      const text = renderChildren(el, ctx).trim();
      return text ? `_${text}_` : "";
    }
    case "u": {
      const text = renderChildren(el, ctx).trim();
      return text ? `#underline[${text}]` : "";
    }
    case "s":
    case "del":
    case "strike": {
      const text = renderChildren(el, ctx).trim();
      return text ? `#strike[${text}]` : "";
    }
    case "sup": {
      const text = renderChildren(el, ctx).trim();
      return text ? `#super[${text}]` : "";
    }
    case "sub": {
      const text = renderChildren(el, ctx).trim();
      return text ? `#sub[${text}]` : "";
    }
    case "a": {
      const text = renderChildren(el, ctx).trim();
      const href = el.getAttribute("href") ?? "";
      if (!/^(https?:|mailto:)/i.test(href)) return text;
      return text
        ? `#link("${escapeTypstString(href)}")[${text}]`
        : `#link("${escapeTypstString(href)}")`;
    }
    case "code": {
      if (ctx.pre) return renderChildren(el, ctx);
      const raw = el.textContent ?? "";
      if (!raw.trim()) return "";
      // Raw inline can't contain its own delimiter — fall back to escaping.
      return raw.includes("`") ? escapeTypstText(raw) : `\`${raw}\``;
    }
    case "pre": {
      const raw = (el.textContent ?? "").replace(/\n$/, "");
      if (!raw.trim()) return "";
      const fence = raw.includes("```") ? "````" : "```";
      return `\n\n${fence}\n${raw}\n${fence}\n\n`;
    }
    case "blockquote": {
      const text = renderChildren(el, ctx).trim();
      return text ? `\n\n#quote[\n${text}\n]\n\n` : "";
    }
    case "ul":
      return `\n${renderList(el, ctx, "-")}\n`;
    case "ol":
      return `\n${renderList(el, ctx, "+")}\n`;
    case "table":
      return renderTable(el as HTMLTableElement, ctx);
    case "tr":
    case "td":
    case "th":
    case "thead":
    case "tbody":
    case "tfoot":
    case "caption":
      // Reached only for orphaned fragments outside a <table>.
      return renderChildren(el, ctx);
    default:
      // Unknown wrapper (span, font, o:p, …) → transparent.
      return renderChildren(el, ctx);
  }
}

function renderList(listEl: HTMLElement, ctx: WalkCtx, marker: "-" | "+"): string {
  const indent = "  ".repeat(ctx.listDepth);
  const lines: string[] = [];
  listEl.childNodes.forEach((child) => {
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const el = child as HTMLElement;
    if (el.tagName.toLowerCase() !== "li") return;

    // Separate the item's own inline content from nested sub-lists.
    let inline = "";
    let nested = "";
    el.childNodes.forEach((part) => {
      const tag =
        part.nodeType === Node.ELEMENT_NODE
          ? (part as HTMLElement).tagName.toLowerCase()
          : null;
      if (tag === "ul" || tag === "ol") {
        nested += renderList(
          part as HTMLElement,
          { ...ctx, listDepth: ctx.listDepth + 1 },
          tag === "ul" ? "-" : "+",
        );
      } else {
        inline += renderNode(part, ctx);
      }
    });
    const text = inline.replace(/\s+/g, " ").trim();
    if (text) lines.push(`${indent}${marker} ${text}`);
    if (nested) lines.push(nested.replace(/\n+$/, ""));
  });
  return lines.join("\n");
}

function renderTable(table: HTMLTableElement, ctx: WalkCtx): string {
  const rows = Array.from(table.rows);
  if (rows.length === 0) return "";
  const columns = Math.max(...rows.map((r) => r.cells.length));
  if (columns === 0) return "";

  const cellText = (cell: HTMLTableCellElement): string =>
    renderChildren(cell, ctx).replace(/\s+/g, " ").trim();

  const lines: string[] = ["#table(", `  columns: ${columns},`];
  let bodyStart = 0;
  const firstRow = rows[0];
  const firstIsHeader =
    firstRow.cells.length > 0 &&
    Array.from(firstRow.cells).every((c) => c.tagName.toLowerCase() === "th");
  if (firstIsHeader) {
    const cells = padRow(firstRow, columns).map((t) => `[${t}]`);
    lines.push(`  table.header(${cells.join(", ")}),`);
    bodyStart = 1;
  }
  for (let r = bodyStart; r < rows.length; r++) {
    const cells = padRow(rows[r], columns).map((t) => `[${t}]`);
    lines.push(`  ${cells.join(", ")},`);
  }
  lines.push(")");
  return `\n\n${lines.join("\n")}\n\n`;

  function padRow(row: HTMLTableRowElement, cols: number): string[] {
    const out = Array.from(row.cells).map(cellText);
    while (out.length < cols) out.push("");
    return out;
  }
}
