/**
 * Signature help extension — floating parameter hints above the line
 * when the cursor sits inside a function call's argument list.
 *
 * Mirrors the tinymist + VSCode UX: a thin popup above the current line
 * shows the full signature with the active parameter highlighted, plus
 * a one-line description of that parameter below. Re-renders as the
 * cursor moves between arguments.
 *
 * Reference (tinymist):
 *   - `crates/tinymist-query/src/signature_help.rs` (label + activeParameter)
 *   - `crates/tinymist-analysis/src/ty/describe.rs` (union expansion)
 *
 * Implementation notes:
 *
 * - CodeMirror has no built-in signature help (Monaco does), so we build
 *   it from primitives: a `StateField` tracks the current context, and
 *   `showTooltip.from(field, ...)` derives a tooltip from that state.
 *
 * - We detect the active parameter from the surrounding text (count
 *   commas back to `(`, then check whether the cursor sits after a
 *   `name:` named-argument introducer and use that name for an
 *   override). This is the same strategy `matchValueSlot` already uses
 *   in `patterns.ts`.
 *
 * - The tooltip is `above: true; strictSide: true` so it stays anchored
 *   above the line even when there's room below — matching tinymist's
 *   "hint floats above the active line" feel.
 */

import { StateField, type EditorState } from "@codemirror/state";
import { showTooltip, type Tooltip } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import type { SyntaxNode } from "@lezer/common";
import { getFunction } from "./stdlib";
import { renderSignatureLine } from "./signatureFormat";
import type { TypstFunction } from "./types";

interface SignatureContext {
  fn: TypstFunction;
  activeParam: number;
  /** Document position to anchor the tooltip at — usually the start of
   * the function name so the popup floats above the call expression. */
  anchor: number;
}

const IDENT_RE = /[A-Za-z0-9_-]/;

/** Walk up the syntax tree to find the enclosing `FuncCall`. */
function ancestorFuncCall(node: SyntaxNode): SyntaxNode | null {
  for (let cur: SyntaxNode | null = node; cur; cur = cur.parent) {
    if (cur.name === "FuncCall") return cur;
  }
  return null;
}

/** Read the function name from a `FuncCall`'s first `Ident` child. Same
 * helper logic as `patterns.ts:getFuncCallName`. */
function readFuncCallName(state: EditorState, fc: SyntaxNode): string | null {
  const ident = fc.getChild("Ident");
  if (!ident) return null;
  return state.doc.sliceString(ident.from, ident.to);
}

/**
 * Span of a single argument inside a function call's argument list.
 * Produced by `walkArgs`, consumed by `detectActiveParam`.
 *
 * @internal exported only for unit tests.
 */
export interface ArgSpan {
  /** First offset belonging to this arg — just after `(` or `,`. */
  from: number;
  /** End-of-arg — offset of the separating `,` or the closing `)`. */
  to: number;
  /** Offset of the FIRST top-level `:` inside this arg, or -1 if none.
   * `walkArgs` records only the first colon so a value like `{"a": 1}`
   * (object literal in a future grammar) wouldn't confuse the detector. */
  colon: number;
}

/**
 * Single-pass scan of the arg list. Tracks string + bracket + paren +
 * brace depth so commas/colons that are nested or inside string literals
 * are NOT mistaken for arg-list delimiters. Replaces the older split-pass
 * pair `countActiveArgIndex` + `namedArgOverride`, whose walk-back logic
 * crossed arg boundaries on any `,`/`(`/`)` regardless of string context
 * and could only see colons left of the cursor.
 *
 * @internal exported for unit tests.
 */
