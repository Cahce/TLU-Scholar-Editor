import { useEffect } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { useEditorStore } from "../../state/editorStore";
import { ImageViewer } from "./ImageViewer";
import { SvgViewer } from "./SvgViewer";
import { PdfViewer } from "./PdfViewer";
import { FontViewer } from "./FontViewer";

function StatusFrame({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-white">
      <div className="text-center text-slate-500">{children}</div>
    </div>
  );
}

function BinaryEmpty({ message }: { message: string }): JSX.Element {
  return (
    <StatusFrame>
      <AlertCircle className="w-5 h-5 mx-auto mb-2 text-slate-400" />
      <p className="text-sm">{message}</p>
    </StatusFrame>
  );
}

function BinaryLoading({ path }: { path: string }): JSX.Element {
  return (
    <StatusFrame>
      <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin text-slate-400" />
      <p className="text-sm">Đang tải tệp {path}...</p>
    </StatusFrame>
  );
}

function BinaryError({ message }: { message: string }): JSX.Element {
  return (
    <StatusFrame>
      <AlertCircle className="w-5 h-5 mx-auto mb-2 text-red-400" />
      <p className="text-sm">{message}</p>
    </StatusFrame>
  );
}

export function BinaryFileViewer({ path }: { path: string }): JSX.Element {
  const file = useEditorStore((s) => s.files[path]);
  const ensureBinaryLoaded = useEditorStore((s) => s.ensureBinaryLoaded);

  // Fallback trigger — covers edge cases where setActivePath dispatch lost the
  // race (e.g. tab restored from IDB before store metadata arrived, or store
  // bootstrap raced with a quick tab click).
  useEffect(() => {
    if (file && !file.binaryContent && file.storageKey) {
      void ensureBinaryLoaded(path);
    }
  }, [path, file, ensureBinaryLoaded]);

  if (!file) return <BinaryEmpty message={`Tệp ${path} không tồn tại`} />;
  if (!file.binaryContent && file.storageKey) return <BinaryLoading path={path} />;
  if (!file.binaryContent) {
    return <BinaryError message="Không có dữ liệu nhị phân cho tệp này" />;
  }

  switch (file.kind) {
    case "image":
      return <ImageViewer file={file} />;
    case "vector":
      return <SvgViewer file={file} />;
    case "pdf":
      return <PdfViewer file={file} />;
    case "font":
      return <FontViewer file={file} />;
    default:
      return <BinaryError message={`Định dạng "${file.kind}" chưa được hỗ trợ`} />;
  }
}
