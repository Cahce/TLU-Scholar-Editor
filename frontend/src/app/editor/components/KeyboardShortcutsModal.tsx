import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { EDITOR_COMMANDS, EXTRA_SHORTCUTS } from "../commands/registry";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type GroupKey = "file" | "edit" | "format" | "nav";

interface ShortcutRow {
  label: string;
  keys: string;
  group: GroupKey;
}

const GROUP_ORDER: { key: GroupKey; title: string }[] = [
  { key: "file", title: "Tệp" },
  { key: "edit", title: "Soạn thảo" },
  { key: "format", title: "Định dạng" },
  { key: "nav", title: "Tìm kiếm & Điều hướng" },
];

function groupOf(id: string): GroupKey {
  if (id.startsWith("file.")) return "file";
  if (id === "edit.find" || id === "edit.replace" || id === "help.shortcuts")
    return "nav";
  if (id === "edit.format") return "format";
  return "edit";
}

/** Collect every shortcut once, from the registry + the extra (EditorPane-only)
 *  bindings, so the cheatsheet can never drift from the real key handlers. */
function collectRows(): ShortcutRow[] {
  const fromCommands: ShortcutRow[] = Object.values(EDITOR_COMMANDS)
    .filter((c) => !!c.shortcut)
    .map((c) => ({ label: c.label, keys: c.shortcut as string, group: groupOf(c.id) }));
  const extra: ShortcutRow[] = EXTRA_SHORTCUTS.map((s) => ({
    label: s.label,
    keys: s.keys,
    group: s.group,
  }));
  return [...fromCommands, ...extra];
}

function KeyHint({ keys }: { keys: string }): JSX.Element {
  return (
    <kbd className="ml-auto rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-slate-600 shadow-sm">
      {keys}
    </kbd>
  );
}

/**
 * "Phím tắt" cheatsheet — opened from Trợ giúp → Phím tắt and the F1 key.
 * Content is generated from the command registry (see registry.ts), so it
 * always matches the bindings in EditorPane / CodeMirror.
 */
export function KeyboardShortcutsModal({
  open,
  onOpenChange,
}: KeyboardShortcutsModalProps): JSX.Element {
  const rows = collectRows();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Phím tắt</DialogTitle>
          <DialogDescription>
            Các phím tắt trong trình soạn thảo. Phím soạn thảo (Hoàn tác, Tìm
            kiếm…) áp dụng khi con trỏ đang ở vùng soạn thảo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {GROUP_ORDER.map(({ key, title }) => {
            const groupRows = rows.filter((r) => r.group === key);
            if (groupRows.length === 0) return null;
            return (
              <section
                key={key}
                className="rounded-md border border-slate-200 bg-white p-3 shadow-sm"
              >
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {title}
                </h4>
                <ul className="space-y-1.5">
                  {groupRows.map((r) => (
                    <li
                      key={`${r.label}-${r.keys}`}
                      className="flex items-center gap-3 text-sm text-slate-700"
                    >
                      <span className="truncate">{r.label}</span>
                      <KeyHint keys={r.keys} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
