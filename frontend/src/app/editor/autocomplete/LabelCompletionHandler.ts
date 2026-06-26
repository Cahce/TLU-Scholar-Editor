/**
 * Label completion: surfaces document labels (`<intro>`, `<chapter-1>`,
 * etc.) when the user is typing an `@…` reference.
 *
 * Implementation walks the active document's syntax tree and collects
 * every `Label` node. Tinymist does this through `analyze_labels`; we
 * approximate by tree-iterating the current `EditorState`.
 */

import { syntaxTree } from "@codemirror/language";
import {
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { detectContext } from "./patterns";

export function labelCompletionSource(
  ctx: CompletionContext,
): CompletionResult | null {
  const c = detectContext(ctx.state, ctx.pos);
  if (c.kind !== "label-ref") return null;

  const labels = collectLabels(ctx);
  if (labels.length === 0) return null;

  return {
    from: c.from,
    to: c.to,
    validFor: /^[a-zA-Z0-9_-]*$/,
    options: labels.map((name) => ({
      label: name,
      type: "variable",
    })),
  };
}

function collectLabels(ctx: CompletionContext): string[] {
  const doc = ctx.state.doc;
  const tree = syntaxTree(ctx.state);
  const found = new Set<string>();

  tree.iterate({
    enter(node) {
      if (node.name !== "Label") return;
      const raw = doc.sliceString(node.from, node.to);
      // Label nodes include the surrounding `<...>`.
      const inner = raw.replace(/^</, "").replace(/>$/, "").trim();
      if (inner) found.add(inner);
    },
  });

  return Array.from(found).sort();
}
