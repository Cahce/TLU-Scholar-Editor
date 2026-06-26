/**
 * Context detection for Typst autocomplete.
 *
 * Inspects the Typst syntax tree (from `codemirror-lang-typst`) around the
 * cursor and decides what kind of completion is appropriate. Each return
 * variant carries the exact replacement range so handlers don't need to
 * recompute prefix bounds.
 *
 * Tinymist pattern reference:
 *   - mode/context split: tinymist/.../analysis/completion/mode.rs
 *   - param arg detection: tinymist/.../analysis/completion/param.rs
 *   - cite-vs-label split: tinymist/.../typst_specific.rs label_completions_
 */

import { syntaxTree } from "@codemirror/language";
import type { EditorState } from "@codemirror/state";
import type { SyntaxNode } from "@lezer/common";
import { getParam, isFilePathFunction } from "./stdlib";

export type AutocompleteContext =
  | { kind: "function-name"; prefix: string; from: number; to: number }
  | {
      kind: "param-name";
      funcName: string;
      prefix: string;
      from: number;
      to: number;
    }
  | {
      kind: "enum-value";
      funcName: string;
      paramName: string;
      prefix: string;
      from: number;
      to: number;
    }
  | {
      kind: "value-slot";
      funcName: string;
      paramName: string;
      prefix: string;
      from: number;
      to: number;
    }
  | { kind: "citation-key"; prefix: string; from: number; to: number }
  | { kind: "label-ref"; prefix: string; from: number; to: number }
  | { kind: "chem-formula"; prefix: string; from: number; to: number }
  | {
      kind: "file-path";
      funcName: string;
      prefix: string;
      from: number;
      to: number;
    }
  | { kind: "none" };

const NONE: AutocompleteContext = { kind: "none" };

/** Word characters that make up an identifier or partial citation key. */
const IDENT_RE = /[A-Za-z0-9_-]/;

/** Node names that should silence autocomplete entirely. */
const SILENT_NODES = new Set<string>([
  "LineComment",
  "BlockComment",
  "Comment",
  "Equation",
  "Math",
  "MathText",
  "MathIdent",
  "MathAttach",
  "MathFrac",
  "MathRoot",
  "Raw",
  "RawTrimmed",
  "RawDelim",
  "RawLang",
]);

