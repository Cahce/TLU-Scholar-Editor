import { syntaxTree } from "@codemirror/language";
import type { Range } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";

import { NODE } from "./typst-node-names";

const STRONG_MARK = Decoration.mark({ class: "cm-typst-strong" });
const EMPH_MARK = Decoration.mark({ class: "cm-typst-emph" });
const RAW_INLINE_MARK = Decoration.mark({ class: "cm-typst-raw-inline" });
// Bare autolink (https://…). Mark, not replace: URLs stay directly editable;
// Ctrl/Cmd+click opening is handled by `linkClickExtension`.
const LINK_MARK = Decoration.mark({ class: "cm-typst-link" });

function isInlineRaw(
  doc: { sliceString: (a: number, b: number) => string; lineAt: (p: number) => { number: number } },
  from: number,
  to: number,
): boolean {
  // Block raw is fenced with triple backticks and always spans more than one
  // line. Cheap check: same start/end line + the snippet doesn't begin with
  // three backticks.
  if (doc.lineAt(from).number !== doc.lineAt(to).number) return false;
  const text = doc.sliceString(from, Math.min(from + 3, to));
  return !text.startsWith("```");
}

function buildMarks(view: EditorView): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  const doc = view.state.doc;

  try {
    for (const { from, to } of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from,
        to,
        enter(node) {
          if (node.from >= node.to) return;
          switch (node.name) {
            case NODE.Strong:
              ranges.push(STRONG_MARK.range(node.from, node.to));
              break;
            case NODE.Emph:
              ranges.push(EMPH_MARK.range(node.from, node.to));
              break;
            case NODE.Raw:
              if (isInlineRaw(doc, node.from, node.to)) {
                ranges.push(RAW_INLINE_MARK.range(node.from, node.to));
              }
              break;
            case NODE.Link:
              ranges.push(LINK_MARK.range(node.from, node.to));
              break;
            default:
              break;
          }
        },
      });
    }
  } catch (err) {
    console.warn("[visual] mark decorations build failed:", err);
    return Decoration.none;
  }

  return Decoration.set(ranges, true);
}

export const markDecorationsExt = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildMarks(view);
    }

    update(u: ViewUpdate) {
      if (
        u.docChanged ||
        u.viewportChanged ||
        syntaxTree(u.startState) !== syntaxTree(u.state)
      ) {
        this.decorations = buildMarks(u.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);
