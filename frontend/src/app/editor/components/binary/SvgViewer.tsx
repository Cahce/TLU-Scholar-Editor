import type { ProjectFile } from "../../types/editor";
import { RasterOrVectorViewer } from "./RasterOrVectorViewer";

export function SvgViewer({ file }: { file: ProjectFile }): JSX.Element {
  return <RasterOrVectorViewer file={file} formatLabel="SVG" />;
}
