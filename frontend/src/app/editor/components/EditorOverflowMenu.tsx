import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { filterEntries } from "../commands/menuUtils";
import type { UseEditorCommandsResult } from "../commands/useEditorCommands";

interface EditorOverflowMenuProps {
  menu: UseEditorCommandsResult;
}

/**
 * The "⋮" overflow menu in the workspace header. Always visible (never hidden
 * responsively) so on small screens — where the menu bar (`hidden md:flex`)
 * and the Xuất PDF / .zip buttons (`hidden sm:*`) disappear — the user still
 * reaches export, word count, search, issues and navigation.
 */
export function EditorOverflowMenu({ menu }: EditorOverflowMenuProps): JSX.Element {
  const { commands, layout, ctx, run } = menu;
  const entries = filterEntries(layout.overflow, commands, ctx);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Thao tác khác"
          title="Thao tác khác"
          className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007bff]/30 ml-1"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[14rem]">
        {entries.map((entry, index) => {
          if ("sep" in entry) {
            return <DropdownMenuSeparator key={`sep-${index}`} />;
          }
          if ("submenu" in entry) return null; // overflow has no submenus
          const cmd = commands[entry.id];
          if (!cmd) return null;
          const Icon = cmd.icon;
          const enabled = cmd.isEnabled?.(ctx) ?? true;
          return (
            <DropdownMenuItem
              key={cmd.id}
              disabled={!enabled}
              onSelect={() => run(cmd.id)}
            >
              {Icon && <Icon className="size-4" />}
              <span>{cmd.label}</span>
              {cmd.shortcut && (
                <DropdownMenuShortcut>{cmd.shortcut}</DropdownMenuShortcut>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
