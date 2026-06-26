import type { ProjectFile } from "../../types/editor";
import { RasterOrVectorViewer } from "./RasterOrVectorViewer";

function formatLabelFor(mimeType: string | null): string {
  if (!mimeType) return "Image";
  if (mimeType.includes("png")) return "PNG image";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "JPEG image";
  if (mimeType.includes("gif")) return "GIF image";
  if (mimeType.includes("webp")) return "WebP image";
  if (mimeType.includes("bmp")) return "BMP image";
  return "Image";
}

export function ImageViewer({ file }: { file: ProjectFile }): JSX.Element {
  return <RasterOrVectorViewer file={file} formatLabel={formatLabelFor(file.mimeType)} />;
}