export function walkArgs(
  doc: string,
  openParen: number,
  closeParen: number,
): ArgSpan[] {
  const spans: ArgSpan[] = [];
  if (openParen < 0) return spans;

  const end = closeParen < 0 ? doc.length : closeParen;
  let inString = false;
  let escape = false;
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let currentFrom = openParen + 1;
  let currentColon = -1;

  let i = openParen + 1;
  for (; i < end; i++) {
    const ch = doc.charAt(i);

    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "(") {
      parenDepth++;
      continue;
    }
    if (ch === ")") {
      if (parenDepth === 0) {
        // Closing paren of the call — close trailing arg + stop.
        spans.push({ from: currentFrom, to: i, colon: currentColon });
        return spans;
      }
      parenDepth--;
      continue;
    }
    if (ch === "[") {
      bracketDepth++;
      continue;
    }
    if (ch === "]") {
      if (bracketDepth > 0) bracketDepth--;
      continue;
    }
    if (ch === "{") {
      braceDepth++;
      continue;
    }
    if (ch === "}") {
      if (braceDepth > 0) braceDepth--;
      continue;
    }

    // Top-level delimiters only count when ALL depths are 0.
    if (parenDepth !== 0 || bracketDepth !== 0 || braceDepth !== 0) continue;

    if (ch === ",") {
      spans.push({ from: currentFrom, to: i, colon: currentColon });
      currentFrom = i + 1;
      currentColon = -1;
    } else if (ch === ":" && currentColon === -1) {
      currentColon = i;
    }
  }

  // Reached `end` without a matching `)` (incomplete call while typing).
  // Push the trailing arg so callers don't lose the cursor's position.
  spans.push({ from: currentFrom, to: i, colon: currentColon });
  return spans;
}

/**
 * Skip whitespace lùi từ `colon - 1` rồi walk back qua identifier chars,
 * trả về slice tên param (hoặc null nếu không có ident hợp lệ).
 *
 * @internal
 */
function extractIdentBeforeColon(
  doc: string,
  from: number,
  colon: number,
): string | null {
  let end = colon;
  while (end > from && /\s/.test(doc.charAt(end - 1))) end--;
  let start = end;
  while (start > from && IDENT_RE.test(doc.charAt(start - 1))) start--;
  if (start === end) return null;
  return doc.slice(start, end);
}

/**
 * Resolve which parameter the cursor is currently targeting.
 *
 * Priority:
 * 1. Span containing cursor has a top-level `:` → named arg; param name is
 *    the identifier immediately before the colon.
 * 2. Span has no `:` BUT its trimmed text is an identifier that exactly
 *    matches a param name → named arg in progress (user is typing the
 *    name, hasn't reached `:` yet). Without this, `#bibliography("p",
 *    style|)` would fall through to positional index 1 (`title`) before
 *    the user types `:`.
 * 3. Otherwise positional — return the span's index in the list.
 *
 * @internal exported for unit tests.
 */
export function detectActiveParam(
  fn: TypstFunction,
  spans: ArgSpan[],
  doc: string,
  pos: number,
): number {
  if (spans.length === 0) return 0;

  // Cursor at edge counts as belonging to the span on the left (inclusive
  // `to`). For positions past the last span (e.g. cursor right after `)`),
  // clamp to the last span so we don't return -1.
  let idx = spans.findIndex((s) => pos >= s.from && pos <= s.to);
  if (idx < 0) idx = spans.length - 1;
  const span = spans[idx];

  // (1) Named arg with explicit colon.
  if (span.colon >= 0) {
    const name = extractIdentBeforeColon(doc, span.from, span.colon);
    if (name) {
      const p = fn.params.findIndex((pp) => pp.name === name);
      if (p >= 0) return p;
    }
  } else {
    // (2) Identifier-only span that names a known param — treat as named
    // arg in progress so the popup follows the user's intent during typing.
    const text = doc.slice(span.from, span.to).trim();
    if (text && /^[A-Za-z0-9_-]+$/.test(text)) {
      const p = fn.params.findIndex((pp) => pp.name === text);
      if (p >= 0) return p;
    }
  }

  // (3) Positional fallback.
  return idx;
}

