/**
 * useBibTargetPath Hook
 *
 * Auto-detect the bibliography file the user is actively working against.
 * Used by Zotero "Chèn" / OpenAlex import / sync dialogs so the suggested
 * target path matches whatever `#bibliography("…")` the project's `.typ`
 * files reference. Avoids the previous behaviour where sync always wrote
 * to the first `.bib` file in the tree even when `main.typ` was pointing
 * at `ref.yml`.
 *
 * Priority order:
 *   1. Bib path referenced by the currently active `.typ` editor tab.
 *   2. Bib path referenced by `main.typ` (project convention).
 *   3. Bib path referenced by the first `.typ` file in the tree.
 *   4. First bibliography file present in the tree (regardless of reference).
 *   5. Fallback constant `"bibliography.bib"` so callers always get a string.
 */

import { useMemo } from "react";
import { useEditorStore } from "../state/editorStore";
import { extractBibReferences } from "../utils/extractBibReferences";
import {
  detectBibFormat,
  isBibPath,
  type BibFormat,
} from "../lib/bibFormat";

export interface BibTarget {
  suggestedPath: string;
  format: BibFormat;
}

const FALLBACK_PATH = "bibliography.bib";

export function useBibTargetPath(): BibTarget {
  const files = useEditorStore((s) => s.files);
  const drafts = useEditorStore((s) => s.drafts);
  const activePath = useEditorStore((s) => s.activePath);

  return useMemo(() => {
    const typFiles = Object.values(files).filter((f) => f.path.endsWith(".typ"));

    // Collect references once per .typ source. Prefer the in-memory draft
    // content over the stored textContent — the user may have just typed a
    // new `#bibliography("…")` line without saving.
    const refsByPath = new Map<string, string[]>();
    for (const f of typFiles) {
      const content = drafts[f.path]?.content ?? f.textContent ?? "";
      if (!content) continue;
      refsByPath.set(f.path, extractBibReferences(content));
    }

    const pickFromTyp = (typPath: string | undefined): string | null => {
      if (!typPath) return null;
      const refs = refsByPath.get(typPath) ?? [];
      return refs.find(isBibPath) ?? null;
    };

    let target: string | null = pickFromTyp(activePath ?? undefined);
    if (!target) target = pickFromTyp("main.typ");
    if (!target && typFiles[0]) target = pickFromTyp(typFiles[0].path);
    if (!target) {
      target =
        Object.values(files).find((f) => isBibPath(f.path))?.path ?? null;
    }
    if (!target) target = FALLBACK_PATH;

    return { suggestedPath: target, format: detectBibFormat(target) ?? "bibtex" };
  }, [files, drafts, activePath]);
}
