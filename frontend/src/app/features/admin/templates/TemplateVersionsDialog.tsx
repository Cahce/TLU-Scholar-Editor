import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Edit2,
  FileArchive,
  Loader2,
  PenLine,
  RotateCcw,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { ModalShell } from "../../../components/admin/ModalShell";
import { AdminFormModal } from "../../../components/admin/AdminFormModal";
import { ConfirmDialog } from "../../../components/admin/ConfirmDialog";
import { FormField } from "../../../components/admin/FormField";
import { TextArea, TextInput } from "../../../components/admin/FormControls";
import { ApiError } from "../../../api/client";
import {
  createTemplateSourceProject,
  createTemplateVersion,
  downloadTemplateVersionFile,
  updateTemplateVersion,
} from "../../../api/templates";
import { useTemplateVersions } from "../../../hooks/useTemplateVersions";
import { downloadBlob, sanitizeFilename } from "../../../utils/download";
import { adminToast } from "../_shared/toast";
import type { Template, TemplateVersion } from "../../../types/templates";

const VERSION_REGEX = /^v?\d+\.\d+\.\d+$/;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_EXT = [".typ", ".zip"];

export interface TemplateVersionsDialogProps {
  open: boolean;
  template: Template | null;
  onClose: () => void;
  onVersionsChanged?: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1,
  ).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(
    2,
    "0",
  )}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function TemplateVersionsDialog({
  open,
  template,
  onClose,
  onVersionsChanged,
}: TemplateVersionsDialogProps) {
  const [versionNumber, setVersionNumber] = useState("");
  const [changelog, setChangelog] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const [openingWorkspace, setOpeningWorkspace] = useState(false);
  const titleId = useId();

  // State for the activate/deactivate confirmation modal.
  const [toggleTarget, setToggleTarget] = useState<{
    version: TemplateVersion;
    action: "activate" | "deactivate";
  } | null>(null);

  // State for the changelog edit modal.
  const [editTarget, setEditTarget] = useState<TemplateVersion | null>(null);
  const [editChangelog, setEditChangelog] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Keep the edit-modal field in sync with the row the admin clicked.
  useEffect(() => {
    if (editTarget) {
      setEditChangelog(editTarget.changelog ?? "");
    }
  }, [editTarget]);

  const versions = useTemplateVersions(template?.id ?? "");

  if (!template) return null;

  const resetForm = () => {
    setVersionNumber("");
    setChangelog("");
    setFile(null);
    setVersionError(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFileError(null);
    if (!f) {
      setFile(null);
      return;
    }
    const lower = f.name.toLowerCase();
    const okExt = ACCEPTED_EXT.some((ext) => lower.endsWith(ext));
    if (!okExt) {
      setFileError("Chỉ chấp nhận tệp .typ hoặc .zip");
      setFile(null);
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setFileError(`Tệp tối đa 10 MB. Tệp hiện tại ${formatBytes(f.size)}.`);
      setFile(null);
      return;
    }
    setFile(f);
  };

  // Open the template's source project in the workspace to author content and
  // publish a new version. Creates the source project on demand (seeded from
  // the latest version) for templates that don't have one yet.
  const handleOpenWorkspace = async () => {
    if (!template || openingWorkspace) return;
    setOpeningWorkspace(true);
    try {
      let sourceProjectId = template.sourceProjectId ?? null;
      if (!sourceProjectId) {
        const res = await createTemplateSourceProject(template.id, {
          seed: "latest",
        });
        sourceProjectId = res.sourceProjectId;
        // Let the parent refresh so the template carries its new sourceProjectId.
        onVersionsChanged?.();
      }
      navigate(`/workspace/${sourceProjectId}?templateId=${template.id}`);
    } catch (err) {
      adminToast.error("Mở workspace", err);
    } finally {
      setOpeningWorkspace(false);
    }
  };

  const handleUpload = async () => {
    setVersionError(null);
    setFileError(null);

    const trimmedVersion = versionNumber.trim();
    if (!trimmedVersion) {
      setVersionError("Vui lòng nhập số phiên bản");
      return;
    }
    if (!VERSION_REGEX.test(trimmedVersion)) {
      setVersionError("Định dạng phải là v1.0.0 hoặc 1.0.0");
      return;
    }
    if (!file) {
      setFileError("Vui lòng chọn tệp .typ hoặc .zip");
      return;
    }

    setUploading(true);
    try {
      await createTemplateVersion(template.id, {
        versionNumber: trimmedVersion,
        changelog: changelog.trim() || undefined,
        file,
      });
      adminToast.created("phiên bản", trimmedVersion);
      resetForm();
      await versions.refetch();
      onVersionsChanged?.();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "VERSION_EXISTS") {
          setVersionError(err.message);
        } else if (err.code === "FILE_TOO_LARGE" || err.code === "INVALID_ARCHIVE") {
          setFileError(err.message);
        }
      }
      adminToast.error("Tải phiên bản", err);
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmToggle = async () => {
    if (!toggleTarget) return;
    const { version, action } = toggleTarget;
    setTogglingId(version.id);
    try {
      await updateTemplateVersion(template.id, version.id, {
        isActive: action === "activate",
      });
      adminToast.success(
        action === "activate"
          ? `Đã kích hoạt phiên bản ${version.versionNumber}`
          : `Đã vô hiệu hoá phiên bản ${version.versionNumber}`,
      );
      await versions.refetch();
      onVersionsChanged?.();
      setToggleTarget(null);
    } catch (err) {
      adminToast.error(
        action === "activate" ? "Kích hoạt phiên bản" : "Vô hiệu hoá phiên bản",
        err,
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleDownload = async (version: TemplateVersion) => {
    setDownloadingId(version.id);
    try {
      const { blob } = await downloadTemplateVersionFile(template.id, version.id);
      const filename = `${sanitizeFilename(template.name)}-${sanitizeFilename(version.versionNumber)}.zip`;
      downloadBlob(blob, filename);
      adminToast.success("Đã tải xuống bản .zip");
    } catch (err) {
      adminToast.error("Tải xuống phiên bản", err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSaveChangelog = async () => {
    if (!editTarget) return;
    // Allow clearing — empty string is sent as `null` so backend wipes the
    // field; otherwise pass the trimmed string. We don't bail on no-op (same
    // text) because the user explicitly clicked Save.
    const next = editChangelog.trim();
    setEditSaving(true);
    try {
      await updateTemplateVersion(template.id, editTarget.id, {
        changelog: next.length > 0 ? next : null,
      });
      adminToast.updated("ghi chú thay đổi");
      await versions.refetch();
      onVersionsChanged?.();
      setEditTarget(null);
    } catch (err) {
      adminToast.error("Cập nhật ghi chú", err);
    } finally {
      setEditSaving(false);
    }
  };

  const versionList = versions.data?.versions ?? [];

  return (
    <>
      <ModalShell
        isOpen={open}
        onClose={onClose}
        size="lg"
        dismissable={!uploading}
        labelledBy={titleId}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h2 id={titleId} className="text-xl font-bold text-slate-900 truncate">
              Phiên bản mẫu
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">{template.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Upload form */}
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 pb-5 border-b border-slate-200">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Soạn trong workspace
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mở trình biên tập để soạn nội dung mẫu rồi phát hành phiên bản mới.
                </p>
              </div>
              <Button
                onClick={() => void handleOpenWorkspace()}
                disabled={openingWorkspace || uploading}
                className="bg-[#007bff] text-white hover:bg-[#0056b3] shadow-sm shrink-0"
              >
                {openingWorkspace ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang mở...
                  </>
                ) : (
                  <>
                    <PenLine className="w-4 h-4 mr-2" />
                    Soạn & phát hành phiên bản mới
                  </>
                )}
              </Button>
            </div>

            <h4 className="text-sm font-semibold text-slate-900 mb-3">
              Hoặc tải lên tệp
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Số phiên bản"
                required
                error={versionError ?? undefined}
                htmlFor="ver-number"
              >
                <TextInput
                  id="ver-number"
                  value={versionNumber}
                  onChange={(e) => setVersionNumber(e.target.value)}
                  placeholder="VD: v1.0.0"
                  disabled={uploading}
                  invalid={Boolean(versionError)}
                />
              </FormField>

              <FormField
                label="Tệp mẫu (.typ hoặc .zip)"
                required
                error={fileError ?? undefined}
                htmlFor="ver-file"
              >
                <input
                  ref={fileInputRef}
                  id="ver-file"
                  type="file"
                  accept=".typ,.zip"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="block w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-[#007bff] hover:file:bg-blue-100 cursor-pointer"
                />
                {file && (
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <FileArchive className="w-3.5 h-3.5" />
                    {file.name} · {formatBytes(file.size)}
                  </p>
                )}
              </FormField>

              <FormField
                label="Ghi chú thay đổi"
                className="md:col-span-2"
                htmlFor="ver-changelog"
              >
                <TextArea
                  id="ver-changelog"
                  value={changelog}
                  onChange={(e) => setChangelog(e.target.value)}
                  rows={2}
                  placeholder="Mô tả các thay đổi trong phiên bản này..."
                  disabled={uploading}
                />
              </FormField>
            </div>

            <div className="flex justify-end mt-3">
              <Button
                onClick={() => void handleUpload()}
                disabled={uploading}
                className="bg-[#007bff] text-white hover:bg-[#0056b3] shadow-sm disabled:opacity-60"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang tải lên...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Tải lên phiên bản
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Versions list */}
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-900">
                Danh sách phiên bản
              </h4>
              <button
                type="button"
                onClick={() => void versions.refetch()}
                disabled={versions.loading}
                className="text-xs text-slate-500 hover:text-[#007bff] disabled:opacity-50"
              >
                {versions.loading ? "Đang tải..." : "Làm mới"}
              </button>
            </div>

            {versions.loading && versionList.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#007bff]" />
                Đang tải danh sách phiên bản...
              </div>
            ) : versions.error ? (
              <div className="py-10 text-center text-sm text-rose-600 flex flex-col items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                {versions.error}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void versions.refetch()}
                  className="mt-2"
                >
                  Thử lại
                </Button>
              </div>
            ) : versionList.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">
                Chưa có phiên bản nào. Tải lên phiên bản đầu tiên ở trên.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                      <th className="px-4 py-3 text-left">Phiên bản</th>
                      <th className="px-4 py-3 text-left">Ghi chú</th>
                      <th className="px-4 py-3 text-left">Trạng thái</th>
                      <th className="px-4 py-3 text-left">Ngày tạo</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {versionList.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {v.versionNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                          {v.changelog || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {v.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Đang dùng
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              <XCircle className="w-3 h-3" />
                              Đã ẩn
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {formatDate(v.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditTarget(v)}
                              className="h-8 w-8 p-0 text-slate-500 hover:text-[#007bff] hover:bg-blue-50"
                              title="Sửa ghi chú"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleDownload(v)}
                              disabled={downloadingId === v.id}
                              className="h-8 w-8 p-0 text-slate-500 hover:text-[#007bff] hover:bg-blue-50 disabled:opacity-50"
                              title="Tải xuống .zip"
                            >
                              {downloadingId === v.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                            </Button>
                            {v.isActive ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setToggleTarget({ version: v, action: "deactivate" })
                                }
                                disabled={togglingId === v.id}
                                className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                                title="Vô hiệu hoá"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setToggleTarget({ version: v, action: "activate" })
                                }
                                disabled={togglingId === v.id}
                                className="h-8 w-8 p-0 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                                title="Kích hoạt lại"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={uploading}
            className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 min-w-[100px] shadow-sm"
          >
            Đóng
          </Button>
        </div>
      </ModalShell>

      {/* Activate / Deactivate confirmation */}
      <ConfirmDialog
        isOpen={toggleTarget !== null}
        onClose={() => {
          if (!togglingId) setToggleTarget(null);
        }}
        onConfirm={handleConfirmToggle}
        title={
          toggleTarget?.action === "activate"
            ? "Kích hoạt phiên bản"
            : "Vô hiệu hoá phiên bản"
        }
        description={
          toggleTarget ? (
            <span>
              {toggleTarget.action === "activate" ? (
                <>
                  Phiên bản <strong>{toggleTarget.version.versionNumber}</strong>{" "}
                  của mẫu <strong>{template.name}</strong> sẽ được kích hoạt và sinh viên có thể tạo project mới từ phiên bản này.
                </>
              ) : (
                <>
                  Phiên bản <strong>{toggleTarget.version.versionNumber}</strong>{" "}
                  của mẫu <strong>{template.name}</strong> sẽ bị ẩn. Sinh viên không thể tạo project mới từ phiên bản này; các project đã tạo trước đó không bị ảnh hưởng.
                </>
              )}
            </span>
          ) : (
            ""
          )
        }
        confirmLabel={
          toggleTarget?.action === "activate" ? "Kích hoạt" : "Vô hiệu hoá"
        }
        tone={toggleTarget?.action === "activate" ? "default" : "danger"}
        loading={togglingId !== null}
      />

      {/* Edit changelog modal */}
      <AdminFormModal
        isOpen={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title="Sửa ghi chú thay đổi"
        description={
          editTarget
            ? `Phiên bản ${editTarget.versionNumber} · ${template.name}`
            : undefined
        }
        size="sm"
        onSubmit={handleSaveChangelog}
        submitting={editSaving}
        submitLabel="Lưu thay đổi"
      >
        <FormField
          label="Ghi chú thay đổi"
          helper="Để trống và lưu sẽ xoá ghi chú hiện tại."
          htmlFor="edit-changelog"
        >
          <TextArea
            id="edit-changelog"
            value={editChangelog}
            onChange={(e) => setEditChangelog(e.target.value)}
            rows={4}
            maxLength={2000}
            disabled={editSaving}
            placeholder="Mô tả ngắn các thay đổi trong phiên bản này..."
          />
        </FormField>
      </AdminFormModal>
    </>
  );
}
