import { useEffect, useRef, useState } from "react";
import type { ProjectFile } from "../../types/editor";
import { BinaryViewerShell } from "./BinaryViewerShell";

function basename(path: string): string {
  const i = path.lastIndexOf("/");
  return i >= 0 ? path.slice(i + 1) : path;
}

export function PdfViewer({ file }: { file: ProjectFile }): JSX.Element {
  const [url, setUrl] = useState<string | null>(null);
  const lastUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!file.binaryContent) {
      setUrl(null);
      return;
    }
    const blob = new Blob([file.binaryContent], {
      type: file.mimeType ?? "application/pdf",
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
      format="PDF"
      sizeBytes={file.sizeBytes}
      lastChangedAt={file.lastEditedAt ?? file.updatedAt}
      mimeType={file.mimeType}
      path={file.path}
    >
      <div className="h-full min-h-0 bg-slate-100">
        {url ? (
          <iframe
            src={url}
            title={basename(file.path)}
            className="w-full h-full border-0"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            Đang tải {basename(file.path)}...
          </div>
        )}
      </div>
    </BinaryViewerShell>
  );
}
