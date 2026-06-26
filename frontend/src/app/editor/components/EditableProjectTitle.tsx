import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { updateProject } from "../../api/projects";
import { ApiError } from "../../api/client";
import { cn } from "../../components/ui/utils";

interface EditableProjectTitleProps {
  projectId: string;
  title: string;
  /**
   * Called after a successful save with the trimmed new title. Use this to
   * sync any external state (e.g. editor store) so the new title shows up
   * across the app.
   */
  onUpdate?: (newTitle: string) => void;
}

/**
 * Inline-editable project title used in the workspace breadcrumb. Behaves
 * like Notion/Google Docs: click → text becomes input, Enter or blur saves
 * via PUT /projects/:id, Esc reverts.
 */
export function EditableProjectTitle({
  projectId,
  title,
  onUpdate,
}: EditableProjectTitleProps): JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync `draft` with external `title` changes when not editing — e.g. after
  // bootstrap finishes loading the project or after a successful save the
  // parent feeds back the new title.
  useEffect(() => {
    if (!isEditing) setDraft(title);
  }, [title, isEditing]);

  const startEdit = () => {
    setDraft(title);
    setError(null);
    setIsEditing(true);
    // Focus + select-all on next tick so the user can immediately type over.
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  // Top-bar "Chỉnh sửa → Đổi tên dự án" dispatches `editor:renameProject` to
  // enter inline-edit mode without prop-drilling a handler up to the header.
  useEffect(() => {
    const onRename = (): void => startEdit();
    window.addEventListener("editor:renameProject", onRename);
    return () => window.removeEventListener("editor:renameProject", onRename);
    // startEdit only reads `title` (synced) + stable setters; bind once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  const cancelEdit = () => {
    setDraft(title);
    setError(null);
    setIsEditing(false);
  };

  const commit = async () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setError("Tên không được để trống");
      return;
    }
    if (trimmed.length > 200) {
      setError("Tên quá dài (tối đa 200 ký tự)");
      return;
    }
    if (trimmed === title) {
      // Nothing to save — quietly exit edit mode.
      setIsEditing(false);
      setError(null);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await updateProject(projectId, { title: trimmed });
      onUpdate?.(trimmed);
      toast.success("Đã đổi tên dự án");
      setIsEditing(false);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message :
        err instanceof Error ? err.message :
        "Không thể đổi tên";
      toast.error(message);
      setError(message);
      // Stay in edit mode so the user can retry or hit Esc to revert.
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={startEdit}
        title="Click để đổi tên dự án"
        aria-label={`Đổi tên dự án: ${title}`}
        className="cursor-text truncate max-w-[200px] rounded px-1 -mx-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007bff]/30"
      >
        {title}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancelEdit();
          }
        }}
        onBlur={() => {
          // Skip commit-on-blur while a save is in flight so we don't double-fire.
          if (!isSaving) void commit();
        }}
        disabled={isSaving}
        aria-label="Đổi tên dự án"
        aria-invalid={error !== null}
        maxLength={250}
        className={cn(
          "max-w-[280px] rounded-md border px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#007bff]/30 disabled:opacity-60",
          error ? "border-red-500" : "border-[#007bff]",
        )}
      />
      {isSaving ? (
        <Loader2 className="size-3.5 animate-spin text-slate-400" aria-hidden="true" />
      ) : error ? (
        <span className="text-xs text-red-600">{error}</span>
      ) : null}
    </div>
  );
}
