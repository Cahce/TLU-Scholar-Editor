/**
 * ProjectImportModal — drag-and-drop upload of a `.zip` to create a new
 * project on the server.
 *
 * The modal owns local state for: selected file, uploading flag, and error
 * message. On submit it calls `importProject(file)` and bubbles the new
 * Project up via `onImported`. The dashboard navigates to `/workspace/<id>`.
 */

import { useCallback, useRef, useState } from "react";
import { FileUp, Loader2, Upload, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Label } from "../../../components/ui/label";
import { importProject } from "../../../api/projects";
import type { Project, TemplateCategory } from "../../../types/api";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB — mirrors backend limit.

// Supported archive extensions (backend detects the real format from content;
// these gate the picker + give a friendly client-side message).
const ACCEPTED_EXTENSIONS = [
  ".zip",
  ".7z",
  ".rar",
  ".tar",
  ".tar.gz",
  ".tgz",
  ".gz",
] as const;

// `accept` attribute: extensions + the common archive MIME types.
const ACCEPT_ATTR = [
  ...ACCEPTED_EXTENSIONS,
  "application/zip",
  "application/x-7z-compressed",
  "application/vnd.rar",
  "application/x-rar-compressed",
  "application/x-tar",
  "application/gzip",
].join(",");

function isAcceptedArchive(name: string): boolean {
  const lower = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** Project categories + Vietnamese labels (mirrors backend TemplateCategory). */
const CATEGORY_OPTIONS: { value: TemplateCategory; label: string }[] = [
  { value: "thesis", label: "Luận văn" },
  { value: "report", label: "Báo cáo" },
  { value: "proposal", label: "Đề cương" },
  { value: "paper", label: "Bài báo" },
  { value: "presentation", label: "Trình chiếu" },
  { value: "other", label: "Khác" },
];

const DEFAULT_CATEGORY: TemplateCategory = "report";

interface ProjectImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (project: Project) => void;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProjectImportModal({
  open,
  onOpenChange,
  onImported,
}: ProjectImportModalProps): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<TemplateCategory>(DEFAULT_CATEGORY);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const reset = useCallback(() => {
    setFile(null);
    setCategory(DEFAULT_CATEGORY);
    setUploading(false);
    setError(null);
    setIsDragging(false);
  }, []);

  const validateAndSet = useCallback((candidate: File | null) => {
    if (!candidate) {
      setFile(null);
      return;
    }
    if (!isAcceptedArchive(candidate.name)) {
      setError("Chỉ chấp nhận tệp nén: .zip, .7z, .rar, .tar, .tar.gz");
      setFile(null);
      return;
    }
    if (candidate.size > MAX_BYTES) {
      setError(`Tệp vượt quá ${formatBytes(MAX_BYTES)}`);
      setFile(null);
      return;
    }
    setError(null);
    setFile(candidate);
  }, []);

  const handleDrop = useCallback(
    (ev: React.DragEvent<HTMLDivElement>) => {
      ev.preventDefault();
      setIsDragging(false);
      const dropped = ev.dataTransfer.files?.[0] ?? null;
      validateAndSet(dropped);
    },
    [validateAndSet],
  );

  const handleSubmit = useCallback(async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const project = await importProject(file, category);
      onImported(project);
      reset();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Nhập dự án thất bại";
      setError(message);
    } finally {
      setUploading(false);
    }
  }, [file, category, uploading, onImported, reset]);

  const handleClose = useCallback(
    (next: boolean) => {
      if (uploading) return; // Don't allow close during upload.
      if (!next) reset();
      onOpenChange(next);
    },
    [uploading, onOpenChange, reset],
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nhập dự án từ tệp nén</DialogTitle>
          <DialogDescription>
            Tải lên tệp nén (<code>.zip</code>, <code>.7z</code>,{" "}
            <code>.rar</code>, <code>.tar</code>, <code>.tar.gz</code>) để tạo
            một dự án mới. Tối đa {formatBytes(MAX_BYTES)}.
          </DialogDescription>
        </DialogHeader>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`mt-2 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
            isDragging
              ? "border-[#007bff] bg-blue-50"
              : "border-slate-300 bg-slate-50"
          }`}
          aria-label="Khu vực kéo thả tệp nén"
        >
          {file ? (
            <div className="flex w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
              <FileUp className="h-4 w-4 shrink-0 text-[#007bff]" />
              <div className="flex-1 truncate text-left text-sm text-slate-700">
                {file.name}
                <span className="ml-2 text-xs text-slate-400">
                  {formatBytes(file.size)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                disabled={uploading}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Bỏ chọn"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 text-slate-400" />
              <p className="text-sm text-slate-600">
                Kéo thả tệp nén vào đây, hoặc{" "}
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="font-medium text-[#007bff] hover:underline"
                >
                  chọn từ máy
                </button>
                .
              </p>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT_ATTR}
                onChange={(e) => validateAndSet(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <Label htmlFor="import-category" className="text-sm text-slate-700">
            Loại dự án
          </Label>
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as TemplateCategory)}
            disabled={uploading}
          >
            <SelectTrigger id="import-category" className="w-full">
              <SelectValue placeholder="Chọn loại dự án" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={uploading}
          >
            Hủy
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={!file || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Đang tạo...
              </>
            ) : (
              "Tạo dự án"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
