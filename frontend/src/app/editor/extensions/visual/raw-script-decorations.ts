/**
 * Raw script / code block styling for visual mode
 * (spec: visual-editor-overleaf, Phase 5 / R5).
 *
 * Typst code logic — `#let`, `#set`, `#show`, `#import`, control flow, `#{ … }`
 * blocks, and non-visual custom function calls — is NOT rendered as visual UI.
 * The visual editor already leaves these as raw editable source (isolation /
 * no-crash, R5.2). This layer just *styles* such lines as a monospace "code
 * block" so the user can tell raw script apart from prose.
 *
 * Safety: we ONLY use `Decoration.line` (a class on the existing `.cm-line`).
 * It never replaces, hides, or freezes text — the source stays fully editable
 * and there is zero risk of swallowing content. Line classification is a
 * heuristic (start-of-line tokens + a `#{ … }` brace tracker), independent of
 * uncertain Lezer node names.
 */

import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import type { Range } from "@codemirror/state";

const LINE_DECO = Decoration.line({ class: "cm-typst-raw-script-line" });

// `#let`, `#set`, `#show`, `#import`, `#include`, control-flow keywords.
const CODE_KEYWORD_RE =
  /^\s*#(let|set|show|import|include|if|else|for|while|return|context|break|continue)\b/;
// `#{ … }` code block or `#( … )` code group opener.
const CODE_OPENER_RE = /^\s*#[{(]/;
// A markup function call at line start: `#name(`.
const FUNC_CALL_LINE_RE = /^\s*#([a-zA-Z_][\w.-]*)\s*\(/;
// These render as their own visual widgets (handled elsewhere) — don't also
// paint their line as raw code.
const VISUAL_FUNCS = new Set(["image", "figure", "table", "quote"]);

// Guard against pathological file sizes: line-scanning the whole doc is cheap
// but we cap it so a 100k-line paste can't jank typing.
const MAX_LINES = 20000;

function netBraceDelta(text: string): number {
  let delta = 0;
  for (const ch of text) {
    if (ch === "{") delta++;
    else if (ch === "}") delta--;
  }
  return delta;
}

function buildRawScriptDecorations(view: EditorView): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  const doc = view.state.doc;
  if (doc.lines > MAX_LINES) return Decoration.none;

  // Whole-doc line scan so a `#{ … }` block opened above the viewport still
  // styles its continuation lines. CM only renders the visible subset.
  let braceDepth = 0;
  try {
    for (let n = 1; n <= doc.lines; n++) {
      const line = doc.line(n);
      const text = line.text;

      let isCode = false;
      if (braceDepth > 0) {
        // Inside an open `#{ … }` block.
        isCode = true;
        braceDepth += netBraceDelta(text);
        if (braceDepth < 0) braceDepth = 0;
      } else if (CODE_KEYWORD_RE.test(text) || CODE_OPENER_RE.test(text)) {
        isCode = true;
        braceDepth = Math.max(0, netBraceDelta(text));
      } else {
        const m = FUNC_CALL_LINE_RE.exec(text);
        if (m && !VISUAL_FUNCS.has(m[1])) {
          isCode = true;
        }
      }

      if (isCode) ranges.push(LINE_DECO.range(line.from));
    }
  } catch (err) {
    console.warn("[visual] raw-script decorations build failed:", err);
    return Decoration.none;
  }

  return Decoration.set(ranges, true);
}

export const rawScriptDecorationsExt = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildRawScriptDecorations(view);
    }

    update(u: ViewUpdate) {
      // Line classification depends only on text, so a doc change is the only
      // trigger that can flip it (whole-doc set already covers scrolling).
      if (u.docChanged) {
        this.decorations = buildRawScriptDecorations(u.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);
