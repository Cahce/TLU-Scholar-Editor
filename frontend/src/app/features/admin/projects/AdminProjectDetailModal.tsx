import { useEffect, useState } from "react";
import {
  X,
  FileText,
  FileArchive,
  ExternalLink,
  Loader2,
  AlertCircle,
  User,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { getAdminProject } from "../../../api/admin/projects";
import { CATEGORY_LABELS, type AdminProjectDetail } from "../../../types/adminProjects";

interface DownloadTarget {
  id: string;
  title: string;
  hasPdf: boolean;
}

interface AdminProjectDetailModalProps {
  projectId: string | null;
  open: boolean;
  onClose: () => void;
  onDownloadZip: (target: DownloadTarget) => void;
  onDownloadPdf: (target: DownloadTarget) => void;
  onOpenWorkspace: (id: string) => void;
  downloadingZipId: string | null;
  downloadingPdfId: string | null;
}

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("vi-VN");
}

export function AdminProjectDetailModal({
  projectId,
  open,
  onClose,
  onDownloadZip,
  onDownloadPdf,
  onOpenWorkspace,
  downloadingZipId,
  downloadingPdfId,
}: AdminProjectDetailModalProps) {
  const [detail, setDetail] = useState<AdminProjectDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !projectId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    getAdminProject(projectId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Không tải được chi tiết dự án");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  if (!open) return null;

  const owner = detail?.owner ?? null;
  const zipBusy = detail != null && downloadingZipId === detail.id;
  const pdfBusy = detail != null && downloadingPdfId === detail.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 truncate">
                {detail?.title ?? "Chi tiết dự án"}
              </h3>
              {detail && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border bg-blue-50 text-[#007bff] border-blue-200 shrink-0">
                  {CATEGORY_LABELS[detail.category]}
                </span>
              )}
            </div>
            {detail && (
              <p className="text-xs text-slate-500 mt-1">
                Tạo: {formatDateTime(detail.createdAt)} · Cập nhật:{" "}
                {formatDateTime(detail.updatedAt)}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="w-8 h-8 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-[#007bff] animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
              <p className="text-slate-900 font-medium">Không thể tải chi tiết</p>
              <p className="text-slate-500 text-sm mt-1">{error}</p>
            </div>
          ) : detail ? (
            <div className="space-y-6">
              {/* Owner */}
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  Chủ sở hữu
                </h4>
                {owner ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                    <InfoRow label="Họ và tên" value={owner.displayName ?? "—"} />
                    <InfoRow label="Mã" value={owner.code ?? "—"} />
                    <InfoRow label="Email" value={owner.email} />
                    <InfoRow
                      label="Vai trò"
                      value={owner.role === "teacher" ? "Giảng viên" : owner.role === "student" ? "Sinh viên" : owner.role}
                    />
                    <InfoRow label="Khoa" value={owner.faculty?.name ?? "—"} />
                    <InfoRow label="Đơn vị" value={owner.unit ?? "—"} />
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">— (không có chủ sở hữu)</p>
                )}
              </div>

              {/* Project info */}
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-2">Thông tin dự án</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                  <InfoRow label="File chính" value={detail.mainPath ?? "—"} />
                  <InfoRow label="Số file" value={String(detail.fileCount)} />
                  <InfoRow label="Tổng dung lượng" value={formatBytes(detail.totalSizeBytes)} />
                  <InfoRow label="Sửa lần cuối" value={formatDateTime(detail.lastEditedAt)} />
                  <InfoRow
                    label="Bản PDF"
                    value={
                      detail.latestArtifact
                        ? `Có (${formatDateTime(detail.latestArtifact.createdAt)})`
                        : "Chưa có"
                    }
                  />
                </div>
              </div>

              {/* Files */}
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-2">
                  Danh sách file ({detail.files.length})
                </h4>
                {detail.files.length === 0 ? (
                  <p className="text-sm text-slate-500">Không có file</p>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-2 font-semibold">Đường dẫn</th>
                          <th className="px-4 py-2 font-semibold">Loại</th>
                          <th className="px-4 py-2 font-semibold text-right">Dung lượng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detail.files.map((f) => (
                          <tr key={f.path}>
                            <td className="px-4 py-2 text-slate-700 font-mono text-xs">{f.path}</td>
                            <td className="px-4 py-2 text-slate-500">{f.kind}</td>
                            <td className="px-4 py-2 text-slate-500 text-right">
                              {formatBytes(f.sizeBytes)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
          >
            Đóng
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!detail}
            onClick={() => detail && onOpenWorkspace(detail.id)}
            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Mở (chỉ xem)
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!detail || zipBusy}
            onClick={() => detail && onDownloadZip(detail)}
            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
          >
            {zipBusy ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileArchive className="w-4 h-4 mr-2" />
            )}
            Tải .zip
          </Button>
          <Button
            type="button"
            disabled={!detail || pdfBusy}
            onClick={() => detail && onDownloadPdf(detail)}
            title={detail?.hasPdf ? "Tải PDF biên dịch" : "Tải PDF (biên dịch nếu chưa có)"}
            className="bg-[#007bff] hover:bg-[#0056b3] text-white"
          >
            {pdfBusy ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            Tải PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-slate-500 shrink-0">{label}:</span>
      <span className="text-slate-900 font-medium truncate" title={value}>
        {value}
      </span>
    </div>
  );
}
