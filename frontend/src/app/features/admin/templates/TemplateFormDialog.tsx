import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  AlertCircle,
  FileArchive,
  FilePlus2,
  History,
  Loader2,
  PenLine,
} from "lucide-react";
import { cn } from "../../../components/ui/utils";
import { AdminFormModal } from "../../../components/admin/AdminFormModal";
import { FormField } from "../../../components/admin/FormField";
import {
  NativeSelect,
  TextArea,
  TextInput,
} from "../../../components/admin/FormControls";
import { ApiError } from "../../../api/client";
import {
  createTemplate,
  createTemplateSourceProject,
  importTemplateSourceProject,
  listTemplateVersions,
  updateTemplate,
} from "../../../api/templates";
import { adminToast } from "../_shared/toast";
import type {
  CreateTemplateRequest,
  Template,
  TemplateCategory,
  TemplateVersion,
  UpdateTemplateRequest,
} from "../../../types/templates";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1,
  ).padStart(2, "0")}/${d.getFullYear()}`;
}

const CATEGORY_OPTIONS: Array<{ value: TemplateCategory; label: string }> = [
  { value: "thesis", label: "Luận văn / Khóa luận" },
  { value: "report", label: "Báo cáo" },
  { value: "proposal", label: "Đề xuất" },
  { value: "paper", label: "Bài báo" },
  { value: "presentation", label: "Trình chiếu" },
  { value: "other", label: "Khác" },
];

const MAX_ZIP_BYTES = 10 * 1024 * 1024; // 10 MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

type ContentSource = "blank" | "zip";

export interface TemplateFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  template?: Template | null;
  onClose: () => void;
  onSaved: (template: Template, mode: "create" | "edit") => void;
  /**
   * Callback to open the parent's Versions dialog. Used by the version
   * summary block ("Xem chi tiết" / "Tải lên phiên bản đầu"). When omitted,
   * the links are still shown but become no-ops.
   */
  onOpenVersions?: () => void;
}

export function TemplateFormDialog({
  open,
  mode,
  template,
  onClose,
  onSaved,
  onOpenVersions,
}: TemplateFormDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TemplateCategory>("thesis");
  const [isOfficial, setIsOfficial] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Create-mode content source: author blank in the workspace, or import a .zip
  // first. Both navigate to the workspace; publishing happens there.
  const navigate = useNavigate();
  const [contentSource, setContentSource] = useState<ContentSource>("blank");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Edit mode: opening the source project in the workspace (create on demand).
  const [openingWorkspace, setOpeningWorkspace] = useState(false);

  // Version metadata for the edit-mode summary block. Fetched lazily — only
  // when the dialog opens in edit mode for a real template. Keeping the call
  // out of `useTemplateVersions` so we don't hit the API while the dialog is
  // closed.
  const [versions, setVersions] = useState<TemplateVersion[] | null>(null);
  const [versionsLoading, setVersionsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && template) {
      setName(template.name);
      setDescription(template.description ?? "");
      setCategory(template.category);
      setIsOfficial(template.isOfficial);
      setIsActive(template.isActive);
    } else {
      setName("");
      setDescription("");
      setCategory("thesis");
      setIsOfficial(false);
      setIsActive(true);
      setContentSource("blank");
      setFile(null);
      setFileError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    setFieldErrors({});
    setSubmitError(null);
    setSubmitting(false);
  }, [open, mode, template]);

  useEffect(() => {
    if (!open || mode !== "edit" || !template) {
      setVersions(null);
      return;
    }
    let cancelled = false;
    setVersionsLoading(true);
    listTemplateVersions(template.id)
      .then((r) => {
        if (!cancelled) setVersions(r.versions);
      })
      .catch(() => {
        if (!cancelled) setVersions([]);
      })
      .finally(() => {
        if (!cancelled) setVersionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, mode, template]);

  const latestVersion = versions && versions.length > 0 ? versions[0] : null;
  const totalVersions = versions?.length ?? 0;
  const usageCount = template?.usageCount ?? 0;
  const showUsageWarning =
    mode === "edit" && template?.isActive === true && !isActive && usageCount > 0;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    const trimmedName = name.trim();
    if (!trimmedName) errors.name = "Tên mẫu không được để trống";
    else if (trimmedName.length > 200) errors.name = "Tên mẫu tối đa 200 ký tự";
    if (description.length > 2000) errors.description = "Mô tả tối đa 2000 ký tự";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFileError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (!f.name.toLowerCase().endsWith(".zip")) {
      setFileError("Chỉ chấp nhận tệp .zip");
      setFile(null);
      return;
    }
    if (f.size > MAX_ZIP_BYTES) {
      setFileError(`Tệp tối đa 10 MB. Tệp hiện tại ${formatBytes(f.size)}.`);
      setFile(null);
      return;
    }
    setFile(f);
  };

  // Edit mode: open the template's source project in the workspace to edit its
  // content. Creates/seeds the source project on demand (from the latest
  // version) for templates that don't have one yet.
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
      }
      navigate(`/workspace/${sourceProjectId}?templateId=${template.id}`);
    } catch (err) {
      adminToast.error("Mở workspace", err);
    } finally {
      setOpeningWorkspace(false);
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (mode === "create" && contentSource === "zip" && !file) {
      setFileError("Vui lòng chọn tệp .zip");
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (mode === "create") {
        const payload: CreateTemplateRequest = {
          name: name.trim(),
          description: description.trim() || undefined,
          category,
          isOfficial,
        };
        const created = await createTemplate(payload);
        // Author content in the workspace: create/seed the source project, then
        // navigate there. The version is published from the workspace.
        const { sourceProjectId } =
          contentSource === "zip" && file
            ? await importTemplateSourceProject(created.id, file)
            : await createTemplateSourceProject(created.id, { seed: "blank" });
        adminToast.created("mẫu", created.name, {
          description:
            "Soạn nội dung trong workspace rồi lưu thành phiên bản mẫu.",
        });
        navigate(`/workspace/${sourceProjectId}?templateId=${created.id}`);
        return;
      }

      if (!template) return;
      const payload: UpdateTemplateRequest = {
        name: name.trim(),
        description: description.trim() ? description.trim() : null,
        category,
        isOfficial,
        isActive,
      };
      const result = await updateTemplate(template.id, payload);
      adminToast.updated("mẫu", result.name);
      onSaved(result, "edit");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Không thể lưu mẫu";
      setSubmitError(message);
      adminToast.error(mode === "create" ? "Tạo mẫu" : "Cập nhật mẫu", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminFormModal
      isOpen={open}
      onClose={onClose}
      title={mode === "create" ? "Tạo mẫu tài liệu" : "Chỉnh sửa mẫu tài liệu"}
      description={
        mode === "create"
          ? "Khai báo thông tin và chọn cách soạn nội dung mẫu."
          : "Cập nhật thông tin chung của mẫu tài liệu."
      }
      size="md"
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel={mode === "create" ? "Tạo mẫu" : "Lưu thay đổi"}
      submitError={submitError}
    >
      {mode === "edit" && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          {versionsLoading ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang tải thông tin phiên bản...
            </div>
          ) : latestVersion ? (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-slate-500">Phiên bản mới nhất</div>
                <div className="font-medium text-slate-900">
                  {latestVersion.versionNumber}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Tạo ngày</div>
                <div className="font-medium text-slate-900">
                  {formatDate(latestVersion.createdAt)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Tổng số</div>
                {onOpenVersions ? (
                  <button
                    type="button"
                    onClick={onOpenVersions}
                    className="inline-flex items-center gap-1 font-medium text-[#007bff] hover:underline"
                  >
                    <History className="w-3.5 h-3.5" />
                    {totalVersions} phiên bản
                  </button>
                ) : (
                  <div className="font-medium text-slate-900">
                    {totalVersions} phiên bản
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Mẫu này chưa có phiên bản nào.</span>
              {onOpenVersions && (
                <button
                  type="button"
                  onClick={onOpenVersions}
                  className="text-[#007bff] font-medium hover:underline"
                >
                  Tải lên phiên bản đầu
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {mode === "edit" && (
        <button
          type="button"
          onClick={() => void handleOpenWorkspace()}
          disabled={submitting || openingWorkspace}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#007bff] bg-blue-50 px-4 py-2.5 text-sm font-medium text-[#007bff] hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#007bff]/30 disabled:opacity-60"
        >
          {openingWorkspace ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang mở workspace...
            </>
          ) : (
            <>
              <PenLine className="w-4 h-4" />
              Chỉnh sửa nội dung trong workspace
            </>
          )}
        </button>
      )}

      <FormField label="Tên mẫu" required error={fieldErrors.name} htmlFor="tpl-name">
        <TextInput
          id="tpl-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="VD: Khóa luận tốt nghiệp K2024"
          maxLength={200}
          invalid={Boolean(fieldErrors.name)}
        />
      </FormField>

      <FormField label="Mô tả" error={fieldErrors.description} htmlFor="tpl-desc">
        <TextArea
          id="tpl-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Mô tả ngắn về mẫu, đối tượng sử dụng..."
          maxLength={2000}
          rows={3}
          invalid={Boolean(fieldErrors.description)}
        />
      </FormField>

      <FormField label="Phân loại" required htmlFor="tpl-category">
        <NativeSelect
          id="tpl-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as TemplateCategory)}
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </NativeSelect>
      </FormField>

      {mode === "create" && (
        <FormField label="Nội dung mẫu" required>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setContentSource("blank");
                setFileError(null);
              }}
              disabled={submitting}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors disabled:opacity-60",
                contentSource === "blank"
                  ? "border-[#007bff] bg-blue-50"
                  : "border-slate-200 hover:bg-slate-50",
              )}
              aria-pressed={contentSource === "blank"}
            >
              <FilePlus2
                className={cn(
                  "w-4 h-4 mt-0.5 shrink-0",
                  contentSource === "blank" ? "text-[#007bff]" : "text-slate-400",
                )}
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">
                  Tạo mới
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  Soạn từ mẫu trống trong workspace.
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setContentSource("zip")}
              disabled={submitting}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors disabled:opacity-60",
                contentSource === "zip"
                  ? "border-[#007bff] bg-blue-50"
                  : "border-slate-200 hover:bg-slate-50",
              )}
              aria-pressed={contentSource === "zip"}
            >
              <FileArchive
                className={cn(
                  "w-4 h-4 mt-0.5 shrink-0",
                  contentSource === "zip" ? "text-[#007bff]" : "text-slate-400",
                )}
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">
                  Tải lên .zip
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  Nhập từ tệp .zip rồi chỉnh trong workspace.
                </span>
              </span>
            </button>
          </div>

          {contentSource === "zip" && (
            <div className="mt-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleFileChange}
                disabled={submitting}
                aria-label="Chọn tệp .zip nội dung mẫu"
                className="block w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-[#007bff] hover:file:bg-blue-100 cursor-pointer"
              />
              {file && (
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <FileArchive className="w-3.5 h-3.5" />
                  {file.name} · {formatBytes(file.size)}
                </p>
              )}
              {fileError && (
                <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fileError}
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-slate-400 mt-2">
            Sau khi tạo, bạn sẽ được chuyển đến workspace để soạn và lưu thành
            phiên bản mẫu.
          </p>
        </FormField>
      )}

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isOfficial}
          onChange={(e) => setIsOfficial(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-[#007bff] focus:ring-[#007bff]"
        />
        <span>
          <span className="block text-sm font-medium text-slate-700">
            Mẫu chính thức
          </span>
          <span className="block text-xs text-slate-500 mt-0.5">
            Đánh dấu mẫu được nhà trường công nhận.
          </span>
        </span>
      </label>

      {mode === "edit" && (
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-[#007bff] focus:ring-[#007bff]"
          />
          <span>
            <span className="block text-sm font-medium text-slate-700">
              Đang sử dụng
            </span>
            <span className="block text-xs text-slate-500 mt-0.5">
              Bỏ chọn để tạm ẩn mẫu khỏi danh sách sinh viên.
            </span>
          </span>
        </label>
      )}

      {showUsageWarning && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">
              Mẫu này đang được {usageCount} project sử dụng
            </p>
            <p className="mt-0.5">
              Ẩn mẫu sẽ chặn việc tạo project MỚI từ mẫu này. Các project hiện
              có không bị ảnh hưởng.
            </p>
          </div>
        </div>
      )}
    </AdminFormModal>
  );
}
