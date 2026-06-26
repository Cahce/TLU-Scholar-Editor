/**
 * CleanupDialog
 *
 * Review duplicate BibTeX groups and resolve them. Selection for the
 * "delete selected" action is managed inside the dialog, so the host panel
 * doesn't need a checkbox column in its (narrow) entry list. Extracted from the
 * former `BibEditorHint` when bibliography management moved into the sidebar
 * "Tài liệu tham khảo" panel.
 *
 * No entry is removed automatically — every change is an explicit button press.
 */

import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Checkbox } from "../../../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import type {
  BibDuplicateGroup,
  DuplicateResolutionAction,
} from "../../services/BibDuplicateService";

interface CleanupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: BibDuplicateGroup[];
  /**
   * Apply a resolution to one group. `selectedKeys` is only meaningful for the
   * `delete_selected` action (the keys the user ticked in that group).
   */
  onApply: (
    group: BibDuplicateGroup,
    action: DuplicateResolutionAction,
    selectedKeys: string[],
  ) => void;
}

export function CleanupDialog({
  open,
  onOpenChange,
  groups,
  onApply,
}: CleanupDialogProps): JSX.Element {
  const [selected, setSelected] = useState<Set<number>>(() => new Set());

  const toggle = (index: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const apply = (
    group: BibDuplicateGroup,
    action: DuplicateResolutionAction,
  ) => {
    const selectedKeys = group.entries
      .filter((e) => selected.has(e.index))
      .map((e) => e.key);
    onApply(group, action, selectedKeys);
    // Entry indexes shift after a resolution; clear stale selection.
    setSelected(new Set());
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSelected(new Set());
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[80vh] overflow-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Dọn mục trùng</DialogTitle>
          <DialogDescription>
            Xem các nhóm trùng trước khi áp dụng. Không có mục nào bị xoá tự động.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {groups.length === 0 && (
            <p className="text-sm text-slate-500">Không còn nhóm trùng nào.</p>
          )}
          {groups.map((group) => {
            const selectedInGroup = group.entries.some((e) =>
              selected.has(e.index),
            );
            return (
              <div
                key={group.groupId}
                className="rounded border border-slate-200 p-3"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{group.reasons.join(", ")}</Badge>
                  <span className="text-xs text-slate-500">
                    {group.entries.length} mục
                  </span>
                </div>
                <div className="mb-3 space-y-1 text-xs">
                  {group.entries.map((entry) => (
                    <label
                      key={`${entry.index}-${entry.key}`}
                      className="flex cursor-pointer items-center gap-2 rounded bg-slate-50 px-2 py-1"
                    >
                      <Checkbox
                        checked={selected.has(entry.index)}
                        onCheckedChange={() => toggle(entry.index)}
                        aria-label={`Chọn ${entry.key}`}
                      />
                      <span className="font-mono">{entry.key || "(trống)"}</span>
                      <span className="text-slate-600">
                        {entry.fields.author ?? "Không có tác giả"} -{" "}
                        {entry.fields.year ?? "?"}
                      </span>
                      <span className="truncate text-slate-500">
                        {entry.fields.title ?? ""}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => apply(group, "keep_first")}
                  >
                    Giữ mục đầu
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => apply(group, "keep_last")}
                  >
                    Giữ mục cuối
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => apply(group, "merge_fields")}
                  >
                    Gộp trường
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => apply(group, "rename")}
                  >
                    Đổi tên bản sao
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!selectedInGroup}
                    onClick={() => apply(group, "delete_selected")}
                  >
                    Xoá mục đã chọn
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
