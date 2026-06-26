import { Type } from "lucide-react";
import type { ProjectFile } from "../../types/editor";
import { BinaryViewerShell } from "./BinaryViewerShell";

function formatLabelFor(mimeType: string | null, path: string): string {
  const lower = (mimeType ?? "").toLowerCase();
  const ext = path.toLowerCase().split(".").pop() ?? "";
  if (lower.includes("ttf") || ext === "ttf") return "Font (TTF)";
  if (lower.includes("otf") || ext === "otf") return "Font (OTF)";
  if (lower.includes("woff2") || ext === "woff2") return "Font (WOFF2)";
  if (lower.includes("woff") || ext === "woff") return "Font (WOFF)";
  return "Font";
}

/**
 * Phase 1: metadata-only viewer for font files. No visual preview because
 * displaying glyphs requires registering the file as an @font-face dynamically.
 *
 * Phase 2 follow-up: register the font on mount and render a sample string
 * (e.g. "The quick brown fox jumps over the lazy dog") with the loaded family.
 */
export function FontViewer({ file }: { file: ProjectFile }): JSX.Element {
  return (
    <BinaryViewerShell
      format={formatLabelFor(file.mimeType, file.path)}
      sizeBytes={file.sizeBytes}
      lastChangedAt={file.lastEditedAt ?? file.updatedAt}
      mimeType={file.mimeType}
      path={file.path}
    >
      <div className="h-full flex items-center justify-center p-6 min-h-0">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Type className="w-16 h-16" strokeWidth={1.2} />
          <p className="text-xs">Không có preview trực quan cho font</p>
        </div>
      </div>
    </BinaryViewerShell>
  );
}
