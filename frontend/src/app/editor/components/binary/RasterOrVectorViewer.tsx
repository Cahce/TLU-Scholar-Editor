import { useEffect, useRef, useState } from "react";
import type { ProjectFile } from "../../types/editor";
import { BinaryViewerShell } from "./BinaryViewerShell";

interface RasterOrVectorViewerProps {
  file: ProjectFile;
  formatLabel: string;
}

function basename(path: string): string {
  const i = path.lastIndexOf("/");
  return i >= 0 ? path.slice(i + 1) : path;
}

/**
 * Shared viewer for raster images (PNG/JPG/GIF/WebP) and SVG.
 * Both can be rendered through `<img src={blobUrl}>` — the browser reads
 * `naturalWidth/Height` from the viewBox for SVG, identical to raster decode
 * semantics. One code path, two thin wrappers.
 */
export function RasterOrVectorViewer({
  file,
  formatLabel,
}: RasterOrVectorViewerProps): JSX.Element {
  const [url, setUrl] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [error, setError] = useState(false);
  const lastUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setDims(null);
    setError(false);
    if (!file.binaryContent) {
      setUrl(null);
      return;
    }
    const blob = new Blob([file.binaryContent], {
      type: file.mimeType ?? "application/octet-stream",
    });
    const next = URL.createObjectURL(blob);
    if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
    lastUrlRef.current = next;
    setUrl(next);
    return () => {
      if (lastUrlRef.current === next) {
        URL.revokeObjectURL(next);
        lastUrlRef.current = null;
      }
    };
  }, [file.binaryContent, file.mimeType]);

  return (
    <BinaryViewerShell
      format={formatLabel}
      resolution={
        dims && dims.w > 0 && dims.h > 0 ? `${dims.w} × ${dims.h}` : null
      }
      sizeBytes={file.sizeBytes}
      lastChangedAt={file.lastEditedAt ?? file.updatedAt}
      mimeType={file.mimeType}
      path={file.path}
    >
      <div className="h-full flex items-center justify-center p-6 min-h-0 overflow-auto">
        {url && !error ? (
          <img
            src={url}
            alt={basename(file.path)}
            className="max-w-full max-h-full object-contain drop-shadow-sm"
            onLoad={(e) =>
              setDims({
                w: e.currentTarget.naturalWidth,
                h: e.currentTarget.naturalHeight,
              })
            }
            onError={() => setError(true)}
          />
        ) : (
          <div className="text-slate-500 text-sm">
            {error
              ? `Không thể hiển thị ${basename(file.path)}`
              : `Đang tải ${basename(file.path)}...`}
          </div>
        )}
      </div>
    </BinaryViewerShell>
  );
}
