/**
 * Hover tooltip extension — shows function documentation when the user
 * hovers over a known Typst identifier (e.g. `figure`, `bibliography`,
 * `align`).
 *
 * Mirrors what tinymist + VSCode does: the LSP returns a Hover response
 * with signature + description + example markdown, and the editor floats
 * it above the symbol. We don't have an LSP here — we look the word up
 * in `typst-stdlib.json` and render the same DOM the autocomplete info
 * tooltip uses, so styling stays consistent.
 *
 * Reference (tinymist):
 *   - `crates/tinymist-query/src/hover.rs` (HoverRequest)
 *   - `crates/tinymist-analysis/src/docs/def.rs` (SignatureDocs.hover_docs)
 */

import { hoverTooltip, type Tooltip } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import type { EditorState } from "@codemirror/state";
import type { SyntaxNode } from "@lezer/common";
import { getFunction } from "./stdlib";
import { renderFunctionInfo } from "./richInfo";

/** Nodes inside which hover docs should stay silent — comments, raw
 * blocks, string literals. Math mode is allowed (math identifiers like
 * `sin`, `lim` may map to stdlib functions in future). Mirrors
 * `patterns.ts` SILENT_NODES with the subset that matters for hover. */
const HOVER_SILENT_NODES = new Set<string>([
  "LineComment",
  "BlockComment",
  "Comment",
  "Raw",
  "RawTrimmed",
  "RawDelim",
  "Str",
]);

function isInsideSilent(node: SyntaxNode): boolean {
  for (let cur: SyntaxNode | null = node; cur; cur = cur.parent) {
    if (HOVER_SILENT_NODES.has(cur.name)) return true;
  }
  return false;
}

function buildHover(state: EditorState, pos: number): Tooltip | null {
  // Reject hover inside comments / strings / raw blocks. Use the
  // resolveInner so we know exactly which leaf the cursor is on.
  const tree = syntaxTree(state);
  const leaf = tree.resolveInner(pos, 1);
  if (isInsideSilent(leaf)) return null;

  // `wordAt(pos)` returns the bounds of the contiguous word. CodeMirror
  // computes this from the current language's wordChars / charCategorizer
  // — for the Typst grammar this picks up identifiers like `figure` and
  // `bibliography` while leaving punctuation (`#`, `(`, `:`) outside.
  const word = state.wordAt(pos);
  if (!word) return null;

  const text = state.doc.sliceString(word.from, word.to);
  const fn = getFunction(text);
  if (!fn) return null;

  return {
    pos: word.from,
    end: word.to,
    above: true,
    create: () => {
      const wrapper = document.createElement("div");
      wrapper.className = "cm-hover-tooltip";
      wrapper.appendChild(renderFunctionInfo(fn));
      return { dom: wrapper };
    },
  };
}

export function typstHoverExtension() {
  // `hoverTime` defaults to 750ms which feels sluggish next to VSCode
  // (~300ms). Drop it to 300ms so docs feel responsive without firing on
  // accidental mouseovers.
  return hoverTooltip(
    (view, pos) => buildHover(view.state, pos),
    { hoverTime: 300, hideOnChange: true },
  );
}