function detectSignatureContext(state: EditorState): SignatureContext | null {
  const sel = state.selection.main;
  if (!sel.empty) return null;
  const pos = sel.head;

  const tree = syntaxTree(state);
  const leaf = tree.resolveInner(pos, -1);
  const funcCall = ancestorFuncCall(leaf);
  if (!funcCall) return null;
  if (pos <= funcCall.from || pos >= funcCall.to) return null;

  // Reject only inside comments — signature help shouldn't fire when the
  // user is writing prose. Strings and raw blocks are intentionally KEPT
  // because the user often edits a string value (e.g. `path: "as|sets/x.png"`)
  // and still wants to see which param they're targeting and what type it
  // expects. Signature popup floats above the line while the autocomplete
  // popup (if open) anchors below the cursor — they don't overlap, and
  // typst.app / tinymist both keep the signature visible inside strings.
  for (let cur: SyntaxNode | null = leaf; cur; cur = cur.parent) {
    if (
      cur.name === "LineComment" ||
      cur.name === "BlockComment" ||
      cur.name === "Comment"
    ) {
      return null;
    }
  }

  const name = readFuncCallName(state, funcCall);
  if (!name) return null;
  const fn = getFunction(name);
  if (!fn || fn.params.length === 0) return null;

  // Single-pass arg-list scan → resolve active param by name (if the span
  // has a top-level `:` or its trimmed text is a known param name) or by
  // positional index. Replaces the older split-pass walk-back that mis-
  // resolved out-of-order named args.
  const doc = state.doc.toString();
  const openParen = doc.indexOf("(", funcCall.from);
  const spans = walkArgs(doc, openParen, funcCall.to);
  let activeParam = detectActiveParam(fn, spans, doc, pos);

  // Clamp to known params so we don't bold past the end.
  if (activeParam >= fn.params.length) activeParam = fn.params.length - 1;
  if (activeParam < 0) activeParam = 0;

  // Anchor the tooltip on the function name so it floats over the call.
  return { fn, activeParam, anchor: funcCall.from };
}

/* -------------------------------------------------------------------------
 * Tooltip view
 * ---------------------------------------------------------------------- */

function buildSignatureTooltipDom(ctx: SignatureContext): HTMLElement {
  const root = document.createElement("div");
  root.className = "cm-signature-tooltip";

  root.appendChild(renderSignatureLine(ctx.fn, ctx.activeParam));

  // Active parameter description — single line, matches tinymist's
  // SignatureInformation.parameters[i].documentation.
  const p = ctx.fn.params[ctx.activeParam];
  if (p) {
    const desc = document.createElement("div");
    desc.className = "cm-sig-desc";

    const label = document.createElement("span");
    label.className = "cm-sig-desc-name";
    label.textContent = p.name;
    desc.appendChild(label);

    if (p.required) {
      const req = document.createElement("span");
      req.className = "cm-sig-desc-required";
      req.textContent = " *";
      req.title = "Bắt buộc";
      desc.appendChild(req);
    }

    const sep = document.createElement("span");
    sep.className = "cm-sig-desc-sep";
    sep.textContent = " — ";
    desc.appendChild(sep);

    const text = document.createElement("span");
    text.className = "cm-sig-desc-text";
    text.textContent = p.info;
    desc.appendChild(text);

    root.appendChild(desc);
  }

  return root;
}

/* -------------------------------------------------------------------------
 * State field + tooltip provider
 * ---------------------------------------------------------------------- */

const signatureField = StateField.define<SignatureContext | null>({
  create(state) {
    return detectSignatureContext(state);
  },
  update(value, tr) {
    // Only recompute when the doc or the selection changed; otherwise
    // keep the existing value (e.g. a transaction that only changes
    // viewport scroll shouldn't re-walk the tree).
    if (!tr.docChanged && !tr.selection) return value;
    return detectSignatureContext(tr.state);
  },
  provide: (f) =>
    showTooltip.from(f, (ctx): Tooltip | null => {
      if (!ctx) return null;
      return {
        pos: ctx.anchor,
        above: true,
        strictSide: true,
        // Custom CSS class so the popup chrome differs from the autocomplete
        // popup (less padding, different shadow tier).
        arrow: false,
        create: () => ({ dom: buildSignatureTooltipDom(ctx) }),
      };
    }),
});

export function typstSignatureHelpExtension() {
  return [signatureField];
}
