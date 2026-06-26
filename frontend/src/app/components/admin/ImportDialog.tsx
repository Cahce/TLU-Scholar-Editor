import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { ModalShell } from "./ModalShell";
import { ApiError } from "../../api/client";
import type { ImportResult } from "../../types/admin";

type Stage = "idle" | "picked" | "uploading" | "done";

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title: string;
  resourceLabel: string;
  importFn: (file: File) => Promise<ImportResult>;
  downloadTemplateFn: () => Promise<Blob>;
  templateFilename: string;
}

const ACCEPT = ".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv";
const MAX_BYTES = 5 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function ImportDialog({
  isOpen,
  onClose,
  onSuccess,
  title,
  resourceLabel,
  importFn,
  downloadTemplateFn,
  templateFilename,
}: ImportDialogProps) {
  const [stage, setStage] = useState<Stage>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setStage("idle");
      setFile(null);
      setResult(null);
      setError(null);
      setDragging(false);
    }
  }, [isOpen]);

  const pickFile = (incoming: File | null | undefined) => {
    if (!incoming) return;
    if (incoming.size > MAX_BYTES) {
      setError(`File quá lớn. Kích thước tối đa: ${formatBytes(MAX_BYTES)}`);
      return;
    }
    const lower = incoming.name.toLowerCase();
    if (!lower.endsWith(".xlsx") && !lower.endsWith(".csv")) {
      setError("Chỉ chấp nhận file XLSX hoặc CSV");
      return;
    }
    if (lower.endsWith(".xlsm")) {
      setError("Không chấp nhận file .xlsm (có macro). Vui lòng dùng .xlsx");
      return;
    }
    setError(null);
    setFile(incoming);
    setStage("picked");
  };

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    setError(null);
    try {
      const blob = await downloadTemplateFn();
      downloadBlob(blob, templateFilename);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Không tải được file mẫu",
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStage("uploading");
    setError(null);
    try {
      const r = await importFn(file);
      setResult(r);
      setStage("done");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Tải file thất bại";
      setError(message);
      setStage("picked");
    }
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
  };

  const copyPasswordsCsv = async () => {
    if (!result?.generatedPasswords?.length) return;
    const header = "row,email,password";
    const rows = result.generatedPasswords
      .map((g) => `${g.row},${g.email},${g.password}`)
      .join("\n");
    const csv = `${header}\n${rows}`;
    try {
      await navigator.clipboard.writeText(csv);
    } catch {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      downloadBlob(blob, "generated_passwords.csv");
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      dismissable={stage !== "uploading"}
    >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {stage !== "done" && (
            <>
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-sm text-slate-600">
                  Tải file mẫu, điền dữ liệu rồi tải lên để nhập hàng loạt {resourceLabel}.
                </p>
                <Button
                  variant="outline"
                  onClick={handleDownloadTemplate}
                  disabled={downloading || stage === "uploading"}
                  className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 shadow-sm shrink-0"
                >
                  {downloading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Tải mẫu
                </Button>
              </div>

              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  if (stage !== "uploading") setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  if (stage === "uploading") return;
                  pickFile(e.dataTransfer.files?.[0]);
                }}
                className={[
                  "flex flex-col items-center justify-center gap-3 cursor-pointer rounded-2xl border-2 border-dashed px-6 py-10 transition-colors",
                  dragging
                    ? "border-[#007bff] bg-[#007bff]/5"
                    : "border-slate-200 bg-slate-50 hover:bg-slate-100",
                ].join(" ")}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0])}
                  disabled={stage === "uploading"}
                />
                <FileSpreadsheet className="w-10 h-10 text-slate-400" />
                {file ? (
                  <div className="text-center">
                    <p className="font-medium text-slate-800">{file.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatBytes(file.size)}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="font-medium text-slate-700">Kéo thả file vào đây hoặc bấm để chọn</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Định dạng: .xlsx hoặc .csv · tối đa 5MB · 5000 dòng
                    </p>
                  </div>
                )}
              </label>
            </>
          )}

          {stage === "done" && result && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiTile label="Tổng" value={result.total} tone="slate" />
                <KpiTile label="Tạo mới" value={result.created} tone="green" />
                <KpiTile label="Bỏ qua" value={result.skipped} tone="amber" />
                <KpiTile label="Lỗi" value={result.failed} tone="rose" />
              </div>

              {result.errors.length > 0 && (
                <div className="rounded-xl border border-rose-200 overflow-hidden">
                  <div className="px-4 py-2 bg-rose-50 text-sm font-medium text-rose-700">
                    Chi tiết lỗi ({result.errors.length})
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white border-b border-slate-200 text-left text-slate-500">
                        <tr>
                          <th className="px-4 py-2 w-16">Dòng</th>
                          <th className="px-4 py-2 w-40">Mã lỗi</th>
                          <th className="px-4 py-2">Mô tả</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.errors.map((e, idx) => (
                          <tr
                            key={`${e.row}-${idx}`}
                            className="border-b border-slate-100 last:border-b-0"
                          >
                            <td className="px-4 py-2 text-slate-700">{e.row}</td>
                            <td className="px-4 py-2 font-mono text-xs text-slate-600">
                              {e.code}
                            </td>
                            <td className="px-4 py-2 text-slate-700">{e.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result.generatedPasswords && result.generatedPasswords.length > 0 && (
                <div className="rounded-xl border border-amber-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-amber-50">
                    <div className="text-sm font-medium text-amber-800">
                      Mật khẩu tự sinh ({result.generatedPasswords.length})
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyPasswordsCsv}
                      className="h-8 border-amber-300 text-amber-800 bg-white hover:bg-amber-100"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      Sao chép CSV
                    </Button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white border-b border-slate-200 text-left text-slate-500">
                        <tr>
                          <th className="px-4 py-2 w-16">Dòng</th>
                          <th className="px-4 py-2">Email</th>
                          <th className="px-4 py-2 w-48">Mật khẩu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.generatedPasswords.map((g, idx) => (
                          <tr
                            key={`${g.row}-${idx}`}
                            className="border-b border-slate-100 last:border-b-0"
                          >
                            <td className="px-4 py-2 text-slate-700">{g.row}</td>
                            <td className="px-4 py-2 text-slate-700">{g.email}</td>
                            <td className="px-4 py-2 font-mono text-xs text-slate-800">
                              {g.password}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-2 bg-white border-t border-amber-200 text-xs text-amber-700">
                    Lưu lại mật khẩu này — đóng hộp thoại sẽ không thể xem lại.
                  </div>
                </div>
              )}

              {result.failed === 0 && result.errors.length === 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" />
                  Hoàn tất không có lỗi.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-end gap-3 shrink-0">
          {stage === "done" ? (
            <Button
              onClick={handleFinish}
              className="bg-[#007bff] hover:bg-[#0056b3] text-white shadow-sm min-w-[120px]"
            >
              Đóng và làm mới
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={stage === "uploading"}
                className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 min-w-[100px] shadow-sm"
              >
                Hủy
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!file || stage === "uploading"}
                className="bg-[#007bff] hover:bg-[#0056b3] text-white shadow-sm min-w-[140px]"
              >
                {stage === "uploading" ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang nhập...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Bắt đầu nhập
                  </>
                )}
              </Button>
            </>
          )}
        </div>
    </ModalShell>
  );
}

function KpiTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "green" | "amber" | "rose";
}) {
  const toneClasses: Record<typeof tone, string> = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClasses[tone]}`}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-2xl font-semibold mt-0.5">{value}</div>
    </div>
  );
}
