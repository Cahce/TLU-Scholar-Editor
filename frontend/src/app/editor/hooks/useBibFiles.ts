/**
 * useBibFiles Hook
 *
 * Lists bibliography files in the current project. Recognises both BibTeX
 * (`.bib`) and Hayagriva YAML (`.yml`/`.yaml`) — Typst native supports both,
 * so the editor needs to surface either to the user.
 */

import { useMemo } from "react";
import { useEditorStore } from "../state/editorStore";
import { isBibPath } from "../lib/bibFormat";

export function useBibFiles() {
  const files = useEditorStore((s) => s.files);

  const bibFiles = useMemo(() => {
    return Object.values(files)
      .filter((f) => isBibPath(f.path))
      .map((f) => ({ path: f.path }));
  }, [files]);

  return {
    bibFiles,
    suggestedPath: bibFiles.length > 0 ? bibFiles[0].path : "bibliography.bib",
  };
}
