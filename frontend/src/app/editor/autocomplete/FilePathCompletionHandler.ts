/**
 * File path completion source.
 *
 * Active when the cursor is inside a path string — either the first positional
 * string argument of a path function (`image`, `read`, `csv`, …) or a
 * `#include "…"` / `#import "…"` module statement.
 *
 * Suggestions are emitted **relative to the file being edited** (e.g.
 * `../00-Title/00-Title.typ`), matching how Typst resolves the path and how
 * typst.app presents the list — not as absolute project paths.
 */

import {
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { detectContext } from "./patterns";
import { useEditorStore } from "../state/editorStore";
import { filePathExtensions } from "./stdlib";

/** POSIX dirname — project paths always use `/`. */
function dirOf(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx >= 0 ? path.slice(0, idx) : "";
}

/**
 * Path of `target` relative to directory `fromDir`, POSIX-style:
 *   (`90-Document`, `00-Title/00-Title.typ`) → `../00-Title/00-Title.typ`
 *   (`90-Document`, `90-Document/91-Doc.typ`) → `91-Doc.typ`
 *   (``,            `chapters/intro.typ`)      → `chapters/intro.typ`
 */
function posixRelative(fromDir: string, target: string): string {
  const fromParts = fromDir ? fromDir.split("/").filter(Boolean) : [];
  const toParts = target.split("/").filter(Boolean);
  let i = 0;
  while (
    i < fromParts.length &&
    i < toParts.length &&
    fromParts[i] === toParts[i]
  ) {
    i += 1;
  }
  const up = fromParts.length - i;
  const rel = [...Array(up).fill(".."), ...toParts.slice(i)].join("/");
  return rel || (toParts[toParts.length - 1] ?? target);
}

export function filePathCompletionSource(
  ctx: CompletionContext,
): CompletionResult | null {
  const c = detectContext(ctx.state, ctx.pos);
  if (c.kind !== "file-path") return null;
  // Package imports (`@preview/…`, `@local/…`) are not local project files.
  if (c.prefix.startsWith("@")) return null;

  const exts = filePathExtensions(c.funcName);
  const { files, activePath } = useEditorStore.getState();
  const fromDir = activePath ? dirOf(activePath) : "";

  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const path of Object.keys(files)) {
    if (path === activePath) continue; // a file can't include itself
    if (exts.length > 0) {
      const ext = path.toLowerCase().split(".").pop() ?? "";
      if (!exts.includes(ext)) continue;
    }
    const rel = posixRelative(fromDir, path);
    if (seen.has(rel)) continue;
    seen.add(rel);
    candidates.push(rel);
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.localeCompare(b));

  return {
    from: c.from,
    to: c.to,
    validFor: /^[^"\\]*$/,
    options: candidates.map((path) => ({
      label: path,
      type: "text",
    })),
  };
}