export function detectContext(
  state: EditorState,
  pos: number,
): AutocompleteContext {
  const doc = state.doc;
  const tree = syntaxTree(state);
  const node = tree.resolveInner(pos, -1);

  // Hard "no" zones — math / comment / raw block.
  if (isInsideSilent(node)) return NONE;

  const docStr = doc.toString();

  // 1. `#cite(<KEY...>)` — citation key (the dedicated form most users land on).
  const citeMatch = matchCiteKey(docStr, pos);
  if (citeMatch) return citeMatch;

  // 2. `@key…` reference (outside cite). The Typst grammar parses this as
  // `RefMarker` + `Ident`. Match by scanning back to the `@` since the
  // partial reference may not yet form a complete node.
  const refMatch = matchAtRef(docStr, pos, node);
  if (refMatch) return refMatch;

  // 3. Inside a function call?  Walk up to the nearest `FuncCall`.
  const funcCall = ancestor(node, "FuncCall");
  if (funcCall) {
    const funcName = getFuncCallName(state, funcCall);
    if (funcName) {
      // Are we inside an unfinished string literal?
      const strNode = stringNodeAt(state, pos, funcCall);
      if (strNode) {
        return classifyStringArgument(state, pos, funcName, strNode);
      }

      // Value slot — cursor sits right after `name:` (no value yet).
      // Surface enum candidates with auto-inserted quotes, matching
      // typst.app's behaviour at `style: |`.
      const valueSlot = matchValueSlot(state, pos, funcName, funcCall);
      if (valueSlot) return valueSlot;

      // Else we're at a positional/named identifier slot.
      const paramMatch = matchParamName(state, pos, funcName, funcCall);
      if (paramMatch) return paramMatch;
    }
  }

  // 3.5 `#include "…"` / `#import "…"` — module path string. These are
  // statements, not FuncCalls, so the grammar walk above never matches them.
  const modulePath = matchModulePath(docStr, pos);
  if (modulePath) return modulePath;

  // 4. `#name` markup — function-name completion.
  const hashMatch = matchHashName(docStr, pos);
  if (hashMatch) return hashMatch;

  return NONE;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isInsideSilent(node: SyntaxNode): boolean {
  for (let cur: SyntaxNode | null = node; cur; cur = cur.parent) {
    if (SILENT_NODES.has(cur.name)) return true;
  }
  return false;
}

function ancestor(node: SyntaxNode, name: string): SyntaxNode | null {
  for (let cur: SyntaxNode | null = node; cur; cur = cur.parent) {
    if (cur.name === name) return cur;
  }
  return null;
}

/**
 * Read the function name out of a `FuncCall` node by scanning its first
 * `Ident` child. Tinymist does the same — the call name is the first
 * identifier inside the call.
 */
function getFuncCallName(
  state: EditorState,
  funcCall: SyntaxNode,
): string | null {
  const ident = funcCall.getChild("Ident");
  if (!ident) return null;
  return state.doc.sliceString(ident.from, ident.to);
}

/** Find the innermost string-literal node that surrounds `pos`. The Typst
 * lezer grammar uses `Str` for string literals (not `String`). */
function stringNodeAt(
  state: EditorState,
  pos: number,
  funcCall: SyntaxNode,
): SyntaxNode | null {
  let found: SyntaxNode | null = null;
  funcCall.cursor().iterate((c) => {
    if (c.from <= pos && pos <= c.to && c.name === "Str") {
      found = c.node;
    }
  });
  return found;
}

/**
 * String-arg classifier. Decides between enum-value (if the enclosing
 * named arg matches a stdlib param with `enumValues`) and file-path (if
 * the function is in the file-path list).
 */
function classifyStringArgument(
  state: EditorState,
  pos: number,
  funcName: string,
  strNode: SyntaxNode,
): AutocompleteContext {
  const inner = innerStringRange(state, strNode);
  const prefix = state.doc.sliceString(inner.from, pos);

  // Named arg? Look for `name:` before the string.
  const paramName = findEnclosingNamedArg(state, strNode);
  if (paramName) {
    const param = getParam(funcName, paramName);
    if (param?.enumValues) {
      return {
        kind: "enum-value",
        funcName,
        paramName,
        prefix,
        from: inner.from,
        to: inner.to,
      };
    }
  }

  // Chemistry formula string: `#ce("…|…")`. Use a TOKEN-level range (current
  // run of alphanumerics) so picking a compound replaces just that token, not
  // the whole reaction. Operators are offered when the token is empty.
  if (funcName === "ce") {
    let tokStart = pos;
    while (
      tokStart > inner.from &&
      /[A-Za-z0-9]/.test(state.doc.sliceString(tokStart - 1, tokStart))
    ) {
      tokStart--;
    }
    return {
      kind: "chem-formula",
      prefix: state.doc.sliceString(tokStart, pos),
      from: tokStart,
      to: pos,
    };
  }

  // Positional file-path (image/include/include/read/csv/json/yaml/toml/bibliography).
  if (isFilePathFunction(funcName)) {
    return {
      kind: "file-path",
      funcName,
      prefix,
      from: inner.from,
      to: inner.to,
    };
  }

  return NONE;
}

function innerStringRange(
  state: EditorState,
  strNode: SyntaxNode,
): { from: number; to: number } {
  const text = state.doc.sliceString(strNode.from, strNode.to);
  // Trim surrounding quotes if present.
  const startsWithQuote = text.startsWith('"');
  const endsWithQuote = text.endsWith('"') && text.length > 1;
  return {
    from: strNode.from + (startsWithQuote ? 1 : 0),
    to: strNode.to - (endsWithQuote ? 1 : 0),
  };
}

/**
 * Walk left from the string node looking for `<ident>:` (named arg).
 * Returns the identifier text, or null when this is a positional arg.
 */
function findEnclosingNamedArg(
  state: EditorState,
  strNode: SyntaxNode,
): string | null {
  // The parser typically wraps `name: "value"` as a `Named` node containing
  // an `Ident` and the String. Walk up to the nearest `Named`/`NamedArg`.
  let cur: SyntaxNode | null = strNode.parent;
  while (cur) {
    if (cur.name === "Named" || cur.name === "NamedArg") {
      const id = cur.getChild("Ident");
      if (id) return state.doc.sliceString(id.from, id.to);
      return null;
    }
    if (cur.name === "FuncCall" || cur.name === "Args") return null;
    cur = cur.parent;
  }
  return null;
}

/**
 * `#cite(<KEY|>)` and `#cite(<KEY|`. Detect the literal `<` ... cursor
 * sequence inside a FuncCall named `cite`.
 */
function matchCiteKey(
  doc: string,
  pos: number,
): AutocompleteContext | null {
  // Walk back collecting identifier chars; stop at `<`.
  let i = pos;
  while (i > 0 && IDENT_RE.test(doc.charAt(i - 1))) i--;
  const prefix = doc.slice(i, pos);
  if (doc.charAt(i - 1) !== "<") return null;
  // Look further back for `cite` token before `<`.
  // Skip optional whitespace.
  let j = i - 1;
  // Find `cite(` somewhere before the `<` (allowing optional whitespace).
  // Cheapest: scan back ~30 chars looking for `cite(`.
  const back = doc.slice(Math.max(0, j - 60), j);
  if (!/cite\s*\([^()]*$/.test(back)) return null;
  return { kind: "citation-key", prefix, from: i, to: pos };
}

/** `@label-prefix|` — label reference. */
function matchAtRef(
  doc: string,
  pos: number,
  node: SyntaxNode,
): AutocompleteContext | null {
  // Reject when we are inside a cite(<...>) — handled by matchCiteKey.
  // Walk back through identifier characters and check that the immediately
  // previous char is `@` AND the previous-previous is not part of email.
  let i = pos;
  while (i > 0 && IDENT_RE.test(doc.charAt(i - 1))) i--;
  if (doc.charAt(i - 1) !== "@") return null;
  // Heuristic: avoid emails — require char before `@` to be whitespace,
  // start-of-doc, or non-identifier.
  const prev = i - 2 >= 0 ? doc.charAt(i - 2) : "";
  if (prev && IDENT_RE.test(prev)) return null;
  // Also require we are not inside string/comment (already screened above).
  if (isInsideSilent(node)) return null;
  return {
    kind: "label-ref",
    prefix: doc.slice(i, pos),
    from: i,
    to: pos,
  };
}

/**
 * Detect cursor at the value slot of a named argument, e.g. `style: |` with
 * no value typed yet. The Typst grammar terminates the `Named` node at the
 * `:` when there is no value, so the cursor sits *outside* Named (somewhere
 * in the parent `Args`). We scan back through whitespace looking for the
 * `<Ident> :` pair to identify the param. Used to surface enum-value
 * completions with auto-inserted quotes, mirroring typst.app's behaviour at
 * `bibliography(style: |)`.
 */
function matchValueSlot(
  state: EditorState,
  pos: number,
  funcName: string,
  funcCall: SyntaxNode,
): AutocompleteContext | null {
  const doc = state.doc.toString();
  if (pos <= funcCall.from || pos > funcCall.to) return null;

  // Walk left from `pos` over whitespace and find the `:` and the
  // identifier before it. Bail out if anything else gets in the way.
  let i = pos;
  while (i > funcCall.from && /\s/.test(doc.charAt(i - 1))) i--;
  if (i <= funcCall.from || doc.charAt(i - 1) !== ":") return null;
  const colonAt = i - 1;

  // Skip the colon and any whitespace between `:` and the identifier.
  let j = colonAt;
  while (j > funcCall.from && /\s/.test(doc.charAt(j - 1))) j--;
  const identEnd = j;

  // Collect identifier chars to the left.
  let identStart = identEnd;
  while (identStart > funcCall.from && IDENT_RE.test(doc.charAt(identStart - 1))) {
    identStart--;
  }
  if (identStart === identEnd) return null;
  const paramName = doc.slice(identStart, identEnd);

  // The character right before the identifier must be a separator: `(` or
  // `,` (with optional whitespace). Otherwise we're not actually inside
  // the function's argument list at this position.
  let k = identStart;
  while (k > funcCall.from && /\s/.test(doc.charAt(k - 1))) k--;
  const prevCh = doc.charAt(k - 1);
  if (prevCh !== "(" && prevCh !== ",") return null;

  return {
    kind: "value-slot",
    funcName,
    paramName,
    prefix: "",
    from: pos,
    to: pos,
  };
}

/** Param-name completion when cursor is at a positional/named identifier slot. */
function matchParamName(
  state: EditorState,
  pos: number,
  funcName: string,
  funcCall: SyntaxNode,
): AutocompleteContext | null {
  const doc = state.doc.toString();
  // Walk back to find the start of the current identifier-ish token.
  let i = pos;
  while (i > 0 && IDENT_RE.test(doc.charAt(i - 1))) i--;
  const prefix = doc.slice(i, pos);
  // Require we're inside the call's Args range (or the call's own range).
  if (i < funcCall.from || pos > funcCall.to) return null;
  // Reject if the char right before the identifier is `.` (field access)
  // or `:` (we'd be inside a value, not at param name).
  const prev = doc.charAt(i - 1);
  if (prev === ".") return null;
  // Param name completion is only useful when the function is known.
  if (!getParamHostFunc(funcName)) return null;
  return { kind: "param-name", funcName, prefix, from: i, to: pos };
}

function getParamHostFunc(name: string): string | null {
  // Lightweight pre-check; full param map lives in stdlib.
  // We just need to confirm the function exists.
  // Avoid pulling `getFunction` to keep this module narrowly cohesive.
  return name;
}

/**
 * `#include "…"` / `#import "…"` — module path string. `include`/`import` are
 * Typst statements (not FuncCalls), so the grammar-based path above never
 * matches them. Detect purely from text: find the string literal the cursor is
 * in and confirm the keyword immediately before its opening quote. Robust to
 * unterminated strings (`#include "fo|`) the lezer parser hasn't closed yet.
 */
function matchModulePath(
  doc: string,
  pos: number,
): AutocompleteContext | null {
  // Walk back to the opening quote on the same line.
  let i = pos;
  while (i > 0) {
    const ch = doc.charAt(i - 1);
    if (ch === '"') break;
    if (ch === "\n") return null;
    i -= 1;
  }
  if (i === 0 || doc.charAt(i - 1) !== '"') return null;
  const contentStart = i;
  const quoteAt = i - 1;

  // Keyword immediately before the opening quote (skip whitespace).
  let j = quoteAt;
  while (j > 0 && /\s/.test(doc.charAt(j - 1))) j -= 1;
  const kwEnd = j;
  while (j > 0 && /[A-Za-z]/.test(doc.charAt(j - 1))) j -= 1;
  const keyword = doc.slice(j, kwEnd);
  if (keyword !== "include" && keyword !== "import") return null;

  // Replace from the content start up to the closing quote (or cursor).
  let k = pos;
  while (k < doc.length && doc.charAt(k) !== '"' && doc.charAt(k) !== "\n") k += 1;
  const to = doc.charAt(k) === '"' ? k : pos;

  return {
    kind: "file-path",
    funcName: keyword,
    prefix: doc.slice(contentStart, pos),
    from: contentStart,
    to,
  };
}

/** `#name|` markup — function-name completion. */
function matchHashName(
  doc: string,
  pos: number,
): AutocompleteContext | null {
  let i = pos;
  while (i > 0 && IDENT_RE.test(doc.charAt(i - 1))) i--;
  if (doc.charAt(i - 1) !== "#") return null;
  // Heuristic: previous char should not be alphanumeric (so we don't trigger
  // inside the middle of `abc#def` which is invalid anyway).
  const prev = i - 2 >= 0 ? doc.charAt(i - 2) : "";
  if (prev && /[A-Za-z0-9_]/.test(prev)) return null;
  return {
    kind: "function-name",
    prefix: doc.slice(i, pos),
    from: i,
    to: pos,
  };
}
